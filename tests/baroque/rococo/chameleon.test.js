/*
 * Chameleon tests - pure Node:
 *   node tests/rococo/chameleon.test.js
 *
 * The Chameleon captures each enemy by that enemy's own method, combinable in
 * one move. Cases below cover each mimicked power on its own, the freeze/no-
 * capture relation with the Immobilizer, the "cannot take a Chameleon" rule,
 * and the combination example from the source page.
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

const caps = (pieces, sq, who) => h.capturesFrom(h.setup(sb, game, pieces, who), game, sq);
const moves = (pieces, sq, who) => h.movesFrom(h.setup(sb, game, pieces, who), game, sq);

/* -------------------------------------------------- one power at a time */

check("mimics the Advancer: captures an enemy Advancer by approach",
	caps({ a1: "wK", h8: "bK", d4: "wC", f4: "bA" }, "d4").filter((m) => m.indexOf("xf4") >= 0),
	["Cd4-e4xf4"]);

check("does not approach a non-Advancer",
	caps({ a1: "wK", h8: "bK", d4: "wC", f4: "bW" }, "d4").filter((m) => m.indexOf("xf4") >= 0),
	[]);

check("mimics the Withdrawer: withdraws from an enemy Withdrawer",
	caps({ a1: "wK", h8: "bK", d4: "wC", c4: "bW" }, "d4"),
	["Cd4-e4xc4", "Cd4-f4xc4", "Cd4-g4xc4", "Cd4-h4xc4"]);

check("does not withdraw from a non-Withdrawer",
	caps({ a1: "wK", h8: "bK", d4: "wC", c4: "bA" }, "d4").filter((m) => m.indexOf("xc4") >= 0),
	[]);

check("mimics the Long Leaper: leaps an enemy Long Leaper",
	caps({ a1: "wK", h8: "bK", b4: "wC", c4: "bL" }, "b4"),
	["Cb4-d4xc4", "Cb4-e4xc4", "Cb4-f4xc4", "Cb4-g4xc4", "Cb4-h4xc4"]);

check("does not leap a non-Long-Leaper",
	caps({ a1: "wK", h8: "bK", b4: "wC", c4: "bA" }, "b4").filter((m) => m.indexOf("xc4") >= 0),
	[]);

check("mimics the Cannon Pawn: hops a mount onto an enemy Cannon Pawn",
	caps({ a1: "wK", h8: "bK", d4: "wC", e4: "wL", f4: "bP" }, "d4"),
	["Cd4-f4xf4"]);

check("cannon-hop only captures a Cannon Pawn beyond the mount",
	caps({ a1: "wK", h8: "bK", d4: "wC", e4: "wL", f4: "bA" }, "d4").filter((m) => m.indexOf("f4") >= 0),
	[]);

check("mimics the King: takes an adjacent enemy King",
	caps({ a1: "wK", d5: "bK", d4: "wC" }, "d4").filter((m) => m.indexOf("xd5") >= 0),
	["Cd4-d5xd5"]);

/* --------------------------------------------------------- the Swapper */

check("mimics the Swapper: swaps with an enemy Swapper",
	moves({ a1: "wK", h8: "bK", d4: "wC", d7: "bS" }, "d4").filter((m) => m.indexOf("<>") >= 0),
	["Cd4<>d7"]);

check("does not swap with a non-Swapper",
	moves({ a1: "wK", h8: "bK", d4: "wC", d7: "bW" }, "d4").filter((m) => m.indexOf("<>") >= 0),
	[]);

check("mutual destruction with an adjacent enemy Swapper",
	moves({ a1: "wK", h8: "bK", d4: "wC", d5: "bS" }, "d4").filter((m) => m.indexOf("!!") >= 0),
	["Cd4!!d5"]);

/* ----------------------------------------------- Immobilizer relation */

