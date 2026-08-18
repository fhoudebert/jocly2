/*
 * Fantastic XIII and Bigorra
 *
 *   node tests/chessbase/cazaux-xiii.test.js
 *
 * The two models are close cousins - Bigorra is the 16x16 game that gathers
 * "all pieces from my variants", Fantastic XIII the 13x13 one - and they share
 * both their code and their defects. Four things were wrong:
 *
 *   - the Troll's list of 3-square jumps had [-3,3] twice, which hid the
 *     absence of [3,-3]: seven jumps instead of eight, in both games;
 *   - Fantastic XIII had no King's jump at all, though its rules describe it
 *     at length ("Identical to Metamachy");
 *   - both games gave one FEN letter to two different pieces, so a saved
 *     position came back as a different army (50 of Bigorra's 160 pieces);
 *   - Bigorra's Giraffe could capture en passant, which belongs to Pawns and
 *     Soldiers alone.
 *
 * Promotions are worth stating in full here because the rules page bundled
 * with the game disagreed with the game itself, in prose - its own icon table
 * was right, and so was the model.
 */

const H = require("./khans/harness.js");

const SCRIPTS = (model) =>
	["base-model.js", "grid-geo-model.js", "fairy-piece-model.js", "cazaux/" + model];

const t = H.runner();

function load(model) {
	const sandbox = H.loadModel(SCRIPTS(model));
	const game = H.newGame(sandbox);
	const geo = game.cbVar.geometry;
	const types = game.cbVar.pieceTypes;
	const c = sandbox.Model.Game.cbConstants;
	const MASK = 0xffff;

	const typeNamed = (name) => {
		for(const type in types)
			if(types[type].name === name)
				return parseInt(type);
		throw new Error("no piece type named " + name + " in " + model);
	};
	// every square a piece reaches from one square on an empty board
	const pattern = (name, square) => {
		const from = geo.PosByName(square), reach = new Set();
		(types[typeNamed(name)].graph[from] || []).forEach((line) => {
			for(const entry of line)
				if(entry & (c.FLAG_MOVE | c.FLAG_CAPTURE))
					reach.add(geo.PosName(entry & MASK));
		});
		return [...reach].sort();
	};
	const promotes = (name, square) =>
		(game.cbVar.promote(game, { t: typeNamed(name), s: 1, p: geo.PosByName(square) },
			{ t: geo.PosByName(square) }) || []).map((type) => types[type].name);

	return { sandbox, game, geo, types, typeNamed, pattern, promotes,
		engine: (move) => Object.assign(Object.create(sandbox.Model.Move), move).ToString("engine") };
}

/*
 * A FEN that cannot be read back is a lost game. base-model.js does allow a
 * multi-character fenAbbrev - Tenjiku Shogi needs 66 of them and writes "B!",
 * "+C!" - so the fix is not to squeeze everything into single letters but to
 * stop two pieces sharing one code.
 */
function fenRoundTrip(model) {
	const { sandbox, game, geo, types } = load(model);
	const board = H.newBoard(sandbox, game);
	const before = {};
	for(const piece of board.pieces)
		if(piece.p >= 0)
			before[piece.p] = types[piece.t].name;
	const imported = sandbox.Model.Game.Import("pjn", board.ExportBoardState(game));
	const after = {};
	for(const piece of (imported.initial.pieces || []))
		after[piece.p] = types[piece.t].name;
	return Object.keys(before).filter((pos) => before[pos] !== after[pos]).length;
}

/* ================= Fantastic XIII ================= */

console.log("\nFantastic XIII: the King's jump");

const xiii = load("fantasticXIII-model.js");

/*
 * "On its first move, the King may jump to a free square at two squares'
 * distance... the jump is forbidden if that intermediate square is threatened
 * ... When jumping like a Knight, at least one of the two intermediate squares
 * must be free of threat ... not permitted if the King is in check."
 *
 * The King stands on g1, on the edge rank, so of the sixteen squares of the
 * ring only nine are on the board.
 */
function kingMoves(ctx, pieces, who, square) {
	const board = H.setup(ctx.sandbox, ctx.game, pieces, who);
	board.mMoves = [];
	board.GenerateMoves(ctx.game);
	const from = ctx.geo.PosByName(square);
	return board.mMoves.filter((move) => move.f === from).map(ctx.engine).sort();
}

