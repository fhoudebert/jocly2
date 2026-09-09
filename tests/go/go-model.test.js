/*
 * Go: the rules.
 *
 *   node tests/go/go-model.test.js
 *
 * The engine is what will play this game, so what has to be exactly right here
 * is the rule set, not the speed. Every check below is a rule someone can look
 * up: what a capture takes, when a move is suicide, what ko forbids, what
 * superko forbids that ko does not, and how the board is counted once both
 * sides pass.
 *
 * Positions are written as text so the test reads like a diagram:
 *
 *   . . . .      "." empty, "b" black, "w" white
 *   . b w .
 *   . . . .
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(ROOT, "src");
const GO = path.join(SRC, "games", "go");

const t = require(path.join(ROOT, "tests", "fairy", "harness.js")).runner();

const manifest = require(path.join(GO, "index.js")).games;

function loadModel() {
	const sandbox = {
		console, Math, JSON, Object, Array, Date,
		Int32Array, Int8Array, Uint8Array, Float64Array, setTimeout,
		Model: { Game: {}, Board: {}, Move: {} },
		exports: {}, module: {},
	};
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	["jocly.util.js", "jocly.game.js"].forEach((f) => {
		vm.runInContext(fs.readFileSync(path.join(SRC, "core", f), "utf8"), sandbox, { filename: f });
	});
	vm.runInContext(fs.readFileSync(path.join(GO, "go-model.js"), "utf8"), sandbox, { filename: "go-model.js" });
	return sandbox;
}

const sandbox = loadModel();

function newGame(name, extra) {
	const g = manifest.filter((x) => x.name === name)[0];
	const game = Object.create(sandbox.Model.Game);
	game.g = {};
	game.mOptions = JSON.parse(JSON.stringify(g.config.model.gameOptions));
	// A rule set is a game option, so it is set the way the manifest would set
	// it - before InitGame, which is where the model reads it.
	Object.assign(game.mOptions, extra || {});
	game.mPlayedMoves = [];
	function Move(args) { this.Init(args || {}); }
	Move.prototype = sandbox.Model.Move;
	game.mMoveClass = Move;
	game.CreateMove = (args) => new Move(args);
	game.InitGame();
	return game;
}

function boardProto() {
	if(!sandbox.__proto)
		sandbox.__proto = Object.assign({}, sandbox.JocBoard.prototype, sandbox.Model.Board);
	return sandbox.__proto;
}

function newBoard(game, who) {
	const b = Object.create(boardProto());
	b.InitialPosition(game);
	b.mWho = who === undefined ? 1 : who;
	return b;
}

// Lay out a position from a diagram. Rows top to bottom, so row 0 is the top of
// the board and "A1" is bottom-left, as Go numbers it.
function setup(game, rows, who) {
	const size = game.g.size;
	const b = newBoard(game, who);
	rows.forEach((row, r) => {
		row.replace(/\s+/g, "").split("").forEach((ch, c) => {
			if(ch === "b") b.board[r * size + c] = 1;
			else if(ch === "w") b.board[r * size + c] = -1;
		});
	});
	// the diagram is the position, so it is also the whole history
	b.hash = 0;
	for(let pos = 0; pos < game.g.points; pos++)
		if(b.board[pos] !== 0)
			b.hash ^= game.g.zobrist[(1 - b.board[pos]) / 2][pos];
	b.hist = [b.hash];
	return b;
}

const at = (game, text) => game.StringToCoord(text);
const named = (game, board) => board.mMoves.map((m) => game.CoordToString(m.p));
const legal = (game, board, text) => named(game, board).indexOf(text) >= 0;

/* -------------------------------------------------------------- geometry */

const g9 = newGame("go9");

