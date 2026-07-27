/*
 * Cannon-Pawn promotion and immobilized-piece suicide - pure Node:
 *   node tests/rococo/promote.test.js
 *
 * A Cannon Pawn making a move by itself onto the opposing King's start rank
 * (or the edge rank past it) may promote to one of its own pieces that has
 * been captured and is still off the board. Promotion consumes that captured
 * piece, so a type is on offer only while the side has fewer of it on the
 * board than it started with. An immobilized piece other than a King may
 * remove itself.
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

// the "stay a Cannon Pawn" option carries pr = PAWN so the view has an icon to
// offer for declining; real promotions are the others
const STAY = 0;
const realPromotions = (board) => board.mMoves.filter((m) => m.pr != null && m.pr !== STAY);

// White's full complement of back-rank pieces, parked out of the way, plus
// both Kings. Dropping an entry is what "having that piece captured" means.
const FULL = {
	a1: "wK", h5: "bK",
	a3: "wA", a4: "wL", a5: "wL", a6: "wS", b1: "wW", b3: "wC", b4: "wI",
};
function without() {
	const out = Object.assign({}, FULL);
	for(const sq of arguments)
		delete out[sq];
	return out;
}
const toRank8 = (list) => list.filter((m) => m.indexOf("g8") >= 0).sort();

/* --------------------------------------------------------- promotion */

check("promotion: nothing on offer while the side is at full strength",
	toRank8(moves(Object.assign({ g7: "wP" }, FULL), "g7")),
	["Pg7-g8"]);

check("promotion: one variant per captured type still missing, plus staying a Pawn",
	toRank8(moves(Object.assign({ g7: "wP" }, without("b1", "a5")), "g7")),
	["Pg7-g8=L", "Pg7-g8=P", "Pg7-g8=W"]);

check("promotion: never to a King",
	toRank8(moves(Object.assign({ g7: "wP" }, without("b1")), "g7")).filter((m) => /=K$/.test(m)),
	[]);

check("promotion: no promotion before the far rank",
	moves(Object.assign({ g6: "wP" }, without("b1")), "g6").filter((m) => m.indexOf("=") >= 0),
	[]);

check("promotion: black promotes on its own far rank (rank 1)",
	moves({ a8: "bK", h5: "wK", g2: "bP", a6: "bA", a5: "bL", a4: "bL", a3: "bS", b8: "bC", b6: "bI" }, "g2", -1)
		.filter((m) => m.indexOf("g1") >= 0).sort(),
	["Pg2-g1=P", "Pg2-g1=W"]);

/* ------------------------------------------ promotion consumes the reserve */

{
	// only the Withdrawer is missing; two Pawns stand one step from the far rank
	const b = h.setup(sb, game, Object.assign({ g7: "wP", f7: "wP" }, without("b1")), 1);
	b.GenerateMoves(game);
	// a Cannon Pawn steps one square in any direction, so each Pawn reaches
	// three squares of the far rank
	check("consume: both Pawns may become the missing Withdrawer",
		realPromotions(b).map((m) => h.moveStr(b, m)).sort(),
		["Pf7-e8=W", "Pf7-f8=W", "Pf7-g8=W", "Pg7-f8=W", "Pg7-g8=W", "Pg7-h8=W"]);

	const promo = b.mMoves.filter((m) => h.moveStr(b, m) === "Pg7-g8=W")[0];
	b.ApplyMove(game, promo);
	b.GenerateMoves(game);
	check("consume: once one Pawn has taken it, the other cannot",
		realPromotions(b).map((m) => h.moveStr(b, m)), []);
}

{
	// both Long Leapers captured: two promotions to Long Leaper are allowed
	const b = h.setup(sb, game, Object.assign({ g7: "wP", f7: "wP" }, without("a4", "a5")), 1);
	b.GenerateMoves(game);
	const promo = b.mMoves.filter((m) => h.moveStr(b, m) === "Pg7-g8=L")[0];
	check("consume: a doubled type is offered", promo !== undefined, true);
	b.ApplyMove(game, promo);
	b.GenerateMoves(game);
	check("consume: the second one is still available",
		realPromotions(b).map((m) => h.moveStr(b, m)).sort(),
		["Pf7-e8=L", "Pf7-f8=L"]);
}

{
	// applying a promotion changes the pawn's type, and undo puts it back
	const b = h.setup(sb, game, Object.assign({ g7: "wP" }, without("b1")), 1);
	b.GenerateMoves(game);
	const promo = b.mMoves.filter((m) => h.moveStr(b, m) === "Pg7-g8=W")[0];
	check("promotion apply: exists", promo !== undefined, true);
	const sign = b.zSign;
	const undo = b.cbQuickApply(game, promo);
	check("promotion apply: the Pawn became a Withdrawer on g8",
		game.cbVar.pieceTypes[b.pieces[b.board[h.posOf("g8")]].t].fenAbbrev, "W");
	b.cbQuickUnapply(game, undo);
	check("promotion unapply: back to a Pawn on g7",
		game.cbVar.pieceTypes[b.pieces[b.board[h.posOf("g7")]].t].fenAbbrev, "P");
	check("promotion unapply: signature restored", b.zSign, sign);
}

{
	// declining is a real move: the piece stays a Cannon Pawn, and the reserve
	// it did not take is still there afterwards
	const b = h.setup(sb, game, Object.assign({ g7: "wP" }, without("b1")), 1);
	b.GenerateMoves(game);
	const stay = b.mMoves.filter((m) => m.t === h.posOf("g8") && m.pr === STAY)[0];
	check("decline: the option exists", stay !== undefined, true);
	b.ApplyMove(game, stay);
	check("decline: the piece is still a Cannon Pawn on g8",
		game.cbVar.pieceTypes[b.pieces[b.board[h.posOf("g8")]].t].fenAbbrev, "P");
	check("decline: the Withdrawer is still missing, so it is still promotable",
		b.baroqueReserveTypes(1).map((t) => game.cbVar.pieceTypes[t].fenAbbrev), ["W"]);
}

{
	// the view builds its promotion panel from the pr of every move reaching the
	// square: one without a pr made it throw and left the panel stuck open
	const b = h.setup(sb, game, Object.assign({ g7: "wP" }, without("b1", "a5")), 1);
	b.GenerateMoves(game);
	// the panel is built per (piece, destination), so the contract is that
	// within one such group either every move names a type or none does
	const groups = {};
	b.mMoves.forEach((m) => (groups[m.f + ">" + m.t] || (groups[m.f + ">" + m.t] = [])).push(m));
	const mixed = Object.keys(groups).filter((k) => {
		const named = groups[k].filter((m) => m.pr != null).length;
		return named > 0 && named < groups[k].length;
	});
	check("panel: no destination mixes named and unnamed promotions", mixed, []);
	check("panel: every named type is a real piece type",
		b.mMoves.filter((m) => m.pr != null && game.cbVar.pieceTypes[m.pr] === undefined), []);
	check("panel: the Pawn's promotion square offers several choices",
		groups[h.posOf("g7") + ">" + h.posOf("g8")].length > 1, true);
}

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
