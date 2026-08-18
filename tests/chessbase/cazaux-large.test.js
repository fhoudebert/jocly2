/*
 * Metamachy, Terachess and Minjiku Shogi, against the rules pages shipped with
 * them (res/rules/metamachy, res/rules/terachess, res/rules/minjiku-shogi).
 *
 *   node tests/chessbase/cazaux-large.test.js
 */

const H = require("../khans/harness.js");

const SETS = {
	metamachy: ["base-model.js", "grid-geo-model.js", "cazaux/metamachy-model.js"],
	terachess: ["base-model.js", "grid-geo-model.js", "cazaux/terachess-model.js"],
	minjiku: ["base-model.js", "grid-geo-model.js", "fairy-piece-model.js",
		"locust-move-model.js", "locust/minjiku-shogi-model.js"],
};

function load(name) {
	const sandbox = H.loadModel(SETS[name]);
	const game = H.newGame(sandbox);
	const ctx = {
		sandbox, game,
		geo: game.cbVar.geometry,
		types: game.cbVar.pieceTypes,
		constants: sandbox.Model.Game.cbConstants,
	};
	ctx.typeNamed = (pieceName, letter) => {
		for(const t in ctx.types)
			if(ctx.types[t].name === pieceName
				&& (letter === undefined || (ctx.types[t].fenAbbrev || ctx.types[t].abbrev) === letter))
				return parseInt(t);
		throw new Error(name + " has no piece named " + pieceName);
	};
	// every square a piece can reach from one square of an empty board
	ctx.reach = (pieceName, square, letter) => {
		const from = ctx.geo.PosByName(square), out = new Set();
		(ctx.types[ctx.typeNamed(pieceName, letter)].graph[from] || []).forEach((line) => {
			for(const entry of line)
				if(entry & (ctx.constants.FLAG_MOVE | ctx.constants.FLAG_CAPTURE))
					out.add(entry & 0xffff);
		});
		return out.size;
	};
	// which of move / capture / screen-capture apply on a given square
	ctx.flagsOn = (pieceName, from, to) => {
		const start = ctx.geo.PosByName(from), target = ctx.geo.PosByName(to);
		let found = "";
		(ctx.types[ctx.typeNamed(pieceName)].graph[start] || []).forEach((line) => {
			for(const entry of line)
				if((entry & 0xffff) === target) {
					found = [];
					if(entry & ctx.constants.FLAG_MOVE) found.push("move");
					if(entry & ctx.constants.FLAG_CAPTURE) found.push("capture");
					if(entry & ctx.constants.FLAG_SCREEN_CAPTURE) found.push("screen");
					found = found.join("+");
				}
		});
		return found;
	};
	/*
	 * The piece arrives on `row` from the row before it. That matters for
	 * Minjiku, where promotion is offered on ENTERING the zone: a quiet move
	 * from one zone square to another does not promote, so a test starting
	 * inside the zone would report no promotion at all.
	 */
	ctx.promotesTo = (pieceName, row, letter) => {
		const type = ctx.typeNamed(pieceName, letter);
		const to = row * ctx.geo.width + 3;
		const from = to - ctx.geo.width;
		const list = ctx.game.cbVar.promote(ctx.game,
			{ t: type, s: 1, p: from }, { t: to, f: from, c: null }) || [];
		return list.map((into) => ctx.types[into].name);
	};
	ctx.sides = () => {
		const board = H.newBoard(ctx.sandbox, ctx.game);
		let white = 0;
		board.pieces.forEach((piece) => { if(piece.p >= 0 && piece.s > 0) white++; });
		return white;
	};
	// a position saved and reloaded must come back as the same pieces
	ctx.roundTrip = () => {
		const board = H.newBoard(ctx.sandbox, ctx.game);
		const before = {};
		board.pieces.forEach((piece) => {
			if(piece.p >= 0) before[piece.p] = ctx.types[piece.t].name + "/" + piece.s;
		});
		const back = ctx.sandbox.Model.Game.Import("pjn", board.ExportBoardState(ctx.game)).initial;
		const after = {};
		(back.pieces || []).forEach((piece) => {
			after[piece.p] = ctx.types[piece.t].name + "/" + piece.s;
		});
		return Object.keys(before).filter((pos) => before[pos] !== after[pos]).length;
	};
	ctx.plays = (plies) => {
		const board = H.newBoard(ctx.sandbox, ctx.game);
		ctx.game.mPlayedMoves = [];
		let seed = 4242, played = 0;
		const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
		while(played < plies) {
			board.mMoves = [];
			board.GenerateMoves(ctx.game);
			if(board.mMoves.length === 0)
				break;
			const move = board.mMoves[Math.floor(random() * board.mMoves.length)];
			board.ApplyMove(ctx.game, move);
			ctx.game.mPlayedMoves.push(move);
			board.mWho = -board.mWho;
			played++;
		}
		return played;
	};
	return ctx;
}

