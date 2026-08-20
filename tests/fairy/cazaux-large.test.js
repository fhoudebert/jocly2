/*
 * Metamachy and Terachess, against the rules pages shipped with them
 * (res/rules/metamachy, res/rules/terachess). Minjiku Shogi started here too -
 * same author, same shape of model - and now lives in
 * tests/shogi/minjiku-shogi.test.js, with the other Shogi variants.
 *
 *   node tests/fairy/cazaux-large.test.js
 *
 * Neither needed correcting. The checks are here because both are large - 30
 * and 64 pieces a side, 12 and 24 kinds - and a piece whose leap is one delta
 * short, or a promotion pointing at the wrong type, is invisible in play: the
 * game runs, it just plays a different game.
 */

const H = require("./harness.js");

const SETS = {
	metamachy: ["base-model.js", "grid-geo-model.js", "cazaux/metamachy-model.js"],
	terachess: ["base-model.js", "grid-geo-model.js", "cazaux/terachess-model.js"],
};

const load = (name) => H.context(SETS[name]);

const t = H.runner();

/* ================= Metamachy ================= */

console.log("\nMetamachy: 12x12, 12 kinds of piece");

const meta = load("metamachy");

t.check("thirty pieces a side", meta.sides(), 30);
t.check("twelve kinds", new Set(Object.keys(meta.types)
	.map((k) => meta.types[k].name.replace(/-[wb]$/, "").replace(/^i/, ""))).size, 12);

// "Lion: moves as a King, or may jump to a position two squares away ...
// or jumping as a Knight"
t.check("Lion: a step, or any leap two squares away", meta.reach("lion", "g7"), 24);
// "Griffon: moves one square diagonally and then slides away ... vertically or
// horizontally"
t.check("Griffon: a diagonal step then a straight ray", meta.reach("eagle", "g7"), 40);
// "Camel: jumps to the opposite case of a 2x4 rectangle"
t.check("Camel: the 8 (3,1) squares", meta.reach("camel", "g7"), 8);
// "Elephant: moves one or two squares diagonally"
t.check("Elephant: Ferz and Alfil", meta.reach("elephant", "g7"), 8);
t.check("Knight: the 8 (2,1) squares", meta.reach("knight", "g7"), 8);
// "Prince: ... Like the Pawn, he can also move without capturing to the second
// square straight ahead"
t.check("Prince: eight neighbours and the second square ahead",
	meta.reach("prince-w", "g7"), 9);

// "Pawn: can move straight forward one or two square from ANY position"
t.check("a Pawn keeps its double step wherever it stands", meta.reach("ipawn-w", "g7"), 4);
t.check("and never turns into a single-stepper",
	meta.game.cbVar.promote(meta.game, { t: meta.typeNamed("ipawn-w"), s: 1, p: 30 },
		{ t: 42, f: 30, c: null }), []);

// "When he reaches the last row it can promote to one of the three major
// pieces: Queen, Lion or Griffon"
t.check("a Pawn promotes to one of the three majors",
	meta.promotesTo("ipawn-w", 11).sort(), ["eagle", "lion", "queen"]);
t.check("and so does a Prince", meta.promotesTo("prince-w", 11).sort(),
	["eagle", "lion", "queen"]);

// "the en-passant capture is possible every time an opposite Pawn or Prince
// has advanced two squares"
t.check("Pawns and Princes can be caught en passant",
	Object.keys(meta.types).filter((k) => meta.types[k].epTarget)
		.map((k) => meta.types[k].name.replace(/-[wb]$/, "")).sort()
		.filter((name, i, all) => all.indexOf(name) === i),
	["ipawn", "prince"]);
t.check("only Pawns capture that way",
	Object.keys(meta.types).filter((k) => meta.types[k].epCatch)
		.map((k) => meta.types[k].name.replace(/-[wb]$/, "").replace(/^i/, "")).sort()
		.filter((name, i, all) => all.indexOf(name) === i),
	["pawn"]);

/*
 * "Black freely decides where to place his King, Queen, Griffon and Lion" -
 * twelve setups, the King landing on f1 or f2 and nowhere else. That matters
 * beyond the rules: the King's first-move jump is a table keyed by its
 * starting square, and a setup putting it anywhere else would take the whole
 * move generator down with it.
 */
console.log("\nMetamachy: the twelve setups");

const setups = [];
for(let i = 0; i < 12; i++) {
	const board = H.newBoard(meta.sandbox, meta.game);
	board.ApplyMove(meta.game, {});
	board.ApplyMove(meta.game, { setup: i });
	let moves = null;
	try {
		board.mWho = 1;
		board.mMoves = [];
		board.GenerateMoves(meta.game);
		moves = board.mMoves.length;
	} catch(error) {
		moves = "crash: " + error.message;
	}
	setups.push({ king: meta.geo.PosName(board.kings[1]), moves });
}
t.check("twelve of them", (() => {
	const board = H.newBoard(meta.sandbox, meta.game);
	board.ApplyMove(meta.game, {});
	board.mMoves = [];
	board.GenerateMoves(meta.game);
	return board.mMoves.length;
})(), 12);
t.check("the King only ever stands on f1 or f2",
	[...new Set(setups.map((s) => s.king))].sort(), ["f1", "f2"]);
