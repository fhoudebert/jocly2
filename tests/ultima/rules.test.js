/*
 * Rules tests for the Ultima model - pure Node, no build required:
 *   node tests/ultima/rules.test.js
 *
 * Every position is built explicitly; both Kings are always present (they are
 * needed by the legality test and by the Coordinator) and are kept out of the
 * way of the piece under test. Moves are filtered by the abbreviation of the
 * piece being tested, so King moves do not pollute the expectations.
 */

const h = require("./harness.js");

let passed = 0, failed = 0;

function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if(a === e) {
		passed++;
	} else {
		failed++;
		console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a);
	}
}

const sb = h.loadModel(["base-model.js", "grid-geo-model.js", "ultima-model.js"]);
const game = h.newGame(sb);

// moves of the piece standing on `square`, as sorted readable strings
function movesFrom(pieces, square, who) {
	const board = h.setup(sb, game, pieces, who);
	const from = h.posOf(square);
	board.GenerateMoves(game);
	return board.mMoves
		.filter((m) => m.f == from)
		.map((m) => h.moveStr(board, m))
		.sort();
}

// only the moves that capture something
function capturesFrom(pieces, square, who) {
	return movesFrom(pieces, square, who).filter((m) => m.indexOf("x") >= 0);
}

/* ---------------------------------------------------------------- opening */

{
	const board = h.newBoard(sb, game);
	const moves = h.moveStrings(board, game);
	check("initial position: 32 pieces", board.pieces.length, 32);
	check("initial position: only the 32 Pawn moves", moves.length, 32);
	check("initial position: no capture available", moves.filter((m) => m.indexOf("x") >= 0), []);
}

/* ------------------------------------------------------------ Pincer Pawn */

check("pawn: custodian capture on arrival",
	capturesFrom({ a1: "wK", h8: "bK", d1: "wP", e4: "bP", f4: "wP" }, "d1"),
	["Pd1-d4xe4"]);

check("pawn: no capture without a friendly piece behind the victim",
	capturesFrom({ a1: "wK", h8: "bK", d1: "wP", e4: "bP" }, "d1"),
	[]);

check("pawn: no capture on a diagonal sandwich",
	capturesFrom({ a1: "wK", h8: "bK", d1: "wP", e5: "bP", f6: "wP" }, "d1"),
	[]);

check("pawn: two victims in one move",
	capturesFrom({ a1: "wK", h8: "bK", d1: "wP", d5: "bP", d6: "wP", e4: "bP", f4: "wP" }, "d1"),
	["Pd1-d4xd5,e4"]);

// a piece moving *between* two enemy Pawns is safe: Pawns capture only on their own move
check("pawn: no passive capture (black moves between two white pawns)",
	movesFrom({ a1: "wK", h8: "bK", c4: "wP", e4: "wP", d8: "bP" }, "d8", -1)
		.filter((m) => m == "Pd8-d4" || m.indexOf("d4x") >= 0),
	["Pd8-d4"]);

/* ------------------------------------------------------------- Withdrawer */

check("withdrawer: captures the piece it moves away from",
	capturesFrom({ a1: "wK", h8: "bK", d4: "wW", d5: "bP" }, "d4"),
	["Wd4-d1xd5", "Wd4-d2xd5", "Wd4-d3xd5"]);

check("withdrawer: no capture when moving sideways",
	capturesFrom({ a1: "wK", h8: "bK", d4: "wW", e4: "bP", d8: "bP" }, "d4")
		.filter((m) => m.indexOf("xd8") >= 0),
	[]);

check("withdrawer: diagonal withdrawal works too (a1 blocked by own King)",
	capturesFrom({ a1: "wK", h8: "bK", d4: "wW", e5: "bP" }, "d4"),
	["Wd4-b2xe5", "Wd4-c3xe5"]);

/* ------------------------------------------------------------ Coordinator */

check("coordinator: captures on both corners of the rectangle with its King",
	capturesFrom({ a1: "wK", h8: "bK", d1: "wC", a4: "bP", g1: "bP" }, "d1")
		.indexOf("Cd1-g4xa4,g1") >= 0,
	true);

// only squares the Coordinator can actually reach from h1 count
check("coordinator: one victim on the rank corner",
	capturesFrom({ a1: "wK", h8: "bK", h1: "wC", a4: "bP" }, "h1"),
	["Ch1-e4xa4", "Ch1-h4xa4"]);

/* ------------------------------------------------------------ Long Leaper */

// after a leap the Leaper keeps sliding in the same direction
check("leaper: single leap, landing anywhere behind the victim",
	capturesFrom({ a1: "wK", h8: "bK", a4: "wL", b4: "bP" }, "a4"),
	["La4-c4xb4", "La4-d4xb4", "La4-e4xb4", "La4-f4xb4", "La4-g4xb4", "La4-h4xb4"]);

check("leaper: two victims along the same line",
	capturesFrom({ a1: "wK", h8: "bK", a4: "wL", b4: "bP", d4: "bP" }, "a4"),
	["La4-c4xb4", "La4-e4xb4,d4", "La4-f4xb4,d4", "La4-g4xb4,d4", "La4-h4xb4,d4"]);

check("leaper: cannot leap two adjacent enemies",
	capturesFrom({ a1: "wK", h8: "bK", a4: "wL", b4: "bP", c4: "bP" }, "a4"),
	[]);

check("leaper: cannot leap a friendly piece",
	capturesFrom({ a1: "wK", h8: "bK", a4: "wL", b4: "wP" }, "a4"),
	[]);

