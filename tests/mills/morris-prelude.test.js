/*
 * The Men's Morris merges, and the prelude that drives them.
 *
 *   node tests/mills/morris-prelude.test.js
 *
 * 9 and 12 Men's Morris offer the same choice on the same board, so the same
 * checks run against both rather than one being tested and the other trusted
 * to match. Only the men count and the button captions differ.
 *
 * Two things are worth testing here and one of them is the view, which is
 * unusual for a suite that cannot render anything.
 *
 * The rules half is the same claim as the draughts merge: each button must
 * reproduce the game it stands for. In mills that is two options read straight
 * off aGame.mOptions at move-generation time, so it can be checked by
 * generating moves and looking at what comes out - flying moves exist or they
 * do not, a man in a mill can be taken or it cannot.
 *
 * The view half is where the first attempt failed silently. mills replaces the
 * whole input state machine (View.Board.xdBuildHTStateMachine) and never calls
 * View.Board.xdInput, which is what the chessbase and checkers preludes hook.
 * A prelude written on their pattern draws its buttons and then does nothing
 * at all on a click. So the state machine is driven here with a recorder in
 * place of the scene, and the check is that a click reaches MakeMove.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(ROOT, "src");
const MILLS = path.join(SRC, "games", "mills");

const t = require(path.join(ROOT, "tests", "fairy", "harness.js")).runner();

const manifest = require(path.join(MILLS, "index.js")).games;
const entry = (name) => manifest.filter((g) => g.name === name)[0];

function loadModel(scripts) {
	const sandbox = {
		console, Math, JSON, Object, Array, Date,
		Int32Array, Int8Array, Uint8Array, Float64Array, setTimeout,
		Model: { Game: {}, Board: {}, Move: {} },
		exports: {}, module: {},
	};
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	["jocly.util.js", "jocly.game.js"].forEach((file) => {
		vm.runInContext(fs.readFileSync(path.join(SRC, "core", file), "utf8"), sandbox, { filename: file });
	});
	scripts.forEach((script) => {
		vm.runInContext(fs.readFileSync(path.join(MILLS, script), "utf8"), sandbox, { filename: script });
	});
	return sandbox;
}

function newGame(name) {
	const g = entry(name);
	const sandbox = loadModel(g.modelScripts);
	const game = Object.create(sandbox.Model.Game);
	game.g = {};
	game.mOptions = JSON.parse(JSON.stringify(g.config.model.gameOptions));
	game.mOptions.levelOptions = {};
	game.mPlayedMoves = [];
	game.mFullPlayedMoves = [];
	function Move(args) { this.Init(args || {}); }
	Move.prototype = sandbox.Model.Move;
	game.mMoveClass = Move;
	game.CreateMove = function(args) { return new Move(args); };
	game.InitGame();
	return { sandbox, game };
}

// The real loader assembles the board class by Object.assign over
// JocBoard.prototype, which is where CopyFrom and GetSignature come from -
// mills overrides neither.
function boardProto(sandbox) {
	if(!sandbox.__boardProto)
		sandbox.__boardProto = Object.assign({}, sandbox.JocBoard.prototype, sandbox.Model.Board);
	return sandbox.__boardProto;
}

function newBoard(sandbox, game) {
	const board = Object.create(boardProto(sandbox));
	board.Init(game);
	board.InitialPosition(game);
	board.mWho = 1;
	return board;
}

const GAMES = [
	{ name: "morris9", men: 9, model: "9-men-morris-model.js", view: "9-men-morris-view.js",
		labels: ["9 Men´s Morris", "9 Men´s Morris Fly"], rules: "rules-morris9" },
	{ name: "morris12", men: 12, model: "12-men-morris-model.js", view: "12-men-morris-view.js",
		labels: ["12 Men´s Morris", "12 Men´s Morris Fly"], rules: "rules-morris12" },
];

GAMES.forEach((GAME) => Suite(GAME));

function Suite(GAME) {

/* ---------------------------------------------------------- the buttons */

