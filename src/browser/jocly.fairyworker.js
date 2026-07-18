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
 *
 *    As a special exception, the copyright holders give permission to link the
 *    code of portions of this program with the OpenSSL library under certain
 *    conditions as described in each individual source file and distribute
 *    linked combinations including the program with the OpenSSL library. You
 *    must comply with the GNU Affero General Public License in all respects
 *    for all of the code used other than as permitted herein. If you modify
 *    file(s) with this exception, you may extend this exception to your
 *    version of the file(s), but you are not obligated to do so. If you do not
 *    wish to do so, delete this exception statement from your version. If you
 *    delete this exception statement from all source files in the program,
 *    then also delete it in the license file.
 */

/*
 * This worker hosts the Fairy-Stockfish WebAssembly engine and talks to it
 * using the plain text UCI protocol (Module.postMessage()/addMessageListener()
 * as exposed by the Emscripten build in third-party/fairy-stockfish/stockfish.js).
 *
 * It is intentionally independent from jocly.aiworker.js (which hosts Jocly's
 * own native AI, jocly.uct.js / alpha-beta): Fairy-Stockfish is a much larger
 * payload (~1.6MB wasm) and is only loaded lazily, the first time a "fairy-
 * stockfish" level is actually selected, and stays loaded across moves so the
 * initialization cost is only paid once per match.
 *
 * Protocol with the main thread:
 *   -> { type: "Init", baseURL }
 *   <- { type: "Ready" }
 *   -> { type: "Search", variant, fen, moveTimeMs | depth, skillLevel, customVariantIni, evalFile }
 *   <- { type: "Progress", percent }     (best effort, coarse)
 *   <- { type: "Done", data: { bestMoveUci, ponderUci, evaluation } }
 *   -> { type: "Stop" }                  (abort an ongoing search)
 */

var window = self;

var sfEngine = null;
var sfReady = null;
var sfBaseURL = "";

// Path used in Emscripten's virtual filesystem to store a custom
// variants.ini-style config, when options.customVariantIni is set (see
// RunSearch() below and https://fairy-stockfish.github.io/custom-variants/).
var CUSTOM_VARIANT_PATH = "/jocly-custom-variants.ini";

// Per-worker cache of NNUE fetch outcomes, keyed "evalFile|variant":
// - a string value is the virtual-FS path the network was written to
// - false records a failed fetch (typically the file simply not being
//   deployed - NNUE networks are optional, see MaybeLoadEvalFile())
// Both outcomes are cached so a several-MB network is downloaded at most
// once per worker lifetime, and a *missing* optional network is probed
// (and logged) at most once too, instead of re-attempting a 404 on every
// single move. The worker is kept alive across every move of a match (see
// jocly.fairy.js's GetOrCreateWorker()), so this cache is long-lived.
var sfEvalFiles = {};

function FairyLog() {
	if (typeof console !== "undefined" && console.info)
		console.info.apply(console, ["[fairy-stockfish]"].concat(Array.prototype.slice.call(arguments)));
}