t.check("nine jumps from g1, plus the five ordinary steps",
	kingMoves(xiii, { g1: "wK*", a13: "bK*" }, 1, "g1").length, 14);
t.check("and nine from g13 for Black",
	kingMoves(xiii, { g13: "bK*", a1: "wK*" }, -1, "g13").length, 14);
t.check("only on the King's first move",
	kingMoves(xiii, { g1: "wK", a13: "bK*" }, 1, "g1").length, 5);

/*
 * The straight jump g1-i1 passes over h1, and j1 has nothing to do with it.
 * The attackers are Trolls: this game has no Knight or Rook, and a Troll's
 * eight 3-square jumps make it easy to threaten one square of interest
 * without also covering the destination.
 */
t.ok("an attacked h1 stops g1-i1",                    // a Troll on h4 hits h1
	kingMoves(xiii, { g1: "wK*", a13: "bK*", h4: "bT" }, 1, "g1").indexOf("g1i1") < 0);
t.ok("an attacked j1 does not",                       // a Troll on m4 hits j1
	kingMoves(xiii, { g1: "wK*", a13: "bK*", m4: "bT" }, 1, "g1").indexOf("g1i1") >= 0);
// the Knight-like jump g1-f3 passes between f2 and g2: one free square is
// enough, and a Troll on f5 threatens f2 alone
t.ok("g1-f3 with only f2 attacked",
	kingMoves(xiii, { g1: "wK*", a13: "bK*", f5: "bT" }, 1, "g1").indexOf("g1f3") >= 0);
t.ok("the destination must be free",
	kingMoves(xiii, { g1: "wK*", a13: "bK*", i1: "wH" }, 1, "g1").indexOf("g1i1") < 0);
t.ok("the square passed over may be occupied",
	kingMoves(xiii, { g1: "wK*", a13: "bK*", h1: "wH" }, 1, "g1").indexOf("g1i1") >= 0);

console.log("\nFantastic XIII: the pieces");

// "it makes a 3-step orthogonal or diagonal jump... In addition, it moves
// 1 step forward and captures 1 step diagonally forward (like a Pawn)"
t.check("Troll: eight 3-square jumps, plus its Pawn move",
	xiii.pattern("troll-w", "g7"),
	["d10", "d4", "d7", "f8", "g10", "g4", "g8", "h8", "j10", "j4", "j7"].sort());

t.check("Hawk: two or three squares in the eight directions",
	xiii.pattern("hawk", "g7").length, 16);
t.check("Mammoth: one or two squares in the eight directions",
	xiii.pattern("mammoth", "g7").length, 16);
t.check("Squirrel: the ring at distance two", xiii.pattern("squirrel", "g7").length, 16);
t.check("Cheetah: the ring at distance three", xiii.pattern("Cheetah", "g7").length, 24);
t.check("Saber-tooth: both rings together", xiii.pattern("direwolf", "g7").length, 40);

console.log("\nFantastic XIII: promotion and en passant");

// "A Pawn or a Prince reaching the last rank is immediately replaced by a
// Direwolf"; Ship and Snake promote to Eagle and Rhinoceros
t.check("Pawn promotes to the Saber-tooth", xiii.promotes("ipawn-w", "g13"), ["direwolf"]);
t.check("Prince too", xiii.promotes("prince-w", "g13"), ["direwolf"]);
t.check("Ship promotes to the Eagle", xiii.promotes("ship", "g13"), ["griffon"]);
t.check("Snake promotes to the Rhinoceros", xiii.promotes("snake", "g13"), ["rhino"]);
// "They do not promote when they reach the last row by a long 3-square jump"
t.check("a Troll arriving one step from g12 promotes",
	xiii.promotes("troll-w", "g13").length, 1);
t.check("a Troll jumping three squares from g10 does not", (() => {
	const type = xiii.typeNamed("troll-w");
	return xiii.game.cbVar.promote(xiii.game,
		{ t: type, s: 1, p: xiii.geo.PosByName("g10") },
		{ t: xiii.geo.PosByName("g13") }).length;
})(), 0);

t.check("only Pawns capture en passant",
	Object.keys(xiii.types).filter((k) => xiii.types[k].epCatch)
		.map((k) => xiii.types[k].name).sort(), ["ipawn-b", "ipawn-w"]);
