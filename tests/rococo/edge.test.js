/*
 * Edge-square rule tests - pure Node:
 *   node tests/rococo/edge.test.js
 *
 * The outer ring (raw column 0/9 or row 0/9) may only be entered or crossed to
 * make a capture, using the fewest edge squares. Inner playing squares are
 * a1..h8; edge squares are addressed here by raw (row,col) through posRC.
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

// place some pieces by name and some by raw position, then list a piece's moves
function board(named, raw, who) {
	const b = h.setup(sb, game, named, who);
	for(const rc in (raw || {})) {
		const [r, c] = rc.split(",").map(Number);
		const spec = raw[rc];
		const side = spec[0] === "w" ? 1 : -1;
		let type = null, types = game.cbVar.pieceTypes;
		for(const t in types) if(types[t].fenAbbrev === spec.slice(1)) type = parseInt(t);
		const idx = b.pieces.length;
		b.pieces.push({ s: side, t: type, p: h.posRC(r, c), m: true });
		b.board[h.posRC(r, c)] = idx;
	}
	return b;
}

function movesRaw(b, from) {
	b.GenerateMoves(game);
	return b.mMoves.filter((m) => m.f === from).map((m) => h.moveStr(b, m)).sort();
}

/* --------------------------------------------- a plain move may not use the ring */

{
	// a Long Leaper on b4 sliding west would reach a4 (inner) then the ring at
	// col 0 - it must not slide onto the ring with nothing to capture
	const b = h.setup(sb, game, { a1: "wK", h8: "bK", b4: "wL" }, 1);
	const all = movesRaw(b, h.posOf("b4"));
	check("plain slide never lands on an edge square",
		all.filter((m) => m.indexOf("@") >= 0), []);
}

/* ------------------------------- the ring may be used when a capture needs it */

{
	// Withdrawer on b4 with an enemy on c4: withdrawing west means moving to a4
	// (inner) or onto the ring at (4,0). Landing a4 already captures, so the
	// ring landing is an unnecessary deeper alternative and must be dropped.
	const b = h.setup(sb, game, { a1: "wK", h8: "bK", b4: "wW", c4: "bP" }, 1);
	const west = movesRaw(b, h.posOf("b4")).filter((m) => m.indexOf("xc4") >= 0);
	check("withdrawer: inner landing preferred, ring landing dropped",
		west, ["Wb4-a4xc4"]);
}

{
	// Long Leaper on the a-file (inner col 1, row 4) leaping an enemy on the
	// b-file... build the page's example spirit: leaper must land on the
	// nearest square beyond the victim, even if that is the ring, and not deeper.
	// Enemy on (4,8)=h4-ish; leaper at (4,7)=g4 leaping east over h4(col8) would
	// land on the ring col 9. Only the nearest ring square counts.
	const b = h.setup(sb, game, { a1: "wK", d8: "bK", g4: "wL", h4: "bP" }, 1);
	const east = movesRaw(b, h.posOf("g4")).filter((m) => m.indexOf("xh4") >= 0);
	check("leaper: may land on the ring only at the nearest square beyond the victim",
		east, ["Lg4-@9,4xh4"]);
}

{
	// same leaper but with an inner landing available beyond the victim: the
	// ring must then not be used at all. Enemy on f4, leaper on e4 leaping east:
	// lands g4/h4 (inner) - never the ring.
	const b = h.setup(sb, game, { a1: "wK", d8: "bK", e4: "wL", f4: "bP" }, 1);
	const east = movesRaw(b, h.posOf("e4")).filter((m) => m.indexOf("xf4") >= 0);
	check("leaper: inner landings only when they exist beyond the victim",
		east, ["Le4-g4xf4", "Le4-h4xf4"]);
}

/* -------------------------- the King may step onto the ring only to capture there */

{
	// enemy pawn sitting on the ring at (0,4); the white King on a-ish inner
	// square adjacent to it may capture it there, but may not step onto an
	// empty ring square.
	const b = board({ h8: "bK" }, { "1,4": "wK", "0,4": "bP" }, 1);
	const kingFrom = h.posRC(1, 4);
	const km = movesRaw(b, kingFrom);
	check("king: may capture a piece on the ring",
		km.filter((m) => m.indexOf("x") >= 0).some((m) => m.indexOf("@4,0") >= 0), true);
	check("king: may not step onto an empty ring square",
		km.filter((m) => m.indexOf("@") >= 0 && m.indexOf("x") < 0), []);
}

/* ------------------------ piece-specific restrictions stated by the source */

const isEdge = (p) => { const r = Math.floor(p / 10), c = p % 10; return r === 0 || r === 9 || c === 0 || c === 9; };
function ringDestinations(b, from) {
	b.GenerateMoves(game);
	return b.mMoves.filter((m) => m.f === from && isEdge(m.t)).map((m) => h.moveStr(b, m));
}

{
	// "An Advancer may only enter an edge square if swapped there": capturing by
	// approach never lands it on the ring, since the victim would have to sit
	// off the board. It still captures ring pieces from an inner square.
	const b = board({ a1: "wK", h8: "bK", b4: "wA" },
		{ "4,0": "bP", "4,9": "bP", "0,3": "bP", "9,2": "bP" }, 1);
	check("advancer: never enters the ring by its own move",
		ringDestinations(b, h.posOf("b4")), []);
	check("advancer: still captures a ring piece from an inner square",
		movesRaw(b, h.posOf("b4")).filter((m) => m.indexOf("x@0,4") >= 0), ["Ab4-a4x@0,4"]);
}

{
	// "once on an edge square it may make capturing moves along the edge"
	const b = board({ a1: "wK", h8: "bK" }, { "0,3": "wA", "0,5": "bP" }, 1);
	check("advancer: once on the ring, it captures along the ring",
		movesRaw(b, h.posRC(0, 3)).filter((m) => m.indexOf("x") >= 0), ["A@3,0-@4,0x@5,0"]);
}

{
	// "The Immobilizer may never move to ... an edge square" - it never captures,
	// so the general rule already keeps it off the ring
	const b = board({ a1: "wK", h8: "bK", b4: "wI" }, { "4,0": "bP" }, 1);
	check("immobilizer: never enters the ring", ringDestinations(b, h.posOf("b4")), []);
}

/* ------------------------------- rule 4: the ring move must be the only one */

// baroqueFilterEdge is a pure function of the move list, so the tie can be shown
// directly: two moves from the same square, capturing the same piece, crossing
// the same single edge square, at the same distance. Neither may be played.
{
	const b = h.setup(sb, game, { a1: "wK", h8: "bK" }, 1);
	const from = h.posRC(1, 1);					// inner corner
	const twin = () => [
		{ f: from, t: h.posRC(0, 0), c: 7, a: "L" },
		{ f: from, t: h.posRC(0, 1), c: 7, a: "L" },
	];
	check("rule 4: tied ring captures are both forbidden",
		b.baroqueFilterEdge(twin()).length, 0);

	check("rule 4: the same capture stays legal when only one move makes it",
		b.baroqueFilterEdge([twin()[0]]).map((m) => h.nameOf(m.t)), ["@0,0"]);

	// differing in distance is not a tie: the shorter one is the legal move
	check("rule 4: the shortest of two unequal ring moves is kept",
		b.baroqueFilterEdge([
			{ f: from, t: h.posRC(0, 0), c: 7, a: "L" },
			{ f: h.posRC(1, 1), t: h.posRC(0, 1), c: 8, a: "L" },
		]).length, 2);
}

console.log((failed ? "FAILED" : "OK") + " - " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
