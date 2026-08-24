/*
 * Crazyhouse: orthodox chess plus Shogi drops.
 *
 *   node tests/crazyhouse/crazyhouse.test.js
 *
 * Written against the five rules of the game, one section each, and against
 * the traps the module has already sprung on other drop games - the FEN round
 * trip and the engine's reading of a move being the two that bite silently.
 *
 * COORDINATES. A drop game's holdings are extra COLUMNS of a wider grid (see
 * drop-model.js/cbDropGeometry), so the 8x8 board sits in columns 2..9 of a
 * 12-wide one and the geometry's own PosName() calls e2 "g2". Everything below
 * is written in real chess squares and translated by Sq()/At(); the two hand
 * columns are reached by Hand(), which names a slot rather than a square.
 */

const H = require("../fairy/harness.js");

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "drop-model.js",
	"famous/crazyhouse-model.js"];

const cz = H.context(SCRIPTS);
const sandbox = cz.sandbox, game = cz.game, geo = cz.geo, types = cz.types;

// "e2" -> "g2", the name the wide grid answers to
const Sq = (square) => String.fromCharCode(square.charCodeAt(0) + 2) + square.slice(1);
const At = (square) => geo.PosByName(Sq(square));

/*
 * Hand slots, in the order the model assigns them: P N B R Q. A slot is named
 * rather than given as a square, because the square it resolves to reads like
 * a board square and is not one - Black's Pawn slot is "b8" of the wide grid,
 * which is a real square's name two files to the left.
 */
const SLOT = { P: 0, N: 1, B: 2, R: 3, Q: 4 };
const Hand = (side, piece) => "hand/" + side + "/" + piece;

// a board holding exactly what is asked for, board squares given as real ones
function Setup(pieces, who) {
	const map = {};
	for(const square in pieces) {
		const slot = /^hand\/(-?1)\/([PNBRQ])$/.exec(square);
		map[slot ? geo.PosName(sandbox.Model.Game.handLayout[slot[1]][SLOT[slot[2]]])
			: Sq(square)] = pieces[square];
	}
	return H.setup(sandbox, game, map, who === undefined ? 1 : who);
}

function Moves(board, from) {
	board.mMoves = [];
	board.GenerateMoves(game);
	const moves = board.mMoves;
	return (from === undefined ? moves : moves.filter((m) => m.f === from));
}

const Str = (move) => cz.natural(move);
const Engine = (move) => cz.engine(move);

// apply a move named in its own natural notation, and hand over the turn
function Play(board, str) {
	const move = Moves(board).find((m) => Str(m) === str);
	if(!move)
		throw new Error("no such move: " + str + "\n  legal: "
			+ Moves(board).map(Str).sort().join(" "));
	board.ApplyMove(game, move);
	board.mWho = -board.mWho;
	return move;
}

const onBoard = (pos) => !!geo.BOARD_AREA[pos];

// what each side holds, as letters: the counters drop-model.js parks on the
// holding squares to draw the "x2" are not pieces anyone captured
function Held(board, side) {
	return board.pieces
		.filter((p) => p.p >= 0 && !onBoard(p.p) && p.s === side
			&& types[p.t].name !== "counter")
		.map((p) => types[p.t].fenAbbrev || types[p.t].abbrev || "?")
		.sort().join("");
}

const t = H.runner();

/* ------------------------------------------------------------------ *
 * the board
 * ------------------------------------------------------------------ */

console.log("\nthe board and the men");

// not cz.sides(): it counts the counter pseudo-pieces parked on the holding
// squares along with the men
t.check("sixteen pieces a side", (() => {
	const board = H.newBoard(sandbox, game);
	return board.pieces.filter((p) => p.p >= 0 && p.s > 0
		&& types[p.t].name !== "counter").length;
})(), 16);
t.check("eight files inside a twelve-wide grid", geo.width, 12);
t.check("eight ranks, no holding rows", geo.height, 8);
t.check("sixty-four playing squares", Object.keys(geo.BOARD_AREA).length, 64);
// the split classic-model.js makes between a Pawn that may still step twice
// and one that may not is what this model does without
t.check("one Pawn type a side",
	Object.keys(types).filter((k) => (types[k].name || "").indexOf("pawn") === 0).length, 2);
