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
		/*
		 * LA BANDE D'ATTENTE A SA PROPRE COULEUR.
		 *
		 * Le damier se peint depuis `boardLayout`, dont chaque caractère
		 * désigne une couleur de `colorFill`. Les deux colonnes d'attente y
		 * entrent donc avec un symbole à elles -- « = » -- plutôt que par un
		 * dessin ajouté après coup : c'est le même mécanisme que pour les
		 * cases du jeu, et il vaut pour la 2D comme pour la 3D.
		 *
		 * La teinte est volontairement HORS de la gamme du damier. Reprendre
		 * l'une des deux couleurs de cases ferait lire la bande comme un
		 * prolongement de l'échiquier, ce qu'elle n'est pas : aucune pièce ne
		 * s'y déplace, et rien ne peut y être joué.
		 */
		boardDelta.colorFill = $.extend({}, this.cbGridBoardClassic2D.colorFill, {
			"=": "#8C7B68",
		});
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
			/*
			 * Dix colonnes : les huit du damier, puis les deux d'attente.
			 *
			 * Elles étaient absentes de ce dessin, donc peintes du fond du
			 * plateau -- une zone blanche sans limite, où les deux pièces
			 * semblaient flotter. Les y faire figurer avec leur propre symbole
			 * leur donne un cadre, sans les faire passer pour des cases
			 * jouables.
			 */
			boardLayout: [
				".#.#.#.#==",
				"#.#.#.#.==",
				".#.#.#.#==",
				"#.#.#.#.==",
				".#.#.#.#==",
				"#.#.#.#.==",
				".#.#.#.#==",
				"#.#.#.#.==",
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
		/*
		 * UNE VIGNETTE PAR PIÈCE, pas une par coup.
		 *
		 * Le panneau place ses vignettes par leur RANG dans la liste, mais les
		 * dessine dans un gadget nommé d'après le type (`promo#<pr>`). Au
		 * roque, une même pièce apparaît deux fois -- une par case -- donc le
		 * même gadget était positionné deux fois, la seconde l'emportant : des
		 * emplacements vides, et une vignette manquante.
		 *
		 * On ne garde donc qu'un coup par type. La case, elle, se choisit
		 * après, à l'étape suivante.
		 */
		var seen = {}, unique = [];
		patched.forEach(function(move) {
			if(move.pr === undefined || seen[move.pr]) return;
			seen[move.pr] = true;
			unique.push(move);
		});
		return SuperShowPromo.call(this, xdv, aGame, unique.length ? unique : patched, who);
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

	/*
	 * UNE QUATRIÈME ÉTAPE DE SAISIE : où poser la pièce qui entre.
	 *
	 * La machine à états du socle enchaîne trois questions -- la case de
	 * départ (`f`), celle d'arrivée (`t`), puis la promotion (`pr`) -- et
	 * s'arrête là. Au roque, DEUX cases se libèrent, celle du roi et celle de
	 * la tour, et le S-Chess laisse poser sur l'une ou l'autre : il faut une
	 * question de plus.
	 *
	 * Elle ne prend pas la forme d'un second panneau. Les deux cases sont
	 * désignées SUR LE PLATEAU, éclairées comme des destinations ordinaires
	 *
	 * Le modèle n'a rien à fournir de plus : les quatre variantes du roque
	 * existent déjà, chacune avec son `et`. Cette étape choisit entre elles.
	 */
	var SuperInput = View.Board.xdInput;
	View.Board.xdInput = function(xdv, aGame) {
		var spec = SuperInput.apply(this, arguments);
		var superGet = spec.getActions;
		var $this = this;

		// `et` rejoint f, t et pr : la machine remet toutes ces valeurs à null
		// entre deux coups, donc la nôtre se réinitialise avec les autres.
		spec.initial.et = null;

		spec.getActions = function(moves, currentInput) {
			/*
			 * L'ARRIVÉE D'UN ROQUE OUVRE LE PANNEAU, comme celle d'un coup.
			 *
			 * Le socle ouvre le panneau de choix dans l'`execute` de l'étape
			 * d'arrivée : il anime la pièce, puis appelle cbShowPromo s'il
			 * reste plusieurs façons d'achever le coup. Mais pour un roque il
			 * REMPLACE cet `execute` par une simple animation -- aux échecs
			 * un roque n'a jamais de suite. Ici il en a une : le roque seul,
			 * ou avec l'une des deux pièces en attente.
			 *
			 * L'étape suivante (`pr`) proposait donc bien ses vignettes, mais
			 * sans que le panneau ait été posé : pas de fond blanc, pas de
			 * croix pour annuler, et seulement les vignettes qu'un panneau
			 * PRÉCÉDENT avait habillées -- celles des pièces en attente,
			 * jamais celle du roi, qui n'y était encore jamais apparu. Au
			 * premier coup d'une partie, aucune ne se serait vue.
			 *
			 * On rend au roque l'`execute` du coup ordinaire : animer, puis
			 * ouvrir le panneau avec tous les coups de l'action. Le roi y
			 * figure pour « roquer sans faire entrer de pièce » (son `pr` est
			 * celui que le modèle pose sur le coup sans entrée), exactement
			 * comme le cavalier figure pour « déplacer le cavalier seul ».
			 */
			if(currentInput.f != null && currentInput.t == null) {
				var arrivals = superGet.call(this, moves, currentInput);
				for(var key in arrivals) {
					(function(action) {
						var castles = action.moves.filter(function(move) {
							return move.cg !== undefined;
						});
						if(castles.length < 2) return;
						// l'animation est celle du roque seul : la pièce qui
						// entre n'est posée qu'une fois choisie
						var shown = castles.filter(function(move) {
							return move.en === undefined;
						})[0] || castles[0];
						action.execute = function(callback) {
							var board = this;
							board.cbAnimate(xdv, aGame, shown, function() {
								aGame.cbShowPromo(xdv, aGame, castles, board.mWho);
								callback();
							});
						};
					})(arrivals[key]);
				}
				return arrivals;
			}

			/*
			 * Tant que la pièce n'est pas choisie, le socle répond. C'est
			 * important : sa branche `pr` gère aussi les vraies promotions, et
			 * la réécrire ici les casserait.
			 */
			if(currentInput.pr == null || currentInput.et != null)
				return superGet.call(this, moves, currentInput);

			/*
			 * La pièce est choisie. Reste-t-il un choix de case ? Seulement
			 * pour un roque avec entrée : ailleurs la pièce se pose sur la
			 * case quittée, et il n'y a rien à demander.
			 */
			var pending = moves.filter(function(move) {
				return move.cg !== undefined && move.en !== undefined && move.et !== undefined;
			});
			if(pending.length < 2)
				return superGet.call(this, moves, currentInput);

			var actions = {};
			pending.forEach(function(move) {
				var target = move.et;
				if(actions[target] !== undefined) {
					actions[target].moves.push(move);
					return;
				}
				actions[target] = {
					et: target,
					moves: [move],
					click: ["clicker#" + target],
					view: ["clicker#" + target],
					validate: { et: target },
					// Pas d'annulation automatique : le joueur doit pouvoir
					// revenir sur le choix de la pièce sans perdre son coup.
					noAutoCancel: true,
					skipable: false,
					/*
					 * Éclairage 2D ET 3D, comme les destinations ordinaires :
					 * en 3D c'est l'anneau du `clicker` qui marque la case, et
					 * s'en tenir au 2D laissait la case invisible sur un
					 * plateau en relief.
					 */
					highlight: function(mode) {
						xdv.updateGadget("cell#" + target, {
							"2d": {
								classes: mode == "select" ? "cb-cell-select" : "cb-cell-cancel",
								opacity: aGame.mShowMoves || mode == "cancel" ? 1 : 0,
							},
						});
						xdv.updateGadget("clicker#" + target, {
							"3d": {
								materials: {
									ring: {
										color: mode == "select" ? aGame.cbTargetSelectColor : aGame.cbTargetCancelColor,
										opacity: aGame.mShowMoves || mode == "cancel" ? 1 : 0,
										transparent: !(aGame.mShowMoves || mode == "cancel"),
									},
								},
								castShadow: aGame.mShowMoves || mode == "cancel",
							},
						});
					},
					/*
					 * ET SON PENDANT. La machine à états appelle `unhighlight`
					 * quand elle quitte une action : sans lui, elle avertit --
					 * « No unhighlight function defined » -- et la case reste
					 * allumée après coup.
					 */
					unhighlight: function() {
						xdv.updateGadget("cell#" + target, { "2d": { classes: "" } });
					},
					execute: function(callback) {
						$this.cbAnimate(xdv, aGame, move, function() { callback(); });
					},
				};
			});
			return actions;
		};
		return spec;
	}

})();
