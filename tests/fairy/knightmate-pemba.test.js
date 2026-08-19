/*
 * Knightmate and Pemba, against the rules pages shipped with them
 * (res/rules/standard/knightmate.html, res/rules/shako/pemba-rules.html).
 *
 *   node tests/fairy/knightmate-pemba.test.js
 *
 * Knightmate needed nothing: the royal piece really is the Knight, the two
 * Kings really are ordinary pieces, and a Pawn may promote to a King and not
 * to a Knight - a promotion list that is easy to get backwards, since every
 * other game in the module says the opposite.
 *
 * Pemba is a question rather than a finding. Its rules page says "King: moves
 * as in usual Chess, except there is no castling", while the model generates
 * castling and the Fairy-Stockfish definition of the Expert level declares it
 * too - and those two do not agree on where the King lands on the queenside.
 * The tests below record what the model does; they do not settle which of the
 * three is right.
 */

const H = require("./harness.js");

function load(model) {
	const sandbox = H.loadModel(["base-model.js", "grid-geo-model.js", model]);
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
 * Castling. The rules page says there is none; the model has a table for it,
 * and so does the Fairy-Stockfish definition behind the Expert level, which
 * puts the King on file h kingside - the same as the model - and on file e
 * queenside, where the model puts it on d. Whichever of the three is right,
 * the model and the engine disagree with each other, and a castling move the
 * engine returns has no matching move on this side to be recognised as.
 */
const pembaCastle = pemba.movesFrom({ f2: "wK*", b2: "wR*", i2: "wR*", f9: "bK*" }, "f2")
	.filter((m) => m.cg !== undefined);
t.check("the model castles both ways", pembaCastle.length, 2);
t.check("the King landing on d2 or h2",
	pembaCastle.map((m) => pemba.geo.PosName(m.t)).sort(), ["d2", "h2"]);
t.check("the engine's definition says the same kingside", (() => {
	const games = require("../../src/games/chessbase/index.js").games;
	const level = games.find((game) => game.name === "pemba-chess")
		.config.model.levels.find((entry) => entry && entry.ai === "fairy-stockfish");
	return /castlingKingsideFile\s*=\s*h/.test(level.customVariantIni);
})(), true);
t.check("and something else queenside", (() => {
	const games = require("../../src/games/chessbase/index.js").games;
	const level = games.find((game) => game.name === "pemba-chess")
		.config.model.levels.find((entry) => entry && entry.ai === "fairy-stockfish");
	return (/castlingQueensideFile\s*=\s*(\w)/.exec(level.customVariantIni) || [])[1];
})(), "e");

t.check("a game runs", pemba.plays(60), 60);

t.done("Knightmate and Pemba");
