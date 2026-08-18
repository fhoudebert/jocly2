/*
 * Makromachy, against the rules page shipped with it
 * (res/rules/makromachy/makromachy-rules.html).
 *
 *   node tests/chessbase/makromachy.test.js
 *
 * A 14x14 game with 24 kinds of piece and several move modes no graph can
 * express - flying captures, airlift moves, hit-and-run, a castling where the
 * King picks any empty square on its back rank. Most of it was right. Two
 * things were not, and neither shows in play:
 *
 *   - the Warrior "moves one or two squares straight ahead". Its graph asked
 *     cbFlexiPawnGraph for that, but the argument it filled is the RANK past
 *     which the long push stops, not the number of steps - so a Warrior on
 *     its own rank could push five squares, and one square from the fourth
 *     rank on. The model's own comment ("always has double push") says what
 *     was meant;
 *   - promotion offered the Archer, which the rules exclude by name. The
 *     Archer is the piece flying pieces cannot jump over, so handing one out
 *     on promotion is not a small thing.
 */

const H = require("../khans/harness.js");

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "fairy-piece-model.js",
	"locust-move-model.js", "locust/makromachy-model.js"];

const sandbox = H.loadModel(SCRIPTS);
const game = H.newGame(sandbox);
const geo = game.cbVar.geometry;
const types = game.cbVar.pieceTypes;

const engine = (move) =>
	Object.assign(Object.create(sandbox.Model.Move), move).ToString("engine");

const typeNamed = (name) => {
	for(const t in types)
		if(types[t].name === name)
			return parseInt(t);
	throw new Error("no piece named " + name);
};

// the moves a piece actually gets, on a board holding only what is asked for
function moveObjects(pieces, square, who) {
	const board = H.setup(sandbox, game,
		Object.assign({ a1: "wK", n14: "bK" }, pieces), who || 1);
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves.filter((move) => move.f === geo.PosByName(square));
}
const movesFrom = (pieces, square, who) =>
	moveObjects(pieces, square, who).map(engine).sort();
const reaches = (pieces, from, to) =>
	movesFrom(pieces, from).some((move) => move.indexOf(from + to) === 0);

const t = H.runner();

/* ---------------- the armies ---------------- */

console.log("\nthe setup");

const board = H.newBoard(sandbox, game);
t.check("fourteen files", geo.width, 14);
t.check("fifty-six pieces a side",
	board.pieces.filter((piece) => piece.p >= 0 && piece.s > 0).length, 56);

// the list of the rules page, piece by piece
[["ipawnw", 14], ["warriorw", 6], ["vao", 2], ["cannon", 2], ["knight", 2],
 ["elephant", 2], ["camel", 2], ["zebra", 2], ["bishop", 2], ["rook", 2],
 ["champion", 2], ["dragon horse", 2], ["dragon king", 2], ["archer", 2],
 ["bat", 2], ["raven", 2], ["rhino", 1], ["griffon", 1], ["archbishop", 1],
 ["marshall", 1], ["queen", 1], ["eagle", 1], ["terror", 1], ["king", 1]]
	.forEach(([name, count]) => {
		const initial = types[typeNamed(name)].initial || [];
		t.check(count + " " + name, initial.filter((entry) => entry.s > 0).length, count);
	});

/* ---------------- the Pawn and the Warrior ---------------- */

console.log("\nthe Pawn and the Warrior");

/*
 * "The Pawn ... in its initial location it can also be pushed 3 steps
 * forward, instead of two", from the fourth rank - and one step once it has
 * left it.
 */
t.check("a Pawn on its own rank pushes three",
	movesFrom({ d4: "wP*" }, "d4").filter((m) => /d4d[567]$/.test(m)),
	["d4d5", "d4d6", "d4d7"]);
t.check("and one once it has moved", movesFrom({ d8: "wP" }, "d8"), ["d8d9"]);

/*
 * "The Warrior: moves one or two squares straight ahead (non-jumping).
 * Captures diagonally forward, or backward like a Knight."
 */
["c2", "c4", "c8", "c11"].forEach((square) => {
	// straight ahead means the same file - which has to be read off the move,
	// not off its printed form: "c2c3" and "c11c12" put the file at different
	// offsets
	const ahead = moveObjects({ [square]: "wW" }, square)
		.filter((move) => geo.C(move.t) === geo.C(move.f));
	t.check("a Warrior on " + square + " goes one or two squares ahead", ahead.length, 2);
});
t.check("it cannot jump the square in front of it",
	movesFrom({ c8: "wW", c9: "bP" }, "c8"), []);
t.check("blocked two ahead, it still steps one",
	movesFrom({ c8: "wW", c10: "bP" }, "c8"), ["c8c9"]);
t.ok("it captures diagonally forward",
	reaches({ c8: "wW", b9: "bP" }, "c8", "b9")
		&& reaches({ c8: "wW", d9: "bP" }, "c8", "d9"));
t.ok("and backward like a Knight",
	reaches({ c8: "wW", b6: "bP" }, "c8", "b6")
		&& reaches({ c8: "wW", e7: "bP" }, "c8", "e7"));
t.ok("but does not MOVE backward like a Knight",
	!reaches({ c8: "wW" }, "c8", "b6"));

/*
 * "'En passant' capture: yes. To any of the squares passed through." A triple
 * push crosses two squares, and a Pawn beside either of them may take it.
 */
