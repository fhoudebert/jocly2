/*
 * Zanzibar-S, against the rules as published on
 * https://www.chessvariants.com/rules/zanzibar-s
 *
 *   node tests/chessbase/zanzibar-s.test.js
 *
 * Two things in this game are more than a movement graph, and both were wrong.
 *
 * The King's jump, which replaces castling: on its first move the King may go
 * to any free square two squares away - straight, diagonal, or like a Knight.
 * The square it passes over may be occupied but must not be threatened, and
 * for the Knight-like jumps the rules ask only that ONE of the two squares it
 * passes between be free of threat ("if jumping from f2 to h3, either g2 or g3
 * must not be under attack"). The model demanded both, and two entries of the
 * table named the wrong square entirely.
 *
 * And the setup: Black chooses where the King, Queen, Eagle and Lion stand,
 * then where the Rhinoceros and Buffalo go, which the rules count as 24
 * positions. The Rhinoceros/Buffalo choice was derived from the Eagle/Lion bit
 * instead of being its own, so only 12 could ever be dealt - even though the
 * view has always drawn 24 gadgets to pick from.
 *
 * Metamachy shares this code, table for table; the same checks are run against
 * it at the end, since a fix to one that misses the other would be worse than
 * either.
 */

const path = require("path");

const H = require("./harness.js");

const SCRIPTS = (model) =>
	["base-model.js", "grid-geo-model.js", "fairy-piece-model.js", model];

const sandbox = H.loadModel(SCRIPTS("cazaux/zanzibar-s-model.js"));
const game = H.newGame(sandbox);
const geo = game.cbVar.geometry;
const types = game.cbVar.pieceTypes;
const c = sandbox.Model.Game.cbConstants;
const MASK = 0xffff;

const engine = (move) =>
	Object.assign(Object.create(sandbox.Model.Move), move).ToString("engine");

const typeNamed = (name) => {
	for(const t in types)
		if(types[t].name === name)
			return parseInt(t);
	throw new Error("no piece type named " + name);
};

// every square a piece can reach from one square on an empty board
function pattern(name, square) {
	const from = geo.PosByName(square), reach = new Set();
	(types[typeNamed(name)].graph[from] || []).forEach((line) => {
		for(const entry of line)
			if(entry & (c.FLAG_MOVE | c.FLAG_CAPTURE))
				reach.add(geo.PosName(entry & MASK));
	});
	return [...reach].sort();
}

/*
 * A board built by hand is still in the pre-setup phase, where GenerateMoves
 * only offers the setup choices; mark it done so the real generator runs.
 */
function kingMoves(pieces, who, square, sandbox_, game_) {
	const board = H.setup(sandbox_ || sandbox, game_ || game, pieces, who);
	board.setupState = "done";
	board.mMoves = [];
	board.GenerateMoves(game_ || game);
	const from = geo.PosByName(square);
	return board.mMoves.filter((m) => m.f === from).map(engine).sort();
}

const t = H.runner();

/* ---------------- the King's jump ---------------- */

console.log("\nthe King's jump");

/*
 * The rules spell this one out: "from f2, it can jump to d1, d2, d3, d4, e4,
 * f4, g4, h4, h3, h2 or h1" - eleven squares, the ring of sixteen minus the
 * five that fall off the board.
 */
t.check("from f2, the eleven squares the rules list",
	kingMoves({ f2: "wK*", a12: "bK*" }, 1, "f2")
		.filter((m) => !/f2[efg][123]$/.test(m)),
	["f2d1", "f2d2", "f2d3", "f2d4", "f2e4", "f2f4", "f2g4", "f2h1", "f2h2", "f2h3",
	 "f2h4"]);
// from f1 the ring loses seven squares instead of five
t.check("from f1, nine remain",
	kingMoves({ f1: "wK*", a12: "bK*" }, 1, "f1").length - 5, 9);

t.check("only on the King's first move",
	kingMoves({ f2: "wK", a12: "bK*" }, 1, "f2").length, 8);

t.check("not while in check", (() => {
	const board = H.setup(sandbox, game, { f2: "wK*", f12: "bR", a12: "bK*" }, 1);
	board.setupState = "done";
	board.check = 1;                    // carried over from the checking move
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves.filter((m) => m.f === board.kings[1]).length;
})(), 6);

t.ok("the destination must be free",
	kingMoves({ f1: "wK*", h1: "wR", a12: "bK*" }, 1, "f1").indexOf("f1h1") < 0);
t.ok("the square passed over may be occupied",
	kingMoves({ f1: "wK*", g1: "wR", a12: "bK*" }, 1, "f1").indexOf("f1h1") >= 0);

