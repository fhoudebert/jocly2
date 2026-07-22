/*
 * Cannon-Pawn promotion and immobilized-piece suicide - pure Node:
 *   node tests/rococo/promote.test.js
 *
 * A Cannon Pawn making a move by itself onto the opposing King's start rank
 * (or the edge rank past it) may promote to any friendly piece type currently
 * off the board. An immobilized piece other than a King may remove itself.
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

const moves = (pieces, sq, who) => h.movesFrom(h.setup(sb, game, pieces, who), game, sq);

/* --------------------------------------------------------- promotion */

// a white pawn stepping onto g8 (the black King's start rank) with an empty
// reserve can only stay a pawn - promotion needs a captured piece to copy
check("promotion: no options when the reserve is empty",
	moves({ a1: "wK", h5: "bK", g7: "wP" }, "g7")
		.filter((m) => m.indexOf("g8") >= 0).sort(),
	["Pg7-g8"]);

// give the side a reserve by putting captured pieces off-board via a crafted
// position: two white pieces already off the board are simulated by removing
// them from the initial set (they simply are not placed, so they count as
// captured). We build the board directly for control.
{
	const b = h.setup(sb, game, { a1: "wK", h5: "bK", g7: "wP" }, 1);
	// simulate a reserve: append two off-board white pieces (Withdrawer, Leaper)
	for(const t of ["W", "L", "L"]) {
		const type = { P: 0, A: 1, L: 2, S: 3, W: 4, C: 5, I: 6, K: 7 }[t];
		b.pieces.push({ s: 1, t: type, p: -1, m: true });
	}
	b.GenerateMoves(game);
	const g8 = b.mMoves.filter((m) => m.f === h.posOf("g7") && h.nameOf(m.t) === "g8")
		.map((m) => h.moveStr(b, m)).sort();
	check("promotion: one variant per distinct reserve type, plus the plain move",
		g8, ["Pg7-g8", "Pg7-g8=L", "Pg7-g8=W"]);
}

check("promotion: no promotion before the far rank",
	moves({ a1: "wK", h5: "bK", g6: "wP" }, "g6").filter((m) => m.indexOf("=") >= 0),
	[]);

{
	// applying a promotion changes the pawn's type
	const b = h.setup(sb, game, { a1: "wK", h5: "bK", g7: "wP" }, 1);
	b.pieces.push({ s: 1, t: 4, p: -1, m: true });		// a captured white Withdrawer
	b.GenerateMoves(game);
	const promo = b.mMoves.filter((m) => h.moveStr(b, m) === "Pg7-g8=W")[0];
	check("promotion apply: exists", promo !== undefined, true);
	const sign = b.zSign;
	const undo = b.cbQuickApply(game, promo);
	check("promotion apply: pawn became a Withdrawer on g8",
		game.cbVar.pieceTypes[b.pieces[b.board[h.posOf("g8")]].t].fenAbbrev, "W");
	b.cbQuickUnapply(game, undo);
	check("promotion unapply: back to a Pawn on g7",
		game.cbVar.pieceTypes[b.pieces[b.board[h.posOf("g7")]].t].fenAbbrev, "P");
	check("promotion unapply: signature restored", b.zSign, sign);
}

check("promotion: black promotes on its far rank (row 1)",
	(() => {
		const b = h.setup(sb, game, { a8: "bK", h5: "wK", g2: "bP" }, -1);
		b.pieces.push({ s: -1, t: 2, p: -1, m: true });	// captured black Leaper
		b.GenerateMoves(game);
		return b.mMoves.filter((m) => m.f === h.posOf("g2") && h.nameOf(m.t) === "g1")
			.map((m) => h.moveStr(b, m)).sort();
	})(),
	["Pg2-g1", "Pg2-g1=L"]);

/* ----------------------------------------------------------- suicide */

check("suicide: an immobilized piece may remove itself",
	moves({ a1: "wK", h8: "bK", d4: "wL", d5: "bI" }, "d4"),
	["Ld4(suicide)"]);

check("suicide: a non-immobilized piece may not",
	moves({ a1: "wK", h8: "bK", d4: "wL" }, "d4").filter((m) => m.indexOf("suicide") >= 0),
	[]);

check("suicide: an immobilized King may not remove itself",
	moves({ d4: "wK", h8: "bK", d5: "bI" }, "d4").filter((m) => m.indexOf("suicide") >= 0),
	[]);

{
	// applying a suicide removes the piece; unapply restores it
	const b = h.setup(sb, game, { a1: "wK", h8: "bK", d4: "wL", d5: "bI" }, 1);
	b.GenerateMoves(game);
	const sui = b.mMoves.filter((m) => h.moveStr(b, m) === "Ld4(suicide)")[0];
	check("suicide apply: exists", sui !== undefined, true);
	const before = h.census(b, game), sign = b.zSign;
	const undo = b.cbQuickApply(game, sui);
	check("suicide apply: piece gone", h.census(b, game).length, before.length - 1);
	b.cbQuickUnapply(game, undo);
	check("suicide unapply: restored", h.census(b, game), before);
	check("suicide unapply: signature restored", b.zSign, sign);

	b.ApplyMove(game, sui);
	check("suicide ApplyMove: the Long Leaper is gone",
		h.census(b, game).indexOf("wL@d4") < 0, true);
}

console.log((failed ? "FAILED" : "OK") + " - " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