const m12 = newGame(GAME.name);
let board = newBoard(m12.sandbox, m12.game);

t.check("the game opens in the prelude", board.preludeStage, 0);
board.GenerateMoves(m12.game);
t.check("one move per rule set", board.mMoves.map((m) => m.setup), [0, 1]);
t.check(GAME.name + ": the panel names both",
	m12.game.mOptions.prelude[0].labels, GAME.labels);
// The button is the name and nothing else. A second line explaining the
// difference was tried and dropped: it has to be translated, and it says less
// than the rules page it duplicates.
t.check("a button carries only the name",
	(m12.game.mOptions.prelude[0].hints || []).length, 0);

// mills spells out all four Move methods and every one of them handles exactly
// f, t and c. A setup dropped by Init or CopyFrom makes every button choose
// the first rule set - which is how the checkers version first came out.
const made = m12.game.CreateMove({ f: -1, t: -1, c: -1, setup: 1 });
t.check("CreateMove keeps the setup", made.setup, 1);
t.check("a setup move prints as #n", made.ToString(), "#1");
const copied = m12.game.CreateMove({ f: 0, t: 0, c: 0 });
copied.CopyFrom(made);
t.check("CopyFrom carries it", copied.setup, 1);
const plain = m12.game.CreateMove({ f: -1, t: 3, c: -1 });
const alsoPlain = m12.game.CreateMove({ f: -1, t: 3, c: -1 });
plain.CopyFrom(alsoPlain);
t.check("and drops it when copying from a board move", plain.setup, undefined);
t.check("two setups are not the same move",
	made.Equals(m12.game.CreateMove({ f: -1, t: -1, c: -1, setup: 0 })), false);
t.check("a setup is not the turn pass",
	made.Equals(m12.game.CreateMove({ f: -1, t: -1, c: -1 })), false);
t.check("board moves still compare on f, t and c",
	m12.game.CreateMove({ f: -1, t: 3, c: -1 }).Equals(m12.game.CreateMove({ f: -1, t: 3, c: -1 })), true);

// mills defines neither Board.CopyFrom nor Board.GetSignature, so JocBoard's
// JSON clone and JSON hash carry and hash the stage without help. Worth
// pinning: the checkers prelude had to do both by hand.
const clone = Object.create(boardProto(m12.sandbox));
clone.CopyFrom(board);
t.check("the stage survives a board copy", clone.preludeStage, 0);

const staticMoves = board.StaticGenerateMoves(m12.game);
t.check("the machine gets one move to answer with",
	Array.isArray(staticMoves) && staticMoves.length === 1, true);
t.check("and it is a setup", [0, 1].indexOf(staticMoves[0].setup) >= 0, true);

/* --------------------------------------------------- playing the prelude */

function choose(game, sandbox, setup) {
	const b = newBoard(sandbox, game);
	b.GenerateMoves(game);
	const move = b.mMoves.filter((m) => m.setup === setup)[0];
	b.ApplyMove(game, move);
	b.mWho = -b.mWho;
	b.GenerateMoves(game);         // second, empty stage: a turn pass
	b.ApplyMove(game, b.mMoves[0]);
	b.mWho = -b.mWho;
	return b;
}

board = choose(m12.game, m12.sandbox, 0);
t.check("after both stages the prelude is over", board.preludeStage, -1);
board.GenerateMoves(m12.game);
t.check("and the opening moves are placements",
	board.mMoves.length > 0 && board.mMoves.every((m) => m.setup === undefined && m.f === -1), true);

/* ------------------------------------------------------ the merge itself */

