/*
 * The "everything at once" Chameleon move - pure Node:
 *   node tests/rococo/combo.test.js
 *
 * Squares are written here in BOARD notation (a1..j10, edge ring included) -
 * the naming the engine prints and the player reads on screen. The other
 * suites use the source page's inner naming (a1..h8); harness.bpos/bname
 * bridge the two, so this file can quote the position exactly as reported.
 *
 * Position, White to play ('#' = edge square, which no piece here may enter):
 *
 *     10 |  #  #  #  #  #  #  #  #  #  #
 *      9 |  #  .  .  .  .  .  .  .  .  #
 *      8 |  #  .  .  .  .  .  .  .  .  #
 *      7 |  #  .  .  .  .  .  .  .  .  #
 *      6 |  #  .  .  .  .  .  .  . bI  #
 *      5 |  # bW wC  .  . bL  . bS bA  #
 *      4 |  #  .  .  .  .  .  .  . bK  #
 *      3 |  #  .  .  .  .  .  .  .  .  #
 *      2 |  # wK  .  .  .  .  .  .  .  #
 *      1 |  #  #  #  #  #  #  #  #  #  #
 *        +------------------------------
 *           a  b  c  d  e  f  g  h  i  j
 *
 *   White: Chameleon c5, King b2 (kept out of the way)
 *   Black: Withdrawer b5, Long Leaper f5, Swapper h5, Advancer i5,
 *          Immobilizer i6, King i4
 *
 * With a SINGLE move the White Chameleon travels c5 -> h5 and:
 *   - captures the Withdrawer b5, by moving directly away from it;
 *   - captures the Long Leaper f5, by leaping over it;
 *   - swaps places with the Swapper h5, which is what lets the move end on an
 *     occupied square (the Swapper lands on c5);
 *   - captures the Advancer i5, by approaching it.
 * Standing on h5 the Chameleon then freezes the Immobilizer i6 - and is frozen
 * by it, which is the only reason the adjacent Black King i4 survives.
 *
 * This is the sharpest case the model has: the four mimicked powers, the leap
 * that clears the way for the swap, and the mutual freeze, all in one move.
 */

const h = require("./harness.js");

let passed = 0, failed = 0;
function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if(a === e) passed++;
	else { failed++; console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a); }
}

const sb = h.loadModel(["base-model.js", "grid-geo-model.js", "ultima/baroque-core.js", "ultima/rococo-model.js"]);
const game = h.newGame(sb);

const POSITION = {
	b2: "wK", c5: "wC",
	b5: "bW", f5: "bL", h5: "bS", i5: "bA", i6: "bI", i4: "bK",
};

// build POSITION with the given squares changed; a null value empties a square
function position(changes, who) {
	const pieces = Object.assign({}, POSITION, changes || {});
	for(const square in pieces)
		if(pieces[square] === null)
			delete pieces[square];
	return h.setup(sb, game, pieces, who === undefined ? 1 : who, h.bpos);
}

const movesOf = (board, square) => h.movesFrom(board, game, h.bpos(square), h.bname);
const swapsOf = (board, square) => movesOf(board, square).filter((m) => m.indexOf("<>") >= 0);
const censusOf = (board) => h.census(board, game, h.bname);

/* ------------------------------------------------- the combination itself */

const board = position();

check("the four captures are a single legal move",
	swapsOf(board, "c5"),
	["Cc5<>h5xb5,f5,i5"]);

const combo = board.mMoves.filter((m) => m.swap != null && m.f === h.bpos("c5"))[0];

check("it swaps with the Swapper, not with another piece",
	h.bname(board.pieces[combo.swap].p), "h5");

check("it captures exactly the Withdrawer, the Long Leaper and the Advancer",
	combo.kills.map((k) => h.bname(board.pieces[k].p)).sort(), ["b5", "f5", "i5"]);

check("the victims are those three pieces and no other kind - the Immobilizer and the King are left alone",
	combo.kills.map((k) => game.cbVar.pieceTypes[board.pieces[k].t].name).sort(),
	["advancer", "long-leaper", "withdrawer"]);

