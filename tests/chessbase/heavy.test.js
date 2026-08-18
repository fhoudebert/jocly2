/*
 * Heavy Chess, against the rules page shipped with it
 * (res/rules/decimal/heavychess-rules.html).
 *
 *   node tests/chessbase/heavy.test.js
 *
 */

const H = require("../khans/harness.js");

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "fairy-piece-model.js",
	"decimal/heavy-model.js"];

const sandbox = H.loadModel(SCRIPTS);
const game = H.newGame(sandbox);
const geo = game.cbVar.geometry;
const types = game.cbVar.pieceTypes;
const constants = sandbox.Model.Game.cbConstants;

const typeNamed = (name) => {
	for(const t in types)
		if(types[t].name === name)
			return parseInt(t);
	throw new Error("no piece named " + name);
};

function reach(name, square) {
	const from = geo.PosByName(square), out = new Set();
	(types[typeNamed(name)].graph[from] || []).forEach((line) => {
		for(const entry of line)
			if(entry & (constants.FLAG_MOVE | constants.FLAG_CAPTURE))
				out.add(entry & 0xffff);
	});
	return out.size;
}

// how a position is judged: still a game, or over
function verdict(pieces, who) {
	const board = H.setup(sandbox, game, pieces, who || 1);
	board.mMoves = [];
	board.GenerateMoves(game);
	board.Evaluate(game);
	if(!board.mFinished)
		return "playing";
	return board.mWinner === 2 ? "draw" : "winner " + board.mWinner;
}

const t = H.runner();

/* ---------------- the compound pieces ---------------- */

console.log("\nthe pieces the game is named for");

t.check("a 10 x 10 board", [geo.width, geo.height], [10, 10]);

// each compound is checked against the pieces it combines, on the same square
const bishop = reach("bishop", "e5"), rook = reach("rook", "e5");
const knight = reach("knight", "e5"), king = reach("king", "e5");
const queen = reach("queen", "e5");

// "Marshall: it combines the move of Rook and Knight"
t.check("Marshall: Rook and Knight", reach("marshall", "e5"), rook + knight);
// "Archbishop: it combines the move of Bishop and Knight"
t.check("Archbishop: Bishop and Knight", reach("archbishop", "e5"), bishop + knight);
// "Amazon: it combines the move of Queen and Knight"
t.check("Amazon: Queen and Knight", reach("amazon", "e5"), queen + knight);
// "Centaur: moves as a Knight or a non-royal King"
t.check("Centaur: Knight and King", reach("centaur", "e5"), knight + king);
// "Admiral: a Rook that can also step one space diagonally" - the four
// diagonal steps are the only squares a Rook does not already cover
t.check("Admiral: Rook and a King's step", reach("dragon-king", "e5"), rook + 4);
// "Missionary: a Bishop that can also step one space orthogonally"
t.check("Missionary: Bishop and a King's step", reach("missionnary", "e5"), bishop + 4);

/* ---------------- promotion and castling ---------------- */

console.log("\npromotion and castling");

/*
 * "Pawns reaching the 10th rank must promote to any of the other non-royal
 * pieces" - all ten of them, the Missionary included. That one is added to
 * the piece set after the rest, so a promotion list built too early would
 * quietly leave it out.
 */
const promotions = (() => {
	const last = geo.height - 1, to = last * geo.width + 3;
	return (game.cbVar.promote(game, { t: typeNamed("pawnw"), s: 1, p: to - geo.width },
		{ t: to, f: to - geo.width, c: null }) || []).map((into) => types[into].name);
})();
t.check("a Pawn is offered every non-royal piece", promotions.sort(),
	["amazon", "archbishop", "bishop", "centaur", "dragon-king", "knight",
	 "marshall", "missionnary", "queen", "rook"]);
t.ok("the Missionary among them", promotions.indexOf("missionnary") >= 0);
t.ok("and never the King or a Pawn",
	promotions.every((name) => name !== "king" && name.indexOf("pawn") < 0));

/*
 * "The King can castle with the Rook, and then moves 2 squares in the
 * direction of the latter." The King starts on f2 with Rooks on b2 and i2.
 */
