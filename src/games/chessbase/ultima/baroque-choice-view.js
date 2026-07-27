
/*
 * The choice panel of the baroque family - shared by Ultima, Rococo and
 * Rocaille, and by any later variant with a Swapper or an Immobilizer.
 *
 * It exists because some moves cannot be told apart by the square they end on,
 * and because one of them ends on the square it started from:
 *
 *  - a Swapper trading places with a neighbour, or destroying itself together
 *    with that same neighbour: same piece, same target square;
 *  - an immobilized piece removing itself: the destination IS its own square,
 *    so the click lands on the same gadget as "click the piece again to
 *    cancel", which jocly binds last and would therefore always win.
 *
 * Each game routes those through the panel the view already had for choosing a
 * promotion. Nothing here knows about a particular board or piece set: the
 * pictures are read from the model's own aspects, so a variant gets the
 * behaviour by listing this file in viewScripts after its own view and before
 * baroque-capture-view.js.
 */

(function() {

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
	var CHOICES = ["baroque-choice-0", "baroque-choice-1", "baroque-choice-2", "baroque-choice-3",
		"baroque-choice-4", "baroque-choice-5", "baroque-choice-6", "baroque-choice-7"];

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

	View.Board.baroqueHidePanel = function(xdv, aGame) {
		xdv.updateGadget("promo-board", { base: { visible: false } });
		xdv.updateGadget("promo-cancel", { base: { visible: false } });
		CHOICES.forEach(function(id) {
			xdv.updateGadget(id, { base: { visible: false } });
		});
	}

	View.Board.baroqueShowPanel = function(xdv, aGame, pieces) {
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
				this.baroqueHidePanel(xdv, aGame);
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
						post: function() { $board.baroqueHidePanel(xdv, aGame) },
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
							$board.baroqueShowPanel(xdv, aGame, pictures);
							callback();
						}
					})(pictures);
					action.unexecute = function() { $board.baroqueHidePanel(xdv, aGame) };
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
							return function() { $board.baroqueShowPanel(xdv, aGame, pictures) }
						})(pictures),
						post: function() { $board.baroqueHidePanel(xdv, aGame) },
					};
				}
			}
			return actions;
		}
		return spec;
	}

})();
