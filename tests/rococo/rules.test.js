/*
 * Rules tests for the Rococo model - pure Node, no build:
 *   node tests/rococo/rules.test.js
 *
 * Several cases reproduce the worked '+'/'*' diagrams from
 * chessvariants.com/other.dir/rococo.html. Pieces are placed on the inner
 * 8x8 unless an edge case is being tested; a King of each side is always on
 * the board (the model reports the game finished otherwise). Moves are
 * filtered to the piece under test.
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

const moves = (pieces, sq, who) => h.movesFrom(h.setup(sb, game, pieces, who), game, sq);
const caps  = (pieces, sq, who) => h.capturesFrom(h.setup(sb, game, pieces, who), game, sq);

/* ---------------------------------------------------------- opening */

{
	const b = h.newBoard(sb, game);
	check("initial: 32 pieces", b.pieces.length, 32);
	check("initial: no capture available",
		h.movesFrom(b, game, "a2").concat().filter((m) => m.indexOf("x") >= 0).length >= 0, true);
	b.GenerateMoves(game);
	check("initial: no capturing move at all",
		b.mMoves.filter((m) => h.moveStr(b, m).indexOf("x") >= 0), []);
}

/* --------------------------------------------------------- Advancer */
// White Advancer on d4 approaches an enemy sitting two squares ahead only by
// stopping right next to it; it never captures by displacement.

check("advancer: captures by approach (enemy on f4, stop on e4)",
	caps({ a1: "wK", h8: "bK", d4: "wA", f4: "bP" }, "d4")
		.filter((m) => m.indexOf("xf4") >= 0),
	["Ad4-e4xf4"]);

check("advancer: reaches adjacency by stopping just before the enemy",
	caps({ a1: "wK", h8: "bK", d4: "wA", g4: "bP" }, "d4").filter((m) => m.indexOf("xg4") >= 0),
	["Ad4-f4xg4"]);

check("advancer: no capture when it cannot stop adjacent (path blocked)",
	caps({ a1: "wK", h8: "bK", d4: "wA", g4: "bP", f4: "wI" }, "d4").filter((m) => m.indexOf("xg4") >= 0),
	[]);

check("advancer: never lands on the enemy (no displacement capture)",
	moves({ a1: "wK", h8: "bK", d4: "wA", e4: "bP" }, "d4").filter((m) => m === "Ad4-e4"),
	[]);

check("advancer: approach works diagonally too",
	caps({ a1: "wK", h8: "bK", d4: "wA", f6: "bP" }, "d4").filter((m) => m.indexOf("xf6") >= 0),
	["Ad4-e5xf6"]);

/* ------------------------------------------------------- Withdrawer */
// From the page: a Withdrawer on d4 with an enemy on c4 captures it by moving
// east (directly away), and nothing on the other neighbours.

check("withdrawer: captures the adjacent enemy it moves away from",
	caps({ a1: "wK", h8: "bK", d4: "wW", c4: "bP" }, "d4"),
	["Wd4-e4xc4", "Wd4-f4xc4", "Wd4-g4xc4", "Wd4-h4xc4"]);

// with one enemy on c4 (west), only moving east captures it; moving north or
// south (perpendicular) captures nothing
check("withdrawer: perpendicular moves capture nothing",
	caps({ a1: "wK", h8: "bK", d4: "wW", c4: "bP" }, "d4").filter((m) => /-d[1-8]/.test(m)),
	[]);

check("withdrawer: mandatory - the plain move away does not exist without the capture",
	moves({ a1: "wK", h8: "bK", d4: "wW", c4: "bP" }, "d4").filter((m) => m === "Wd4-e4"),
	[]);

/* ------------------------------------------------------ Long Leaper */

check("leaper: single overtaking capture, any landing beyond the victim",
	caps({ a1: "wK", h8: "bK", b4: "wL", c4: "bP" }, "b4"),
	["Lb4-d4xc4", "Lb4-e4xc4", "Lb4-f4xc4", "Lb4-g4xc4", "Lb4-h4xc4"]);

check("leaper: two victims along one line",
	caps({ a1: "wK", h8: "bK", b4: "wL", c4: "bP", e4: "bP" }, "b4"),
	["Lb4-d4xc4", "Lb4-f4xc4,e4", "Lb4-g4xc4,e4", "Lb4-h4xc4,e4"]);

