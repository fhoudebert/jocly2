/*
 * The leading semicolon is load-bearing, and belongs to this file rather than
 * to the one before it.
 *
 * The gulpfile concatenates a game's scripts into a single bundle. Eleven
 * files in this module end with a top-level assignment closed by a bare "}" -
 * "View.Game.xdInitExtra = function() { ... }" and the like - and automatic
 * semicolon insertion does not apply when the next token is "(". A file
 * wrapped in the "(function(){...})()" used everywhere here is then read as
 * the ARGUMENT of a call to the function just assigned, which runs at load
 * time with `this` undefined. That is how the first version of this game died
 * on "this.mOptions.width", and then on "this.mViewOptions.fullPath", with
 * stacks pointing into a concatenated file whose line numbers match no source.
 *
 * Appending a file is what triggers it, so the guard goes on the file being
 * appended: it then holds whatever it is placed after.
 * tests/core/model-bundles.test.js builds both bundles the way gulp does and
 * evaluates them, which is the only place a seam between two files is visible.
 */
;

/*
 * The prelude's buttons, for the checkers module.
 *
 * chessbase/prelude-view.js draws each button as a little board of piece
 * icons, resolved through cbVar.pieceTypes and cbPromoSpec, with the caption
 * underneath as an extra. Neither of those exists here, and neither is wanted:
 * a rule cannot be drawn, so the caption IS the button - the same conclusion
 * Kotaishi Shogi reaches when it labels its two, and the reason its own faces
 * carry only the pieces the two games share.
 *
 * What is kept from that file is the gadget layout, because the panel has to
 * behave the way a player already expects: a white panel at z 108, one
 * clickable canvas per choice at z 109, and the panel named as a `furniture`
 * of the input so it is taken down when the choice is made.
 */

