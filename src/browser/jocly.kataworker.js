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
 * This worker hosts kataeval - KataGo's evaluation and search compiled to
 * WebAssembly (see third-party/katago/README.md and
 * saigo-online/katago-webgpu) - and talks to it through its small C ABI
 * (kgeLoad / kgeSearch / kgeSetGumbel / kgeError) via ccall.
 *
 * It targets the PLAIN build (kataeval.js), not the threaded one. The threaded
 * build runs KataGo's real Search and streams live statistics, but needs
 * -pthread, a 33-thread pool, 512MB of initial memory and a cross-origin
 * isolated page; the plain one has a single blocking kgeSearch() that runs a
 * batched MCTS to a budget and returns one move, which is exactly what Jocly
 * asks an engine for. Blocking is what a worker is for.
 *
 * That also means one search at a time by construction: the plain build has no
 * asyncify suspension to interleave, so unlike katago-webgpu's own
 * kata-worker.js this file needs no serialising promise chain.
 *
 * Independent from jocly.aiworker.js / jocly.fairyworker.js / jocly.scanworker.js
 * for the same reason those are independent from each other: a distinct engine
 * with a distinct payload, loaded lazily only once a "kata" level is selected,
 * and kept alive across moves - the net is the expensive part.
 *
 * Protocol with the main thread:
 *   -> { type: "Init", baseURL, net, boardSize }
 *   <- { type: "Ready", data: { backend, modelVersion } }
 *   -> { type: "Search", moves: [{loc, col}], toPlay, komi, visits, moveTimeMs, gumbel }
 *   <- { type: "Done", data: { bestMove, winrate, visits, pv } }
 *   -> { type: "Stop" }   (best effort only, see below)
 *
 * The board size is fixed by kgeLoad, so a worker serves one board size -
 * which is why jocly.kata.js keys its workers per game.
 */

var window = self;

var kataEngineReady = null;
var kataModule = null;
var kataBaseURL = "";
var kataBoardSize = 19;

// Search inputs are written straight into the wasm heap, into buffers
// allocated once. MAXMV bounds the game length the engine will be told about;
// a Go game that long has other problems.
var MAXMV = 2048;
var PVCAP = 32;
var mlPtr, mcPtr, bestPtr, wrPtr, pvPtr, pvLenPtr, visitsPtr;

function KataLog() {
	if (typeof console !== "undefined" && console.info)
		console.info.apply(console, ["[kata]"].concat(Array.prototype.slice.call(arguments)));
}

function FetchArrayBuffer(url) {
	return fetch(url).then(function (r) {
		if (!r.ok) throw new Error("failed to fetch " + url + " (" + r.status + ")");
		return r.arrayBuffer();
	});
}

function KataError() {
	if (typeof console !== "undefined" && console.error)
		console.error.apply(console, ["[kata]"].concat(Array.prototype.slice.call(arguments)));
}

function LoadEngine(net, boardSize) {
	if (kataEngineReady)
		return kataEngineReady;

	if (!net)
		return Promise.reject(new Error("kata: the level declares no net"));

	importScripts(kataBaseURL + "kataeval.js");
	// createKata is the Emscripten module factory (-sMODULARIZE
	// -sEXPORT_NAME=createKata), exported globally by kataeval.js.

	kataBoardSize = boardSize;
	kataEngineReady = FetchArrayBuffer(kataBaseURL + "kataeval.wasm")
		.then(function (wasmBinary) {
			return createKata({
				wasmBinary: new Uint8Array(wasmBinary),
				locateFile: function (p) { return kataBaseURL + p; }
			});
		})
		.then(function (mod) {
			kataModule = mod;
			return FetchArrayBuffer(kataBaseURL + net).then(function (netBuf) {
				// Said out loud because its absence is the one setup mistake
				// that is otherwise silent until the engine is asked to move,
				// and because the file is not in the repository - somebody has
				// to have put it there.
				KataLog("network found:", net,
					"(" + (netBuf.byteLength / 1048576).toFixed(1) + " MB)");
				mod.FS.writeFile("/model.bin.gz", new Uint8Array(netBuf));
				// kgeLoad acquires the GPU device, which it does asynchronously
				// and blocks on through Asyncify - hence { async: true }.
				return mod.ccall("kgeLoad", "number", ["string", "number"],
					["/model.bin.gz", boardSize], { async: true });
			}).then(function (ok) {
				if (!ok)
					throw new Error("kgeLoad: " + mod.ccall("kgeError", "string", [], []));
				mlPtr = mod._malloc(MAXMV * 4);
				mcPtr = mod._malloc(MAXMV * 4);
				bestPtr = mod._malloc(4);
				wrPtr = mod._malloc(4);
				pvPtr = mod._malloc(PVCAP * 4);
				pvLenPtr = mod._malloc(4);
				visitsPtr = mod._malloc(4);
				var gpu = mod.ccall("kgeBackendIsGpu", "number", [], []);
				var version = mod.ccall("kgeModelVersion", "number", [], []);
				KataLog("engine ready on", gpu ? "WebGPU" : "CPU (Eigen)",
					"- model version", version, "- board", boardSize);
				return { backend: gpu ? "WebGPU" : "CPU", modelVersion: version };
			});
		});

	return kataEngineReady;
}

