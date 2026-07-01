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
 * This worker hosts the Scan WebAssembly engine (international/10x10
 * draughts, see third-party/scan and wasm_api.cpp) and talks to it through
 * a small set of exported C functions (scan_init/scan_go/...) via ccall -
 * NOT through Scan's native stdin/stdout "Hub" protocol, which does not map
 * onto a Worker (see the comment at the top of wasm_api.cpp for why: Scan's
 * own background stdin-listening thread has no access to stdin once ported
 * to wasm/pthreads, and a request/response ccall is a better fit for a
 * Worker than a text pipe would be anyway).
 *
 * It is intentionally independent from jocly.aiworker.js / jocly.fairyworker.js,
 * exactly like those two are independent from each other: a distinct engine,
 * a distinct (small: ~300KB wasm + ~10MB data) payload, loaded lazily only
 * once a "scan" level is actually selected, and kept alive across moves.
 *
 * Protocol with the main thread:
 *   -> { type: "Init", baseURL }
 *   <- { type: "Ready" }
 *   -> { type: "Search", fen, moveTimeMs | depth, bookEnabled }
 *   <- { type: "Done", data: { bestMove } }        (bestMove: "33-28" style,
 *                                                    Scan's own "natural"
 *                                                    notation - already
 *                                                    identical to Jocly's
 *                                                    own Move.ToString() for
 *                                                    this game, see
 *                                                    checkersbase-model.js)
 *   -> { type: "Stop" }   (best effort only - see RunSearch() below)
 *
 * Unlike Fairy-Stockfish, Scan has no built-in mid-search "stop" command in
 * this integration (wasm_api.cpp's scan_go() is a single synchronous call
 * for a fixed time budget, deliberately not wired to Scan's stdin-based
 * interrupt mechanism - see wasm_api.cpp's header comment). "Stop" is
 * accepted for protocol symmetry with jocly.fairyworker.js but only takes
 * effect *before* a search actually starts (it cannot interrupt one already
 * running inside the wasm call, which is at most moveTimeMs long anyway).
 */

var window = self;

var scanEngineReady = null;
var scanModule = null;
var scanBaseURL = "";
var scanBookLoaded = false;

// bumped only if wasm_api.cpp's exported function set changes
var TT_SIZE_LOG2 = 21; // 2^21 entries * 16 bytes = 32MB transposition table

function ScanLog() {
	if (typeof console !== "undefined" && console.info)
		console.info.apply(console, ["[scan]"].concat(Array.prototype.slice.call(arguments)));
}

function FetchArrayBuffer(url) {
	return fetch(url).then(function (r) {
		if (!r.ok) throw new Error("failed to fetch " + url + " (" + r.status + ")");
		return r.arrayBuffer();
	});
}

function LoadEngine() {
	if (scanEngineReady)
		return scanEngineReady;

	var scanJsURL = scanBaseURL + "scan.js";
	importScripts(scanJsURL);
	// ScanModule is the Emscripten module factory (-s MODULARIZE=1
	// -s EXPORT_NAME=ScanModule), exported globally by scan.js via importScripts.

	scanEngineReady = FetchArrayBuffer(scanBaseURL + "scan.wasm")
		.then(function (wasmBinary) {
			return ScanModule({ wasmBinary: new Uint8Array(wasmBinary) });
		})
		.then(function (mod) {
			scanModule = mod;
			// data/eval is mandatory (the engine cannot evaluate without it);
			// data/book is optional (only improves/speeds up the opening).
			return FetchArrayBuffer(scanBaseURL + "data/eval").then(function (evalBuf) {
				mod.FS.mkdir("data");
				mod.FS.writeFile("data/eval", new Uint8Array(evalBuf));
				return FetchArrayBuffer(scanBaseURL + "data/book").catch(function () {
					return null; // book is optional: missing/failed fetch is not fatal
				});
			}).then(function (bookBuf) {
				if (bookBuf) {
					mod.FS.writeFile("data/book", new Uint8Array(bookBuf));
					scanBookLoaded = true;
				}
				var ok = mod.ccall("scan_init", "number", ["number", "number"],
					[scanBookLoaded ? 1 : 0, TT_SIZE_LOG2]);
				if (!ok) throw new Error("scan_init failed");
				ScanLog("engine ready", scanBookLoaded ? "(with book)" : "(no book)");
				return mod;
			});
		});

	return scanEngineReady;
}

/*
 * Runs a single synchronous search and resolves with the resulting move
 * (Scan's own "natural" notation string), or null if the position has no
 * legal move (checked by wasm_api.cpp's scan_go() itself).
 */
function RunSearch(mod, options) {
	mod.ccall("scan_new_game", null, [], []); // clears the transposition table
	var okPos = mod.ccall("scan_set_position_fen", "number", ["string"], [options.fen]);
	if (!okPos)
		throw new Error("scan: invalid FEN '" + options.fen + "'");

	if (options.progress) options.progress(10); // best effort only: scan_go() below is a single blocking call, no incremental progress available

	var timeSec = options.moveTimeMs ? options.moveTimeMs / 1000 : 1.0;
	var depthMax = options.depth || 0;
	var useBook = (options.bookEnabled !== false) && scanBookLoaded;

	var move = mod.ccall("scan_go", "string", ["number", "number", "number"],
		[timeSec, depthMax, useBook ? 1 : 0]);

	if (options.progress) options.progress(100);

	return move || null;
}

var searchPending = false; // guards against a "Stop" racing a not-yet-started search

onmessage = function (e) {
	var message = e.data;
	switch (message.type) {
		case "Init":
			scanBaseURL = message.baseURL;
			LoadEngine().then(function () {
				postMessage({ type: "Ready" });
			}).catch(function (err) {
				postMessage({ type: "Error", error: "" + err });
			});
			break;

		case "Search":
			searchPending = true;
			LoadEngine().then(function (mod) {
				if (!searchPending) throw { aborted: true }; // Stop arrived before the engine finished loading
				return RunSearch(mod, {
					fen: message.fen,
					depth: message.depth,
					moveTimeMs: message.moveTimeMs,
					bookEnabled: message.bookEnabled,
					progress: function (percent) {
						postMessage({ type: "Progress", percent: percent });
					}
				});
			}).then(function (bestMove) {
				searchPending = false;
				postMessage({ type: "Done", data: { bestMove: bestMove } });
			}).catch(function (err) {
				searchPending = false;
				if (err && err.aborted)
					postMessage({ type: "Aborted" });
				else
					postMessage({ type: "Error", error: "" + (err && err.message || err) });
			});
			break;

		case "Stop":
			// see header comment: cannot interrupt a search already inside
			// the wasm call, only prevents one that hasn't started yet.
			searchPending = false;
			break;
	}
};
