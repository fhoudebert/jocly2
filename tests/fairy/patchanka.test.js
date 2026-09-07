/*
 * Patchanka, against the rules page shipped with it
 * (res/rules/patchanka/patchanka-rules.html).
 *
 *   node tests/fairy/patchanka.test.js
 *
 * Eleven kinds of piece, eight of them compounds of two atoms, and three of
 * the eight promote into another one. None of that shows in play if it is
 * wrong: a Kirin missing its Dabbaba leap, or a Phoenix promoting to the
 * Badger rather than the Ram, still gives a game that runs.
 */

const H = require("./harness.js");

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "cazaux/patchanka-model.js"];

const t = H.runner();
const p = H.context(SCRIPTS);

console.log("\nPatchanka: 10x10, 11 kinds of piece");

/* ================= the array ================= */

t.check("twenty-four pieces a side", p.sides(), 24);
t.check("eleven kinds", new Set(Object.keys(p.types)
	.map((k) => p.types[k].name.replace(/-[wb]$/, "").replace(/^i/, ""))).size, 11);

// "1: . . . O K Z W . . . / 2: R H I B S S B I H R / 3: ten Pawns"
const board = H.newBoard(p.sandbox, p.game);
const nameAt = (square) => {
	const index = board.board[p.geo.PosByName(square)];
	return index < 0 ? "." : p.types[board.pieces[index].t].name.replace(/-[wb]$/, "");
};
t.check("first rank: Okapi, King, Bison, Wildebeest on d1-g1",
	["a1", "b1", "c1", "d1", "e1", "f1", "g1", "h1", "i1", "j1"].map(nameAt),
	[".", ".", ".", "okapi", "king", "bison", "wildebeest", ".", ".", "."]);
t.check("second rank: Ram, Phoenix, Kirin, Badger, two Soldiers",
	["a2", "b2", "c2", "d2", "e2", "f2", "g2", "h2", "i2", "j2"].map(nameAt),
	["ram", "phoenix", "kirin", "badger", "soldier",
		"soldier", "badger", "kirin", "phoenix", "ram"]);
// ipawn: the Pawn that still has its double step
t.check("third rank: ten Pawns, none of them moved yet",
	["a3", "b3", "c3", "d3", "e3", "f3", "g3", "h3", "i3", "j3"].map(nameAt),
	Array(10).fill("ipawn"));
// mirror symmetry: Black is White reflected, not rotated
t.check("Black mirrors White", ["d10", "e10", "f10", "g10"].map(nameAt),
	["okapi", "king", "bison", "wildebeest"]);

t.check("a saved position reloads unchanged", p.roundTrip(), 0);

/* ================= the compounds ================= */

// "Wildebeest: combines the leaps of the Knight (2,1) and the Camel (3,1)"
t.check("Wildebeest: 8 Knight + 8 Camel squares", p.reach("wildebeest", "e5"), 16);
// "Okapi: combines the leaps of the Knight (2,1) and the Giraffe ... (3,2)"
t.check("Okapi: 8 Knight + 8 Giraffe squares", p.reach("okapi", "e5"), 16);
// "Bison: combines the leaps of the Camel (3,1) and the Giraffe ... (3,2)"
t.check("Bison: 8 Camel + 8 Giraffe squares", p.reach("bison", "e5"), 16);
// the three are distinct compounds of three atoms - a shared atom would show
// up as a shared square
t.check("Wildebeest and Okapi share only the Knight leap",
	p.flagsOn("wildebeest", "e5", "g6"), p.flagsOn("okapi", "e5", "g6"));
t.check("but not the Camel one", p.flagsOn("okapi", "e5", "h6"), "");
t.check("nor does the Bison have the Knight leap", p.flagsOn("bison", "e5", "g6"), "");

