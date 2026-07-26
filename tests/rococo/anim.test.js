/*
 * Capture-animation tests - pure Node:
 *   node tests/rococo/anim.test.js
 *
 * ultima/baroque-capture-view.js extends the base view animation so that the
 * move kinds specific to the Ultima family are shown, instead of the affected
 * pieces simply blinking out when the board is redisplayed after the move.
 *
 * How the animation looks can only be judged in a browser. What is checked
 * here is the part that would otherwise leave a move visually stuck or a piece
 * lingering: which pieces are animated, whether the base animation is used or
 * skipped, and that the completion callback fires exactly once - the view
 * waits on it before handing the turn over.
 *
 * The base animation is replaced by a recorder before the file under test is
 * loaded, so these tests cover the wrapper's own logic and not jocly's
 * geometry, which every other game already exercises.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const h = require("./harness.js");

const CHESSBASE = path.join(__dirname, "..", "..", "src", "games", "chessbase");

let passed = 0, failed = 0;
function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if(a === e) passed++;
	else { failed++; console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a); }
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
["base-view.js", "grid-board-view.js", "ultima/rococo-view.js", "ultima/baroque-choice-view.js"].forEach(run);

// stand in for jocly's own animation, then load the file under test on top
let baseCalls;
sandbox.View.Board.cbAnimate = function(xdv, aGame, aMove, callback) {
	baseCalls.push(aMove);
	callback();
};
run("ultima/baroque-capture-view.js");

// a view-side game reduced to what the wrapper actually asks of it
const viewGame = {
	cbView: {},
	cbMakeDisplaySpecForPiece: (aGame, pos, piece) => ({ sentTo: pos, piece: piece.i }),
};

const modelSb = h.loadModel(["base-model.js", "grid-geo-model.js", "ultima/baroque-core.js", "ultima/rococo-model.js"]);
const game = h.newGame(modelSb);

function animate(pieces, moveStr, who) {
	const board = h.setup(modelSb, game, pieces, who);
	board.GenerateMoves(game);
	const move = board.mMoves.filter((m) => h.moveStr(board, m) === moveStr)[0];
	if(!move)
		throw new Error("no such move: " + moveStr);

	const viewBoard = Object.create(sandbox.View.Board);
	viewBoard.pieces = board.pieces;
	viewBoard.board = board.board;

	const updates = [];
	const xdv = {
		updateGadget(name, spec, speed, callback) {
			updates.push({ name, spec: spec || {} });
			if(typeof callback == "function") callback();
		},
	};
	baseCalls = [];
	let calls = 0;
	viewBoard.cbAnimate(xdv, viewGame, move, () => calls++, 10);

	return {
		calls, updates, baseCalls, move, board,
		gadget: (sq) => "piece#" + board.board[h.posOf(sq)],
		faded: () => updates.filter((u) => u.spec["2d"] && u.spec["2d"].opacity === 0)
			.map((u) => u.name).sort(),
		sentTo: (name) => updates.filter((u) => u.name === name && u.spec.sentTo !== undefined)
			.map((u) => u.spec.sentTo),
	};
}

/* ------------------------------------------------- multi-piece capture */

{
	const r = animate({ a1: "wK", h8: "bK", b4: "wL", c4: "bP", e4: "bP" }, "Lb4-f4xc4,e4", 1);
	check("multi-capture: both extra victims fade",
		r.faded(), [r.gadget("c4"), r.gadget("e4")].sort());
	check("multi-capture: the mover still goes through the base animation",
		r.baseCalls.length, 1);
	check("multi-capture: the callback fires exactly once", r.calls, 1);
}

/* --------------------------------------------------------------- swap */

{
	const r = animate({ a1: "wK", h8: "bK", d4: "wS", d7: "bW" }, "Sd4<>d7", 1);
	check("swap: nothing fades", r.faded(), []);
	check("swap: the partner travels into the square being vacated",
		r.sentTo(r.gadget("d7")), [h.posOf("d4")]);
	check("swap: the mover still goes through the base animation", r.baseCalls.length, 1);
	check("swap: the callback fires exactly once", r.calls, 1);
}

{
	// a Chameleon's swap may capture as well
	const r = animate({ a1: "wK", h8: "bK", d4: "wC", d6: "bS", d3: "bW", d7: "bA" }, "Cd4<>d6xd3,d7", 1);
	check("swap + capture: the victims fade",
		r.faded(), [r.gadget("d3"), r.gadget("d7")].sort());
	check("swap + capture: the partner still travels",
		r.sentTo(r.gadget("d6")), [h.posOf("d4")]);
	check("swap + capture: the callback fires exactly once", r.calls, 1);
}

/* --------------------------------------------------- mutual destruction */

{
	const r = animate({ a1: "wK", h8: "bK", d4: "wS", d5: "bW" }, "Sd4!!d5", 1);
	check("mutual: the Swapper fades once it has arrived",
		r.faded(), [r.gadget("d4")]);
	check("mutual: the enemy is left to the base animation (it is move.c)",
		r.baseCalls.length, 1);
	check("mutual: the Swapper fades after the base animation, not before",
		r.updates[r.updates.length - 1].name, r.gadget("d4"));
	check("mutual: the callback fires exactly once", r.calls, 1);
}

/* ------------------------------------------------------------ suicide */

{
	const r = animate({ a1: "wK", h8: "bK", d4: "wL", d5: "bI" }, "Ld4(suicide)", 1);
	check("suicide: the piece fades", r.faded(), [r.gadget("d4")]);
	check("suicide: it does not travel, so the base animation is skipped",
		r.baseCalls.length, 0);
	check("suicide: it is animated exactly once", r.updates.length, 1);
	check("suicide: the callback fires exactly once", r.calls, 1);
}

/* -------------------------------------- ordinary moves are left untouched */

{
	const r = animate({ a1: "wK", h8: "bK", d4: "wL" }, "Ld4-d6", 1);
	check("plain move: nothing extra is animated", r.updates, []);
	check("plain move: handled entirely by the base animation", r.baseCalls.length, 1);
	check("plain move: the callback fires exactly once", r.calls, 1);
}

{
	const r = animate({ d4: "wK", h8: "bK", d5: "bP" }, "Kd4-d5xd5", 1);
	check("displacement capture: left entirely to the base animation",
		[r.updates.length, r.baseCalls.length, r.calls], [0, 1, 1]);
}

console.log((failed ? "FAILED" : "OK") + " - " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
