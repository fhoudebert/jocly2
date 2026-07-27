
/*
 * Rocaille - a quieter Rococo, played on the 10x8 field inside a 12x10 board.
 *
 * Rococo is a sharp game: every piece moves as a Queen, the Long Leaper takes a
 * whole line at once, and the King falls without warning. Rocaille keeps the
 * pieces and their capture methods and turns the dials down - but not all the
 * way, and the reason is worth recording, because the first attempt turned them
 * down too far.
 *
 *  - The field is 10x8 with 20 men a side, the density of Rococo's own inner
 *    board, and it is surrounded by the same edge ring: 36 squares that a move
 *    may only enter, or cross, when that is needed for a capture.
 *
 *    Rocaille first dropped the ring, on the grounds that it existed only to
 *    stop pieces sheltering from Long Leapers. Measured against the family, that
 *    version had NO multi-captures at all - less explosive than Ultima, which
 *    was not the target. The ring turns out to be what keeps pieces in the field
 *    and therefore in line with one another, and a leaping capture needs several
 *    enemies on one line. It is the engine of the whole family's fireworks: with
 *    the ring and a leaper, 0.60 multi-captures per hundred plies; with a leaper
 *    and no ring, 0.25; with the ring and no leaper, zero. The two only work
 *    together.
 *
 *  - The Leaper is Rococo's own, sweeping a whole line: shortening it was tried
 *    first and turned out to cost a rule to learn without buying anything the
 *    ring was not already worth. The engine keeps the short one (leaperName
 *    "short-leaper" with leapMax 1 or 2) for a variant that wants it.
 *
 *  - Check binds. A move that leaves one's own King capturable is illegal, and a
 *    side with no legal move loses, mated or merely stuck - as in Rococo.
 *
 *  - A King may not be swapped. Otherwise a Swapper could teleport it out of its
 *    shelter from across the board, which no defensive setup survives.
 *
 * The army gains an Advancer and a Withdrawer over Rococo's, and the back rank
 * is arranged for defence. The Chameleon stands one square from the King as the
 * answer to an approaching Immobilizer; the Advancers are two away, with room to
 * go and fetch one; the Immobilizer and the Swapper are exiled to opposite
 * wings, both because they are offensive tools and because an enemy Chameleon
 * should have no reason to come and camp beside the King.
 *
 * The two Withdrawers stand on the second rank, in front of the King's own
 * flanks, and this is worth explaining because the obvious placement is wrong. A
 * Withdrawer captures by moving directly AWAY from its victim, so it needs an
 * empty square behind it; on the back rank, facing an enemy that comes from the
 * front, that square is off the board and the piece is inert. Moved forward they
 * still do not recoil, but they become springboards: the Cannon Pawns behind
 * them hop over them onto the rank ahead.
 *
 * Two of them, there rather than on the wings, because it was measured against
 * one and none. Per hundred plies, and against the target of standing between
 * Ultima (0.23 multi-captures) and Rococo (0.89):
 *
 *     none          15.3 captures / 0.55 multi / half-life 49
 *     one, centre   14.7          / 0.59       / 54   - slowest of the four
 *     two, wings    16.9          / 0.49       / 48
 *     TWO, CENTRE   16.3          / 0.64       / 51
 *
 * The last is the liveliest without being the fastest to strip the board, and
 * it is the only one that puts the springboards where the King is. Their
 * defensive reach is the same in every arrangement - four of the ten squares on
 * the rank ahead - so the choice is made on the game, not on the guard duty.
 *
 *      a    b    c    d    e    f    g    h    i    j    k    l
 * 10   .    .    .    .    .    .    .    .    .    .    .    .    ring
 *  9   .    s    l    a    p    k    p    c    a    l    i    .    Black
 *  8   .    p    p    p    w    p    w    p    p    p    p    .
 *  3   .    P    P    P    W    P    W    P    P    P    P    .
 *  2   .    S    L    A    P    K    P    C    A    L    I    .    White
 *  1   .    .    .    .    .    .    .    .    .    .    .    .    ring
 *
 * No Ghosts, though the engine has them and they were tried here at some
 * length: two on the ring behind the King's flanks, paid for by dropping the
 * wing Pawns of the second rank, plus seven other placements. That one worked
 * on the axis it was aimed at - 0.74 multi-captures per hundred plies against
 * 0.59 over 200 games, 2.6 standard deviations apart, a real difference - but
 * it cost 4% of the capture rate at 2.3 standard deviations, no more a fluke
 * than the gain, and it left far more games unfinished at the 250-ply cap: 82
 * of 200 settled against 110. A board that empties faster (half-life 44
 * against 48) and still cannot conclude is the wrong trade. 0.59 also sits
 * squarely between Ultima's 0.23 and Rococo's 0.89, where 0.74 leans towards
 * Rococo. The Ghost stays in the engine as a brick for a later variant, with
 * its own rules pinned in tests/baroque/ghost.test.js.
 *
 * The rules themselves live in baroque-core.js, shared with Rococo; this file is
 * only the dial setting, and must be listed after it in modelScripts.
 */

var T = Model.Game.baroqueTypes;

Model.Game.baroqueDefineVariant({
	width: 12,
	height: 10,
	back: [T.SWAPPER, T.LEAPER, T.ADVANCER, T.PAWN, T.KING,
		T.PAWN, T.CHAMELEON, T.ADVANCER, T.LEAPER, T.IMMOBILIZER],
	front: [T.PAWN, T.PAWN, T.PAWN, T.WITHDRAWER, T.PAWN,
		T.WITHDRAWER, T.PAWN, T.PAWN, T.PAWN, T.PAWN],
	file0: 1,					// the ring takes the outer file
	backRow: 1,
	pawnRow: 2,
	aspect: "rocaille",
	leaperName: "long-leaper",
	leapMax: Infinity,			// Rococo's own Leaper, one rule fewer to learn
	edgeRing: true,
	promoRow: 8,				// the enemy's own back rank
	protectKing: true,
	bindingCheck: true,
});
