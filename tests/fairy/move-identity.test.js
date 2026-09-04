/*
 * Telling two moves apart.
 *
 *   node tests/fairy/move-identity.test.js
 *
 * Model.Move.Equals is how a move gets resolved against the list the position
 * generated - by a transcript reader turning "#2" or "O-O" back into a move,
 * by a click handler turning a chosen square into one. When two different
 * moves compare equal, that lookup returns whichever comes first, the game
 * plays on from the wrong one, and the failure surfaces later as a recorded
 * game that will not load.
 *
 * Both cases below were found that way, from a saved MiniChess 5x5 game that
 * would not come back:
 *
 *   - a prelude move carries no f, t or pr, so every setup compared equal to
 *     every other and to the turn-pass. Asking for Malett got Gardner.
 *   - Malett's King castles c1-b1, one square, exactly where its ordinary
 *     step goes. Without cg the castling and the King move compared equal, so
 *     a game that castled replayed as a King step and drifted from the record.
 *
 * JocGame.Load() applies the move it read rather than the one it matched, so
 * it never saw either. Only the paths that go through the list did.
 */

const H = require("./harness.js");
const t = H.runner();

// the harness builds a bare game object, without JocGame's CreateMove
function asMove(sandbox, args) {
	const move = Object.create(sandbox.Model.Move);
	move.Init(args);
	return move;
}

const PRELUDE_GAMES = [
	{ name: "MiniChess 5x5", scripts: ["mini/minichess5x5-model.js"], setups: 3 },
	{ name: "Capablanca", scripts: ["fairy-piece-model.js", "capa10x8/capablanca-model.js"], setups: 10 },
	{ name: "Timurid", scripts: ["fairy-piece-model.js", "duodecimal/timurid-model.js"], setups: 8 },
];

console.log("\nmove identity");

/* ================= a setup is not another setup ================= */

for(const one of PRELUDE_GAMES) {
	const c = H.context(["base-model.js", "grid-geo-model.js", "prelude-model.js"]
		.concat(one.scripts));
	const board = H.newBoard(c.sandbox, c.game);
	board.GenerateMoves(c.game);
	const offered = board.mMoves.map((m) => asMove(c.sandbox, m));

	t.check(one.name + ": the prelude offers every setup", offered.length, one.setups);

	// each one must match itself and nothing else
	const collisions = [];
	for(let i = 0; i < offered.length; i++)
		for(let j = 0; j < offered.length; j++)
			if(i !== j && offered[i].Equals(offered[j]))
				collisions.push(i + "==" + j);
	t.check(one.name + ": no two setups compare equal", collisions, []);

	// and looking one up returns the one asked for, not the first in the list
	const last = offered.length - 1;
	const wanted = asMove(c.sandbox, { setup: last });
	t.check(one.name + ": asking for the last setup resolves to it",
		JSON.stringify(offered.filter((m) => wanted.Equals(m))[0]),
		JSON.stringify({ setup: last }));

	// the second prelude stage is a turn pass, which is not a choice
	t.check(one.name + ": the turn pass is not one of the setups",
		asMove(c.sandbox, {}).Equals(offered[0]), false);
}

/* ================= castling is not a King step ================= */

/*
 * Malett is the case that matters, because on 5x5 the castling King moves one
 * square. Gardner's goes two, so it could never be confused with a step -
 * which is why this only ever bit the one variant.
 */
const c = H.context(["base-model.js", "grid-geo-model.js", "prelude-model.js",
	"mini/minichess5x5-model.js"]);
const geo = c.game.cbVar.geometry;

function chooseMalett() {
	let board = H.newBoard(c.sandbox, c.game);
	board = play(board, { setup: 2 });
	board.GenerateMoves(c.game);
	return play(board, board.mMoves[0]);
}
function play(board, move) {
	const next = Object.create(c.sandbox.Model.Board);
	next.Init && next.Init(c.game);
	next.CopyFrom(board);
	next.ApplyMove(c.game, move);
	next.mWho = -next.mWho;
	return next;
}

chooseMalett();   // puts Malett's castling table in force
const position = H.setup(c.sandbox, c.game,
	{ a1: "wR*", c1: "wK*", a5: "bR*", e5: "bK*" }, 1);
position.lastMove.f = -1;   // H.setup re-arms the prelude; a loaded game does not
position.GenerateMoves(c.game);

const c1b1 = position.mMoves.filter((m) => geo.PosName(m.f) === "c1" && geo.PosName(m.t) === "b1");
t.check("Malett: c1-b1 is reachable two ways, the step and the castling",
	c1b1.length, 2);
t.check("and exactly one of them castles",
	c1b1.filter((m) => m.cg !== undefined).length, 1);
t.check("so the two do not compare equal",
	asMove(c.sandbox, c1b1[0]).Equals(asMove(c.sandbox, c1b1[1])), false);

const castling = c1b1.filter((m) => m.cg !== undefined)[0];
const resolved = position.mMoves.filter((m) => asMove(c.sandbox, castling).Equals(m));
t.check("looking up the castling finds the castling",
	resolved.length === 1 && resolved[0].cg === castling.cg, true);

/* ================= naming a castling under another table ================= */

/*
 * A prelude that swaps the castling table leaves a window where a recorded
 * castling belongs to one arrangement and cbVar.castle holds another s. That
 * happens whenever a move list is rendered away from the position that
 * produced it - a history panel drawn before the prelude has been replayed.
 * Naming the move used to throw there, which took down the whole list.
 */
const arrangements = ["Gardner", "Baby", "Malett"];
const malettCastling = c.game.cbVar.geometry.PosByName("c1") + "/" + c.game.cbVar.geometry.PosByName("a1");
const whiteCastling = asMove(c.sandbox, {
	f: c.game.cbVar.geometry.PosByName("c1"),
	t: c.game.cbVar.geometry.PosByName("b1"),
	cg: c.game.cbVar.geometry.PosByName("a1"),
});

// before any choice at all: cbVar.castle is whatever cbDefine declared
t.check("a Malett castling can be named before the prelude is answered",
	whiteCastling.ToString(), "O-O");

for(let setup = 0; setup < arrangements.length; setup++) {
	let board = H.newBoard(c.sandbox, c.game);
	board = play(board, { setup: setup });
	board.GenerateMoves(c.game);
	play(board, board.mMoves[0]);
	t.check("and under " + arrangements[setup] + "'s table too",
		whiteCastling.ToString(), "O-O");
}

t.done("move identity");
