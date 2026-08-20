/*
 * Tenjiku Shogi move generation, counted.
 *
 *   node tests/shogi/tenjiku-perft.test.js
 *
 * A perft is a blunt instrument and a good one: it walks the move generator to
 * a fixed depth and counts, so any change in what the pieces may do shows up as
 * a different number, wherever it came from. This one used to live at the end
 * of the Janggi suite - the Janggi cannon needed two additions to the shared
 * base-model.js, and Tenjiku is one of the games built on the mechanisms that
 * were touched - which is a reason to run it, not a reason to keep it there.
 *
 * When a number below moves, find out which moves appeared or vanished before
 * changing it. tests/shogi/tenjiku-lions.test.js says what each piece is meant
 * to be able to do.
 */

const H = require("../fairy/harness.js");

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "locust-move-model.js",
	"shogi/tenjiku-shogi-model.js"];

const sandbox = H.loadModel(SCRIPTS);
const game = H.newGame(sandbox);

function perft(board, depth) {
	board.mMoves = [];
	board.GenerateMoves(game);
	if(depth <= 1)
		return board.mMoves.length;
	let nodes = 0;
	for(const move of board.mMoves) {
		const next = Object.create(sandbox.Model.Board);
		next.Init(game);
		next.CopyFrom(board);
		next.ApplyMove(game, move);
		next.mWho = -board.mWho;
		nodes += perft(next, depth - 1);
	}
	return nodes;
}
function fromTheStart(depth) {
	const board = Object.create(sandbox.Model.Board);
	board.Init(game);
	board.InitialPosition(game);
	board.mWho = 1;
	return perft(board, depth);
}

const t = H.runner();

console.log("\nperft from the initial position");

t.check("perft(1)", fromTheStart(1), 74);
/*
 * 5457 until the Lion, the Lion Hawk, the Free Eagle, the Soaring Eagle and
 * the Horned Falcon were given the last item of their Lion power - "stay in
 * place without capturing anything if one of the neighboring squares is
 * empty". The nine extra moves are exactly those passes: none is available at
 * the root, where every stinging square is occupied by a friendly piece, and
 * nine appear once a first move has cleared them. Counted, not assumed.
 */
t.check("perft(2)", fromTheStart(2), 5466);

// and the nine, named, so the number above is not a bare assertion
t.check("nine of those nodes are passes", (() => {
	const board = Object.create(sandbox.Model.Board);
	board.Init(game);
	board.InitialPosition(game);
	board.mWho = 1;
	board.mMoves = [];
	board.GenerateMoves(game);
	const roots = board.mMoves.slice();
	let passes = 0;
	for(const move of roots) {
		const next = Object.create(sandbox.Model.Board);
		next.Init(game);
		next.CopyFrom(board);
		next.ApplyMove(game, move);
		next.mWho = -board.mWho;
		next.mMoves = [];
		next.GenerateMoves(game);
		passes += next.mMoves.filter((reply) => reply.t === reply.f && reply.kill == null).length;
	}
	return passes;
})(), 9);
t.check("and none at the root, where every stinging square is occupied", (() => {
	const board = Object.create(sandbox.Model.Board);
	board.Init(game);
	board.InitialPosition(game);
	board.mWho = 1;
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves.filter((move) => move.t === move.f && move.kill == null).length;
})(), 0);

t.done("Tenjiku Shogi perft");
