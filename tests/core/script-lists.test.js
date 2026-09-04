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

const games = require(path.join(ROOT, "src", "games", "chessbase", "index.js")).games;

console.log("\nscript lists across " + games.length + " games");

/* ================= the prelude needs both halves ================= */

/*
 * prelude-model.js turns the opening into a choice; prelude-view.js is what
 * puts the buttons on screen. One without the other is not a degraded game,
 * it is an unplayable one, so they are required together rather than merely
 * recommended.
 */
const withPreludeModel = games.filter((g) =>
	(g.modelScripts || []).some((s) => /(^|\/)prelude-model\.js$/.test(s)));
const withPreludeView = games.filter((g) =>
	(g.viewScripts || []).some((s) => /(^|\/)prelude-view\.js$/.test(s)));

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
		if(!fs.existsSync(path.join(ROOT, "src", "games", "chessbase", script)))
			missing.push(game.name + ": " + script);
	});
});
t.check("every script a game names exists", missing, []);

t.done("script lists");
