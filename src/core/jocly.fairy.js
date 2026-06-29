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
 * JoclyFairy plugs the Fairy-Stockfish engine (see third-party/fairy-stockfish
 * and src/browser/jocly.fairyworker.js) into Jocly's existing "level.ai"
 * dispatch mechanism (see JocGame.prototype.StartMachine in jocly.game.js),
 * the same way jocly.uct.js plugs in the native UCT AI.
 *
 * A level using this AI looks like:
 *
 *   {
 *     "name": "expert",
 *     "label": "Expert (Fairy-Stockfish)",
 *     "ai": "fairy-stockfish",
 *     "variant": "chess",      // Fairy-Stockfish variant name (UCI_Variant)
 *     "skillLevel": 20,        // 0-20, optional (defaults to full strength)
 *     "moveTimeMs": 1000,      // either moveTimeMs or depth should be set
 *     "depth": 0
 *   }
 *
 * Requirements on the game module (currently only implemented by chessbase,
 * see src/games/chessbase/base-model.js / grid-geo-model.js):
 *   - aGame.mBoard.ExportBoardState(aGame) must return a standard FEN string
 *   - Model.Move.ToString("engine") must return a UCI-ish "e2e4"/"e7e8q" form
 * Only games meeting both are eligible to declare a "fairy-stockfish" level;
 * this module does not attempt to support games that don't (it will simply
 * fail loudly rather than silently play a wrong/random move).
 */

var JoclyFairy = {};

if (typeof WorkerGlobalScope == 'undefined' && typeof window == 'undefined') {
	module.exports.JoclyFairy = JoclyFairy;
	(function () {
		var r = require;
		var ju = r("./jocly.util.js");
		global.JocUtil = ju.JocUtil;
	})();
} else
	this.JoclyFairy = JoclyFairy;

