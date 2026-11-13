/*
 * Péan - modele Jocly.
 *
 * Simple habillage de PeanRules (les regles) et de PeanAI (les heuristiques),
 * concatenes avant ce fichier : voir index.js. Le scenario est dans
 * gameOptions.scenario (un fichier de scenarios/, inclus par index.js).
 *
 * Un coup Jocly = un tour complet :
 *
 *   { p: [[type, hex], ...] }                         deploiement libre
 *   { o: [{ u: [ids], c: [hexes], f: dir }, ...],     ordres
 *     k: [{ a: [ids], t: id, h: hex, v: id }, ...] }  combats
 *
 * GenerateMoves() ne renvoie qu'un ECHANTILLON de tours (ceux que l'IA
 * envisage) : IsValidMove() est un vrai validateur, qui rejoue le tour sur
 * une copie avec le meme objet Turn que l'IA et la saisie.
 */
(function () {

	var R = PeanRules, AI = PeanAI;

	// le contexte du scenario de ce jeu : un fichier de modele par jeu, donc
	// par scenario ; Move.ToString n'a pas acces a la partie
	var lastCtx = null;

	var STATE_FIELDS = ["phase", "turn", "played", "u", "ctrl", "hold", "hs"];

	Model.Game.InitGame = function () {
		this.g.ctx = R.makeContext(this.mOptions);
		this.g.rules = R;
		this.g.ai = AI;
		this.g.contexts = [];
		lastCtx = this.g.ctx;
	};

	/*
	 * Le jeu « Péan » sert plusieurs scenarios (gameOptions.scenarios), choisis
	 * par un prelude (gameOptions.prelude) : le premier coup de la partie,
	 * « #k », designe le scenario k ; le second, « -- », rend la main (le
	 * moteur inverse le trait apres chaque coup : voir go/prelude-model.js et
	 * checkers/index.js, meme convention). Le plateau porte le numero de son
	 * scenario (`scen`) et l'etape du prelude (`preludeStage`, -1 : finie) ;
	 * le contexte du jeu (g.ctx) suit le plateau qu'on lui presente.
	 *
	 * Sans gameOptions.scenarios, rien de tout cela : un jeu, un scenario.
	 */
	function scenarios(aGame) { return aGame.mOptions.scenarios || null; }
	function dialogs(aGame) { return scenarios(aGame) && aGame.mOptions.prelude || null; }
	function inPrelude(board) { return board.preludeStage !== undefined && board.preludeStage >= 0; }

	function contextFor(aGame, k) {
		var list = scenarios(aGame);
		if (!list || !list[k])
			return aGame.g.ctx;
		if (!aGame.g.contexts[k])
			aGame.g.contexts[k] = R.makeContext({ scenario: list[k] });
		return aGame.g.contexts[k];
	}

	// le contexte du scenario de ce plateau, qui devient celui du jeu
	function ctxOf(aGame, board) {
		if (board && board.scen !== undefined && board.scen >= 0 && scenarios(aGame)) {
			var ctx = contextFor(aGame, board.scen);
			if (aGame.g.ctx !== ctx)
				aGame.g.ctx = ctx;
		}
		lastCtx = aGame.g.ctx;
		return aGame.g.ctx;
	}
	Model.Game.peanContextOf = function (board) { return ctxOf(this, board); };

	// le scenario par defaut : celui de gameOptions.scenario, s'il est dans la liste
	function defaultScenario(aGame) {
		var list = scenarios(aGame), sc = aGame.mOptions.scenario;
		for (var k = 0; list && k < list.length; k++)
			if (list[k] === sc || (sc && list[k].id === sc.id))
				return k;
		return list ? 0 : -1;
	}

	function resetState(board, ctx) {
		var st = R.newState(ctx);
		for (var i = 0; i < STATE_FIELDS.length; i++)
			board[STATE_FIELDS[i]] = st[STATE_FIELDS[i]];
		board.over = 0;
		board.reason = null;
		board.last = null;
	}

	function preludeMoves(aGame, board) {
		var dialog = dialogs(aGame)[board.preludeStage];
		if (!dialog)
			return [{ skip: 1 }];
		return scenarios(aGame).map(function (sc, k) { return { setup: k }; });
	}

	Model.Game.DestroyGame = function () {
	};

	/* ---------- coup ---------- */

	Model.Move.Init = function (args) {
		if (args !== undefined && args !== null)
			this.CopyFrom(args);
	};

	Model.Move.CopyFrom = function (move) {
		var fields = JSON.parse(JSON.stringify(move));
		for (var f in fields)
			this[f] = fields[f];
	};

	Model.Move.Equals = function (move) {
		if (this.setup !== undefined || move.setup !== undefined || this.skip || move.skip)
			return this.setup === move.setup && !this.skip === !move.skip;
		return JSON.stringify(R.playableMove(this)) === JSON.stringify(R.playableMove(move));
	};

	// « #k » et « -- » : la notation des preludes de checkers, chessbase et go,
	// que Tabulon saute deja quand il relit une partie
	Model.Move.ToString = function () {
		if (this.setup !== undefined)
			return "#" + this.setup;
		if (this.skip)
			return "--";
		return lastCtx ? R.moveToString(lastCtx, this) : JSON.stringify(R.playableMove(this));
	};

	/* ---------- plateau ---------- */

	Model.Board.Init = function (aGame) {
	};

	Model.Board.InitialPosition = function (aGame) {
		if (scenarios(aGame)) {
			this.scen = defaultScenario(aGame);
			this.preludeStage = dialogs(aGame) ? 0 : -1;
		}
		resetState(this, ctxOf(aGame, this));
		// over : 0 en cours, 1 / -1 vainqueur, 2 nulle ; reason : "annihilated",
		// "broken", "objective", "points" ; last : issue des combats du dernier
		// tour, pour la vue
	};

	// copie rapide : l'IA copie un plateau a chaque noeud
	Model.Board.CopyFrom = function (aBoard) {
		for (var f in aBoard) {
			if (!Object.prototype.hasOwnProperty.call(aBoard, f) || f === "mSignature")
				continue;
			var value = aBoard[f];
			if (f === "u")
				this.u = value.map(function (u) { return { i: u.i, s: u.s, t: u.t, h: u.h, p: u.p, f: u.f, a: u.a, e: u.e }; });
			else if (f === "mMoves")
				this.mMoves = value.slice();   // jamais modifie en place
			else if (Array.isArray(value))
				this[f] = JSON.parse(JSON.stringify(value));
			else if (value !== null && typeof value === "object")
				this[f] = JSON.parse(JSON.stringify(value));
			else if (typeof value !== "function")
				this[f] = value;
		}
		delete this.mSignature;
	};

	/*
	 * Signature d'une position (repetitions). Elle ne lit pas mWho (voir le
	 * modele kriegspiel) : le trait vient de la parite des tours joues ; le
	 * compteur lui-meme n'y figure pas.
	 */
	Model.Board.GetSignature = function () {
		if (inPrelude(this))
			return "prelude" + this.preludeStage + "." + this.scen;
		var parts = [this.phase, this.played & 1, this.ctrl.join("")];
		if (this.scen !== undefined)
			parts.unshift("s" + this.scen);
		for (var i = 0; i < this.u.length; i++) {
			var u = this.u[i];
			parts.push(u.h + "." + u.p + (u.f >= 0 ? "." + u.f : ""));
		}
		return parts.join(",");
	};

	/*
	 * La requete du moteur externe (niveau « Maréchal », src/core/jocly.pean.js) :
	 * le contexte compile du scenario et l'etat. null pendant le deploiement
	 * libre, que l'IA du jeu joue elle-meme.
	 */
	Model.Board.ExportEngineRequest = function (aGame) {
		if (this.over || this.phase < 2 || inPrelude(this))
			return null;
		var ctx = ctxOf(aGame, this);
		var st = {};
		for (var i = 0; i < STATE_FIELDS.length; i++)
			st[STATE_FIELDS[i]] = this[STATE_FIELDS[i]];
		if (!ctx.engineContext)
			ctx.engineContext = R.exportContext(ctx);
		return { context: ctx.engineContext, state: st };
	};

	// l'etat en JSON (scenario et etat)
	Model.Board.ExportBoardState = function (aGame) {
		var st = {};
		for (var i = 0; i < STATE_FIELDS.length; i++)
			st[STATE_FIELDS[i]] = this[STATE_FIELDS[i]];
		return JSON.stringify({ scenario: ctxOf(aGame, this).id, state: st });
	};

	function Rng(aGame) {
		return function (roof) { return aGame.Random(roof); };
	}

	Model.Board.GenerateMoves = function (aGame) {
		this.mMoves = [];
		if (inPrelude(this)) {
			this.mMoves = preludeMoves(aGame, this);
			return;
		}
		ctxOf(aGame, this);
		if (this.over) {
			this.mFinished = true;
			this.mWinner = this.over === 2 ? JocGame.DRAW : this.over;
			return;
		}
		var ctx = aGame.g.ctx, options = aGame.mOptions;
		if (this.phase < 2)
			this.mMoves = AI.placements(ctx, this, this.mWho, options.placementCandidates || 6, Rng(aGame));
		else {
			var level = options.levelOptions || {};
			this.mMoves = AI.candidates(ctx, this, this.mWho, {
				max: level.candidates || options.candidates || 20,
				rng: Rng(aGame)
			});
		}
	};

	/*
	 * Le deploiement de l'IA : un gabarit tire au sort, sans recherche (elle
	 * n'aurait rien a comparer).
	 */
	Model.Board.StaticGenerateMoves = function (aGame) {
		if (inPrelude(this)) {
			// la machine repond au prelude sans chercher : un scenario au hasard
			var moves = preludeMoves(aGame, this);
			return [aGame.CreateMove(moves[Math.floor(Math.random() * moves.length)])];
		}
		if (this.phase >= 2)
			return null;
		var list = AI.placements(ctxOf(aGame, this), this, this.mWho, 1, function (roof) {
			return Math.floor(Math.random() * roof);
		});
		return list.map(function (move) { return aGame.CreateMove(move); });
	};

	Model.Board.IsValidMove = function (aGame, move) {
		if (inPrelude(this))
			return preludeMoves(aGame, this).some(function (m) {
				return m.setup === move.setup && !m.skip === !move.skip;
			});
		if (this.over || !move || move.setup !== undefined || move.skip)
			return false;
		return R.playTurn(ctxOf(aGame, this), this, this.mWho, R.playableMove(move)).ok;
	};

	Model.Board.ApplyMove = function (aGame, move) {
		if (inPrelude(this)) {
			if (move.setup !== undefined && dialogs(aGame)[this.preludeStage]) {
				this.scen = move.setup;
				resetState(this, ctxOf(aGame, this));
			}
			if (++this.preludeStage >= dialogs(aGame).length)
				this.preludeStage = -1;   // fini : la partie commence
			return;
		}
		var ctx = ctxOf(aGame, this), who = this.mWho;
		var played = R.playTurn(ctx, this, who, move, { trusted: true });
		if (!played.ok)
			return;
		for (var i = 0; i < STATE_FIELDS.length; i++)
			this[STATE_FIELDS[i]] = played.state[STATE_FIELDS[i]];
		this.last = played.turn ? { results: played.turn.results, arrived: played.turn.arrived } : null;
		var end = R.outcome(ctx, this, who);
		this.over = end.winner;
		this.reason = end.reason;
	};

	Model.Board.Evaluate = function (aGame, aFinishOnly, aTopLevel) {
		this.mEvaluation = 0;
		if (this.over) {
			this.mFinished = true;
			this.mWinner = this.over === 2 ? JocGame.DRAW : this.over;
			return;
		}
		if (aGame.mOptions.preventRepeat && aGame.GetRepeatOccurence(this) > 2) {
			this.mFinished = true;
			this.mWinner = JocGame.DRAW;
			return;
		}
		if (aFinishOnly || this.phase < 2 || inPrelude(this))
			return;
		this.mEvaluation = AI.evaluate(ctxOf(aGame, this), this);
	};

})();
