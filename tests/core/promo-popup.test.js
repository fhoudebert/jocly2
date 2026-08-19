/*
 * The promotion popup, checked without a browser.
 *
 *   node tests/chessbase/promo-popup.test.js
 *
 * The popup was a single row: width cbPromoSize*(n+1), entries cbPromoSize
 * apart. Four choices fit; Makromachy offers sixteen, which at 2000 units
 * apiece comes to 34000 across against the 12000 the board itself gets. Most
 * of the pieces sat outside the view with no way to click them, so a Pawn
 * reaching the last rank could not be promoted to most of what the rules
 * allow.
 *
 * They are now laid out on a grid that fits the board, shrunk only if that
 * still needs more than three rows. The check below drives the real
 * cbShowPromo with a stub gadget layer and reads back the specs it produces:
 * every entry visible, inside the field, none on top of another, and - for
 * the small popups - identical to what the single row used to give, so
 * orthodox chess is untouched.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const H = require("../fairy/harness.js");

const CHESSBASE = path.join(__dirname, "..", "..", "src", "games", "chessbase");
const PROMO_SIZE = 2000, FIELD = 12000;

// lift the two functions out of the view layer, which needs a browser
function lift(names) {
	const src = fs.readFileSync(path.join(CHESSBASE, "base-view.js"), "utf8");
	const ctx = {
		View: { Game: {} }, Math, console,
		$: {  // the one jQuery call they make
			extend: function () {
				const args = [].slice.call(arguments);
				const deep = args[0] === true;
				return Object.assign.apply(null, deep ? args.slice(1) : args);
			}
		},
	};
	vm.createContext(ctx);
	names.forEach((name) => {
		const from = src.indexOf("View.Game." + name);
		let cursor = src.indexOf("{", from), depth = 0, to = cursor;
		for(; to < src.length; to++) {
			if(src[to] === "{") depth++;
			else if(src[to] === "}" && --depth === 0) { to++; break; }
		}
		vm.runInContext(src.slice(from, to), ctx);
	});
	return ctx.View.Game;
}

const view = lift(["cbPromoLayout", "cbShowPromo"]);

// what cbShowPromo needs of a game, and a gadget layer that just records
function stubGame(count) {
	const types = {};
	for(let t = 0; t < count; t++)
		types[t] = { name: "piece" + t, aspect: "aspect" + t };
	return {
		cbPromoSize: PROMO_SIZE,
		cbPromoField: FIELD,
		cbPromoLayout: view.cbPromoLayout,
		cbVar: { pieceTypes: types },
		cbPromoSpec: () => ({ type: "sprite", width: 1200, height: 1200 }),
	};
}

function show(count) {
	const gadgets = {};
	const xdv = {
		updateGadget: (name, spec) => {
			gadgets[name] = Object.assign(gadgets[name] || {}, spec.base);
		}
	};
	const game = stubGame(count);
	const moves = [];
	for(let i = 0; i < count; i++)
		moves.push({ pr: i });
	view.cbShowPromo(xdv, game, moves, 1);
	return gadgets;
}

const t = H.runner();

/* ---------------- the grid ---------------- */

console.log("\nthe grid fits the board");

const layout = (count) => view.cbPromoLayout.call(
	{ cbPromoSize: PROMO_SIZE, cbPromoField: FIELD }, count);

[2, 3, 4, 5, 6, 7, 9, 12, 16, 17, 20, 24].forEach((count) => {
	const grid = layout(count);
	t.ok(count + " choices fit across (" + grid.rows + " x " + grid.perRow
		+ ", cell " + grid.size + ")", grid.perRow * grid.size <= FIELD);
	t.ok(count + " choices have room for every one of them",
		grid.rows * grid.perRow >= count);
});
// three rows at most before the entries are made smaller
t.ok("never more than three rows", [2, 4, 8, 16, 24, 32]
	.every((count) => layout(count).rows <= 3));