check("leaper: no capture by displacement",
	movesFrom({ a1: "wK", h8: "bK", a4: "wL", b4: "bP" }, "a4").filter((m) => m == "La4-b4"),
	[]);

/* ----------------------------------------------------------- Immobilizer */

check("immobilizer: an adjacent enemy piece cannot move",
	movesFrom({ a1: "wK", h8: "bK", d4: "wI", d5: "bP" }, "d5", -1),
	[]);

check("immobilizer: a piece one square further is free",
	movesFrom({ a1: "wK", h8: "bK", d4: "wI", d6: "bP" }, "d6", -1).length > 0,
	true);

check("immobilizer: frozen by an adjacent enemy Chameleon",
	movesFrom({ a1: "wK", h8: "bK", d4: "wI", d5: "bX" }, "d4"),
	[]);

check("immobilizer: the Chameleon it touches is frozen as well",
	movesFrom({ a1: "wK", h8: "bK", d4: "wI", d5: "bX" }, "d5", -1),
	[]);

check("immobilizer: never captures",
	capturesFrom({ a1: "wK", h8: "bK", d4: "wI", d6: "bP", d7: "wP" }, "d4"),
	[]);

/* -------------------------------------------------------------- Chameleon */

check("chameleon: pinces enemy Pawns only",
	capturesFrom({ a1: "wK", h8: "bK", d1: "wX", e4: "bP", f4: "wP" }, "d1"),
	["Xd1-d4xe4"]);

check("chameleon: does not pince a non-Pawn",
	capturesFrom({ a1: "wK", h8: "bK", d1: "wX", e4: "bW", f4: "wP" }, "d1"),
	[]);

check("chameleon: withdraws from an enemy Withdrawer only",
	capturesFrom({ a1: "wK", h8: "bK", d4: "wX", d5: "bW" }, "d4"),
	["Xd4-d1xd5", "Xd4-d2xd5", "Xd4-d3xd5"]);

check("chameleon: leaps enemy Long Leapers only",
	capturesFrom({ a1: "wK", h8: "bK", a4: "wX", b4: "bL" }, "a4"),
	["Xa4-c4xb4", "Xa4-d4xb4", "Xa4-e4xb4", "Xa4-f4xb4", "Xa4-g4xb4", "Xa4-h4xb4"]);

check("chameleon: does not leap a Pawn",
	capturesFrom({ a1: "wK", h8: "bK", a4: "wX", b4: "bP" }, "a4"),
	[]);

check("chameleon: cannot capture another Chameleon",
	capturesFrom({ a1: "wK", h8: "bK", d4: "wX", d5: "bX", a5: "wP", h4: "wX" }, "d4"),
	[]);

check("chameleon: captures an adjacent King by displacement",
	capturesFrom({ a1: "wK", d5: "bK", d4: "wX" }, "d4").filter((m) => m.indexOf("xd5") >= 0),
	["Xd4-d5xd5"]);

/* ------------------------------------------------------------------- King */

check("king: captures by displacement",
	capturesFrom({ d4: "wK", h8: "bK", d5: "bP" }, "d4"),
	["Kd4-d5xd5"]);

/* --------------------------------------------------- check and game over */

{
	// the black Coordinator would capture the white King on the corner it
	// forms with the black King: white must not leave its King there
	const pieces = { d1: "wK", d8: "bK", a1: "bC", h4: "wP" };
	const board = h.setup(sb, game, pieces, 1);
	board.GenerateMoves(game);
	const kingMoves = board.mMoves.filter((m) => m.f == h.posOf("d1")).map((m) => h.moveStr(board, m));
	check("check: escaping the file the enemy King coordinates on is legal",
		kingMoves.indexOf("Ke1") >= 0 || kingMoves.indexOf("Kd1-e1") >= 0, true);
	check("check: staying on that file is not",
		kingMoves.indexOf("Kd1-d2") < 0, true);
}

{
	// side to move has no legal move at all: in Ultima it loses
	const board = h.setup(sb, game, { a1: "wK", b2: "bI", h8: "bK" }, 1);
	board.GenerateMoves(game);
	check("stalemate: no move generated", board.mMoves.length, 0);
	check("stalemate: game is over", board.mFinished, true);
	check("stalemate: the side that cannot move loses", board.mWinner, -1);
}

/* ------------------------------------------------- apply / unapply cycle */

{
	const pieces = { a1: "wK", h8: "bK", d1: "wP", d5: "bP", d6: "wP", e4: "bP", f4: "wP" };
	const board = h.setup(sb, game, pieces, 1);
	board.GenerateMoves(game);
	const move = board.mMoves.filter((m) => h.moveStr(board, m) == "Pd1-d4xd5,e4")[0];
	check("apply: the double capture move exists", move !== undefined, true);

	const before = h.census(board, game);
	const sign = board.zSign;
	const undo = board.cbQuickApply(game, move);
	check("quick apply: both victims removed",
		h.census(board, game).length, before.length - 2);
	board.cbQuickUnapply(game, undo);
	check("quick unapply: position restored", h.census(board, game), before);
	check("quick unapply: signature restored", board.zSign, sign);

	board.ApplyMove(game, move);
	check("apply move: victims gone", h.census(board, game).sort(),
		["bK@h8", "wK@a1", "wP@d4", "wP@d6", "wP@f4"]);
	check("apply move: signature changed", board.zSign != sign, true);
}

console.log((failed ? "FAILED" : "OK") + " - " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
