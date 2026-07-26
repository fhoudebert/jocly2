/*
 * Board input tests for Ultima - pure Node:
 *   node tests/ultima/input.test.js
 *
 * An immobilized piece may take itself off the board, and that move does not
 * travel: its destination is the square the piece already occupies. A move is
 * entered in two clicks - the piece, then the destination - so that second
 * click lands on the same gadgets as "click the piece again to cancel", which
 * jocly binds last and therefore wins. Left alone, the move is impossible to
 * enter by hand however many of them the model generates.
 *
 * roc-choice-view.js, shared with Rococo, moves the action onto the panel the
 * view already had for choosing a promotion. Checked here: that the action no
 * longer competes with the cancel click, that it offers a way out, and that
 * the panel is put away again - one left open would block the board.
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
["base-view.js", "grid-board-view.js", "ultima/ultima-view.js", "ultima/roc-choice-view.js"].forEach((script) => {
	vm.runInContext(fs.readFileSync(path.join(CHESSBASE, script), "utf8"), sandbox, { filename: script });
});

const modelSb = h.loadModel(["base-model.js", "grid-geo-model.js", "ultima/ultima-model.js"]);
const game = h.newGame(modelSb);

const types = Object.keys(game.cbVar.pieceTypes).map((t) => game.cbVar.pieceTypes[t]);

// pick the piece, then look at what the second click offers
function stages(pieces, square, who) {
	const board = h.setup(modelSb, game, pieces, who);
	board.GenerateMoves(game);

	const viewBoard = Object.create(sandbox.View.Board);
	viewBoard.board = board.board;
	viewBoard.pieces = board.pieces;
	viewBoard.mMoves = board.mMoves;

	const updates = [];
	const xdv = { updateGadget(name, spec) { updates.push({ name, visible: spec && spec.base && spec.base.visible }); } };

	const viewGame = Object.create(sandbox.View.Game);
	viewGame.mViewOptions = { fullPath: "" };
	viewGame.mViewAs = 1;
	viewGame.cbVar = game.cbVar;
	viewGame.g = { pTypes: types };
	viewGame.cbView = viewGame.cbDefineView();

	const spec = viewBoard.xdInput(xdv, viewGame);
	const first = spec.getActions.call(viewBoard, board.mMoves, { f: null, t: null, pr: null });
	const pick = first[h.posOf(square)];
	const second = pick
		? spec.getActions.call(viewBoard, pick.moves, { f: h.posOf(square), t: null, pr: null })
		: {};
	return { board, viewBoard, spec, pick, second, updates, xdv, viewGame,
		reset: () => (updates.length = 0) };
}

/* ------------------------------------------------------------- suicide */

{
	// a Long Leaper frozen by an enemy Immobilizer: its only move is to go
	const s = stages({ a1: "wK", h8: "bK", d4: "wL", d5: "bI" }, "d4", 1);
	check("the frozen piece can be picked up at all", s.pick !== undefined, true);

	const keys = Object.keys(s.second);
	check("it offers exactly one thing to do", keys.length, 1);
	const action = s.second[keys[0]];

	check("the suicide is offered on the panel, not on the board square",
		action.click, ["roc-choice-0"]);
	check("and it carries exactly the one move", action.moves.length, 1);
	check("so it no longer competes with the cancel click",
		JSON.stringify(action.click) === JSON.stringify(s.pick.click), false);
	check("and there is a way out", action.cancel, ["promo-cancel"]);

	s.reset();
	action.pre.call(s.viewBoard);
	check("selecting the piece raises the panel, the cancel button and its picture",
		s.updates.filter((u) => u.visible === true).map((u) => u.name).sort(),
		["promo-board", "promo-cancel", "roc-choice-0"].sort());

	s.reset();
	action.post.call(s.viewBoard);
	check("playing it puts the panel away",
		s.updates.filter((u) => u.visible === false).length > 0, true);
}

/* ------------------------------------------- an ordinary piece is untouched */

{
	// the same Leaper, with the Immobilizer out of reach: normal two-click entry
	const s = stages({ a1: "wK", h8: "bK", d4: "wL", f6: "bI" }, "d4", 1);
	const targets = Object.keys(s.second);
	check("a free piece still enters its moves on the board", targets.length > 1, true);
	check("and none of them goes through the panel",
		targets.every((t) => (s.second[t].click || []).every((c) => String(c).indexOf("roc-choice") < 0)),
		true);
}

console.log((failed ? "FAILED - " : "OK - ") + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
