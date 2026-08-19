/*
 * Khan's Chess rules: the five Horde pieces, the promotions, campmate,
 * stalemate-as-a-loss and the castling asymmetry.
 *
 *   node tests/khans/rules.test.js
 */

const H = require("../harness.js");

const sandbox = H.loadModel();
const game = H.newGame(sandbox);
const t = H.runner();

const setup = (pieces, who) => H.setup(sandbox, game, pieces, who);
const from = (board, square) => H.movesFrom(board, game, square);

/* ---------------- opening position ---------------- */

console.log("\nstart position");
{
	const board = H.newBoard(sandbox, game);
	t.check("32 pieces", board.pieces.filter((p) => p.p >= 0).length, 32);
	t.check("Horde back rank",
		["a8","b8","c8","d8","e8","f8","g8","h8"].map((sq) => {
			const piece = board.pieces[board.board[H.at(game, sq)]];
			return game.cbVar.pieceTypes[piece.t].abbrev;
		}),
		["L","H","A","T","K","A","H","L"]);
	t.check("scouts on the 7th rank",
		board.pieces.filter((p) => p.p >= 0 && game.cbVar.pieceTypes[p.t].abbrev === "S").length, 8);
	// The castling field is written generically by grid-geo-model.js
	// ("KQkq" as long as nobody has castled), exactly as for grand and
	// courier chess: the Horde owns no castleable piece, and
	// Fairy-Stockfish drops the unmatched "kq" itself when it reads the FEN
	// (verified against the engine: it echoes back "... b KQ - 0 1").
	game.mPlayedMoves = [];
	t.check("FEN", board.ExportBoardState(game),
		"lhatkahl/ssssssss/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
	t.check("20 first moves for the Kingdom", H.moves(board, game).length, 20);
}

/* ---------------- scout ---------------- */

console.log("\nscout");
{
	// lone scout on e5, white pawns on d4/f4 (its two diagonals) and e4
	// (straight ahead): only the 4 forward knight jumps are moves, and the
	// only capture is straight ahead.
	const board = setup({ e8: "bK", e1: "wK", e5: "bS", d4: "wP", f4: "wP" }, -1);
	t.check("moves as a forward knight", from(board, "e5"),
		["Se5-c4","Se5-d3","Se5-f3","Se5-g4"]);

	const board2 = setup({ e8: "bK", a1: "wK", e5: "bS", e4: "wP" }, -1);
	t.check("captures one square ahead", from(board2, "e5").filter((m) => m.indexOf("x") > 0),
		["Se5xe4"]);

	// it does NOT step forward onto an empty square
	const board3 = setup({ e8: "bK", a1: "wK", e5: "bS" }, -1);
	t.check("no plain forward step", from(board3, "e5").indexOf("Se5-e4"), -1);
	t.check("never backwards", from(board3, "e5").some((m) => /-[a-h][67]/.test(m)), false);
}

/* ---------------- khatun, archer, lancer: divergent ---------------- */

console.log("\ndivergent pieces");
{
	// khatun on d4, white pawn on d5 (adjacent, a king-capture) and on b5
	// (a knight jump away, must NOT be capturable)
	const board = setup({ e8: "bK", e1: "wK", d4: "bT", d5: "wP", b5: "wP" }, -1);
	const khatun = from(board, "d4");
	t.check("khatun captures as a king", khatun.indexOf("Td4xd5") >= 0, true);
	t.check("khatun does not capture on its knight squares", khatun.indexOf("Td4xb5"), -1);
	t.check("khatun moves as a knight", khatun.filter((m) => m.indexOf("-") > 0).sort(),
		["Td4-b3","Td4-c2","Td4-c6","Td4-e2","Td4-e6","Td4-f3","Td4-f5"]);

	// archer on d4: captures along the diagonals, at any distance
	const board2 = setup({ e8: "bK", e1: "wK", d4: "bA", g7: "wR" }, -1);
	const archer = from(board2, "d4");
	t.check("archer captures as a bishop, sliding", archer.indexOf("Ad4xg7") >= 0, true);
	t.check("archer cannot land on an empty diagonal square", archer.indexOf("Ad4-e5"), -1);
	t.check("archer moves as a knight", archer.filter((m) => m.indexOf("-") > 0).length, 8);

	// a friendly piece blocks the capture ray
	const board3 = setup({ e8: "bK", e1: "wK", d4: "bA", f6: "bS", g7: "wR" }, -1);
	t.check("archer ray blocked by own piece", from(board3, "d4").indexOf("Ad4xg7"), -1);

	// lancer on d4: captures along the ranks and files
	const board4 = setup({ e8: "bK", e1: "wK", d4: "bL", d7: "wR", h4: "wP" }, -1);
	const lancer = from(board4, "d4");
	t.check("lancer captures as a rook", [lancer.indexOf("Ld4xd7") >= 0, lancer.indexOf("Ld4xh4") >= 0],
		[true, true]);
	t.check("lancer does not capture diagonally",
		from(setup({ e8: "bK", e1: "wK", d4: "bL", f6: "wR" }, -1), "d4").indexOf("Ld4xf6"), -1);

	// kheshig: moves AND captures as knight+king
	const board5 = setup({ e8: "bK", e1: "wK", d4: "bH", d5: "wP", b5: "wP" }, -1);
	const kheshig = from(board5, "d4");
	t.check("kheshig captures on both patterns",
		[kheshig.indexOf("Hd4xd5") >= 0, kheshig.indexOf("Hd4xb5") >= 0], [true, true]);
	t.check("kheshig has 16 destinations on an open board",
		from(setup({ e8: "bK", e1: "wK", d4: "bH" }, -1), "d4").length, 16);
}

/* ---------------- checks ---------------- */

console.log("\nchecks");
{
	// the lancer checks along the file: with a spare white rook on the board,
	// every legal reply is still a king move
	const board = setup({ e1: "wK", e8: "bK", e4: "bL", a1: "wR" }, 1);
	t.check("lancer checks as a rook", H.moves(board, game).every((m) => m.indexOf("Ke1") === 0), true);

	// a knight jump away, the same lancer gives no check at all
	const board2 = setup({ e1: "wK", e8: "bK", d3: "bL", a1: "wR" }, 1);
	t.check("lancer gives no check on its knight squares",
		H.moves(board2, game).some((m) => m.indexOf("Ra1") === 0), true);

	// the scout attacks straight ahead only
	const board3 = setup({ e1: "wK", e8: "bK", d2: "bS" }, 1);
	t.check("scout does not check diagonally", H.inCheck(board3, game), false);
	const board4 = setup({ e1: "wK", e8: "bK", e2: "bS" }, 1);
	t.check("scout checks straight ahead", H.inCheck(board4, game), true);

	// the khatun checks as a king, not on its knight squares
	const board5 = setup({ e1: "wK", e8: "bK", e2: "bT" }, 1);
	t.check("khatun checks like a king", H.inCheck(board5, game), true);
	const board6 = setup({ e1: "wK", e8: "bK", d3: "bT" }, 1);
	t.check("khatun gives no check on its knight squares", H.inCheck(board6, game), false);
}

/* ---------------- promotions ---------------- */

console.log("\npromotions");
{
	// a scout on b2 reaches the last rank with its knight jump to d1
	const board = setup({ e1: "wK", e8: "bK", b2: "bS" }, -1);
	const promos = from(board, "b2").filter((m) => m.indexOf("=") > 0);
	t.check("scout promotes to a khatun only", promos.sort(), ["Sb2-d1=T"]);
	// ... and by capturing straight ahead too
	const boardX = setup({ e1: "wK", e8: "bK", b2: "bS", b1: "wR" }, -1);
	t.check("scout promotes on a capture", from(boardX, "b2").indexOf("Sb2xb1=T") >= 0, true);

	const board2 = setup({ e1: "wK", e8: "bK", b7: "wP", h5: "bS" }, 1);
	t.check("pawn promotes as in chess", from(board2, "b7").sort(),
		["Pb7-b8=B","Pb7-b8=N","Pb7-b8=Q","Pb7-b8=R"]);
}

/* ---------------- castling ---------------- */

console.log("\ncastling");
{
	const board = setup({ e1: "wK*", h1: "wR*", a1: "wR*", e8: "bK*", h8: "bL*", a8: "bL*" }, 1);
	t.check("the Kingdom castles both sides",
		H.moves(board, game).filter((m) => m.indexOf("(O-O)") > 0).length, 2);
	board.mWho = -1;
	t.check("the Horde never castles",
		H.moves(board, game).filter((m) => m.indexOf("(O-O)") > 0).length, 0);
}

/* ---------------- campmate ---------------- */

console.log("\ncampmate");
{
	// white king already on the 8th rank: game over, White wins
	const board = setup({ e8: "wK", b3: "bK", h4: "bL" }, -1);
	t.check("king on the last rank wins", H.outcome(board, game), "white");

	// khan on the 1st rank: game over, the Horde wins
	const board2 = setup({ e1: "bK", a6: "wK", h4: "wR" }, 1);
	t.check("khan on the first rank wins", H.outcome(board2, game), "black");

	// one move away, the game is still on, and the move exists
	const board3 = setup({ e7: "wK", b3: "bK" }, 1);
	t.check("still playing one rank short", H.outcome(board3, game), "playing");
	t.check("the campmate move is legal", from(board3, "e7").indexOf("Ke7-e8") >= 0, true);

	// ... but not into check: a lancer covering e8 forbids it
	const board4 = setup({ e7: "wK", b3: "bK", a8: "bL" }, 1);
	t.check("no campmate into check", from(board4, "e7").indexOf("Ke7-e8"), -1);
}

/* ---------------- stalemate is a loss ---------------- */

console.log("\nstalemate");
{
	// The khan on a8 is not in check, but a7/b7/b8 are all covered by the
	// white queen on b6, and it is the Horde's only piece.
	const board = setup({ a8: "bK", b6: "wQ", d1: "wK" }, -1);
	t.check("no move for the Horde", H.moves(board, game).length, 0);
	t.check("stalemate loses", H.outcome(board, game), "white");
}

t.done("Khan's Chess rules");