function LoadEngine() {
	if (sfReady)
		return sfReady;
	// Preflight: the bundled stockfish.wasm is a multi-threaded (pthreads)
	// Emscripten build - that's what stockfish.worker.js is for - and
	// pthreads hard-require SharedArrayBuffer. Browsers only expose
	// SharedArrayBuffer (in the page AND in its workers, like this one)
	// when the top-level document is "cross-origin isolated", i.e. served
	// with the HTTP headers:
	//   Cross-Origin-Opener-Policy: same-origin
	//   Cross-Origin-Embedder-Policy: require-corp
	// (see third-party/fairy-stockfish/README.md for a ready-to-use Apache
	// snippet; note these must be set on the HTML page, a .htaccess next
	// to the wasm files cannot help). Without them, stockfish.js throws a
	// bare "ReferenceError: Can't find variable: SharedArrayBuffer" from
	// inside importScripts() - synchronously, escaping every promise
	// chain, so without this preflight the main thread would never
	// receive Ready OR Error and the UI would sit on "thinking" forever.
	// Checking it here instead produces an actionable error message, and
	// lets jocly.fairy.js fall back to the native AI so the game goes on.
	if (typeof SharedArrayBuffer === "undefined") {
		sfReady = Promise.reject(new Error(
			"SharedArrayBuffer is not available in this browser context, so the " +
			"multi-threaded Fairy-Stockfish wasm build cannot run. This almost " +
			"always means the page is not cross-origin isolated: serve the " +
			"top-level HTML document with the HTTP headers " +
			"'Cross-Origin-Opener-Policy: same-origin' and " +
			"'Cross-Origin-Embedder-Policy: require-corp' " +
			"(see third-party/fairy-stockfish/README.md), then reload. " +
			"On Safari this additionally requires Safari 15.2 or newer."));
		// Silence the unhandled-rejection noise for the cached promise;
		// every real caller attaches its own catch via LoadEngine().
		sfReady.catch(function () { });
		return sfReady;
	}
	try {
		var stockfishJsURL = sfBaseURL + "stockfish.js";
		self.Module = {
			locateFile: function (path) {
				// stockfish.js requests stockfish.wasm (and, for multi-threaded
				// builds, stockfish.worker.js) by file name only; resolve them
				// next to the script we are about to importScripts() below.
				return sfBaseURL + path;
			},
			// stockfish.js auto-detects its own URL via
			// `document.currentScript.src` (browser main thread) or `__filename`
			// (Node). Neither exists in a Web Worker - there is no `document`
			// here - so that auto-detection silently resolves to undefined, and
			// stockfish.js then tells its pthread sub-worker (stockfish.worker.js)
			// to importScripts(undefined), which throws inside
			// `URL.createObjectURL()` ("Overload resolution failed"). Setting
			// mainScriptUrlOrBlob explicitly bypasses that broken auto-detection.
			mainScriptUrlOrBlob: stockfishJsURL
		};
		importScripts(stockfishJsURL);
		// Stockfish() is the Emscripten module factory exported by stockfish.js;
		// it resolves once the wasm binary is compiled and the engine is ready
		// to accept UCI commands.
		sfReady = Stockfish(self.Module).then(function (engine) {
			sfEngine = engine;
			FairyLog("engine ready", engine.UCIEngineName ? engine.UCIEngineName() : "");
			return engine;
		});
	} catch (e) {
		// e.g. importScripts() failing (network error, or an engine build
		// throwing at top level for a reason the preflight above didn't
		// anticipate): convert to a normal rejection so the main thread
		// gets a proper { type: "Error" } instead of hanging forever.
		sfReady = Promise.reject(e);
		sfReady.catch(function () { });
	}
	return sfReady;
}

/*
 * Fetches and installs an optional variant NNUE network (see the "evalFile"
 * doc in jocly.fairy.js for the full rationale), when options.evalFile is
 * set. Always writes it into the engine's virtual FS under a name built
 * from options.variant itself ("/" + variant + ".nnue"), never the file's
 * original on-disk name: the variant-name prefix of the *file name* is the
 * only thing Fairy-Stockfish's own NNUE activation check
 * (evaluate.cpp's on_eval_file_change) looks at, so this matches
 * unconditionally - for built-in and customVariantIni-derived variants
 * alike - and lets one downloaded net serve several same-piece-set
 * variants (e.g. the Capablanca prelude setups).
 *
 * Resolves with the virtual-FS path to point EvalFile at, or null to run
 * on classical evaluation. NEVER rejects: NNUE networks are deliberately
 * optional (none are bundled - see third-party/fairy-stockfish/nnue/
 * README.md), so a missing or failed fetch is logged, remembered (so it's
 * not re-attempted every move - see sfEvalFiles above), and otherwise
 * ignored rather than failing the whole search over a strength upgrade.
 */
function MaybeLoadEvalFile(engine, options) {
	if (!options.evalFile)
		return Promise.resolve(null);
	var cacheKey = options.evalFile + "|" + options.variant;
	if (cacheKey in sfEvalFiles)
		return Promise.resolve(sfEvalFiles[cacheKey] || null);
	var path = "/" + options.variant + ".nnue";
	return fetch(sfBaseURL + options.evalFile)
		.then(function (resp) {
			if (!resp.ok)
				throw new Error("HTTP " + resp.status);
			return resp.arrayBuffer();
		})
		.then(function (buf) {
			engine.FS.writeFile(path, new Uint8Array(buf));
			sfEvalFiles[cacheKey] = path;
			FairyLog("NNUE network '" + options.evalFile + "' loaded as " + path);
			return path;
		})
		.catch(function (e) {
			sfEvalFiles[cacheKey] = false;
			FairyLog("optional NNUE network '" + options.evalFile + "' unavailable (" + e + "), using classical evaluation");
			return null;
		});
}

/*
 * Runs a single UCI search and resolves with the parsed "bestmove" line.
 * Cancellable via the module-level `currentAbort` flag (see onmessage below).
 */
