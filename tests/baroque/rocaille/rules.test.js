/*
 * Rocaille rules - pure Node:
 *   node tests/rocaille/rules.test.js
 *
 * Rocaille is Rococo on other dials (see ultima/rocaille-model.js), so what is
 * worth testing here is what the dials change: the 10x8 field inside a 12x10
 * board, the Leaper that stops at two victims, the King that cannot be swapped,
 * and check that binds. The edge rule itself is Rococo's and is covered by
 * tests/rococo/edge.test.js; what is checked below is only that Rocaille has a
 * ring at all, on its own geometry.
 *
 * Squares are named over the whole board, ring included: files a..l, ranks
 * 1..10, so the field is b2..k9 and White's back rank is rank 2.
 */

const h = require("../rococo/harness.js");

const W = 12;								// this board is wider than Rococo's

let passed = 0, failed = 0;
function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if(a === e) passed++;
	else { failed++; console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a); }
}

const sb = h.loadModel(["base-model.js", "grid-geo-model.js", "ultima/baroque-core.js", "ultima/rocaille-model.js"]);
const game = h.newGame(sb);
game.mPlayedMoves = [];

const at = (square) => h.bpos(square, W);
const nm = (pos) => h.bname(pos, W);
const pos = (pieces, who) => h.setup(sb, game, pieces, who === undefined ? 1 : who, at);
const movesOf = (board, square) => h.movesFrom(board, game, at(square), nm);
const capturesOf = (board, square) => movesOf(board, square).filter((m) => m.indexOf("x") >= 0);
function generated(board) { board.GenerateMoves(game); return board; }

// two lone Kings, far apart, so a test position is never accidentally finished
const KINGS = { b2: "wK", k9: "bK" };
const with_ = (extra) => Object.assign({}, KINGS, extra);

/* ------------------------------------------------------------ the board */

{
	const board = h.newBoard(sb, game);
	const row = (r) => {
		let s = "";
		for(let c = 0; c < W; c++) {
			const i = board.board[r * W + c];
			const t = i < 0 ? "." : game.cbVar.pieceTypes[board.pieces[i].t].fenAbbrev;
			s += i < 0 ? "." : (board.pieces[i].s > 0 ? t : t.toLowerCase());
		}
		return s;
	};
	check("White's back rank sits inside the ring", row(1), ".SLAPKPCALI.");
	check("with the two Withdrawers on the rank in front", row(2), ".PPPWPWPPPP.");
	check("Black mirrors it", [row(8), row(7)], [".slapkpcali.", ".pppwpwpppp."]);
	check("the ring is empty and so is the middle",
		[row(0), row(3), row(6), row(9)],
		["............", "............", "............", "............"]);
	check("40 men on the 80 squares of the field - Rococo's own density",
		board.pieces.filter((p) => p.p >= 0).length, 40);
	check("the opening offers this many moves", generated(board).mMoves.length, 54);
}

/* --------------------------------------------- the Leaper is Rococo's own */

{
	// four enemies in a row, each with an empty square behind it: the Leaper may
	// stop after any of them, and sweeping the lot is one move
	const line = with_({ c5: "wL", d5: "bW", f5: "bW", h5: "bW", j5: "bW" });
	check("the Leaper sweeps as much of a line as it likes",
		capturesOf(pos(line), "c5"),
		["Lc5-e5xd5", "Lc5-g5xd5,f5", "Lc5-i5xd5,f5,h5", "Lc5-k5xd5,f5,h5,j5"]);

	// it slides up to its victim, jumps it, and may keep going beyond
	check("it still slides up to its victim before jumping",
		capturesOf(pos(with_({ c5: "wL", g5: "bW" })), "c5"),
		["Lc5-h5xg5", "Lc5-i5xg5", "Lc5-j5xg5", "Lc5-k5xg5"]);

	// which is what keeps it a predator of the Immobilizer: a jumper that had to
	// start adjacent would be frozen before it could jump
	check("so it can still take an Immobilizer",
		capturesOf(pos(with_({ c5: "wL", g5: "bI" })), "c5").length > 0, true);

	check("a Chameleon mimicking it sweeps just as far",
		capturesOf(pos(with_({ c5: "wC", d5: "bL", f5: "bL", h5: "bL" })), "c5"),
		["Cc5-e5xd5", "Cc5-g5xd5,f5", "Cc5-i5xd5,f5,h5", "Cc5-j5xd5,f5,h5", "Cc5-k5xd5,f5,h5"]);
}

