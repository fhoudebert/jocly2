/*
 * Consistency tests for the Ultima model - pure Node:
 *   node tests/ultima/consistency.test.js
 *
 * 1. random playouts, checking after *every* generated move that
 *    cbQuickApply + cbQuickUnapply restore the position and the Zobrist
 *    signature exactly (this is what the multi-victim `kills` array touches);
 * 2. perft counts from the initial position. These are regression anchors
 *    produced by this very implementation - they are NOT cross-checked
 *    against another Ultima program, so they guard against changes, not
 *    against a shared misreading of the rules.
 */

const h = require("./harness.js");

let passed = 0, failed = 0;

function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if(a === e)
		passed++;
	else {
		failed++;
		console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a);
	}
}

const sb = h.loadModel(["base-model.js", "grid-geo-model.js", "ultima/ultima-model.js"]);
const game = h.newGame(sb);

/* ------------------------------------------------------------- playouts */

function playout(seed, maxPlies) {
	const board = h.newBoard(sb, game);
	let rnd = seed;
	const next = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff);
	let plies = 0, captures = 0, multi = 0;

	for(; plies < maxPlies; plies++) {
		board.GenerateMoves(game);
		if(board.mFinished || board.mMoves.length == 0)
			break;

		// undo integrity, on every single move of this position
		const before = h.census(board, game);
		const sign = board.zSign;
		for(const move of board.mMoves) {
			const undo = board.cbQuickApply(game, move);
			board.cbQuickUnapply(game, undo);
			if(board.zSign != sign)
				return { error: "zSign not restored at ply " + plies };
			if(JSON.stringify(h.census(board, game)) != JSON.stringify(before))
				return { error: "position not restored at ply " + plies };
		}

		const move = board.mMoves[next() % board.mMoves.length];
		const victims = (move.kills ? move.kills.length : 0) + (move.c != null ? 1 : 0);
		if(victims) captures++;
		if(victims > 1) multi++;
		const pieceCount = before.length;
		board.ApplyMove(game, move);
		board.mWho = -board.mWho;
		if(h.census(board, game).length != pieceCount - victims)
			return { error: "wrong piece count after apply at ply " + plies };
	}
	return { plies, captures, multi, finished: !!board.mFinished, winner: board.mWinner };
}

{
	let totalCaptures = 0, totalMulti = 0, errors = [];
	for(let seed = 1; seed <= 20; seed++) {
		const res = playout(seed, 60);
		if(res.error)
			errors.push("seed " + seed + ": " + res.error);
		else {
			totalCaptures += res.captures;
			totalMulti += res.multi;
		}
	}
	check("playouts: no undo or bookkeeping error over 20 games", errors, []);
	check("playouts: captures did occur", totalCaptures > 0, true);
	check("playouts: multi-piece captures did occur", totalMulti > 0, true);
	console.log("  (" + totalCaptures + " capturing moves played, " + totalMulti + " of them removing several pieces)");
}

/* ---------------------------------------------------------------- perft */

function perft(board, depth) {
	board.GenerateMoves(game);
	const moves = board.mMoves;
	if(depth <= 1)
		return moves.length;
	let total = 0;
	for(const move of moves) {
		const undo = board.cbQuickApply(game, move);
		board.mWho = -board.mWho;
		total += perft(board, depth - 1);
		board.mWho = -board.mWho;
		board.cbQuickUnapply(game, undo);
	}
	return total;
}

{
	const board = h.newBoard(sb, game);
	check("perft(1) from the initial position", perft(board, 1), 32);
	const board2 = h.newBoard(sb, game);
	// 944 is hand-checkable: 32 white Pawn moves, and a white Pawn landing on
	// rank r shortens the black Pawn of that file by (r-2) replies, so
	// 32*32 - 8*(1+2+3+4) = 944.
	check("perft(2) from the initial position", perft(board2, 2), 944);
	const board3 = h.newBoard(sb, game);
	check("perft(3) from the initial position", perft(board3, 3), 42762);
}

console.log((failed ? "FAILED" : "OK") + " - " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
