/*
 * Board input tests - pure Node:
 *   node tests/rococo/input.test.js
 *
 * A piece removing itself does not travel: the move's destination is the square
 * it already occupies. Since a move is entered in two clicks - the piece, then
 * the destination - that destination lands on the same gadgets as "click the
 * piece again to cancel", which jocly binds last and therefore wins. The move
 * would be impossible to enter by hand.
 *
 * rococo-view.js moves the suicide onto the panel the view already uses for
 * choosing a promotion. What is checked here is that the action no longer
 * competes with the cancel click, that it offers a way out, and that the panel
 * is put away again - a panel left open would block the board.
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
["base-view.js", "grid-board-view.js", "ultima/rococo-view.js"].forEach((script) => {
	vm.runInContext(fs.readFileSync(path.join(CHESSBASE, script), "utf8"), sandbox, { filename: script });
});

const modelSb = h.loadModel(["base-model.js", "grid-geo-model.js", "ultima/rococo-model.js"]);
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

	const leaper = s.board.pieces[s.board.board[h.posOf("d4")]];
	check("the suicide is offered on the panel, not on the board square",
		action.click, ["promo#" + leaper.t]);
	check("and it carries exactly the one move", action.moves.length, 1);
	check("so it no longer competes with the cancel click",
		JSON.stringify(action.click) === JSON.stringify(s.pick.click), false);
	check("and there is a way out", action.cancel, ["promo-cancel"]);

	s.reset();
	action.pre.call(s.viewBoard);
	check("selecting the piece raises the panel, the cancel button and its picture",
		s.updates.filter((u) => u.visible === true).map((u) => u.name).sort(),
		["promo#" + leaper.t, "promo-board", "promo-cancel"].sort());

	s.reset();
	action.post.call(s.viewBoard);
	check("playing it puts the panel away",
		s.updates.filter((u) => u.visible === true), []);
	check("including every piece picture",
		s.updates.filter((u) => u.name.indexOf("promo#") === 0 && u.visible === false).length,
		types.length);

	// going back to picking a piece must clear a panel left on screen
	s.reset();
	s.spec.getActions.call(s.viewBoard, s.board.mMoves, { f: null, t: null, pr: null });
	check("cancelling out of it clears the panel too",
		s.updates.filter((u) => u.visible === false).length > 0, true);
}

/* ------------------------------------------------ mutual destruction */

{
	// a Swapper beside two enemies: trading places is a plain click on the
	// neighbour, while destroying itself with one of them goes on the panel,
	// under that neighbour's picture
	const s = stages({ a1: "wK", h8: "bK", d4: "wS", d5: "bW", e4: "bL" }, "d4", 1);
	const keys = Object.keys(s.second);
	const board = s.board;
	const onPanel = keys.filter((k) => (s.second[k].click || []).some((g) => g.indexOf("promo#") === 0));
	const onBoard = keys.filter((k) => onPanel.indexOf(k) < 0);

	check("both mutual destructions are offered, one per neighbour", onPanel.length, 2);
	check("each is a single move", onPanel.map((k) => s.second[k].moves.length), [1, 1]);
	check("each is offered under the picture of the neighbour it takes along",
		onPanel.map((k) => s.second[k].click[0]).sort(),
		[board.pieces[board.board[h.posOf("d5")]].t, board.pieces[board.board[h.posOf("e4")]].t]
			.map((t) => "promo#" + t).sort());
	check("swapping with a neighbour stays an ordinary click on it",
		onBoard.some((k) => +k === h.posOf("d5")) && onBoard.some((k) => +k === h.posOf("e4")), true);
	check("none of the panel choices lands on the piece's own square",
		onPanel.filter((k) => +k === h.posOf("d4")), []);

	s.reset();
	s.second[onPanel[0]].pre.call(s.viewBoard);
	check("the panel shows one picture per neighbour, plus the cancel button",
		s.updates.filter((u) => u.visible === true).length, 4);
}

/* ------------------------------------- ordinary pieces are left alone */

{
	const s = stages({ a1: "wK", h8: "bK", d4: "wL" }, "d4", 1);
	const keys = Object.keys(s.second);
	check("a free piece keeps its ordinary board destinations", keys.length > 1, true);
	const onPanel = keys.filter((k) => (s.second[k].click || []).some((g) => g.indexOf("promo#") === 0));
	check("none of them is diverted onto the panel", onPanel, []);
}

console.log((failed ? "FAILED" : "OK") + " - " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