t.check("a 9x9 board has 81 points", g9.g.points, 81);
t.check("the corner is A9 at the top left", g9.CoordToString(0), "A9");
t.check("and A1 at the bottom left", g9.CoordToString(72), "A1");
t.check("the column letters skip I", g9.CoordToString(8), "J9");
t.check("coordinates round trip", g9.CoordToString(at(g9, "E5")), "E5");
t.check("a corner has two neighbours",
	g9.g.Graph[0].filter((n) => n !== null).length, 2);
t.check("an edge point has three",
	g9.g.Graph[at(g9, "E9")].filter((n) => n !== null).length, 3);
t.check("and a central point four",
	g9.g.Graph[at(g9, "E5")].filter((n) => n !== null).length, 4);

/* -------------------------------------------------------------- notation */

/*
 * A Move has to be able to name itself with no game to hand.
 *
 * Jocly asks it to, from getMoveString on the core side of the iframe, and a
 * Move carries only its own fields - no game, no board. The first version of
 * this model reached for Model.Game and read this.g off it, which is the bare
 * prototype: every move played threw "Cannot read properties of undefined
 * (reading 'Coord')" and the turn was aborted. The board drew fine, so it
 * looked like anything but a notation bug.
 */
{
	const Move = function(args) { this.Init(args || {}); };
	Move.prototype = sandbox.Model.Move;

	const lone = new Move({ p: g9.StringToCoord("E5") });
	t.check("a move names itself with no game in reach", lone.ToString(), "E5");
	t.check("and so does a pass", new Move({ p: -1 }).ToString(), "pass");
	t.check("a move built by the game agrees",
		g9.CreateMove({ p: g9.StringToCoord("A1") }).ToString(), "A1");

	// The size lives in the module, so the notation follows the last game
	// initialised - one loaded model serves one board, which is how Jocly
	// loads them. Said here because nothing else would say it.
	const g13 = newGame("go13");
	t.check("after a 13x13 game the notation is that board's",
		new Move({ p: 0 }).ToString(), "A13");
	newGame("go9");
	t.check("and follows back", new Move({ p: 0 }).ToString(), "A9");
}

/* --------------------------------------------------------------- capture */

// A lone white stone on its last liberty: black takes it.
//   . b . .        . b . .
//   b w b .   ->   b . b .
//   . . . .        . b . .
let board = setup(g9, [
	". b . . . . . . .",
	"b w b . . . . . .",
	". . . . . . . . .",
], 1);
board.GenerateMoves(g9);
let move = board.mMoves.filter((m) => m.p === at(g9, "B7"))[0];
t.check("the capturing move knows what it takes", move.c, [at(g9, "B8")]);
board.ApplyMove(g9, move);
t.check("the stone is gone", board.board[at(g9, "B8")], 0);
t.check("and counted as a prisoner", board.prisoners[0], 1);

// A group is taken whole, not stone by stone.
board = setup(g9, [
	". b b . . . . . .",
	"b w w b . . . . .",
	". b . . . . . . .",
], 1);
board.GenerateMoves(g9);
move = board.mMoves.filter((m) => m.p === at(g9, "C7"))[0];
t.check("a group with one liberty is taken whole",
	move.c.map((p) => g9.CoordToString(p)).sort(), ["B8", "C8"]);

/* --------------------------------------------------------------- suicide */

// White has filled all but one point of a black eye; black may not fill it.
board = setup(g9, [
	". w . . . . . . .",
	"w . w . . . . . .",
	". w . . . . . . .",
], 1);
board.GenerateMoves(g9);
t.check("filling a single-point eye of one's own is suicide",
	legal(g9, board, "B8"), false);

// The same point is fine for the other colour: it captures instead.
board.mWho = -1;
board.GenerateMoves(g9);
t.check("the same point is legal for the other colour, as a capture",
	legal(g9, board, "B8"), true);

// A stone with no liberty of its own is legal if it joins a group that has one.
board = setup(g9, [
	"w b . . . . . . .",
	". . . . . . . . .",
	". . . . . . . . .",
], 1);
board.GenerateMoves(g9);
t.check("a stone with no liberty may still join a living group",
	legal(g9, board, "A8"), true);

