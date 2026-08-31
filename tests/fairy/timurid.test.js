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

const timurid = H.context(SCRIPTS);
const sandbox = timurid.sandbox, game = timurid.game;
const geo = timurid.geo, types = timurid.types;
const engine = timurid.engine, typeNamed = timurid.typeNamed, reach = timurid.reach;

/*
 * Not the shared context's movesFrom: this game opens with a prelude in which
 * the two players pick their pieces, and GenerateMoves only offers those
 * choices while lastMove.f is -2, so a board built by hand has to say the
 * prelude is over. It also answers in move strings, which is what the checks
 * below read.
 */
function movesFrom(pieces, square, who) {
	const board = H.setup(sandbox, game,
		Object.assign({ a1: "wK", l10: "bK" }, pieces), who || 1);
	board.lastMove = { f: -1, t: -1 };
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves.filter((move) => move.f === geo.PosByName(square)).map(engine).sort();
}

const t = H.runner();

/* ---------------- the board and the pieces ---------------- */

console.log("\nthe pieces");

t.check("a 12 x 10 board", [geo.width, geo.height], [12, 10]);

// "Griffon: moves one square diagonally and then, goes away ... vertically or
// horizontally"
t.check("Griffon: a diagonal step then a straight ray", reach("griffon", "g5"), 36);
// "Rhinoceros: it moves one square vertically or horizontally and then,
// slides away ... diagonally"
t.check("Rhinoceros: a straight step then a diagonal ray", reach("rhino", "g5"), 35);
// "Ship: moves one square diagonally and then, goes away ... vertically,
// never horizontally"
t.check("Ship: a diagonal step then a vertical ray", reach("ship", "g5"), 18);
// "Snake: moves one square vertically and then, slides away ... diagonally"
t.check("Snake: a vertical step then a diagonal ray", reach("snake", "g5"), 16);
// "Lion: it jumps on any square situated at 1 or 2 squares distance"
t.check("Lion: everything one or two squares away", reach("lion", "g5"), 24);
// "Squirrel: jumps at 2 squares"
t.check("Squirrel: the ring two squares out", reach("squirrel", "g5"), 16);
// The Machine of the other Cazaux games, in the Samarkand setups where the
// Wizard used to stand: Wazir plus Dabbaba, so eight squares in the open.
t.check("Machine: Wazir and Dabbaba", reach("machine", "g5"), 8);
// The Emir keeps its name, letter and appearance but moves as an Osprey now:
// a two-square orthogonal leap, then a diagonal ride away from the start.
t.check("Emir: an Osprey, leap then diagonal ride", reach("emir", "g5"), 28);
// It leaps, so a piece on the square in between changes nothing: g7 is still
// reachable, and so is the diagonal ride that starts there.
t.check("Emir: the square leapt over is irrelevant",
	movesFrom({ g5: "wC", g6: "wP" }, "g5").indexOf("g5g7") >= 0, true);
t.check("Emir: but the square it lands on does block the ride",
	movesFrom({ g5: "wC", g7: "bP" }, "g5").filter((m) => /^g5[hf]8$/.test(m)), []);
// "Admiral: a Rook that can also step one space diagonally"
t.check("Admiral: Rook and a King's step",
	reach("amiral", "g5"), reach("rook", "g5") + 4);
// "Elephant: moves one or two squares diagonally", jumping
t.check("Elephant: Ferz and Alfil", reach("elephant", "g5"), 8);
// "Camel: it jumps to the opposite case of a 2x4 rectangle"
t.check("Camel: the 8 (3,1) squares", reach("camel", "g5"), 8);
// The rules page gives the Prince a Pawn-like second step forward. It is
// dropped here: ten ranks are short enough that the head start is not needed,
// and it was the only reason any piece but a Pawn had to be capturable en
// passant. What is left is a King's move.
t.check("Prince: a King's move, no second step", reach("princew", "g5"), 8);
t.check("Prince: and it is the same for Black", reach("princeb", "g5"), 8);

/* ---------------- the Pawn ---------------- */

console.log("\nthe Pawn keeps its double step, wherever it stands");

/*
 * Ten ranks to cross: a Pawn restricted to the orthodox two-step-from-home
 * would take nine moves to promote. Here it may always step twice, which is
 * a deliberate departure from the "exactly as in usual Chess" of the rules
 * page - and it stays non-jumping, so a piece in front still stops it dead.
 */
t.check("two steps from its own rank", movesFrom({ g3: "wP" }, "g3"), ["g3g4", "g3g5"]);
t.check("two steps further up the board too", movesFrom({ g6: "wP" }, "g6"), ["g6g7", "g6g8"]);
t.check("and for Black", movesFrom({ g9: "bP" }, "g9", -1), ["g9g7", "g9g8"]);
t.check("Black too, once it has left its rank",
	movesFrom({ g6: "bP" }, "g6", -1), ["g6g4", "g6g5"]);
t.check("it cannot jump the square in front", movesFrom({ g3: "wP", g4: "bN" }, "g3"), []);
t.check("blocked two ahead, it still steps one",
	movesFrom({ g3: "wP", g5: "bN" }, "g3"), ["g3g4"]);

// "Pawn: exactly as in usual Chess" - which includes en passant. Now that the
// Prince has lost its double step, Pawns are the only pieces on either side of
// it, which is what lets the Fairy-Stockfish variant drop enPassantTargetTypes.
t.check("Pawns capture en passant",
	Object.keys(types).filter((k) => types[k].epCatch).map((k) => types[k].name).sort(),
	["ipawnb", "ipawnw"]);
t.check("and only Pawns can be caught by it",
	[...new Set(Object.keys(types).filter((k) => types[k].epTarget)
		.map((k) => types[k].name.replace(/[wb]$/, "").replace(/^i/, "")))].sort(),
	["pawn"]);

/* ---------------- promotion ---------------- */

console.log("\nthe promotions table");

const promotesTo = (name) => {
	const last = geo.height - 1, to = last * geo.width + 3;
	return (game.cbVar.promote(game, { t: typeNamed(name), s: 1, p: to - geo.width },
		{ t: to, f: to - geo.width, c: null }) || []).map((into) => types[into].name);
};
[["ipawnw", "queen"], ["ship", "griffon"], ["snake", "rhino"],
 ["squirrel", "lion"], ["machine", "emir"], ["princew", "queen"]].forEach(([piece, into]) => {
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
		&& ["ipawnw", "ipawnb", "ship", "snake", "squirrel", "machine",
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
