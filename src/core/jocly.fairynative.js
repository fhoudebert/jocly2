/*    Copyright 2026 Jocly
 *
 *    This program is free software: you can redistribute it and/or  modify
 *    it under the terms of the GNU Affero General Public License, version 3,
 *    as published by the Free Software Foundation.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU Affero General Public License for more details.
 *
 *    You should have received a copy of the GNU Affero General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * JoclyFairyNative is an engine provider for jocly.fairy.js (see
 * JoclyFairy.setEngineProvider there), driving a *native* Fairy-Stockfish
 * binary over stdio instead of the WebAssembly build running in a Worker.
 *
 * It exists for native hosts - Tabulon (https://biscandine.fr/variantes/tabulon/),
 * Electron, plain Node - where there is no Worker at all, so every
 * "fairy-stockfish" level currently degrades to the native AI via
 * jocly.fairy.js's FallbackToNativeAI(). A local binary is also simply
 * better there: no SharedArrayBuffer/cross-origin-isolation requirement, no
 * 1.6MB wasm payload, and full-speed multi-threaded search.
 *
 * Wiring it up, once, at host startup:
 *
 *   var JoclyFairy = require("jocly").JoclyFairy;              // or the bundle's export
 *   var native = require("jocly/src/core/jocly.fairynative.js");
 *   JoclyFairy.setEngineProvider(native.provider({
 *       binary: "/usr/lib/tabulon/fairy-stockfish-largeboards_x86-64",
 *       threads: 2,           // optional, default 1
 *       hashMb: 64,           // optional, default engine's own
 *       nnueDir: "/usr/share/tabulon/nnue"   // optional, see evalFile below
 *   }));
 *
 * Nothing else changes: levels, variants, pieceMap, customVariantIni and the
 * fallback path all keep working exactly as they do in the browser, because
 * this speaks the same message protocol as jocly.fairyworker.js (in:
 * Init/Search/Stop, out: Ready/Progress/Done/Aborted/Error) and exposes the
 * same Worker-shaped surface (postMessage + assignable onmessage/onerror).
 *
 * The binary MUST be a largeboards build for anything bigger than 8x8:
 *
 *   make -j"$(nproc)" build ARCH=x86-64 largeboards=yes
 *
 * A non-largeboards binary does not reject a 10x10 variant, it silently
 * falls back to 8x8 chess - so this module checks for it at startup (see
 * CheckLargeBoards below) rather than letting the engine quietly play a
 * different game.
 *
 * Differences from the wasm worker, both deliberate:
 *
 *  - customVariantIni is written to a real temporary file rather than to
 *    Emscripten's virtual filesystem, and rewritten only when its content
 *    actually changes.
 *  - UCI_Chess960 is always sent explicitly, "true" or "false". The worker
 *    only ever sends "true", which is harmless there because a worker is
 *    created per JocGame and a game has one level; a native host is much
 *    more likely to keep one engine process across several games, where a
 *    sticky "true" would corrupt castling notation in the next one.
 */

var JoclyFairyNative = {};

if (typeof WorkerGlobalScope == 'undefined' && typeof window == 'undefined')
	module.exports.JoclyFairyNative = JoclyFairyNative;
else
	this.JoclyFairyNative = JoclyFairyNative;