/* ----------------------------------------------------- the ring is back */

{
	// the ring is not ordinary ground: a move may only end there, or cross it,
	// when that is what a capture needs
	const board = pos(with_({ e5: "wI" }));
	const moves = movesOf(board, "e5");
	check("a piece may not simply walk onto the ring",
		moves.filter((m) => /-(a\d|l\d|\w1$|\w10$)/.test(m)), []);
	check("but it moves freely inside the field",
		moves.indexOf("Ie5-b5") >= 0 && moves.indexOf("Ie5-e9") >= 0, true);

	// a capture that needs the ring is allowed: the Leaper jumps a piece
	// standing on the last file and lands on the ring behind it
	check("a capture may take a piece off the last file",
		capturesOf(pos(with_({ i5: "wL", k5: "bW" })), "i5"), ["Li5-l5xk5"]);
}

/* ----------------------------------------------- a King is not for trade */

{
	check("a Swapper trades places with an ordinary piece",
		movesOf(pos(with_({ c5: "wS", g5: "bW" })), "c5").filter((m) => m.indexOf("<>") >= 0),
		["Sc5<>g5"]);
	check("but never with the enemy King",
		movesOf(pos({ b2: "wK", f5: "bK", c5: "wS" }), "c5").filter((m) => m.indexOf("<>") >= 0),
		[]);
	check("nor with its own",
		movesOf(pos({ f5: "wK", k9: "bK", c5: "wS" }), "c5").filter((m) => m.indexOf("<>") >= 0),
		[]);
}

/* ------------------------------------------------------- check binds */

{
	// the Advancer plays h5-g5 and takes the King on f5 by approaching it
	const board = generated(pos({ f5: "wK", k9: "bK", h5: "bA" }));
	check("an Advancer two squares away already gives check", board.baroqueCheck, true);

	// note e5 is missing: fleeing straight down the Advancer's own line does not
	// help, it simply approaches the King again on the next square
	check("only the replies that actually escape are legal",
		movesOf(board, "f5"),
		["Kf5-e4", "Kf5-e6", "Kf5-f4", "Kf5-f6", "Kf5-g4", "Kf5-g5", "Kf5-g6"]);

	check("a friendly piece on the Advancer's landing square answers the check",
		generated(pos({ f5: "wK", k9: "bK", h5: "bA", g5: "wP" })).baroqueCheck, false);

	check("an adjacent Chameleon gives check by displacement",
		generated(pos({ f5: "wK", k9: "bK", g6: "bC" })).baroqueCheck, true);

	// a Swapper destroys itself together with an adjacent enemy, King included,
	// so stepping next to one is stepping into check
	const near = generated(pos({ e5: "wK", k9: "bK", g5: "bS" }));
	check("the King may not step beside a Swapper, which would take him with it",
		movesOf(near, "e5").indexOf("Ke5-f5") >= 0, false);
}

/* ----------------------------------------------------------- promotion */

{
	// the Cannon Pawn promotes on the enemy's own back rank, rank 9
	check("a Cannon Pawn reaching the last rank is offered a promotion",
		movesOf(pos({ b2: "wK", k9: "bK", e8: "wP", e9: "bW", f8: "bW" }), "e8")
			.filter((m) => m.indexOf("=") >= 0).length > 0, true);
	check("nothing promotes short of it",
		movesOf(pos({ b2: "wK", k9: "bK", e6: "wP", e7: "bW" }), "e6")
			.filter((m) => m.indexOf("=") >= 0), []);
}

/* --------------------------------------------------------- no Ghosts */

// The engine defines a Ghost for a variant that asks for one, and Rocaille
// tried two of them on the ring before dropping them (see the model file). The
// piece's own rules are pinned in tests/baroque/ghost.test.js; what matters
// here is that Rocaille neither fields nor defines one.
{
	const types = game.cbVar.pieceTypes;
	check("Rocaille keeps the family's eight types", Object.keys(types).length, 8);
	check("and defines no Ghost",
		Object.keys(types).filter((t) => types[t].name === "ghost"), []);
}

console.log((failed ? "FAILED - " : "OK - ") + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