/* -------------------------------------------------------------------- ko */

/*
 *   . b w .      black takes at C, white may not take straight back
 *   b w . w
 *   . b w .
 */
board = setup(g9, [
	". b w . . . . . .",
	"b w . w . . . . .",
	". b w . . . . . .",
], 1);
board.GenerateMoves(g9);
move = board.mMoves.filter((m) => m.p === at(g9, "C8"))[0];
t.check("black can take the ko", move !== undefined, true);
board.ApplyMove(g9, move);
t.check("the ko point is named", g9.CoordToString(board.koPos), "B8");
board.mWho = -1;
board.GenerateMoves(g9);
t.check("white may not take straight back", legal(g9, board, "B8"), false);
t.check("but may play anywhere else", legal(g9, board, "E5"), true);

// After a move elsewhere the ko is open again.
board.ApplyMove(g9, board.mMoves.filter((m) => m.p === at(g9, "E5"))[0]);
t.check("a move elsewhere clears the ko point", board.koPos, -1);

/* --------------------------------------------------------------- superko */

// Superko is what forbids a repeat that the simple ko point does not name. It
// can only bite on a capturing move: a move that captures nothing leaves more
// stones than before, so its position is necessarily new. That argument is what
// lets GenerateMoves skip the check for almost every move, so it is worth
// pinning both halves.
board = setup(g9, [
	". b w . . . . . .",
	"b w . w . . . . .",
	". b w . . . . . .",
], 1);
const firstHash = board.hash;
board.GenerateMoves(g9);
board.ApplyMove(g9, board.mMoves.filter((m) => m.p === at(g9, "C8"))[0]);
t.check("a capture changes the position", board.hash !== firstHash, true);
t.check("and the position is remembered", board.hist.indexOf(board.hash) >= 0, true);

// Reaching the same position again is refused even with the ko point cleared.
board.koPos = -1;
board.mWho = -1;
board.GenerateMoves(g9);
t.check("superko refuses the repeat the ko point no longer names",
	legal(g9, board, "B8"), false);

t.check("a non-capturing move needs no superko check at all",
	board.mMoves.filter((m) => m.c !== undefined).length < board.mMoves.length, true);

/* ---------------------------------------------------------------- passes */

board = setup(g9, [". . . . . . . . ."], 1);
board.GenerateMoves(g9);
t.check("passing is always on offer", legal(g9, board, "pass"), true);
board.ApplyMove(g9, { p: -1 });
t.check("one pass is counted", board.passes, 1);
board.mWho = -1;
board.GenerateMoves(g9);
board.ApplyMove(g9, { p: -1 });
t.check("two passes end it", board.passes, 2);
board.GenerateMoves(g9);
t.check("a finished game offers no moves", board.mMoves.length, 0);

// A pass between two stones does not reset the count to zero by accident, but a
// stone does.
board = setup(g9, [". . . . . . . . ."], 1);
board.ApplyMove(g9, { p: -1 });
board.mWho = -1;
board.GenerateMoves(g9);
board.ApplyMove(g9, board.mMoves.filter((m) => m.p === at(g9, "E5"))[0]);
t.check("a stone resets the pass count", board.passes, 0);

/* --------------------------------------------------------------- scoring */

// Black owns the whole board minus a two-point white corner.
board = setup(g9, [
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b b b w w",
	"b b b b b b b w .",
], 1);
let score = board.goScore(g9);
t.check("black counts stones and its own empty points", score.black, 77);
t.check("white counts its stones, its point, and komi", score.white, 4 + 5.5);

// An empty region touching both colours belongs to nobody. The board is filled
// but for that one column, so the neutral points are the only thing in doubt.
board = setup(g9, [
	"b . w w w w w w w",
	"b . w w w w w w w",
	"b . w w w w w w w",
	"b . w w w w w w w",
	"b . w w w w w w w",
	"b . w w w w w w w",
	"b . w w w w w w w",
	"b . w w w w w w w",
	"b . w w w w w w w",
], 1);
score = board.goScore(g9);
t.check("a region bordered by both counts for neither",
	[score.black, score.white], [9, 63 + 5.5]);

