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

t.check("the cell pitch is published", vg9.goSize, Math.floor(12000 / 11));
t.check("one gadget per intersection, plus the furniture",
	Object.keys(xdv.gadgets).length, 81 + 4);
t.check("the furniture is the board, the bar, the button and the mark",
	Object.keys(xdv.gadgets).filter((k) => k.indexOf("point#") < 0).sort(),
	["board", "last-move", "pass-button", "status"]);
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

/*
 * The furniture sits beside the board, not on it. Both the bar and the button
 * used to lap over the board's wooden border to be readable; reserving a full
 * cell of band above and below is what buys the room, at about five per cent
 * of the board's width.
 */
{
	const boardTop = -(9 * size) / 2, boardBottom = (9 * size) / 2;
	const edge = (id, dir) => {
		const g = xdv.gadgets[id];
		return g.props.y + dir * g.skin.height / 2;
	};
	t.check("the status bar clears the top of the board",
		edge("status", +1) <= boardTop, true);
	t.check("the pass button clears the bottom",
		edge("pass-button", -1) >= boardBottom, true);
	t.check("and both stay inside the area",
		[edge("status", -1) >= -12000 / 2, edge("pass-button", +1) <= 12000 / 2], [true, true]);
}

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
// The mark takes its colour FROM the stone it lands on. One fixed colour
// cannot be read against both black and white, whatever hue is picked, so the
// class has to follow the move rather than being set once at creation.
t.check("and takes the colour that reads on a black stone",
	xdv.gadgets["last-move"].skin.classes, "go-last go-last-on-black");
{
	// A board of its own: mutating the one above would follow into the status
	// checks below, which read their own positions.
	const reply = newBoard(g9);
	reply.mWho = -1;                       // White to play
	reply.GenerateMoves(g9);
	const a1 = g9.StringToCoord("A1");
	reply.ApplyMove(g9, reply.mMoves.filter((m) => m.p === a1)[0]);
	View.Board.xdDisplay.call(reply, xdv, vg9);
	t.check("and the other one on a white stone",
		xdv.gadgets["last-move"].skin.classes, "go-last go-last-on-white");
}
t.check("no gadget was updated before it existed", xdv.missing, []);

/* ----------------------------------------------------------- the status */

