/*
 * Three-check view tests - pure Node:
 *   node tests/fairy/threecheck-view.test.js
 *
 * standard/threecheck-view.js puts the check count on each king's square. How
 * that looks can only be judged in a browser; what is checked here is what
 * would otherwise be wrong silently - which side's counter each king reads
 * (they are stored by giver, displayed by receiver, so the two are crossed),
 * whether the gadget is hidden when there is nothing to show, and that every
 * CSS class the view can emit actually exists in the stylesheet.
 *
 * The base xdInit/xdDisplay are replaced by recorders before the file under
 * test is loaded, so these cover the overlay's own logic rather than jocly's
 * scene building - the shape tests/baroque/rococo/anim.test.js uses.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CHESSBASE = path.join(__dirname, "..", "..", "src", "games", "chessbase");

let passed = 0, failed = 0;
function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if(a === e) { passed++; console.log("  ok   " + label); }
	else { failed++; console.log("  FAIL " + label + "\n    expected " + e + "\n    actual   " + a); }
}

function extend() {
	const args = Array.prototype.slice.call(arguments);
	const deep = args[0] === true;
	if(deep) args.shift();
	const target = args.shift();
	args.forEach((src) => {
		for(const key in src) {
			const value = src[key];
			if(deep && value && typeof value == "object" && !Array.isArray(value)) {
				if(typeof target[key] != "object" || target[key] === null)
					target[key] = {};
				extend(true, target[key], value);
			} else
				target[key] = value;
		}
	});
	return target;
}

const sandbox = {
	console, Math, Object, Array, JSON,
	$: { extend: extend },
	View: { Game: {}, Board: {}, Move: {} },
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
function run(script) {
	vm.runInContext(fs.readFileSync(path.join(CHESSBASE, script), "utf8"), sandbox, { filename: script });
}

// the real view files load first, so the test also proves they coexist
["base-view.js", "grid-board-view.js", "staunton-set-view.js",
	"extruded-set-view.js", "famous/classic-view.js"].forEach(run);

let baseInit = 0, baseDisplay = 0;
sandbox.View.Game.xdInit = function() { baseInit++; };
sandbox.View.Board.xdDisplay = function() { baseDisplay++; };
run("standard/threecheck-view.js");

// a recorder in place of jocly's scene
function recorder() {
	const created = {}, updated = {};
	return {
		created, updated,
		createGadget(name, spec) { created[name] = spec; },
		updateGadget(name, spec) { updated[name] = extend(true, updated[name] || {}, spec); },
	};
}

// a view-side game reduced to what the overlay actually asks of it
const viewGame = {
	g: { fullPath: "/games/chessbase" },
	cbTargetMesh: "/res/ring-target.js",
	cbMakeDisplaySpec: (pos, side) => ({
		"2d": { x: pos, y: side },
		"skin2dwood": { x: pos, y: side },
		"3d": { x: pos, y: side },
	}),
};

/* ------------------------------------------------------------ creation */

const init = recorder();
sandbox.View.Game.xdInit.call(viewGame, init);

check("the base xdInit still runs", baseInit, 1);
check("one pip gadget per side", Object.keys(init.created).sort(), ["tc-pips#-1", "tc-pips#1"]);
check("the pips start hidden", init.created["tc-pips#1"].base.visible, false);
check("the pips sit between the cell and the clicker", init.created["tc-pips#1"]["2d"].z, 102);
check("the 3D ring reuses the target mesh already loaded",
	init.created["tc-pips#1"]["3d"].file, "/games/chessbase/res/ring-target.js");

/* -------------------------------------------------------------- display */

// tcChecks is indexed by GIVER: [0] = checks given by White.
function display(tcChecks, kings) {
	const xdv = recorder();
	const board = { tcChecks, kings };
	sandbox.View.Board.xdDisplay.call(board, xdv, viewGame);
	return xdv.updated;
}

