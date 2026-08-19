/*
 * Knightmate and Pemba, against the rules pages shipped with them
 * (res/rules/standard/knightmate.html, res/rules/shako/pemba-rules.html).
 *
 *   node tests/fairy/knightmate-pemba.test.js
 *
 */

const H = require("./harness.js");

// gross builds its pieces from a FEN, which wants the fairy helpers
function load(model, extra) {
	const sandbox = H.loadModel(["base-model.js", "grid-geo-model.js"]
		.concat(extra || []).concat([model]));
	const game = H.newGame(sandbox);
	const ctx = { sandbox, game, geo: game.cbVar.geometry, types: game.cbVar.pieceTypes };
	ctx.constants = sandbox.Model.Game.cbConstants;
	ctx.typeNamed = (name) => {
		for(const t in ctx.types)
			if(ctx.types[t].name === name)
				return parseInt(t);
		throw new Error("no piece named " + name);
	};
	ctx.reach = (name, square) => {
		const from = ctx.geo.PosByName(square), out = new Set();
		(ctx.types[ctx.typeNamed(name)].graph[from] || []).forEach((line) => {
			for(const entry of line)
				if(entry & (ctx.constants.FLAG_MOVE | ctx.constants.FLAG_CAPTURE))
					out.add(entry & 0xffff);
		});
		return out.size;
	};
	ctx.engine = (move) =>
		Object.assign(Object.create(sandbox.Model.Move), move).ToString("engine");
	ctx.movesFrom = (pieces, square, who) => {
		const board = H.setup(sandbox, game, pieces, who || 1);
		board.mMoves = [];
		board.GenerateMoves(game);
		return board.mMoves.filter((m) => m.f === ctx.geo.PosByName(square));
	};
	ctx.promotions = (name, fromRow, toRow, side) => {
		const width = ctx.geo.width;
		const from = fromRow * width + 3, to = toRow * width + 3;
		return (game.cbVar.promote(game, { t: ctx.typeNamed(name), s: side || 1, p: from },
			{ t: to, f: from, c: null }) || []).map((into) => ctx.types[into].name);
	};
	ctx.backRank = () => {
		const board = H.newBoard(sandbox, game), rank = {};
		board.pieces.forEach((piece) => {
			if(piece.p >= 0 && piece.s > 0 && ctx.geo.R(piece.p) === 0)
				rank[ctx.geo.PosName(piece.p)] = ctx.types[piece.t].name;
		});
		return rank;
	};
	ctx.plays = (plies) => {
		const board = H.newBoard(sandbox, game);
		game.mPlayedMoves = [];
		let seed = 1234, played = 0;
		const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
		while(played < plies) {
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
	};
	return ctx;
}

const t = H.runner();

/* ================= Knightmate ================= */

console.log("\nKnightmate: the Knight is royal, the Kings are not");

const km = load("standard/knightmate-model.js");

// "Knightmate has a royal Knight and non-royal Kings."
t.check("the Knight is the royal piece",
	Object.keys(km.types).filter((k) => km.types[k].isKing).map((k) => km.types[k].name),
	["knight"]);
t.ok("and the King is an ordinary piece",
	!km.types[km.typeNamed("king")].isKing);
// the Kings stand where the Knights would, the Knight where the King would
const rank = km.backRank();
t.check("a Knight on e1, Kings on b1 and g1",
	[rank["e1"], rank["b1"], rank["g1"]], ["knight", "king", "king"]);
t.check("two Kings a side",
	(km.types[km.typeNamed("king")].initial || []).filter((e) => e.s > 0).length, 2);
t.check("and one Knight",
	(km.types[km.typeNamed("knight")].initial || []).filter((e) => e.s > 0).length, 1);
t.check("both move as they always did",
	[km.reach("knight", "d5"), km.reach("king", "d5")], [8, 8]);

/*
 * "Pawn promotion is as in Chess except that Pawns may promote to a King but
 * not to a Knight." The Knight is the royal piece here, so promoting to one
 * would hand a player a second royal; the King is the piece that is free.
 */
t.check("a Pawn promotes to King, Bishop, Rook or Queen",
	km.promotions("pawn-w", 6, 7).sort(), ["bishop", "king", "queen", "rook"]);
t.ok("a King among them", km.promotions("pawn-w", 6, 7).indexOf("king") >= 0);
t.ok("never a Knight", km.promotions("pawn-w", 6, 7).indexOf("knight") < 0);
t.check("Black likewise", km.promotions("pawn-b", 1, 0, -1).sort(),
	["bishop", "king", "queen", "rook"]);

// "Knights can castle with Rooks under the same rules and restrictions as
// Kings can in Chess."
const kmCastle = km.movesFrom({ e1: "wN*", a1: "wR*", h1: "wR*", e8: "bN*" }, "e1")
	.filter((m) => m.cg !== undefined);
t.check("the royal Knight castles both ways", kmCastle.length, 2);
t.check("landing two squares away, as a King would",
	kmCastle.map((m) => km.geo.PosName(m.t)).sort(), ["c1", "g1"]);
t.check("no castling once it has moved",
	km.movesFrom({ e1: "wN", a1: "wR*", h1: "wR*", e8: "bN*" }, "e1")
		.filter((m) => m.cg !== undefined).length, 0);

t.check("a game runs", km.plays(60), 60);

/* ================= Pemba ================= */

console.log("\nPemba: a 10x10 board and six pieces from the old games");

const pemba = load("cazaux/pemba-model.js");

t.check("a 10 x 10 board", [pemba.geo.width, pemba.geo.height], [10, 10]);

// the reference guide, piece by piece
t.check("Elephant: Ferz and Alfil", pemba.reach("elephant", "d6"), 8);
t.check("Camel: the 8 (3,1) squares", pemba.reach("camel", "d6"), 8);
t.check("Giraffe: the 8 (3,2) squares", pemba.reach("giraffe", "d6"), 8);
t.check("Machine: Wazir and Dabbaba", pemba.reach("machine", "d6"), 8);
t.check("Cannon: the Rook's lines", pemba.reach("cannon", "d6"), pemba.reach("rook", "d6"));
t.check("Crocodile: the Bishop's", pemba.reach("bow", "d6"), pemba.reach("bishop", "d6"));

// both hop over a screen to capture, and only to capture
const screen = (name, from, to) => {
	const graph = pemba.types[pemba.typeNamed(name)].graph[pemba.geo.PosByName(from)] || [];
	let flags = "";
	graph.forEach((line) => {
		for(const entry of line)
			if((entry & 0xffff) === pemba.geo.PosByName(to)) {
				flags = [];
				if(entry & pemba.constants.FLAG_MOVE) flags.push("move");
				if(entry & pemba.constants.FLAG_SCREEN_CAPTURE) flags.push("screen");
				flags = flags.join("+");
			}
	});
	return flags;
};
t.check("the Cannon captures over a screen", screen("cannon", "d6", "d9"), "move+screen");
t.check("the Crocodile too, on the diagonal", screen("bow", "d6", "g9"), "move+screen");

t.check("ten Pawns a side",
	(pemba.types[pemba.typeNamed("ipawn-w")].initial || []).length, 10);
t.check("a Pawn is subject to en passant",
	Object.keys(pemba.types).filter((k) => pemba.types[k].epCatch)
		.map((k) => pemba.types[k].name).sort(),
	["pawn-b", "pawn-w"]);

/*
 * Castling: the King moves two squares towards the Rook it castles with, and
 * that Rook lands on the square the King crossed - orthodox rules on a wider
 * board. The King starts on f, so it lands on h with the Rook on i, and on d
 * with the Rook on b.
 */
const pembaCastle = pemba.movesFrom({ f2: "wK*", b2: "wR*", i2: "wR*", f9: "bK*" }, "f2")
	.filter((m) => m.cg !== undefined);
t.check("it castles both ways", pembaCastle.length, 2);
t.check("the King landing two squares away, on d2 or h2",
	pembaCastle.map((m) => pemba.geo.PosName(m.t)).sort(), ["d2", "h2"]);
t.check("the Rook landing on the square the King crossed", (() => {
	const table = pemba.game.cbVar.castle;
	return Object.keys(table)
		.map((key) => pemba.geo.PosName(table[key].r[table[key].r.length - 1]))
		.sort();
})(), ["e2", "e9", "g2", "g9"]);
t.check("none of it once the King has moved",
	pemba.movesFrom({ f2: "wK", b2: "wR*", i2: "wR*", f9: "bK*" }, "f2")
		.filter((m) => m.cg !== undefined).length, 0);

/*
 * The Expert level's engine has to agree, or the castling move it returns is
 * matched against the closest thing on this side - an ordinary King step. The
 * queenside file said "e", one square, and now says "d".
 */
const pembaIni = (() => {
	const games = require("../../src/games/chessbase/index.js").games;
	return games.find((game) => game.name === "pemba-chess")
		.config.model.levels.find((entry) => entry && entry.ai === "fairy-stockfish")
		.customVariantIni;
})();
t.check("the engine castles on the same two files",
	[(/castlingKingsideFile\s*=\s*(\w)/.exec(pembaIni) || [])[1],
	 (/castlingQueensideFile\s*=\s*(\w)/.exec(pembaIni) || [])[1]], ["h", "d"]);
t.ok("and on the King's own rank", /castlingRank\s*=\s*2/.test(pembaIni));

// the rules page said there was no castling at all
t.ok("the rules page says so too", (() => {
	const fs = require("fs"), path = require("path");
	const page = fs.readFileSync(path.join(__dirname, "..", "..", "src", "games",
		"chessbase", "res", "rules", "shako", "pemba-rules.html"), "utf8");
	return /Castling remains/.test(page) && !/no castling/.test(page);
})());

t.check("a game runs", pemba.plays(60), 60);

/* ================= Gross Chess ================= */

console.log("\nGross Chess: a reserve of pieces to promote into");

const gross = load("duodecimal/gross-model.js", ["fairy-piece-model.js"]);

t.check("a 12 x 12 board", [gross.geo.width, gross.geo.height], [12, 12]);
// "a compound of the Alfil, Dababbah, and Wazir"
t.check("Champion: Alfil, Dabbaba and Wazir", gross.reach("champion", "f6"), 12);
// "one space diagonally or leaps ... a compound of the Ferz and the Camel"
t.check("Wizard: Ferz and Camel", gross.reach("wizard", "f6"), 12);
t.check("Marshall: Rook and Knight",
	gross.reach("marshall", "f6"), gross.reach("rook", "f6") + 8);
t.check("Archbishop: Bishop and Knight",
	gross.reach("archbishop", "f6"), gross.reach("bishop", "f6") + 8);
t.check("Cannon: the Rook's lines", gross.reach("cannon", "f6"), gross.reach("rook", "f6"));
t.check("Vao: the Bishop's", gross.reach("vao", "f6"), gross.reach("bishop", "f6"));

/*
 * "A Pawn may promote when it reaches any of the last three ranks... Promotion
 * on the tenth rank is limited to color-bound and short-range minor pieces...
 * the eleventh rank ... plus Champions, Cannons, and Rooks. Promotion to
 * Archbishop, Marshall, or Queen is allowed only on the last rank."
 *
 * What is offered also depends on the reserve, so these are checked on a board
 * holding nothing but the two Kings, where every reserve is full.
 */
const promotionsOn = (rank) => {
	const board = H.setup(gross.sandbox, gross.game, { g2: "wK", g11: "bK" }, 1);
	const width = gross.geo.width;
	const from = (rank - 2) * width + 3, to = (rank - 1) * width + 3;
	return (gross.game.cbVar.promote.call(board, gross.game, { t: 0, s: 1, p: from },
		{ t: to, f: from, c: null }) || [])
		.map((into) => gross.types[into].name).filter((name) => name !== "pawnw").sort();
};
t.check("nothing promotes before the tenth rank", promotionsOn(9), []);
t.check("the tenth rank: the short-range minors", promotionsOn(10),
	["bishop", "knight", "vao", "wizard"]);
t.check("the eleventh: those plus Champion, Cannon and Rook", promotionsOn(11),
	["bishop", "cannon", "champion", "knight", "rook", "vao", "wizard"]);
t.check("the twelfth: everything", promotionsOn(12),
	["archbishop", "bishop", "cannon", "champion", "knight", "marshall", "queen",
	 "rook", "vao", "wizard"]);

// optional on the tenth and eleventh, forced on the last
const stayAPawn = (rank) => {
	const board = H.setup(gross.sandbox, gross.game, { g2: "wK", g11: "bK" }, 1);
	const width = gross.geo.width;
	const from = (rank - 2) * width + 3, to = (rank - 1) * width + 3;
	return (gross.game.cbVar.promote.call(board, gross.game, { t: 0, s: 1, p: from },
		{ t: to, f: from, c: null }) || [])
		.map((into) => gross.types[into].name).indexOf("pawnw") === 0;
};
t.ok("a Pawn may stay a Pawn on the tenth", stayAPawn(10));
t.ok("and on the eleventh", stayAPawn(11));
t.ok("but not on the last rank", !stayAPawn(12));

/*
 * The reserve: how many of a kind may stand on the board before promotion to
 * it stops being offered. The rules put "two Queens, four Rooks, four Knights,
 * and four Bishops" in reserve ON TOP of the pieces in play, so the ceiling
 * should be what the game starts with plus that - six Bishops, six Knights,
 * six Rooks, three Queens. Everything else has only captured pieces to draw
 * on, and its ceiling is the two it starts with.
 */
const ceiling = (letter, name) => {
	const files = "abcdefghijkl";
	for(let count = 1; count <= 8; count++) {
		const pieces = { g2: "wK", g11: "bK" };
		for(let i = 0; i < count; i++)
			pieces[files[i] + "5"] = "w" + letter;
		const board = H.setup(gross.sandbox, gross.game, pieces, 1);
		const from = 10 * 12 + 3, to = 11 * 12 + 3;
		const offered = (gross.game.cbVar.promote.call(board, gross.game,
			{ t: 0, s: 1, p: from }, { t: to, f: from, c: null }) || [])
			.map((into) => gross.types[into].name);
		if(offered.indexOf(name) < 0)
			return count;
	}
	return 9;
};
[["B", "bishop", 6], ["N", "knight", 6], ["R", "rook", 6], ["Q", "queen", 3],
 ["V", "vao", 2], ["W", "wizard", 2], ["O", "champion", 2], ["X", "cannon", 2],
 ["M", "marshall", 1], ["A", "archbishop", 1]].forEach(([letter, name, most]) => {
	t.check("at most " + most + " " + name + (most > 1 ? "s" : ""),
		ceiling(letter, name), most);
});

/*
 * And on the last rank with the reserve exhausted, the move itself is not
 * possible - as in Grand Chess. A Pawn that could walk there and stay a Pawn
 * would be stuck on a square it can never leave.
 */
t.check("a Pawn cannot reach the last rank with nothing to become", (() => {
	const files = "abcdefghijkl";
	const pieces = { g2: "wK", g11: "bK" };
	let square = 0;
	const fill = (letter, count) => {
		for(let i = 0; i < count; i++, square++)
			pieces[files[square % 12] + (4 + Math.floor(square / 12))] = "w" + letter;
	};
	fill("B", 6); fill("N", 6); fill("R", 6); fill("Q", 3);
	fill("V", 2); fill("W", 2); fill("O", 2); fill("X", 2);
	fill("M", 1); fill("A", 1);
	const board = H.setup(gross.sandbox, gross.game, pieces, 1);
	return gross.game.cbVar.promote.call(board, gross.game,
		{ t: 0, s: 1, p: 10 * 12 + 3 }, { t: 11 * 12 + 3, f: 10 * 12 + 3, c: null });
})(), null);

/*
 * Castling: "Moves as in usual Chess but castle 2 or 3 squares away with the
 * rook." The King starts on g.
 */
const grossCastle = gross.movesFrom({ g2: "wK*", b2: "wR*", k2: "wR*", g11: "bK*" }, "g2")
	.filter((m) => m.cg !== undefined)
	.map((m) => gross.geo.PosName(m.t & 0xffff)).sort();
t.check("kingside, two or three squares",
	grossCastle.filter((square) => square > "g"), ["i2", "j2"]);
/*
 * Queenside the King may also go four squares, which the rules page does not
 * describe - but the published implementation offers the same three, so this
 * records the behaviour rather than calling it a fault.
 */
t.check("queenside, two, three or four",
	grossCastle.filter((square) => square < "g"), ["c2", "d2", "e2"]);

t.check("a game runs", gross.plays(60), 60);

t.done("Knightmate, Pemba and Gross Chess");
