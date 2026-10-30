
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
 *   pieces3d    aspect -> 3D piece of fairy-set-view.js ("fr-frog", ...).
 *               Optional: without it the game stays 2D only. With it, the
 *               game must list fairy-set-view.js before this file and offer a
 *               3D skin in its manifest.
 *   scale3d     3D piece scale, default worked out from the board size the
 *               way the other chessbase views do it (0.5 on 9x9, 0.41 on 12x12)
 *   shade3d     factor applied to the board colours in 3D, default 0.72. The
 *               3D lights brighten a painted square by about 1.4 (measured on
 *               Rocaille's ring: #6E5037 came out as #956F4F) and clip the light
 *               squares to a glaring yellow; darkening first brings the 3D
 *               board back to the colours of the 2D one.
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

	// 3D piece scale. The fairy pieces are sized for a 9x9 board with its
	// margin (Modern Chess: 0.5); a square shrinks as the board grows, so the
	// pieces must too - the 12x12 Duodecimal Chess lands on 0.41 by hand.
	function scale3dOf(V) {
		if(V.scale3d) return V.scale3d;
		var margin = V.margin === undefined ? MARGIN : V.margin;
		return Math.round(5.5 / (Math.max(V.width, V.height) + 2 * margin) * 1000) / 1000;
	}

	// a CSS hex colour times k, for the 3D board (see shade3d)
	function shade(hex, k) {
		var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
		if(!m) return hex;
		return "#" + [m[1], m[2], m[3]].map(function(h) {
			var v = Math.max(0, Math.min(255, Math.round(parseInt(h, 16) * k)));
			return (v < 16 ? "0" : "") + v.toString(16);
		}).join("");
	}

	View.Game.baroqueDefineView = function(V) {

		View.Game.baroquePieces3d = V.pieces3d || null;	// read by the tests

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
			if(V.pieces3d) {
				// The fairy 3D set, re-keyed by this game's aspects: the 3D
				// display looks pieces up by aspect name, and ours are
				// "rococo-leaper" and the like, not "fr-frog".
				var fairy = this.cbFairyPieceStyle3D, style3d = $.extend(true, {}, fairy);
				for(var a3 in V.pieces3d) {
					if(!fairy[V.pieces3d[a3]])
						console.error("baroque-view: no 3D piece", V.pieces3d[a3], "for", a3);
					style3d[a3] = fairy[V.pieces3d[a3]];
				}
				var s3 = scale3dOf(V);
				style["default"]["3d"] = {
					display: this.cbDisplayPieceFn(style3d),
					scale: [s3, s3, s3],
				};
			}
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

			var view = {
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

			if(V.pieces3d) {
				// The classic 3D board - wood, black frame - painted with the
				// variant's own squares, ring included.
				var board3d = this.cbGridBoardClassic3DMargin;
				if(V.colors) {
					var k = V.shade3d || 0.72;
					var fill3d = {
						".": shade(V.colors.light, k),
						"#": shade(V.colors.dark, k),
						" ": "rgba(0,0,0,0)",
					};
					if(V.ring)
						fill3d["e"] = shade(V.colors.edge, k);
					board3d = $.extend(true, {}, this.cbGridBoardClassic3DMargin, {
						colorFill: fill3d,
					});
				}
				var c3 = Math.round(scale3dOf(V) * 1.25 * 1000) / 1000;
				view.coords["3d"] = this.cbGridBoard.coordsFn.call(this, board3d);
				view.board["3d"] = { display: this.cbDisplayBoardFn(board3d) };
				view.clicker["3d"] = { scale: [c3, c3, c3] };
			}
			return view;
		}
	}

})();
