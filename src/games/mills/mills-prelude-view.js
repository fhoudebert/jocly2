/*
 * The buttons for the mills prelude.
 *
 * The model half (mills-prelude-model.js) turns the opening into a choice; if
 * this file is not in the view scripts, the game asks a question nothing on
 * screen can answer - a board that responds to no click, and no error
 * anywhere. tests/core/script-lists.test.js guards against that.
 *
 * Everything here is measured in the board's own unit, published by
 * mills-xd-view.js as View.Game.millsSize: one cell is about one unit across,
 * which on a 7x7 board is roughly 1333. The first version of this file used
 * bare numbers borrowed from the chessbase prelude, which works at 600 - the
 * panel came out about a fifth of its proper size, too small to read and
 * awkward to hit. Nothing here should be an absolute number again.
 *
 * The buttons carry text rather than pieces. The chessbase prelude draws the
 * back rank each setup stands for and writes the name underneath; a choice of
 * RULES has nothing to draw, so the name IS the button, with a line under it
 * saying what the rule does - which is the part a player actually needs, since
 * "Standard" and "Fly" mean nothing to someone meeting the game.
 */

;(function() {

	var RULES = [
		{ name: "Standard", hint: "move to an adjacent point" },
		{ name: "Fly", hint: "fly anywhere with 3 men left" },
	];

	// in board units: a button a bit over two cells wide, one cell high
	var BUTTON_W = 2.2, BUTTON_H = 1.0, GAP = 0.3;

	function inPrelude(board) {
		return board.preludeStage !== undefined && board.preludeStage >= 0;
	}

	function Draw(rule, size) {
		return function(ctx) {
			var w = BUTTON_W * size, h = BUTTON_H * size;
			ctx.fillStyle = "#e8e4dc";
			ctx.fillRect(-w / 2, -h / 2, w, h);
			ctx.strokeStyle = "#3a3226";
			ctx.lineWidth = Math.max(2, size * 0.02);
			ctx.strokeRect(-w / 2, -h / 2, w, h);
			ctx.fillStyle = "#201a12";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = "bold " + Math.round(size * 0.30) + "px sans-serif";
			ctx.fillText(rule.name, 0, -h * 0.14);
			ctx.font = Math.round(size * 0.15) + "px sans-serif";
			ctx.fillText(rule.hint, 0, h * 0.24);
		};
	}

	/*
	 * mills-xd-view.js calls xdInitExtra at the end of its own xdInit, once
	 * millsSize is known - which is the hook meant for this. The gadgets are
	 * created once, with the rest of the furniture; the state machine only
	 * shows and wires them.
	 */
	var SuperViewGameXdInitExtra = View.Game.xdInitExtra;
	View.Game.xdInitExtra = function(xdv) {
		SuperViewGameXdInitExtra.apply(this, arguments);
		if(!this.mOptions || !this.mOptions.prelude)
			return;
		var size = this.millsSize;
		if(!size) {
			// Without it every dimension below is NaN, and a NaN-sized gadget
			// is not a small panel, it is no panel at all - the game would
			// open on a board that answers no click and says nothing.
			console.error("[mills] the prelude needs View.Game.millsSize, which"
				+ " mills-xd-view.js publishes from its own SIZE - no buttons drawn");
			return;
		}
		var span = RULES.length * BUTTON_W + (RULES.length - 1) * GAP;

		xdv.createGadget("prelude-panel", {
			base: {
				type: "element",
				x: 0, y: 0, z: 108,
				width: (span + 2 * GAP) * size,
				height: (BUTTON_H + 2 * GAP) * size,
				css: { "background-color": "rgba(250,248,244,.94)" },
			},
		});
		RULES.forEach(function(rule, setup) {
			xdv.createGadget("prelude#" + setup, {
				base: {
					type: "canvas",
					x: (setup - (RULES.length - 1) / 2) * (BUTTON_W + GAP) * size,
					y: 0,
					z: 109,
					width: BUTTON_W * size,
					height: BUTTON_H * size,
					draw: Draw(rule, size),
				},
			});
		});
	}

	/*
	 * While the prelude is open there is nothing on the board to click, so the
	 * whole machine is: show the buttons, and send the setup move the clicked
	 * one stands for. Anything else is the ordinary mills machine.
	 *
	 * The shape follows mills' own: E_INIT into S_SELECT, E_DONE carrying the
	 * move, SendMove calling aGame.MakeMove - the same states and the same
	 * click idiom (base.click) the board cells use, so the framework sees
	 * nothing unusual.
	 */
	var SuperViewBoardXdBuildHTStateMachine = View.Board.xdBuildHTStateMachine;
	View.Board.xdBuildHTStateMachine = function(xdv, htsm, aGame) {
		if(!inPrelude(this))
			return SuperViewBoardXdBuildHTStateMachine.apply(this, arguments);

		var moves = this.mMoves;
		var chosen = null;

		function Show() {
			xdv.updateGadget("prelude-panel", { base: { visible: true } });
			moves.forEach(function(move) {
				if(move.setup === undefined)
					return;
				xdv.updateGadget("prelude#" + move.setup, {
					base: {
						visible: true,
						click: function() { htsm.smQueueEvent("E_DONE", { move: move }); },
					},
					"2d": { classes: "choice" },
				});
			});
		}
		function Clean() {
			xdv.updateGadget("prelude-panel", { base: { visible: false } });
			RULES.forEach(function(rule, setup) {
				xdv.updateGadget("prelude#" + setup, {
					base: { visible: false, click: null },
					"2d": { classes: "" },
				});
			});
		}
		function SaveMove(args) { chosen = args.move; }
		function SendMove() { aGame.MakeMove(chosen); }

		htsm.smTransition("S_INIT", "E_INIT", "S_SELECT", []);
		htsm.smEntering("S_SELECT", [ Show ]);
		htsm.smTransition("S_SELECT", "E_DONE", null, [ SaveMove, SendMove ]);
		htsm.smLeaving("S_SELECT", [ Clean ]);
		htsm.smTransition(["S_SELECT"], "E_END", "S_DONE", []);
		htsm.smEntering("S_DONE", [ Clean ]);

		/*
		 * The second stage is the turn pass: one move and nothing to choose,
		 * so it is played rather than offered. It belongs to the other player,
		 * which is the machine in a game against the AI - leaving it on the
		 * board would show a panel with a single button nobody should press.
		 */
		if(this.preludeStage === 1 && moves.length === 1)
			htsm.smQueueEvent("E_DONE", { move: moves[0] });
	}

})();
