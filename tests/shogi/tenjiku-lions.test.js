/*
 * Tenjiku Shogi: the pieces that carry Lion power, and how far each one carries
 * it.
 *
 *   node tests/shogi/tenjiku-lions.test.js
 *
 * Five pieces here move like the Chu Shogi Lion, each on its own set of
 * directions, and a sixth looks as though it does and does not.
 *
 *   Lion, Lion Hawk   two King steps, in any direction
 *   Free Eagle        two steps, on the diagonals only
 *   Soaring Eagle     the same, on its two forward diagonals ("stinging")
 *   Horned Falcon     the same, straight ahead
 *   Tetrarch          annihilates a neighbour without moving, and nothing more
 *
 * The last item of that power is the one that has to be asked for: "stay in
 * place without capturing anything if one of the neighboring squares is empty
 * (effectively passing a turn)". FLAG_HITRUN grants a second step only after a
 * CAPTURE, so without FLAG_HITRUN | FLAG_SPECIAL these pieces could pass only
 * by eating something and coming home.
 *
 * The Tetrarch is the piece to be careful with. It shares the flag that grants
 * an igui, but it has no pass: it "can annihilate any opponent next to it,
 * without moving", and no more - and it could not step out and back anyway,
 * since it skips the first square of every direction it slides along. It
 * therefore keeps a flag of its own.
 */

const H = require("../fairy/harness.js");

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "locust-move-model.js",
	"shogi/tenjiku-shogi-model.js"];

const sandbox = H.loadModel(SCRIPTS);
const game = H.newGame(sandbox);
const geo = game.cbVar.geometry;
const types = game.cbVar.pieceTypes;

const natural = (move) =>
	Object.assign(Object.create(sandbox.Model.Move), move).ToString("natural");
const at = (square) => geo.PosByName(square);
const letterOf = (name) => {
	for(const t in types)
		if(types[t].name === name)
			return types[t].fenAbbrev || types[t].abbrev;
	throw new Error("no piece named " + name);
};

// the moves of a piece put on h8, with whatever else is asked for
function moves(name, extra) {
	const pieces = Object.assign({ a1: "wK", p16: "bK", h8: "w" + letterOf(name) },
		extra || {});
	const board = H.setup(sandbox, game, pieces, 1);
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves.filter((move) => move.f === at("h8"));
}
// a move that ends where it began, taking nothing: the pass
const passes = (name, extra) =>
	moves(name, extra).filter((move) => move.t === move.f && move.kill == null);
// ... and taking something: the igui
const iguis = (name, extra) =>
	moves(name, extra).filter((move) => move.t === move.f && move.kill != null);

const t = H.runner();

/* ---------------- how far the power reaches ---------------- */

console.log("\neach piece passes on the squares it has the power over");

/*
 * One pass per empty square the piece can step onto and come back from. That
 * count is the shape of its Lion power: all eight neighbours for the Lion and
 * the Lion Hawk, the four diagonals for the Free Eagle, the two forward
 * diagonals for the Soaring Eagle, straight ahead for the Horned Falcon.
 */
[["Lion", "lion", 8], ["Lion Hawk", "lion-hawk", 8], ["Free Eagle", "free-eagle", 4],
 ["Soaring Eagle", "eagle-w", 2], ["Horned Falcon", "falcon-w", 1],
 ["Tetrarch", "tetrarch", 0]].forEach(([label, name, count]) => {
	t.check(label + ": " + count + " pass" + (count === 1 ? "" : "es"),
		passes(name).length, count);
});

// "Jump directly to any square in the 5x5 area surrounding it"
t.check("the Lion reaches its whole 5x5 area",
	new Set(moves("lion").filter((m) => m.t !== m.f)
		.map((m) => geo.PosName(m.t))).size, 24);
// "The Lion Hawk can in addition move as a normal Bishop"
t.ok("the Lion Hawk reaches more than the Lion",
	new Set(moves("lion-hawk").filter((m) => m.t !== m.f).map((m) => geo.PosName(m.t))).size
	> new Set(moves("lion").filter((m) => m.t !== m.f).map((m) => geo.PosName(m.t))).size);

/* ---------------- with something to take ---------------- */

console.log("\nan enemy on a stung square turns the pass into an igui");

// "Annihilate any opponent standing next to it, without moving (formally one
// step, and then a step back)"
t.check("the Lion takes it and stays", iguis("lion", { h9: "bP" }).map(natural),
	["LNxh9-h8"]);
t.check("one pass fewer, since that square is no longer empty",
	passes("lion", { h9: "bP" }).length, 7);