const t = H.runner();

/* ================= Metamachy ================= */

console.log("\nMetamachy: 12x12, 12 kinds of piece");

const meta = load("metamachy");

t.check("thirty pieces a side", meta.sides(), 30);
t.check("twelve kinds", new Set(Object.keys(meta.types)
	.map((k) => meta.types[k].name.replace(/-[wb]$/, "").replace(/^i/, ""))).size, 12);

// "Lion: moves as a King, or may jump to a position two squares away ...
// or jumping as a Knight"
t.check("Lion: a step, or any leap two squares away", meta.reach("lion", "g7"), 24);
// "Griffon: moves one square diagonally and then slides away ... vertically or
// horizontally"
t.check("Griffon: a diagonal step then a straight ray", meta.reach("eagle", "g7"), 40);
// "Camel: jumps to the opposite case of a 2x4 rectangle"
t.check("Camel: the 8 (3,1) squares", meta.reach("camel", "g7"), 8);
// "Elephant: moves one or two squares diagonally"
t.check("Elephant: Ferz and Alfil", meta.reach("elephant", "g7"), 8);
t.check("Knight: the 8 (2,1) squares", meta.reach("knight", "g7"), 8);
// "Prince: ... Like the Pawn, he can also move without capturing to the second
// square straight ahead"
t.check("Prince: eight neighbours and the second square ahead",
	meta.reach("prince-w", "g7"), 9);

// "Pawn: can move straight forward one or two square from ANY position"
t.check("a Pawn keeps its double step wherever it stands", meta.reach("ipawn-w", "g7"), 4);
t.check("and never turns into a single-stepper",
	meta.game.cbVar.promote(meta.game, { t: meta.typeNamed("ipawn-w"), s: 1, p: 30 },
		{ t: 42, f: 30, c: null }), []);

// "When he reaches the last row it can promote to one of the three major
// pieces: Queen, Lion or Griffon"
t.check("a Pawn promotes to one of the three majors",
	meta.promotesTo("ipawn-w", 11).sort(), ["eagle", "lion", "queen"]);
t.check("and so does a Prince", meta.promotesTo("prince-w", 11).sort(),
	["eagle", "lion", "queen"]);

// "the en-passant capture is possible every time an opposite Pawn or Prince
// has advanced two squares"
t.check("Pawns and Princes can be caught en passant",
	Object.keys(meta.types).filter((k) => meta.types[k].epTarget)
		.map((k) => meta.types[k].name.replace(/-[wb]$/, "")).sort()
		.filter((name, i, all) => all.indexOf(name) === i),
	["ipawn", "prince"]);
t.check("only Pawns capture that way",
	Object.keys(meta.types).filter((k) => meta.types[k].epCatch)
		.map((k) => meta.types[k].name.replace(/-[wb]$/, "").replace(/^i/, "")).sort()
		.filter((name, i, all) => all.indexOf(name) === i),
	["pawn"]);

/*
 * "Black freely decides where to place his King, Queen, Griffon and Lion" -
 * twelve setups, the King landing on f1 or f2 and nowhere else. That matters
 * beyond the rules: the King's first-move jump is a table keyed by its
 * starting square, and a setup putting it anywhere else would take the whole
 * move generator down with it.
 */
console.log("\nMetamachy: the twelve setups");

const setups = [];
for(let i = 0; i < 12; i++) {
	const board = H.newBoard(meta.sandbox, meta.game);
	board.ApplyMove(meta.game, {});
	board.ApplyMove(meta.game, { setup: i });
	let moves = null;
	try {
		board.mWho = 1;
		board.mMoves = [];
		board.GenerateMoves(meta.game);
		moves = board.mMoves.length;
	} catch(error) {
		moves = "crash: " + error.message;
	}
	setups.push({ king: meta.geo.PosName(board.kings[1]), moves });
}
t.check("twelve of them", (() => {
	const board = H.newBoard(meta.sandbox, meta.game);
	board.ApplyMove(meta.game, {});
	board.mMoves = [];
	board.GenerateMoves(meta.game);
	return board.mMoves.length;
})(), 12);
t.check("the King only ever stands on f1 or f2",
	[...new Set(setups.map((s) => s.king))].sort(), ["f1", "f2"]);
t.ok("and every setup generates its moves",
	setups.every((s) => typeof s.moves === "number" && s.moves > 0));

/* ================= Terachess ================= */

console.log("\nTerachess: 16x16, 64 pieces a side");

const tera = load("terachess");

t.check("sixty-four pieces a side", tera.sides(), 64);

