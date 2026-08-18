/*
 * The Ghost - pure Node:
 *   node tests/baroque/ghost.test.js
 *
 * baroque-core.js defines a Ghost for any variant that asks for one (V.ghost).
 * No game in the repository fields one: Rocaille tried and dropped them, for
 * the reasons recorded in ultima/rocaille-model.js. The type is kept as a
 * brick for a later variant, so its rules are pinned here rather than in a
 * game's own suite - this file defines a variant of its own, the way a new
 * game would, and checks the piece against it.
 *
 * A Ghost moves as a Queen, blocks the square it stands on, and never
 * captures. It can be taken like anything else, with one exception, and on an
 * edge ring it is a one-way piece. Both follow from rules it does not have
 * rather than rules it does, which is what makes them worth pinning.
 */

const h = require("./rococo/harness.js");

const W = 12;

let passed = 0, failed = 0;
function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if(a === e) passed++;
	else { failed++; console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a); }
}

// the core alone, then a variant defined here - no game model file involved
const sb = h.loadModel(["base-model.js", "grid-geo-model.js", "ultima/baroque-core.js"]);
const T = sb.Model.Game.baroqueTypes;

sb.Model.Game.baroqueDefineVariant({
	width: W,
	height: 10,
	back: [T.SWAPPER, T.LEAPER, T.ADVANCER, T.GHOST, T.KING,
		T.GHOST, T.CHAMELEON, T.ADVANCER, T.LEAPER, T.IMMOBILIZER],
	front: [T.PAWN, T.PAWN, T.PAWN, T.PAWN, T.PAWN,
		T.PAWN, T.PAWN, T.PAWN, T.PAWN, T.PAWN],
	extra: [{ row: 0, col: 4, t: T.GHOST }],	// one on the ring, to test that
	file0: 1,
	backRow: 1,
	pawnRow: 2,
	aspect: "rocaille",
	leaperName: "long-leaper",
	leapMax: Infinity,
	edgeRing: true,
	promoRow: 8,
	protectKing: true,
	bindingCheck: true,
	ghost: true,
});

const game = h.newGame(sb);
game.mPlayedMoves = [];

const at = (square) => h.bpos(square, W);
const nm = (pos) => h.bname(pos, W);
const pos = (pieces, who) => h.setup(sb, game, pieces, who === undefined ? 1 : who, at);
const movesOf = (board, square) => h.movesFrom(board, game, at(square), nm);
const capturesOf = (board, square) => movesOf(board, square).filter((m) => m.indexOf("x") >= 0);

const KINGS = { b2: "wK", k9: "bK" };
const with_ = (extra) => Object.assign({}, KINGS, extra);

/* ------------------------------------------------- it is defined on request */

{
	const types = game.cbVar.pieceTypes;
	const ghost = Object.keys(types).filter((t) => types[t].name === "ghost");
	check("a variant that asks for a Ghost gets one", ghost.length, 1);
	check("and it is the ninth type, after the eight the family always has",
		Object.keys(types).length, 9);
}

/* ------------------------------------------------------------ how it moves */

{
	// a Queen's eight lines, minus the ring squares it may not enter
	const board = pos(with_({ e5: "wG" }));
	check("it moves as a Queen, within the field", movesOf(board, "e5").length, 28);

	check("it never captures, whatever it is next to",
		capturesOf(pos(with_({ e5: "wG", f5: "bW", e6: "bA", d4: "bL" })), "e5"), []);

	check("so an occupied square simply stops it",
		movesOf(pos(with_({ e5: "wG", g5: "bW" })), "e5").filter((m) => /-[fgh]5$/.test(m)),
		["Ge5-f5"]);
}

/* ------------------------------------------------------- how it is taken */

{
	check("a Leaper takes it like anything else",
		capturesOf(pos(with_({ e5: "bG", c5: "wL" })), "c5")[0], "Lc5-f5xe5");

	check("an Advancer takes it by approaching",
		capturesOf(pos(with_({ e5: "bG", c5: "wA" })), "c5"), ["Ac5-d5xe5"]);

	check("a Withdrawer takes it by moving away",
		capturesOf(pos(with_({ e5: "bG", f5: "wW" })), "f5").length > 0, true);

	// the Chameleon captures by copying its victim's method, and a Ghost has
	// none to copy - the one piece in the game it cannot touch
	check("but a Chameleon cannot: there is no method to copy",
		capturesOf(pos(with_({ e5: "bG", d5: "wC" })), "d5"), []);

	check("a Swapper still trades places with it",
		movesOf(pos(with_({ c5: "wS", g5: "bG" })), "c5").filter((m) => m.indexOf("<>") >= 0),
		["Sc5<>g5"]);
}

/* -------------------------------------------------- frozen, and on the ring */

{
	check("frozen by an Immobilizer, it may still take itself off the board",
		movesOf(pos(with_({ e5: "wG", f5: "bI" })), "e5"), ["Ge5(suicide)"]);

	// entering an edge ring is only allowed for a capture, and a Ghost has no
	// capture: it may leave the ring, never return, never travel along it
	const ring = pos({ b2: "wK", k9: "bK", e1: "wG" });
	const moves = movesOf(ring, "e1");
	check("from the ring it steps off into the field", moves.length > 0, true);
	check("but never along the ring, nor back onto it",
		moves.filter((m) => /-(a\d|l\d|\w1$|\w10$)/.test(m)), []);

	// which is why one placed behind a full back rank cannot move at all
	const board = h.newBoard(sb, game);
	check("walled in behind a full rank, it is a wall and nothing else",
		h.movesFrom(board, game, at("e1"), nm), []);
}

console.log((failed ? "FAILED - " : "OK - ") + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
