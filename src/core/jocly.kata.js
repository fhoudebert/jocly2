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
 * JoclyKata plugs a KataGo network into Jocly's "level.ai" dispatch (see
 * JocGame.prototype.StartMachine in jocly.game.js), the same way
 * jocly.fairy.js plugs in Fairy-Stockfish and jocly.scan.js plugs in Scan.
 *
 * A level using this AI looks like:
 *
 *   {
 *     "name": "expert",
 *     "label": "Expert",
 *     "ai": "kata",
 *     "net": "model-b5c192.bin.gz",   // under third-party/katago/
 *     "visits": 400,                  // search budget, either or both
 *     "moveTimeMs": 3000,
 *     "gumbel": 16                    // optional, see below
 *   }
 *
 * WHY THE SINGLE-THREADED BUILD.
 *
 * saigo-online/katago-webgpu compiles two targets. kataeval-mt.js runs
 * KataGo's real Search - tree reuse, ponder, live statistics - and needs
 * -pthread, a 33-thread pool, 512MB of initial memory and a cross-origin
 * isolated page. kataeval.js is the plain one: no threads, and a single
 * blocking kgeSearch() that runs a batched MCTS to a visit or time budget and
 * hands back one move.
 *
 * One move for one position is exactly Jocly's engine contract, and blocking
 * is fine inside a worker. So this integration targets the plain build. The
 * threaded one is a later upgrade that changes only the inside of
 * jocly.kataworker.js: startMachine below would gain live progress from
 * kgePollAll and lose nothing else.
 *
 * WHY THERE IS NO FEN.
 *
 * kataeval takes a position as the sequence of moves that made it -
 * kgeSearch(moveLocs, moveCols, numMoves, toPla, komi, ...) - and replays it
 * itself, which is also how it sees the captures, the ko and the net's
 * recent-move input features. Jocly already keeps that sequence in
 * aGame.mPlayedMoves. So unlike jocly.fairy.js, which carries a whole
 * translation layer (TranslitFen, piece maps), and jocly.scan.js, which has to
 * prepend a turn letter to an exported FEN, this module has no board notation
 * to get wrong.
 *
 * REQUIREMENT ON THE GAME MODULE: aGame.mBoard.goExportMoves(aGame) must
 * return { moves: [{loc, col}], toPlay, komi, boardSize } - see
 * src/games/go/go-model.js. A game without it is not eligible to declare a
 * "kata" level, and this module says so rather than misplaying.
 *
 * ON THE COORDINATES. loc is y*size + x and col is 1 black / 2 white. Jocly's
 * own point index is row*size + col with row 0 at the top, and whether
 * KataGo's y counts from the top or the bottom is not something this module
 * needs to settle: the two differ at worst by a reflection of the board, the
 * same reflection is applied to the position going in and to the move coming
 * back, and a reflection is a symmetry of Go. What it would change is an
 * ownership map or a debug board read out of kgeEvalSeq, neither of which is
 * used here. See go-model.js's goExportMoves for the same note.
 */

var JoclyKata = {};

if (typeof WorkerGlobalScope == 'undefined' && typeof window == 'undefined') {
	module.exports.JoclyKata = JoclyKata;
	(function () {
		var r = require;
		var ju = r("./jocly.util.js");
		global.JocUtil = ju.JocUtil;
	})();
} else
	this.JoclyKata = JoclyKata;

