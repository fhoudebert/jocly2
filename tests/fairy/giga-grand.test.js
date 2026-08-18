/*
 * Gigachess II and Grand Chess, against
 *   https://www.chessvariants.com/rules/gigachess (the II variant)
 *   https://www.chessvariants.com/large.dir/freeling.html (Grand Chess)
 *
 *   node tests/chessbase/giga-grand.test.js
 *
 */

const H = require("./khans/harness.js");

const SCRIPTS = (model) =>
	["base-model.js", "grid-geo-model.js", "fairy-piece-model.js", model];

const t = H.runner();

function load(model) {
	const sandbox = H.loadModel(SCRIPTS(model));
	const game = H.newGame(sandbox);
	return {
		sandbox, game,
		geo: game.cbVar.geometry,
		types: game.cbVar.pieceTypes,
		engine: (move) =>
			Object.assign(Object.create(sandbox.Model.Move), move).ToString("engine"),
	};
}

/* ================= Gigachess II ================= */

console.log("\nGigachess II: the King's jump");

const giga = load("cazaux/gigachessII-model.js");

function kingMoves(ctx, pieces, who, square) {
	const board = H.setup(ctx.sandbox, ctx.game, pieces, who);
	board.mMoves = [];
	board.GenerateMoves(ctx.game);
	const from = ctx.geo.PosByName(square);
	return board.mMoves.filter((move) => move.f === from).map(ctx.engine);
}

// eight ordinary steps plus eleven jumps: the ring of sixteen squares two
// away, less the five that fall off the board behind the King
const white = kingMoves(giga, { h2: "wK*", a14: "bK*" }, 1, "h2");
t.check("nineteen moves from h2", white.length, 19);
t.check("no move offered twice", white.filter((m, i) => white.indexOf(m) !== i), []);

const black = kingMoves(giga, { h13: "bK*", a1: "wK*" }, -1, "h13");
t.check("nineteen from h13 too", black.length, 19);
t.check("none of them twice", black.filter((m, i) => black.indexOf(m) !== i), []);

t.check("only on the King's first move",
	kingMoves(giga, { h2: "wK", a14: "bK*" }, 1, "h2").length, 8);

/*
 * h2-f2 is a straight jump over g2, and over g2 alone. A Knight on e1
 * threatens g2 without covering f2; one on e2 threatens g1 and g3, neither of
 * which the King ever touches on that jump.
 */
t.ok("an attacked g2 stops h2-f2",
	kingMoves(giga, { h2: "wK*", a14: "bK*", e1: "bN" }, 1, "h2").indexOf("h2f2") < 0);
t.ok("attacks on g1 and g3 do not",
	kingMoves(giga, { h2: "wK*", a14: "bK*", e2: "bN" }, 1, "h2").indexOf("h2f2") >= 0);

/*
 * h2-g4 is Knight-like, passing between g3 and h3: one free square is enough.
 * A Knight on f4 threatens h3 alone, one on e2 threatens g3 alone - neither
 * covers g4 itself, which would refuse the jump for another reason entirely.
 */
t.ok("h2-g4 with only h3 attacked",
	kingMoves(giga, { h2: "wK*", a14: "bK*", f4: "bN" }, 1, "h2").indexOf("h2g4") >= 0);
t.ok("h2-g4 with only g3 attacked",
	kingMoves(giga, { h2: "wK*", a14: "bK*", e2: "bN" }, 1, "h2").indexOf("h2g4") >= 0);
t.ok("h2-g4 with both attacked is refused",
	kingMoves(giga, { h2: "wK*", a14: "bK*", f4: "bN", e2: "bN" }, 1, "h2").indexOf("h2g4") < 0);

t.ok("the destination must be free",
	kingMoves(giga, { h2: "wK*", a14: "bK*", f2: "wR" }, 1, "h2").indexOf("h2f2") < 0);
t.ok("the square passed over may be occupied",
	kingMoves(giga, { h2: "wK*", a14: "bK*", g2: "wR" }, 1, "h2").indexOf("h2f2") >= 0);