t.ok("a Prince taking two steps can be caught that way",
	xiii.types[xiii.typeNamed("prince-w")].epTarget);

t.check("a saved position comes back unchanged", fenRoundTrip("fantasticXIII-model.js"), 0);

/* ================= Bigorra ================= */

console.log("\nBigorra: the pieces");

const big = load("bigorra-model.js");

t.check("Troll: eight 3-square jumps, plus its Pawn move",
	big.pattern("troll-w", "h8"),
	["e11", "e5", "e8", "g9", "h11", "h5", "h9", "i9", "k11", "k5", "k8"].sort());
t.check("Buffalo: Knight, Camel and Giraffe together",
	big.pattern("Buffalo", "h8").length, 24);
t.check("Lion: a step in any direction, or a leap two away",
	big.pattern("lion", "h8").length, 24);
t.check("Cheetah: the ring at distance three", big.pattern("Cheetah", "h8").length, 24);
t.check("Direwolf: both rings together", big.pattern("direwolf", "h8").length, 40);

// the setup the rules describe: 16 pieces on each of the first three rows,
// then 8 Trolls, 8 Soldiers and 16 Pawns - 80 a side
t.check("eighty pieces a side", (() => {
	let count = 0;
	for(const type in big.types)
		count += (big.types[type].initial || []).length;
	return count / 2;
})(), 80);

console.log("\nBigorra: promotion and en passant");

[["ipawn-w", "queen"], ["soldier-w", "queen"], ["prince-w", "amazon"],
 ["knight", "Buffalo"], ["camel", "Buffalo"], ["giraffe", "Buffalo"],
 ["elephant", "lion"], ["machine", "lion"], ["centaur", "lion"],
 ["mammoth", "lion"], ["squirrel", "lion"],
 ["ship", "griffon"], ["snake", "rhino"], ["hawk", "duchess"]].forEach(
	([piece, into]) => {
		t.check(piece + " promotes to " + into, big.promotes(piece, "h16"), [into]);
	});
t.check("a Troll arriving one step promotes to the Direwolf",
	big.promotes("troll-w", "h16"), ["direwolf"]);
t.check("a Troll jumping three squares does not", (() => {
	const type = big.typeNamed("troll-w");
	return big.game.cbVar.promote(big.game,
		{ t: type, s: 1, p: big.geo.PosByName("h13") },
		{ t: big.geo.PosByName("h16") }).length;
})(), 0);

// "Only a Pawn or a Soldier may capture en passant; the Prince does not have
// this option" - and neither does the Giraffe, which used to
t.check("only Pawns and Soldiers capture en passant",
	Object.keys(big.types).filter((k) => big.types[k].epCatch)
		.map((k) => big.types[k].name).sort(),
	["ipawn-b", "ipawn-w", "soldier-b", "soldier-w"]);
t.check("Pawns, Soldiers and Princes can be caught that way",
	Object.keys(big.types).filter((k) => big.types[k].epTarget)
		.map((k) => big.types[k].name).sort(),
	["ipawn-b", "ipawn-w", "prince-b", "prince-w", "soldier-b", "soldier-w"]);

t.check("a saved position comes back unchanged", fenRoundTrip("bigorra-model.js"), 0);

/* ================= both games run ================= */

console.log("\nboth games run");

["fantasticXIII-model.js", "bigorra-model.js"].forEach((model) => {
	const ctx = load(model);
	const board = H.newBoard(ctx.sandbox, ctx.game);
	ctx.game.mPlayedMoves = [];
	let seed = 24680;
	const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
	let plies = 0, crash = null;
	try {
		while(plies < 40) {
			board.mMoves = [];
			board.GenerateMoves(ctx.game);
			if(board.mMoves.length === 0)
				break;
			const move = board.mMoves[Math.floor(random() * board.mMoves.length)];
			board.ApplyMove(ctx.game, move);
			ctx.game.mPlayedMoves.push(move);
			board.mWho = -board.mWho;
			plies++;
		}
	} catch(error) {
		crash = error;
	}
	t.ok(model + ": " + plies + " plies", !crash);
	if(crash)
		console.log("    " + crash.message);
});

t.done("Fantastic XIII and Bigorra");