/*
 * Straight and diagonal jumps: the single square passed over must be safe.
 * The attackers here are Knights, which threaten one square without also
 * covering the destination - a Rook on the file would have made the test say
 * nothing.
 */
const jumps = (extra, from, to) =>
	kingMoves(Object.assign({ f1: "wK*", f2: "wK*", a12: "bK*" }[from] === undefined
		? {} : {}, { [from]: "wK*", a12: "bK*" }, extra), 1, from).indexOf(from + to) >= 0;

t.ok("an attacked g1 stops f1-h1", !jumps({ e2: "bN" }, "f1", "h1"));
t.ok("an attacked i1 does not", jumps({ g2: "bN" }, "f1", "h1"));

/*
 * Knight-like jumps: one free square out of the two is enough. f1-d2 passes
 * between e1 and e2; the rules' own example is f2-h3 between g2 and g3.
 */
t.ok("f1-d2 with only e1 attacked", jumps({ c2: "bN" }, "f1", "d2"));
t.ok("f1-d2 with only e2 attacked", jumps({ c1: "bN" }, "f1", "d2"));
t.ok("f2-h3 with only g2 attacked", jumps({ e1: "bN" }, "f2", "h3"));
t.ok("f2-h3 with only g3 attacked", jumps({ e2: "bN" }, "f2", "h3"));
t.ok("f2-h3 with both attacked is refused",
	!jumps({ e1: "bN", e2: "bN" }, "f2", "h3"));

/* ---------------- the setup ---------------- */

console.log("\nthe setup: 2 x 3 x 2 x 2 = 24 positions");

function deal(index) {
	const board = H.newBoard(sandbox, game);
	board.ApplyMove(game, {});             // enter the setup phase
	board.ApplyMove(game, { setup: index });
	const at = {};
	[4, 5, 6, 7, 17, 18].forEach((pos) => {
		const piece = board.board[pos];
		at[geo.PosName(pos)] = piece >= 0 ? types[board.pieces[piece].t].name : "-";
	});
	return at;
}

const dealt = [];
for(let i = 0; i < 24; i++)
	dealt.push(JSON.stringify(deal(i)));

t.check("the model offers 24 choices", (() => {
	const board = H.newBoard(sandbox, game);
	board.ApplyMove(game, {});
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves.length;
})(), 24);
t.check("and they are all different", new Set(dealt).size, 24);

// the King on f1 or f2, half each
t.check("the King stands on f2 in twelve of them",
	dealt.filter((d) => JSON.parse(d).f2 === "king").length, 12);
// the Rhinoceros and Buffalo vary independently of the Eagle and Lion
t.check("the Rhinoceros takes e1 in twelve of them",
	dealt.filter((d) => JSON.parse(d).e1 === "Rhino").length, 12);
t.check("the Eagle stands ahead of the Lion in twelve of them",
	dealt.filter((d) => {
		const a = JSON.parse(d);
		return [a.f1, a.g1, a.f2, a.g2].indexOf("eagle")
			< [a.f1, a.g1, a.f2, a.g2].indexOf("lion");
	}).length, 12);
t.ok("the two choices are no longer tied together",
	new Set(dealt.map((d) => {
		const a = JSON.parse(d);
		const eagleFirst = [a.f1, a.g1, a.f2, a.g2].indexOf("eagle")
			< [a.f1, a.g1, a.f2, a.g2].indexOf("lion");
		return eagleFirst + "/" + (a.e1 === "Rhino");
	})).size === 4);

/* ---------------- the pieces ---------------- */

console.log("\nthe pieces");

t.check("seventeen kinds of piece", new Set(Object.keys(types)
	.map((k) => types[k].name.replace(/-[wb]$/, "").replace(/^i/, ""))).size, 17);

t.check("Knight: the 8 (2,1) squares", pattern("knight", "f6").length, 8);
t.check("Camel: the 8 (3,1) squares", pattern("camel", "f6").length, 8);
t.check("Giraffe: the 8 (3,2) squares", pattern("giraffe", "f6").length, 8);
t.check("Buffalo: Knight, Camel and Giraffe together",
	pattern("Buffalo", "f6").length, 24);
t.check("Lion: a step in any direction, or a leap two away",
	pattern("lion", "f6").length, 24);
t.check("Elephant: Ferz and Alfil", pattern("elephant", "f6").length, 8);
t.check("Machine: Wazir and Dabbaba", pattern("machine", "f6").length, 8);
t.check("Eagle: a diagonal step then a straight ray",
	pattern("eagle", "f6").length, 40);
