/*
 * Grant Acedrex, against the rules as published on
 * https://www.chessvariants.com/rules/grantacedrex
 *
 *   node tests/chessbase/grant-acedrex.test.js
 *
 * The King's privilege is where this game hides its complexity: on its first
 * move the King may go two squares in any direction, leaping over the square
 * in between even when occupied, but it may not capture that way, may not use
 * it to escape a check, and may not pass over a square the opponent attacks.
 * That last clause is what makes the intermediate square part of the data
 * rather than decoration - the model lists it explicitly, and a wrong square
 * there is silent: the game keeps playing and merely answers the wrong
 * question. Both entries had one, and Black's was out of the board entirely,
 * which crashed move generation for Black on move one.
 *
 * The suite reuses tests/fairy/harness.js: same sandbox loader, setup() takes
 * a { square: "wK", ... } map where the letter is the FEN abbrev, and a
 * trailing "*" marks a piece that has not moved yet.
 */

const path = require("path");

const H = require("./harness.js");

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "historical/grant-acedrex-model.js"];

const sandbox = H.loadModel(SCRIPTS);
const game = H.newGame(sandbox);
const geo = game.cbVar.geometry;
const types = game.cbVar.pieceTypes;
const c = sandbox.Model.Game.cbConstants;
const MASK = 0xffff;

const engine = (move) =>
	Object.assign(Object.create(sandbox.Model.Move), move).ToString("engine");

function movesFrom(pieces, who, square) {
	const board = H.setup(sandbox, game, pieces, who);
	board.mMoves = [];
	board.GenerateMoves(game);
	const from = geo.PosByName(square);
	return board.mMoves.filter((move) => move.f === from).map(engine).sort();
}

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

const t = H.runner();

/* ---------------- the King's privilege ---------------- */

console.log("\nthe King's privilege");

// The Kings stand on the edge rank, so of the eight directions only five stay
// on the board: sideways twice, and the three forward ones.
t.check("White jumps to the five squares that exist",
	movesFrom({ g1: "wK*", a12: "bK*" }, 1, "g1"),
	["g1e1", "g1e3", "g1f1", "g1f2", "g1g2", "g1g3", "g1h1", "g1h2", "g1i1", "g1i3"]);
t.check("Black has the mirror image",
	movesFrom({ g12: "bK*", a1: "wK*" }, -1, "g12"),
	["g12e10", "g12e12", "g12f11", "g12f12", "g12g10", "g12g11", "g12h11", "g12h12",
	 "g12i10", "g12i12"]);

// the jump is the Alfferza's: the second square in a straight line, never a
// knight's move
t.ok("no knight-like jump",
	movesFrom({ g1: "wK*", a12: "bK*" }, 1, "g1").every((m) => !/^g1[fh]3$/.test(m)));

t.check("only on the King's first move",
	movesFrom({ g1: "wK", a12: "bK*" }, 1, "g1"),
	["g1f1", "g1f2", "g1g2", "g1h1", "g1h2"]);

/*
 * The privilege is barred while in check. board.check is not recomputed by
 * GenerateMoves - it is carried over from the `ck` flag of the move that gave
 * the check - so a position built by hand has to say so itself.
 */
const inCheck = H.setup(sandbox, game, { g1: "wK*", g12: "bR", a12: "bK*" }, 1);
inCheck.check = 1;
inCheck.mMoves = [];
inCheck.GenerateMoves(game);
t.check("it may not be used to escape a check",
	inCheck.mMoves.filter((m) => m.f === inCheck.kings[1]).map(engine).sort(),
	["g1f1", "g1f2", "g1h1", "g1h2"]);

// "The King cannot capture when jumping"
t.ok("no capture by jump",
	movesFrom({ g1: "wK*", i1: "bR", a12: "bK*" }, 1, "g1").indexOf("g1i1") < 0);

// but the square it passes over may be occupied - that is the whole point of
// a leap, and the text says so explicitly
t.ok("the square passed over may be occupied",
	movesFrom({ g1: "wK*", h1: "wR", a12: "bK*" }, 1, "g1").indexOf("g1i1") >= 0);

/*
 * The intermediate square, which is where the two typos were. g1-i1 passes
 * over h1; j1 has nothing to do with it. The old table said [8,9] - it tested
 * j1 - so an attacked h1 did not stop the jump while an attacked j1 did.
 */
t.ok("an attacked h1 stops g1-i1",
	movesFrom({ g1: "wK*", h12: "bR", a12: "bK*" }, 1, "g1").indexOf("g1i1") < 0);