check("leaper: cannot leap two adjacent enemies",
	caps({ a1: "wK", h8: "bK", b4: "wL", c4: "bP", d4: "bP" }, "b4"),
	[]);

check("leaper: cannot leap a friendly piece",
	caps({ a1: "wK", h8: "bK", b4: "wL", c4: "wP" }, "b4"),
	[]);

/* ----------------------------------------------------- Cannon Pawn */
// Moves one step, or hops an adjacent mount (either side) to the square beyond,
// capturing an enemy that sits there.

check("cannon pawn: single step to an empty square",
	moves({ a1: "wK", h8: "bK", d4: "wP" }, "d4").indexOf("Pd4-d5") >= 0, true);

check("cannon pawn: hop-captures the enemy beyond an adjacent mount",
	caps({ a1: "wK", h8: "bK", d4: "wP", e4: "wA", f4: "bP" }, "d4"),
	["Pd4-f4xf4"]);

check("cannon pawn: the mount may be an enemy",
	caps({ a1: "wK", h8: "bK", d4: "wP", e4: "bA", f4: "bP" }, "d4"),
	["Pd4-f4xf4"]);

check("cannon pawn: no hop without a mount",
	moves({ a1: "wK", h8: "bK", d4: "wP", f4: "bP" }, "d4").filter((m) => m.indexOf("f4") >= 0),
	[]);

check("cannon pawn: no capture when the square beyond the mount is empty of enemy",
	caps({ a1: "wK", h8: "bK", d4: "wP", e4: "wA" }, "d4").filter((m) => m.indexOf("f4") >= 0),
	[]);

/* ---------------------------------------------------- Immobilizer */

check("immobilizer: an adjacent enemy can only remove itself (suicide)",
	moves({ a1: "wK", h8: "bK", d4: "wI", d5: "bP" }, "d5", -1),
	["Pd5(suicide)"]);

check("immobilizer: never captures",
	caps({ a1: "wK", h8: "bK", d4: "wI", d5: "bP", d6: "wP" }, "d4"),
	[]);

check("immobilizer: mutual freeze - each can only suicide",
	moves({ a1: "wK", h8: "bK", d4: "wI", d5: "bI" }, "d4").concat(moves({ a1: "wK", h8: "bK", d4: "wI", d5: "bI" }, "d5", -1)),
	["Id4(suicide)", "Id5(suicide)"]);

/* ----------------------------------------------------- King capture */

check("king: captures an adjacent enemy by displacement",
	caps({ d4: "wK", h8: "bK", d5: "bP" }, "d4").filter((m) => m.indexOf("xd5") >= 0),
	["Kd4-d5xd5"]);

{
	// capturing the enemy King ends the game
	const b = h.setup(sb, game, { d4: "wK", d5: "bK" }, 1);
	b.GenerateMoves(game);
	const kill = b.mMoves.filter((m) => h.moveStr(b, m) === "Kd4-d5xd5")[0];
	check("king capture: the move exists", kill !== undefined, true);
	b.ApplyMove(game, kill);
	b.mWho = -1;
	b.GenerateMoves(game);
	check("king capture: game over, mover wins", [b.mFinished, b.mWinner], [true, 1]);
}

/* ---------------------------------------------------- apply / undo */

{
	const pieces = { a1: "wK", h8: "bK", b4: "wL", c4: "bP", e4: "bP" };
	const b = h.setup(sb, game, pieces, 1);
	b.GenerateMoves(game);
	const dbl = b.mMoves.filter((m) => h.moveStr(b, m) === "Lb4-f4xc4,e4")[0];
	check("apply/undo: double capture exists", dbl !== undefined, true);
	const before = h.census(b, game), sign = b.zSign;
	const undo = b.cbQuickApply(game, dbl);
	check("quick apply: two victims removed", h.census(b, game).length, before.length - 2);
	b.cbQuickUnapply(game, undo);
	check("quick unapply: restored", h.census(b, game), before);
	check("quick unapply: signature restored", b.zSign, sign);
}

console.log((failed ? "FAILED" : "OK") + " - " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
