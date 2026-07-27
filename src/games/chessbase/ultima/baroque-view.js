
/*
 * Shared 2D view for the baroque family - Ultima, Rococo and Rocaille.
 *
 * The three views were the same file three times over: build a piece style out
 * of a sprite sheet, lay out a checkerboard that may or may not be ringed,
 * hand both to cbDefineView. Only four things ever differed, so those are the
 * settings and the rest lives here, the same way baroque-core.js holds the
 * rules and each game contributes only its dials:
 *
 *     Model.Game.baroqueDefineVariant({ ... })    the rules
 *     View.Game.baroqueDefineView({ ... })        this
 *
 * Call it from the game's own view file, which must be listed after this one
 * in the manifest's viewScripts. The settings:
 *
 *   sheet       sprite sheet, under res/ - one column per piece, row 0 White,
 *               row 1 Black, cells of CELL x CELL pixels
 *   columns     aspect -> column in that sheet. The one place that knows which
 *               picture a piece gets; editing the sheet means editing this.
 *   width       board width in squares (height is taken from the layout)
 *   height      board height in squares
 *   ring        true if the outer ring is edge ground, drawn apart
 *   colors      { light, dark, edge } - omit for the module's default board;
 *               edge is only needed when ring is on
 *   piece       piece size as a fraction of a square, default 0.99
 *   clicker     click layer size as a fraction of a square, default 1.09
 *   margin      board margin in squares, default 0.67 (the classic 2D margin)
 *
 * The panel that separates a swap from a mutual destruction is in
 * baroque-choice-view.js, and the capture animation in
 * baroque-capture-view.js; both wrap what this file defines, so they come
 * after it and after the game's own view.
 */

(function() {

	var CELL = 100;								// sprite cell size, in pixels

	// Piece size, in the virtual units the view lays the board out in. A cell
	// is JOCLY_FIELD_SIZE / (longest side + 2 * margin) of those, so a piece
	// sized once and for all overflows as soon as a variant uses a bigger
	// board: 1050 is 82% of a cell on Ultima's 8x8, 99% on Rococo's 10x10 and
	// 117% on Rocaille's 12x10, which is what made Rocaille's sprites spill
	// over their squares. Deriving it from the board keeps every variant at
	// the same proportion, whatever its size.
	var FIELD = 12000;							// JOCLY_FIELD_SIZE, grid-board-view.js
	var MARGIN = 0.67;							// cbGridBoardClassic2DMargin

	function pieceSize(V, fraction) {
		var margin = V.margin === undefined ? MARGIN : V.margin;
		var cols = V.width + 2 * margin, rows = V.height + 2 * margin;
		var ratio = cols / rows;
		var cell = ratio < 1 ? (FIELD * ratio) / cols : (FIELD / ratio) / rows;
		return Math.round(cell * fraction);
	}

	// A checkerboard, ringed with edge squares when the variant has them.
	// Rows run from the top down, as boardLayout expects.
	function layoutOf(V) {
		var rows = [], last = { r: V.height - 1, c: V.width - 1 };
		for(var r = V.height - 1; r >= 0; r--) {
			var s = "";
			for(var c = 0; c < V.width; c++) {
				if(V.ring && (r === 0 || r === last.r || c === 0 || c === last.c))
					s += "e";
				else
					s += ((r + c) % 2 === 0) ? "#" : ".";
			}
			rows.push(s);
		}
		return rows;
	}

	View.Game.baroqueDefineView = function(V) {

		// one entry per aspect, plus the two rows of the sheet: White reads
		// from the top row, Black from the bottom
		View.Game.baroquePieceStyle = function() {
			var style = {
				"1": { "default": { "2d": { clipy: 0 } } },
				"-1": { "default": { "2d": { clipy: CELL } } },
				"default": {
					"2d": {
						file: this.mViewOptions.fullPath + V.sheet,
						clipwidth: CELL,
						clipheight: CELL,
						width: pieceSize(V, V.piece || 0.99),
						height: pieceSize(V, V.piece || 0.99),
					},
				},
			};
			for(var aspect in V.columns)
				style[aspect] = { "2d": { clipx: V.columns[aspect] * CELL } };
			return style;
		}

		View.Game.cbDefineView = function() {
			// no colours given: the module's own board, as Ultima has always had
			var boardSpec = this.cbGridBoardClassic2DMargin;
			if(V.colors) {
				var fill = {
					".": V.colors.light,
					"#": V.colors.dark,
					" ": "rgba(0,0,0,0)",
				};
				if(V.ring)
					fill["e"] = V.colors.edge;	// only crossed to capture
				boardSpec = $.extend(true, {}, this.cbGridBoardClassic2DMargin, {
					colorFill: fill,
				});
			}

			return {
				coords: {
					"2d": this.cbGridBoard.coordsFn.call(this, boardSpec),
				},
				boardLayout: layoutOf(V),
				board: {
					"2d": {
						draw: this.cbDrawBoardFn(boardSpec),
					},
				},
				clicker: {
					"2d": {
						width: pieceSize(V, V.clicker || 1.09),
						height: pieceSize(V, V.clicker || 1.09),
					},
				},
				pieces: this.baroquePieceStyle(),
			};
		}
	}

})();