t.ok("an attacked j1 does not",
	movesFrom({ g1: "wK*", j12: "bR", a12: "bK*" }, 1, "g1").indexOf("g1i1") >= 0);
t.ok("Black: an attacked h12 stops g12-i12",
	movesFrom({ g12: "bK*", h1: "wR", a1: "wK*" }, -1, "g12").indexOf("g12i12") < 0);
t.ok("Black: an attacked j12 does not",
	movesFrom({ g12: "bK*", j1: "wR", a1: "wK*" }, -1, "g12").indexOf("g12i12") >= 0);

/* ---------------- Pawns ---------------- */

console.log("\nPawns");

// "the initial non-capturing double step is allowed for all Pawns"
t.check("a Pawn on its own square may step twice",
	movesFrom({ d4: "wP*", g1: "wK*", g12: "bK*" }, 1, "d4"), ["d4d5", "d4d6"]);
t.check("once it has moved, only one step",
	movesFrom({ d6: "wP", g1: "wK*", g12: "bK*" }, 1, "d6"), ["d6d7"]);
t.check("Black likewise", movesFrom({ i9: "bP*", g1: "wK*", g12: "bK*" }, -1, "i9"),
	["i9i8", "i9i7"].sort());
t.check("and Black once moved", movesFrom({ i7: "bP", g1: "wK*", g12: "bK*" }, -1, "i7"),
	["i7i6"]);

// "There is no en-passant capture."
t.ok("no en passant", Object.keys(types).every((k) => !types[k].epCatch));

/*
 * "when a Pawn reaches the opposite side of the board, it is replaced by the
 * piece corresponding to the file on which it lands. On the g-file (the
 * King's file), the Pawn is promoted to an Anqa."
 */
console.log("\npromotion by file");

const promotesTo = (square, side) => {
	const type = game.cbVar.promote(game, { t: side > 0 ? 0 : 2 },
		{ t: geo.PosByName(square) })[0];
	return types[type].name;
};
[["a", "roque"], ["b", "leon"], ["c", "unicornio"], ["d", "zaraffa"],
 ["e", "cockatrice"], ["f", "anqa"], ["g", "anqa"], ["h", "cockatrice"],
 ["i", "zaraffa"], ["j", "unicornio"], ["k", "leon"], ["l", "roque"]].forEach(
	([file, piece]) => {
		t.check("White on " + file + "12 becomes a " + piece, promotesTo(file + "12", 1), piece);
		t.check("Black on " + file + "1 becomes a " + piece, promotesTo(file + "1", -1), piece);
	});

/* ---------------- the pieces ---------------- */

console.log("\nthe pieces");

// "moves 1 diagonal step followed by any number away on lines or columns"
t.check("Anqa: 4 diagonal steps plus the rays beyond them",
	pattern("anqa", "f6").length, 40);

// "leaps like a Knight, then proceeds diagonally away from the square it
// leaped to any number of vacant squares"
t.check("Unicorn: the 8 knight squares plus the diagonals beyond",
	pattern("unicornio", "f6").length, 36);

// "leaps 3 squares orthogonally or 2 squares orthogonally followed by 1
// diagonal step" - the threeleaper and the camel
t.check("Lion: (3,0) and (3,1)", pattern("leon", "f6"),
	["c5", "c6", "c7", "e3", "e9", "f3", "f9", "g3", "g9", "i5", "i6", "i7"]);

// "the (3,2) leaper" - a Zebra in modern terms, not the modern Giraffe
t.check("Giraffe: the 8 (3,2) squares", pattern("zaraffa", "f6"),
	["c4", "c8", "d3", "d9", "h3", "h9", "i4", "i8"]);

// "identical to the modern chess Bishop"
t.check("Cockatrice is a Bishop", pattern("cockatrice", "f6").length, 21);

// "identical to the modern chess Rook, except there is no castling"
t.ok("no piece is declared castleable",
	Object.keys(types).every((k) => !types[k].castle));

/* ---------------- a game actually runs ---------------- */

console.log("\na game runs");

// Black's table held a position off the board (1140 on a 144-square board),
// which got past the "is the square empty" test and then threw inside
// cbGetAttackers. Any search reaching a Black-to-move node died, so no game
// could be started at all.
let seed = 12345;
const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

const board = H.newBoard(sandbox, game);
game.mPlayedMoves = [];
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
t.ok("both sides generate moves for " + plies + " plies", !crash);
if(crash)
	console.log("    " + crash.message);
t.check("the game got somewhere", plies, 60);

t.done("Grant Acedrex");
