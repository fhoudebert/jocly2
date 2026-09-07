/*
 * The three 5x5 arrangements, behind one prelude.
 *
 *   node tests/fairy/minichess5x5.test.js
 *
 * Gardner, Baby and Malett used to be three model files differing by five
 * lines. They are one file now, and the arrangement is chosen by a prelude,
 * which means the thing worth testing is that the merge changed nothing: each
 * choice must give back exactly the game its own model gave.
 *
 * The node counts below are not invented. They were taken from the three
 * original models, running their own GenerateMoves() from their own initial
 * position, before those files were removed - so a difference here is the
 * merge having altered a game, not a number drifting.
 *
 * Perft is the check rather than a look at the opening position because the
 * prelude rewrites piece TYPES on squares that already hold pieces. Getting
 * the letters right is the easy half; what the counts cover is everything
 * downstream of that rewrite - which piece the King now is, whose castling
 * table is in force, and whether the piece list was put back in order.
 */

const H = require("./harness.js");
const t = H.runner();

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "prelude-model.js",
	"mini/minichess5x5-model.js"];

const c = H.context(SCRIPTS);
const game = c.game, sandbox = c.sandbox;

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

// answer the prelude, then let Black pass the empty second stage, and hand
// back the board with White to move
function choose(setup) {
	let board = play(H.newBoard(sandbox, game), { setup: setup });
	board.GenerateMoves(game);
	return play(board, board.mMoves[0]);
}

const ARRANGEMENTS = [
	{
		name: "Gardner",
		fen: "rnbqk/ppppp/5/PPPPP/RNBQK",
		kings: { "1": 4, "-1": 24 },          // both on the e-file
		perft: [7, 53, 517, 4949, 55763],
	},
	{
		name: "Baby",
		fen: "kqbnr/ppppp/5/PPPPP/RNBQK",
		kings: { "1": 4, "-1": 20 },          // Black's back rank is mirrored
		perft: [7, 53, 515, 4882, 54019],
	},
	{
		name: "Malett",
		fen: "rbkqb/ppppp/5/PPPPP/RNKQN",
		kings: { "1": 2, "-1": 22 },          // both on the c-file
		perft: [8, 41, 446, 3398, 38675],
	},
];

console.log("\nMiniChess 5x5: three arrangements behind one prelude");

/* ================= the prelude itself ================= */

const opening = H.newBoard(sandbox, game);
opening.GenerateMoves(game);
t.check("a new game opens on the three buttons",
	opening.mMoves.map((m) => m.setup), [0, 1, 2]);
t.check("and they are named rather than drawn",
	game.cbVar.prelude[0].labels, ["Gardner", "Baby", "Malett"]);

/* ================= each arrangement ================= */

for(let setup = 0; setup < ARRANGEMENTS.length; setup++) {
	const one = ARRANGEMENTS[setup];
	const board = choose(setup);

	t.check(one.name + ": the array its own model had",
		board.ExportBoardState(game).split(" ")[0], one.fen);
	// the prelude re-types pieces in place, so the King is a different piece
	// afterwards in two of the three - cbPlacePieces has to have found it
	t.check(one.name + ": the Kings are where that array puts them",
		JSON.parse(JSON.stringify(board.kings)), one.kings);

	for(let depth = 1; depth <= one.perft.length; depth++)
		t.check(one.name + ": perft(" + depth + ")",
			perft(copy(board), depth), one.perft[depth - 1]);
}

/* ================= castling ================= */

/*
 * The castling table is the other thing the three files disagreed on, and it
 * travels by the prelude's declarative `castle` list rather than through the
 * custom hook. Gardner and Baby castle towards the King's own corner and land
 * it on c; Malett's King starts on c and lands on b.
 */
const CASTLING = [
	{ name: "Gardner", keys: ["4/0", "24/20"], king: [3, 2] },
	{ name: "Baby", keys: ["4/0", "20/24"], king: [3, 2] },
	{ name: "Malett", keys: ["2/0", "22/20"], king: [1] },
];

for(let setup = 0; setup < CASTLING.length; setup++) {
	const one = CASTLING[setup];
	choose(setup);   // choosing is what swaps the table
	t.check(one.name + ": its own castling table is in force",
		Object.keys(game.cbVar.castle), one.keys);
	t.check(one.name + ": the King's castling path",
		game.cbVar.castle[one.keys[0]].k, one.king);
}

/*
 * And it has to be playable, not just declared. Back rank cleared, Rook and
 * King unmoved, nothing attacking the squares the King crosses.
 *
 * H.setup() builds a board without going through Load(), so it re-arms the
 * prelude that choose() just answered - cbPreludeFromBoard only suppresses it
 * for a game loaded from a position. Clearing lastMove.f is what a loaded game
 * gets for free.
 */
choose(0);
const gardner = H.setup(sandbox, game, { a1: "wR*", e1: "wK*", e4: "bK*", a4: "bR*" }, 1);
gardner.lastMove.f = -1;
gardner.GenerateMoves(game);
t.check("Gardner: the King can still castle from e1 to c1",
	gardner.mMoves.some((m) => game.cbVar.geometry.PosName(m.f) === "e1"
		&& game.cbVar.geometry.PosName(m.t) === "c1"), true);

choose(2);
const malett = H.setup(sandbox, game, { a1: "wR*", c1: "wK*", a5: "bR*", e5: "bK*" }, 1);
malett.lastMove.f = -1;
malett.GenerateMoves(game);
t.check("Malett: the King castles from c1 to b1 instead",
	malett.mMoves.some((m) => game.cbVar.geometry.PosName(m.f) === "c1"
		&& game.cbVar.geometry.PosName(m.t) === "b1"), true);

t.done("MiniChess 5x5");