(function () {

	// One worker per game, started lazily and kept alive: the net is several
	// megabytes and loading it is the expensive part, so it is paid once per
	// match rather than once per move - the same keying jocly.fairy.js and
	// jocly.scan.js use.
	var workersByGame = (typeof WeakMap != "undefined") ? new WeakMap() : null;
	var fallbackWorkerSlot = null;

	function GetOrCreateWorker(aGame, aOptions) {
		var existing = workersByGame ? workersByGame.get(aGame)
			: (fallbackWorkerSlot && fallbackWorkerSlot.game === aGame ? fallbackWorkerSlot.worker : null);
		if (existing)
			return existing;

		var level = (aOptions && aOptions.level) || {};
		var baseURL = (aOptions && aOptions.baseURL) || (aGame.config && aGame.config.baseURL) || "";
		if (typeof Worker == "undefined")
			throw new Error("kata: no Worker available in this environment (browser-only feature)");
		var worker = new Worker(baseURL + "jocly.kataworker.js");
		var readyPromise = new Promise(function (resolve, reject) {
			worker.onmessage = function (e) {
				var message = e.data;
				if (message.type == "Ready")
					resolve(message.data);
				else if (message.type == "Error")
					reject(new Error(message.error));
			};
			worker.postMessage({
				type: "Init",
				baseURL: baseURL + "katago/",
				net: level.net,
				// The board size is fixed when the net is loaded, so a worker
				// serves one board. That is why it is keyed per game.
				boardSize: aGame.g.size
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
	 * Turn the engine's answer back into one of the legal Move objects for the
	 * current position. A Go move is a single integer, so this is a lookup
	 * rather than the notation matching jocly.scan.js has to do - and looking
	 * it up in the generated list, rather than building a Move by hand, is what
	 * keeps the capture list on it that the view animates.
	 */
	function ResolveMove(aGame, loc) {
		aGame.mBoard.mMoves = [];
		aGame.mBoard.GenerateMoves(aGame);
		var candidates = aGame.mBoard.mMoves || [];
		for (var i = 0; i < candidates.length; i++)
			if (candidates[i].p === loc)
				return candidates[i];
		return null;
	}

	/*
	 * Le moteur n'est pas la, ou n'a pas demarre : jouer avec l'IA native du
	 * jeu plutot que de rendre la main sans coup.
	 *
	 * Sans cela, startMachine rend un resultat vide, l'hote n'a pas de coup a
	 * jouer et repasse la main au joueur -- qui se retrouve a jouer les deux
	 * couleurs sans qu'on lui dise pourquoi. C'est exactement ce que
	 * jocly.fairy.js evite avec le meme repli.
	 *
	 * Le drapeau porte le nom historique mFairyFallback parce que c'est le
	 * canal que le resultat de recherche transporte deja jusqu'a l'hote (voir
	 * JocGame.Done et MachineMove dans jocly.core.js), et qu'ouvrir un second
	 * canal obligerait chaque hote a le brancher. Le champ "engine" dit de
	 * quel moteur il s'agit ; c'est lui, pas le nom du drapeau, qu'un hote
	 * doit lire pour ecrire son message.
	 */
	function FallbackToNativeAI(aGame, aOptions, err) {
		delete aGame.mKataAbort;
		var levels = (aGame.config && aGame.config.model && aGame.config.model.levels) || [];
		var native = null;
		for (var i = levels.length - 1; i >= 0; i--) {
			if (levels[i] && levels[i].ai !== "kata") {
				native = levels[i];
				break;
			}
		}
		if (!native) {
			console.error("kata: engine unavailable and no non-kata level to fall back to:", err);
			aGame.mBestMoves = [];
			JocUtil.schedule(aGame, "Done", {});
			return;
		}
		console.warn("kata: engine unavailable (" + ((err && err.message) || err)
			+ ") - falling back to native AI level '" + (native.label || native.name)
			+ "' for this move");
		aGame.mFairyFallback = {
			engine: "kata",
			reason: (err && err.message) || String(err),
			// Le niveau CHOISI, a cote de celui qui joue : l'hote a besoin des
			// deux pour dire « X n'a pas demarre, vous jouez contre Y », et la
			// liste deroulante affiche toujours le premier.
			requested: (aOptions.level && (aOptions.level.label || aOptions.level.name)) || null,
			level: native.label || native.name
		};
		var options = {};
		for (var k in aOptions)
			if (aOptions.hasOwnProperty(k))
				options[k] = aOptions[k];
		options.level = native;
		aGame.StartMachine(options);
	}

	JoclyKata.startMachine = function (aGame, aOptions) {
		var level = aOptions.level || {};

		if (typeof aGame.mBoard.goExportMoves != "function") {
			FallbackToNativeAI(aGame, aOptions,
				new Error("this game does not export a move sequence (goExportMoves)"));
			return;
		}

		var position;
		var entry;
		try {
			position = aGame.mBoard.goExportMoves(aGame);
			entry = GetOrCreateWorker(aGame, aOptions);
		} catch (err) {
			// Pas de Worker (node), ou position inexportable.
			FallbackToNativeAI(aGame, aOptions, err);
			return;
		}

		aGame.mKataAbort = function () {
			entry.worker.postMessage({ type: "Stop" });
		};

		entry.ready
			.then(function (info) {
				// Reported here as well as in the worker: a Worker's console
				// output is easy to miss, and "which backend, which network"
				// is the first thing anyone asks when a level plays oddly.
				if (info && !entry.announced) {
					entry.announced = true;
					console.info("[kata]", "ready on", info.backend,
						"- network", level.net, "- board", aGame.g.size);
				}
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
						moves: position.moves,
						toPlay: position.toPlay,
						komi: position.komi,
						// Les regles sous lesquelles le jeu arbitre (voir
						// RULESET dans go-model.js). Le worker wasm l'ignore --
						// son ABI kgeSearch ne prend que le komi -- mais un
						// shim natif peut les imposer au moteur, et sans elles
						// le moteur joue sous celles de sa config : le
						// gtp_example.cfg de KataGo porte tromp-taylor, qui
						// autorise le suicide multi-pierres que ce jeu refuse.
						rules: position.rules,
						visits: level.visits,
						moveTimeMs: level.moveTimeMs,
						gumbel: level.gumbel
					});
				});
			})
			.then(function (data) {
				var move = ResolveMove(aGame, data.bestMove);
				if (!move) {
					/*
					 * The engine named a point this game will not play. That is
					 * a rules disagreement, not a bad move - most likely superko,
					 * where KataGo's default is positional and a game module
					 * could reasonably implement something else - so it is worth
					 * saying loudly rather than passing instead and leaving
					 * someone to wonder why the engine gave up a move.
					 */
					console.error("kata: engine returned a move this game does not allow:", data.bestMove);
					aGame.mBestMoves = [];
				} else
					aGame.mBestMoves = [move];
				delete aGame.mKataAbort;
				aGame.Done();
			})
			.catch(function (err) {
				delete aGame.mKataAbort;
				if (err && err.aborted) {
					aGame.mBestMoves = [];
					aGame.mAborted = true;
					aGame.Done();
					return;
				}
				/*
				 * Reseau absent, config absente, binaire absent, moteur qui
				 * refuse de demarrer : tout cela arrive AVANT le premier coup
				 * et se traite pareil - on joue avec l'IA native et on le dit.
				 */
				FallbackToNativeAI(aGame, aOptions, err);
			});
	};

	/*
	 * As with Scan, and unlike Fairy-Stockfish, this only takes effect before
	 * the search actually starts: kgeSearch is one blocking call inside the
	 * wasm module, and the plain build has no stop for it. The budget is the
	 * bound, so a search is at most moveTimeMs long anyway.
	 */
	JoclyKata.abortMachine = function (aGame) {
		if (aGame.mKataAbort)
			aGame.mKataAbort();
	};

})();