t.check("Rhinoceros: a straight step then a diagonal ray",
	pattern("Rhino", "f6").length, 40);

// the Crocodile is the diagonal counterpart of the Cannon: a Bishop's lines,
// capturing only over a screen
t.check("Crocodile: the Bishop's 21 squares from f6",
	pattern("bow", "f6").length, 21);
t.ok("Crocodile captures over a screen",
	!!(types[typeNamed("bow")].graph[geo.PosByName("f6")][0][0] & c.FLAG_SCREEN_CAPTURE));

// "moves and captures one square in any direction... Like the Pawn, he can
// also move without capturing to the second square straight ahead"
t.check("Prince: eight neighbours plus the second square ahead",
	pattern("prince-w", "f6"),
	["e5", "e6", "e7", "f5", "f7", "f8", "g5", "g6", "g7"]);

// "Pawn: can move straight forward one or two square from ANY position"
t.check("a Pawn keeps its double step wherever it stands",
	pattern("ipawn-w", "f6"), ["e7", "f7", "f8", "g7"]);

t.check("no piece is castleable",
	Object.keys(types).filter((k) => types[k].castle), []);

/* ---------------- promotion and en passant ---------------- */

console.log("\npromotion and en passant");

const chiefs = ["queen", "lion", "eagle", "Buffalo", "Rhino"].sort();
[["ipawn-w", "f12"], ["ipawn-b", "f1"], ["prince-w", "f12"], ["prince-b", "f1"]]
	.forEach(([name, square]) => {
		t.check(name + " promotes to one of the five chiefs",
			game.cbVar.promote(game, { t: typeNamed(name) },
				{ t: geo.PosByName(square) }).map((type) => types[type].name).sort(),
			chiefs);
	});

// "Only a Pawn may capture en passant; the Prince does not have this option"
t.check("only Pawns capture en passant",
	Object.keys(types).filter((k) => types[k].epCatch).map((k) => types[k].name).sort(),
	["ipawn-b", "ipawn-w", "pawn-b", "pawn-w"]);
// but a Prince taking its double step can be caught that way
t.ok("a Prince taking two steps can be caught en passant",
	types[typeNamed("prince-w")].epTarget && types[typeNamed("prince-b")].epTarget);

/* ---------------- Metamachy shares this code ---------------- */

console.log("\nMetamachy, same King, same table");

const meta = H.loadModel(SCRIPTS("cazaux/metamachy-model.js"));
const metaGame = H.newGame(meta);
const metaJumps = (extra, from, to) =>
	kingMoves(Object.assign({ [from]: "wK*", a12: "bK*" }, extra), 1, from, meta, metaGame)
		.indexOf(from + to) >= 0;

t.ok("an attacked g1 stops f1-h1", !metaJumps({ e2: "bN" }, "f1", "h1"));
t.ok("an attacked i1 does not", metaJumps({ g2: "bN" }, "f1", "h1"));
t.ok("f1-d2 with only e1 attacked", metaJumps({ c2: "bN" }, "f1", "d2"));
t.ok("f2-h3 with only g2 attacked", metaJumps({ e1: "bN" }, "f2", "h3"));
t.ok("f2-h3 with both attacked is refused",
	!metaJumps({ e1: "bN", e2: "bN" }, "f2", "h3"));
// Metamachy has no Rhinoceros and no Buffalo, so its twelve setups are right
t.check("Metamachy keeps its twelve setups", (() => {
	const board = H.newBoard(meta, metaGame);
	board.ApplyMove(metaGame, {});
	board.mMoves = [];
	board.GenerateMoves(metaGame);
	return board.mMoves.length;
})(), 12);

/* ---------------- a game runs ---------------- */

console.log("\na game runs");

let seed = 987654321;
const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

const board = H.newBoard(sandbox, game);
game.mPlayedMoves = [];
board.ApplyMove(game, {});
board.ApplyMove(game, { setup: 17 });
board.setupState = "done";
let plies = 0, crash = null;
try {
	while(plies < 60) {
		board.mMoves = [];
		board.GenerateMoves(game);
		if(board.mMoves.length === 0)
			break;
		const move = board.mMoves[Math.floor(random() * board.mMoves.length)];
		board.ApplyMove(game, move);
		game.mPlayedMoves.push(move);
		board.mWho = -board.mWho;
		plies++;
	}
} catch(error) {
	crash = error;
}
t.ok("both sides play for " + plies + " plies", !crash);
if(crash)
	console.log("    " + crash.message);
// a random game may well end in mate before the 60th ply - what matters is
// that it ends by having no move, not by throwing
t.ok("it got well past the opening", plies >= 20);

t.done("Zanzibar-S");