(function () {

	// One Fairy-Stockfish worker is started lazily on first use and then kept
	// around (per JocGame instance) so the ~1.6MB wasm payload and engine
	// initialization cost are only paid once per match, not once per move.
	// Keyed by JocGame instance since several matches/boards can coexist
	// (e.g. comp-vs-comp, or several <jocly-game> elements on one page).
	var workersByGame = (typeof WeakMap != "undefined") ? new WeakMap() : null;
	var fallbackWorkerSlot = null; // used in environments without WeakMap (legacy browsers)

	function GetOrCreateWorker(aGame, aOptions) {
		var existing = workersByGame ? workersByGame.get(aGame) : (fallbackWorkerSlot && fallbackWorkerSlot.game === aGame ? fallbackWorkerSlot.worker : null);
		if (existing)
			return existing;

		// aGame.config.baseURL is set automatically in the browser (see
		// BrowserScriptLoader.getBaseURL() in jocly.core.js). It is not
		// auto-detected in non-browser contexts (Node, Electron main
		// process, tests...), so aOptions.baseURL lets callers override it
		// explicitly there.
		var baseURL = (aOptions && aOptions.baseURL) || (aGame.config && aGame.config.baseURL) || "";
		if (typeof Worker == "undefined")
			throw new Error("fairy-stockfish: no Worker available in this environment (browser-only feature)");
		var worker = new Worker(baseURL + "jocly.fairyworker.js");
		var readyPromise = new Promise(function (resolve, reject) {
			worker.onmessage = function (e) {
				var message = e.data;
				if (message.type == "Ready")
					resolve();
				else if (message.type == "Error")
					reject(new Error(message.error));
			};
			worker.postMessage({
				type: "Init",
				baseURL: baseURL + "fairy-stockfish/"
			});
		});
		var entry = { worker: worker, ready: readyPromise };
		if (workersByGame)
			workersByGame.set(aGame, entry);
		else
			fallbackWorkerSlot = { game: aGame, worker: entry };
		return entry;
	}

	/*
	 * Converts a Fairy-Stockfish "bestmove" UCI string (e.g. "e2e4", "e7e8q",
	 * "e1g1") back into one of the actual legal Jocly Move objects for the
	 * current position. We don't reconstruct the Move by hand (the internal
	 * Move format is game/variant-specific - flags, castle markers, special
	 * en-passant bits...); instead we regenerate the real list of legal moves
	 * and pick the one whose own "engine" notation best matches what the
	 * engine returned, exactly like Jocly already does for loaded PGN/move
	 * lists (see JocGame.prototype.GetBestMatchingMove).
	 */
	function ResolveMove(aGame, uciMove) {
		aGame.mBoard.mMoves = [];
		aGame.mBoard.GenerateMoveObjects(aGame);
		var candidates = aGame.mBoard.mMoves;
		if (!candidates || candidates.length === 0)
			throw new Error("fairy-stockfish: no legal move available to match '" + uciMove + "'");
		// GetBestMatchingMove() compares against Move.ToString() (default
		// "natural" format); since Fairy-Stockfish speaks UCI, match against
		// the "engine" format instead, which native chessbase moves already
		// render close to UCI (e2e4, e7e8Q...).
		var engineStrings = candidates.map(function (m) {
			return (typeof m.ToString == "function") ? m.ToString("engine") : aGame.CreateMove(m).ToString("engine");
		});
		var bestIndex = -1, bestDist = Infinity;
		engineStrings.forEach(function (str, index) {
			var str0 = str.toLowerCase();
			var dist = JocGame.Levenshtein(uciMove, str0) / (Math.max(uciMove.length, str0.length) + 1);
			if (dist < bestDist) {
				bestDist = dist;
				bestIndex = index;
			}
		});
		if (bestIndex < 0)
			throw new Error("fairy-stockfish: could not match engine move '" + uciMove + "' to any legal move");
		return candidates[bestIndex];
	}

	JoclyFairy.startMachine = function (aGame, aOptions) {
		var level = aOptions.level || {};
		var variant = level.variant;
		if (!variant) {
			console.error("fairy-stockfish level is missing a 'variant' field");
			aGame.mBestMoves = [];
			JocUtil.schedule(aGame, "Done", {});
			return;
		}
		if (typeof aGame.mBoard.ExportBoardState != "function" || typeof aGame.mBoard.ExportBoardState(aGame) != "string") {
			console.error("fairy-stockfish: this game does not support FEN export (ExportBoardState)");
			aGame.mBestMoves = [];
			JocUtil.schedule(aGame, "Done", {});
			return;
		}

		var fen = aGame.mBoard.ExportBoardState(aGame);
		var entry = GetOrCreateWorker(aGame, aOptions);

		aGame.mFairyAbort = function () {
			entry.worker.postMessage({ type: "Stop" });
		};

		entry.ready
			.then(function () {
				return new Promise(function (resolve, reject) {
					entry.worker.onmessage = function (e) {
						var message = e.data;
						switch (message.type) {
							case "Progress":
								if (aGame.mProgressCallback)
									aGame.mProgressCallback(message.percent);
								break;
							case "Done":
								resolve(message.data);
								break;
							case "Aborted":
								reject({ aborted: true });
								break;
							case "Error":
								reject(new Error(message.error));
								break;
						}
					};
					entry.worker.postMessage({
						type: "Search",
						variant: variant,
						fen: fen,
						depth: level.depth,
						moveTimeMs: level.moveTimeMs,
						skillLevel: level.skillLevel
					});
				});
			})
			.then(function (data) {
				if (!data.bestMoveUci || data.bestMoveUci === "(none)") {
					// no legal move: position is actually terminal: let the
					// generic engine confirm finished/winner state with an
					// empty move list, rather than guessing here.
					aGame.mBestMoves = [];
				} else {
					var move = ResolveMove(aGame, data.bestMoveUci.toLowerCase());
					aGame.mBestMoves = [move];
				}
				delete aGame.mFairyAbort;
				aGame.Done();
			})
			.catch(function (err) {
				delete aGame.mFairyAbort;
				if (err && err.aborted) {
					aGame.mBestMoves = [];
					aGame.mAborted = true;
					aGame.Done();
					return;
				}
				console.error("fairy-stockfish search failed:", err);
				aGame.mBestMoves = [];
				aGame.Done();
			});
	};

	/*
	 * Hook for JocGame.prototype.AbortMachine()-like paths: if a search is in
	 * flight, ask the engine to stop early rather than leaving the worker
	 * crunching after the user navigated away/changed mode.
	 */
	JoclyFairy.abortMachine = function (aGame) {
		if (aGame.mFairyAbort)
			aGame.mFairyAbort();
	};

})();
