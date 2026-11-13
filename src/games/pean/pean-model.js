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
		lastCtx = this.g.ctx;
	};

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
		return JSON.stringify(R.playableMove(this)) === JSON.stringify(R.playableMove(move));
	};

	Model.Move.ToString = function () {
		return lastCtx ? R.moveToString(lastCtx, this) : JSON.stringify(R.playableMove(this));
	};

	/* ---------- plateau ---------- */

	Model.Board.Init = function (aGame) {
	};

	Model.Board.InitialPosition = function (aGame) {
		var st = R.newState(aGame.g.ctx);
		for (var i = 0; i < STATE_FIELDS.length; i++)
			this[STATE_FIELDS[i]] = st[STATE_FIELDS[i]];
		this.over = 0;        // 0 : en cours, 1 / -1 : vainqueur, 2 : nulle
		this.reason = null;   // "annihilated", "broken", "objective", "points"
		this.last = null;     // issue des combats du dernier tour, pour la vue
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
		var parts = [this.phase, this.played & 1, this.ctrl.join("")];
		for (var i = 0; i < this.u.length; i++) {
			var u = this.u[i];
			parts.push(u.h + "." + u.p + (u.f >= 0 ? "." + u.f : ""));
		}
		return parts.join(",");
	};

	// l'etat en JSON, pour un moteur externe (Tabulon, a venir)
	Model.Board.ExportBoardState = function (aGame) {
		var st = {};
		for (var i = 0; i < STATE_FIELDS.length; i++)
			st[STATE_FIELDS[i]] = this[STATE_FIELDS[i]];
		return JSON.stringify({ scenario: aGame.g.ctx.id, state: st });
	};

	function Rng(aGame) {
		return function (roof) { return aGame.Random(roof); };
	}

	Model.Board.GenerateMoves = function (aGame) {
		this.mMoves = [];
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
		if (this.phase >= 2)
			return null;
		var list = AI.placements(aGame.g.ctx, this, this.mWho, 1, function (roof) {
			return Math.floor(Math.random() * roof);
		});
		return list.map(function (move) { return aGame.CreateMove(move); });
	};

	Model.Board.IsValidMove = function (aGame, move) {
		if (this.over)
			return false;
		return R.playTurn(aGame.g.ctx, this, this.mWho, R.playableMove(move)).ok;
	};

	Model.Board.ApplyMove = function (aGame, move) {
		var ctx = aGame.g.ctx, who = this.mWho;
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
		if (aFinishOnly || this.phase < 2)
			return;
		this.mEvaluation = AI.evaluate(aGame.g.ctx, this);
	};

})();