const KINGS = { "1": 4, "-1": 60 };

let out = display([0, 0], KINGS);
check("the base xdDisplay still runs", baseDisplay, 1);
check("nothing shown at 0-0", [out["tc-pips#1"].base.visible, out["tc-pips#-1"].base.visible], [false, false]);

// White has GIVEN two checks: the pips belong on the BLACK king, not White's.
out = display([2, 0], KINGS);
check("the receiving king carries the pips",
	[out["tc-pips#-1"].base.visible, out["tc-pips#1"].base.visible], [true, false]);
check("the pips land on the black king's square", out["tc-pips#-1"]["2d"].x, 60);
check("two checks received reads cb-tc-2", out["tc-pips#-1"]["2d"].classes, "cb-tc-pips cb-tc-2");

// ...and the mirror case, which a crossed index would pass just as happily
// unless both are checked.
out = display([0, 1], KINGS);
check("black's check lands on the white king",
	[out["tc-pips#1"].base.visible, out["tc-pips#-1"].base.visible], [true, false]);
check("the pips land on the white king's square", out["tc-pips#1"]["2d"].x, 4);
check("one check received reads cb-tc-1", out["tc-pips#1"]["2d"].classes, "cb-tc-pips cb-tc-1");

check("every 2D skin gets the classes, the 3D one gets a colour instead",
	[out["tc-pips#1"]["skin2dwood"].classes, out["tc-pips#1"]["3d"].classes,
		out["tc-pips#1"]["3d"].materials.ring.color], ["cb-tc-pips cb-tc-1", undefined, 0xe8a33d]);

// The third check ends the game, but the board is still displayed once with
// the final count on it: it must not index past the colour table.
out = display([0, 3], KINGS);
check("a third check clamps rather than falling off the table",
	[out["tc-pips#1"]["2d"].classes, out["tc-pips#1"]["3d"].materials.ring.color],
	["cb-tc-pips cb-tc-2", 0xd0342c]);

// A kingless side is not reachable in three-check, but xdDisplay runs on every
// refresh and must not throw if it ever is.
out = display([2, 0], { "1": 4 });
check("a missing king hides its pips instead of throwing", out["tc-pips#-1"].base.visible, false);

// A board with no counters at all - e.g. a view momentarily holding a board
// built by something other than the three-check model.
out = display(undefined, KINGS);
check("no counters means nothing shown",
	[out["tc-pips#1"].base.visible, out["tc-pips#-1"].base.visible], [false, false]);

/* ------------------------------------------------------------ stylesheet */

const css = fs.readFileSync(path.join(CHESSBASE, "threecheck.css"), "utf8");
check("the stylesheet defines the base class", /\.cb-tc-pips\s*\{/.test(css), true);
check("the stylesheet defines every count the view can emit",
	[1, 2].filter((n) => !new RegExp("\\.cb-tc-" + n + "\\s*\\{").test(css)), []);

// the colours are declared twice - once as a THREE colour, once in CSS - and
// nothing but this stops them drifting apart
const viewSrc = fs.readFileSync(path.join(CHESSBASE, "standard", "threecheck-view.js"), "utf8");
["e8a33d", "d0342c"].forEach((hex) => {
	check("colour #" + hex + " is used by both the view and the stylesheet",
		[new RegExp("0x" + hex).test(viewSrc), new RegExp("#" + hex, "i").test(css)], [true, true]);
});

/* --------------------------------------------------------------- manifest */

const manifest = require(path.join(CHESSBASE, "index.js")).games
	.find((g) => g.name == "three-check-chess");
check("the game ships the overlay script",
	manifest.config.view.js.indexOf("standard/threecheck-view.js") >= 0, true);
check("the game ships the stylesheet", manifest.config.view.css, ["chessbase.css", "threecheck.css"]);
check("viewScripts and the view's js agree", manifest.viewScripts, manifest.config.view.js);

console.log("\nthree-check view: " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
