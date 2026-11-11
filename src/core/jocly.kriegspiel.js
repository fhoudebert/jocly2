/*    Copyright 2017 Jocly
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
 * Le Jeu de la guerre (Guy Debord) : niveau adosse a un moteur externe.
 *
 * Meme forme que jocly.scan.js et jocly.kata.js. Un niveau
 *
 *     { "label": "Expert", "ai": "kriegspiel", "moveTimeMs": 3000 }
 *
 * fait chercher le coup par un moteur dedie au lieu de l'IA uct du jeu. Le
 * moteur parle a travers un Worker, jocly.kriegspielworker.js :
 *
 *     -> { type: "Init", baseURL }
 *     <- { type: "Ready" } | { type: "Error", error }
 *     -> { type: "Search", position, moveTimeMs, depth, maxTurns, isolationVictory }
 *     <- { type: "Done", data: { bestMove } } | { type: "Aborted" } | { type: "Error", error }
 *     -> { type: "Stop" }
 *
 * Le worker livre avec jocly ne contient PAS de moteur : il repond "Error" a
 * l'Init. C'est l'hote qui fournit le moteur en substituant ce Worker - ce que
 * fait Tabulon, dont le moteur Rust (crate `kriegspiel`) est lie a
 * l'application. Sans moteur, le coup est joue par le niveau uct le plus fort
 * et le repli est annonce (mFairyFallback), comme pour Scan.
 *
 * Position et coup sont du texte, dans le format du moteur :
 *
 *   position : `<trait N|S> <phase> <coups> <arsenaux> <retraite|-> <grille>`
 *              (Model.Board.ExportBoardState du module kriegspiel)
 *   coup     : `pass`, ou dans l'ordre du tour `r:137-112` (retraite),
 *              `137-112` (deplacement), `x212` (attaque), `d453` (arsenal
 *              detruit) ; une case est ligne*25 + colonne-1.
 *
 * Le coup du moteur n'est jamais joue sur parole : il passe par
 * Model.Board.IsValidMove, le validateur des regles. Un coup refuse est une
 * erreur, donc un repli.
 */

var JoclyKriegspiel = {};

if (typeof WorkerGlobalScope == 'undefined' && typeof window == 'undefined') {
	module.exports.JoclyKriegspiel = JoclyKriegspiel;
	(function () {
		var r = require;
		var ju = r("./jocly.util.js");
		global.JocUtil = ju.JocUtil;
	})();
} else
	this.JoclyKriegspiel = JoclyKriegspiel;

