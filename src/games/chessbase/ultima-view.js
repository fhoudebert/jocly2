/*
 * Ultima view - 2D only for now.
 *
 * Pieces are drawn from a single sprite sheet, res/ultima/ultima-picto-sprites.png,
 * laid out as a grid of CELL x CELL cells:
 *
 *     column = piece, in the order of SPRITE_COLUMNS below
 *     row 0  = White, row 1 = Black
 *
 * so the sheet is (number of pieces * CELL) wide and (2 * CELL) high. To swap
 * in a new drawing, replace its cell in the sheet - nothing here changes. To
 * reorder or extend the sheet, edit SPRITE_COLUMNS only: it is the single
 * place that maps a piece aspect to a column.
 *
 */

(function() {

	var CELL = 100;						// sprite cell size, in pixels
	var SPRITE_FILE = "/res/ultima/ultima-picto-sprites.png";

	var SPRITE_COLUMNS = {
		"ultima-pawn": 0,				// Pincer Pawn
		"ultima-coordinator": 1,
		"ultima-leaper": 2,				// Long Leaper
		"ultima-withdrawer": 3,
		"ultima-chameleon": 4,
		"ultima-immobilizer": 5,
		"ultima-king": 6,
	};

	View.Game.cbUltimaPieceStyle = function() {
		var style = {
			"1": {						// White: top row of the sheet
				"default": {
					"2d": {
						clipy: 0,
					},
				},
			},
			"-1": {						// Black: bottom row
				"default": {
					"2d": {
						clipy: CELL,
					},
				},
			},
			"default": {
				"2d": {
					file: this.mViewOptions.fullPath + SPRITE_FILE,
					clipwidth: CELL,
					clipheight: CELL,
					width: 1200,
					height: 1200,
				},
			},
		};
		for(var aspect in SPRITE_COLUMNS)
			style[aspect] = {
				"2d": {
					clipx: SPRITE_COLUMNS[aspect] * CELL,
				},
			};
		return style;
	}

	View.Game.cbDefineView = function() {

		return {
			coords: {
				"2d": this.cbGridBoard.coordsFn.call(this,this.cbGridBoardClassic2DMargin),
			},
			boardLayout: [
				".#.#.#.#",
				"#.#.#.#.",
				".#.#.#.#",
				"#.#.#.#.",
				".#.#.#.#",
				"#.#.#.#.",
				".#.#.#.#",
				"#.#.#.#.",
			],
			board: {
				"2d": {
					draw: this.cbDrawBoardFn(this.cbGridBoardClassic2DMargin),
				},
			},
			clicker: {
				"2d": {
					width: 1300,
					height: 1300,
				},
			},
			pieces: this.cbUltimaPieceStyle(),
		};
	}

})();