t.check("the King cannot be held",
	types[cz.typeNamed("king")].hand, undefined);

/* ------------------------------------------------------------------ *
 * 1. a captured piece changes sides and comes back
 * ------------------------------------------------------------------ */

console.log("\ncapture, hand, drop");

(() => {
	const board = Setup({ e1: "wK", e8: "bK", d4: "wR", d7: "bN" });
	t.check("nothing in hand at the start", Held(board, 1) + Held(board, -1), "");
	Play(board, "Rd4xd7");
	t.check("the captured Knight is in White's hand", Held(board, 1), "N");
	t.check("and off the board", Held(board, -1), "");
	// it is White's Knight now, so it is Black to move first
	board.mWho = 1;
	const drops = Moves(board).filter((m) => !onBoard(m.f));
	t.check("it can be dropped on any empty square", drops.length, 64 - 3);
	t.check("the drop reads as a drop", Str(drops[0]).slice(0, 2), "N@");
	Play(board, "N@a1");
	t.check("the hand is empty again", Held(board, 1), "");
	t.check("and the Knight is White's",
		board.pieces[board.board[At("a1")]].s, 1);
})();

/* ------------------------------------------------------------------ *
 * 2. no Pawn on the first or the last rank
 * ------------------------------------------------------------------ */

console.log("\nwhere a Pawn may be dropped");

(() => {
	const board = Setup({ a1: "wK", a8: "bK", [Hand(1, "P")]: "wP" });
	const files = (rank) => Moves(board)
		.filter((m) => !onBoard(m.f) && geo.R(m.t) === rank - 1).length;
	t.check("not on the first rank", files(1), 0);
	t.check("not on the last rank", files(8), 0);
	t.check("on all six others",
		[2, 3, 4, 5, 6, 7].map(files), [8, 8, 8, 8, 8, 8]);
})();

/* ------------------------------------------------------------------ *
 * 3. a Pawn dropped on the second rank may step twice - and only there
 * ------------------------------------------------------------------ */

console.log("\nthe double step follows the rank, not the piece");

(() => {
	const twice = (square) => {
		const board = Setup({ a1: "wK", a8: "bK", [Hand(1, "P")]: "wP" });
		Play(board, "P@" + square);
		board.mWho = 1;
		return Moves(board, At(square)).map(Str).sort();
	};
	t.check("dropped on e2, it may go to e3 or e4",
		twice("e2"), ["e2-e3", "e2-e4"]);
	t.check("dropped on e5, only to e6", twice("e5"), ["e5-e6"]);
	t.check("dropped on e3, only to e4", twice("e3"), ["e3-e4"]);
	// the same rule seen from Black's side
	const board = Setup({ a1: "wK", a8: "bK", [Hand(-1, "P")]: "bP" }, -1);
	Play(board, "P@e7");
	board.mWho = -1;
	t.check("and Black's, dropped on e7", Moves(board, At("e7")).map(Str).sort(),
		["e7-e5", "e7-e6"]);
})();

(() => {
	// the long step is blockable and still leaves an en-passant target
	const board = Setup({ e1: "wK", e8: "bK", e2: "wP", e3: "bN" });
	t.check("a blocked Pawn does not jump over", Moves(board, At("e2")).map(Str), []);
})();

(() => {
	const board = Setup({ e1: "wK", e8: "bK", e2: "wP", d4: "bP" });
	Play(board, "e2-e4");
	t.check("the double step is capturable en passant",
		Moves(board, At("d4")).map(Str).sort(), ["d4-d3", "d4xe3"]);
})();

/* ------------------------------------------------------------------ *
 * 4. a promoted piece, captured, comes back a Pawn
 * ------------------------------------------------------------------ */

console.log("\npromotion, and what it is worth in hand");

t.check("a Pawn on the eighth promotes to four pieces",
	cz.promotesTo("pawn-w", 7).sort(),
	["p-bishop-w", "p-knight-w", "p-queen-w", "p-rook-w"]);
t.check("a promoted piece is told apart in the FEN, as Fairy-Stockfish does",
	types[cz.typeNamed("p-queen-w")].fenAbbrev, "Q~");
t.check("but not on the board", types[cz.typeNamed("p-queen-w")].aspect, "queen");