console.log("\nGigachess II: promotion and en passant");

const promotes = (ctx, name, square) => {
	let type = null;
	for(const t2 in ctx.types)
		if(ctx.types[t2].name === name)
			type = parseInt(t2);
	return (ctx.game.cbVar.promote(ctx.game, { t: type, s: 1, p: ctx.geo.PosByName(square) },
		{ t: ctx.geo.PosByName(square) }) || []).map((into) => ctx.types[into].name);
};

[["ipawnw", "queen"], ["princew", "amazon"], ["knight", "Buffalo"],
 ["camel", "Buffalo"], ["giraffe", "Buffalo"], ["elephant", "lion"],
 ["machine", "lion"], ["centaur", "lion"]].forEach(([piece, into]) => {
	t.check(piece + " promotes to " + into, promotes(giga, piece, "h14"), [into]);
});

// "Only a Pawn may capture en passant; the Prince does not have this option"
t.check("only Pawns capture en passant",
	Object.keys(giga.types).filter((k) => giga.types[k].epCatch)
		.map((k) => giga.types[k].name).sort(), ["ipawnb", "ipawnw"]);
t.check("Pawns and Princes can be caught that way",
	Object.keys(giga.types).filter((k) => giga.types[k].epTarget)
		.map((k) => giga.types[k].name).sort(),
	["ipawnb", "ipawnw", "princeb", "princew"]);

/*
 * Flags are one thing; what the generator does with them is another. A Prince
 * takes its double step past a Pawn's capture square: the Pawn must be able to
 * take it there, and nothing else may.
 */
const enPassant = (() => {
	const board = H.setup(giga.sandbox, giga.game,
		// the Kings are marked as already moved: an unmoved King away from its
		// starting square has no entry in the jump table
		{ h13: "bP!*", g11: "wP", f11: "wZ", a1: "wK", a14: "bK" }, -1);
	board.mMoves = [];
	board.GenerateMoves(giga.game);
	const double = board.mMoves.find((m) => giga.engine(m) === "h13h11");
	if(!double)
		return { double: null };
	board.ApplyMove(giga.game, double);
	board.mWho = 1;
	board.mMoves = [];
	board.GenerateMoves(giga.game);
	const from = (square) => board.mMoves.filter((m) => m.f === giga.geo.PosByName(square))
		.map(giga.engine);
	return { double: "h13h11", pawn: from("g11"), giraffe: from("f11") };
})();
t.check("a Prince may take two steps", enPassant.double, "h13h11");
t.ok("a Pawn takes it en passant", enPassant.pawn.indexOf("g11h12") >= 0);
t.ok("the Giraffe standing by cannot", enPassant.giraffe.indexOf("f11h12") < 0);

/*
 * The Prince shared the Pawn's FEN letter, so every Pawn came back as a Prince
 * when a position was reloaded - 28 of the 96 pieces on the board. Nothing in
 * play shows it: the game runs, only saved positions come back wrong.
 */
const roundTrip = (ctx) => {
	const board = H.newBoard(ctx.sandbox, ctx.game);
	const before = {};
	board.pieces.forEach((piece) => { if(piece.p >= 0) before[piece.p] = ctx.types[piece.t].name; });
	const back = ctx.sandbox.Model.Game.Import("pjn", board.ExportBoardState(ctx.game)).initial;
	const after = {};
	(back.pieces || []).forEach((piece) => { after[piece.p] = ctx.types[piece.t].name; });
	return Object.keys(before).filter((pos) => before[pos] !== after[pos]).length;
};
t.check("no piece changes type when a position is reloaded", roundTrip(giga), 0);
t.check("no FEN letter is claimed by two pieces", (() => {
	const seen = {};
	Object.keys(giga.types).forEach((k) => {
		const letter = giga.types[k].fenAbbrev || giga.types[k].abbrev || "";
		(seen[letter] = seen[letter] || []).push(giga.types[k].name);
	});
	// the two halves of a directional piece share a letter, the FEN case tells
	// them apart - anything else is a collision
	return Object.keys(seen).filter((letter) => seen[letter].length > 2
		|| (seen[letter].length === 2
			&& seen[letter][0].replace(/[wb]$/, "") !== seen[letter][1].replace(/[wb]$/, "")));
})(), []);

