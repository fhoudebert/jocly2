/*
 * The buttons for the mills prelude.
 *
 * The model half (mills-prelude-model.js) turns the opening into a choice; if
 * this file is not in the view scripts, the game asks a question nothing on
 * screen can answer - a board that responds to no click, and no error
 * anywhere. tests/core/script-lists.test.js guards the chessbase pair against
 * exactly that; the same rule applies here.
 *
 * This is not prelude-view.js. That one hangs off View.Board.xdInput and draws
 * its buttons from chess piece sprites, and mills has neither: its input is a
 * hit-test state machine (xdBuildHTStateMachine) and its men are 3D tokens.
 * What a mills button has to show is the NAME of a rule - "Standard", "Fly" -
 * which is text, so the buttons are plain canvas gadgets with a caption and
 * the state machine that reads them is three lines long.
 */

;(function() {

	var LABELS = ["Standard", "Fly"];
	var BUTTON_W = 260, BUTTON_H = 90, GAP = 30;

	function inPrelude(board) {
		return board.preludeStage !== undefined && board.preludeStage >= 0;
	}

	/*
	 * mills-xd-view.js calls xdInitExtra at the end of its own xdInit, which
	 * is the hook meant for this - the gadgets are created once, with the
	 * rest of the furniture, and the state machine only shows and wires them.
	 */
	var SuperViewGameXdInitExtra = View.Game.xdInitExtra;
	View.Game.xdInitExtra = function(xdv) {
		SuperViewGameXdInitExtra.apply(this, arguments);
		if(!this.mOptions || !this.mOptions.prelude)
			return;
		var total = LABELS.length * BUTTON_W + (LABELS.length - 1) * GAP;
		xdv.createGadget("prelude-panel", {
			base: {
				type: "element",
				x: 0, y: 0, z: 108,
				width: total + 2 * GAP,
				height: BUTTON_H + 2 * GAP,
				css: { "background-color": "rgba(255,255,255,.92)" },
			},
		});
		LABELS.forEach(function(label, setup) {
			xdv.createGadget("prelude#" + setup, {
				base: {
					type: "canvas",
					x: (setup - (LABELS.length - 1) / 2) * (BUTTON_W + GAP),
					y: 0,
					z: 109,
					width: BUTTON_W,
					height: BUTTON_H,
					draw: function(ctx) {
						ctx.fillStyle = "#c0c0c0";
						ctx.fillRect(-BUTTON_W / 2, -BUTTON_H / 2, BUTTON_W, BUTTON_H);
						ctx.fillStyle = "#202020";
						ctx.font = "bold " + Math.round(BUTTON_H * 0.34) + "px sans-serif";
						ctx.textAlign = "center";
						ctx.textBaseline = "middle";
						ctx.fillText(label, 0, 0);
					},
				},
			});
		});
	}

	/*
	 * While the prelude is open there is nothing on the board to click, so the
	 * whole machine is: show the buttons, and send the setup move the clicked
	 * one stands for. Anything else is the ordinary mills machine.
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
				});
			});
		}
		function Hide() {
			xdv.updateGadget("prelude-panel", { base: { visible: false } });
			LABELS.forEach(function(label, setup) {
				xdv.updateGadget("prelude#" + setup, { base: { visible: false } });
			});
		}
		function SaveMove(args) { chosen = args.move; }
		function SendMove() { aGame.MakeMove(chosen); }

		htsm.smTransition("S_INIT", "E_INIT", "S_SELECT", []);
		htsm.smEntering("S_SELECT", [ Show ]);
		htsm.smTransition("S_SELECT", "E_DONE", null, [ SaveMove, SendMove ]);
		htsm.smLeaving("S_SELECT", [ Hide ]);
		htsm.smTransition(["S_SELECT"], "E_END", "S_DONE", []);
		htsm.smEntering("S_DONE", [ Hide ]);

		// The second stage is the turn pass: one move, nothing to choose, so
		// it is played rather than offered - otherwise the player would be
		// asked to confirm a non-decision.
		if(this.preludeStage === 1 && moves.length === 1)
			htsm.smQueueEvent("E_DONE", { move: moves[0] });
	}

})();