// The verdict, once both have passed.
board = setup(g9, [
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b b b w w",
	"b b b b b b b w .",
], 1);
board.passes = 2;
board.Evaluate(g9);
t.check("the game is over", board.mFinished, true);
t.check("and black has won", board.mWinner, 1);

// Komi is what decides a board black leads on the count.
board = setup(g9, [
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b b b b b",
	"b b b b b w w w w",
	"w w w w w w w w w",
	"w w w w w w w w w",
	"w w w w w w w w w",
	"w w w w w w w w w",
], 1);
board.passes = 2;
board.Evaluate(g9);
score = board.goScore(g9);
t.check("black leads on stones but loses on komi",
	[score.black, score.white, board.mWinner], [41, 45.5, -1]);

/* --------------------------------------------------- the score, going out */

/*
 * getBoardState("score") is how a host gets the figures. It matters because
 * the winner alone (mWinner) does not carry the MARGIN, and no caller can
 * work the margin out from outside: area counting lives in this file. A host
 * with a dictionary writes "wins by 3.5" in its own language from these
 * numbers - the status bar here cannot, Jocly having no translations.
 */
{
	const state = board.ExportBoardState(g9, "score");
	t.check("the score goes out with its margin",
		[state.black, state.white, state.margin], [41, 45.5, 41 - 45.5]);
	t.check("and says the board was really counted", state.counted, true);
	t.check("komi travels with it", state.komi, 5.5);

	// An unfinished board answers too, but says so: area counting a position
	// nobody has settled is not an estimate, and a host must be able to tell
	// the two apart before showing anything.
	const running = setup(g9, [
		"b . w w w w w w w",
		"b . w w w w w w w",
		"b . w w w w w w w",
		"b . w w w w w w w",
		"b . w w w w w w w",
		"b . w w w w w w w",
		"b . w w w w w w w",
		"b . w w w w w w w",
		"b . w w w w w w w",
	], 1);
	t.check("an unfinished board is flagged as uncounted",
		running.ExportBoardState(g9, "score").counted, false);

	// Any other format keeps the base behaviour, so getBoardState() without
	// arguments answers exactly as it did before this hook existed.
	t.check("no format, no change", typeof board.ExportBoardState(g9), "string");
}

/* ------------------------------------------------------------- the sizes */

[["go9", 9, 5.5], ["go13", 13, 6.5], ["go19", 19, 7.5]].forEach(([name, size, komi]) => {
	const game = newGame(name);
	t.check(name + " is " + size + "x" + size, [game.g.size, game.g.points], [size, size * size]);
	t.check(name + " sets its komi", game.g.komi, komi);
	const b = newBoard(game, 1);
	b.GenerateMoves(game);
	t.check(name + " opens with every point plus a pass",
		b.mMoves.length, size * size + 1);
});

/* ------------------------------------------------------------ the copies */

const g19 = newGame("go19");
board = newBoard(g19, 1);
board.GenerateMoves(g19);
board.ApplyMove(g19, board.mMoves.filter((m) => m.p === at(g19, "D4"))[0]);
const copy = Object.create(boardProto());
copy.CopyFrom(board);
t.check("a copy carries the stones", copy.board[at(g19, "D4")], 1);
t.check("and the hash", copy.hash, board.hash);
t.check("and the history", copy.hist.length, board.hist.length);
copy.board[at(g19, "Q16")] = -1;
t.check("but does not share the board", board.board[at(g19, "Q16")], 0);
copy.mWho = -1;
copy.GenerateMoves(g19);
copy.ApplyMove(g19, copy.mMoves.filter((m) => m.p === at(g19, "D16"))[0]);
t.check("nor the history, once either plays on", board.hist.length < copy.hist.length, true);

