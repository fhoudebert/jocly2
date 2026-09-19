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
			/*
			 * LE COUP SANS ENTRÉE EST UN CHOIX, et c'est la case qui manquait.
			 *
			 * Le panneau présente « plusieurs façons d'achever ce coup » :
			 * faire entrer le cardinal, faire entrer le marshall, ou n'en
			 * faire entrer aucun. Ce dernier n'a ni `pr` ni `en` — d'où
			 * `pieceTypes[undefined]` et la fenêtre vide dès l'ouverture,
			 * avant même la première case.
			 *
			 * On lui donne l'apparence de la pièce qui BOUGE : c'est ce que le
			 * joueur choisit en la sélectionnant — déplacer le cavalier, et
			 * rien d'autre.
			 */
			if(move.en === undefined) {
				var moved = MOVING_TYPE[move.f];
				if(moved === undefined || !types[moved]) return move;
				var plain = Copy(aGame, move);
				plain.pr = moved;
				return plain;
			}
			/*
			 * LE COUP PORTE LE TYPE DE LA PIÈCE QUI ENTRE (`ei`).
			 *
			 * La vue le reconstruisait du manifeste — quelle pièce commence
			 * sur quelle case d'attente — et cette reconstruction échouait en
			 * silence : le panneau s'ouvrait avec la seule pièce déplacée. Le
			 * modèle le sait de source sûre et le dit désormais ; il n'y a
			 * plus rien à deviner ici.
			 */
			if(move.ei !== undefined && types[move.ei]) {
				var direct = Copy(aGame, move);
				direct.pr = move.ei;
				return direct;
			}
			/*
			 * Repli, pour un coup venu d'ailleurs sans `ei` : la pièce se
			 * déduit de la porte.
			 *
			 * PAS DU PLATEAU.
			 *
			 * La vue ne partage pas le plateau du modèle : elle tourne dans
			 * son propre cadre, où `aGame.mBoard` peut ne rien contenir. Lire
			 * la pièce posée sur la case d'attente ne marchait donc pas, et
			 * l'override rendait le coup inchangé -- sans `pr`, donc avec la
			 * même erreur qu'avant.
			 *
			 * La correspondance est fixe : chaque case d'attente est la
			 * position INITIALE d'un type précis, et le manifeste la déclare.
			 */
			var entered = ENTERS_VIEW[move.en];
			if(entered === undefined || !types[entered]) return move;
			// `pr` n'est lu ici que pour choisir l'apparence ; le coup joué
			// reste celui d'origine, entrée comprise.
			var shown = Copy(aGame, move);
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
	/** Copie d'un coup, en gardant son prototype quand la vue sait en créer. */
	function Copy(aGame, move) {
		return typeof aGame.CreateMove === "function"
			? aGame.CreateMove(move) : Object.assign({}, move);
	}

	/*
	 * Quelle pièce occupe quelle case au départ — pour que la case « aucune
	 * entrée » du panneau montre la pièce qu'on déplace.
	 *
	 * Reconstruit du manifeste, comme les portes : seule la rangée arrière
	 * nous intéresse, et c'est la seule dont les pièces peuvent déclencher une
	 * entrée.
	 */
	var MOVING_TYPE = {};

	var ENTERS_VIEW = {};
	function IndexGates(types) {
		for(var t in types) {
			var m = /^gate-(.+)$/.exec(types[t].name || "");
			if(!m) continue;
			for(var u in types)
				if(types[u].name === m[1]) ENTERS_VIEW[t] = parseInt(u,10);
		}
		for(var t2 in types)
			(types[t2].initial || []).forEach(function(start) {
				if(MOVING_TYPE[start.p] === undefined) MOVING_TYPE[start.p] = parseInt(t2,10);
			});
		ENTERS_VIEW.__ready = true;
	}

})();