t.ok("and every setup generates its moves",
	setups.every((s) => typeof s.moves === "number" && s.moves > 0));

/* ================= Terachess ================= */

console.log("\nTerachess: 16x16, 64 pieces a side");

const tera = load("terachess");

t.check("sixty-four pieces a side", tera.sides(), 64);

// the row-by-row list of the rules page, as piece counts
[["amazon", 1], ["marshall", 1], ["cardinal", 1], ["star", 1], ["rhino", 1],
 ["buffalo", 1], ["cannon", 2], ["bull", 2], ["bow", 2], ["camel", 2],
 ["antelope", 2], ["lion", 1], ["eagle", 1], ["corporalw", 14], ["king", 1],
 ["queen", 1], ["princew", 2], ["ship", 2], ["bishop", 2], ["knight", 2],
 ["rook", 2], ["machine", 2], ["elephant", 2], ["ipawnw", 16]].forEach(([name, count]) => {
	const initial = tera.types[tera.typeNamed(name)].initial || [];
	t.check(count + " " + name, initial.filter((entry) => entry.s > 0).length, count);
});

t.check("Antelope: 2 or 3 steps, straight or diagonal", tera.reach("antelope", "i9"), 16);
t.check("Bull: the 8 (3,2) squares", tera.reach("bull", "i9"), 8);
t.check("Camel: the 8 (3,1) squares", tera.reach("camel", "i9"), 8);
t.check("Buffalo: Knight, Camel and Bull together", tera.reach("buffalo", "i9"), 24);
t.check("Lion: a step, or any leap two squares away", tera.reach("lion", "i9"), 24);
t.check("Machine: Wazir and Dabbaba", tera.reach("machine", "i9"), 8);
t.check("Elephant: Ferz and Alfil", tera.reach("elephant", "i9"), 8);
t.check("Amazon: Queen and Knight",
	tera.reach("amazon", "i9"), tera.reach("queen", "i9") + 8);
t.check("Marshall: Rook and Knight",
	tera.reach("marshall", "i9"), tera.reach("rook", "i9") + 8);
t.check("Cardinal: Bishop and Knight",
	tera.reach("cardinal", "i9"), tera.reach("bishop", "i9") + 8);
// "Star: it moves like a Queen and needs an intermediate piece ... Like the
// Queen is Bishop + Rook, the Star is Cannon + Bow"
t.check("Star: the Queen's lines", tera.reach("star", "i9"), tera.reach("queen", "i9"));
t.check("Star: captures over a screen", tera.flagsOn("star", "i9", "i8"), "move+screen");
t.check("Bow: captures over a screen", tera.flagsOn("bow", "i9", "h8"), "move+screen");

/*
 * The Corporal is the Pawn plus one thing: "the Corporal can also advance 1
 * step diagonally forward (so, with or without capturing)". On the Pawn that
 * same square is a capture and nothing else - which is the whole difference
 * between the two pieces.
 */
t.check("Corporal: the diagonal step is a move as well as a capture",
	tera.flagsOn("corporalw", "i9", "h10"), "move+capture");
t.check("Pawn: the diagonal is a capture only",
	tera.flagsOn("ipawnw", "i9", "h10"), "capture");
t.check("both advance one or two squares from anywhere",
	[tera.reach("ipawnw", "i9"), tera.reach("corporalw", "i9")], [4, 4]);

// the promotions table of the rules page, in full
[["ipawnw", "queen"], ["corporalw", "queen"], ["princew", "amazon"],
 ["knight", "buffalo"], ["camel", "buffalo"], ["bull", "buffalo"],
 ["elephant", "lion"], ["machine", "lion"], ["ship", "eagle"],
 ["antelope", "star"]].forEach(([piece, into]) => {
	t.check(piece + " promotes to " + into, tera.promotesTo(piece, 15), [into]);
});

// "the en-passant capture is possible every time the opposite Pawn or Corporal
// or Prince has advanced two squares"
t.check("Pawn, Corporal and Prince can be caught en passant",
	[...new Set(Object.keys(tera.types).filter((k) => tera.types[k].epTarget)
		.map((k) => tera.types[k].name.replace(/[wb]$/, "").replace(/^i/, "")))].sort(),
	["corporal", "pawn", "prince"]);
t.check("only Pawn and Corporal capture that way",
	[...new Set(Object.keys(tera.types).filter((k) => tera.types[k].epCatch)
		.map((k) => tera.types[k].name.replace(/[wb]$/, "").replace(/^i/, "")))].sort(),
	["corporal", "pawn"]);

// "King: exactly as in usual Chess" - no jump of its own, and no castling
t.check("no castling", tera.game.cbVar.castle, undefined);

/* ================= both ================= */

console.log("\nboth of them");

[["metamachy", meta], ["terachess", tera]].forEach(([name, ctx]) => {
	t.check(name + ": a saved position reloads unchanged", ctx.roundTrip(), 0);
	t.check(name + ": a game runs", ctx.plays(60), 60);
});

t.done("Metamachy and Terachess");