function RunSearch(engine, options) {
	return MaybeLoadEvalFile(engine, options).then(function (evalFilePath) {
		return new Promise(function (resolve, reject) {
			var bestMoveUci = null;
			var ponderUci = null;
			var lastInfo = null;
			var aborted = false;

			function onLine(line) {
				if (typeof line !== "string")
					return;
				//FairyLog("<<",line);
				if (line.indexOf("info ") === 0) {
					lastInfo = line;
					var mDepth = /\bdepth (\d+)/.exec(line);
					if (mDepth && options.progress) {
						var targetDepth = options.depth || 18;
						var pct = Math.min(95, Math.round((parseInt(mDepth[1], 10) / targetDepth) * 100));
						options.progress(pct);
					}
				} else if (line.indexOf("bestmove ") === 0) {
					var m = /^bestmove\s+(\S+)(?:\s+ponder\s+(\S+))?/.exec(line);
					if (m) {
						bestMoveUci = m[1];
						ponderUci = m[2] || null;
					}
					engine.removeMessageListener(onLine);
					RunSearch.currentStop = null;
					if (aborted)
						reject({ aborted: true });
					else
						resolve({ bestMoveUci: bestMoveUci, ponderUci: ponderUci, lastInfo: lastInfo });
				}
			}

			engine.addMessageListener(onLine);

			if (options.customVariantIni) {
				// Loads a custom Fairy-Stockfish variant definition (see
				// https://fairy-stockfish.github.io/custom-variants/) - used for
				// Jocly games/setups that have no built-in Fairy-Stockfish
				// variant but share the exact same piece set and rules as one,
				// just with a different starting position and/or castling
				// destination files. Written to Emscripten's virtual filesystem
				// (the wasm build has no access to a real filesystem), then
				// pointed to via the VariantPath UCI option - both steps must
				// happen before "setoption name UCI_Variant" below, since that's
				// when the engine actually parses the variant name against the
				// list of known + custom-loaded variants.
				// Re-writing the same path on every search is intentionally not
				// cached/skipped: it's cheap (a few hundred bytes written to an
				// in-memory virtual FS) and keeps this code simple and correct
				// even if a single worker instance is reused across games with
				// different custom variant definitions.
				try {
					engine.FS.writeFile(CUSTOM_VARIANT_PATH, options.customVariantIni);
					engine.postMessage("setoption name VariantPath value " + CUSTOM_VARIANT_PATH);
				} catch (e) {
					FairyLog("failed to write custom variant config:", e);
				}
			}
			engine.postMessage("setoption name UCI_Variant value " + options.variant);
			if (evalFilePath)
				engine.postMessage("setoption name EvalFile value " + evalFilePath);
			if (typeof options.skillLevel === "number")
				engine.postMessage("setoption name Skill Level value " + options.skillLevel);
			if (options.chess960)
				engine.postMessage("setoption name UCI_Chess960 value true");
			engine.postMessage("position fen " + options.fen);
			if (options.moveTimeMs)
				engine.postMessage("go movetime " + options.moveTimeMs);
			else
				engine.postMessage("go depth " + (options.depth || 12));

			// exposed so onmessage's "Stop" handler can interrupt this search
			RunSearch.currentStop = function () {
				aborted = true;
				engine.postMessage("stop");
			};
		});
	});
}

onmessage = function (e) {
	var message = e.data;
	switch (message.type) {
		case "Init":
			sfBaseURL = message.baseURL;
			LoadEngine().then(function () {
				postMessage({ type: "Ready" });
			}).catch(function (err) {
				postMessage({ type: "Error", error: "" + err });
			});
			break;

		case "Search":
			LoadEngine().then(function (engine) {
				return RunSearch(engine, {
					variant: message.variant,
					fen: message.fen,
					depth: message.depth,
					moveTimeMs: message.moveTimeMs,
					skillLevel: message.skillLevel,
					chess960: message.chess960,
					customVariantIni: message.customVariantIni,
					evalFile: message.evalFile,
					progress: function (percent) {
						postMessage({ type: "Progress", percent: percent });
					}
				});
			}).then(function (result) {
				postMessage({
					type: "Done",
					data: {
						bestMoveUci: result.bestMoveUci,
						ponderUci: result.ponderUci
					}
				});
			}).catch(function (err) {
				if (err && err.aborted)
					postMessage({ type: "Aborted" });
				else
					postMessage({ type: "Error", error: "" + (err && err.message || err) });
			});
			break;

		case "Stop":
			if (RunSearch.currentStop)
				RunSearch.currentStop();
			break;
	}
};