const enPassant = (pawnSquare) => {
	const b = H.setup(sandbox, game,
		{ k13: "bP*", [pawnSquare]: "wP", a1: "wK", n14: "bK" }, -1);
	b.mMoves = [];
	b.GenerateMoves(game);
	const triple = b.mMoves.find((move) => engine(move) === "k13k10");
	if(!triple)
		return "no triple push";
	b.ApplyMove(game, triple);
	b.mWho = 1;
	b.mMoves = [];
	b.GenerateMoves(game);
	return b.mMoves.filter((move) => move.f === geo.PosByName(pawnSquare)).map(engine);
};
t.ok("en passant on the near square a triple push crossed",
	enPassant("j11").indexOf("j11k12") >= 0);
t.ok("and on the far one", enPassant("j10").indexOf("j10k11") >= 0);

/* ---------------- promotion ---------------- */

console.log("\npromotion");

/*
 * "Pawns and Warriors promote on reaching the final rank, to any piece except
 * King, Pawn, Warrior, Archer, Bat, Raven, Eagle or Terror."
 */
const BARRED = ["king", "pawnw", "pawnb", "ipawnw", "ipawnb", "warriorw", "warriorb",
	"archer", "bat", "raven", "eagle", "terror"];
const promotions = (name) => {
	const last = geo.height - 1, to = last * geo.width + 2;
	return (game.cbVar.promote(game, { t: typeNamed(name), s: 1, p: to - geo.width },
		{ t: to, f: to - geo.width, c: null }) || []).map((into) => types[into].name);
};
["pawnw", "warriorw"].forEach((name) => {
	const offered = promotions(name);
	t.check(name + " is offered nothing the rules bar",
		offered.filter((into) => BARRED.indexOf(into) >= 0), []);
	t.check(name + " is offered everything else", (() => {
		const allowed = [...new Set(Object.keys(types).map((k) => types[k].name))]
			.filter((into) => BARRED.indexOf(into) < 0);
		return allowed.filter((into) => offered.indexOf(into) < 0);
	})(), []);
	t.check(name + " promotes to sixteen kinds", offered.length, 16);
});
// the Archer is barred because flying pieces cannot jump over it - the one
// piece promotion may not conjure up
t.ok("the Archer above all", promotions("warriorw").indexOf("archer") < 0);

/* ---------------- the exotic moves ---------------- */

console.log("\nthe moves no graph describes");

// "The Terror ... can also leap directly to the second square in any diagonal
// or orthogonal direction"
t.ok("the Terror leaps the second square even over a piece",
	reaches({ h8: "wT", h9: "wR" }, "h8", "h10"));

// "In addition has an 'airlift move', enabling it to slide like a Rook to
// where a piece ... in its path would block it"
t.ok("the Champion airlifts to a blocker's near side",
	reaches({ h8: "wI", h13: "bP" }, "h8", "h12"));
t.ok("the Knight airlifts diagonally, four steps out",
	reaches({ h8: "wN", l12: "bP" }, "h8", "k11"));
t.ok("the Elephant airlifts diagonally", reaches({ h8: "wE", k11: "bP" }, "h8", "j10"));

/*
 * "A Terror cannot be captured by a Terror or Eagle if pseudo-legal recapture
 * would be possible on the immediately following half-move."
 */
t.ok("a lone Terror can be taken by a Terror",
	reaches({ h8: "wT", h10: "bT" }, "h8", "h10"));
t.ok("a protected one cannot",
	!reaches({ h8: "wT", h10: "bT", h12: "bR" }, "h8", "h10"));
t.ok("nor by an Eagle",
	!reaches({ h8: "wL", h10: "bT", h12: "bR" }, "h8", "h10"));
t.ok("but a Rook may take it - only Terror and Eagle are barred",
	reaches({ h8: "wR", h10: "bT", h12: "bR" }, "h8", "h10"));

/*
 * "A King that hasn't moved yet ... can 'fast-castle' with a Dragon King (in
 * the corner) that has not moved yet, by jumping directly to any empty square
 * on the back rank in that direction."
 */
console.log("\nfast castling");

// castling moves carry the square the Dragon King comes from; the King's
// ordinary steps to h1 and j1 land on the back rank too and are not castling
const castling = moveObjects({ i1: "wK*", a1: "wD*", n1: "wD*", n14: "bK*" }, "i1")
	.filter((move) => move.cg !== undefined);
t.check("the King may land on any empty back-rank square", castling.length, 11);
t.check("never on a Dragon King's own square",
	castling.filter((move) => ["a1", "n1"].indexOf(geo.PosName(move.t)) >= 0), []);
t.check("no castling while the back rank is full", (() => {
	const start = H.newBoard(sandbox, game);
	start.mMoves = [];
	start.GenerateMoves(game);
	return start.mMoves.filter((move) => move.cg !== undefined).length;
})(), 0);

/* ---------------- and it all runs ---------------- */

console.log("\nthe whole thing");

t.check("a saved position reloads unchanged", (() => {
	const start = H.newBoard(sandbox, game);
	const before = {};
	start.pieces.forEach((piece) => {
		if(piece.p >= 0) before[piece.p] = types[piece.t].name + "/" + piece.s;
	});
	const back = sandbox.Model.Game.Import("pjn", start.ExportBoardState(game)).initial;
	const after = {};
	(back.pieces || []).forEach((piece) => {
		after[piece.p] = types[piece.t].name + "/" + piece.s;
	});
	return Object.keys(before).filter((pos) => before[pos] !== after[pos]).length;
})(), 0);

t.check("a game runs", (() => {
	const play = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];
	let seed = 99, played = 0;
	const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
	while(played < 60) {
		play.mMoves = [];
		play.GenerateMoves(game);
		if(play.mMoves.length === 0)
			break;
		const move = play.mMoves[Math.floor(random() * play.mMoves.length)];
		play.ApplyMove(game, move);
		game.mPlayedMoves.push(move);
		play.mWho = -play.mWho;
		played++;
	}
	return played;
})(), 60);

t.done("Makromachy");