// and never smaller than half
t.ok("never smaller than half size", [24, 32, 40]
	.every((count) => layout(count).size >= PROMO_SIZE / 2));

/* ---------------- nothing lost off the edge ---------------- */

console.log("\nevery entry is placed and reachable");

[4, 9, 16, 24].forEach((count) => {
	const gadgets = show(count);
	const entries = [];
	for(let i = 0; i < count; i++)
		entries.push(gadgets["promo#" + i]);

	t.ok(count + ": every entry is shown", entries.every((entry) => entry && entry.visible));

	const grid = layout(count);
	const halfWidth = (grid.perRow + 1) * grid.size / 2;
	const halfHeight = grid.rows * grid.size / 2;
	t.ok(count + ": all of them inside the popup",
		entries.every((entry) => Math.abs(entry.x) <= halfWidth
			&& Math.abs(entry.y) <= halfHeight));
	t.ok(count + ": all of them inside the board's own width",
		entries.every((entry) => Math.abs(entry.x) <= FIELD / 2));

	const seen = {};
	t.ok(count + ": no two entries on the same spot", entries.every((entry) => {
		const key = entry.x + "/" + entry.y;
		if(seen[key])
			return false;
		seen[key] = true;
		return true;
	}));

	// the popup must actually cover what it holds
	t.ok(count + ": the popup is as tall as its rows",
		gadgets["promo-board"].height >= grid.rows * grid.size);
	t.ok(count + ": the cancel button is shown too", gadgets["promo-cancel"].visible);
});

/* ---------------- small popups are untouched ---------------- */

console.log("\northodox chess is laid out exactly as before");

[2, 3, 4, 5, 6].forEach((count) => {
	const gadgets = show(count);
	for(let i = 0; i < count; i++) {
		const entry = gadgets["promo#" + i];
		// the single-row formula the popup used to apply
		t.check(count + " choices, entry " + i + " where it always was",
			[entry.x, entry.y], [(i - count / 2) * PROMO_SIZE, 0]);
	}
	t.check(count + " choices: the same popup width",
		gadgets["promo-board"].width, PROMO_SIZE * (count + 1));
	t.check(count + " choices: the cancel button where it always was",
		[gadgets["promo-cancel"].x, gadgets["promo-cancel"].y],
		[count * PROMO_SIZE / 2, 0]);
	// sprites are left alone unless the grid had to shrink
	t.check(count + " choices: the pieces keep their size",
		[gadgets["promo#0"].width, gadgets["promo#0"].height], [1200, 1200]);
});

/* ---------------- Makromachy, the game that broke it ---------------- */

console.log("\nMakromachy: sixteen choices");

const sandbox = H.loadModel(["base-model.js", "grid-geo-model.js", "fairy-piece-model.js",
	"locust-move-model.js", "locust/makromachy-model.js"]);
const game = H.newGame(sandbox);
const geo = game.cbVar.geometry;
const last = geo.height - 1, to = last * geo.width + 2;
let warrior = null;
for(const type in game.cbVar.pieceTypes)
	if(game.cbVar.pieceTypes[type].name === "warriorw")
		warrior = parseInt(type);
const choices = game.cbVar.promote(game, { t: warrior, s: 1, p: to - geo.width },
	{ t: to, f: to - geo.width, c: null });

t.check("a Warrior really is offered sixteen pieces", choices.length, 16);

const wide = show(choices.length);
const grid = layout(choices.length);
t.check("laid out three rows of six", [grid.rows, grid.perRow], [3, 6]);
t.check("the popup is no wider than the board", grid.perRow * grid.size, FIELD);
t.ok("and the old single row would not have been", PROMO_SIZE * (choices.length + 1) > FIELD);
t.ok("every one of the sixteen is inside the board", (() => {
	for(let i = 0; i < choices.length; i++)
		if(Math.abs(wide["promo#" + i].x) > FIELD / 2)
			return false;
	return true;
})());

t.done("promotion popup");
