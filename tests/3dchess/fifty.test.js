/*
 * The 50-move counter on the multiplan boards:
 *   node tests/3dchess/fifty.test.js
 *
 * base-model works out which piece types are Pawns by assuming they are
 * declared first: it walks the type list and stops at the first differing
 * abbrev. On these three boards the King opens the list, so the guess landed
 * on the King - a King move reset the counter and a Pawn move did not, which
 * is exactly backwards and made games drift into a draw while Pawns were
 * still advancing.
 *
 * cbPawnTypes may now also be given as an explicit list, and that is what the
 * three multiplan models do. The last block checks that the old threshold form
 * still behaves, on classic chess, where the Pawns really are declared first.
 *
 * The harness is the generic multiplan one, borrowed from the space-spartan
 * suite: it loads model scripts in a sandbox and drives Model.Board directly.
 */

const h = require("../space-spartan/harness.js");

const t = h.runner();

const GAMES = [
	{ name: "3dchess",       script: "3d/3dchess-model.js",       pawns: [6, 7, 8, 9] },
	{ name: "raumschach",    script: "3d/raumschach-model.js",    pawns: [6, 7] },
	{ name: "space-spartan", script: "3d/space-spartan-model.js", pawns: [6, 7, 8, 9] },
];

// play the first quiet move made by a piece of one of the given types
function playQuiet(board, game, types) {
	board.GenerateMoves(game);
	const move = board.mMoves.find((m) => {
		if(m.c != null || m.cg !== undefined) return false;
		const piece = board.pieces[board.board[m.f]];
		return types.indexOf(piece.t) >= 0;
	});
	if(!move) throw new Error("no quiet move by types " + types);
	const str = h.moveStr(board, game, move);		// before applying: the square empties
	board.ApplyMove(game, move);
	board.mWho = -board.mWho;
	return str;
}

GAMES.forEach((spec) => {
	console.log("\n-- " + spec.name + " --");
	const sb = h.loadModel(["base-model.js", "multiplan-geo-model.js", spec.script]);
	const game = h.newGame(sb);

	t.check("the Pawn types are declared, not guessed",
		Object.keys(game.cbPawnTypeSet).map(Number).sort((a, b) => a - b), spec.pawns);

	const kings = [];
	for(const ty in game.cbVar.pieceTypes)
		if(game.cbVar.pieceTypes[ty].isKing) kings.push(parseInt(ty));
	t.ok("the King is not one of them", kings.every((k) => !game.cbPawnTypeSet[k]));

	// from the opening position, a Pawn move must reset the counter
	const board = h.newBoard(sb, game);
	t.check("fresh position", board.noCaptCount, 0);
	playQuiet(board, game, spec.pawns);
	t.check("a Pawn move resets the counter", board.noCaptCount, 0);

	// and on a bare board, where the Kings are the only pieces with a move,
	// a King move must not
	const geo = game.cbVar.geometry;
	const bare = {};
	bare[geo.PosName(0)] = "wK";
	bare[geo.PosName(geo.boardSize - 1)] = "bK";
	const board2 = h.setup(sb, game, bare, 1);
	playQuiet(board2, game, kings);
	t.check("a King move does not", board2.noCaptCount, 1);
	playQuiet(board2, game, kings);
	t.check("nor does the next one", board2.noCaptCount, 2);
});

console.log("\n-- the threshold form still works (classic chess) --");
{
	const sb = h.loadModel(["base-model.js", "grid-geo-model.js", "famous/classic-model.js"]);
	const game = h.newGame(sb);
	const pawns = Object.keys(game.cbPawnTypeSet).map(Number).sort((a, b) => a - b);
	t.ok("the guessed Pawn types are real Pawns",
		pawns.length > 0 && pawns.every((ty) => {
			const T = game.cbVar.pieceTypes[ty];
			return !T.isKing && (T.epTarget || T.epCatch);
		}));

	const board = h.newBoard(sb, game);
	playQuiet(board, game, pawns);
	t.check("a Pawn move resets the counter", board.noCaptCount, 0);
	const knights = Object.keys(game.cbVar.pieceTypes).map(Number)
		.filter((ty) => /knight/.test(game.cbVar.pieceTypes[ty].name || ""));
	playQuiet(board, game, pawns);
	playQuiet(board, game, knights);
	t.check("a Knight move does not", board.noCaptCount, 1);
}

t.done("3dchess/fifty");