(function () {

	var workersByGame = (typeof WeakMap != "undefined") ? new WeakMap() : null;
	var fallbackWorkerSlot = null;

	function GetOrCreateWorker(aGame, aOptions) {
		var existing = workersByGame ? workersByGame.get(aGame) : (fallbackWorkerSlot && fallbackWorkerSlot.game === aGame ? fallbackWorkerSlot.worker : null);
		if (existing)
			return existing;
		var baseURL = (aOptions && aOptions.baseURL) || (aGame.config && aGame.config.baseURL) || "";
		if (typeof Worker == "undefined")
			throw new Error("kriegspiel: no Worker available in this environment");
		var worker = new Worker(baseURL + "jocly.kriegspielworker.js");
		var readyPromise = new Promise(function (resolve, reject) {
			worker.onmessage = function (e) {
				var message = e.data;
				if (message.type == "Ready")
					resolve();
				else if (message.type == "Error")
					reject(new Error(message.error));
			};
			worker.onerror = function (e) {
				reject(new Error((e && e.message) || "kriegspiel: worker failed to load"));
			};
			worker.postMessage({ type: "Init", baseURL: baseURL });
		});
		// une sonde en echec ne doit pas devenir un rejet non gere : c'est
		// startMachine qui la lit, au premier coup
		readyPromise.catch(function () { });
		var entry = { worker: worker, ready: readyPromise };
		if (workersByGame)
			workersByGame.set(aGame, entry);
		else
			fallbackWorkerSlot = { game: aGame, worker: entry };
		return entry;
	}

	/*
	 * Le coup du moteur, en texte, vers l'objet que lit le modele :
	 * { r: [de,vers], m: [[de,vers]...], a: cible, d: arsenal }.
	 */
	JoclyKriegspiel.parseMove = function (text) {
		var move = { m: [] };
		text = String(text).replace(/^\s+|\s+$/g, "");
		if (text === "pass" || text === "")
			return move;
		function step(word) {
			var m = /^(\d+)-(\d+)$/.exec(word);
			if (!m)
				throw new Error("kriegspiel: unreadable move '" + text + "'");
			return [parseInt(m[1], 10), parseInt(m[2], 10)];
		}
		text.split(/\s+/).forEach(function (word) {
			if (word.indexOf("r:") === 0)
				move.r = step(word.substr(2));
			else if (/^x\d+$/.test(word))
				move.a = parseInt(word.substr(1), 10);
			else if (/^d\d+$/.test(word))
				move.d = parseInt(word.substr(1), 10);
			else
				move.m.push(step(word));
		});
		return move;
	};

	/*
	 * Le moteur n'a pas pu jouer : on joue avec l'IA du jeu et on le DIT (voir
	 * le long commentaire de FallbackToNativeAI dans jocly.scan.js, dont ceci
	 * reprend le canal mFairyFallback).
	 */
	function FallbackToNativeAI(aGame, aOptions, err) {
		delete aGame.mKriegspielAbort;
		var asked = aOptions.level || {};
		var levels = (aGame.config && aGame.config.model && aGame.config.model.levels) || [];
		var native = null;
		for (var i = levels.length - 1; i >= 0; i--) {
			if (levels[i] && levels[i].ai !== "kriegspiel") {
				native = levels[i];
				break;
			}
		}
		if (!native) {
			console.error("kriegspiel: engine unavailable and no other level to fall back to:", err);
			aGame.mBestMoves = [];
			JocUtil.schedule(aGame, "Done", {});
			return;
		}
		console.warn("kriegspiel: engine unavailable (" + ((err && err.message) || err)
			+ ") - falling back to native AI level '" + (native.label || native.name)
			+ "' for this move");
		aGame.mFairyFallback = {
			engine: "kriegspiel",
			reason: (err && err.message) || String(err),
			requested: asked.label || asked.name || null,
			level: native.label || native.name
		};
		var options = {};
		for (var k in aOptions)
			if (aOptions.hasOwnProperty(k))
				options[k] = aOptions[k];
		options.level = native;
		aGame.StartMachine(options);
	}

	JoclyKriegspiel.startMachine = function (aGame, aOptions) {
		var level = aOptions.level || {};
		var board = aGame.mBoard;
		if (typeof board.ExportBoardState != "function" || typeof board.ExportBoardState(aGame) != "string") {
			FallbackToNativeAI(aGame, aOptions, new Error("this game does not export its position (ExportBoardState)"));
			return;
		}
		var position = board.ExportBoardState(aGame);
		var entry;
		try {
			entry = GetOrCreateWorker(aGame, aOptions);
		} catch (err) {
			FallbackToNativeAI(aGame, aOptions, err);
			return;
		}

		aGame.mKriegspielAbort = function () {
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
						position: position,
						moveTimeMs: level.moveTimeMs,
						depth: level.depth,
						maxTurns: aGame.mOptions.maxTurns,
						isolationVictory: aGame.mOptions.isolationVictory
					});
				});
			})
			.then(function (data) {
				if (!data || !data.bestMove)
					// partie finie : la liste vide laisse le coeur le constater
					aGame.mBestMoves = [];
				else {
					var move = JoclyKriegspiel.parseMove(data.bestMove);
					// jamais sur parole : le validateur des regles tranche
					if (!aGame.mBoard.IsValidMove(aGame, move))
						throw new Error("engine move refused by the rules: " + data.bestMove);
					aGame.mBestMoves = [aGame.CreateMove(move)];
				}
				delete aGame.mKriegspielAbort;
				aGame.Done();
			})
			.catch(function (err) {
				delete aGame.mKriegspielAbort;
				if (err && err.aborted) {
					aGame.mBestMoves = [];
					aGame.mAborted = true;
					aGame.Done();
					return;
				}
				FallbackToNativeAI(aGame, aOptions, err);
			});
	};

	JoclyKriegspiel.abortMachine = function (aGame) {
		if (aGame.mKriegspielAbort)
			aGame.mKriegspielAbort();
	};

})();