/* ------------------------------------------------------- a played game */

/*
 * Rules written one diagram at a time can each be right and still not compose.
 * This plays a long pseudo-random game on a full board and checks the two
 * invariants that no single case can: that no group is ever left standing with
 * zero liberties, and that the hash kept incrementally still matches the board
 * it claims to describe - the one thing a Zobrist bug hides behind until
 * superko starts refusing legal moves, or allowing illegal ones.
 *
 * The seed is fixed so a failure is reproducible.
 */
{
	const game = newGame("go19");
	const board = newBoard(game, 1);
	let rng = 1234;
	const rnd = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng / 0x7fffffff; };

	const rehash = (b) => {
		let h = 0;
		for(let pos = 0; pos < game.g.points; pos++)
			if(b.board[pos] !== 0)
				h ^= game.g.zobrist[(1 - b.board[pos]) / 2][pos];
		return h;
	};

	let plies = 0, captures = 0, badLiberties = 0, badHash = 0, illegal = 0;
	while(plies < 600 && board.passes < 2) {
		board.GenerateMoves(game);
		if(board.mMoves.length === 0) break;
		const real = board.mMoves.filter((m) => m.p >= 0);
		// pass occasionally, so the pass path is exercised too
		const move = (real.length && rnd() < 0.995)
			? real[Math.floor(rnd() * real.length)] : { p: -1 };
		if(move.p >= 0 && board.board[move.p] !== 0) illegal++;
		if(move.c) captures += move.c.length;
		board.ApplyMove(game, move);
		board.mWho = -board.mWho;
		plies++;
		const scan = board.goScan(game);
		badLiberties += scan.libs.filter((l) => l === 0).length;
		if(board.hash !== rehash(board)) badHash++;
	}

	t.check("the game ran to length", plies, 600);
	t.check("it captured something along the way", captures > 100, true);
	t.check("no move was played onto an occupied point", illegal, 0);
	t.check("no group was ever left with no liberty", badLiberties, 0);
	t.check("the hash always described the board", badHash, 0);

	// and the position it reached still counts
	const score = board.goScore(game);
	t.check("the two areas and the neutral points cover the board",
		Math.round(score.black + (score.white - game.g.komi)) <= game.g.points, true);
}

/* ------------------------------------------------------ the rule sets */