// Write the move sequence into the persistent heap buffers, in place.
function WriteMoves(mod, moves) {
	var n = Math.min(moves.length, MAXMV);
	var mi = mlPtr >> 2, ci = mcPtr >> 2;
	for (var i = 0; i < n; i++) {
		mod.HEAP32[mi + i] = moves[i].loc;
		mod.HEAP32[ci + i] = moves[i].col;
	}
	if (moves.length > MAXMV)
		KataLog("game longer than " + MAXMV + " moves: the engine sees the first " + MAXMV);
	return n;
}

/*
 * One blocking search. Resolves with the chosen point (y*size+x, or -1 for a
 * pass) plus what the engine thought of it.
 */
function RunSearch(mod, options) {
	var n = WriteMoves(mod, options.moves || []);

	// Gumbel-top-n root selection is stronger than plain PUCT at the low visit
	// counts a browser can afford, which is the regime every level here is in.
	// n<=0 restores PUCT.
	mod.ccall("kgeSetGumbel", null, ["number"], [options.gumbel === undefined ? 16 : options.gumbel]);

	if (options.progress) options.progress(10);   // best effort: kgeSearch is one blocking call

	return Promise.resolve(mod.ccall("kgeSearch", "number",
		["number", "number", "number", "number", "number", "number", "number",
			"number", "number", "number", "number", "number", "number"],
		[mlPtr, mcPtr, n, options.toPlay, options.komi,
			options.visits | 0, options.moveTimeMs | 0,
			bestPtr, wrPtr, pvPtr, PVCAP, pvLenPtr, visitsPtr],
		{ async: true }
	)).then(function (ok) {
		if (!ok)
			throw new Error("kgeSearch: " + mod.ccall("kgeError", "string", [], []));
		if (options.progress) options.progress(100);
		var pvLen = mod.HEAP32[pvLenPtr >> 2];
		var pv = [];
		for (var i = 0; i < pvLen; i++)
			pv.push(mod.HEAP32[(pvPtr >> 2) + i]);
		return {
			bestMove: mod.HEAP32[bestPtr >> 2],
			winrate: mod.HEAPF32[wrPtr >> 2],
			visits: mod.HEAP32[visitsPtr >> 2],
			pv: pv
		};
	});
}

var searchPending = false;   // guards a "Stop" racing a not-yet-started search

onmessage = function (e) {
	var message = e.data;
	switch (message.type) {
		case "Init":
			kataBaseURL = message.baseURL;
			LoadEngine(message.net, message.boardSize).then(function (info) {
				postMessage({ type: "Ready", data: info });
			}).catch(function (err) {
				// The likeliest cause by far, and worth naming rather than
				// leaving as a fetch failure on a path nobody recognises.
				KataError("engine unavailable:", "" + (err && err.message || err),
					"- expected the network at " + kataBaseURL + (message.net || "(none named)")
					+ "; see third-party/katago/README.md");
				postMessage({ type: "Error", error: "" + (err && err.message || err) });
			});
			break;

		case "Search":
			searchPending = true;
			kataEngineReady.then(function () {
				if (!searchPending) throw { aborted: true };   // Stop arrived while the net was still loading
				return RunSearch(kataModule, {
					moves: message.moves,
					toPlay: message.toPlay,
					komi: message.komi,
					visits: message.visits,
					moveTimeMs: message.moveTimeMs,
					gumbel: message.gumbel,
					progress: function (percent) {
						postMessage({ type: "Progress", percent: percent });
					}
				});
			}).then(function (data) {
				searchPending = false;
				postMessage({ type: "Done", data: data });
			}).catch(function (err) {
				searchPending = false;
				if (err && err.aborted)
					postMessage({ type: "Aborted" });
				else
					postMessage({ type: "Error", error: "" + (err && err.message || err) });
			});
			break;

		case "Stop":
			// Only prevents a search that has not started: kgeSearch is a single
			// blocking call in the plain build with no interrupt, and it is
			// bounded by the level's own budget anyway.
			searchPending = false;
			break;
	}
};
