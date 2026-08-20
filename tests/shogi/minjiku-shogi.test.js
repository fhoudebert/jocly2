/*
 * Minjiku Shogi, against the rules page shipped with it
 * (res/rules/minjiku-shogi/minjiku-shogi-rules.html).
 *
 *   node tests/shogi/minjiku-shogi.test.js
 *
 * Most of this game is exotic - a Lion's area move, a Samurai that shoots
 * without moving, a Fire Dragon that burns - and all of it was right. What was
 * wrong was in the FEN: the Lateral Mover that has not moved yet, the one that
 * may still slide two squares forward, shared its letter with the moved one
 * and lost it on import, so a reloaded position handed back four pieces that
 * had quietly lost a move.
 *
 * It was checked alongside Metamachy and Terachess - same author, same shape
 * of model - and sits here now, with the other Shogi variants.
 */

const H = require("../fairy/harness.js");

const minjiku = H.context(["base-model.js", "grid-geo-model.js", "fairy-piece-model.js",
	"locust-move-model.js", "locust/minjiku-shogi-model.js"]);

const t = H.runner();

console.log("\nthe board: 10x10 and four squares that vanish");

t.check("thirty-two pieces a side", minjiku.sides(), 32);
// the 10x10 board sits inside a 10x12 grid: the extra row at each end holds
// the two squares the King and the Minister start on
t.check("ten files", minjiku.geo.width, 10);
t.check("twelve rows, the outer two being the extra squares", minjiku.geo.height, 12);
t.check("two pieces on each outer row", (() => {
	const board = H.newBoard(minjiku.sandbox, minjiku.game);
	const outer = board.pieces.filter((piece) => piece.p >= 0
		&& (minjiku.geo.R(piece.p) === 0 || minjiku.geo.R(piece.p) === 11));
	return outer.length;
})(), 4);

t.check("no castling", minjiku.game.cbVar.castle, undefined);
t.check("no en passant",
	Object.keys(minjiku.types).filter((k) => minjiku.types[k].epCatch
		|| minjiku.types[k].epTarget), []);

/*
 * The pieces the rules describe with modes no graph can express. Each is
 * checked by what it can actually do on an open board.
 */
const openBoard = (pieces, who, square) => {
	const board = H.setup(minjiku.sandbox, minjiku.game, pieces, who);
	board.mMoves = [];
	board.GenerateMoves(minjiku.game);
	return board.mMoves.filter((move) => move.f === minjiku.geo.PosByName(square));
};

// "The Lion: moves or captures as a King, but if the square thus reached is
// empty it can optionally move on ... ('area move')"
t.check("the Lion's area move reaches 24 squares",
	openBoard({ f7: "w+D", a1: "wK", j12: "bK" }, 1, "f7").length, 24);
// "The Samurai: ... can capture adjacent enemies in all 8 directions without
// moving"
t.ok("the Samurai captures without moving", (() => {
	const moves = openBoard({ f7: "w+Y", f8: "bP", a1: "wK", j12: "bK" }, 1, "f7");
	return moves.some((move) => move.t === move.f);
})());
/*
 * "The Fire Dragon: moves and captures like Queen, and has an 'area move'" -
 * so on top of the Queen's lines it must reach the squares two King steps
 * away that no Queen line passes through, which are the same squares the
 * Lion's area move adds.
 */
const squares = (spec, square) => new Set(openBoard(spec, 1, square)
	.map((move) => minjiku.geo.PosName(move.t)));
const dragon = squares({ f7: "wF", a1: "wK", j12: "bK" }, "f7");
const plainQueen = squares({ f7: "wQ", a1: "wK", j12: "bK" }, "f7");
const lion = squares({ f7: "w+D", a1: "wK", j12: "bK" }, "f7");
t.check("the Fire Dragon keeps every square a Queen has",
	[...plainQueen].filter((sq) => !dragon.has(sq)), []);
t.check("and adds the Lion's area squares",
	[...lion].filter((sq) => !plainQueen.has(sq)).filter((sq) => !dragon.has(sq)), []);
t.ok("h8 among them, which no Queen line reaches from f7",
	dragon.has("h8") && !plainQueen.has("h8"));

// the promotion list of the rules page, every pair of it
[["pawnw", "goldw"], ["silverw", "bishop"], ["goldw", "rook"],
 ["isweeper", "sweeper"], ["bishop", "pviper"], ["rook", "pcobra"],
 ["diagonal jumper", "lion"], ["minister", "orthogonal jumper"],
 ["kirin", "samurai"], ["phoenix", "queen"], ["queen", "fire dragon"],
 ["viper", "area jumper"], ["cobra", "jumping general"]].forEach(([piece, into]) => {
	const list = minjiku.promotesTo(piece, 8);   // entering the zone
	t.ok(piece + " promotes to " + into, list.indexOf(into) >= 0);
});
// "This is optional" - the piece is offered unchanged alongside its promotion
t.check("promotion is optional", minjiku.promotesTo("rook", 8)[0], "rook");
// "when they enter the promotion zone consisting of the last three ranks"
t.check("nothing promotes short of the zone", minjiku.promotesTo("rook", 7), []);

/*
 * The Lateral Mover that has not moved yet may still slide two squares
 * forward, and it is a type of its own for that reason. It shared its FEN
 * letter with the moved one and lost it on import, so all four came back
 * having quietly lost the move.
 */
t.check("the unmoved Lateral Mover has a letter of its own",
	minjiku.types[minjiku.typeNamed("isweeper")].fenAbbrev,
	"L!");
t.check("it may slide two squares forward",
	minjiku.reach("isweeper", "f7") - minjiku.reach("sweeper", "f7"), 2);

/* ---------------- and it all runs ---------------- */

console.log("\nthe whole thing");

t.check("a saved position reloads unchanged", minjiku.roundTrip(), 0);
t.check("a game runs", minjiku.plays(60), 60);

t.done("Minjiku Shogi");