(function () {

	var DEBUG = false;

	function NativeLog() {
		if (DEBUG)
			console.log.apply(console, ["[fairy-native]"].concat(Array.prototype.slice.call(arguments)));
	}

	/*
	 * Creates one engine process and wraps it in the Worker-shaped object
	 * jocly.fairy.js expects. Both onmessage and onerror are read at
	 * dispatch time, never captured: startMachine() reassigns onmessage
	 * before every search.
	 */
	function CreateNativeEngine(config) {

		var childProcess = require("child_process");
		var fs = require("fs");
		var os = require("os");
		var path = require("path");

		var binary = config.binary || process.env.JOCLY_FAIRY_BINARY;
		if (!binary)
			throw new Error("fairy-native: no engine binary configured (provider({binary: ...}) or $JOCLY_FAIRY_BINARY)");

		var api = { onmessage: null, onerror: null };
		var proc = null;
		var stdoutBuf = "";
		var listeners = [];
		var dead = false;
		var iniDir = null;       // temp dir holding the current customVariantIni
		var iniPath = null;      // the file inside it
		var iniContent = null;   // what is currently in it
		var timers = [];         // pending Expect() timeouts, cleared on shutdown
		var badEvalFiles = {};   // networks the engine refused, never retried
		var search = null;       // { reject, aborted, cleanup } while one is in flight

		function emit(message) {
			if (api.onmessage)
				api.onmessage({ data: message });
			else if (message.type == "Error" && api.onerror)
				api.onerror(new Error(message.error));
		}

		function send(line) {
			if (dead || !proc)
				return;
			NativeLog(">>", line);
			try {
				proc.stdin.write(line + "\n");
			} catch (e) {
				Die("write to engine failed: " + e.message);
			}
		}

		function addListener(fn) { listeners.push(fn); }

		function removeListener(fn) {
			var i = listeners.indexOf(fn);
			if (i >= 0)
				listeners.splice(i, 1);
		}

		function dispatch(line) {
			NativeLog("<<", line);
			listeners.slice().forEach(function (fn) { fn(line); });
		}

		/*
		 * Shuts the engine down and releases everything that would otherwise
		 * keep the host's event loop alive after the game is over: pending
		 * Expect() timeouts, the child process, its three stdio pipes, and
		 * the temporary variant file. Safe to call twice, and safe on a
		 * process that already exited by itself.
		 */
		function Shutdown() {
			dead = true;
			listeners.length = 0;
			search = null;
			timers.forEach(clearTimeout);
			timers.length = 0;
			if (proc) {
				// Drop our own handlers first: this exit is expected and must
				// not be reported back as a crash.
				proc.removeAllListeners("exit");
				proc.removeAllListeners("error");
				try { proc.stdin.write("quit\n"); } catch (e) { /* already gone */ }
				try { proc.kill(); } catch (e) { /* already gone */ }
				// Killing the child is not sufficient. Each stdio pipe is a
				// Socket in its own right and stays referenced until it is
				// explicitly destroyed, which would hold a Node or Electron
				// host open long after the engine is gone.
				[proc.stdin, proc.stdout, proc.stderr].forEach(function (stream) {
					if (!stream)
						return;
					try { stream.destroy(); } catch (e) { /* already gone */ }
				});
				try { proc.unref(); } catch (e) { /* already gone */ }
				proc = null;
			}
			CleanupIni();
		}

		/*
		 * The engine died, or we can no longer talk to it. Report it, so
		 * jocly.fairy.js either falls back to the native AI (when this
		 * happens before Ready) or ends the search cleanly (when after) -
		 * and never leaves the UI stuck on "thinking".
		 */
		function Die(reason) {
			if (dead)
				return;
			Shutdown();
			emit({ type: "Error", error: "fairy-native: " + reason });
		}

		function CleanupIni() {
			if (iniPath) {
				try { fs.unlinkSync(iniPath); } catch (e) { /* already gone */ }
				iniPath = null;
			}
			if (iniDir) {
				try { fs.rmdirSync(iniDir); } catch (e) { /* not empty, or already gone */ }
				iniDir = null;
			}
			iniContent = null;
		}

		function Spawn() {
			try {
				proc = childProcess.spawn(binary, [], { stdio: ["pipe", "pipe", "pipe"] });
			} catch (e) {
				Die("cannot start '" + binary + "': " + e.message);
				return false;
			}
			proc.stdout.setEncoding("utf8");
			proc.stdout.on("data", function (chunk) {
				stdoutBuf += chunk;
				var lines = stdoutBuf.split(/\r?\n/);
				stdoutBuf = lines.pop();
				lines.forEach(dispatch);
			});
			// The engine writes nothing useful to stderr in normal
			// operation, but a dynamic-linker failure lands there and is
			// otherwise invisible.
			proc.stderr.setEncoding("utf8");
			proc.stderr.on("data", function (chunk) { NativeLog("stderr:", chunk.trim()); });
			proc.on("error", function (e) {
				Die("cannot start '" + binary + "': " + e.message);
			});
			proc.on("exit", function (code, signal) {
				Die("engine exited (" + (signal || "code " + code) + ")");
			});
			return true;
		}

		/*
		 * Waits for a line matching `test`, then calls `done` with it.
		 * `timeoutMs` guards against a binary that starts but never answers
		 * (wrong executable, engine wedged): without it the Ready promise in
		 * jocly.fairy.js would never settle.
		 */
		function Expect(test, timeoutMs, done) {
			var timer = setTimeout(function () {
				removeListener(onLine);
				Die("engine did not respond within " + timeoutMs + "ms");
			}, timeoutMs);
			timers.push(timer);
			function onLine(line) {
				if (!test(line))
					return;
				clearTimeout(timer);
				var i = timers.indexOf(timer);
				if (i >= 0)
					timers.splice(i, 1);
				removeListener(onLine);
				done(line);
			}
			addListener(onLine);
		}

		/*
		 * A non-largeboards build accepts a 10x10 or 12x10 variant and then
		 * plays 8x8 chess instead, with no error of any kind - the wrong
		 * game, silently. The banner carries an "LB" marker on largeboards
		 * builds, so refuse anything else up front: better a clean fallback
		 * to the native AI than a Shako game played as chess.
		 */
		function CheckLargeBoards(banner) {
			if (config.allowSmallBoards)
				return true;
			if (/\bLB\b/.test(banner))
				return true;
			Die("'" + binary + "' is not a largeboards build (banner: " + banner.trim() +
				"). Rebuild with 'make build ARCH=x86-64 largeboards=yes', or pass " +
				"allowSmallBoards:true if this host only ever plays 8x8 variants.");
			return false;
		}

		function Init() {
			if (!Spawn())
				return;
			// First line is the version banner, printed before any command.
			Expect(function (l) { return l.indexOf("Fairy-Stockfish") === 0; }, 10000, function (banner) {
				if (!CheckLargeBoards(banner))
					return;
				send("uci");
				Expect(function (l) { return l.trim() == "uciok"; }, 10000, function () {
					if (typeof config.threads === "number")
						send("setoption name Threads value " + config.threads);
					if (typeof config.hashMb === "number")
						send("setoption name Hash value " + config.hashMb);
					send("isready");
					Expect(function (l) { return l.trim() == "readyok"; }, 10000, function () {
						emit({ type: "Ready" });
					});
				});
			});
		}

		/*
		 * Resolves options.evalFile (a path relative to the wasm build's
		 * "fairy-stockfish/" asset directory, e.g. "nnue/shako.nnue") to a
		 * real file under config.nnueDir. Returns null - never throws, never
		 * rejects - when there is nothing usable: NNUE networks are an
		 * optional strength upgrade, and a missing one must not cost a move.
		 */
		function ResolveEvalFile(options) {
			if (!options.evalFile || !config.nnueDir)
				return null;
			var key = options.evalFile + "|" + options.variant;
			if (key in badEvalFiles)
				return null;
			var file = path.resolve(config.nnueDir, path.basename(options.evalFile));
			try {
				if (!fs.statSync(file).isFile())
					return null;
			} catch (e) {
				NativeLog("optional NNUE network not found:", file);
				return null;
			}
			return file;
		}

		function WriteVariantIni(content) {
			if (iniPath && iniContent === content)
				return iniPath;
			if (!iniPath) {
				iniDir = fs.mkdtempSync(path.join(os.tmpdir(), "jocly-fairy-"));
				iniPath = path.join(iniDir, "variants.ini");
			}
			fs.writeFileSync(iniPath, content, "utf8");
			iniContent = content;
			return iniPath;
		}

		function Search(options) {
			if (dead) {
				emit({ type: "Error", error: "fairy-native: engine is not running" });
				return;
			}
			if (search) {
				emit({ type: "Error", error: "fairy-native: a search is already in flight" });
				return;
			}

			var bestMoveUci = null, ponderUci = null, lastInfo = null;
			var aborted = false;
			var evalFile = ResolveEvalFile(options);

			function cleanup() {
				removeListener(onLine);
			}

			function onLine(line) {
				/*
				 * A present but invalid network (wrong engine version or
				 * architecture, truncated download) is not rejected at load
				 * time: the engine prints "info string ERROR:" on the first
				 * "go" and then exits outright. No bestmove ever arrives.
				 * Remember the network as bad so the next search runs on
				 * classical evaluation, and fail this one cleanly - the
				 * "exit" handler would otherwise report a bare crash.
				 */
				if (line.indexOf("info string ERROR:") === 0) {
					if (options.evalFile)
						badEvalFiles[options.evalFile + "|" + options.variant] = true;
					search = null;
					cleanup();
					emit({
						type: "Error",
						error: "fairy-native: the engine rejected the NNUE network (" +
							(options.evalFile || "?") + ") and terminated; it will be skipped from " +
							"now on. Engine said: " + line
					});
					return;
				}
				if (line.indexOf("info ") === 0) {
					lastInfo = line;
					var mDepth = /\bdepth (\d+)/.exec(line);
					if (mDepth) {
						var targetDepth = options.depth || 18;
						var pct = Math.min(95, Math.round((parseInt(mDepth[1], 10) / targetDepth) * 100));
						emit({ type: "Progress", percent: pct });
					}
				} else if (line.indexOf("bestmove ") === 0) {
					var m = /^bestmove\s+(\S+)(?:\s+ponder\s+(\S+))?/.exec(line);
					if (m) {
						bestMoveUci = m[1];
						ponderUci = m[2] || null;
					}
					search = null;
					cleanup();
					if (aborted)
						emit({ type: "Aborted" });
					else
						emit({
							type: "Done",
							data: { bestMoveUci: bestMoveUci, ponderUci: ponderUci, lastInfo: lastInfo }
						});
				}
			}

			search = {
				cleanup: cleanup,
				stop: function () {
					aborted = true;
					send("stop");
				}
			};
			addListener(onLine);

			// VariantPath must be set before UCI_Variant: that is when the
			// engine resolves the name against built-in + custom variants.
			if (options.customVariantIni) {
				try {
					send("setoption name VariantPath value " + WriteVariantIni(options.customVariantIni));
				} catch (e) {
					NativeLog("failed to write custom variant config:", e);
				}
			}
			send("setoption name UCI_Variant value " + options.variant);
			if (evalFile)
				send("setoption name EvalFile value " + evalFile);
			if (typeof options.skillLevel === "number")
				send("setoption name Skill Level value " + options.skillLevel);
			send("setoption name UCI_Chess960 value " + (options.chess960 ? "true" : "false"));
			send("position fen " + options.fen);
			if (options.moveTimeMs)
				send("go movetime " + options.moveTimeMs);
			else
				send("go depth " + (options.depth || 12));
		}

		api.postMessage = function (message) {
			if (!message)
				return;
			switch (message.type) {
				case "Init":
					Init();
					break;
				case "Search":
					Search(message);
					break;
				case "Stop":
					if (search)
						search.stop();
					break;
			}
		};

		api.terminate = Shutdown;

		return api;
	}

	/*
	 * Builds the provider function to hand to JoclyFairy.setEngineProvider().
	 * One engine process is created per JocGame, matching the worker's
	 * lifetime exactly - jocly.fairy.js caches it in its own WeakMap.
	 */
	JoclyFairyNative.provider = function (config) {
		config = config || {};
		return function (baseURL, aGame, aOptions) {
			return CreateNativeEngine(config);
		};
	};

})();