/* ================= Grand Chess ================= */

console.log("\nGrand Chess: promotion only to what has been captured");

const grand = load("decimal/grand-model.js");

/*
 * The promotion pool is worked out by counting one's own pieces still in
 * play, so these positions have to start from the real board rather than a
 * handful of pieces: on a bare board every absent piece looks captured, and
 * the Pawn would promote to anything.
 */
function pawnOn(square, lost) {
	const board = H.newBoard(grand.sandbox, grand.game);
	// clear the a-file ahead of the Pawn
	["a10", "a9", "a8"].forEach((s) => {
		const piece = board.board[grand.geo.PosByName(s)];
		if(piece >= 0) {
			board.pieces[piece].p = -1;
			board.board[grand.geo.PosByName(s)] = -1;
		}
	});
	const from = grand.geo.PosByName("a3"), to = grand.geo.PosByName(square);
	const pawn = board.board[from];
	board.board[from] = -1;
	board.pieces[pawn].p = to;
	board.board[to] = pawn;
	board.pieces[pawn].m = true;
	if(lost) {                       // that piece has been captured
		const piece = board.board[grand.geo.PosByName(lost)];
		board.pieces[piece].p = -1;
		board.board[grand.geo.PosByName(lost)] = -1;
	}
	board.mWho = 1;
	board.mMoves = [];
	board.GenerateMoves(grand.game);
	return board.mMoves.filter((move) => move.f === to).map(grand.engine).sort();
}

// "If no friendly piece has been captured, then a Pawn may not move beyond
// the 9th rank"
t.check("a Pawn on the 9th rank with nothing captured cannot move",
	pawnOn("a9", null), []);
t.check("once a Knight has been captured, it may promote to it",
	pawnOn("a9", "b2"), ["a9a10N"]);
t.check("or to the Queen, if that is what was lost",
	pawnOn("a9", "d2"), ["a9a10Q"]);

// "A Pawn may promote on reaching the 8th or 9th rank" - may, not must
t.check("on the 8th rank promotion is optional",
	pawnOn("a8", "b2"), ["a8a9", "a8a9N", "a8b9", "a8b9N"]);
// "A Pawn must promote on reaching the 10th rank"
t.ok("on the 10th it is compulsory",
	pawnOn("a9", "b2").indexOf("a9a10") < 0);

// "An imobile Pawn on the 9th rank can still give check"
t.check("a Pawn on i9 checks a King on j10", (() => {
	const board = H.setup(grand.sandbox, grand.game,
		{ i9: "wP", j10: "bK", a1: "wK" }, -1);
	board.mMoves = [];
	board.GenerateMoves(grand.game);
	return board.cbGetAttackers(grand.game, board.kings[-1], -1, true).length;
})(), 1);

// "Castling is not possible"
t.check("no castling move exists", (() => {
	const board = H.newBoard(grand.sandbox, grand.game);
	board.mMoves = [];
	board.GenerateMoves(grand.game);
	return board.mMoves.filter((move) => move.cg !== undefined).length;
})(), 0);

t.check("Pawns are subject to en passant",
	Object.keys(grand.types).filter((k) => grand.types[k].epCatch)
		.map((k) => grand.types[k].name).sort(), ["pawnb", "pawnw"]);

/* ================= both games run ================= */

console.log("\nboth games run");

[["Gigachess II", giga], ["Grand Chess", grand]].forEach(([label, ctx]) => {
	const board = H.newBoard(ctx.sandbox, ctx.game);
	ctx.game.mPlayedMoves = [];
	let seed = 13579;
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
	t.ok(label + ": " + plies + " plies", !crash);
	if(crash)
		console.log("    " + crash.message);
});

t.done("Gigachess II and Grand Chess");