check("freezes an adjacent enemy Immobilizer but cannot capture it",
	caps({ a1: "wK", h8: "bK", d4: "wC", d5: "bI" }, "d4"),
	[]);

check("is itself frozen next to an enemy Immobilizer (may only suicide)",
	moves({ a1: "wK", h8: "bK", d4: "wC", d5: "bI" }, "d4"),
	["Cd4(suicide)"]);

check("the enemy Immobilizer it touches is frozen too (may only suicide)",
	moves({ a1: "wK", h8: "bK", d4: "wC", d5: "bI" }, "d5", -1),
	["Id5(suicide)"]);

/* --------------------------------------------- cannot capture a Chameleon */

check("cannot capture another Chameleon by any method",
	caps({ a1: "wK", h8: "bK", d4: "wC", d5: "bC", c4: "bC" }, "d4").filter((m) => /x[cd]/.test(m)),
	[]);

/* ------------------------------------- combination in a single move (page) */

check("combines leap + withdrawal + approach in one move",
	caps({ h1: "wK", h8: "bK", a2: "bC", a1: "wW", a3: "wL", a5: "wA" }, "a2", -1)
		.filter((m) => m.indexOf("a4") >= 0),
	["Ca2-a4xa1,a3,a5"]);

/* ---------------------------------------------------- apply / undo cycle */

{
	const pieces = { h1: "wK", h8: "bK", a2: "bC", a1: "wW", a3: "wL", a5: "wA" };
	const b = h.setup(sb, game, pieces, -1);
	b.GenerateMoves(game);
	const combo = b.mMoves.filter((m) => h.moveStr(b, m) === "Ca2-a4xa1,a3,a5")[0];
	check("combo move exists", combo !== undefined, true);
	const before = h.census(b, game), sign = b.zSign;
	const undo = b.cbQuickApply(game, combo);
	check("combo apply: three victims removed", h.census(b, game).length, before.length - 3);
	b.cbQuickUnapply(game, undo);
	check("combo unapply: restored", h.census(b, game), before);
	check("combo unapply: signature restored", b.zSign, sign);
}

/* ------------------------------- swaps combined with the other captures */

{
	// swapping with a Swapper, while withdrawing from a Withdrawer left behind
	// and approaching an Advancer beyond the landing square
	const b = h.setup(sb, game, { a1: "wK", h8: "bK", d4: "wC", d6: "bS", d3: "bW", d7: "bA" }, 1);
	b.GenerateMoves(game);
	const combo = b.mMoves.filter((m) => m.f === h.posOf("d4") && m.swap != null)[0];
	check("swap combo: the move exists", combo !== undefined, true);
	check("swap combo: it takes both the Withdrawer and the Advancer",
		(combo.kills || []).map((k) => h.nameOf(b.pieces[k].p)).sort(), ["d3", "d7"]);

	const before = h.census(b, game), sign = b.zSign;
	const undo = b.cbQuickApply(game, combo);
	check("swap combo: two pieces removed, the swap still exchanges the other two",
		h.census(b, game).sort(), ["bS@d4", "bK@h8", "wC@d6", "wK@a1"].sort());
	b.cbQuickUnapply(game, undo);
	check("swap combo: undo restores the position", h.census(b, game), before);
	check("swap combo: undo restores the signature", b.zSign, sign);

	b.ApplyMove(game, combo);
	check("swap combo: ApplyMove agrees with the quick apply",
		h.census(b, game).sort(), ["bS@d4", "bK@h8", "wC@d6", "wK@a1"].sort());
}

check("swap combo: a plain swap with nothing else around captures nobody",
	(() => {
		const b = h.setup(sb, game, { a1: "wK", h8: "bK", d4: "wC", d6: "bS" }, 1);
		b.GenerateMoves(game);
		const m = b.mMoves.filter((x) => x.f === h.posOf("d4") && x.swap != null)[0];
		return m && m.kills === undefined;
	})(), true);

console.log((failed ? "FAILED" : "OK") + " - " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