const castle = game.cbVar.castle;
t.check("four castling entries", Object.keys(castle).sort(),
	["15/11", "15/18", "85/81", "85/88"]);
t.check("the King lands two squares away, queenside",
	geo.PosName(castle["15/11"].k[castle["15/11"].k.length - 1]), "d2");
t.check("and two squares away, kingside",
	geo.PosName(castle["15/18"].k[castle["15/18"].k.length - 1]), "h2");

/* ---------------- what is and is not a dead position ---------------- */

console.log("\nonly the dead positions are called dead");

const bare = { a1: "wK", j10: "bK" };
t.check("King against King", verdict(bare), "draw");
t.check("a lone Knight cannot mate", verdict({ a1: "wK", e5: "wN", j10: "bK" }), "draw");
t.check("nor a lone Bishop", verdict({ a1: "wK", e5: "wB", j10: "bK" }), "draw");
t.check("and neither can Black's", verdict({ a1: "wK", e5: "bB", j10: "bK" }), "draw");

/*
 * Everything below was declared a draw before the type numbers were fixed,
 * except the Knight - which was the one piece whose orthodox number happened
 * to point at a piece of this game.
 */
[["Queen", "wQ"], ["Rook", "wR"], ["Amazon", "wT"], ["Missionary", "wL"],
 ["Marshall", "wM"], ["Archbishop", "wA"], ["Admiral", "wD"], ["Centaur", "wJ"],
 ["Pawn", "wP"]].forEach(([label, letter]) => {
	t.check("King and " + label + " is still a game",
		verdict({ a1: "wK", e5: letter, j10: "bK" }), "playing");
});
t.check("two minors are still a game",
	verdict({ a1: "wK", e5: "wN", e6: "wB", j10: "bK" }), "playing");
t.check("and the same for Black",
	verdict({ a1: "wK", e5: "bQ", j10: "bK" }), "playing");

/* ---------------- it runs ---------------- */

console.log("\nthe whole thing");

t.check("thirty pieces a side", (() => {
	const board = H.newBoard(sandbox, game);
	return board.pieces.filter((piece) => piece.p >= 0 && piece.s > 0).length;
})(), 30);

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
	const play = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];
	let seed = 77, played = 0;
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

/* ---------------- the two games that carried the same block ---------------- */

/*
 * hectochess and gross were copied from the same source and had the same
 * numbers in them, over their own piece sets: K+Rook, K+Marshall,
 * K+Archbishop, K+Wizard and K+Leo against a bare King were all declared
 * drawn. They are checked here rather than in files of their own because what
 * is being checked is exactly the same thing.
 */
console.log("\nhectochess and gross, same block, same fix");

[["hectochess", "decimal/hectochess-model.js"],
 ["gross", "duodecimal/gross-model.js"]].forEach(([label, model]) => {
	const box = H.loadModel(["base-model.js", "grid-geo-model.js", "fairy-piece-model.js", model]);
	const other = H.newGame(box);
	const board = other.cbVar.geometry;
	const kinds = other.cbVar.pieceTypes;
	const corner = board.PosName(0);
	const far = board.PosName(board.boardSize - 1);
	const middle = board.PosName(Math.floor(board.height / 2) * board.width + 4);
	const judge = (pieces) => {
		const position = H.setup(box, other, pieces, 1);
		position.mMoves = [];
		position.GenerateMoves(other);
		position.Evaluate(other);
		if(!position.mFinished)
			return "playing";
		return position.mWinner === 2 ? "draw" : "winner";
	};

	t.check(label + ": King against King", judge({ [corner]: "wK", [far]: "bK" }), "draw");

	// every piece of the game, one at a time, against a bare King: only the
	// Bishop and the Knight leave a position no one can win
	Object.keys(kinds).forEach((type) => {
		const name = kinds[type].name, letter = kinds[type].abbrev;
		if(!letter || /pawn|king/.test(name))
			return;
		const dead = name === "bishop" || name === "knight";
		t.check(label + ": King and " + name,
			judge({ [corner]: "wK", [middle]: "w" + letter, [far]: "bK" }),
			dead ? "draw" : "playing");
	});
});

t.done("Heavy Chess, hectochess and gross");
