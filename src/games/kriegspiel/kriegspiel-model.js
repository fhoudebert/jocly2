/*
 * Le Jeu de la guerre - modele Jocly.
 *
 * Simple habillage de KriegspielRules (les regles) et de KriegspielAI (les
 * heuristiques), concatenes avant ce fichier : voir index.js.
 *
 * Un coup Jocly = un tour complet. Le plateau porte lui-meme l'etat des
 * regles (phase, grid, ars, retreat, turn) : il est passe tel quel au moteur.
 *
 *   { p: { I:[..], C:[..], A:[.], AC:[.], T:[.], E:[.] } }       placement
 *   { r: [de,vers], m: [[de,vers]...], a: cible, d: arsenal }    tour de jeu
 *
 * GenerateMoves() ne renvoie qu'un ECHANTILLON de tours (ceux que l'IA
 * envisage) : IsValidMove() est donc un vrai validateur, qui rejoue le tour
 * pas a pas sur une copie, et non une recherche dans mMoves.
 */
(function () {

	var R = KriegspielRules, AI = KriegspielAI;

	Model.Game.InitGame = function () {
		this.g.ctx = R.makeContext(this.mOptions);
		this.g.rules = R;
		this.g.ai = AI;
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
		return R.moveToString(this);
	};

	/* ---------- plateau ---------- */

	Model.Board.Init = function (aGame) {
	};

	Model.Board.InitialPosition = function (aGame) {
		var st = R.newState();
		this.phase = st.phase;
		this.grid = st.grid;
		this.ars = st.ars;
		this.retreat = st.retreat;
		this.turn = st.turn;
		this.over = 0;        // 0 : en cours, 1 / -1 : vainqueur, 2 : nulle
		this.reason = null;   // "arsenals", "annihilated", "isolated", "max-turns"
		this.last = null;     // issue de la derniere attaque, pour la vue
	};

	// la copie par JSON du plateau de base couterait cher a chaque noeud de l'IA
	Model.Board.CopyFrom = function (aBoard) {
		for (var f in aBoard) {
			if (!Object.prototype.hasOwnProperty.call(aBoard, f) || f === "mSignature")
				continue;
			var value = aBoard[f];
			if (Array.isArray(value))
				// grid et ars sont des tableaux plats ; mMoves n'est jamais
				// modifie en place (le coeur le remplace), une copie de surface suffit
				this[f] = (f === "grid" || f === "ars" || f === "mMoves") ? value.slice() : JSON.parse(JSON.stringify(value));
			else if (value !== null && typeof value === "object")
				this[f] = JSON.parse(JSON.stringify(value));
			else if (typeof value !== "function")
				this[f] = value;
		}
		delete this.mSignature;
	};

	/*
	 * Signature d'une position, pour les repetitions. Elle ne doit PAS lire
	 * mWho : le coeur la calcule tantot avant, tantot apres avoir inverse le
	 * trait (HandleRepeat / Evaluate, AddVisit / RemoveVisit dans jocly.uct.js),
	 * et une signature qui en dependrait ne se retrouverait jamais - ou, pire,
	 * laisserait des visites fantomes dans la table. Le trait est donne par la
	 * parite du compteur de coups, le Nord jouant les coups pairs ; le compteur
	 * lui-meme n'y figure pas, sinon aucune position ne se repeterait.
	 */
	Model.Board.GetSignature = function () {
		var parts = [this.turn & 1 ? "S" : "N", this.phase, this.ars.join(""), this.retreat];
		var grid = this.grid;
		for (var pos = 0; pos < grid.length; pos++)
			if (grid[pos] !== 0)
				parts.push(pos * 16 + grid[pos] + 8);
		return parts.join(",");
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
			this.mMoves = AI.placements(ctx, this.mWho, options.placementCandidates || 10, Rng(aGame));
		else {
			var level = options.levelOptions || {};
			this.mMoves = AI.candidates(ctx, this, this.mWho, {
				max: level.candidates || options.candidates || 32,
				targets: level.targets || 5,
				rng: Rng(aGame)
			});
		}
	};

	/*
	 * Le deploiement de l'IA : tire au sort parmi ses gabarits, sans lancer de
	 * recherche (elle n'aurait rien a comparer) et sans regarder le deploiement
	 * adverse, comme le veut le deploiement a l'aveugle.
	 */
	Model.Board.StaticGenerateMoves = function (aGame) {
		if (this.phase >= 2)
			return null;
		var list = AI.placements(aGame.g.ctx, this.mWho, 1, function (roof) {
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
		var played = R.playTurn(ctx, this, who, move, { inPlace: true, trusted: true });
		this.last = (played.ok && played.turn && played.turn.result) ? played.turn.result : null;
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
		this.mEvaluation = AI.evaluate(aGame.g.ctx, this, this.mWho);
	};

})();
