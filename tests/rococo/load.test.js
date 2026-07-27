/*
 * Loading a saved position - pure Node:
 *   node tests/rococo/load.test.js
 *
 * A jocly match is saved as its starting position (a FEN-like string the base
 * model calls "pjn") plus the moves played, so every reload of a saved game
 * goes through Model.Game.Import. Two flaws in that importer left a reloaded
 * Rococo game unplayable, and neither showed up anywhere else:
 *
 *  - the piece type was taken from a `for...in` key, so it arrived as the
 *    STRING "5" instead of the number 5. Most chessbase games only ever use it
 *    to index `pieceTypes`, where a string key works; this family dispatches on
 *    it with a `switch`, which compares strictly - so no piece matched its own
 *    case and the position generated zero moves, i.e. it looked like a finished
 *    game the moment it was loaded.
 *  - a run of empty squares is exported as a decimal number, but read back one
 *    digit at a time, so the "10" of an empty 10x10 row skipped a single
 *    square. Every position on a board wider than nine files came back
 *    scrambled.
 *
 * Squares below are in board naming (a1..j10, edge ring included).
 */

const h = require("./harness.js");

let passed = 0, failed = 0;
function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if(a === e) passed++;
	else { failed++; console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a); }
}

const sb = h.loadModel(["base-model.js", "grid-geo-model.js", "ultima/baroque-core.js", "ultima/rococo-model.js"]);
const game = h.newGame(sb);
game.mPlayedMoves = [];		// ExportBoardState reports the move count from it

// the position of combo.test.js, written with multi-digit empty runs as the
// exporter produces them
const FEN = "10/10/10/10/8i1/1wC2l1sa1/8k1/10/1K8/10 w - - 0 1";

function load(fen) {
	const result = game.Import("pjn", fen);
	if(!result.status)
		throw new Error("import failed: " + result.error);
	game.mInitial = result.initial;
	const board = h.newBoard(sb, game);
	delete game.mInitial;
	board.mWho = result.initial.turn;
	return board;
}

/* --------------------------------------------------------- the two flaws */

const imported = game.Import("pjn", FEN).initial;

check("a piece type comes back as a number, not as an object key",
	imported.pieces.map((p) => typeof p.t).filter((t, i, all) => all.indexOf(t) === i),
	["number"]);

check("a ten-square empty row skips ten squares, not one",
	load(FEN).pieces.filter((p) => p.p >= 0).map((p) => h.bname(p.p)).sort(),
	["b2", "b5", "c5", "f5", "h5", "i4", "i5", "i6"]);

/* ------------------------------------------------ a loaded game is playable */

const board = load(FEN);

check("the loaded position is the intended one",
	h.census(board, game, h.bname).sort(),
	["bA@i5", "bI@i6", "bK@i4", "bL@f5", "bS@h5", "bW@b5", "wC@c5", "wK@b2"]);

board.GenerateMoves(game);
check("a loaded position generates moves - it is not taken for a finished game",
	board.mMoves.length > 0 && !board.mFinished, true);

check("and the Chameleon combination survives the round trip",
	h.movesFrom(board, game, h.bpos("c5"), h.bname).filter((m) => m.indexOf("<>") >= 0),
	["Cc5<>h5xb5,f5,i5"]);

/* ------------------------------------------------------------- round trip */

{
	const fresh = h.newBoard(sb, game);
	const exported = fresh.ExportBoardState(game, "fen");
	const reloaded = load(exported);
	check("the opening position exports and imports back unchanged",
		h.census(reloaded, game, h.bname), h.census(fresh, game, h.bname));
	reloaded.GenerateMoves(game);
	fresh.GenerateMoves(game);
	check("and generates the same moves as the position it came from",
		reloaded.mMoves.length, fresh.mMoves.length);
}

{
	const after = load(FEN);
	after.GenerateMoves(game);
	const combo = after.mMoves.filter((m) => m.swap != null)[0];
	after.ApplyMove(game, combo);
	const reloaded = load(after.ExportBoardState(game, "fen"));
	check("a position reached by the combination also survives a save and reload",
		h.census(reloaded, game, h.bname), h.census(after, game, h.bname));
}

console.log((failed ? "FAILED - " : "OK - ") + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