/*
 * Two rule sets, and between them exactly one difference that changes which
 * moves exist: multi-stone self-capture, legal under tromp-taylor and not
 * under chinese-ogs. They agree on everything else this file implements -
 * area scoring, positional superko, no tax - which is why tromp-taylor is a
 * cheap second rule set and japanese is not.
 *
 * The names are KataGo's because they are handed to KataGo. A board and an
 * engine that disagree about the rules are worse than a board with no choice
 * of rules at all.
 */
{
	const gc = newGame("go9");                                   // chinese-ogs
	const gt = newGame("go9", { rules: "tromp-taylor" });

	t.check("the default rule set is named", gc.g.rules, "chinese-ogs");
	t.check("and forbids self-capture", gc.g.suicideOk, false);
	t.check("tromp-taylor is named too", gt.g.rules, "tromp-taylor");
	t.check("and allows it", gt.g.suicideOk, true);

	/*
	 * The position, black to play at A8:
	 *
	 *   9  b b w . .        A9 B9 black, their group's ONLY liberty is A8
	 *   8  . w . . .        A8 empty, B8 white
	 *   7  w . . . .        A7 white
	 *
	 * Playing A8 fills the group's last liberty, takes nothing off the board
	 * and leaves three black stones with nowhere to breathe.
	 */
	const rows = [
		"b b w . . . . . .",
		". w . . . . . . .",
		"w . . . . . . . .",
		". . . . . . . . .",
		". . . . . . . . .",
		". . . . . . . . .",
		". . . . . . . . .",
		". . . . . . . . .",
		". . . . . . . . .",
	];

	const chinese = setup(gc, rows, 1);
	chinese.GenerateMoves(gc);
	t.check("under chinese-ogs the self-capture is not a move",
		legal(gc, chinese, "A8"), false);

	const tromp = setup(gt, rows, 1);
	tromp.GenerateMoves(gt);
	t.check("under tromp-taylor it is", legal(gt, tromp, "A8"), true);

	// A lone stone with no liberty is illegal under BOTH: that is KataGo's
	// reading of Tromp-Taylor, and matching the engine is the whole point of
	// using its names. C9 is surrounded by white on B9 and C8... which it is
	// not here, so build the case on its own.
	{
		const lone = setup(gt, [
			". w . . . . . . .",
			"w . . . . . . . .",
			". . . . . . . . .",
			". . . . . . . . .",
			". . . . . . . . .",
			". . . . . . . . .",
			". . . . . . . . .",
			". . . . . . . . .",
			". . . . . . . . .",
		], 1);
		lone.GenerateMoves(gt);
		t.check("but a lone stone may still not kill itself",
			legal(gt, lone, "A9"), false);
	}

	/*
	 * Superko applies to a self-capture, and this is the case the move
	 * generator's shortcut would miss: it reasons that a move capturing
	 * nothing only ADDS stones and so cannot repeat a position. A
	 * self-capture is the exception - it takes its own group off the board.
	 *
	 * Rather than build a repetition by hand, the position the move WOULD
	 * reach is hashed and planted in the history: if the rule is applied, the
	 * move disappears.
	 */
	{
		const board = setup(gt, rows, 1);
		let after = board.hash;
		["A9", "B9"].forEach((p) => {
			after ^= gt.g.zobrist[0][at(gt, p)];   // the two black stones leave
		});
		board.hist = board.hist.concat([after]);
		board.GenerateMoves(gt);
		t.check("a self-capture that repeats a position is refused",
			legal(gt, board, "A8"), false);
	}

	/*
	 * And when it is played, the stones actually leave. Worked out by
	 * ApplyMove rather than carried on the move, so a move replayed from a
	 * saved game or handed over by an engine - neither carries a capture list
	 * - is played the same way.
	 */
	{
		const board = setup(gt, rows, 1);
		board.GenerateMoves(gt);
		const move = board.mMoves.filter((m) => m.p === at(gt, "A8"))[0];
		board.ApplyMove(gt, move);
		t.check("the whole group leaves the board",
			["A9", "B9", "A8"].map((p) => board.board[at(gt, p)]), [0, 0, 0]);
		// To WHITE's prisoners: under area scoring they do not enter the score,
		// but they are on screen, and stones credited to the player who walked
		// into the self-capture would read as captures he made.
		t.check("and count as White's prisoners", board.prisoners, [0, 3]);
		// The hash is what superko compares, so a self-capture that removed
		// stones without unhashing them would quietly break the ko rule.
		let expected = 0;
		for(let pos = 0; pos < gt.g.points; pos++)
			if(board.board[pos] !== 0)
				expected ^= gt.g.zobrist[(1 - board.board[pos]) / 2][pos];
		t.check("the hash still describes the board", board.hash, expected);
	}

	// The name travels with the position, so the engine can be asked to play
	// under the same rules. See goExportMoves and jocly.kata.js.
	t.check("the export names the rule set in force",
		setup(gt, rows, 1).goExportMoves(gt).rules, "tromp-taylor");
	t.check("and the default one as well",
		setup(gc, rows, 1).goExportMoves(gc).rules, "chinese-ogs");

	// An unknown name does not take the board down: a manifest typo should
	// leave the game playable and the mistake visible in the console.
	const gx = newGame("go9", { rules: "chinoise" });
	t.check("an unknown rule set falls back to the default",
		[gx.g.rules, gx.g.suicideOk], ["chinese-ogs", false]);
}

t.done("Go rules");
