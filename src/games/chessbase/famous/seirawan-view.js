/*
 * Vue de Seirawan++ : un échiquier de 8x8, et deux pièces qui attendent de
 * côté.
 *
 * POURQUOI UNE VUE À ELLE. Le jeu empruntait celle du crazyhouse, la seule qui
 * sût dessiner des cases hors de l'échiquier. Mais cette vue est faite pour un
 * jeu à PARACHUTAGE : elle dessine des mains, les empile, et son panneau de
 * promotion parcourt les types parachutables — que ce jeu n'a pas. D'où les
 * pièces miniatures en haut et en bas à droite, le décalage du plateau, et le
 * « undefined is not an object (pieceType.aspect) » dès qu'une animation se
 * terminait.
 *
 * Les cases d'attente n'ont besoin de rien de tout cela : ce sont deux cases
 * de plus, sur lesquelles rien ne se dépose jamais. grid-board-view sait déjà
 * réserver les colonnes hors jeu — il lit `geometry.handWidth` — et c'est tout
 * ce qu'il faut.
 *
 * fairy-set-view fournit les apparences `fr-cardinal` et `fr-marshall`, que
 * l'ensemble Staunton ne connaît pas. C'est la même raison qui fait que
 * Capablanca l'emploie.
 */

(function() {

	View.Game.cbDefineView = function() {

		var boardDelta = {
			notationMode: 'in',
		};
		var board3d = $.extend(true,{},this.cbGridBoardClassic3DMargin,boardDelta);
		var board2d = $.extend(true,{},this.cbGridBoardClassic2DNoMargin,boardDelta);

		return {
			coords: {
				"2d": this.cbGridBoard.coordsFn.call(this,board2d),
				"3d": this.cbGridBoard.coordsFn.call(this,board3d),
			},
			/*
			 * Huit rangées de huit : les colonnes d'attente ne font PAS partie
			 * du damier. Les y ajouter les ferait peindre en cases de jeu, et
			 * un joueur y verrait un prolongement de l'échiquier.
			 */
			boardLayout: [
				".#.#.#.#",
				"#.#.#.#.",
				".#.#.#.#",
				"#.#.#.#.",
				".#.#.#.#",
				"#.#.#.#.",
				".#.#.#.#",
				"#.#.#.#.",
			],
			board: {
				"2d": { draw: this.cbDrawBoardFn(board2d) },
				"3d": { display: this.cbDisplayBoardFn(board3d) },
			},
			clicker: {
				"2d": { width: 1100, height: 1100 },
				"3d": { scale: [.75,.75,.75] },
			},
			pieces: this.cbFairyPieceStyle({
				"default": {
					"3d": { scale: [.5,.5,.5] },
				},
			}),
		};
	}

	/*
	 * LE PANNEAU DE CHOIX, ÉTENDU À L'ENTRÉE.
	 *
	 * La vue l'ouvre dès que PLUSIEURS coups partagent la même case de départ
	 * et la même case d'arrivée -- c'est ainsi qu'on choisit sa pièce de
	 * promotion. Or les variantes d'entrée sont exactement cela : « Nb1-c3 »,
	 * « Nb1-c3/C » et « Nb1-c3/M » ont les mêmes `f` et `t`.
	 *
	 * Le panneau s'ouvrait donc pour elles, et sur le coup SANS entrée --
	 * celui qu'on doit pouvoir choisir aussi -- il n'y a pas de `pr` : d'où
	 * « pieceTypes[undefined] » et la fenêtre vide.
	 *
	 * Le mécanisme est pourtant le bon : « plusieurs façons d'achever ce
	 * coup » décrit l'entrée autant que la promotion. Il suffit de lui dire
	 * quelle apparence montrer pour chacune, au lieu de supposer que c'est
	 * toujours celle d'une promotion.
	 */
	var SuperShowPromo = View.Game.cbShowPromo;
	View.Game.cbShowPromo = function(xdv, aGame, promoMoves, who) {
		var types = aGame.cbVar.pieceTypes;
		if(!ENTERS_VIEW.__ready) IndexGates(types);
		var patched = promoMoves.map(function(move) {
			if(move.pr !== undefined) return move;
			if(move.en === undefined) return move;
			// La pièce qui entre, reconnue à sa porte : c'est elle que la case
			// du panneau doit montrer.
			var index = aGame.mBoard ? aGame.mBoard.board[move.en] : -1;
			var piece = index >= 0 ? aGame.mBoard.pieces[index] : null;
			if(!piece) return move;
			var entered = ENTERS_VIEW[piece.t];
			if(entered === undefined || !types[entered]) return move;
			// `pr` n'est lu ici que pour choisir l'apparence ; le coup joué
			// reste celui d'origine, entrée comprise.
			var shown = aGame.CreateMove(move);
			shown.pr = entered;
			return shown;
		});
		return SuperShowPromo.call(this, xdv, aGame, patched, who);
	}

	/*
	 * Quelle pièce en attente devient quoi. Le modèle le sait déjà, mais il ne
	 * l'expose pas : plutôt qu'un canal entre modèle et vue pour deux paires,
	 * on le relit ici des types eux-mêmes -- une pièce en attente porte le nom
	 * de celle qu'elle deviendra, préfixé de « gate- ».
	 */
	var ENTERS_VIEW = {};
	function IndexGates(types) {
		for(var t in types) {
			var m = /^gate-(.+)$/.exec(types[t].name || "");
			if(!m) continue;
			for(var u in types)
				if(types[u].name === m[1]) ENTERS_VIEW[t] = parseInt(u,10);
		}
		ENTERS_VIEW.__ready = true;
	}

})();
