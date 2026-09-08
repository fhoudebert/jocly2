/*
 * Horde: the rules a move count cannot see.
 *
 *   node tests/fairy/horde.test.js
 *
 * tests/fairy/horde-perft.test.js already compares the move generator against
 * Fairy-Stockfish position by position, so nothing here counts moves for their
 * own sake. What is left is everything that happens at the edges of the game -
 * who has won, and why - plus the two structural oddities the variant rests
 * on: a side with no King, and three white Pawn types where a FEN writes one
 * letter.
 */

const H = require("./harness.js");

const cz = H.context(["base-model.js", "grid-geo-model.js", "standard/horde-model.js"]);
const { sandbox, game } = cz;
const t = H.runner();

const START = "rnbqkbnr/pppppppp/8/1PP2PP1/PPPPPPPP/PPPPPPPP/PPPPPPPP/PPPPPPPP w kq - 0 1";

// Horde has three white Pawn types sharing the letter P, and the harness's
// piece notation cannot tell them apart - the rank does, which is exactly what
// the model's importGame() encodes. So positions are written as FENs.
function fromFen(fen) {
	const result = game.Import("pjn", fen);
	if(!result.status) throw new Error("rejected: " + fen);
	game.mInitial = result.initial;
	const board = H.newBoard(sandbox, game);
	delete game.mInitial;
	return board;
}

// squares as indices: b1 = 1, b2 = 9, b3 = 17
const typeName = (board, pos) =>
	game.cbVar.pieceTypes[board.pieces[board.board[pos]].t].name;

/* ------------------------------------------------------------ the array */

const start = H.newBoard(sandbox, game);
game.mPlayedMoves = [];

t.check("the opening FEN is Fairy-Stockfish's own", start.ExportBoardState(game), START);

const white = {};
start.pieces.forEach((p) => {
	if(p.s == 1 && p.p >= 0) {
		const n = game.cbVar.pieceTypes[p.t].name;
		white[n] = (white[n] || 0) + 1;
	}
});
t.check("36 Pawns and nothing else", white, { "hpawn-w": 8, "ipawn-w": 8, "pawn-w": 20 });
t.check("White has no King", start.kings[1], undefined);
t.check("Black does", start.kings[-1] !== undefined, true);

/* -------------------------------------------------- a side with no King */

// The whole variant rests on this: without Model.Game.cbKingless, base-model's
// fast path hands cbGetAttackers an undefined square and move generation
// throws on the first move.
t.check("the model declares its royal-less side", game.cbKingless, true);

// White cannot be checked, so a Pawn Black attacks is not pinned to anything
// and may walk away, or be left where it stands.
let board = fromFen("4k3/8/8/8/7q/8/8/1P6 w - - 0 1");
t.check("a King-less side is never in check", H.movesFrom(board, game, "b1"),
	["Pb1-b2=P", "Pb1-b3=P"]);

/* ------------------------------------------------------------- verdicts */

// Losing the last Pawn is a loss, not a stalemate - and it has to be seen on
// the turn it happens, whoever is to move.
board = fromFen("4k3/8/8/8/8/8/8/1P6 b - - 0 1");
t.check("with a Pawn left, the game is on", H.outcome(board, game), "playing");

board = fromFen("1q2k3/8/8/8/8/8/8/1P6 b - - 0 1");
H.play(board, game, "Qb8xb1");
t.check("the last Pawn captured, on Black's move", H.outcome(board, game), "black");

board = fromFen("4k3/8/8/8/8/8/8/8 w - - 0 1");
t.check("and equally when it is White's turn to find nothing", H.outcome(board, game), "black");
t.check("a decided position offers no moves", (board.mMoves || []).length, 0);

// Stalemate stays a draw. White has a Pawn, so it has not lost; it just has
// nowhere to go.
board = fromFen("4k3/8/8/8/8/8/1p6/1P6 w - - 0 1");
t.check("White with a Pawn and no move is stalemate", H.outcome(board, game), "draw");

// White wins the ordinary way.
board = fromFen("7k/8/5P2/8/8/8/6Q1/8 w - - 0 1");
H.play(board, game, "Qg2-g7");
t.check("checkmate still wins for White", H.outcome(board, game), "white");

/* ------------------------------------------------ the first-rank Pawn */

// A Pawn that walks from the first rank to the second has not spent its double
// step: it has arrived on the rank that normally grants one, and that one does
// leave an en passant square behind it.
board = fromFen("4k3/8/8/8/8/8/8/1P6 w - - 0 1");
t.check("on the first rank it is the type without en passant", typeName(board, 1), "hpawn-w");
let after = H.play(board, game, "Pb1-b2=P");
t.check("stepping to the second rank makes it the ordinary initial Pawn",
	typeName(after, 9), "ipawn-w");

board = fromFen("4k3/8/8/8/8/8/8/1P6 w - - 0 1");
after = H.play(board, game, "Pb1-b3=P");
t.check("stepping two makes it an ordinary Pawn", typeName(after, 17), "pawn-w");

// Promotion is White's whole plan and works from any of the three types.
board = fromFen("4k3/6P1/8/8/8/8/8/8 w - - 0 1");
t.check("a Pawn on the seventh rank promotes to the usual four",
	H.movesFrom(board, game, "g7").length, 4);

/* ----------------------------------------------------------------- FEN */

// White has no King and no Rook, so it has no rights to write. base-model
// derives the field from "has this side castled yet" and would claim "KQ" for
// pieces that are not on the board; jocly.fairy.js sends this string straight
// to the engine.
t.check("White claims no castling rights", start.ExportBoardState(game).split(" ")[2], "kq");

// Black's field is base-model's own approximation - it records "has this side
// castled yet", not where the King and Rooks actually stand - so it still says
// "kq" here. That is pre-existing and shared with every chessbase game; what
// matters is that the engine reads the exported string, which
// tests/fairy/horde-perft.test.js checks by feeding it exactly that.
board = fromFen("4k3/8/8/8/8/8/8/1P6 w - - 0 1");
game.mPlayedMoves = [];
t.check("and never writes White's, whatever Black's says",
	/[KQ]/.test(board.ExportBoardState(game).split(" ")[2]), false);

// Round trip: the three white types are rebuilt from the ranks, so exporting
// and re-importing the opening array gives the opening array back.
t.check("the opening array survives a round trip",
	fromFen(START).ExportBoardState(game), START);

// The black side of the same flattening: a Pawn read on the third rank is not
// an initial Pawn and does not step two squares to the first.
board = fromFen("4k3/8/8/8/8/2p5/8/7P b - - 0 1");
t.check("a black Pawn read off the third rank steps once",
	H.movesFrom(board, game, "c3"), ["Pc3-c2"]);

t.done("Horde");
