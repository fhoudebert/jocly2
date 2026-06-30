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
 *     "depth": 0,
 *     "pieceMap": { "M": "C" }, // optional, see below
 *     "chess960": true          // optional, sets UCI_Chess960 (see below)
 *   }
 *
 * Requirements on the game module (currently only implemented by chessbase,
 * see src/games/chessbase/base-model.js / grid-geo-model.js):
 *   - aGame.mBoard.ExportBoardState(aGame) must return a standard FEN string
 *   - Model.Move.ToString("engine") must return a UCI-ish "e2e4"/"e7e8q" form
 * Only games meeting both are eligible to declare a "fairy-stockfish" level;
 * this module does not attempt to support games that don't (it will simply
 * fail loudly rather than silently play a wrong/random move).
 *
 * pieceMap (optional): some variants are implemented independently by Jocly
 * and by Fairy-Stockfish, using the exact same rules and starting position
 * but a *different* single-letter piece abbreviation for one or more piece
 * types (e.g. Jocly's Capablanca/Grand chancellor is "M" while
 * Fairy-Stockfish's is "C"). Comparing the official Fairy-Stockfish
 * variant.cpp startFen against Jocly's own ExportBoardState() output for the
 * same variant is how this was verified for each variant declared below.
 * When present, pieceMap is a from-Jocly-letter to-Fairy-Stockfish-letter
 * table (uppercase keys only; TranslitFen() below derives the lowercase
 * mapping automatically), applied to:
 *   - the FEN sent to the engine (TranslitFen, Jocly -> Fairy-Stockfish)
 *   - the promotion suffix of the move sent back by the engine, before
 *     matching it against Jocly's own legal moves (TranslitMove, the
 *     reverse direction)
 * It must NOT be used to paper over an actual rules difference (different
 * starting position, different castling availability, etc.) - only pure
 * piece-letter aliasing where both sides implement identical rules.
 *
 * chess960 (optional): sends "setoption name UCI_Chess960 value true" before
 * the position/search, switching the engine to Chess960-style castling
 * rules and notation. Use for variants whose Jocly module already plays a
 * single, freely-chosen starting position per game (via its own "prelude"
 * mechanism - see prelude-model.js) and where Jocly's plain "KQkq" FEN
 * castling rights remain unambiguous (i.e. at most one rook of each color
 * on each side of the king - true for standard 8x8 Chess960, not
 * necessarily for every large-board 960 variant).
 *
 * variants (optional, mutually exclusive with a static "variant"): for a
 * single Jocly game module whose own "prelude" mechanism lets the player
 * choose between several genuinely different variants at the start of each
 * game (e.g. capablanca-chess's prelude offers Capablanca/Gothic/Carrera/
 * Embassy/Janus/... on the same 10x8 board), "variants" is an array of
 * { "setup": <prelude setup index>, "variant": ..., "pieceMap": ... }
 * entries. At search time, ResolveLevel() below looks up
 * aGame.cbVar.prelude[0].persistent (the setup index recorded once the
 * player's prelude choice has been applied - see prelude-model.js) and
 * picks the matching entry, merging it onto the level's other shared
 * fields (skillLevel, moveTimeMs, ...). If no prelude choice has been
 * recorded yet, or none of the declared entries match the chosen setup
 * (e.g. the player picked a variant with no Fairy-Stockfish equivalent),
 * the search fails loudly rather than guessing a variant.
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
	 * Builds the full (upper+lower case) Jocly-letter -> Fairy-Stockfish-letter
	 * map from the uppercase-only pieceMap declared on a level, and its
	 * reverse (Fairy-Stockfish -> Jocly), used respectively by TranslitFen()
	 * and TranslitMove() below.
	 */
	function BuildPieceMaps(pieceMap) {
		var toFairy = {}, toJocly = {};
		if (pieceMap) {
			for (var upper in pieceMap) {
				if (!pieceMap.hasOwnProperty(upper))
					continue;
				var fairyUpper = pieceMap[upper];
				var lower = upper.toLowerCase();
				var fairyLower = fairyUpper.toLowerCase();
				toFairy[upper] = fairyUpper;
				toFairy[lower] = fairyLower;
				toJocly[fairyUpper] = upper;
				toJocly[fairyLower] = lower;
			}
		}
		return { toFairy: toFairy, toJocly: toJocly };
	}

	/*
	 * Applies a letter substitution map to the piece-placement field of a FEN
	 * only (first space-separated field) - the only place piece letters
	 * appear. Leaves turn/castling/en-passant/clock fields untouched (castling
	 * letters happen to be piece letters too in some variants - e.g. "M" for
	 * a chancellor that can still castle - but Jocly's castling letters are
	 * always plain "KQkq" file-of-king-rook style in the variants this is
	 * used for, never the substituted piece letters, so this is safe).
	 */
	function TranslitFen(fen, map) {
		if (!map || Object.keys(map).length === 0)
			return fen;
		var firstSpace = fen.indexOf(" ");
		var placement = firstSpace < 0 ? fen : fen.substring(0, firstSpace);
		var rest = firstSpace < 0 ? "" : fen.substring(firstSpace);
		var translated = placement.replace(/[A-Za-z]/g, function (ch) {
			return map[ch] || ch;
		});
		return translated + rest;
	}

	/*
	 * Applies the reverse letter substitution to a UCI-ish move string's
	 * trailing piece-letter suffix only (promotion, e.g. "e7e8c" -> "e7e8m"
	 * for a Jocly chancellor promotion), not to the leading square
	 * coordinates (which are never letters-as-pieces, only file letters).
	 * Drops ("P@5e"-style) are not handled here - no piece-letter-aliased
	 * variant integrated so far uses drops; ResolveMove()'s fuzzy matching
	 * would in any case need its own dedicated handling for those.
	 */
	function TranslitMove(uciMove, map) {
		if (!map || Object.keys(map).length === 0)
			return uciMove;
		var m = /^([a-z]\d+[a-z]\d+)([A-Za-z])$/.exec(uciMove);
		if (!m)
			return uciMove;
		var suffix = map[m[2]];
		return suffix ? m[1] + suffix : uciMove;
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
	 *
	 * useChess960Format selects "engine960" instead of the default "engine"
	 * format for the candidates' own notation - required when the search
	 * was run with "setoption name UCI_Chess960 value true" (level.chess960),
	 * since the engine then encodes castling as "king takes own rook"
	 * (e.g. "g1h1") rather than the king's plain destination square. Using
	 * the wrong one of the two is not just cosmetically off: plain
	 * Levenshtein distance can match the engine's castling move to an
	 * unrelated nearby move instead of the actual castling move (verified
	 * directly - "e1g1" against a Jocly candidate set including both "h1g1"
	 * (an unrelated rook move) and "e1h1" (the real castling move, in
	 * "engine" format) matches "h1g1" more closely).
	 */
	function ResolveMove(aGame, uciMove, useChess960Format) {
		aGame.mBoard.mMoves = [];
		aGame.mBoard.GenerateMoveObjects(aGame);
		var candidates = aGame.mBoard.mMoves;
		if (!candidates || candidates.length === 0)
			throw new Error("fairy-stockfish: no legal move available to match '" + uciMove + "'");
		var moveFormat = useChess960Format ? "engine960" : "engine";
		// GetBestMatchingMove() compares against Move.ToString() (default
		// "natural" format); since Fairy-Stockfish speaks UCI, match against
		// the "engine"/"engine960" format instead, which native chessbase
		// moves already render close to UCI (e2e4, e7e8Q...).
		var engineStrings = candidates.map(function (m) {
			return (typeof m.ToString == "function") ? m.ToString(moveFormat) : aGame.CreateMove(m).ToString(moveFormat);
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

	/*
	 * Resolves a level that may declare several candidate sub-levels under
	 * "variants" (see config_model_levels_capablanca_expert in
	 * src/games/chessbase/index.js) instead of a single static "variant"
	 * field - used for Jocly game modules whose "prelude" mechanism (see
	 * prelude-model.js) lets the player choose between several distinct
	 * variants sharing one board/geometry at the start of each game (e.g.
	 * Capablanca/Gothic/Embassy/Janus, all implemented by the single
	 * capablanca-chess Jocly game).
	 *
	 * The actually-chosen variant is only known once the prelude choice has
	 * been made, recorded by prelude-model.js as
	 * aGame.cbVar.prelude[0].persistent (a plain setup index once chosen;
	 * `true` before any choice has been made, or `undefined` for prelude
	 * stages/games that don't have a "persistent" dialog at all).
	 *
	 * Returns the resolved sub-level (a plain {variant, pieceMap, ...}
	 * object) on a match, or null if "variants" isn't applicable (no
	 * prelude, no choice made yet, or no entry matches the chosen setup) -
	 * callers must treat null the same as "fairy-stockfish level is missing
	 * a 'variant' field", not silently fall back to anything.
	 */
	function ResolveLevel(aGame, level) {
		if (!level.variants)
			return level;
		var prelude = aGame.cbVar && aGame.cbVar.prelude;
		if (!prelude || !prelude[0] || typeof prelude[0].persistent !== "number") {
			console.error("fairy-stockfish: level declares 'variants' but no prelude choice has been recorded yet (aGame.cbVar.prelude[0].persistent)");
			return null;
		}
		var setup = prelude[0].persistent;
		for (var i = 0; i < level.variants.length; i++) {
			if (level.variants[i].setup === setup) {
				// merge onto the parent level so shared fields (skillLevel,
				// moveTimeMs, depth, chess960...) still apply, with the
				// matched sub-level's own fields (variant, pieceMap)
				// overriding them.
				var resolved = {};
				for (var k in level)
					if (level.hasOwnProperty(k) && k !== "variants")
						resolved[k] = level[k];
				for (var k2 in level.variants[i])
					if (level.variants[i].hasOwnProperty(k2))
						resolved[k2] = level.variants[i][k2];
				return resolved;
			}
		}
		console.error("fairy-stockfish: no 'variants' entry matches the chosen prelude setup (" + setup + ") - this prelude choice has no Fairy-Stockfish equivalent");
		return null;
	}

	JoclyFairy.startMachine = function (aGame, aOptions) {
		var level = ResolveLevel(aGame, aOptions.level || {});
		var variant = level && level.variant;
		if (!variant) {
			if (level !== null) // null means ResolveLevel already logged a specific reason
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
		var pieceMaps = BuildPieceMaps(level.pieceMap);
		var fenForEngine = TranslitFen(fen, pieceMaps.toFairy);
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
						fen: fenForEngine,
						depth: level.depth,
						moveTimeMs: level.moveTimeMs,
						skillLevel: level.skillLevel,
						chess960: level.chess960
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
					var uciMove = TranslitMove(data.bestMoveUci.toLowerCase(), pieceMaps.toJocly);
					var move = ResolveMove(aGame, uciMove, level.chess960);
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
