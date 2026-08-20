/*
 * Gigachess, against the rules page shipped with it
 * (res/rules/gigachess/gigachess-rules.html).
 *
 *   node tests/fairy/gigachess.test.js
 *
 * Nothing needed correcting. The suite exists because a 14x14 board with 48
 * pieces a side and 23 kinds of piece is exactly where a wrong leap or a
 * promotion pointing at the wrong piece goes unnoticed: the game still runs,
 * it just plays a different game.
 *
 * The piece worth pinning down is the Lion. It has the same reach as the Chu
 * Shogi Lion and none of its power: "this Lion has the same range but is more
 * restricted than the Lion in Chu Shogi which can move two times in a turn".
 * So it leaps and stops - no second step, no igui, no pass - and after all the
 * Lion-power work done elsewhere in this module that is worth a test of its
 * own.
 */

const H = require("./harness.js");

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "cazaux/gigachess-model.js"];

const sandbox = H.loadModel(SCRIPTS);
const game = H.newGame(sandbox);
const geo = game.cbVar.geometry;
const types = game.cbVar.pieceTypes;
const constants = sandbox.Model.Game.cbConstants;

const natural = (move) =>
	Object.assign(Object.create(sandbox.Model.Move), move).ToString("natural");
const typeNamed = (name) => {
	for(const t in types)
		if(types[t].name === name)
			return parseInt(t);
	throw new Error("no piece named " + name);
};

// every square a piece reaches from one square of an empty board
function reach(name, square) {
	const from = geo.PosByName(square), out = new Set();
	(types[typeNamed(name)].graph[from] || []).forEach((line) => {
		for(const entry of line)
			if(entry & (constants.FLAG_MOVE | constants.FLAG_CAPTURE))
				out.add(entry & 0xffff);
	});
	return out.size;
}
// which of move / capture / screen-capture apply on one square
function flagsOn(name, from, to) {
	const start = geo.PosByName(from), target = geo.PosByName(to);
	let found = "";
	(types[typeNamed(name)].graph[start] || []).forEach((line) => {
		for(const entry of line)
			if((entry & 0xffff) === target) {
				const flags = [];
				if(entry & constants.FLAG_MOVE) flags.push("move");
				if(entry & constants.FLAG_CAPTURE) flags.push("capture");
				if(entry & constants.FLAG_SCREEN_CAPTURE) flags.push("screen");
				found = flags.join("+");
			}
	});
	return found;
}
function movesFrom(pieces, square) {
	const board = H.setup(sandbox, game,
		Object.assign({ a1: "wK", n14: "bK" }, pieces), 1);
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves.filter((move) => move.f === geo.PosByName(square));
}

const t = H.runner();

/* ---------------- the board and the army ---------------- */

console.log("\nthe board and the army");

t.check("a 14 x 14 board", [geo.width, geo.height], [14, 14]);
t.check("forty-eight pieces a side", (() => {
	const board = H.newBoard(sandbox, game);
	return board.pieces.filter((piece) => piece.p >= 0 && piece.s > 0).length;
})(), 48);

// the list of the rules page, piece by piece
[["bow", 2], ["cannon", 2], ["camel", 2], ["ship", 2], ["buffalo", 1], ["lion", 1],
 ["eagle", 1], ["amazon", 1], ["marshall", 1], ["cardinal", 1], ["king", 1],
 ["queen", 1], ["princew", 2], ["bishop", 2], ["knight", 2], ["rook", 2],
 ["elephant", 2], ["machine", 2], ["corporalw", 6], ["ipawnw", 14]]
	.forEach(([name, count]) => {
		t.check(count + " " + name,
			(types[typeNamed(name)].initial || []).filter((entry) => entry.s > 0).length,
			count);
	});

/* ---------------- the pieces ---------------- */

console.log("\nthe reference guide");

// "Elephant: as in Shako" - Ferz and Alfil, jumping the first square
t.check("Elephant: Ferz and Alfil", reach("elephant", "g7"), 8);
// "moves 1 or 2 cases orthogonally, jumping over the first case"
t.check("Machine: Wazir and Dabbaba", reach("machine", "g7"), 8);
// "jumps to the opposite case of a 2x4 rectangle"
t.check("Camel: the 8 (3,1) squares", reach("camel", "g7"), 8);
// "Combines the leaps of the Knight (3x2), the Camel (4x2) and the Bull (4x3)"
t.check("Buffalo: Knight, Camel and Bull", reach("buffalo", "g7"), 24);
t.check("Marshall: Rook and Knight", reach("marshall", "g7"), reach("rook", "g7") + 8);
t.check("Cardinal: Bishop and Knight", reach("cardinal", "g7"), reach("bishop", "g7") + 8);
t.check("Amazon: Queen and Knight", reach("amazon", "g7"), reach("queen", "g7") + 8);
// "moves one square diagonally and then goes away ... vertically or
// horizontally", against the Ship which may only go vertically
t.ok("Eagle: a diagonal step then a straight ray", reach("eagle", "g7") > reach("ship", "g7"));
t.check("Cannon: the Rook's lines", reach("cannon", "g7"), reach("rook", "g7"));
t.check("Bow: the Bishop's", reach("bow", "g7"), reach("bishop", "g7"));
t.check("and both capture over a screen",
	[flagsOn("cannon", "g7", "g10"), flagsOn("bow", "g7", "j10")],
	["move+screen", "move+screen"]);

