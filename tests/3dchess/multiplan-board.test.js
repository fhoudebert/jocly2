/*
 * The multi-level boards, painted flat.
 *
 *   node tests/3dchess/multiplan-board.test.js
 *
 * 3D Chess, Raumschach and Space Spartan stack several boards, and in 2D the
 * three of them are painted side by side into ONE canvas: coordsFn() places
 * each cell, and the floor it belongs to decides which of the boardFloor2dPos
 * offsets is added. The floor is not passed - it is read back out of the
 * position, f = pos / (NBCOLS*NBROWS) - so a position built without its floor
 * term silently means "floor 0".
 *
 * That is what happened when the board was viewed from Black's side: the
 * bottom board was painted three times over and the two above it were never
 * painted at all, which looked like them losing their checkering. Nothing to
 * do with the 3D floor opacity, which is what the symptom suggests; in 3D the
 * floor only sets z, and the same code was right there.
 *
 * The view scripts want a browser, so this loads them into a sandbox with
 * enough of one to run the painting, and records where the cells land.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = path.join(__dirname, "..", "..", "src");
const H = require("../fairy/harness.js");
const t = H.runner();

// jQuery.extend is all the view files need of jQuery
function extend() {
	var args = Array.prototype.slice.call(arguments);
	var deep = (typeof args[0] === "boolean") ? args.shift() : false;
	var target = args.shift();
	function merge(dst, src) {
		for(var key in src) {
			if(deep && src[key] && typeof src[key] === "object" && !Array.isArray(src[key]))
				dst[key] = merge((dst[key] && typeof dst[key] === "object") ? dst[key] : {}, src[key]);
			else
				dst[key] = src[key];
		}
		return dst;
	}
	args.forEach(function(source) { if(source) merge(target, source); });
	return target;
}

function loadView(scripts) {
	const sandbox = {
		console, Math, JSON, Object, Array, setTimeout,
		View: { Game: {}, Board: {}, Move: {} },
		Model: { Game: {}, Board: {}, Move: {} },
		THREE: {}, $: { extend: extend }, exports: {}, module: {},
	};
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	scripts.forEach((script) =>
		vm.runInContext(fs.readFileSync(path.join(SRC, "games", "chessbase", script), "utf8"),
			sandbox, { filename: script }));
	return sandbox;
}

const sandbox = loadView(["base-view.js", "multiplan-board-view.js"]);
const View = sandbox.View.Game;

// the flat spec of 3d/3dchess-view.js, and its 8x6 checkering
const spec = extend(true, {}, View.cbMultiplanBoardClassic2DNoMargin, {
	notationMode: "in",
	boardFloorFrames: [false, false, false],
	margins: { x: .3, y: .3 },
	boardFloorMargins: [{ x: .3, y: .3 }, { x: .3, y: .3 }, { x: .3, y: .3 }],
	boardFloor2dPos: [{ x: -4000, y: 3300 }, { x: 0, y: 0 }, { x: 4000, y: -3300 }],
	boardFloorSize: 4100,
});

const layer = [".#.#.#", "#.#.#.", ".#.#.#", "#.#.#.", ".#.#.#", "#.#.#.", ".#.#.#", "#.#.#."];
const game = Object.create(View);
game.cbView = { boardLayout: [layer, layer, layer] };
game.mNotation = false;
game.mViewAs = 1;

// where the cells of each floor are painted, and in what colour
function painted(viewAs) {
	game.mViewAs = viewAs;
	const floors = [];
	for(let floor = 0; floor < 3; floor++) {
		const cells = [];
		const ctx = {
			strokeStyle: "", lineWidth: 0, fillStyle: "",
			fillRect: function(x, y, w, h) {
				cells.push({ x: x + w / 2, y: y + h / 2, fill: this.fillStyle });
			},
			rect: function() {},
		};
		spec.paintCells.call(game, spec, ctx, {}, floor, "diffuse",
			spec.boardFloor2dPos[floor].x, spec.boardFloor2dPos[floor].y);
		const xs = cells.map((c) => c.x), ys = cells.map((c) => c.y);
		floors.push({
			cells: cells.length,
			centre: [Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
				Math.round((Math.min(...ys) + Math.max(...ys)) / 2)],
			colours: [...new Set(cells.map((c) => c.fill))].sort(),
		});
	}
	return floors;
}

const home = spec.boardFloor2dPos.map((p) => [p.x, p.y]);

console.log("\nviewed from White's side");

(() => {
	const floors = painted(1);
	t.check("every cell of every floor is painted",
		floors.map((f) => f.cells), [48, 48, 48]);
	t.check("each floor on its own square of the canvas",
		floors.map((f) => f.centre), home);
})();

console.log("\nviewed from Black's side");

(() => {
	const floors = painted(-1);
	t.check("still every cell", floors.map((f) => f.cells), [48, 48, 48]);
	// the one that was wrong: all three floors used to come out at
	// boardFloor2dPos[0], so the two upper boards were left unpainted
	t.check("and still each floor on its own square",
		floors.map((f) => f.centre), home);
	t.check("no floor lands on another",
		new Set(floors.map((f) => f.centre.join(","))).size, 3);
})();

console.log("\nthe checkering itself");

(() => {
	const white = painted(1), black = painted(-1);
	const fills = spec.colorFill;
	t.check("two colours on each floor, whichever side it is viewed from",
		white.concat(black).map((f) => f.colours.length), [2, 2, 2, 2, 2, 2]);
	t.check("and they are the board's own",
		white[0].colours, [fills["#"], fills["."]].sort());
})();

t.done("multiplan board");