t.check("the Soaring Eagle stings its diagonal",
	iguis("eagle-w", { i9: "bP" }).map(natural), ["SExi9-h8"]);
t.check("the Horned Falcon stings straight ahead",
	iguis("falcon-w", { h9: "bP" }).map(natural), ["HFxh9-h8"]);
t.check("the Free Eagle stings its diagonal too",
	iguis("free-eagle", { i9: "bP" }).map(natural), ["FExi9-h8"]);

// "Annihilate any opponent standing next to it, and normally capture an
// opponent standing next to that ('double capture')"
t.ok("the Lion takes two in a turn",
	moves("lion", { h9: "bP", h10: "bR" })
		.some((m) => geo.PosName(m.t) === "h10" && m.c != null && m.kill != null));
// "... moving on to an empty square next to that ('hit and run')"
t.ok("or takes one and runs",
	moves("lion", { h9: "bP" })
		.some((m) => m.kill != null && m.t !== m.f && geo.PosName(m.t) !== "h9"));
t.ok("the Free Eagle does both, on its diagonal",
	moves("free-eagle", { i9: "bP", j10: "bR" })
		.some((m) => geo.PosName(m.t) === "j10" && m.c != null && m.kill != null));

// "Jump to the second square, annihilating an opponent on the first square"
t.ok("the Soaring Eagle jumps the square it stung",
	moves("eagle-w", { i9: "bP" })
		.some((m) => geo.PosName(m.t) === "j10" && m.kill != null));
t.ok("and so does the Horned Falcon",
	moves("falcon-w", { h9: "bP" })
		.some((m) => geo.PosName(m.t) === "h10" && m.kill != null));

/*
 * The Free Eagle "can move as a Queen, but as an alternative can make two
 * diagonal steps" - so straight ahead it is a Queen and nothing more.
 */
t.ok("the Free Eagle has no such power off its diagonals",
	!moves("free-eagle", { h9: "bP" }).some((m) => m.kill != null));

/* ---------------- the Tetrarch, which is not a Lion ---------------- */

console.log("\nthe Tetrarch: an igui, and nothing else of it");

// "Alternatively the Tetrarchs can annihilate any opponent next to it, without
// moving."
t.check("it annihilates a neighbour in place",
	iguis("tetrarch", { h9: "bP" }).map(natural), ["+CSxh9-h8"]);
// "a sliding piece that skips the first square in any direction, totally
// ignoring (and not affecting) what is on it"
t.ok("it never lands on the square it skips",
	!moves("tetrarch", { h9: "bP" }).some((m) => geo.PosName(m.t) === "h9"));
t.ok("but slides past it", moves("tetrarch", { h9: "bP" })
	.some((m) => geo.PosName(m.t) === "h10"));
t.check("and never passes a turn", passes("tetrarch", { h9: "bP" }).length, 0);

/* ---------------- the same shape as Chu Shogi ---------------- */

console.log("\nthe same Lion as Chu Shogi's");

const chu = (() => {
	const box = H.loadModel(["base-model.js", "grid-geo-model.js", "locust-move-model.js",
		"shogi/chu-shogi-model.js"]);
	const other = H.newGame(box);
	const board = H.setup(box, other,
		{ f7: "wN", a1: "wK", l12: "bK" }, 1);
	board.mMoves = [];
	board.GenerateMoves(other);
	return board.mMoves.filter((m) => m.f === other.cbVar.geometry.PosByName("f7"));
})();
t.check("Chu Shogi's Lion reaches 24 squares too",
	new Set(chu.filter((m) => m.t !== m.f).length ? chu.filter((m) => m.t !== m.f)
		.map((m) => m.t) : []).size, 24);
t.check("and passes on each of its eight neighbours",
	chu.filter((m) => m.t === m.f && m.kill == null).length, 8);

/* ---------------- it all still runs ---------------- */

console.log("\nthe whole thing");

// a random game may end before the count is reached - what matters is that it
// ends by running out of moves, not by throwing
t.ok("a game runs", (() => {
	const board = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];
	let seed = 17, played = 0;
	const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
	while(played < 80) {
		board.mMoves = [];
		board.GenerateMoves(game);
		if(board.mMoves.length === 0)
			break;
		const move = board.mMoves[Math.floor(random() * board.mMoves.length)];
		board.ApplyMove(game, move);
		game.mPlayedMoves.push(move);
		board.mWho = -board.mWho;
		played++;
	}
	return played >= 40;
})());

t.done("Tenjiku Shogi lions");
