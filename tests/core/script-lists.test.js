/*
 * Script lists in the manifest.
 *
 *   node tests/core/script-lists.test.js
 *
 * Two checks, both written after the same failure: MiniChess 5x5 shipped with
 * prelude-model.js and without prelude-view.js. The model duly asked for the
 * opening choice, the view had nothing that draws it, and the game came up on
 * a board that answered no click. Nothing threw, nothing reached the console -
 * the panel is built by an xdInit override that simply was not there.
 *
 * A game is bundled from `modelScripts` and `viewScripts` (see gulpfile.js,
 * function Scripts), while `config.model.js` and `config.view.js` are the
 * copies shipped inside the -config.js file. Nothing forces the two to agree,
 * and when they drifted the game kept working, which is what made the drift
 * survive: kotaishi-shogi named the plain Shogi piece set in one and its own
 * in the other, kyoto-shogi named mini-shogi-model.js instead of its own.
 */

const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..", "..");
const H = require("../fairy/harness.js");
const t = H.runner();

/*
 * Both families now have a prelude: chessbase's is prelude-model.js /
 * prelude-view.js, mills' is its own pair. The pairing rule is the same, so
 * they are checked together rather than once per module - a third family
 * growing a prelude should only have to add its file names here.
 */
const PRELUDES = [
	{ module: "chessbase", model: "prelude-model.js", view: "prelude-view.js" },
	{ module: "mills", model: "mills-prelude-model.js", view: "mills-prelude-view.js" },
];
const games = [].concat.apply([], PRELUDES.map((p) =>
	require(path.join(ROOT, "src", "games", p.module, "index.js")).games
		.map((g) => Object.assign({ __module: p.module }, g))));

console.log("\nscript lists across " + games.length + " games");

/* ================= the prelude needs both halves ================= */

/*
 * prelude-model.js turns the opening into a choice; prelude-view.js is what
 * puts the buttons on screen. One without the other is not a degraded game,
 * it is an unplayable one, so they are required together rather than merely
 * recommended.
 */
const preludeOf = (name) => PRELUDES.filter((p) => p.module === name)[0];
const withPreludeModel = games.filter((g) =>
	(g.modelScripts || []).some((s) => s.split("/").pop() === preludeOf(g.__module).model));
const withPreludeView = games.filter((g) =>
	(g.viewScripts || []).some((s) => s.split("/").pop() === preludeOf(g.__module).view));

t.check("some game does use the prelude, or these checks prove nothing",
	withPreludeModel.length > 0, true);
t.check("every game with a prelude can draw its buttons",
	withPreludeModel.filter((g) => withPreludeView.indexOf(g) < 0).map((g) => g.name), []);
t.check("and none draws buttons it will never be asked for",
	withPreludeView.filter((g) => withPreludeModel.indexOf(g) < 0).map((g) => g.name), []);

/* ================= the two copies of each list agree ================= */

const drifted = [];
games.forEach((game) => {
	[["model", "modelScripts"], ["view", "viewScripts"]].forEach(([side, field]) => {
		const bundled = (game[field] || []).join(" ");
		const shipped = ((game.config[side] || {}).js || []).join(" ");
		if(bundled !== shipped)
			drifted.push(game.name + " (" + side + ")");
	});
});
t.check("config.model.js and config.view.js match what is bundled", drifted, []);

/* ================= and every named file is there ================= */

const missing = [];
games.forEach((game) => {
	(game.modelScripts || []).concat(game.viewScripts || []).forEach((script) => {
		if(!fs.existsSync(path.join(ROOT, "src", "games", game.__module, script)))
			missing.push(game.name + ": " + script);
	});
});
t.check("every script a game names exists", missing, []);

/* ================= the mills prelude sizes itself from the board ================= */

/*
 * The mills buttons are drawn in the board's own unit - a cell is about one
 * millsSize across, roughly 1333 on a 7x7 - and the first version of that file
 * used the 600-ish numbers the chessbase prelude works in. The panel came out
 * about a fifth of its size, unreadable and awkward to hit. The coupling is
 * one property published by one file and read by the other, so it is worth a
 * line here: broken, the buttons are sized NaN and never appear at all.
 */
const millsView = path.join(ROOT, "src", "games", "mills", "mills-xd-view.js");
const millsPrelude = path.join(ROOT, "src", "games", "mills", "mills-prelude-view.js");
if(fs.existsSync(millsPrelude)) {
	t.check("mills-xd-view.js publishes the board scale",
		/this\.millsSize\s*=/.test(fs.readFileSync(millsView, "utf8")), true);
	t.check("and the prelude sizes its buttons from it",
		/millsSize/.test(fs.readFileSync(millsPrelude, "utf8")), true);
}

t.done("script lists");
