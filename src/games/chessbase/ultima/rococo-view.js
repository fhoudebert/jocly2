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
	 * Choosing between moves the board cannot tell apart.
	 *
	 * A Swapper standing next to an enemy can do two different things to it:
	 * trade places, or destroy them both. Clicking that neighbour therefore
	 * means two moves at once, and the board input tells moves apart only by
	 * where they land. The same goes for a suicide, whose destination is the
	 * square the piece already occupies - which is also the square that means
	 * "cancel, I changed my mind".
	 *
	 * These choices are offered on the panel the view uses for promotions. The
	 * promotion pictures cannot serve: there is one per piece type, so a
	 * Swapper facing an enemy Swapper would need the same picture for both of
	 * its choices - exactly the case where the choice matters most. The panel
	 * therefore gets its own pictures, which can show any piece.
	 */
	var CHOICES = ["roc-choice-0", "roc-choice-1", "roc-choice-2", "roc-choice-3",
		"roc-choice-4", "roc-choice-5", "roc-choice-6", "roc-choice-7"];

	var OriginalCreatePromo = View.Game.cbCreatePromo;
	View.Game.cbCreatePromo = function(xdv) {
		OriginalCreatePromo.apply(this, arguments);
		CHOICES.forEach(function(id) {
			xdv.createGadget(id, {
				base: {
					y: 0,
					z: 109,
					type: "sprite",
					clipwidth: 100,
					clipheight: 100,
					width: 1200,
					height: 1200,
					visible: false,
				},
			});
		});
	}

	// the sprite spec the view uses for a piece, as the board itself draws it
	function pictureOf(aGame, piece) {
		var types = aGame.cbVar.pieceTypes, aspect = types[piece.t].aspect || types[piece.t].name;
		var spec = $.extend(true, {}, aGame.cbView.pieces["default"], aGame.cbView.pieces[aspect]);
		if(aGame.cbView.pieces[piece.s])
			spec = $.extend(true, spec, aGame.cbView.pieces[piece.s]["default"],
				aGame.cbView.pieces[piece.s][aspect]);
		return spec["2d"];
	}

	View.Board.rocHidePanel = function(xdv, aGame) {
		xdv.updateGadget("promo-board", { base: { visible: false } });
		xdv.updateGadget("promo-cancel", { base: { visible: false } });
		CHOICES.forEach(function(id) {
			xdv.updateGadget(id, { base: { visible: false } });
		});
	}

	View.Board.rocShowPanel = function(xdv, aGame, pieces) {
		var size = aGame.cbPromoSize;
		xdv.updateGadget("promo-board", { base: { visible: true, width: size * (pieces.length + 1) } });
		xdv.updateGadget("promo-cancel", { base: { visible: true, x: pieces.length * size / 2 } });
		pieces.forEach(function(piece, index) {
			if(index >= CHOICES.length)
				return;
			xdv.updateGadget(CHOICES[index], {
				base: $.extend(pictureOf(aGame, piece), {
					visible: true,
					x: (index - pieces.length / 2) * size,
				}),
			});
		});
	}

	/*
	 * The picture a choice is shown under - what the square is about to hold:
	 *
	 *   swap                - the mover, which ends up standing there
	 *   mutual destruction  - the neighbour, which is what goes
	 *   suicide             - the piece itself, which is what leaves the board
	 *
	 * Facing an enemy Swapper the two are the same piece type but not the same
	 * picture, one being White and the other Black; they still need a slot each,
	 * which is why the panel carries its own pictures rather than the promotion
	 * ones, indexed by type.
	 */
	function choicePiece(board, move) {
		if(move.swap != null)
			return board.pieces[board.board[move.f]];
		if(move.mutual)
			return board.pieces[move.c];
		return board.pieces[board.board[move.f]];
	}

	// moves the board cannot separate: several reaching one square, none of
	// them a promotion (those the view already handles by piece type)
	function needsChoice(moves) {
		return moves.length > 1 && moves.every(function(m) { return m.pr == null });
	}

	var OriginalInput = View.Board.xdInput;
	View.Board.xdInput = function(xdv, aGame) {
		var spec = OriginalInput.call(this, xdv, aGame);
		var originalGetActions = spec.getActions;

		spec.getActions = function(moves, currentInput) {
			var actions = originalGetActions.call(this, moves, currentInput);
			var $board = this;

			// back to picking a piece: a panel still up is stale, which also
			// covers the player cancelling out of it
			if(currentInput.f == null) {
				this.rocHidePanel(xdv, aGame);
				return actions;
			}

			// the choice itself: one action per move, each under its own picture
			if(currentInput.t != null) {
				if(!needsChoice(moves))
					return actions;
				var chosen = {};
				moves.forEach(function(move, index) {
					if(index >= CHOICES.length)
						return;
					chosen["choice#" + index] = {
						moves: [move],
						click: [CHOICES[index]],
						view: [],
						validate: {},
						cancel: ["promo-cancel"],
						post: function() { $board.rocHidePanel(xdv, aGame) },
					};
				});
				return chosen;
			}

			for(var key in actions) {
				var action = actions[key];
				var pictures = action.moves.map(function(m) { return choicePiece($board, m) });

				// several moves onto one square: keep the square clickable, and
				// raise the panel when it is clicked instead of animating a move
				// nobody has chosen yet
				if(needsChoice(action.moves)) {
					action.execute = (function(pictures) {
						return function(callback) {
							$board.rocShowPanel(xdv, aGame, pictures);
							callback();
						}
					})(pictures);
					action.unexecute = function() { $board.rocHidePanel(xdv, aGame) };
					continue;
				}

				// a move that leaves the piece where it stands has the square it
				// came from as destination, which is the gadget that already
				// means "cancel" - jocly binds that last, so it would win. Put
				// this one on the panel instead.
				if(+key === currentInput.f && action.moves.length == 1) {
					delete actions[key];
					actions["standing"] = {
						moves: action.moves,
						click: [CHOICES[0]],
						view: [],
						validate: { t: action.moves[0].t },
						cancel: ["promo-cancel"],
						pre: (function(pictures) {
							return function() { $board.rocShowPanel(xdv, aGame, pictures) }
						})(pictures),
						post: function() { $board.rocHidePanel(xdv, aGame) },
					};
				}
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
