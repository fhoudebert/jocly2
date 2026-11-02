/*
 * The promotion popup of the baroque family fits the board - pure Node:
 *   node tests/baroque/promo.test.js
 *
 * A Cannon Pawn may promote to any captured piece of its side but a King, or
 * stay a Pawn, so late in a game the popup offers one entry per type but the
 * King, plus the cancel button. At the default cell of base-view.js (2000,
 * sized for orthodox chess's four choices) that row was 14000-16000 wide
 * against the 12000 of the board: in a Rococo ending the first piece and the
 * cancel button were cut off on both sides.
 *
 * Each game is set up in exactly that ending - a lone King and one Cannon
 * Pawn a step from the far rank, every other piece of its side captured - and
 * the choices the MODEL offers are fed to the REAL cbShowPromo of base-view.js,
 * with the cell the game's own view sets. What is checked is what the player
 * sees: every sprite and the cancel button inside the board, none overlapping.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const h = require("./rococo/harness.js");

const CHESSBASE = path.join(__dirname, "..", "..", "src", "games", "chessbase");
const FIELD = 12000;						// JOCLY_FIELD_SIZE
const CANCEL = 800;							// the cancel button, cbCreatePromo

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

function loadView(scripts) {
	const sandbox = { console, Math, Object, Array, JSON, $: { extend }, View: { Game: {}, Board: {}, Move: {} } };
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	scripts.forEach((script) => vm.runInContext(fs.readFileSync(path.join(CHESSBASE, script), "utf8"),
		sandbox, { filename: script }));
	return sandbox;
}

// the far-rank promotion of a lone Pawn, as the model generates it
function endingChoices(game, width, from, to) {
	const at = (s) => h.bpos(s, width);
	const board = h.setup(modelSb[game.__name], game, { a1: "wK", [from]: "wP", j1: "bK" }, 1, at);
	board.GenerateMoves(game);
	return board.mMoves.filter((m) => m.f === at(from) && m.t === at(to));
}

const modelSb = {};

[
	{ name: "rococo", width: 10, from: "e8", to: "e9", promotes: true },
	{ name: "rocaille", width: 12, from: "e8", to: "e9", promotes: true },
	{ name: "ultima", width: 8, promotes: false },
].forEach((G) => {
	const model = G.name === "ultima" ? ["baroque/ultima-model.js"]
		: ["baroque/baroque-core.js", "baroque/" + G.name + "-model.js"];
	const msb = h.loadModel(["base-model.js", "grid-geo-model.js"].concat(model));
	modelSb[G.name] = msb;
	const game = h.newGame(msb);
	game.__name = G.name;
	game.mPlayedMoves = [];

	const vsb = loadView(["base-view.js", "grid-board-view.js", "fairy-set-view.js",
		"baroque/baroque-view.js", "baroque/" + G.name + "-view.js"]);
	const view = vsb.View.Game;
	view.mViewOptions = { fullPath: "" };
	const def = view.cbDefineView();

	// the worst case is every type but the King: the promotions, plus staying
	const types = Object.keys(game.cbVar.pieceTypes).filter((t) => game.cbVar.pieceTypes[t].name !== "king");
	let moves = types.map((t) => ({ pr: +t }));

	if(G.promotes) {
		const real = endingChoices(game, G.width, G.from, G.to);
		check(G.name + ": the lone Pawn is offered every type but the King",
			real.map((m) => m.pr).sort(), types.map(Number).sort());
		moves = real;
	}

	// every popup size up to that worst case: with fewer pieces captured the
	// popup stays a single row longer, which is where it used to overflow
	// (six choices: seven cells of 2000)
	for(let n = 2; n <= moves.length; n++) {
		const offered = moves.slice(0, n);
		const gadgets = {};
		const xdv = { updateGadget: (name, spec) => { gadgets[name] = Object.assign(gadgets[name] || {}, spec.base); } };
		const aGame = Object.create(view);
		aGame.cbVar = game.cbVar;
		aGame.cbView = def;
		aGame.cbShowPromo(xdv, aGame, offered, 1);

		const label = G.name + ", " + n + " choices: ";
		const entries = offered.map((m) => gadgets["promo#" + m.pr]);
		const cancel = Object.assign({ width: CANCEL, height: CANCEL }, gadgets["promo-cancel"]);
		const all = entries.concat([cancel]);
		const half = FIELD / 2;
		check(label + "all shown", all.every((e) => e && e.visible), true);
		check(label + "the popup is no wider than the board", gadgets["promo-board"].width <= FIELD, true);
		check(label + "every piece and the cancel button inside the board",
			all.filter((e) => Math.abs(e.x) + e.width / 2 > half).length, 0);
		check(label + "nothing overlaps", all.every((e, i) => all.every((o, j) => i === j
			|| Math.abs(e.x - o.x) >= (e.width + o.width) / 2
			|| Math.abs(e.y - o.y) >= (e.height + o.height) / 2)), true);
	}
});

console.log((failed ? "FAILED - " : "OK - ") + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