(() => {
	// the Black King stands off the Pawn's diagonal: a King already in check
	// while it is White to move is not a position this game ever reaches, and
	// every move out of one reads as a checking move
	const board = Setup({ e1: "wK", a5: "bK", a8: "bR", g7: "wP" });
	Play(board, "g7-g8=Q");
	t.check("the new Queen is a promoted one",
		types[board.pieces[board.board[At("g8")]].t].name, "p-queen-w");
	Play(board, "Ra8xg8");
	t.check("captured, it reaches Black's hand as a Pawn", Held(board, -1), "P");
})();

(() => {
	// against the same capture of a Queen that was always a Queen
	const board = Setup({ e1: "wK", a5: "bK", a8: "bR", g8: "wQ" }, -1);
	Play(board, "Ra8xg8");
	t.check("a true Queen goes to hand as a Queen", Held(board, -1), "Q");
})();

/* ------------------------------------------------------------------ *
 * 5. no castling with a dropped Rook
 * ------------------------------------------------------------------ */

console.log("\ncastling");

(() => {
	const board = Setup({ e1: "wK*", h1: "wR*", e8: "bK" });
	t.check("the King castles when both are home",
		Moves(board, At("e1")).map(Str).indexOf("O-O") >= 0, true);
})();

(() => {
	const board = Setup({ e1: "wK*", e8: "bK", [Hand(1, "R")]: "wR" });
	Play(board, "R@h1");
	board.mWho = 1;
	t.check("but not with one just dropped there",
		Moves(board, At("e1")).map(Str).filter((s) => s.indexOf("O-O") === 0), []);
})();

/* ------------------------------------------------------------------ *
 * 6. mate by a dropped Pawn is legal
 * ------------------------------------------------------------------ */

console.log("\nmate by drop");

(() => {
	/*
	 * The Shogi prohibition (uchifuzume) is not a rule here. The mate: the
	 * dropped Pawn checks on g7 and is covered by the King on f7, which also
	 * takes g8; the Bishop takes h7.
	 */
	const board = Setup({ h8: "bK", f7: "wK", d3: "wB", [Hand(1, "P")]: "wP" }, 1);
	const mate = Moves(board).find((m) => Str(m) === "P@g7+");
	t.check("the Pawn drop is offered", !!mate, true);
	board.ApplyMove(game, mate);
	board.mWho = -1;
	t.check("and it is mate", H.outcome(board, game), "white");
})();

/* ------------------------------------------------------------------ *
 * 7. doubled Pawns from a drop are legal
 * ------------------------------------------------------------------ */

console.log("\nthe Shogi Pawn rules that must not leak in");

t.check("no one-Pawn-per-file limit",
	sandbox.Model.Game.cbPawnsPerFile, 8);

(() => {
	const board = Setup({ a1: "wK", a8: "bK", e2: "wP", e4: "wP",
		[Hand(1, "P")]: "wP" });
	const onE = Moves(board)
		.filter((m) => !onBoard(m.f) && geo.C(m.t) === geo.C(At("e5")));
	// e1 and e8 are barred to a Pawn, e2 and e4 are taken: four squares left
	t.check("a third Pawn may be dropped on the same file", onE.length, 4);
})();

/* ------------------------------------------------------------------ *
 * 8. a saved position reloads unchanged, hands and all
 * ------------------------------------------------------------------ */

console.log("\nthe FEN");

(() => {
	const board = H.newBoard(sandbox, game);
	const fen = board.ExportBoardState(game);
	t.check("the opening position exports twelve columns a row",
		fen.split(" ")[0].split("/").length, 8);
	const back = sandbox.Model.Game.Import("pjn", fen);
	t.check("and reads back", back.status !== false, true);
	const before = {}, after = {};
	board.pieces.forEach((p) => {
		if(p.p >= 0 && onBoard(p.p)) before[p.p] = types[p.t].name + "/" + p.s;
	});
	(back.initial.pieces || []).forEach((p) => {
		if(onBoard(p.p)) after[p.p] = types[p.t].name + "/" + p.s;
	});
	t.check("with every piece the type it was",
		Object.keys(before).filter((pos) => before[pos] !== after[pos]), []);
})();

