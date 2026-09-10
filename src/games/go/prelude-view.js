/*
 * The leading semicolon is load-bearing - see prelude-model.js and
 * tests/core/model-bundles.test.js.
 */
;

/*
 * The prelude's buttons, for the Go module.
 *
 * A rule cannot be drawn, so the caption IS the button - the same conclusion
 * checkers/prelude-view.js reaches for its four national rule sets, and
 * Kotaishi Shogi for its two. What is kept from that file is the gadget
 * layout, so the panel behaves the way a player already expects: a white panel
 * at z 108, one clickable canvas per choice at z 109, and the panel named as a
 * `furniture` of the input so it is taken down when the choice is made.
 *
 * THE EASY HALF, and worth saying because the mills prelude's is not. That one
 * opens with a long account of buttons that drew correctly and answered no
 * click, because mills replaces jocly.xd-view.js's input state machine
 * wholesale and never calls xdInput. go-xd-view.js does use xdInput - its own
 * is what turns an empty point into a move - so overriding it here is read,
 * and the generic machine does the rest.
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
		 * Un drapeau par choix, quand le manifeste en declare.
		 *
		 * IL ACCOMPAGNE LE LIBELLE, il ne le remplace pas, et ce n'est pas
		 * une precaution de facade : le drapeau se reconnait d'un coup d'oeil
		 * -- c'est ce qu'on lui demande -- mais il ne DIT rien de precis. La
		 * Nouvelle-Zelande est ici parce que ses regles autorisent le suicide,
		 * comme Tromp-Taylor, mais les deux ne sont pas le meme jeu de regles
		 * (KataGo les distingue : ko situationnel d'un cote, positionnel de
		 * l'autre) et John Tromp est neerlandais. De meme, la Chine designe
		 * ici la lecture d'OGS, pas la pratique des tournois chinois -- c'est
		 * tout le sens du suffixe « -ogs ». Le libelle porte cette exactitude ;
		 * le drapeau porte la reconnaissance.
		 *
		 * Le meme raisonnement en sens inverse : sans le libelle, deux images
		 * ne se lisent ni par un lecteur d'ecran, ni par qui ne connait pas la
		 * convention.
		 */
		var flags = dialog.flags || [];
		var fullPath = aGame.mViewOptions.fullPath;

		/*
		 * Measured in the cell pitch the board just published as this.goSize -
		 * the same unit everything else in this module uses, and the reason
		 * the panel is the same size on a 9x9 board and a 19x19 one rather
		 * than shrinking with the grid. A button fixed in pixels is
		 * unreadable on a phone and lost on a desktop; one fixed in cells
		 * would be a fifth of the screen at 9x9 and a twentieth at 19x19.
		 */
		var size = aGame.goSize * (aGame.mOptions.size + 2) / 11;
		var cols = dialog.panelWidth || Math.min(labels.length, 2);
		var rows = Math.ceil(labels.length / cols);
		var bw = 3.4 * size, bh = 1.1 * size;
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

						// Le drapeau a gauche, le libelle a droite de la place
						// qui reste. Sans drapeau, le libelle occupe tout et
						// se centre, comme avant.
						var flagW = flag ? bh * 1.25 : 0;
						var textLeft = -bw / 2 + flagW + (flag ? bh * 0.30 : 0);
						var textW = bw / 2 - textLeft - bh * 0.18;

						ctx.fillStyle = "#202020";
						// Measured, not guessed: "Chinese (OGS)" and
						// "Tromp-Taylor" are not the same length, and a size
						// that fits the shorter clips the longer.
						var fontSize = Math.round(bh * 0.42);
						do {
							ctx.font = "bold " + fontSize + "px sans-serif";
							if(ctx.measureText(label).width <= textW * 0.96) break;
							fontSize--;
						} while(fontSize > 6);
						ctx.textAlign = flag ? "left" : "center";
						ctx.textBaseline = "middle";
						ctx.fillText(label, flag ? textLeft : 0, 0);

						if(!flag) return;
						/*
						 * L'image arrive apres coup, et le gadget a deja
						 * dessine quand elle arrive : le rappel peint dans le
						 * MEME contexte, comme le fait go-xd-view.js pour la
						 * texture du plateau. Le bouton est donc brievement
						 * sans drapeau plutot que brievement faux -- et le
						 * libelle, lui, est la des le premier trait.
						 */
						this.getResource("image|" + fullPath + "/" + flag, function(img) {
							// Proportions respectees : un drapeau etire est
							// un autre drapeau, et certains ne se distinguent
							// que par leur rapport (Suisse, Danemark...).
							var h = bh * 0.62, w = h * (img.width / img.height);
							if(w > flagW) { w = flagW; h = w * (img.height / img.width); }
							var x = -bw / 2 + (flagW - w) / 2;
							ctx.drawImage(img, x, -h / 2, w, h);
							// Un liseré : beaucoup de drapeaux ont du blanc au
							// bord et se fondraient dans le bouton.
							ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
							ctx.lineWidth = Math.max(1, bh * 0.02);
							ctx.strokeRect(x, -h / 2, w, h);
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
		// A stage with nothing to ask, or one whose choice is already settled,
		// takes no input.
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
	 * go-xd-view.js's own xdPlayedMove already returns early for a move with
	 * no captures, which a prelude move has none of - but it reaches that
	 * conclusion through `aMove.p < 0`, which is true of a pass as well. The
	 * test here is on the setup field, so the two cases stay distinguishable
	 * if either half changes.
	 */
	var SuperViewBoardxdPlayedMove = View.Board.xdPlayedMove;
	View.Board.xdPlayedMove = function(xdv, aGame, aMove) {
		if(aMove && aMove.setup !== undefined) {
			aGame.MoveShown();
			return false;
		}
		return SuperViewBoardxdPlayedMove.apply(this, arguments);
	}

})();
