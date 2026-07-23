/*
 * Rococo view - 2D only.
 *
 * 10x10 board: the inner 8x8 is the playing area, the 36 squares of the outer
 * ring are "edge squares" (a move may only enter them to capture). The ring is
 * shaded distinctly so players can see it.
 *
 * Pieces are drawn from the sprite sheet shared with Ultima,
 * res/ultima/ultima-picto-sprites.png (a grid of CELL x CELL cells: one column
 * per piece, row 0 White, row 1 Black). SPRITE_COLUMNS is the only place that
 * maps a Rococo piece aspect to its column in that sheet.
 */

(function() {

	var CELL = 100;						// sprite cell size, in pixels
	var SPRITE_FILE = "/res/ultima/ultima-picto-sprites.png";

	var SPRITE_COLUMNS = {
		"rococo-pawn": 7,				// Cannon Pawn
		"rococo-advancer": 9,
		"rococo-leaper": 2,				// Long Leaper
		"rococo-swapper": 8,
		"rococo-withdrawer": 3,
		"rococo-chameleon": 4,
		"rococo-immobilizer": 5,
		"rococo-king": 6,
	};

	View.Game.cbRococoPieceStyle = function() {
		var style = {
			"1": { "default": { "2d": { clipy: 0 } } },			// White: top row
			"-1": { "default": { "2d": { clipy: CELL } } },		// Black: bottom row
			"default": {
				"2d": {
					file: this.mViewOptions.fullPath + SPRITE_FILE,
					clipwidth: CELL,
					clipheight: CELL,
					width: 1050,
					height: 1050,
				},
			},
		};
		for(var aspect in SPRITE_COLUMNS)
			style[aspect] = { "2d": { clipx: SPRITE_COLUMNS[aspect] * CELL } };
		return style;
	}

	// 10x10 layout: outer ring 'e', inner 8x8 checkered
	function rococoLayout() {
		var rows = [];
		for(var r = 9; r >= 0; r--) {
			var s = "";
			for(var c = 0; c <= 9; c++) {
				if(r === 0 || r === 9 || c === 0 || c === 9)
					s += "e";
				else
					s += ((r + c) % 2 === 0) ? "#" : ".";
			}
			rows.push(s);
		}
		return rows;
	}

	/*
	 * Suicide, and why it needs its own input handling.
	 *
	 * A piece removing itself does not go anywhere: the move's destination is
	 * the square it already stands on. The board is picked in two clicks - the
	 * piece, then the destination - so the suicide's destination lands on the
	 * very gadgets that the second click already means "cancel, I changed my
	 * mind" (jocly binds that cancel last, so it wins). The move would be
	 * unreachable by hand.
	 *
	 * So the suicide is moved off the board and onto the panel the view already
	 * uses to choose a promotion: selecting a frozen piece brings up its own
	 * picture next to the cancel button. Clicking the picture removes the piece,
	 * clicking cancel - or the piece on the board - goes back.
	 */
	View.Board.rocHidePanel = function(xdv, aGame) {
		xdv.updateGadget("promo-board", { base: { visible: false } });
		xdv.updateGadget("promo-cancel", { base: { visible: false } });
		for(var i = 0; i < aGame.g.pTypes.length; i++)
			xdv.updateGadget("promo#" + i, { base: { visible: false } });
	}

	View.Board.rocShowSuicidePanel = function(xdv, aGame, piece) {
		var size = aGame.cbPromoSize;
		xdv.updateGadget("promo-board", { base: { visible: true, width: size * 2 } });
		xdv.updateGadget("promo-cancel", { base: { visible: true, x: size / 2 } });

		var types = aGame.cbVar.pieceTypes, aspect = types[piece.t].aspect || types[piece.t].name;
		var spec = $.extend(true, {}, aGame.cbView.pieces["default"], aGame.cbView.pieces[aspect]);
		if(aGame.cbView.pieces[piece.s])
			spec = $.extend(true, spec, aGame.cbView.pieces[piece.s]["default"],
				aGame.cbView.pieces[piece.s][aspect]);
		xdv.updateGadget("promo#" + piece.t,
			{ base: $.extend(spec["2d"], { visible: true, x: -size / 2 }) });
	}

	var OriginalInput = View.Board.xdInput;
	View.Board.xdInput = function(xdv, aGame) {
		var spec = OriginalInput.call(this, xdv, aGame);
		var originalGetActions = spec.getActions;

		spec.getActions = function(moves, currentInput) {
			var actions = originalGetActions.call(this, moves, currentInput);
			var $board = this;

			// back to picking a piece: whatever the panel was showing is stale,
			// which also covers the player cancelling out of it
			if(currentInput.f == null) {
				this.rocHidePanel(xdv, aGame);
				return actions;
			}
			if(currentInput.t != null)
				return actions;

			for(var key in actions) {
				var action = actions[key];
				var suicide = action.moves.filter(function(m) { return m.suicide })[0];
				if(!suicide || action.moves.length != 1)
					continue;
				var piece = $board.pieces[$board.board[suicide.f]];
				if(!piece)
					continue;
				// take the action off the board squares and onto the panel
				action.click = ["promo#" + piece.t];
				action.cancel = ["promo-cancel"];
				action.view = [];
				action.pre = function() { $board.rocShowSuicidePanel(xdv, aGame, piece) };
				action.post = function() { $board.rocHidePanel(xdv, aGame) };
			}
			return actions;
		}
		return spec;
	}

	View.Game.cbDefineView = function() {

		// board colours: Ultima's shades for the inner squares, a darker green
		// for the edge ring so it reads as off-limits
		var boardSpec = $.extend(true, {}, this.cbGridBoardClassic2DMargin, {
			colorFill: {
				".": "#DDDDD0",
				"#": "#559933",
				"e": "#2f5320",
				" ": "rgba(0,0,0,0)",
			},
		});

		return {
			coords: {
				"2d": this.cbGridBoard.coordsFn.call(this, boardSpec),
			},
			boardLayout: rococoLayout(),
			board: {
				"2d": {
					draw: this.cbDrawBoardFn(boardSpec),
				},
			},
			clicker: {
				"2d": {
					width: 1150,
					height: 1150,
				},
			},
			pieces: this.cbRococoPieceStyle(),
		};
	}

})();
