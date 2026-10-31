
/*
 * Rococo, by Peter Aronson and David Howe (2002) - a game in the Ultima
 * family. https://www.chessvariants.com/other.dir/rococo.html
 *
 * 10x10 board. The inner 8x8 (files a-h, ranks 1-8) is normal ground; the 36
 * squares of the outer ring are "edge squares": a move may only pass over or
 * end on an edge square when that is necessary for a capture, and then only
 * crossing the minimal number of them. Victory is by *capturing* the enemy
 * King - there is no check or checkmate, and a player with no legal move
 * loses.
 *
 * Everything below is a dial of the shared engine in baroque-core.js, which must
 * be listed before this file in the manifest's modelScripts.
 */

var T = Model.Game.baroqueTypes;

Model.Game.baroqueDefineVariant({
	width: 10,
	height: 10,
	back: [T.IMMOBILIZER, T.WITHDRAWER, T.LEAPER, T.KING,
		T.CHAMELEON, T.LEAPER, T.ADVANCER, T.SWAPPER],
	file0: 1,					// files a..h of the source page, ring aside
	backRow: 1,
	pawnRow: 2,
	aspect: "rococo",
	leaperName: "long-leaper",
	leapMax: Infinity,			// the Long Leaper takes a whole line of pieces
	edgeRing: true,
	promoRow: 8,				// the far rank, past the enemy King's own
	protectKing: false,			// a Swapper may trade places with a King
	bindingCheck: false,		// no check: the King is captured like any piece
});
