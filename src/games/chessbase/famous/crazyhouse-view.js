
/*
 * Crazyhouse view: the Staunton set of classic chess, on a board two columns
 * wider each side for the holdings.
 *
 * Almost all of this is famous/classic-view.js. What a drop game adds is the
 * counters that draw the "x2" on a holding square holding more than one piece
 * of a kind: drop-view.js's cbAddCounters() extends a piece set with an aspect
 * per counter, in 2D and in 3D both.
 *
 * The 2D counters need a sprite sheet, and the one the pieces come from
 * (wikipedia.png) has six columns and no digits. res/images/counters-sprites.png
 * holds the ten the Shogi games use, cut from their own sheet: a blank first
 * column (one piece in hand needs no number), 2 to 9, then "X" for ten or more.
 * cbAddCounters() sets each counter's clipx into it; the file itself is named
 * here, since the piece sheet is what the rest of the set inherits.
 *
 * boardLayout is the 8x8 checkering with two blank columns each side. The
 * holding squares are drawn by the board, not by the layout, which only says
 * which squares are dark.
 *
 * SIZES. The holdings make the grid 12 wide for 8 of playing area, and
 * cbCSize() fits the WHOLE grid into a field of fixed size - so every square
 * comes out smaller than a classic-chess square, and pieces carrying
 * classic-chess scales stand taller than the squares they are on.
 *
 * The factor is the ratio of the two cell sizes, and it differs between the
 * dimensions because their margins do: in 3D, (8+2*.67)/(12+2*.67) = .70; in
 * 2D, where cbGridBoardClassic2DNoMargin has none, 8/12 = .67. Every number
 * below is classic-view.js's multiplied by one of those two - which lands on
 * what duodecimal/reformed-courier-view.js already uses for its own 12x8
 * board, arrived at from the other end.
 */

(function() {

	View.Game.cbDefineView = function() {

		var pieceSet = this.cbStauntonPieceStyle({
			"default": {
				"3d": {
					scale: [.42,.42,.42],   // .6 * .70
				},
				"skin3dflat": {
					scale: [.42,.42,1],
					rotate: 0,
					display: this.cbExtrudedPieceStyle()["default"]["3d"].display,
				},
				"skin2dwood": $.extend(true,
					{
						width: 1070,        // 1600 * .67
						height: 1070
					},
					this.cbStauntonWoodenPieceStyle()["default"]["2d"]),
				"skin2dfull": {
					width: 930,             // 1400 * .67
					height: 930,
				},
			},
		});

		// the holdings counters, in both dimensions
		View.Game.cbAddCounters(pieceSet, View.Game.cbStauntonPieceStyle3D);

		// ... and the sheet the 2D ones are clipped out of
		var counters = this.mViewOptions.fullPath + "/res/images/counters-sprites.png";
		for(var i = 1; i <= 10; i++) {
			pieceSet["cnt-" + i]["2d"].file = counters;
			pieceSet["cnt-" + i]["2d"].clipwidth = 100;
			pieceSet["cnt-" + i]["2d"].clipheight = 100;
		}

		return {
			coords: {
				"2d": this.cbGridBoard.coordsFn.call(this,this.cbGridBoardClassic2DMargin),
				"skin2dwood": this.cbGridBoard.coordsFn.call(this,this.cbGridBoardClassic2DNoMargin),
				"skin2dfull": this.cbGridBoard.coordsFn.call(this,this.cbGridBoardClassic2DNoMargin),
				"3d": this.cbGridBoard.coordsFn.call(this,this.cbGridBoardClassic3DMargin),
			},
			boardLayout: [
      			"...#.#.#.#..",
     			"..#.#.#.#...",
     			"...#.#.#.#..",
     			"..#.#.#.#...",
     			"...#.#.#.#..",
     			"..#.#.#.#...",
     			"...#.#.#.#..",
     			"..#.#.#.#...",
			],
			board: {
				"2d": {
					draw: this.cbDrawBoardFn(this.cbGridBoardClassic2DNoMargin),
				},
				"skin2dfull": {
					draw: this.cbDrawBoardFn(this.cbGridBoardClassic2DNoMargin),
				},
				"3d": {
					display: this.cbDisplayBoardFn(this.cbGridBoardClassic3DMargin),
				},
			},
			clicker: {
				"skin2dwood": {
					width: 1070,
					height: 1070,
				},
				"skin2dfull": {
					width: 1070,
					height: 1070,
				},
				"3d": {
					scale: [.65,.65,.65],   // .9 * .70, and what Courier uses
				},
			},
			pieces: pieceSet,
		};
	}

	/*
	 * Make the Knight jump when it moves - and make everything jump when it is
	 * dropped, since it comes from off the board. The hand columns are 0, 1
	 * and 10, 11 of the twelve.
	 */
	View.Board.cbMoveMidZ = function(aGame,aMove,zFrom,zTo) {
		var file = aMove.f % 12;
		if(aMove.a=='N' || file < 2 || file > 9)
			return Math.max(zFrom,zTo)+1500;
		else
			return (zFrom+zTo)/2;
	}

})();
