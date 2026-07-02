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
 * JoclyScan plugs the Scan engine (see third-party/scan and
 * src/browser/jocly.scanworker.js) into Jocly's existing "level.ai" dispatch
 * mechanism (see JocGame.prototype.StartMachine in jocly.game.js), the same
 * way jocly.fairy.js plugs in Fairy-Stockfish and jocly.uct.js plugs in the
 * native UCT AI.
 *
 * A level using this AI looks like:
 *
 *   {
 *     "name": "expert",
 *     "label": "Expert",
 *     "ai": "scan",
 *     "moveTimeMs": 1000,    // either moveTimeMs or depth should be set
 *     "depth": 0,
 *     "bookEnabled": true    // optional, defaults to true
 *   }
 *
 * Unlike jocly.fairy.js, this module needs no move-notation translation
 * layer at all (no TranslitMove/pieceMap equivalent): Scan's own "natural"
 * move notation ("33-28", "34x23x12"...) is already exactly what
 * checkersbase-model.js's Move.ToString() produces for the draughts
 * (international, 10x10) game - verified directly, including multi-capture
 * chains like "33x28x15", which checkersbase-model.js's own overridden
 * GetBestMatchingMove() already specifically normalizes/sorts before
 * comparing - reused as-is below.
 *
 * The board side is *almost* as direct: checkersbase-model.js's
 * ExportBoardState() piece-group syntax ("W31-50:B1-20") matches Scan's FEN
 * dialect (fen.cpp's pos_from_fen()) byte for byte - except that, unlike
 * Scan, it carries no leading "<turn>:" prefix (Jocly tracks whose turn it
 * is out of band, via aGame.mWho, rather than embedding it in this
 * particular export) - so this module prepends it itself
 * (buildScanFen() below) before calling scan_set_position_fen().
 *
 * Requirement on the game module: aGame.mBoard.ExportBoardState(aGame) must
 * return a Scan-compatible FEN (true of checkersbase-model.js, used by
 * draughts-model.js and every other checkers/draughts variant in
 * src/games/checkers - NOT true of every one of them rules-wise, see
 * "variant" below). Games without this (e.g. non-checkers games) are simply
 * not eligible to declare a "scan" level; this module fails loudly rather
 * than silently misplaying if asked to.
 *
 * variant (optional, defaults to Scan's own "normal" i.e. standard
 * international rules): forwarded verbatim to scan_set_param("variant",...)
 * before each search, for the handful of Model.Game.g rule variants Scan
 * itself also implements (killer, bt / breakthrough, frisian, losing - see
 * Scan's own protocol.txt). It is the caller's responsibility to only
 * declare a "scan" level with a non-default variant on a Jocly game module
 * whose own rules (Model.Game.InitGame()'s "this.g.xxx" flags, see
 * checkersbase-model.js) actually match that Scan variant - this module
 * does not attempt to verify the two rule sets agree, the same way
 * jocly.fairy.js's chess960/pieceMap options don't verify a chess variant's
 * rules either.
 */

var JoclyScan = {};

if (typeof WorkerGlobalScope == 'undefined' && typeof window == 'undefined') {
	module.exports.JoclyScan = JoclyScan;
	(function () {
		var r = require;
		var ju = r("./jocly.util.js");
		global.JocUtil = ju.JocUtil;
	})();
} else
	this.JoclyScan = JoclyScan;

(function () {

	// One Scan worker is started lazily on first use and then kept around
	// (per JocGame instance) so the wasm payload + eval/book data (~10MB)
	// and engine initialization cost are only paid once per match, not once
	// per move - same rationale and same per-game keying as jocly.fairy.js.
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
			throw new Error("scan: no Worker available in this environment (browser-only feature)");
		var worker = new Worker(baseURL + "jocly.scanworker.js");
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
				baseURL: baseURL + "scan/"
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
	 * Converts a Scan "bestmove" string (e.g. "33-28", "34x23x12") back into
	 * one of the actual legal Jocly Move objects for the current position.
	 * We don't reconstruct the Move by hand (its internal format carries
	 * per-piece indices, capture bookkeeping, etc. - see
	 * checkersbase-model.js's Model.Move.Init()); instead we regenerate the
	 * real list of legal moves and reuse checkersbase-model.js's own
	 * overridden GetBestMatchingMove(), which already knows how to
	 * normalize/sort multi-capture chains for this exact notation (it was
	 * originally written for matching notation typed by a human or loaded
	 * from a PJN game record - Scan speaks the same "natural" dialect, so no
	 * separate matching logic is needed here).
	 */
	function ResolveMove(aGame, scanMove) {
		aGame.mBoard.mMoves = [];
		aGame.mBoard.GenerateMoveObjects(aGame);
		var candidates = aGame.mBoard.mMoves;
		if (!candidates || candidates.length === 0)
			throw new Error("scan: no legal move available to match '" + scanMove + "'");
		return aGame.GetBestMatchingMove(scanMove, candidates);
	}

	JoclyScan.startMachine = function (aGame, aOptions) {
		var level = aOptions.level || {};
		if (typeof aGame.mBoard.ExportBoardState != "function" || typeof aGame.mBoard.ExportBoardState(aGame) != "string") {
			console.error("scan: this game does not support FEN export (ExportBoardState)");
			aGame.mBestMoves = [];
			JocUtil.schedule(aGame, "Done", {});
			return;
		}

		// aGame.mBoard.ExportBoardState(aGame) yields Scan's own per-side
		// piece-group syntax ("W31-50:B1-20") but, unlike Scan's FEN dialect,
		// carries no leading "<turn>:" prefix - Jocly tracks whose turn it is
		// out of band (aGame.mWho: PLAYER_A=1 -> 'W', PLAYER_B=-1 -> 'B', see
		// jocly.game.js) rather than embedding it in this particular export.
		// Verified directly: feeding ExportBoardState()'s output as-is to
		// scan_set_position_fen() fails (Scan's parser expects the turn
		// letter first), prepending it here round-trips correctly.
		var fen = (aGame.mWho == 1 ? "W" : "B") + ":" + aGame.mBoard.ExportBoardState(aGame);
		var entry = GetOrCreateWorker(aGame, aOptions);

		aGame.mScanAbort = function () {
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
						fen: fen,
						depth: level.depth,
						moveTimeMs: level.moveTimeMs,
						bookEnabled: level.bookEnabled
					});
				});
			})
			.then(function (data) {
				if (!data.bestMove) {
					// no legal move: position is actually terminal - let the
					// generic engine confirm finished/winner state with an
					// empty move list, rather than guessing here.
					aGame.mBestMoves = [];
				} else {
					var move = ResolveMove(aGame, data.bestMove);
					aGame.mBestMoves = [move];
				}
				delete aGame.mScanAbort;
				aGame.Done();
			})
			.catch(function (err) {
				delete aGame.mScanAbort;
				if (err && err.aborted) {
					aGame.mBestMoves = [];
					aGame.mAborted = true;
					aGame.Done();
					return;
				}
				console.error("scan search failed:", err);
				aGame.mBestMoves = [];
				aGame.Done();
			});
	};

	/*
	 * Hook for JocGame.prototype.AbortMachine()-like paths: if a search is in
	 * flight, ask the worker to stop early. See jocly.scanworker.js's header
	 * comment for why this only takes effect before scan_go() actually
	 * starts running inside the wasm call, unlike Fairy-Stockfish's real
	 * mid-search "stop".
	 */
	JoclyScan.abortMachine = function (aGame) {
		if (aGame.mScanAbort)
			aGame.mScanAbort();
	};

})();
