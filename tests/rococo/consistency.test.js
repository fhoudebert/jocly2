/*
 * Consistency tests - pure Node:
 *   node tests/rococo/consistency.test.js
 *
 * Random playouts checking that cbQuickApply + cbQuickUnapply restore the
 * position and the Zobrist signature after every generated move (this is what
 * the multi-victim `kills` array and the edge filter touch), plus perft
 * anchors from the initial position. The anchors are produced by this
 * implementation - they guard against regressions, not against a shared
 * misreading of the rules. Swapper and Chameleon generate no moves yet, so
 * these games are of a reduced variant; only engine bookkeeping is asserted.
 */

const h = require("./harness.js");

let passed = 0, failed = 0;
function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if(a === e) passed++;
	else { failed++; console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a); }
}

const sb = h.loadModel(["base-model.js", "grid-geo-model.js", "rococo-model.js"]);
const game = h.newGame(sb);

/* ------------------------------------------------------------ playouts */

function playout(seed, maxPlies) {
	const board = h.newBoard(sb, game);
	let rnd = seed;
	const next = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff);
	let captures = 0, multi = 0;

	for(let ply = 0; ply < maxPlies; ply++) {
		board.GenerateMoves(game);
		if(board.mFinished || board.mMoves.length === 0)
			break;

		const before = h.census(board, game), sign = board.zSign;
		for(const move of board.mMoves) {
			const undo = board.cbQuickApply(game, move);
			board.cbQuickUnapply(game, undo);
			if(board.zSign !== sign)
				return { error: "zSign not restored at ply " + ply };
			if(JSON.stringify(h.census(board, game)) !== JSON.stringify(before))
				return { error: "position not restored at ply " + ply };
		}

		const move = board.mMoves[next() % board.mMoves.length];
		const v = (move.kills ? move.kills.length : 0) + (move.c != null ? 1 : 0);
		if(v) captures++;
		if(v > 1) multi++;
		const count = before.length;
		board.ApplyMove(game, move);
		board.mWho = -board.mWho;
		if(h.census(board, game).length !== count - v)
			return { error: "wrong piece count after apply at ply " + ply };
	}
	return { captures, multi };
}

{
	let errors = [], caps = 0, multi = 0;
	for(let seed = 1; seed <= 20; seed++) {
		const r = playout(seed, 80);
		if(r.error) errors.push("seed " + seed + ": " + r.error);
		else { caps += r.captures; multi += r.multi; }
	}
	check("playouts: no undo or bookkeeping error over 20 games", errors, []);
	check("playouts: captures occurred", caps > 0, true);
	check("playouts: multi-piece captures occurred", multi > 0, true);
	console.log("  (" + caps + " capturing moves played, " + multi + " removing several pieces)");
}

/* --------------------------------------------------------------- perft */

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

check("perft(1) from the initial position", perft(h.newBoard(sb, game), 1), 22);
check("perft(2) from the initial position", perft(h.newBoard(sb, game), 2), 484);

console.log((failed ? "FAILED" : "OK") + " - " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
