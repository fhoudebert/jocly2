/*
 * Elven Chess, against the rules page shipped with it
 * (res/rules/elven/elven-rules.html).
 *
 *   node tests/fairy/elven.test.js
 *
 * The Warlock is the Chu Shogi Lion under another name, and the rules list the
 * five things it can do. Four of them worked; the fifth - "it can effectively
 * pass a turn by moving to a neighboring empty square and back" - did not
 * exist, for the same reason it did not exist in Chu Shogi: the flag that adds
 * a second leg only did so after a CAPTURE.
 *
 * The evaluation had the other recurring fault of this module, piece types
 * addressed by number with the numbers of the game the code came from. Here 2
 * is the Bishop and not a black Pawn, so the term meant to push Black's Pawns
 * towards promotion was counting its Bishops; and types 4 and 5, meant to be
 * the Knight and Bishop, are the Elf and the Warlock.
 */

const H = require("./harness.js");

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "fairy-piece-model.js",
	"locust-move-model.js", "locust/elven-model.js"];

const sandbox = H.loadModel(SCRIPTS);
const game = H.newGame(sandbox);
const geo = game.cbVar.geometry;
const types = game.cbVar.pieceTypes;

const engine = (move) =>
	Object.assign(Object.create(sandbox.Model.Move), move).ToString("engine");

const typeNamed = (name) => {
	for(const t in types)
		if(types[t].name === name)
			return parseInt(t);
	throw new Error("no piece named " + name);
};

function movesFrom(pieces, square, who) {
	const board = H.setup(sandbox, game,
		Object.assign({ a1: "wK", j10: "bK" }, pieces), who || 1);
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves.filter((move) => move.f === geo.PosByName(square));
}
const reaches = (pieces, from, to) =>
	movesFrom(pieces, from).some((move) => geo.PosName(move.t) === to);
// any move that touches that square, whether it ends there or passes over it
const touches = (pieces, from, square) =>
	movesFrom(pieces, from).some((move) => geo.PosName(move.t) === square
		|| (move.via !== undefined && geo.PosName(move.via) === square));

const t = H.runner();

/* ---------------- the board and the army ---------------- */

console.log("\nthe board and the army");

t.check("a 10 x 10 board", [geo.width, geo.height], [10, 10]);
// "Each player starts with: 10 Pawns, 2 Rooks, 2 Dwarfs, 2 Knights,
// 2 Bishops, 1 Elf, 1 Goblin, 1 Queen, 1 Lion, 1 King"
[["pawnw", 10], ["rook", 2], ["dwarf", 2], ["knight", 2], ["bishop", 2],
 ["elf", 1], ["goblin", 1], ["queen", 1], ["warlock", 1], ["king", 1]]
	.forEach(([name, count]) => {
		const initial = types[typeNamed(name)].initial || [];
		t.check(count + " " + name, initial.filter((entry) => entry.s > 0).length, count);
	});

// "The Goblin: moves and captures like King or Rook"
// "The Elf: like King or Bishop" - "The Dwarf: like a King"
const reach = (name) => {
	const from = geo.PosByName("e5"), out = new Set();
	(types[typeNamed(name)].graph[from] || []).forEach((line) => {
		for(const entry of line)
			if(entry & (sandbox.Model.Game.cbConstants.FLAG_MOVE
					| sandbox.Model.Game.cbConstants.FLAG_CAPTURE))
				out.add(entry & 0xffff);
	});
	return out.size;
};
t.check("Goblin: King and Rook", reach("goblin"), reach("rook") + 4);
t.check("Elf: King and Bishop", reach("elf"), reach("bishop") + 4);
t.check("Dwarf: a King's move", reach("dwarf"), reach("king"));

/* ---------------- the Warlock ---------------- */

console.log("\nthe Warlock, which is the Chu Shogi Lion");

// "It can leap directly to any of the squares in the 5x5 area surrounding it"
const open = movesFrom({ e5: "wW" }, "e5");
t.check("it reaches the whole 5x5 area",
	new Set(open.filter((m) => m.t !== m.f).map((m) => geo.PosName(m.t))).size, 24);
t.check("with no square reachable twice",
	open.filter((m) => m.t !== m.f).length, 24);

// "It can capture two pieces in one turn."
t.ok("it takes two pieces in one turn",
	movesFrom({ e5: "wW", e6: "bP", e7: "bR" }, "e5")
		.some((m) => geo.PosName(m.t) === "e7" && m.c != null));
// "It can capture a neighboring piece, and go on to an empty square."
t.ok("it takes one and goes on",
	movesFrom({ e5: "wW", e6: "bP" }, "e5")
		.some((m) => m.via !== undefined && geo.PosName(m.via) === "e6"
			&& geo.PosName(m.t) === "e7"));
// "It can capture a neighboring piece, and return to its starting square."
t.check("or takes one and comes back",
	movesFrom({ e5: "wW", e6: "bP" }, "e5")
		.filter((m) => m.t === m.f && geo.PosName(m.via) === "e6").map(engine),
	["Wxe6-e5"]);
// "It can effectively pass a turn by moving to a neighboring empty square and
// back." - the one that was missing
t.check("and it can step out onto an empty square and back, passing the turn",
	movesFrom({ e5: "wW" }, "e5").filter((m) => m.t === m.f).length, 8);
t.check("which is written without a capture",
	movesFrom({ e5: "wW" }, "e5")
		.filter((m) => m.t === m.f && geo.PosName(m.via) === "f5").map(engine),
	["W-f5-e5"]);
