/*
 * The goban.
 *
 *   node tests/go/go-view.test.js
 *
 * How it looks can only be judged in a browser. What is checked here is what
 * would otherwise be wrong silently: that every intersection gets a gadget and
 * that they are laid out on the grid the board is drawn on, that a click
 * reaches a move, that passing has a way to be expressed at all - it is the one
 * move with no square to point at - and that a captured stone is faded out and
 * then restored, rather than left invisible under the next stone played there.
 *
 * The view's own input goes through jocly.xd-view.js's generic state machine
 * (View.Board.xdInput), unlike mills, which replaces the machine outright. So
 * the input spec is exercised the way that machine exercises it: getActions
 * with the legal moves, then again with the input the chosen action validated.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(ROOT, "src");
const GO = path.join(SRC, "games", "go");

const t = require(path.join(ROOT, "tests", "fairy", "harness.js")).runner();
const manifest = require(path.join(GO, "index.js")).games;

/* ------------------------------------------------- the model, for moves */

function loadModel() {
	const sandbox = {
		console, Math, JSON, Object, Array, Date,
		Int32Array, Int8Array, Uint8Array, Float64Array, setTimeout,
		Model: { Game: {}, Board: {}, Move: {} }, exports: {}, module: {},
	};
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	["jocly.util.js", "jocly.game.js"].forEach((f) =>
		vm.runInContext(fs.readFileSync(path.join(SRC, "core", f), "utf8"), sandbox, { filename: f }));
	vm.runInContext(fs.readFileSync(path.join(GO, "go-model.js"), "utf8"), sandbox, { filename: "go-model.js" });
	return sandbox;
}

const model = loadModel();

function newGame(name) {
	const entry = manifest.filter((x) => x.name === name)[0];
	const game = Object.create(model.Model.Game);
	game.g = {};
	game.mOptions = JSON.parse(JSON.stringify(entry.config.model.gameOptions));
	game.mPlayedMoves = [];
	game.InitGame();
	return game;
}

function newBoard(game) {
	const proto = Object.assign({}, model.JocBoard.prototype, model.Model.Board);
	const b = Object.create(proto);
	b.InitialPosition(game);
	b.mWho = 1;
	return b;
}

/* -------------------------------------------------------------- the view */

function loadView() {
	const sandbox = {
		console, Math, JSON, Object, Array, setTimeout,
		JocGame: { PLAYER_A: 1, PLAYER_B: -1, DRAW: 2 },
		View: { Game: {}, Board: {}, Move: {} },
	};
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	vm.runInContext(fs.readFileSync(path.join(GO, "go-xd-view.js"), "utf8"),
		sandbox, { filename: "go-xd-view.js" });
	return sandbox.View;
}

const View = loadView();

// a scene that records instead of drawing
function recorder() {
	const gadgets = {}, missing = [];
	return {
		gadgets, missing,
		createGadget(id, spec) {
			gadgets[id] = {
				spec, fades: [],
				props: Object.assign({}, spec.base),
				skin: Object.assign({}, spec["2d"]),
			};
		},
		updateGadget(id, spec, delay, callback) {
			const g = gadgets[id];
			if(!g) { missing.push(id); return; }
			Object.assign(g.props, spec.base || {});
			if(spec["2d"]) {
				Object.assign(g.skin, spec["2d"]);
				if(spec["2d"].opacity === 0) g.fades.push(delay);
			}
			if(callback) callback();
		},
	};
}

function viewGame(game) {
	return Object.assign(Object.create(View.Game), {
		mOptions: game.mOptions,
		mViewOptions: { fullPath: "/games/go" },
		mViewAs: 1,
		g: game.g,
		sounds: [],
		shown: 0,
		PlaySound(s) { this.sounds.push(s); },
		MoveShown() { this.shown++; },
	});
}

/* ------------------------------------------------------------- the board */

const g9 = newGame("go9");
const vg9 = viewGame(g9);
const xdv = recorder();
vg9.xdInit(xdv);

t.check("the cell pitch is published", vg9.goSize, Math.floor(12000 / 10));
t.check("one gadget per intersection, plus the furniture",
	Object.keys(xdv.gadgets).length, 81 + 3);
t.check("the board is drawn as one canvas", xdv.gadgets["board"].skin.type, "canvas");
t.check("and the intersections are elements", xdv.gadgets["point#0"].skin.type, "element");
t.check("passing has a control of its own", xdv.gadgets["pass-button"] !== undefined, true);
t.check("which starts hidden", xdv.gadgets["pass-button"].spec.base.visible, false);
t.check("as does the last-move mark", xdv.gadgets["last-move"].spec.base.visible, false);

