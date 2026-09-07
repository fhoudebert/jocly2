/*
 * Every game's scripts, model and view, concatenated and evaluated the way the
 * browser gets them.
 *
 *   node tests/core/model-bundles.test.js
 *
 * The suites elsewhere load a game's scripts one file at a time, which is not
 * how a game reaches a player: the gulpfile concatenates them into a single
 * <game>-model.js behind a header that creates Model, and the browser
 * evaluates that. A file is therefore not independent of the file before it,
 * and the seam between two of them is not covered by anything that loads them
 * separately.
 *
 * It bit exactly once, and silently. checkers/draughts-model.js ended with
 *
 *     Model.Game.BuildGraphCoord = function() { ... }
 *
 * and no semicolon. Automatic semicolon insertion does not apply when the next
 * token is "(", so appending any file wrapped in the "(function(){...})()"
 * this codebase uses everywhere made the parser read it as the ARGUMENT of a
 * call to the function just assigned. BuildGraphCoord ran at load time with
 * `this` undefined and the game died on "this.mOptions.width" before it
 * existed - with a stack pointing into a concatenated file whose line numbers
 * match no source. Nothing showed it until a third script was added after that
 * one, because until then it was last.
 *
 * It then bit a second time, in the view bundle, for the same reason and with
 * the same shape of stack - "this.mViewOptions.fullPath" this time. Eleven
 * files in the checkers module alone end with a top-level assignment closed by
 * a bare "}", so the hazard is not one file's mistake but a property of every
 * list an appended script joins.
 *
 * So each bundle is built here as gulp builds it and evaluated, then the game
 * is constructed the way jocly.core.js constructs it - class assembled by
 * Object.assign over JocGame.prototype, then Init() with the manifest's own
 * gameOptions. Anything that throws while a script is merely being read, or
 * while the first board is being laid out, fails here. The view bundle is only
 * evaluated: building a view needs a browser, but a load-time explosion is
 * exactly what evaluation catches.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const GAMES = path.join(ROOT, "src", "games");

const t = require(path.join(ROOT, "tests", "fairy", "harness.js")).runner();

// verbatim from the gulpfile
const HEADERS = {
	model: `exports.model = Model = {
    Game: {},
    Board: {},
    Move: {}
};
`,
	view: `exports.view = View = {
    Game: {},
    Board: {},
    Move: {}
};
`,
};

function bundle(moduleDir, which, scripts) {
	return HEADERS[which] + scripts
		.map((script) => fs.readFileSync(path.join(moduleDir, script), "utf8"))
		.join("\n");
}

function build(moduleDir, entry) {
	const sandbox = {
		console, Math, JSON, Object, Array, Date, RegExp, String, Number, Boolean, Error,
		Int32Array, Int16Array, Int8Array, Uint8Array, Uint16Array, Uint32Array, Float32Array, Float64Array,
		setTimeout, clearTimeout,
		exports: {}, module: {},
	};
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	["jocly.util.js", "jocly.game.js"].forEach((file) => {
		vm.runInContext(fs.readFileSync(path.join(ROOT, "src", "core", file), "utf8"),
			sandbox, { filename: file });
	});
	// the step that matters: one file, as the browser sees it
	vm.runInContext(bundle(moduleDir, "model", entry.modelScripts), sandbox,
		{ filename: entry.name + "-model.js" });

	const model = sandbox.exports.model;
	const JocGame = sandbox.JocGame;
	const config = JSON.parse(JSON.stringify(entry.config));   // as gulp writes it

	const Game = function() { this.g = {}; };
	Object.assign(Game.prototype, JocGame.prototype, model.Game);
	const Board = function() { };
	Object.assign(Board.prototype, model.Board);
	Game.prototype.mBoardClass = Board;
	const Move = function(args) { this.Init(args); };
	Object.assign(Move.prototype, model.Move);
	Game.prototype.mMoveClass = Move;
	Game.prototype.config = config;

	const game = new Game();
	game.Init({ game: config.model.gameOptions, view: config.view });
	return game;
}

// Modules whose model scripts are pure JavaScript with no browser globals.
// Others are not excluded on principle, only untested here.
const MODULES = ["checkers"];

let checked = 0;
MODULES.forEach((moduleName) => {
	const moduleDir = path.join(GAMES, moduleName);
	const games = require(path.join(moduleDir, "index.js")).games;
	t.check(moduleName + ": the module lists games", games.length > 0, true);
	games.forEach((entry) => {
		let game = null, error = null;
		try {
			game = build(moduleDir, entry);
		} catch(e) {
			error = e.message;
		}
		t.check(entry.name + ": its model bundle loads and builds a board", error, null);

		// The view bundle is only read, not driven: nothing here can render.
		// A file that merely runs on being read is what this catches.
		const viewScripts = (entry.config.view && entry.config.view.js) || entry.viewScripts;
		if(viewScripts) {
			let viewError = null;
			try {
				const sandbox = {
					console, Math, JSON, Object, Array, Date, RegExp, String, Number, Boolean, Error,
					setTimeout, clearTimeout,
					$: function() { return { on: function() { } }; },
					exports: {}, module: {},
				};
				sandbox.$.extend = Object.assign;
				sandbox.global = sandbox;
				sandbox.window = sandbox;
				sandbox.document = { createElement: function() { return {}; } };
				vm.createContext(sandbox);
				vm.runInContext(bundle(moduleDir, "view", viewScripts), sandbox,
					{ filename: entry.name + "-view.js" });
			} catch(e) {
				viewError = e.message;
			}
			t.check(entry.name + ": its view bundle loads", viewError, null);
		}

		if(!game) return;
		checked++;
		// A board that generates no move at all from the opening position is
		// not a load error, but it is not a playable game either - and it is
		// what a half-initialised model looks like.
		try {
			game.mBoard.GenerateMoves(game);
			t.check(entry.name + ": the opening position has moves",
				game.mBoard.mMoves.length > 0, true);
		} catch(e) {
			t.check(entry.name + ": the opening position has moves", e.message, null);
		}
	});
});

t.check("something was actually checked", checked > 0, true);

t.done("model bundles");