// "use its non-last step as a 'hop', passing over a square occupied by friend
// or enemy without disturbing it"
t.ok("it hops over a piece of its own", reaches({ e5: "wW", e6: "wR" }, "e5", "e7"));

/*
 * "A Wizard cannot be captured by a Wizard if pseudo-legal recapture would be
 * possible on the immediately following half-move" - what is barred is staying
 * on the square, not the capture, which an adjacent Warlock can always make in
 * passing.
 */
console.log("\nkeeping the Warlocks on the board");

t.ok("a Warlock takes an unprotected one", reaches({ e5: "wW", e6: "bW" }, "e5", "e6"));
t.ok("it may not stay on a protected square",
	!reaches({ e5: "wW", e6: "bW", e8: "bR" }, "e5", "e6"));
t.ok("but it still takes it in passing",
	touches({ e5: "wW", e6: "bW", e8: "bR" }, "e5", "e6"));
t.ok("a Rook may take a protected Warlock",
	reaches({ e5: "wR", e8: "bW", e10: "bR" }, "e5", "e8"));

// "A Wizard cannot be captured on the half-move immediately after a Wizard was
// captured" - implemented as in Chu Shogi, where the reply with a Warlock of
// one's own is the exception. See the note in the report.
const afterTaken = (taker) => {
	const pieces = { a1: "wK", j10: "bK", c1: "wR", c3: "bW", h8: "wW" };
	pieces[taker === "rook" ? "h10" : "g7"] = taker === "rook" ? "bR" : "bW";
	const board = H.setup(sandbox, game, pieces, 1);
	board.mMoves = [];
	board.GenerateMoves(game);
	board.ApplyMove(game, board.mMoves.find((m) =>
		m.f === geo.PosByName("c1") && m.t === geo.PosByName("c3")));
	board.mWho = -1;
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves.filter((m) => m.t === geo.PosByName("h8")).map(engine);
};
t.check("after a Rook took a Warlock, a Rook may not take one back",
	afterTaken("rook"), []);
t.check("a Warlock still may", afterTaken("warlock"), ["g7h8"]);

/* ---------------- the rest of the rules ---------------- */

console.log("\nthe rest");

// "Castling: yes. King moves 3 steps towards Rook."
const castle = game.cbVar.castle;
t.check("the King castles three steps, both ways",
	Object.keys(castle).map((key) => {
		const spec = castle[key];
		return Math.abs(geo.C(spec.k[spec.k.length - 1]) - geo.C(+key.split("/")[0]));
	}), [3, 3, 3, 3]);

// "Double move for Pawns (start): yes, from their starting rank (the 3rd!)"
const pawnAt = (square) => movesFrom({ [square]: "wP" }, square).map(engine).sort();
t.check("a Pawn steps twice from the third rank", pawnAt("c3"), ["c3c4", "c3c5"]);
t.check("and once from anywhere else", pawnAt("c5"), ["c5c6"]);
t.check("Pawns are subject to en passant",
	Object.keys(types).filter((k) => types[k].epCatch).map((k) => types[k].name).sort(),
	["pawnb", "pawnw"]);

/*
 * "Promotion: Pawns promote on entering the enemy camp (last 3 ranks), but
 * only to orthodox chess pieces (Knight, Bishop, Rook or Queen)."
 */
const promotionsOn = (rank) => {
	const board = H.newBoard(sandbox, game);
	const from = (rank - 2) * geo.width + 2, to = (rank - 1) * geo.width + 2;
	return (game.cbVar.promote.call(board, game, { t: 0, s: 1, p: from },
		{ t: to, f: from, c: null }) || []).map((into) => types[into].name).sort();
};
t.check("nothing promotes before the eighth rank", promotionsOn(7), []);
["bishop", "knight", "queen", "rook"].forEach((into) => {
	t.ok("a Pawn may become a " + into, promotionsOn(8).indexOf(into) >= 0);
});
t.check("and nothing else - no Warlock, Elf, Goblin or Dwarf",
	promotionsOn(8), ["bishop", "knight", "queen", "rook"]);
t.check("the same on the ninth rank", promotionsOn(9),
	["bishop", "knight", "queen", "rook"]);
t.check("and the tenth", promotionsOn(10), ["bishop", "knight", "queen", "rook"]);

/* ---------------- what the evaluation reads ---------------- */

console.log("\nwhat the evaluation counts");

const verdict = (pieces) => {
	const board = H.setup(sandbox, game, pieces, 1);
	board.mMoves = [];
	board.GenerateMoves(game);
	board.Evaluate(game);
	if(!board.mFinished)
		return "playing";
	return board.mWinner === 2 ? "draw" : "winner";
};
t.check("King against King", verdict({ a1: "wK", j10: "bK" }), "draw");
t.check("a lone Knight cannot mate", verdict({ a1: "wK", e5: "wN", j10: "bK" }), "draw");
t.check("and neither can Black's", verdict({ a1: "wK", e5: "bN", j10: "bK" }), "draw");
[["Queen", "wQ"], ["Rook", "wR"], ["Warlock", "wW"], ["Goblin", "wG"],
 ["Elf", "wE"], ["Pawn", "wP"]].forEach(([label, letter]) => {
	t.check("King and " + label + " is still a game",
		verdict({ a1: "wK", e5: letter, j10: "bK" }), "playing");
});

t.check("a game runs", (() => {
	const play = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];
	let seed = 808, played = 0;
	const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
	while(played < 80) {
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
})(), 80);

t.done("Elven Chess");
