/*
 * Timurid Chess, against the rules page shipped with it
 * (res/rules/duodecimal/timurid-rules.html).
 *
 *   node tests/chessbase/timurid.test.js
 *
 */

const H = require("./harness.js");

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "fairy-piece-model.js",
	"prelude-model.js", "duodecimal/timurid-model.js"];

const sandbox = H.loadModel(SCRIPTS);
const game = H.newGame(sandbox);
const geo = game.cbVar.geometry;
const types = game.cbVar.pieceTypes;
const constants = sandbox.Model.Game.cbConstants;

const engine = (move) =>
	Object.assign(Object.create(sandbox.Model.Move), move).ToString("engine");

const typeNamed = (name) => {
	for(const t in types)
		if(types[t].name === name)
			return parseInt(t);
	throw new Error("no piece named " + name);
};

// every square a piece reaches from one square of an empty board
function reach(name, square) {
	const from = geo.PosByName(square), out = new Set();
	(types[typeNamed(name)].graph[from] || []).forEach((line) => {
		for(const entry of line)
			if(entry & (constants.FLAG_MOVE | constants.FLAG_CAPTURE))
				out.add(entry & 0xffff);
	});
	return out.size;
}

/*
 * The game opens with a prelude in which the two players pick their pieces,
 * and GenerateMoves only offers those choices while lastMove.f is -2. A board
 * built by hand has to say the prelude is over.
 */
function movesFrom(pieces, square, who) {
	const board = H.setup(sandbox, game,
		Object.assign({ a1: "wK", l12: "bK" }, pieces), who || 1);
	board.lastMove = { f: -1, t: -1 };
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves.filter((move) => move.f === geo.PosByName(square)).map(engine).sort();
}

const t = H.runner();

/* ---------------- the board and the pieces ---------------- */

console.log("\nthe pieces");

t.check("a 12 x 12 board", [geo.width, geo.height], [12, 12]);

// "Griffon: moves one square diagonally and then, goes away ... vertically or
// horizontally"
t.check("Griffon: a diagonal step then a straight ray", reach("griffon", "g7"), 40);
// "Rhinoceros: it moves one square vertically or horizontally and then,
// slides away ... diagonally"
t.check("Rhinoceros: a straight step then a diagonal ray", reach("rhino", "g7"), 40);
// "Ship: moves one square diagonally and then, goes away ... vertically,
// never horizontally"
t.check("Ship: a diagonal step then a vertical ray", reach("ship", "g7"), 22);
// "Snake: moves one square vertically and then, slides away ... diagonally"
t.check("Snake: a vertical step then a diagonal ray", reach("snake", "g7"), 20);
// "Lion: it jumps on any square situated at 1 or 2 squares distance"
t.check("Lion: everything one or two squares away", reach("lion", "g7"), 24);
// "Squirrel: jumps at 2 squares"
t.check("Squirrel: the ring two squares out", reach("squirrel", "g7"), 16);
// "Wizard: a compound of the Ferz and the Camel"
t.check("Wizard: Ferz and Camel", reach("wizard", "g7"), 12);
// "Emir: combines the move of the Camel, the Knight and the ferz"
t.check("Emir: Camel, Knight and Ferz", reach("emir", "g7"), 20);
// "Admiral: a Rook that can also step one space diagonally"
t.check("Admiral: Rook and a King's step",
	reach("amiral", "g7"), reach("rook", "g7") + 4);
// "Elephant: moves one or two squares diagonally", jumping
t.check("Elephant: Ferz and Alfil", reach("elephant", "g7"), 8);
// "Camel: it jumps to the opposite case of a 2x4 rectangle"
t.check("Camel: the 8 (3,1) squares", reach("camel", "g7"), 8);
// "Prince: ... Like the Pawn, he can also move without capturing to the
// second square straight ahead"
t.check("Prince: eight neighbours and the second square ahead", reach("princew", "g7"), 9);

/* ---------------- the Pawn ---------------- */

console.log("\nthe Pawn keeps its double step, wherever it stands");

/*
 * Twelve ranks to cross: a Pawn restricted to the orthodox two-step-from-home
 * would take eleven moves to promote. Here it may always step twice, which is
 * a deliberate departure from the "exactly as in usual Chess" of the rules
 * page - and it stays non-jumping, so a piece in front still stops it dead.
 */