// 9x9 marks four corners and the centre; 19x19 marks nine.
t.check("a 9x9 board has five star points", vg9.goStars.length, 5);
t.check("the centre is one of them", vg9.goStars.indexOf(4 * 9 + 4) >= 0, true);
/* ------------------------------------------------------ building the scene */

/*
 * jocly.xd-view.js calls xdBuildScene unconditionally once the skin is built.
 * A view without one does not degrade - it throws "this.xdBuildScene is not a
 * function" and nothing is drawn at all, which is exactly what the first
 * version of this view did.
 */
t.check("the view builds its scene", typeof View.Game.xdBuildScene, "function");
{
	const scene = recorder();
	vg9.xdInit(scene);
	vg9.xdBuildScene(scene);
	t.check("the board is shown", scene.gadgets["board"].props.visible, true);
	t.check("every intersection is shown",
		Object.keys(scene.gadgets).filter((k) => k.indexOf("point#") === 0)
			.every((k) => scene.gadgets[k].props.visible === true), true);
	t.check("the furniture waits", [scene.gadgets["pass-button"].props.visible,
		scene.gadgets["last-move"].props.visible], [false, false]);
	t.check("and nothing was touched before it existed", scene.missing, []);
}

/* ------------------------------------------------------------- the grid */

// The intersections have to land on the lines the board canvas draws, which is
// the one thing a picture would show instantly and a test has to state.
const size = vg9.goSize;
const c00 = vg9.goCoord(0), c88 = vg9.goCoord(80), c01 = vg9.goCoord(1);
t.check("adjacent points are one pitch apart", c01[0] - c00[0], size);
t.check("the grid is centred", [c00[0] + c88[0], c00[1] + c88[1]], [0, 0]);
t.check("and fits inside the board with a margin",
	Math.abs(c00[0]) + size / 2 <= 12000 / 2, true);

// Turning the board round turns the coordinates with it.
vg9.mViewAs = -1;
t.check("seen from the other side, the corners swap", vg9.goCoord(0), c88);
vg9.mViewAs = 1;

/* ---------------------------------------------------------- the display */

const board = newBoard(g9);
board.GenerateMoves(g9);
const e5 = g9.StringToCoord("E5");
board.ApplyMove(g9, board.mMoves.filter((m) => m.p === e5)[0]);

View.Board.xdDisplay.call(board, xdv, vg9);
t.check("a stone is shown by its class", xdv.gadgets["point#" + e5].skin.classes, "go-point go-black");
t.check("an empty point carries no colour", xdv.gadgets["point#0"].skin.classes, "go-point");
t.check("the point is placed on the grid",
	[xdv.gadgets["point#" + e5].props.x, xdv.gadgets["point#" + e5].props.y], [0, 0]);
t.check("the last move is marked there",
	[xdv.gadgets["last-move"].props.visible,
		xdv.gadgets["last-move"].props.x, xdv.gadgets["last-move"].props.y], [true, 0, 0]);
t.check("no gadget was updated before it existed", xdv.missing, []);

/* ------------------------------------------------------------ the input */

// The generic machine calls getActions with the legal moves, then again with
// whatever the chosen action validated.
board.mWho = -1;
board.GenerateMoves(g9);
const input = View.Board.xdInput.call(board, xdv, vg9);
let actions = input.getActions.call(board, board.mMoves, input.initial);

t.check("every legal point is an action, and passing is one more",
	Object.keys(actions).length, board.mMoves.length);
t.check("the occupied point is not among them", actions["p" + e5], undefined);

const a4 = g9.StringToCoord("A4");
t.check("an action points at its own gadget",
	[actions["p" + a4].click, actions["p" + a4].view],
	[["point#" + a4], ["point#" + a4]]);
t.check("and carries the move it plays", actions["p" + a4].moves[0].p, a4);

t.check("passing is an action too", actions["pass"].click, ["pass-button"]);
t.check("carrying the pass move", actions["pass"].moves[0].p, -1);
t.check("and the button is furniture, so the machine puts it away",
	input.furnitures, ["pass-button"]);

t.check("once a point is chosen the move is complete",
	input.getActions.call(board, board.mMoves, actions["p" + a4].validate), null);
t.check("and so is a pass",
	input.getActions.call(board, board.mMoves, actions["pass"].validate), null);

/* ---------------------------------------------------------- the capture */

/*
 * Nothing travels across a Go board, so a played move is either nothing to
 * animate or a set of stones to fade out. The fade must not leave the point
 * invisible: it is reused the moment someone plays there again.
 */