// The two options are read off mOptions at generation time, so what each
// button does is visible in the moves themselves rather than only in a flag.
function endgame(game, sandbox) {
	// three men each, out of the placing stage: the point where the two rule
	// sets part company
	const b = newBoard(sandbox, game);
	b.preludeStage = -1;
	b.placing = false;
	b.board = b.board.map(() => -1);
	b.menCount = { "1": 3, "-1": 3 };
	b.pieces.forEach((p) => { p.a = false; p.p = -1; p.d = -1; });
	const place = (index, pos) => {
		b.pieces[index].a = true;
		b.pieces[index].p = pos;
		b.board[pos] = index;
	};
	// White on a triangle of unconnected points, Black elsewhere
	[0, 1, 2].forEach((i, n) => place(i, [0, 3, 6][n]));
	[12, 13, 14].forEach((i, n) => place(i, [16, 19, 22][n]));
	b.mWho = 1;
	return b;
}

[0, 1].forEach((setup) => {
	const g = newGame(GAME.name);
	choose(g.game, g.sandbox, setup);
	const b = endgame(g.game, g.sandbox);
	b.GenerateMoves(g.game);
	// with three men, flying means a man may go to any empty point at all,
	// which is far more moves than walking a line
	const flies = b.mMoves.some((m) => {
		const links = [];
		// MillsEachDirection calls back with the neighbour only - one argument
		g.game.MillsEachDirection(m.f, (to) => links.push(to));
		return links.indexOf(m.t) < 0;
	});
	t.check("button " + setup + (setup ? " flies with three men" : " does not fly"), flies, setup === 1);
});

// The isolation the merge rests on: a set names every option it needs, and the
// defaults are restored before it is applied. Without that, picking the plain
// game after the flying one would keep canFly.
{
	const g = newGame(GAME.name);
	choose(g.game, g.sandbox, 1);
	t.check("fly sets canFly", !!g.game.mOptions.canFly, true);
	t.check("and lets a man in a mill be taken", g.game.mOptions.poundInMill, true);
	g.game.mOptions.prelude[0].persistent = true;   // ask again rather than repeat
	choose(g.game, g.sandbox, 0);
	t.check("plain after fly does not inherit canFly", !!g.game.mOptions.canFly, false);
	t.check("nor its capture rule", g.game.mOptions.poundInMill, false);
}

// The choice is remembered for the next game.
{
	const g = newGame(GAME.name);
	choose(g.game, g.sandbox, 1);
	t.check("the last choice is remembered", g.game.mOptions.prelude[0].persistent, 1);
	const b = newBoard(g.sandbox, g.game);
	b.GenerateMoves(g.game);
	t.check("so the next game does not ask again", b.mMoves.map((m) => m.setup), [1]);
}

/* -------------------------------------------------------------- the view */