t.check("two steps from its own rank", movesFrom({ g3: "wP" }, "g3"), ["g3g4", "g3g5"]);
t.check("two steps further up the board too", movesFrom({ g7: "wP" }, "g7"), ["g7g8", "g7g9"]);
t.check("and for Black", movesFrom({ g10: "bP" }, "g10", -1), ["g10g8", "g10g9"]);
t.check("Black too, once it has left its rank",
	movesFrom({ g6: "bP" }, "g6", -1), ["g6g4", "g6g5"]);
t.check("it cannot jump the square in front", movesFrom({ g3: "wP", g4: "bN" }, "g3"), []);
t.check("blocked two ahead, it still steps one",
	movesFrom({ g3: "wP", g5: "bN" }, "g3"), ["g3g4"]);

// "Pawn: exactly as in usual Chess" - which includes en passant, and the
// Prince's double step is caught the same way
t.check("Pawns capture en passant",
	Object.keys(types).filter((k) => types[k].epCatch).map((k) => types[k].name).sort(),
	["ipawnb", "ipawnw"]);
t.check("Pawns and Princes can be caught by it",
	[...new Set(Object.keys(types).filter((k) => types[k].epTarget)
		.map((k) => types[k].name.replace(/[wb]$/, "").replace(/^i/, "")))].sort(),
	["pawn", "prince"]);

/* ---------------- promotion ---------------- */

console.log("\nthe promotions table");

const promotesTo = (name) => {
	const last = geo.height - 1, to = last * geo.width + 3;
	return (game.cbVar.promote(game, { t: typeNamed(name), s: 1, p: to - geo.width },
		{ t: to, f: to - geo.width, c: null }) || []).map((into) => types[into].name);
};
[["ipawnw", "queen"], ["ship", "griffon"], ["snake", "rhino"],
 ["squirrel", "lion"], ["wizard", "emir"], ["princew", "queen"]].forEach(([piece, into]) => {
	t.check(piece + " promotes to " + into, promotesTo(piece), [into]);
});
/*
 * The Admiral too. The table's first row carries three icons in one cell -
 * Pawn, Prince and crowned Rook, which is this game's Admiral - all pointing
 * at the Queen; read one icon per cell and the Admiral looks undocumented.
 */
t.check("the Admiral promotes to a Queen as well", promotesTo("amiral"), ["queen"]);
// and nothing else does
t.check("no other piece promotes",
	Object.keys(types).filter((k) => promotesTo(types[k].name).length
		&& ["ipawnw", "ipawnb", "ship", "snake", "squirrel", "wizard",
			"princew", "princeb", "amiral"].indexOf(types[k].name) < 0)
		.map((k) => types[k].name), []);

// "King: moves as in usual Chess, except there is no castling"
t.check("no castling", game.cbVar.castle, undefined);
t.check("no piece is declared castleable",
	Object.keys(types).filter((k) => types[k].castle), []);

/* ---------------- it runs ---------------- */

console.log("\nthe whole thing");

t.check("a saved position reloads unchanged", (() => {
	const start = H.newBoard(sandbox, game);
	const before = {};
	start.pieces.forEach((piece) => {
		if(piece.p >= 0) before[piece.p] = types[piece.t].name + "/" + piece.s;
	});
	const back = sandbox.Model.Game.Import("pjn", start.ExportBoardState(game)).initial;
	const after = {};
	(back.pieces || []).forEach((piece) => {
		after[piece.p] = types[piece.t].name + "/" + piece.s;
	});
	return Object.keys(before).filter((pos) => before[pos] !== after[pos]).length;
})(), 0);

t.check("a game runs", (() => {
	const play = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];
	let seed = 31, played = 0;
	const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
	while(played < 60) {
		play.mMoves = [];
		play.GenerateMoves(game);
		if(play.mMoves.length === 0)
			break;
		const move = play.mMoves[Math.floor(random() * play.mMoves.length)];
		play.ApplyMove(game, move);
		game.mPlayedMoves.push(move);
		play.mWho = -play.mWho;
		played++;
	}
	return played;
})(), 60);

t.done("Timurid Chess");
