
/*
 * View of Khan's Chess. A plain 8x8 chess board, and the fairy piece set for
 * both armies - the Kingdom uses the fairy-set renderings of the orthodox
 * pieces so that the two sides look like they belong to the same game.
 *
 * Aspects: the Horde's are fr-scout (a helmet), fr-lance, fr-bow, fr-duchess
 * and fr-crowned-knight for the kheshig, and the khan is fr-prince - a crown
 * without the cross of the Kingdom's king, so the two royals are told apart on
 * the flat board too (fr-emperor would have been the same 2D sprite as the
 * king).
 *
 * No cbMoveMidZ here on purpose. Several older variants of this module
 * (spartan-view.js among them) hand-roll one to make their leapers hop, but
 * grid-board-view.js now derives that from the piece graphs themselves: a
 * destination that is the first step of a path is a leap and jumps, anything
 * reached along a ray slides. That already gets every Khan's Chess move right
 * - the kheshig hops on its knight moves and slides on its king steps, a
 * lancer hops when it moves and slides when it captures down a file, the scout
 * hops forward and slides onto the square it takes - and it keeps the king's
 * hop over the rook when castling, which a hand-rolled version drops unless it
 * remembers to test aMove.cg. Overriding it here would be strictly worse.
 */

(function() {

	View.Game.cbDefineView = function() {

		return {
			coords: {
				"2d": this.cbGridBoard.coordsFn.call(this,this.cbGridBoardClassic2DMargin),
				"3d": this.cbGridBoard.coordsFn.call(this,this.cbGridBoardClassic3DMargin),
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
				"3d": {
					display: this.cbDisplayBoardFn(this.cbGridBoardClassic3DMargin),
				},
			},
			clicker: {
				"2d": {
					width: 1300,
					height: 1300,
				},
				"3d": {
					scale: [.9,.9,.9],
				},
			},
			pieces: this.cbFairyPieceStyle({
				"default": {
					"2d": {
						width: 1200,
						height: 1200,
					},
					"3d": {
						scale: [.6,.6,.6],
					},
				},
			}),
		};
	}

})();
