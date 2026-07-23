/*
 * Swapper tests - pure Node:
 *   node tests/rococo/swapper.test.js
 *
 * The Swapper slides like a Queen without capturing, swaps places with the
 * nearest piece of either side along any Queen line, and may destroy itself
 * together with an adjacent enemy. A swap counts as a capture for the edge
 * rule. Moves are read as "Sf<>t" (swap) and "Sf!!t" (mutual destruction).
 */

const h = require("./harness.js");

let passed = 0, failed = 0;
function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if(a === e) passed++;
	else { failed++; console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a); }
}

const sb = h.loadModel(["base-model.js", "grid-geo-model.js", "ultima/rococo-model.js"]);
const game = h.newGame(sb);

const from = (pieces, sq, who) => h.movesFrom(h.setup(sb, game, pieces, who), game, sq);

/* --------------------------------------------------------- swapping */

check("swap: exchanges with the nearest enemy along a line",
	from({ a1: "wK", h8: "bK", d4: "wS", d7: "bW" }, "d4").filter((m) => m.indexOf("<>") >= 0 && m.indexOf("d7") >= 0),
	["Sd4<>d7"]);

check("swap: works with a friendly piece too",
	from({ a1: "wK", h8: "bK", d4: "wS", g4: "wL" }, "d4").filter((m) => m.indexOf("<>g4") >= 0),
	["Sd4<>g4"]);

check("swap: only the nearest piece in a direction, not the one behind it",
	from({ a1: "wK", h8: "bK", d4: "wS", f4: "bW", g4: "bL" }, "d4").filter((m) => m.indexOf("<>") >= 0 && /[fg]4/.test(m)),
	["Sd4<>f4"]);

check("swap: may swap along a diagonal",
	from({ a1: "wK", h8: "bK", d4: "wS", f6: "bL" }, "d4").filter((m) => m.indexOf("<>f6") >= 0),
	["Sd4<>f6"]);

{
	// applying a swap exchanges the two pieces and removes neither
	const b = h.setup(sb, game, { a1: "wK", h8: "bK", d4: "wS", d7: "bW" }, 1);
	b.GenerateMoves(game);
	const swap = b.mMoves.filter((m) => h.moveStr(b, m) === "Sd4<>d7")[0];
	check("swap apply: the move exists", swap !== undefined, true);
	const before = h.census(b, game), sign = b.zSign;
	const undo = b.cbQuickApply(game, swap);
	check("swap apply: both pieces still on the board", h.census(b, game).length, before.length);
	check("swap apply: Swapper now on d7, Withdrawer on d4",
		[h.nameOf(b.pieces[b.board[h.posOf("d7")]].p), game.cbVar.pieceTypes[b.pieces[b.board[h.posOf("d4")]].t].fenAbbrev],
		["d7", "W"]);
	b.cbQuickUnapply(game, undo);
	check("swap unapply: position restored", h.census(b, game), before);
	check("swap unapply: signature restored", b.zSign, sign);
}

{
	// a real ApplyMove of a swap keeps material and toggles the signature
	const b = h.setup(sb, game, { a1: "wK", h8: "bK", d4: "wS", d7: "bW" }, 1);
	b.GenerateMoves(game);
	const swap = b.mMoves.filter((m) => h.moveStr(b, m) === "Sd4<>d7")[0];
	const before = h.census(b, game);
	b.ApplyMove(game, swap);
	check("swap ApplyMove: no capture, pieces exchanged",
		h.census(b, game).sort(), before.map((s) => s).sort().map((s) =>
			s === "wS@d4" ? "wS@d7" : s === "bW@d7" ? "bW@d4" : s).sort());
}

/* --------------------------------------------- swap with a King */

{
	const b = h.setup(sb, game, { a1: "wK", d8: "bK", d4: "wS", d6: "bK" }, 1);
	// two black kings is illegal in a real game, but this checks kings[] upkeep
	b.GenerateMoves(game);
	const swap = b.mMoves.filter((m) => m.swap != null && m.t === h.posOf("d6"))[0];
	if(swap) {
		const undo = b.cbQuickApply(game, swap);
		check("swap with a King updates kings[]", b.kings[-1], h.posOf("d4"));
		b.cbQuickUnapply(game, undo);
		check("swap unapply restores kings[]", b.kings[-1], h.posOf("d8"));
	} else check("swap with a King generated", false, true);
}

/* --------------------------------------------- mutual destruction */

check("mutual: offered against an adjacent enemy",
	from({ a1: "wK", h8: "bK", d4: "wS", d5: "bW" }, "d4").filter((m) => m.indexOf("!!") >= 0),
	["Sd4!!d5"]);

check("mutual: not offered against a non-adjacent enemy",
	from({ a1: "wK", h8: "bK", d4: "wS", d6: "bW" }, "d4").filter((m) => m.indexOf("!!") >= 0),
	[]);