// "Kirin: combines the steps of the Ferz (1,1) and the leaps of the Dabbaba
// (2,0)"
t.check("Kirin: 4 Ferz + 4 Dabbaba squares", p.reach("kirin", "e5"), 8);
t.check("Kirin steps diagonally", p.flagsOn("kirin", "e5", "f6"), "move+capture");
t.check("Kirin leaps two straight", p.flagsOn("kirin", "e5", "e7"), "move+capture");
t.check("and not one", p.flagsOn("kirin", "e5", "e6"), "");
// "Phoenix: combines the steps of the Wazir (1,0) and the leaps of the Alfil
// (2,2)"
t.check("Phoenix: 4 Wazir + 4 Alfil squares", p.reach("phoenix", "e5"), 8);
t.check("Phoenix steps straight", p.flagsOn("phoenix", "e5", "e6"), "move+capture");
t.check("Phoenix leaps two diagonally", p.flagsOn("phoenix", "e5", "g7"), "move+capture");
t.check("and not one", p.flagsOn("phoenix", "e5", "f6"), "");

// "Badger: rides diagonally as a chess Bishop or leaps as a Dabbaba" - from
// e5, 17 Bishop squares and 4 leaps
t.check("Badger: a Bishop's rays plus the Dabbaba leaps", p.reach("badger", "e5"), 21);
t.check("Badger leaps two straight", p.flagsOn("badger", "e5", "c5"), "move+capture");
t.check("Badger has no Wazir step", p.flagsOn("badger", "e5", "d5"), "");
// "Ram: rides orthogonally as a chess Rook or leaps as an Alfil" - 18 + 4
t.check("Ram: a Rook's rays plus the Alfil leaps", p.reach("ram", "e5"), 22);
t.check("Ram leaps two diagonally", p.flagsOn("ram", "e5", "c3"), "move+capture");
t.check("Ram has no Ferz step", p.flagsOn("ram", "e5", "d4"), "");

// "Medusa: combines the powers of the Badger and the Ram ... the moves of the
// chess Queen and the leaps of the Alfil and the Dabbaba". The leaps land on
// squares the Queen already reaches, so the count is the Queen's: 35 from e5.
t.check("Medusa: the Queen's rays", p.reach("medusa", "e5"), 35);
// what the leaps add is reaching them over a piece - the Queen's ray stops at
// the friend on d4, the Alfil leap does not
t.check("Medusa leaps over a blocked diagonal",
	p.movesFrom({ e5: "wQ", d4: "wP", e1: "wK", e10: "bK" }, "e5")
		.filter((m) => p.geo.PosName(m.t) === "c3").length, 1);
t.check("Medusa leaps over a blocked file",
	p.movesFrom({ e5: "wQ", e6: "wP", e1: "wK", e10: "bK" }, "e5")
		.filter((m) => p.geo.PosName(m.t) === "e7").length, 1);

// the King is the orthodox one, and "there is no castling in Patchanka"
t.check("King: eight neighbours", p.reach("king", "e5"), 8);
t.check("no castling", p.game.cbVar.castle, undefined);
t.check("and no piece claims the castling flag",
	Object.keys(p.types).filter((k) => p.types[k].castle), []);

/* ================= Pawn and Soldier ================= */

// "Pawn: ... straight forward one square or two squares from its starting
// position ... It captures one square diagonally forward"
t.check("a Pawn on its start square has the double step", p.reach("ipawn-w", "e3"), 4);
t.check("and loses it as soon as it moves", p.promotesTo("ipawn-w", 4), ["pawn-w"]);
t.check("a Pawn that has moved steps one", p.reach("pawn-w", "e5"), 3);

// "Soldier: ... captures 1-square diagonally forward like a Pawn, but moves
// with no capture either 1-square forward or sideways ... It may also step two
// empty squares forward from any position on the board"
t.check("Soldier: forward 1 and 2, two diagonals, two sideways",
	p.reach("soldier-w", "e5"), 6);
t.check("Soldier keeps its double step anywhere on the board",
	p.flagsOn("soldier-w", "e5", "e7"), "move");
t.check("and never turns into a single-stepper", p.promotesTo("soldier-w", 4), []);
t.check("Soldier moves sideways without capturing",
	p.flagsOn("soldier-w", "e5", "d5"), "move");
t.check("Soldier captures diagonally forward only",
	p.flagsOn("soldier-w", "e5", "d6"), "capture");
t.check("Soldier does not step backwards", p.flagsOn("soldier-w", "e5", "e4"), "");

