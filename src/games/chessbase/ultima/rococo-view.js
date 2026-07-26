/*
 * Rococo view - 2D only.
 *
 * 10x10 board: the inner 8x8 is the playing area, the 36 squares of the outer
 * ring are "edge squares" (a move may only enter them to capture). The ring is
 * shaded distinctly so players can see it.
 *
 * The panel that separates a swap from a mutual destruction, and that carries
 * the suicide of a frozen piece, lives in roc-choice-view.js, shared with
 * Ultima.
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