/*
 * What the bar says is a judgement, not a readout. Area counting an unresolved
 * position is not a running score - most of the board is neutral until the
 * borders are settled, and a group with two eyes counts the same as a dead one
 * - so while the game runs the bar shows only what is factual: the prisoners
 * each side has taken, and the komi. The score appears when both have passed
 * and it means something.
 */
{
	function statusText() {
		const calls = [];
		const c = {
			calls,
			beginPath() { }, arc() { }, fill() { }, stroke() { },
			measureText: () => ({ width: 100 }),
			fillText: (t) => calls.push(t),
			set font(v) { }, set fillStyle(v) { }, set strokeStyle(v) { },
			set lineWidth(v) { }, set textAlign(v) { }, set textBaseline(v) { },
		};
		xdv.gadgets["status"].spec["2d"].draw.call({}, c);
		return calls;
	}

	const running = newBoard(g9);
	running.prisoners = [3, 5];
	View.Board.xdDisplay.call(running, xdv, vg9);
	t.check("mid-game the bar shows the two counts and the komi, and no label",
		statusText(), ["3", "5", "komi 5.5"]);
	t.check("and never a score that would mean nothing yet",
		statusText().some((s) => /win|Draw/.test(s)), false);
	// No word to translate on a bar that is on screen the whole game: the
	// rules page explains it once instead, which is where it belongs.
	t.check("and no label needing translation",
		statusText().some((s) => /[A-Za-z]/.test(s) && !/^komi /.test(s)), false);
	["rules.html", "rules-fr.html"].forEach((page) => {
		const text = fs.readFileSync(path.join(GO, page), "utf8");
		t.check(page + " explains the bar instead",
			/captur/i.test(text) && /komi/i.test(text), true);
	});

	// black owns everything but a two-point white corner
	const over = newBoard(g9);
	for(let pos = 0; pos < 81; pos++) over.board[pos] = 1;
	[70, 71, 79].forEach((pos) => { over.board[pos] = -1; });
	over.board[80] = 0;
	over.passes = 2;
	View.Board.xdDisplay.call(over, xdv, vg9);
	const ended = statusText();
	const score = over.goScore(g9);
	t.check("once both have passed the score appears",
		[ended[0], ended[1]], ["" + score.black, "" + score.white]);
	// A stone and a number, not a sentence: the bar is drawn by Jocly, which
	// has no translations, so the verdict must read the same in every
	// language. The words are the host's business, from getBoardState("score").
	t.check("with the winner's stone, and by how much",
		ended[2], "\u25cf +" + (score.black - score.white));

	// komi is what settles a close board, so the margin has to include it
	t.check("the margin counts komi", score.white % 1, 0.5);

	t.check("the bar is built with the rest of the scene",
		(() => {
			const scene = recorder();
			vg9.xdInit(scene);
			vg9.xdBuildScene(scene);
			return scene.gadgets["status"].props.visible;
		})(), true);
}

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
// Every string of go-* classes the view hands to a gadget, not just the point
// ones: the last-move mark now emits its own pair, and a class the stylesheet
// does not define is a mark that draws nothing.
const emitted = (src.match(/"go-(?:point|last)[^"]*"/g) || [])
	.join(" ").replace(/"/g, "").split(/\s+/).filter((x) => x);
t.check("and every class the view can emit",
	emitted.filter((c) => !new RegExp("\\." + c + "[ ,.:{]").test(css)), []);

/*
 * No percentage where CSS demands a length.
 *
 * THIS IS WHAT KEPT THE LAST-MOVE MARK OFF THE BOARD. `border: 12% solid` reads
 * naturally and is invalid - border-width takes <length> | thin | medium |
 * thick, never a percentage - so the browser dropped the whole declaration and
 * .go-last rendered as an empty transparent box. Nothing failed, nothing was
 * logged, the mark simply never appeared. box-shadow lengths have the same
 * rule and the same trap, and this file had that one too.
 *
 * The rest of the stylesheet does scale with the point, because the properties
 * it uses - border-radius, gradient stops - genuinely accept percentages. The
 * check is on the two that do not.
 */
const strip = css.replace(/\/\*[\s\S]*?\*\//g, "");
// border-radius and gradient stops DO take percentages and the file leans on
// them, so the pattern names only the border properties that take a length.
t.check("no percentage border width",
	/border(-(top|right|bottom|left))?(-width)?\s*:[^;}]*\d\s*%/.test(strip), false);
t.check("no percentage box-shadow length",
	/box-shadow\s*:[^;}]*\d\s*%/.test(strip), false);

/* ------------------------------------------------------------- manifest */

manifest.forEach((entry) => {
	// The prelude's view goes with it, and its absence is a silent failure
	// rather than a loud one: the model would ask for the prelude, no panel
	// would be built, and the game would open on a goban that answers no
	// click. checkers/index.js carries the same warning for its own.
	t.check(entry.name + " ships the view",
		entry.config.view.js, ["go-xd-view.js", "prelude-view.js"]);
	t.check(entry.name + " ships the stylesheet", entry.config.view.css, ["go.css"]);
	t.check(entry.name + " does not offer to show every move",
		entry.config.view.useShowMoves, false);
	t.check(entry.name + " declares a 2D skin only",
		entry.config.view.skins.filter((s) => s["3d"]).length, 0);
	t.check(entry.name + " offers both surfaces",
		entry.config.view.skins.map((s) => s.name), ["skin2dwood", "skin2d"]);

	/*
	 * A thumbnail per board size. The three games differ by nothing else -
	 * same rules, same view, same stones - so one shared picture made them
	 * indistinguishable in the list, where the size is the only thing the
	 * player is choosing between.
	 *
	 * The name is checked AND the file: the build copies whatever the manifest
	 * names, so a name pointing at nothing ships a broken image rather than
	 * failing the build.
	 */
	const size = entry.config.model.gameOptions.size;
	t.check(entry.name + " has a thumbnail of its own",
		entry.config.model.thumbnail, "go-thumbnail-" + size + ".png");
	t.check("and the file is there",
		fs.existsSync(path.join(GO, entry.config.model.thumbnail)), true);
});

/* ------------------------------------------------------- the rules pages */

/*
 * The player is now ASKED something before the first stone, so the rules page
 * has to say what the question is. Both languages, and the same ground in
 * both: a translation that forgets one of the two rule sets leaves half the
 * players unable to answer the panel in front of them.
 *
 * Checked on content rather than on wording - these pages are prose and will
 * be rewritten - but on the content that would leave the panel unexplained.
 */
["rules.html", "rules-fr.html"].forEach((page) => {
	const text = fs.readFileSync(path.join(GO, page), "utf8");
	t.check(page + " names both rule sets",
		/Tromp-Taylor/.test(text) && /OGS/.test(text), true);
	// The single difference between them. A page that named the two sets
	// without saying what separates them would make the choice arbitrary.
	t.check(page + " says what separates them",
		/self-capture|suicide/i.test(text), true);
	// And says the choice is recorded rather than a passing setting: it is a
	// move, it is saved with the game, and the engine is told about it.
	// Le choix appartient a la partie : il est joue comme un coup, sauvegarde
	// avec elle, et transmis au moteur. Ce n'est pas un reglage d'affichage,
	// et c'est ce que la page doit dire -- peu importe la tournure.
	t.check(page + " says the choice belongs to the game",
		/recorded|enregistr|partie int\u00e9grante|part of the game/i.test(text), true);

	/*
	 * ET LE DRAPEAU DU BOUTON, a cote du point de regle qu'il gouverne.
	 *
	 * C'est le seul endroit ou le joueur peut faire le lien : le panneau
	 * montre deux drapeaux et ne dit rien de plus, la page de regles dit tout
	 * et ne montrait rien. Une page qui n'aurait que l'un des deux laisserait
	 * la moitie du lien a deviner.
	 */
	["China", "New_Zealand"].forEach((flag) => {
		t.check(page + " carries the " + flag + " flag",
			text.indexOf("res/flags/" + flag + ".png") > 0, true);
	});
	// Il vit dans le module, pas dans la page : le chemin passe par {GAME},
	// que l'hote remplace, comme toutes les images des pages de regles.
	t.check(page + " asks the host for them",
		/\{GAME\}\/res\/flags\//.test(text), true);
});

/* ------------------------------------------------------------ the skins */

/*
 * Two skins, both flat, sharing everything but the surface under the grid.
 * jocly.xd-view.js merges a gadget's options as base, then "2d" or "3d", then
 * a key named after the current skin - so the wood skin overrides the draw and
 * nothing else, and the type and size stay declared once. Getting that wrong
 * is invisible until someone switches skin.
 */
{
	const spec = xdv.gadgets["board"].spec;
	t.check("the wood skin overrides the board", typeof spec.skin2dwood.draw, "function");
	t.check("and only the drawing", Object.keys(spec.skin2dwood), ["draw"]);
	t.check("so the type and size come from the shared block",
		[spec["2d"].type, spec["2d"].width], ["canvas", 9 * vg9.goSize]);

	// a context that records the calls instead of painting
	function ctx() {
		const calls = [];
		const record = (name) => (...args) => calls.push([name].concat(args.slice(0, 2)));
		return {
			calls,
			fillRect: record("fillRect"), drawImage: record("drawImage"),
			beginPath: record("beginPath"), moveTo: record("moveTo"),
			lineTo: record("lineTo"), stroke: record("stroke"),
			arc: record("arc"), fill: record("fill"),
			set fillStyle(v) { calls.push(["fillStyle", v]); },
			set strokeStyle(v) { calls.push(["strokeStyle", v]); },
			set lineWidth(v) { },
		};
	}
	const counted = (c, name) => c.calls.filter((x) => x[0] === name).length;

	// the plain skin paints a colour and draws the grid, synchronously
	const plain = ctx();
	spec["2d"].draw.call({}, plain);
	t.check("the plain board fills a colour", counted(plain, "fillRect"), 1);
	t.check("and draws the grid on it", counted(plain, "stroke") > 0, true);
	t.check("with a star point per hoshi", counted(plain, "arc"), vg9.goStars.length);

	// the wood skin asks for the texture and draws nothing until it arrives
	const wood = ctx();
	let asked = null, deliver = null;
	const avatar = {
		getResource(key, cb) { asked = key; deliver = cb; },
	};
	spec.skin2dwood.draw.call(avatar, wood);
	t.check("the wood board asks for the texture",
		asked, "image|/games/go/res/wood2.jpg");
	t.check("and paints nothing before it arrives", wood.calls.length, 0);

	deliver({});
	t.check("then tiles it rather than stretching it",
		counted(wood, "drawImage") > 1, true);
	t.check("draws the same grid over it", counted(wood, "stroke") > 0, true);
	t.check("and the same star points", counted(wood, "arc"), vg9.goStars.length);

	t.check("the texture is in the module's own res folder, where the build looks",
		fs.existsSync(path.join(GO, "res", "wood2.jpg")), true);
}

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