// "Any time a Pawn or a Soldier takes a double step ... Only a Pawn or a
// Soldier may capture en passant."
const named = (keys) => keys.map((k) => p.types[k].name.replace(/-[wb]$/, "")
	.replace(/^i/, "")).sort().filter((n, i, all) => all.indexOf(n) === i);
t.check("only Pawns and Soldiers can be caught en passant",
	named(Object.keys(p.types).filter((k) => p.types[k].epTarget)), ["pawn", "soldier"]);
t.check("and only they capture that way",
	named(Object.keys(p.types).filter((k) => p.types[k].epCatch)), ["pawn", "soldier"]);

/*
 * The Soldier's double step from mid-board is what makes the e.p. rule
 * unusual here: a white Pawn still standing on its own rank can be the one
 * doing the catching, so ipawn needs epCatch as much as pawn does.
 */
const ep = H.setup(p.sandbox, p.game, { b3: "wP*", c5: "bS", e1: "wK", e10: "bK" }, -1);
H.play(ep, p.game, "Sc5-c3");
t.check("a Soldier's double step can be answered en passant",
	H.movesFrom(ep, p.game, "b3"), ["Pb3-b4=P", "Pb3-b5=P", "Pb3xc4=P"]);
// the "=P" is the harness printing the type change: the Pawn that has moved
// is another type, whose abbrev is empty, so nothing shows in the notation
H.play(ep, p.game, "Pb3xc4=P");
t.check("and the Soldier is the piece taken", H.census(ep, p.game).sort(), ["bK", "wK", "wP"]);

// the Kirin's Dabbaba leap lands on the square a Pawn crossed - without
// epCatch that must not become a capture
const leap = H.setup(p.sandbox, p.game, { c2: "wI", d4: "bP*", h1: "wK", e10: "bK" }, -1);
H.play(leap, p.game, "Pd4-d2=P");
t.check("a Kirin reaches the square the Pawn crossed",
	H.movesFrom(leap, p.game, "c2").indexOf("Ic2-c4") >= 0, true);
t.check("but landing there captures nothing",
	H.movesFrom(leap, p.game, "c2").filter((m) => m.indexOf("x") >= 0), []);

/* ================= promotions ================= */

// "A Pawn is promoted to a Medusa and nothing else"
t.check("a Pawn promotes to a Medusa, with no choice", p.promotesTo("pawn-w", 9), ["medusa"]);
// "A Soldier is promoted to a Medusa"
t.check("so does a Soldier", p.promotesTo("soldier-w", 9), ["medusa"]);
// "A Kirin is promoted to a Badger" - FD -> FFD = BD
t.check("a Kirin promotes to a Badger", p.promotesTo("kirin", 9), ["badger"]);
// "A Phoenix is promoted to a Ram" - WA -> WWA = RA
t.check("a Phoenix promotes to a Ram", p.promotesTo("phoenix", 9), ["ram"]);
// nothing else promotes
t.check("and nothing else promotes at all",
	["badger", "ram", "bison", "okapi", "wildebeest", "medusa", "king"]
		.filter((name) => p.promotesTo(name, 9).length), []);

// Black promotes on the first rank, not the last
t.check("a black Kirin promotes on rank 1", p.game.cbVar.promote(p.game,
	{ t: p.typeNamed("kirin"), s: -1, p: 13 }, { t: 3, f: 13, c: null })
	.map((into) => p.types[into].name), ["badger"]);
t.check("and not on rank 10", p.game.cbVar.promote(p.game,
	{ t: p.typeNamed("kirin"), s: -1, p: 83 }, { t: 93, f: 83, c: null }), []);

// promotion is compulsory: one move, carrying the promotion, and no plain one
const promo = p.movesFrom({ d9: "wP", a1: "wK", a5: "bK" }, "d9");
t.check("a Pawn reaching the last rank has no choice but to promote",
	promo.map((m) => p.natural(m)).sort(), ["d9-d10=Q"]);

/* ================= it plays ================= */

t.check("a hundred plies without an illegal move", p.plays(100), 100);

t.done("Patchanka");
