/*
 * The two 4x5 arrangements, behind one prelude.
 *
 *   node tests/fairy/minichess4x5.test.js
 *
 * Mini and Micro were two model files, and merging them is a harder case than
 * the 5x5 trio: the two do not hold the same pieces nor the same number of
 * them. Mini has two Rooks, a Queen and four Pawns a side; Micro a Rook, a
 * Bishop, a Knight and ONE Pawn. Six Pawns a side have to leave the board, and
 * the promotion choice has to follow.
 *
 * The node counts below were taken from the two original models, running their
 * own GenerateMoves() from their own initial position, before those files were
 * removed - so a difference here is the merge having altered a game, not a
 * number drifting.
 *
 * Perft carries most of the weight, but not all of it: a promotion choice and
 * a castling right that only one arrangement has are settled by rules the
 * counts reach late or not at all, so they are checked directly.
 */

const H = require("./harness.js");
const t = H.runner();

const c = H.context(["base-model.js", "grid-geo-model.js", "prelude-model.js",
	"mini/minichess4x5-model.js"]);
const game = c.game, sandbox = c.sandbox, geo = game.cbVar.geometry;

const copy = (board) => {
	const fresh = Object.create(sandbox.Model.Board);
	fresh.Init && fresh.Init(game);
	fresh.CopyFrom(board);
	return fresh;
};
const play = (board, move) => {
	const next = copy(board);
	next.ApplyMove(game, move);
	next.mWho = -next.mWho;
	return next;
};
function perft(board, depth) {
	board.GenerateMoves(game);
	const moves = board.mMoves.slice();
	if(depth === 0)
		return 1;
	let nodes = 0;
	for(const move of moves)
		nodes += perft(play(board, move), depth - 1);
	return nodes;
}
// answer the prelude, then let Black pass the empty second stage
function choose(setup) {
	let board = play(H.newBoard(sandbox, game), { setup: setup });
	board.GenerateMoves(game);
	return play(board, board.mMoves[0]);
}

const ARRANGEMENTS = [
	{
		name: "Mini",
		fen: "rqkr/pppp/4/PPPP/RQKR",
		pieces: 16,
		kings: { "1": 2, "-1": 18 },
		promotes: ["rook", "queen"],
		castles: false,
		perft: [4, 18, 122, 785, 6245],
	},
	{
		name: "Micro",
		fen: "knbr/p3/4/3P/RBNK",
		pieces: 10,
		kings: { "1": 3, "-1": 16 },
		promotes: ["knight", "bishop", "rook"],
		castles: true,
		perft: [12, 110, 967, 8446, 77211],
	},
];

console.log("\nMiniChess 4x5: two arrangements behind one prelude");

const opening = H.newBoard(sandbox, game);
opening.GenerateMoves(game);
t.check("a new game opens on the two buttons",
	opening.mMoves.map((m) => m.setup), [0, 1]);
t.check("and they are named rather than drawn",
	game.cbVar.prelude[0].labels, ["Mini", "Micro"]);

for(let setup = 0; setup < ARRANGEMENTS.length; setup++) {
	const one = ARRANGEMENTS[setup];
	const board = choose(setup);

	t.check(one.name + ": the array its own model had",
		board.ExportBoardState(game).split(" ")[0], one.fen);
	// Micro's six missing Pawns are still in the piece list, parked off the
	// board the way captured pieces are - what must be right is how many stand
	// on it
	t.check(one.name + ": " + one.pieces + " men on the board",
		board.board.filter((i) => i >= 0).length, one.pieces);
	t.check(one.name + ": the Kings are where that array puts them",
		JSON.parse(JSON.stringify(board.kings)), one.kings);

	for(let depth = 1; depth <= one.perft.length; depth++)
		t.check(one.name + ": perft(" + depth + ")",
			perft(copy(board), depth), one.perft[depth - 1]);
}

/* ================= what each arrangement promotes to ================= */

/*
 * Mini promotes to a Rook or a Queen, Micro to a Knight, a Bishop or a Rook -
 * it owns no Queen. The list is not written in the model: the prelude builds
 * it from the pieces the chosen side actually has, which is why the custom
 * hook has to run before it (see prelude-model.js). Computed the other way
 * round, a Micro Pawn was offered a Queen that does not exist in its game.
 */
for(let setup = 0; setup < ARRANGEMENTS.length; setup++) {
	const one = ARRANGEMENTS[setup];
	choose(setup);
	const board = H.setup(sandbox, game, { b4: "wP", a1: "wK", d1: "bK" }, 1);
	board.lastMove.f = -1;   // H.setup re-arms the prelude a loaded game skips
	board.GenerateMoves(game);
	t.check(one.name + ": a Pawn on the last rank promotes to " + one.promotes.join(" or "),
		board.mMoves.filter((m) => geo.PosName(m.f) === "b4")
			.map((m) => game.cbVar.pieceTypes[m.pr].name), one.promotes);
}

/* ================= and whether it castles at all ================= */

for(let setup = 0; setup < ARRANGEMENTS.length; setup++) {
	const one = ARRANGEMENTS[setup];
	choose(setup);
	const board = H.setup(sandbox, game, { a1: "wR*", d1: "wK*", a5: "bK*" }, 1);
	board.lastMove.f = -1;
	board.GenerateMoves(game);
	const castling = board.mMoves.filter((m) => m.cg !== undefined);
	t.check(one.name + (one.castles ? ": the King castles d1-b1" : ": there is no castling"),
		castling.map((m) => geo.PosName(m.f) + "-" + geo.PosName(m.t)),
		one.castles ? ["d1-b1"] : []);
}

t.done("MiniChess 4x5");
