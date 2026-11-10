/*
 * Harnais des tests du Jeu de la guerre (src/games/kriegspiel).
 *
 *   rules()        le moteur de regles seul (kriegspiel-rules.js), sans Jocly
 *   ai()           les heuristiques (kriegspiel-ai.js), sans Jocly non plus
 *   loadModel()    le modele Jocly dans un bac a sable, sans build
 *   position()     un etat en phase de jeu a partir de listes de cases
 *   suite()        compteur d'assertions ; done() sort en code 1 a la
 *                  premiere assertion fausse
 *
 * Meme forme que tests/fairy/harness.js, dont il reprend le chargement.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = path.join(__dirname, "..", "..", "src");
const GAME = path.join(SRC, "games", "kriegspiel");

function rules() { return require(path.join(GAME, "kriegspiel-rules.js")); }

function ai() {
	// kriegspiel-ai.js attend KriegspielRules comme globale (concatenation Jocly)
	global.KriegspielRules = rules();
	return require(path.join(GAME, "kriegspiel-ai.js"));
}

function manifest() { return require(path.join(GAME, "index.js")).games[0]; }

function loadModel() {
	const sandbox = {
		console, Math, JSON, Object, Array, Date, String, Number,
		Int32Array, Int16Array, Int8Array, Uint8Array, Float64Array,
		setTimeout,
		Model: { Game: {}, Board: {}, Move: {} },
		exports: {}, module: {},
	};
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	["jocly.util.js", "jocly.game.js"].forEach((file) => {
		vm.runInContext(fs.readFileSync(path.join(SRC, "core", file), "utf8"), sandbox, { filename: file });
	});
	manifest().modelScripts.forEach((script) => {
		vm.runInContext(fs.readFileSync(path.join(GAME, script), "utf8"), sandbox, { filename: script });
	});
	return sandbox;
}

/*
 * Une partie minimale autour du modele : ce que JocGame fait d'un coup
 * (validation, application, alternance du trait, evaluation), sans la vue.
 */
function newGame(sandbox, options) {
	const config = manifest().config.model;
	const game = Object.create(sandbox.Model.Game);
	game.g = {};
	game.mOptions = Object.assign(JSON.parse(JSON.stringify(config.gameOptions)), options || {});
	game.mOptions.preventRepeat = false;
	game.mPlayedMoves = [];
	game.mVisitedBoards = {};
	game.Random = (roof) => Math.floor(Math.random() * roof);
	game.GetRepeatOccurence = () => 0;
	function Move(args) { this.Init(args); }
	Move.prototype = Object.create(sandbox.Model.Move);
	function Board() {}
	Board.prototype = Object.create(sandbox.Model.Board);
	game.GetMoveClass = () => Move;
	game.GetBoardClass = () => Board;
	game.CreateMove = (args) => new Move(args);
	game.InitGame();
	const board = new Board();
	board.mWho = 1;
	board.mMoves = [];
	board.mFinished = false;
	board.mWinner = 0;
	board.InitialPosition(game);
	game.mBoard = board;
	game.play = function (move) {
		if(!board.IsValidMove(game, move))
			throw new Error("invalid move " + JSON.stringify(move));
		board.ApplyMove(game, move);
		board.mWho = -board.mWho;
		board.mMoves = [];
		board.mFinished = false;
		board.Evaluate(game, false, true);
		return board.mFinished;
	};
	return game;
}

/*
 * position(R, { N: { I: "H4 H5", C: "G8" }, S: { I: "H3" }, ars: [1,1,1,1],
 *               retreat: "H3", turn: 12 })
 */
function position(R, spec) {
	const st = R.newState();
	st.phase = 2;
	[["N", 1], ["S", -1]].forEach(([key, side]) => {
		const units = spec[key] || {};
		Object.keys(units).forEach((code) => {
			const type = R.TYPE_OF_CODE[code];
			if(!type)
				throw new Error("bad unit " + code);
			units[code].split(/\s+/).filter(Boolean).forEach((name) => {
				const pos = R.posOf(name);
				if(st.grid[pos] !== 0)
					throw new Error("two units on " + name);
				st.grid[pos] = side * type;
			});
		});
	});
	if(spec.ars) st.ars = spec.ars.slice();
	if(spec.retreat) st.retreat = R.posOf(spec.retreat);
	if(spec.turn !== undefined) st.turn = spec.turn;
	return st;
}

function suite(name) {
	let passed = 0, failed = 0;
	const api = {
		ok(cond, label) {
			if(cond) passed++;
			else { failed++; console.log("  FAIL  " + label); }
		},
		eq(got, want, label) {
			const a = JSON.stringify(got), b = JSON.stringify(want);
			if(a === b) passed++;
			else { failed++; console.log("  FAIL  " + label + " : got " + a + ", want " + b); }
		},
		section(title) { console.log("- " + title); },
		done() {
			console.log(name + ": " + passed + " passed, " + failed + " failed");
			process.exit(failed ? 1 : 0);
		},
	};
	return api;
}

module.exports = { rules, ai, manifest, loadModel, newGame, position, suite, GAME };
