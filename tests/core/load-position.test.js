/*
 * Rebuilding a game somewhere else - needs a build first:
 *   npx gulp build && node tests/core/load-position.test.js
 *
 * Unlike the model suites this one exercises the core, so it runs against the
 * built package rather than the sources.
 *
 * A match is handed to other threads and frames several times over its life:
 * to the AI worker on every search, to the embedded view when it attaches, and
 * back again when it detaches. Each of those rebuilds the game from scratch and
 * replays the moves played so far. All four of them used to send the moves
 * alone - and the moves alone are not the game. A match started from a given
 * position (a loaded save, a set-up board) was replayed onto the standard
 * opening instead, so the first move sent across failed to match anything and
 * the search died with "invalid-move".
 *
 * It surfaced on an Ultima position where a frozen Chameleon takes itself off
 * the board, but nothing about it is specific to that move or that game: the
 * first move played from any loaded position did it.
 */

let Jocly;
try {
	Jocly = require("../..");
} catch(e) {
	console.log("SKIP - no build yet: run npx gulp build first");
	process.exit(0);
}

let passed = 0, failed = 0;
function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if(a === e) passed++;
	else { failed++; console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a); }
}

// White has four pieces frozen by the Immobilizer on g3; the Chameleon on f3
// is one of them, and its only move is to remove itself
const FEN = "4P3/8/2K1k3/7X/4P2C/5Xi1/1p4PL/5L2 w - - 5 64";
const board = (game) => game.mBoard.ExportBoardState(game, "fen").split(" ")[0];

(async () => {
	const match = await Jocly.createMatch("ultima");
	await match.load({ game: "ultima", initialBoard: FEN, playedMoves: [] });

	check("the position loads", board(match.game), FEN.split(" ")[0]);
	check("and the game remembers where it started",
		typeof match.game.mInitialString === "string" && match.game.mInitialString.length > 0, true);

	const moves = await match.getPossibleMoves();
	const suicide = moves.filter((m) => m.suicide && m.a === "X")[0];
	check("the frozen Chameleon offers to remove itself", suicide !== undefined, true);

	await match.applyMove(suicide);
	const reached = board(match.game);
	check("playing it takes it off the board", reached.split("/")[5], "6i1");

	// what each transport now sends, and what it used to send
	const sent = { initialBoard: match.game.mInitialString, playedMoves: match.game.mPlayedMoves };

	{
		const rebuilt = await Jocly._createInternalGame("ultima", {});
		rebuilt.mBoard.mMoves = [];
		rebuilt.Load({ initialBoard: sent.initialBoard, playedMoves: sent.playedMoves });
		check("rebuilt elsewhere, the game is the same game", board(rebuilt), reached);
	}

	{
		const rebuilt = await Jocly._createInternalGame("ultima", {});
		rebuilt.mBoard.mMoves = [];
		let error = null;
		try {
			rebuilt.Load({ playedMoves: sent.playedMoves });
		} catch(e) {
			error = e.message || String(e);
		}
		// pins the reason: without the starting position the replay lands on the
		// opening, where that move does not exist
		check("without the starting position it cannot be replayed", error, "invalid-move");
	}

	console.log((failed ? "FAILED - " : "OK - ") + passed + " passed, " + failed + " failed");
	process.exit(failed ? 1 : 0);
})().catch((e) => {
	console.log("FAILED - " + (e.message || e));
	process.exit(1);
});