(function() {

	var SuperViewGameXdInit = View.Game.xdInit;
	View.Game.xdInit = function(xdv) {
		SuperViewGameXdInit.apply(this, arguments);
		var dialogs = this.mOptions.prelude;
		if(!dialogs) return;
		for(var i = 0; i < dialogs.length; i++)
			if(dialogs[i])
				CreateDialog(this, xdv, i, dialogs[i]);
	}

	function CreateDialog(aGame, xdv, n, dialog) {
		var labels = dialog.labels;
		if(!labels || !labels.length) return;

		/*
		 * Un drapeau par choix, A LA PLACE du libelle.
		 *
		 * POURQUOI : jocly n'a pas de dictionnaire, donc tout mot ecrit dans
		 * un manifeste ou dans une vue est un mot que personne ne traduira
		 * jamais. Une image, elle, se lit dans toutes les langues. Le texte
		 * quitte donc le JS pour la page de regles, qui existe deja par
		 * langue et ou le meme drapeau figure a cote du jeu de regles qu'il
		 * designe.
		 *
		 * Ici les drapeaux sont EXACTS, contrairement au go : ce sont
		 * vraiment des regles nationales -- anglaises, bresiliennes,
		 * espagnoles, allemandes -- et le drapeau ne dit rien de plus que le
		 * nom qu'il remplace.
		 *
		 * Le libelle reste dans le manifeste et sert de SECOURS : un drapeau
		 * absent ou introuvable laisserait sinon un bouton vide, sur lequel
		 * il faut cliquer pour savoir ce qu'il fait.
		 */
		var flags = dialog.flags || [];
		var fullPath = aGame.mViewOptions.fullPath;

		// One board cell is 12000/squareWidth across, and the buttons are
		// sized in those units so the panel scales with the board rather than
		// with the window - a button fixed in pixels is unreadable on a phone
		// and lost on a desktop.
		var size = Math.floor(12000 / (2 * aGame.mOptions.width));
		var cols = dialog.panelWidth || Math.min(labels.length, 2);
		var rows = Math.ceil(labels.length / cols);
		var bw = 3.4 * size, bh = 1.1 * size;      // one button
		var gap = 0.35 * size;

		xdv.createGadget("setup" + n + "-board", {
			base: {
				type: "element",
				x: 0,
				y: 0,
				width: cols * (bw + gap) + gap,
				height: rows * (bh + gap) + gap,
				z: 108,
				css: { "background-color": "White" },
			},
		});

		labels.forEach(function(label, setup) {
			var col = setup % cols, row = Math.floor(setup / cols);
			xdv.createGadget("setup" + n + "#" + setup, {
				base: {
					type: "canvas",
					x: (col - (cols - 1) / 2) * (bw + gap),
					y: (row - (rows - 1) / 2) * (bh + gap),
					width: bw,
					height: bh,
					z: 109,
					draw: function(ctx) {
						var flag = flags[setup];
						ctx.fillStyle = "#c0c0c0";
						ctx.beginPath();
						ctx.rect(-bw / 2, -bh / 2, bw, bh);
						ctx.fill();

						if(!flag) {
							// Secours : pas de drapeau declare, on ecrit le
							// libelle plutot que de laisser un bouton muet.
							ctx.fillStyle = "#202020";
							// measured, not guessed: the four names are not
							// the same length, and a size that fits "German"
							// clips "Brazilian"
							var fontSize = Math.round(bh * 0.42);
							do {
								ctx.font = "bold " + fontSize + "px sans-serif";
								if(ctx.measureText(label).width <= bw * 0.88) break;
								fontSize--;
							} while(fontSize > 6);
							ctx.textAlign = "center";
							ctx.textBaseline = "middle";
							ctx.fillText(label, 0, 0);
							return;
						}
						/*
						 * L'image arrive apres coup, et le gadget a deja
						 * dessine quand elle arrive : le rappel peint dans le
						 * MEME contexte. Le bouton est donc brievement gris
						 * plutot que brievement faux.
						 */
						this.getResource("image|" + fullPath + "/" + flag, function(img) {
							/*
							 * Au plus grand, SANS DEFORMER : un drapeau etire
							 * est un autre drapeau, et ceux-ci n'ont pas tous
							 * le meme rapport (100x60 pour l'Angleterre et
							 * l'Allemagne, 100x70 pour le Bresil, 100x67 pour
							 * l'Espagne).
							 */
							var maxW = bw * 0.82, maxH = bh * 0.74;
							var w = maxW, h = w * (img.height / img.width);
							if(h > maxH) { h = maxH; w = h * (img.width / img.height); }
							ctx.drawImage(img, -w / 2, -h / 2, w, h);
							// Un lisere : plusieurs de ces drapeaux ont du
							// blanc au bord et se fondraient dans le bouton.
							ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
							ctx.lineWidth = Math.max(1, bh * 0.02);
							ctx.strokeRect(-w / 2, -h / 2, w, h);
						});
					},
				},
			});
		});
	}

	var SuperViewBoardxdInput = View.Board.xdInput;
	View.Board.xdInput = function(xdv, aGame) {
		var stage = this.preludeStage;
		if(stage === undefined || stage < 0)
			return SuperViewBoardxdInput.apply(this, arguments);
		var dialog = (aGame.mOptions.prelude || [])[stage];
		// a stage with nothing to ask (a turn pass), or one whose choice is
		// already settled, takes no input
		if(!dialog || (dialog.persistent !== undefined && dialog.persistent !== true))
			return {
				initial: {},
				getActions: function(moves, currentInput) { return null; },
			};
		return {
			initial: {
				setupDone: false,
			},
			getActions: function(moves, currentInput) {
				var actions = {};
				if(!currentInput.setupDone)
					moves.forEach(function(move) {
						actions[move.setup] = {
							view: ["setup" + stage + "#" + move.setup],
							click: ["setup" + stage + "#" + move.setup],
							moves: [move],
							validate: { setupDone: true },
						};
					});
				return actions;
			},
			furnitures: ["setup" + stage + "-board"],
		};
	}

	/*
	 * Nothing moved on the board, so there is nothing to animate.
	 *
	 * The test is on the move having no positions, not on it carrying a
	 * setup: a stage that asks nothing - the turn pass that lets the opening
	 * move come back round to the first player - is {pos:[],capt:[]} with no
	 * setup at all. Guarding on setup let that one through to
	 * checkers-xd-view's xdPlayedMove, which opens on
	 * board.board[aMove.pos[0]] and ends on aGame.g.Coord[aMove.pos[...]][0],
	 * and the game died on the first click with the board already drawn.
	 *
	 * A real draughts move always names at least a departure and an arrival,
	 * so "no positions" means "not a board move" with nothing to interpret.
	 */
	var SuperViewBoardxdPlayedMove = View.Board.xdPlayedMove;
	View.Board.xdPlayedMove = function(xdv, aGame, aMove) {
		if(aMove && (!aMove.pos || aMove.pos.length === 0)) {
			aGame.MoveShown();
			return false;
		}
		return SuperViewBoardxdPlayedMove.apply(this, arguments);
	}

})();