{
	// mutual destruction removes both the Swapper and the enemy
	const b = h.setup(sb, game, { a1: "wK", h8: "bK", d4: "wS", d5: "bW" }, 1);
	b.GenerateMoves(game);
	const mut = b.mMoves.filter((m) => h.moveStr(b, m) === "Sd4!!d5")[0];
	check("mutual apply: the move exists", mut !== undefined, true);
	const before = h.census(b, game), sign = b.zSign;
	const undo = b.cbQuickApply(game, mut);
	check("mutual apply: both removed", h.census(b, game).length, before.length - 2);
	b.cbQuickUnapply(game, undo);
	check("mutual unapply: restored", h.census(b, game), before);
	check("mutual unapply: signature restored", b.zSign, sign);

	b.ApplyMove(game, mut);
	check("mutual ApplyMove: swapper and enemy gone",
		h.census(b, game).sort(), ["bK@h8", "wK@a1"]);
	// regression: both pieces are gone, so lastMove.c must be cleared or the
	// base Evaluate dereferences the now-empty destination square
	check("mutual ApplyMove: lastMove.c cleared (Evaluate safety)", b.lastMove.c, null);
}

/* ------------------------------------ swap counts as capture on the ring */

{
	// a Swapper on b4 swapping with a piece on the ring edge is allowed,
	// because a swap counts as a capture for the edge rule
	const named = { a1: "wK", h8: "bK", b4: "wS" };
	const b = h.setup(sb, game, named, 1);
	// place an enemy on the ring at (4,0)
	const idx = b.pieces.length;
	b.pieces.push({ s: -1, t: 4, p: h.posRC(4, 0), m: true });	// a Withdrawer on the ring
	b.board[h.posRC(4, 0)] = idx;
	b.GenerateMoves(game);
	const ringSwap = b.mMoves.filter((m) => m.f === h.posOf("b4") && m.swap != null).map((m) => h.moveStr(b, m));
	check("swap: may swap with a piece on the ring", ringSwap, ["Sb4<>@0,4"]);
}

/* --------------------------------------- immobilized Swapper is frozen */

check("frozen: a Swapper next to an enemy Immobilizer can only suicide",
	from({ a1: "wK", h8: "bK", d4: "wS", d5: "bI" }, "d4"),
	["Sd4(suicide)"]);

/* ------------------------------------------ no immediate swap-back */

{
	// after two Swappers trade places, neither may swap straight back
	const b = h.setup(sb, game, { a1: "wK", h8: "bK", d4: "wS", d7: "bS" }, 1);
	b.GenerateMoves(game);
	const swap = b.mMoves.filter((m) => h.moveStr(b, m) === "Sd4<>d7")[0];
	check("swap-back: the first swap exists", swap !== undefined, true);
	b.ApplyMove(game, swap);
	b.mWho = -1;
	b.GenerateMoves(game);
	const backs = b.mMoves.filter((m) => m.f === h.posOf("d4") && m.swap != null)
		.map((m) => h.moveStr(b, m));
	check("swap-back: the reverse swap is not offered next turn",
		backs.filter((m) => m.indexOf("d7") >= 0), []);
	check("swap-back: other swaps stay available", backs.length > 0, true);

	// any other move clears the ban
	const other = b.mMoves.filter((m) => m.f === h.posOf("h8"))[0];
	b.ApplyMove(game, other);
	b.mWho = 1;
	b.GenerateMoves(game);
	check("swap-back: allowed again once another move has been played",
		b.mMoves.filter((m) => m.f === h.posOf("d7") && m.swap != null)
			.map((m) => h.moveStr(b, m)).filter((m) => m.indexOf("d4") >= 0),
		["Sd7<>d4"]);
}

{
	// the ban only covers Swapper/Chameleon pairs: swapping with anything else
	// may be undone immediately
	const b = h.setup(sb, game, { a1: "wK", h8: "bK", d4: "wS", d7: "bL" }, 1);
	b.GenerateMoves(game);
	const swap = b.mMoves.filter((m) => h.moveStr(b, m) === "Sd4<>d7")[0];
	b.ApplyMove(game, swap);
	b.mWho = 1;								// same side plays again, for the test
	b.GenerateMoves(game);
	check("swap-back: no ban after swapping with an ordinary piece",
		b.mMoves.filter((m) => m.f === h.posOf("d7") && m.swap != null)
			.map((m) => h.moveStr(b, m)).filter((m) => m.indexOf("d4") >= 0),
		["Sd7<>d4"]);
}

{
	// the pending ban must survive a board copy (the search clones boards)
	const b = h.setup(sb, game, { a1: "wK", h8: "bK", d4: "wS", d7: "bS" }, 1);
	b.GenerateMoves(game);
	b.ApplyMove(game, b.mMoves.filter((m) => h.moveStr(b, m) === "Sd4<>d7")[0]);
	const clone = h.newBoard(sb, game);
	clone.CopyFrom(b);
	clone.mWho = -1;
	clone.GenerateMoves(game);
	check("swap-back: the ban is carried across CopyFrom",
		clone.mMoves.filter((m) => m.f === h.posOf("d4") && m.swap != null)
			.map((m) => h.moveStr(clone, m)).filter((m) => m.indexOf("d7") >= 0),
		[]);
}

console.log((failed ? "FAILED" : "OK") + " - " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