/*
 * "The Lion may move as a King, or jump to a position two squares away in any
 * orthogonal or diagonal direction, or jumping as a Knight. Then this Lion has
 * the same range but is more restricted than the Lion in Chu Shogi which can
 * move two times in a turn."
 */
console.log("\nthe Lion, which is not the Chu Shogi one");

const lion = movesFrom({ g7: "wL" }, "g7");
t.check("it reaches 24 squares", new Set(lion.map((m) => geo.PosName(m.t))).size, 24);
t.check("in as many moves, one per square", lion.length, 24);
t.check("never in two legs", lion.filter((move) => move.via !== undefined).length, 0);
t.check("and never staying put", lion.filter((move) => move.t === move.f).length, 0);
t.check("an adjacent enemy buys it nothing extra",
	movesFrom({ g7: "wL", g8: "bP" }, "g7")
		.filter((move) => move.via !== undefined || move.t === move.f).length, 0);

/* ---------------- Pawns, Corporals, Princes ---------------- */

console.log("\nthe foot soldiers");

/*
 * The Corporal is the Pawn plus one thing, as in Terachess: its forward
 * diagonal is a move as well as a capture. On the Pawn that square is a
 * capture and nothing else.
 */
t.check("Corporal: the diagonal step is a move as well as a capture",
	flagsOn("corporalw", "g7", "f8"), "move+capture");
t.check("Pawn: the diagonal is a capture only", flagsOn("ipawnw", "g7", "f8"), "capture");

// the family's Pawn: one or two squares forward from wherever it stands
["c3", "c4", "c7", "c11"].forEach((square) => {
	t.check("a Pawn on " + square + " steps once or twice",
		movesFrom({ [square]: "wP" }, square).map(natural).sort(),
		[square + "-c" + (parseInt(square.slice(1)) + 1),
		 square + "-c" + (parseInt(square.slice(1)) + 2)].sort());
});

// "Like the Pawn, he can also move without capturing to the second square
// straight ahead" - the Prince of this family
t.check("Prince: eight neighbours and the second square ahead", reach("princew", "g7"), 9);

// en passant catches the Pawn, the Corporal and the Prince; only the first two
// may capture that way
t.check("Pawn, Corporal and Prince can be caught en passant",
	[...new Set(Object.keys(types).filter((k) => types[k].epTarget)
		.map((k) => types[k].name.replace(/[wb]$/, "").replace(/^i/, "")))].sort(),
	["corporal", "pawn", "prince"]);
t.check("only Pawn and Corporal capture that way",
	[...new Set(Object.keys(types).filter((k) => types[k].epCatch)
		.map((k) => types[k].name.replace(/[wb]$/, "").replace(/^i/, "")))].sort(),
	["corporal", "pawn"]);

/* ---------------- promotion ---------------- */

console.log("\nthe promotions table, all eight of it");

const promotesTo = (name) => {
	const last = geo.height - 1, to = last * geo.width + 3;
	return (game.cbVar.promote(game, { t: typeNamed(name), s: 1, p: to - geo.width },
		{ t: to, f: to - geo.width, c: null }) || []).map((into) => types[into].name);
};
[["ipawnw", "queen"], ["corporalw", "queen"], ["princew", "amazon"],
 ["knight", "buffalo"], ["camel", "buffalo"], ["elephant", "lion"],
 ["machine", "lion"], ["ship", "eagle"]].forEach(([piece, into]) => {
	t.check(piece + " promotes to " + into, promotesTo(piece), [into]);
});
// "All short-range pieces (and the Ship as well) promote" - and nothing else
t.check("no other piece promotes",
	Object.keys(types).filter((k) => promotesTo(types[k].name).length
		&& ["ipawnw", "ipawnb", "corporalw", "corporalb", "princew", "princeb",
			"knight", "camel", "elephant", "machine", "ship"].indexOf(types[k].name) < 0)
		.map((k) => types[k].name), []);

/*
 * "King: Exactly as in usual Chess" - and no castling section anywhere on the
 * page. The model has no castling table at all, which is what the rest of this
 * family does: Terachess and Gigachess II have none either.
 */
t.check("no castling", Object.keys(game.cbVar.castle || {}).length, 0);
t.check("and the King has only its eight steps",
	movesFrom({ g2: "wK*", a2: "wR*", n2: "wR*" }, "g2").length, 8);

/* ---------------- it runs ---------------- */

console.log("\nthe whole thing");

t.check("a saved position reloads unchanged", (() => {
	const board = H.newBoard(sandbox, game);
	const before = {};
	board.pieces.forEach((piece) => {
		if(piece.p >= 0) before[piece.p] = types[piece.t].name + "/" + piece.s;
	});
	const back = sandbox.Model.Game.Import("pjn", board.ExportBoardState(game)).initial;
	const after = {};
	(back.pieces || []).forEach((piece) => {
		after[piece.p] = types[piece.t].name + "/" + piece.s;
	});
	return Object.keys(before).filter((pos) => before[pos] !== after[pos]).length;
})(), 0);

t.check("a game runs", (() => {
	const board = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];
	let seed = 21, played = 0;
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
	return played;
})(), 80);

t.done("Gigachess");