/*
 * mills owns its input state machine, so the prelude has to supply one. The
 * first attempt overrode xdInput instead, which mills never reads: the buttons
 * appeared and a click did nothing. Driving the machine here is the only way
 * to see that from Node.
 */
{
	const sandbox = {
		console, Math, JSON, Object, Array, setTimeout,
		View: { Game: {}, Board: {}, Move: {} },
	};
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);

	let boardMachine = 0, animated = 0;
	sandbox.View.Game.xdInit = function() { this.millsSize = 1333; };
	sandbox.View.Board.xdBuildHTStateMachine = function() { boardMachine++; };
	sandbox.View.Board.xdPlayedMove = function() { animated++; };
	vm.runInContext(fs.readFileSync(path.join(MILLS, "prelude-view.js"), "utf8"),
		sandbox, { filename: "prelude-view.js" });
	const view = sandbox.View;

	// a scene that records instead of drawing
	const gadgets = {};
	const xdv = {
		createGadget(name, spec) { gadgets[name] = { spec, props: {} }; },
		updateGadget(name, spec) {
			if(!gadgets[name]) { gadgets[name] = { missing: true, props: {} }; return; }
			Object.assign(gadgets[name].props, spec.base || {});
		},
	};

	const dialog = entry(GAME.name).config.model.gameOptions.prelude[0];
	const viewGame = {
		mOptions: { prelude: JSON.parse(JSON.stringify(entry(GAME.name).config.model.gameOptions.prelude)),
			width: 7, height: 7 },
		made: null,
		MakeMove(move) { this.made = move; },
		MoveShown() { this.shown = (this.shown || 0) + 1; },
	};

	view.Game.xdInit.call(viewGame, xdv);
	t.check("the cell size is published by the board's own view", viewGame.millsSize, 1333);
	t.check("a panel and one button per rule set",
		Object.keys(gadgets).sort(), ["setup0#0", "setup0#1", "setup0-board"]);
	t.check("no gadget was updated before it existed",
		Object.values(gadgets).filter((g) => g.missing).length, 0);

	// The sizes the first attempt got wrong: measured in cells, not pixels.
	const button = gadgets["setup0#0"].spec.base, panel = gadgets["setup0-board"].spec.base;
	t.check("the button is 2933 x 1333", [button.width, button.height], [2933, 1333]);
	t.check("the panel is 7065 x 2133", [panel.width, panel.height], [7065, 2133]);
	t.check("the panel is under three fifths of the board", panel.width / 12000 < 0.6, true);
	t.check("the buttons sit inside the panel",
		Math.abs(button.x) + button.width / 2 <= panel.width / 2, true);
	t.check("and above it", button.z > panel.z, true);

	// a minimal state machine, recording what the prelude asks of it
	function machine() {
		const transitions = {};
		return {
			transitions,
			smTransition(from, event, to, actions) {
				(Array.isArray(from) ? from : [from]).forEach((f) => {
					transitions[f + "/" + event] = { to, actions };
				});
			},
			smEntering() { }, smLeaving() { },
			fire(state, event, args) {
				const tr = transitions[state + "/" + event];
				if(!tr) return null;
				this.queued = [];
				tr.actions.forEach((a) => a(args));
				return tr.to;
			},
			smQueueEvent(event, args) { (this.queued = this.queued || []).push({ event, args }); },
		};
	}

	// stage 0: the two buttons
	const preludeBoard = { preludeStage: 0, mMoves: [{ f: -1, t: -1, c: -1, setup: 0 }, { f: -1, t: -1, c: -1, setup: 1 }] };
	let htsm = machine();
	view.Board.xdBuildHTStateMachine.call(preludeBoard, xdv, htsm, viewGame);
	t.check("the prelude does not hand the stage to the board's machine", boardMachine, 0);
	htsm.fire("S_INIT", "E_INIT", {});
	t.check("both buttons are shown",
		[gadgets["setup0#0"].props.visible, gadgets["setup0#1"].props.visible], [true, true]);
	t.check("and both are clickable",
		[typeof gadgets["setup0#0"].props.click, typeof gadgets["setup0#1"].props.click],
		["function", "function"]);
	t.check("the panel is shown too", gadgets["setup0-board"].props.visible, true);

	// this is the whole point: a click has to reach a move
	gadgets["setup0#1"].props.click();
	t.check("a click queues the pick", htsm.queued.map((e) => e.event), ["E_PICK"]);
	htsm.fire("S_SELECT", "E_PICK", htsm.queued[0].args);
	t.check("and the chosen setup is played", viewGame.made && viewGame.made.setup, 1);
	t.check("the panel is taken down", gadgets["setup0-board"].props.visible, false);
	t.check("and the buttons unbound", gadgets["setup0#1"].props.click, null);

	// stage 1: nothing to ask, so it plays itself
	viewGame.made = null;
	const passBoard = { preludeStage: 1, mMoves: [{ f: -1, t: -1, c: -1 }] };
	htsm = machine();
	view.Board.xdBuildHTStateMachine.call(passBoard, xdv, htsm, viewGame);
	htsm.fire("S_INIT", "E_INIT", {});
	t.check("a stage with nothing to ask plays itself",
		htsm.queued.map((e) => e.event), ["E_PICK"]);

	// once the prelude is over the board's own machine takes back over
	view.Board.xdBuildHTStateMachine.call({ preludeStage: -1 }, xdv, machine(), viewGame);
	t.check("a finished prelude hands the machine back", boardMachine, 1);
	view.Board.xdBuildHTStateMachine.call({}, xdv, machine(), viewGame);
	t.check("so does a game with no prelude at all", boardMachine, 2);

	// nothing moved, so nothing to animate - and mills' own xdPlayedMove would
	// take a t of -1 into millsAnimateMove
	const play = (move) => {
		try { view.Board.xdPlayedMove.call({}, xdv, viewGame, move); return null; }
		catch(e) { return e.message; }
	};
	t.check("the choice is not animated",
		[play({ f: -1, t: -1, c: -1, setup: 1 }), animated], [null, 0]);
	t.check("nor is the turn pass, which carries no setup",
		[play({ f: -1, t: -1, c: -1 }), animated], [null, 0]);
	t.check("a real move still reaches the animation",
		[play({ f: -1, t: 3, c: -1 }), animated], [null, 1]);
}