(() => {
	// the part no other game in this module exercises: a hand in the FEN
	const board = Setup({ e1: "wK", e8: "bK", d4: "wR", d7: "bN" });
	Play(board, "Rd4xd7");
	const fen = board.ExportBoardState(game);
	const back = sandbox.Model.Game.Import("pjn", fen);
	const held = (back.initial.pieces || [])
		.filter((p) => !onBoard(p.p) && types[p.t].name !== "counter")
		.map((p) => (p.s > 0 ? "w" : "b") + types[p.t].name);
	t.check("a Knight in White's hand survives the round trip", held, ["wknight"]);
})();

(() => {
	// a promoted Queen must not come back as a true one: it would stop
	// being a Pawn when captured
	const board = Setup({ e1: "wK", a5: "bK", g7: "wP" });
	Play(board, "g7-g8=Q");
	const fen = board.ExportBoardState(game);
	const back = sandbox.Model.Game.Import("pjn", fen);
	const g8 = (back.initial.pieces || []).find((p) => p.p === At("g8"));
	t.check("a promoted Queen reloads promoted",
		g8 && types[g8.t].name, "p-queen-w");
})();

(() => {
	/*
	 * Two of a kind in hand, saved and read back. A hand holding more than
	 * one piece of a type keeps the first on the holding square and the rest
	 * on the spare square beside it, chained through their index field, with
	 * a counter pseudo-piece on that spare square drawing the "x2".
	 *
	 * A position loaded from a FEN has no counters - they were taken off the
	 * board before it was written - so what sits on a spare square is the
	 * second held piece. drop-model.js used to lift it off the board as if it
	 * were the counter: the piece stayed in the list on a square no drop is
	 * ever generated from, out of the game for good, and the next capture
	 * into that slot incremented ITS type, turning a held Pawn into the piece
	 * that follows it in the table. Both are checked here.
	 */
	const board = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];
	const play = (uci) => {
		const move = Moves(board).find((m) => Engine(m).toLowerCase() === uci);
		if(!move) throw new Error("no " + uci);
		board.ApplyMove(game, move);
		board.mWho = -board.mWho;
	};
	// two Black Pawns into White's hand
	["e2e4", "d7d5", "e4d5", "c7c6", "d5c6", "b8c6"].forEach(play);
	t.check("two Pawns in White's hand", Held(board, 1), "PP");

	const reloaded = (() => {
		const back = sandbox.Model.Game.Import("pjn", board.ExportBoardState(game));
		game.mInitial = back.initial;
		const fresh = H.newBoard(sandbox, game);
		delete game.mInitial;
		return fresh;
	})();
	t.check("and two after the round trip", Held(reloaded, 1), "PP");

	reloaded.mWho = 1;
	const first = Moves(reloaded).filter((m) => !onBoard(m.f));
	t.check("the first is droppable", first.length > 0, true);
	reloaded.ApplyMove(game, first.find((m) => Engine(m) === "P@a3"));
	reloaded.mWho = 1;
	t.check("and so is the second", Held(reloaded, 1), "P");
	t.check("which the move list offers",
		Moves(reloaded).filter((m) => !onBoard(m.f)).length > 0, true);
})();

(() => {
	/*
	 * Deeper than two. The board-shaped FEN has exactly two squares per hand
	 * slot - the holding square and the spare beside it - so for a while it
	 * described a hand of five as a hand of two.
	 *
	 * What it writes on that spare square now is the counter, whose type
	 * carries the total, and Import() expands it back into pieces: the same
	 * thing the player reads there, rather than a second piece standing in for
	 * however many there are.
	 */
	const board = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];
	let seed = 7;
	const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
	while(Held(board, 1).indexOf("PPP") < 0) {
		const legal = Moves(board);
		if(legal.length === 0) break;
		const captures = legal.filter((m) => m.c != null);
		const pool = captures.length && random() < 0.7 ? captures : legal;
		const move = pool[Math.floor(random() * pool.length)];
		board.ApplyMove(game, move);
		board.mWho = -board.mWho;
	}
	t.check("three Pawns can be held", Held(board, 1).indexOf("PPP") >= 0, true);
	const before = Held(board, 1);
	const fen = board.ExportBoardState(game);
	t.check("the spare square is written as the counter, not as a Pawn",
		/[Cc]~/.test(fen.split(" ")[0]), true);
	const back = sandbox.Model.Game.Import("pjn", fen);
	game.mInitial = back.initial;
	const reloaded = H.newBoard(sandbox, game);
	delete game.mInitial;
	t.check("and all of them come back", Held(reloaded, 1), before);

	// ... and the hand still works: every one of them is droppable in turn
	reloaded.mWho = 1;
	let dropped = 0;
	while(Held(reloaded, 1).indexOf("P") >= 0) {
		const drop = Moves(reloaded)
			.find((m) => !onBoard(m.f) && Str(m).indexOf("P@") === 0);
		if(!drop) break;
		reloaded.ApplyMove(game, drop);
		reloaded.mWho = 1;
		dropped++;
	}
	t.check("one drop for each Pawn held", dropped, before.length);
})();

