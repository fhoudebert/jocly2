/*
 * Rocaille view - 2D only.
 *
 * 12x10 board: a 10x8 field with Rococo's edge ring around it, drawn in the
 * same darker green so the family reads as one family.
 *
 * The panel that separates a swap from a mutual destruction lives in
 * baroque-choice-view.js, shared with Rococo.
 *
 * Pieces come from res/ultima/baroque-picto-sprites.png, the family sheet (a
 * grid of CELL x CELL cells: one column per piece, row 0 White, row 1 Black).
 * Its first eleven columns are those of the older ultima sheet, plus a twelfth
 * for the Ghost. SPRITE_COLUMNS is the only place that maps a Rocaille aspect
 * to its column; the frog of column 10 is the Short Leaper, which the engine
 * still knows but this variant does not use.
 */

(function() {

	var CELL = 100;								// sprite cell size, in pixels
	var SPRITE_FILE = "/res/ultima/baroque-picto-sprites.png";

	var SPRITE_COLUMNS = {
		"rocaille-pawn": 7,						// Cannon Pawn
		"rocaille-advancer": 9,
		"rocaille-leaper": 2,					// Long Leaper - the kangaroo
		"rocaille-ghost": 11,
		"rocaille-swapper": 8,
		"rocaille-withdrawer": 3,
		"rocaille-chameleon": 4,
		"rocaille-immobilizer": 5,
		"rocaille-king": 6,
	};

	View.Game.cbRocaillePieceStyle = function() {
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

	// a 10x8 field of ordinary squares, ringed by 40 edge squares
	function rocailleLayout() {
		var rows = [];
		for(var r = 9; r >= 0; r--) {
			var s = "";
			for(var c = 0; c <= 11; c++) {
				if(r === 0 || r === 9 || c === 0 || c === 11)
					s += "e";
				else
					s += ((r + c) % 2 === 0) ? "#" : ".";
			}
			rows.push(s);
		}
		return rows;
	}

	View.Game.cbDefineView = function() {

		// sand and clay rather than Rococo's greens: same board, same ring, but
		// the two games are told apart at a glance in the game list. The ring
		// keeps the relation Rococo uses between its own board and its ring -
		// same hue, a little over half the lightness - so it reads as ground
		// one may not simply walk on.
		var boardSpec = $.extend(true, {}, this.cbGridBoardClassic2DMargin, {
			colorFill: {
				".": "#FECA66",					// sand
				"#": "#C89264",					// clay
				"e": "#6E5037",					// tobacco: the ring, off-limits
				" ": "rgba(0,0,0,0)",
			},
		});

		return {
			coords: {
				"2d": this.cbGridBoard.coordsFn.call(this, boardSpec),
			},
			boardLayout: rocailleLayout(),
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
			pieces: this.cbRocaillePieceStyle(),
		};
	}

})();
