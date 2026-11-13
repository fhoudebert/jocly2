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
 * Péan : niveau adosse a un moteur externe. Meme forme que
 * jocly.kriegspiel.js. Un niveau
 *
 *     { "label": "Maréchal", "ai": "pean", "moveTimeMs": 2500 }
 *
 * fait chercher le tour par un moteur dedie au lieu de l'IA uct du jeu, a
 * travers un Worker, jocly.peanworker.js :
 *
 *     -> { type: "Init", baseURL }
 *     <- { type: "Ready" } | { type: "Error", error }
 *     -> { type: "Search", request }
 *     <- { type: "Done", data: { bestMove } } | { type: "Aborted" } | { type: "Error", error }
 *     -> { type: "Stop" }
 *
 * `request` est du texte JSON : { context, state, moveTimeMs }, ou context
 * est le contexte compile du scenario (PeanRules.exportContext) et state
 * l'etat de la partie (Model.Board.ExportEngineRequest du module pean) : le
 * moteur ne lit jamais les fichiers de scenario. `bestMove` est le tour en
 * JSON, { o: [ordres], k: [combats] }, tel que le lit PeanRules.playTurn.
 *
 * Le worker livre avec jocly ne contient PAS de moteur : il repond "Error" a
 * l'Init. C'est l'hote qui le fournit en substituant ce Worker - Tabulon,
 * dont le moteur Rust (crate `pean`) est lie a l'application. Sans moteur, le
 * tour est joue par le niveau uct le plus fort et le repli est annonce
 * (mFairyFallback). Le deploiement libre (bataille libre) est toujours joue
 * par l'IA du jeu, sans annonce : le moteur ne cherche que les tours de jeu.
 *
 * Le tour du moteur n'est jamais joue sur parole : il passe par
 * Model.Board.IsValidMove. Un tour refuse est une erreur, donc un repli.
 */

var JoclyPean = {};

if (typeof WorkerGlobalScope == 'undefined' && typeof window == 'undefined') {
	module.exports.JoclyPean = JoclyPean;
	(function () {
		var r = require;
		var ju = r("./jocly.util.js");
		global.JocUtil = ju.JocUtil;
	})();
} else
	this.JoclyPean = JoclyPean;

(function () {

	var workersByGame = (typeof WeakMap != "undefined") ? new WeakMap() : null;
	var fallbackWorkerSlot = null;

	function GetOrCreateWorker(aGame, aOptions) {
		var existing = workersByGame ? workersByGame.get(aGame) : (fallbackWorkerSlot && fallbackWorkerSlot.game === aGame ? fallbackWorkerSlot.worker : null);
		if (existing)
			return existing;
		var baseURL = (aOptions && aOptions.baseURL) || (aGame.config && aGame.config.baseURL) || "";
		if (typeof Worker == "undefined")
			throw new Error("pean: no Worker available in this environment");
		var worker = new Worker(baseURL + "jocly.peanworker.js");
		var readyPromise = new Promise(function (resolve, reject) {
			worker.onmessage = function (e) {
				var message = e.data;
				if (message.type == "Ready")
					resolve();
				else if (message.type == "Error")
					reject(new Error(message.error));
			};
			worker.onerror = function (e) {
				reject(new Error((e && e.message) || "pean: worker failed to load"));
			};
			worker.postMessage({ type: "Init", baseURL: baseURL });
		});
		// une sonde en echec ne doit pas devenir un rejet non gere
		readyPromise.catch(function () { });
		var entry = { worker: worker, ready: readyPromise };
		if (workersByGame)
			workersByGame.set(aGame, entry);
		else
			fallbackWorkerSlot = { game: aGame, worker: entry };
		return entry;
	}

	// le niveau uct le plus fort
	function NativeLevel(aGame) {
		var levels = (aGame.config && aGame.config.model && aGame.config.model.levels) || [];
		for (var i = levels.length - 1; i >= 0; i--)
			if (levels[i] && levels[i].ai !== "pean")
				return levels[i];
		return null;
	}

	function PlayNative(aGame, aOptions, native) {
		var options = {};
		for (var k in aOptions)
			if (aOptions.hasOwnProperty(k))
				options[k] = aOptions[k];
		options.level = native;
		aGame.StartMachine(options);
	}

	/*
	 * Le moteur n'a pas pu jouer : on joue avec l'IA du jeu et on le DIT (canal
	 * mFairyFallback, comme jocly.scan.js et jocly.kriegspiel.js).
	 */
	function FallbackToNativeAI(aGame, aOptions, err) {
		delete aGame.mPeanAbort;
		var asked = aOptions.level || {};
		var native = NativeLevel(aGame);
		if (!native) {
			console.error("pean: engine unavailable and no other level to fall back to:", err);
			aGame.mBestMoves = [];
			JocUtil.schedule(aGame, "Done", {});
			return;
		}
		console.warn("pean: engine unavailable (" + ((err && err.message) || err)
			+ ") - falling back to native AI level '" + (native.label || native.name)
			+ "' for this move");
		aGame.mFairyFallback = {
			engine: "pean",
			reason: (err && err.message) || String(err),
			requested: asked.label || asked.name || null,
			level: native.label || native.name
		};
		PlayNative(aGame, aOptions, native);
	}

	JoclyPean.startMachine = function (aGame, aOptions) {
		var level = aOptions.level || {};
		var board = aGame.mBoard;
		if (typeof board.ExportEngineRequest != "function") {
			FallbackToNativeAI(aGame, aOptions, new Error("this game has no engine request (ExportEngineRequest)"));
			return;
		}
		var request = board.ExportEngineRequest(aGame);
		if (!request) {
			// deploiement libre : l'IA du jeu, sans annonce (pas de repli)
			var native = NativeLevel(aGame);
			if (native) {
				PlayNative(aGame, aOptions, native);
				return;
			}
			FallbackToNativeAI(aGame, aOptions, new Error("no engine request for this position"));
			return;
		}
		if (level.moveTimeMs)
			request.moveTimeMs = level.moveTimeMs;
		var entry;
		try {
			entry = GetOrCreateWorker(aGame, aOptions);
		} catch (err) {
			FallbackToNativeAI(aGame, aOptions, err);
			return;
		}

		aGame.mPeanAbort = function () {
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
					entry.worker.postMessage({ type: "Search", request: JSON.stringify(request) });
				});
			})
			.then(function (data) {
				if (!data || !data.bestMove)
					throw new Error("engine returned no move");
				var move = typeof data.bestMove == "string" ? JSON.parse(data.bestMove) : data.bestMove;
				// jamais sur parole : le validateur des regles tranche
				if (!aGame.mBoard.IsValidMove(aGame, move))
					throw new Error("engine move refused by the rules: " + JSON.stringify(move));
				aGame.mBestMoves = [aGame.CreateMove(move)];
				delete aGame.mPeanAbort;
				aGame.Done();
			})
			.catch(function (err) {
				delete aGame.mPeanAbort;
				if (err && err.aborted) {
					aGame.mBestMoves = [];
					aGame.mAborted = true;
					aGame.Done();
					return;
				}
				FallbackToNativeAI(aGame, aOptions, err);
			});
	};

	JoclyPean.abortMachine = function (aGame) {
		if (aGame.mPeanAbort)
			aGame.mPeanAbort();
	};

})();
