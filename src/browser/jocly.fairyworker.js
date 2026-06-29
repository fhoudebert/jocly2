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
 *   -> { type: "Search", variant, fen, moveTimeMs | depth, skillLevel }
 *   <- { type: "Progress", percent }     (best effort, coarse)
 *   <- { type: "Done", data: { bestMoveUci, ponderUci, evaluation } }
 *   -> { type: "Stop" }                  (abort an ongoing search)
 */

var window = self;

var sfEngine = null;
var sfReady = null;
var sfBaseURL = "";

function FairyLog() {
	if (typeof console !== "undefined" && console.info)
		console.info.apply(console, ["[fairy-stockfish]"].concat(Array.prototype.slice.call(arguments)));
}

function LoadEngine() {
	if (sfReady)
		return sfReady;
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
	return sfReady;
}

/*
 * Runs a single UCI search and resolves with the parsed "bestmove" line.
 * Cancellable via the module-level `currentAbort` flag (see onmessage below).
 */
function RunSearch(engine, options) {
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

		engine.postMessage("setoption name UCI_Variant value " + options.variant);
		if (typeof options.skillLevel === "number")
			engine.postMessage("setoption name Skill Level value " + options.skillLevel);
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
