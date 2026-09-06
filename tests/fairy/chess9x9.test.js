/*
 * The two 9x9 variants, behind one prelude.
 *
 *   node tests/fairy/chess9x9.test.js
 *
 * Modern (Maura, 1968) and Chancellor (Foster, 1889) were two model files.
 * Merging them is the first case where what differs is not only the array but
 * a RULE: Modern lets a player once per game exchange a Bishop with the piece
 * beside it, and Chancellor does not. The rule is three overrides of
 * Model.Board, so most of this file is about making sure it is on in exactly
 * one of the two.
 *
 * The node counts were taken from the two original models, running their own
 * GenerateMoves() from their own initial position, before those files were
 * removed - so a difference here is the merge having altered a game.
 *
 * The last section is the one that decides whether the merge was safe. A flag
 * set when the prelude is answered would leak: a position loaded mid-game
 * skips the prelude, and the flag would still say whatever the previous game
 * chose. So the rule is read off the position - only Modern has Ministers, and
 * a captured piece stays in the piece list - and that is what these cases
 * check, by loading each variant's position after answering the prelude with
 * the OTHER one.
 */

const H = require("./harness.js");
const t = H.runner();

const c = H.context(["base-model.js", "grid-geo-model.js", "prelude-model.js",
	"knighted/chess9x9-model.js"]);
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
function choose(setup) {
	let board = play(H.newBoard(sandbox, game), { setup: setup });
	board.GenerateMoves(game);
	return play(board, board.mMoves[0]);
}

// A swap lands on a square held by one's own piece, which no ordinary move
// ever does - that is what identifies it, not the piece letter.
function swapsFrom(position) {
	const board = H.setup(sandbox, game, position, 1);
	board.lastMove.f = -1;   // H.setup re-arms the prelude a loaded game skips
	board.GenerateMoves(game);
	return board.mMoves
		.filter((m) => board.board[m.t] >= 0 && board.pieces[board.board[m.t]].s === 1)
		.map((m) => geo.PosName(m.f) + "-" + geo.PosName(m.t)).sort();
}

const ARRANGEMENTS = [
	{
		name: "Modern",
		fen: "rnbqkmbnr/ppppppppp/9/9/9/9/9/PPPPPPPPP/RNBMKQBNR",
		promotes: ["knight", "bishop", "rook", "queen", "minister"],
		perft: [28, 784, 23679, 713609],
	},
	{
		name: "Chancellor",
		fen: "rnbqkcnbr/ppppppppp/9/9/9/9/9/PPPPPPPPP/RNBQKCNBR",
		promotes: ["knight", "bishop", "rook", "queen", "chancellor"],
		perft: [24, 576, 15896, 436656],
	},
];

console.log("\nChess 9x9: two variants behind one prelude");

const opening = H.newBoard(sandbox, game);
opening.GenerateMoves(game);
t.check("a new game opens on the two buttons",
	opening.mMoves.map((m) => m.setup), [0, 1]);
t.check("and they are named rather than drawn",
	game.cbVar.prelude[0].labels, ["Modern", "Chancellor"]);

for(let setup = 0; setup < ARRANGEMENTS.length; setup++) {
	const one = ARRANGEMENTS[setup];
	const board = choose(setup);

	t.check(one.name + ": the array its own model had",
		board.ExportBoardState(game).split(" ")[0], one.fen);
	// each variant promotes to the compound piece it owns, and the list is
	// built by the prelude from the pieces on the board rather than written
	// into the model
	t.check(one.name + ": a Pawn promotes to " + one.promotes[4],
		game.cbVar.prelude[0].participants.map((type) => game.cbVar.pieceTypes[type].name),
		one.promotes);

	for(let depth = 1; depth <= one.perft.length; depth++)
		t.check(one.name + ": perft(" + depth + ")",
			perft(copy(board), depth), one.perft[depth - 1]);
}

/* ================= the bishop swap belongs to Modern alone ================= */

// Modern's opening count is Chancellor's 24 plus the four swaps its two
// Bishops can make; that is where the difference at depth 1 comes from.
choose(0);
const modernOpening = H.newBoard(sandbox, game);
t.check("Modern: the four opening swaps are what its extra moves are",
	swapsFrom({ c1: "wB*", d1: "wM*", b1: "wN*", e1: "wK*", e9: "bK*" }),
	["c1-b1", "c1-d1"]);

choose(1);
t.check("Chancellor: none, even with the same men around the Bishop",
	swapsFrom({ c1: "wB*", d1: "wQ*", b1: "wN*", e1: "wK*", e9: "bK*" }), []);

/*
 * And the rule must follow the POSITION, not the last button pressed. These
 * two load one variant's position having just answered the prelude with the
 * other, which is what a recorded game does: cbPreludeFromBoard suppresses the
 * dialog, so nothing re-states the choice.
 */
choose(1);   // Chancellor chosen...
t.check("a Modern position keeps its swap after Chancellor was chosen",
	swapsFrom({ c1: "wB*", d1: "wM*", b1: "wN*", e1: "wK*", e9: "bK*" }),
	["c1-b1", "c1-d1"]);

choose(0);   // ...and the other way round
t.check("a Chancellor position gains none after Modern was chosen",
	swapsFrom({ c1: "wB*", d1: "wQ*", b1: "wN*", e1: "wK*", e9: "bK*" }), []);

// a Minister captured early must not turn the rule off for the rest of the
// game: the piece list keeps it, which is why the test reads the list and not
// the board
choose(0);
t.check("and a Modern game whose Minister is gone still has the swap",
	swapsFrom({ c1: "wB*", d1: "wQ*", b1: "wN*", e1: "wK*", e9: "bK*", i9: "bM*" }),
	["c1-b1", "c1-d1"]);

t.done("Chess 9x9");
