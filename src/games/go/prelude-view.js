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
						ctx.fillStyle = "#c0c0c0";
						ctx.beginPath();
						ctx.rect(-bw / 2, -bh / 2, bw, bh);
						ctx.fill();
						ctx.fillStyle = "#202020";
						// Measured, not guessed: "Chinese (OGS)" and
						// "Tromp-Taylor" are not the same length, and a size
						// that fits the shorter clips the longer.
						var fontSize = Math.round(bh * 0.42);
						do {
							ctx.font = "bold " + fontSize + "px sans-serif";
							if(ctx.measureText(label).width <= bw * 0.88) break;
							fontSize--;
						} while(fontSize > 6);
						ctx.textAlign = "center";
						ctx.textBaseline = "middle";
						ctx.fillText(label, 0, 0);
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