/* --------------------------------------------------------------- manifest */

const m = entry(GAME.name);
t.check("the game ships the prelude model",
	m.config.model.js.indexOf("prelude-model.js") >= 0, true);
t.check("after mills-model.js",
	m.config.model.js.indexOf("prelude-model.js") > m.config.model.js.indexOf("mills-model.js"), true);
t.check("and the view that draws the buttons",
	m.config.view.js.indexOf("prelude-view.js") >= 0, true);
t.check("after mills-xd-view.js, which publishes the cell size",
	m.config.view.js.indexOf("prelude-view.js") > m.config.view.js.indexOf("mills-xd-view.js"), true);

// the gulpfile writes a manifest with JSON.stringify: a dialog carrying a
// function would arrive at the browser empty
t.check("the dialog survives JSON",
	JSON.parse(JSON.stringify(m.config.model.gameOptions.prelude))[0].rules.length, 2);

// The view is the 12-men one with the overlay appended. The plain entry it was
// derived from is gone, so what is left to check is that the overlay is the
// only difference from what the module's other 12-men view scripts expect: the
// board and the set are unchanged, and only the script list grew.
t.check("the view adds the overlay and nothing else",
	m.config.view.js, ["mills-xd-view.js", GAME.view, "prelude-view.js"]);
t.check("on the module's own board, with the right number of men",
	[m.config.model.gameOptions.width, m.config.model.gameOptions.height,
		m.config.model.gameOptions.mencount],
	[7, 7, GAME.men]);
t.check("and the right model script",
	m.config.model.js, ["mills-model.js", GAME.model, "prelude-model.js"]);

[GAME.rules + ".html", GAME.rules + "-fr.html"].forEach((file) => {
	t.check(file + " exists", fs.existsSync(path.join(MILLS, file)), true);
});

}

// Both merges are complete: the games they replace are gone, so the module has
// one entry per board rather than two.
t.check("the module lists one game per board",
	manifest.map((g) => g.name).sort(), ["6-men-morris", "7-men-morris", "morris12", "morris9"]);

// The two games must not share the object the prelude writes its answer into,
// or choosing in one would be remembered by the other.
{
	const nine = entry("morris9").config.model.gameOptions.prelude;
	const twelve = entry("morris12").config.model.gameOptions.prelude;
	t.check("the two dialogs are separate objects", nine[0] === twelve[0], false);
	t.check("but offer the same rules",
		JSON.stringify(nine[0].rules), JSON.stringify(twelve[0].rules));
	nine[0].persistent = 1;
	t.check("so remembering one does not answer for the other", twelve[0].persistent, true);
	nine[0].persistent = true;
}

t.done("Men's Morris preludes");