const capture = newBoard(g9);
[".b.......", "bwb......", "........."].forEach((row, r) =>
	row.split("").forEach((ch, c) => {
		if(ch === "b") capture.board[r * 9 + c] = 1;
		else if(ch === "w") capture.board[r * 9 + c] = -1;
	}));
capture.GenerateMoves(g9);
const b7 = g9.StringToCoord("B7"), b8 = g9.StringToCoord("B8");
const taking = capture.mMoves.filter((m) => m.p === b7)[0];
t.check("the position is a capture", taking.c, [b8]);

vg9.shown = 0;
View.Board.xdPlayedMove.call(capture, xdv, vg9, taking);
t.check("the captured stone is faded, not hidden", xdv.gadgets["point#" + b8].skin.opacity, 0);
t.check("over a duration", xdv.gadgets["point#" + b8].fades, [300]);
t.check("a capture is heard", vg9.sounds, ["capture"]);
t.check("and the move is reported shown once", vg9.shown, 1);

capture.ApplyMove(g9, taking);
View.Board.xdDisplay.call(capture, xdv, vg9);
t.check("the next display restores the point", xdv.gadgets["point#" + b8].skin.opacity, 1);
t.check("with no stone on it", xdv.gadgets["point#" + b8].skin.classes, "go-point");

// A pass has nothing to fade and must not reach the capture path, which would
// look up point#-1.
vg9.shown = 0;
vg9.sounds = [];
xdv.missing.length = 0;
View.Board.xdPlayedMove.call(capture, xdv, vg9, { p: -1 });
t.check("a pass animates nothing", [vg9.shown, vg9.sounds.length, xdv.missing], [1, 0, []]);

// ...and neither does a stone that captured nothing.
vg9.shown = 0;
View.Board.xdPlayedMove.call(capture, xdv, vg9, { p: g9.StringToCoord("J1") });
t.check("nor does a quiet move", [vg9.shown, vg9.sounds.length], [1, 0]);

/* ----------------------------------------------------------- stylesheet */

const css = fs.readFileSync(path.join(GO, "go.css"), "utf8");
["go-point", "go-black", "go-white", "go-last"].forEach((name) =>
	t.check("the stylesheet defines ." + name,
		new RegExp("\\." + name + "[ ,.:{]").test(css), true));

const src = fs.readFileSync(path.join(GO, "go-xd-view.js"), "utf8");
const emitted = (src.match(/"go-point[^"]*"/g) || [])
	.join(" ").replace(/"/g, "").split(/\s+/).filter((x) => x);
t.check("and every class the view can emit",
	emitted.filter((c) => !new RegExp("\\." + c + "[ ,.:{]").test(css)), []);

/* ------------------------------------------------------------- manifest */

manifest.forEach((entry) => {
	t.check(entry.name + " ships the view", entry.config.view.js, ["go-xd-view.js"]);
	t.check(entry.name + " ships the stylesheet", entry.config.view.css, ["go.css"]);
	t.check(entry.name + " does not offer to show every move",
		entry.config.view.useShowMoves, false);
	t.check(entry.name + " declares a 2D skin only",
		entry.config.view.skins.filter((s) => s["3d"]).length, 0);
});

/* --------------------------------------------------------- another size */

/*
 * Last, because it has to be. go-xd-view.js keeps the board width and the cell
 * pitch in variables of its own closure, set by xdInit - the same shape
 * mills-xd-view.js uses - so initialising a second game replaces the first
 * one's geometry. One view instance serves one game, which is how Jocly builds
 * them; a test that interleaves two sizes measures the wrong board, which is
 * exactly what this one did until it was moved down here.
 */
{
	const vg19 = viewGame(newGame("go19"));
	const scene = recorder();
	vg19.xdInit(scene);
	t.check("a 19x19 board has nine star points", vg19.goStars.length, 9);
	t.check("on the 4-4 points", vg19.goStars.indexOf(3 * 19 + 3) >= 0, true);
	t.check("and 361 intersections",
		Object.keys(scene.gadgets).filter((k) => k.indexOf("point#") === 0).length, 361);
	t.check("its pitch is smaller than the 9x9 one", vg19.goSize < 1200, true);
	const corner = vg19.goCoord(0), far = vg19.goCoord(360);
	t.check("still centred", [corner[0] + far[0], corner[1] + far[1]], [0, 0]);
	t.check("still one pitch apart",
		vg19.goCoord(1)[0] - corner[0], vg19.goSize);
}

t.done("Go view");
