/*
 * The leading semicolon is load-bearing - see prelude-model.js and
 * tests/core/model-bundles.test.js.
 */
;

/*
 * The prelude's buttons, for the mills module.
 *
 * This is where the first attempt failed, and the failure was silent: the
 * buttons were drawn and clicking them did nothing at all.
 *
 * The chessbase and checkers preludes hook View.Board.xdInput, the input
 * specification that jocly.xd-view.js's generic state machine reads. mills
 * does not use it. It replaces the whole machine - View.Board.xdBuildHTStateMachine
 * in mills-xd-view.js - with its own states (S_SELECT, S_ANIMATING) and never
 * calls xdInput at all; "grep xdInput mills-xd-view.js" comes back empty. An
 * xdInput override there is simply never read.
 *
 * Worse, mills' own Select() reasons only about move.f, move.t and move.c, and
 * ends with Highlight(move.f) for a move it does not recognise. A setup move
 * has none of the three, so that becomes Highlight(undefined) and then
 * updateGadget("cell#undefined") - a gadget that does not exist. Nothing is
 * bound, nothing is drawn, nothing happens. And because a single-choice stage
 * takes the matchingMoves.length==1 shortcut and fires E_DONE by itself, the
 * turn pass worked while the buttons did not, which made it look like a
 * drawing problem rather than an input one.
 *
 * So the prelude supplies its own state machine for its own stages and hands
 * the board's back untouched once the choice is made.
 */

(function() {

	/*
	 * Everything is measured in board cells. mills-xd-view.js publishes the
	 * cell side as this.millsSize right after computing it - 1333 for the 7x7
	 * board of 12 Men's Morris. The first attempt sized the buttons in pixels
	 * instead and drew them 260 x 90 on a board 12000 wide, which is why they
	 * came out unreadable.
	 *
	 * At 1333: a button is 2933 x 1333, the panel 7065 x 2133 - a little under
	 * three fifths of the board's width - and the name is set at 400.
	 */
	var BUTTON_W = 2.2, BUTTON_H = 1.0, GAP = 0.3;
	var NAME_SIZE = 0.3;

	function Layout(dialog) {
		var n = dialog.labels.length;
		var cols = dialog.panelWidth || Math.min(n, 2);
		var rows = Math.ceil(n / cols);
		return {
			cols: cols,
			rows: rows,
			width: cols * BUTTON_W + (cols + 1) * GAP,
			height: rows * BUTTON_H + (rows + 1) * GAP,
		};
	}

	// Shrink until it fits rather than trusting a chosen size: "12 Men´s
	// Morris Fly" is half again as long as "12 Men´s Morris".
	function FitFont(ctx, text, maxWidth, size, weight) {
		do {
			ctx.font = weight + " " + Math.round(size) + "px sans-serif";
			if(ctx.measureText(text).width <= maxWidth)
				return;
			size -= 8;
		} while(size > 24);
	}

	var SuperXdInit = View.Game.xdInit;
	View.Game.xdInit = function(xdv) {
		SuperXdInit.apply(this, arguments);
		var dialogs = this.mOptions.prelude;
		if(!dialogs) return;
		for(var i = 0; i < dialogs.length; i++)
			if(dialogs[i] && dialogs[i].labels)
				CreateDialog(this, xdv, i, dialogs[i]);
	}

	function CreateDialog(aGame, xdv, n, dialog) {
		// millsSize is set by mills-xd-view.js's xdInit, which the call above
		// has just run; the fallback only keeps a game that loads this file
		// without that one from dying on a NaN.
		var size = aGame.millsSize || Math.floor(12000 / (aGame.mOptions.width + 2));
		var box = Layout(dialog);
		// Rounded: these are gadget dimensions, and a panel 7064.9 wide only
		// makes the numbers harder to read back when checking the layout.
		var bw = Math.round(BUTTON_W * size), bh = Math.round(BUTTON_H * size);

		xdv.createGadget("setup" + n + "-board", {
			base: {
				type: "element",
				x: 0,
				y: 0,
				width: Math.round(box.width * size),
				height: Math.round(box.height * size),
				z: 108,
				css: { "background-color": "White" },
			},
		});

		dialog.labels.forEach(function(label, setup) {
			var col = setup % box.cols, row = Math.floor(setup / box.cols);
			xdv.createGadget("setup" + n + "#" + setup, {
				base: {
					type: "canvas",
					x: Math.round((col - (box.cols - 1) / 2) * (BUTTON_W + GAP) * size),
					y: Math.round((row - (box.rows - 1) / 2) * (BUTTON_H + GAP) * size),
					width: bw,
					height: bh,
					z: 109,
					draw: function(ctx) {
						ctx.fillStyle = "#c0c0c0";
						ctx.beginPath();
						ctx.rect(-bw / 2, -bh / 2, bw, bh);
						ctx.fill();
						ctx.textAlign = "center";
						ctx.textBaseline = "middle";
						ctx.fillStyle = "#202020";
						FitFont(ctx, label, bw * 0.9, NAME_SIZE * size, "bold");
						ctx.fillText(label, 0, 0);
					},
				},
			});
		});
	}

	function Show(xdv, name, visible) {
		xdv.updateGadget(name, { base: { visible: !!visible } });
	}

	var SuperBuildHTStateMachine = View.Board.xdBuildHTStateMachine;
	View.Board.xdBuildHTStateMachine = function(xdv, htsm, aGame) {
		var stage = this.preludeStage;
		if(stage === undefined || stage < 0)
			return SuperBuildHTStateMachine.apply(this, arguments);

		var moves = this.mMoves;
		var dialog = (aGame.mOptions.prelude || [])[stage];
		var buttons = [];

		function Bind(args) {
			// A stage with nothing to ask - the turn pass that brings the
			// opening move back round to the first player - or one whose
			// choice is already settled: play it and be done.
			if(!dialog || !dialog.labels || moves.length < 2) {
				htsm.smQueueEvent("E_PICK", { move: moves[0] });
				return;
			}
			Show(xdv, "setup" + stage + "-board", true);
			moves.forEach(function(move) {
				var name = "setup" + stage + "#" + move.setup;
				buttons.push(name);
				xdv.updateGadget(name, {
					base: {
						visible: true,
						click: function() {
							htsm.smQueueEvent("E_PICK", { move: move });
						},
					},
				});
			});
		}

		function Clean(args) {
			buttons.forEach(function(name) {
				xdv.updateGadget(name, { base: { visible: false, click: null } });
			});
			buttons = [];
			if(dialog && dialog.labels)
				Show(xdv, "setup" + stage + "-board", false);
		}

		function Send(args) {
			aGame.MakeMove(args.move);
		}

		htsm.smTransition("S_INIT", "E_INIT", "S_SELECT", [Bind]);
		htsm.smTransition("S_SELECT", "E_PICK", "S_DONE", [Clean, Send]);
		htsm.smTransition(["S_SELECT", "S_DONE"], "E_END", "S_DONE", [Clean]);
	}

	/*
	 * Nothing moved on the board, so there is nothing to animate. The test is
	 * on the move having no destination rather than on it carrying a setup:
	 * the turn pass carries none, and mills' own xdPlayedMove would take it
	 * into millsAnimateMove with t = -1.
	 */
	var SuperXdPlayedMove = View.Board.xdPlayedMove;
	View.Board.xdPlayedMove = function(xdv, aGame, aMove) {
		if(aMove && aMove.t < 0) {
			aGame.MoveShown();
			return false;
		}
		return SuperXdPlayedMove.apply(this, arguments);
	}

})();