check("game notation shows the swap and the three victims",
	sb.Model.Move.ToString.call(Object.assign(Object.create(sb.Model.Move), combo), 0),
	"Cc5-h5<>*3");

/* --------------------------------------------- each power really pulls its weight */

check("without the Withdrawer, the same move captures two",
	swapsOf(position({ b5: null }), "c5"), ["Cc5<>h5xf5,i5"]);

check("without the Long Leaper, the Chameleon just slides to the swap",
	swapsOf(position({ f5: null }), "c5"), ["Cc5<>h5xb5,i5"]);

check("without the Advancer, no capture by approach",
	swapsOf(position({ i5: null }), "c5"), ["Cc5<>h5xb5,f5"]);

check("approach only takes an Advancer: a Withdrawer on i5 survives",
	swapsOf(position({ i5: "bW" }), "c5"), ["Cc5<>h5xb5,f5"]);

check("the leap needs its landing square: an extra piece on g5 kills the whole move",
	swapsOf(position({ g5: "bW" }), "c5"), []);

check("a friendly Long Leaper on f5 cannot be leapt, so the swap is out of reach",
	swapsOf(position({ f5: "wL" }), "c5"), []);

check("the withdrawal victim must sit directly behind: b6 instead of b5 captures nothing",
	swapsOf(position({ b5: null, b6: "bW" }), "c5"), ["Cc5<>h5xf5,i5"]);

/* ----------------------------------------------------- the resulting position */

board.ApplyMove(game, combo);

check("after the move: three pieces gone, Chameleon and Swapper exchanged",
	censusOf(board), ["bI@i6", "bK@i4", "bS@c5", "wC@h5", "wK@b2"]);

board.mWho = -1;
check("the Chameleon freezes the Immobilizer, which may only kill itself",
	movesOf(board, "i6"), ["Ii6(suicide)"]);

check("the Black King may take the Chameleon standing next to it",
	movesOf(board, "i4").filter((m) => m.indexOf("x") >= 0), ["Ki4-h5xh5"]);

check("no immediate swap-back for the Swapper it just traded with",
	swapsOf(board, "c5"), []);

board.mWho = 1;
check("the Chameleon is frozen in turn: its only move is suicide",
	movesOf(board, "h5"), ["Ch5(suicide)"]);

/* ------------------------------------ the same position reached without history */

const LANDED = { b2: "wK", h5: "wC", c5: "bS", i4: "bK", i6: "bI" };
const landed = h.setup(sb, game, LANDED, -1, h.bpos);		// Black to move

check("reached fresh, the position is identical",
	h.census(landed, game, h.bname), censusOf(board));

check("and there the Swapper may swap with the Chameleon - the ban above is the rule, not the geometry",
	h.movesFrom(landed, game, h.bpos("c5"), h.bname).filter((m) => m.indexOf("<>") >= 0),
	["Sc5<>h5"]);

const open = Object.assign({}, LANDED);
delete open.i6;
const noFreeze = h.setup(sb, game, open, 1, h.bpos);
check("remove the Immobilizer and the Chameleon does take the King",
	h.capturesFrom(noFreeze, game, h.bpos("h5"), h.bname), ["Ch5-i4xi4"]);

/* ------------------------------------------------------------- undo integrity */

{
	const b = position();
	b.GenerateMoves(game);
	const move = b.mMoves.filter((m) => m.swap != null && m.f === h.bpos("c5"))[0];
	const before = censusOf(b), sign = b.zSign;
	const undo = b.cbQuickApply(game, move);
	const during = censusOf(b);
	b.cbQuickUnapply(game, undo);
	check("quick-apply moves the three victims off and exchanges the two pieces",
		during, ["bI@i6", "bK@i4", "bS@c5", "wC@h5", "wK@b2"]);
	check("quick-unapply restores every piece", censusOf(b), before);
	check("quick-unapply restores the Zobrist signature", b.zSign, sign);
}

console.log((failed ? "FAILED - " : "OK - ") + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