/* ------------------------------------------------------------------ *
 * 9. a game plays out
 * ------------------------------------------------------------------ */

console.log("\na game");

(() => {
	/*
	 * Not cz.plays(): what is worth watching in a drop game is that no man is
	 * ever lost. A captured piece is not removed, it is moved to a holding
	 * square, and the bookkeeping that puts it there (and shifts the next one
	 * of its type up the queue) is where a piece goes missing or comes back
	 * as the wrong type.
	 */
	const board = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];
	const men = () => board.pieces.filter((p) => p.p >= 0
		&& types[p.t].name !== "counter").length;
	const start = men();
	let seed = 20250820, played = 0, drops = 0, lost = 0, finished = false;
	const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
	while(played < 400) {
		board.mMoves = [];
		board.GenerateMoves(game);
		if(board.mMoves.length === 0) { finished = true; break; }
		const move = board.mMoves[Math.floor(random() * board.mMoves.length)];
		if(!onBoard(move.f)) drops++;
		board.ApplyMove(game, move);
		game.mPlayedMoves.push(move);
		board.mWho = -board.mWho;
		played++;
		if(men() !== start) lost++;
	}
	t.check("thirty-two men at the start", start, 32);
	t.check("a random game runs", played > 100 || finished, true);
	t.check("with drops in it", drops > 10, true);
	t.check("and never loses a man", lost, 0);
})();

/* ------------------------------------------------------------------ *
 * 10. the notation the engine reads
 * ------------------------------------------------------------------ */

console.log("\nnotation");

(() => {
	const board = Setup({ e1: "wK", e8: "bK", e2: "wP", [Hand(1, "N")]: "wN" });
	const push = Moves(board, At("e2")).find((m) => Str(m) === "e2-e4");
	t.check("a Pawn move is UCI", Engine(push), "e2e4");
	const drop = Moves(board).find((m) => !onBoard(m.f) && Str(m) === "N@f3");
	t.check("a drop is UCI", Engine(drop), "N@f3");
	// UCI has no check marker; the notation the player reads does
	const check = Moves(board).find((m) => !onBoard(m.f) && Engine(m) === "N@f6");
	t.check("a checking drop reads with a +", Str(check), "N@f6+");
	t.check("but is sent without one", Engine(check), "N@f6");
})();

(() => {
	// the four promotions must not share one string, or the engine asking
	// for a Queen is handed whichever comes first in the list
	const board = Setup({ e1: "wK", a5: "bK", g7: "wP" });
	const promos = Moves(board, At("g7")).map(Engine).filter((s) => s.indexOf("g7g8") === 0);
	t.check("each promotion has its own", promos.sort(), ["g7g8B", "g7g8N", "g7g8Q", "g7g8R"]);
})();

(() => {
	const board = Setup({ e1: "wK*", h1: "wR*", e8: "bK" });
	const castle = Moves(board, At("e1")).find((m) => m.cg !== undefined
		&& geo.C(m.cg) === geo.C(At("h1")));
	t.check("castling is the King's destination", Engine(castle), "e1g1");
	t.check("and King-takes-Rook in Chess960 format",
		castle.ToString ? castle.ToString("engine960")
			: Object.assign(Object.create(sandbox.Model.Move), castle).ToString("engine960"),
		"e1h1");
	t.check("and reads naturally", Str(castle), "O-O");
})();

t.done("crazyhouse");