// the row-by-row list of the rules page, as piece counts
[["amazon", 1], ["marshall", 1], ["cardinal", 1], ["star", 1], ["rhino", 1],
 ["buffalo", 1], ["cannon", 2], ["bull", 2], ["bow", 2], ["camel", 2],
 ["antelope", 2], ["lion", 1], ["eagle", 1], ["corporalw", 14], ["king", 1],
 ["queen", 1], ["princew", 2], ["ship", 2], ["bishop", 2], ["knight", 2],
 ["rook", 2], ["machine", 2], ["elephant", 2], ["ipawnw", 16]].forEach(([name, count]) => {
	const initial = tera.types[tera.typeNamed(name)].initial || [];
	t.check(count + " " + name, initial.filter((entry) => entry.s > 0).length, count);
});

t.check("Antelope: 2 or 3 steps, straight or diagonal", tera.reach("antelope", "i9"), 16);
t.check("Bull: the 8 (3,2) squares", tera.reach("bull", "i9"), 8);
t.check("Camel: the 8 (3,1) squares", tera.reach("camel", "i9"), 8);
t.check("Buffalo: Knight, Camel and Bull together", tera.reach("buffalo", "i9"), 24);
t.check("Lion: a step, or any leap two squares away", tera.reach("lion", "i9"), 24);
t.check("Machine: Wazir and Dabbaba", tera.reach("machine", "i9"), 8);
t.check("Elephant: Ferz and Alfil", tera.reach("elephant", "i9"), 8);
t.check("Amazon: Queen and Knight",
	tera.reach("amazon", "i9"), tera.reach("queen", "i9") + 8);
t.check("Marshall: Rook and Knight",
	tera.reach("marshall", "i9"), tera.reach("rook", "i9") + 8);
t.check("Cardinal: Bishop and Knight",
	tera.reach("cardinal", "i9"), tera.reach("bishop", "i9") + 8);
// "Star: it moves like a Queen and needs an intermediate piece ... Like the
// Queen is Bishop + Rook, the Star is Cannon + Bow"
t.check("Star: the Queen's lines", tera.reach("star", "i9"), tera.reach("queen", "i9"));
t.check("Star: captures over a screen", tera.flagsOn("star", "i9", "i8"), "move+screen");
t.check("Bow: captures over a screen", tera.flagsOn("bow", "i9", "h8"), "move+screen");

/*
 * The Corporal is the Pawn plus one thing: "the Corporal can also advance 1
 * step diagonally forward (so, with or without capturing)". On the Pawn that
 * same square is a capture and nothing else - which is the whole difference
 * between the two pieces.
 */
t.check("Corporal: the diagonal step is a move as well as a capture",
	tera.flagsOn("corporalw", "i9", "h10"), "move+capture");
t.check("Pawn: the diagonal is a capture only",
	tera.flagsOn("ipawnw", "i9", "h10"), "capture");
t.check("both advance one or two squares from anywhere",
	[tera.reach("ipawnw", "i9"), tera.reach("corporalw", "i9")], [4, 4]);

// the promotions table of the rules page, in full
[["ipawnw", "queen"], ["corporalw", "queen"], ["princew", "amazon"],
 ["knight", "buffalo"], ["camel", "buffalo"], ["bull", "buffalo"],
 ["elephant", "lion"], ["machine", "lion"], ["ship", "eagle"],
 ["antelope", "star"]].forEach(([piece, into]) => {
	t.check(piece + " promotes to " + into, tera.promotesTo(piece, 15), [into]);
});

// "the en-passant capture is possible every time the opposite Pawn or Corporal
// or Prince has advanced two squares"
t.check("Pawn, Corporal and Prince can be caught en passant",
	[...new Set(Object.keys(tera.types).filter((k) => tera.types[k].epTarget)
		.map((k) => tera.types[k].name.replace(/[wb]$/, "").replace(/^i/, "")))].sort(),
	["corporal", "pawn", "prince"]);
t.check("only Pawn and Corporal capture that way",
	[...new Set(Object.keys(tera.types).filter((k) => tera.types[k].epCatch)
		.map((k) => tera.types[k].name.replace(/[wb]$/, "").replace(/^i/, "")))].sort(),
	["corporal", "pawn"]);

// "King: exactly as in usual Chess" - no jump of its own, and no castling
t.check("no castling", tera.game.cbVar.castle, undefined);

/* ================= Minjiku Shogi ================= */

console.log("\nMinjiku Shogi: 10x10 and four squares that vanish");

const minjiku = load("minjiku");

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

/* ================= all three ================= */

console.log("\nall three");

["metamachy", "terachess", "minjiku"].forEach((name) => {
	const ctx = name === "metamachy" ? meta : (name === "terachess" ? tera : minjiku);
	t.check(name + ": a saved position reloads unchanged", ctx.roundTrip(), 0);
	t.check(name + ": a game runs", ctx.plays(60), 60);
});

t.done("Metamachy, Terachess and Minjiku");
