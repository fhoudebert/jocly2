/*
 * Harnais des tests de Péan (src/games/pean).
 *
 *   rules()          le moteur de regles seul (pean-rules.js), sans Jocly
 *   ai()             les heuristiques (pean-ai.js), sans Jocly non plus
 *   scenario(name)   un scenario de src/games/pean/scenarios/
 *   context(sc)      le contexte compile d'un scenario
 *   loadModel()      le modele Jocly dans un bac a sable, sans build (le jeu « pean »)
 *   newGame(sb, id)  une partie minimale autour du modele, bataille `id` choisie au prelude
 *   mini()           un petit scenario d'essai, modifiable
 *   suite()          compteur d'assertions ; done() sort en code 1 en cas d'echec
 *
 * Meme forme que tests/kriegspiel/harness.js.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = path.join(__dirname, "..", "..", "src");
const GAME = path.join(SRC, "games", "pean");

function rules() { return require(path.join(GAME, "pean-rules.js")); }

function ai() {
	// pean-ai.js attend PeanRules comme globale (concatenation Jocly)
	global.PeanRules = rules();
	return require(path.join(GAME, "pean-ai.js"));
}

function scenario(name) {
	return JSON.parse(fs.readFileSync(path.join(GAME, "scenarios", name + ".json"), "utf8"));
}

function context(sc) { return rules().makeContext({ scenario: sc }); }

function manifest() { return require(path.join(GAME, "index.js")).games; }

function gameConfig(name) {
	const g = manifest().find((x) => x.name === name);
	if(!g) throw new Error("no game " + name);
	return g;
}

function loadModel(name) {
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
	gameConfig("pean").modelScripts.forEach((script) => {
		vm.runInContext(fs.readFileSync(path.join(GAME, script), "utf8"), sandbox, { filename: script });
	});
	return sandbox;
}

/*
 * Une partie minimale autour du modele : ce que JocGame fait d'un coup
 * (validation, application, alternance du trait, evaluation), sans la vue.
 * `scenario` (« leuctres-371 »...) : la bataille est choisie par le prelude,
 * comme le ferait un joueur (« #k » puis « -- ») ; absent, la partie reste au
 * prelude.
 */
function newGame(sandbox, scenarioId, options) {
	const config = gameConfig("pean").config.model;
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
	if(scenarioId) {
		const k = game.mOptions.scenarios.findIndex((sc) => sc.id === scenarioId);
		if(k < 0) throw new Error("no scenario " + scenarioId);
		game.play({ setup: k });
		game.play({ skip: 1 });
	}
	return game;
}

/*
 * Un petit scenario d'essai : 12 x 10 hexagones de plaine, une unite par
 * camp au depart. `patch` complete ou remplace des cles.
 */
function mini(patch) {
	const sc = {
		id: "essai",
		carte: { cols: 12, rows: 10 },
		camps: {
			A: { bord: "sud", unites: [{ type: "hoplite", hex: "2,8" }] },
			B: { bord: "nord", unites: [{ type: "hoplite", hex: "9,1" }] }
		},
		tours: 10, options: []
	};
	return Object.assign(sc, patch || {});
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
		throws(fn, label) {
			try { fn(); failed++; console.log("  FAIL  " + label + " : no error"); }
			catch(e) { passed++; }
		},
		section(title) { console.log("- " + title); },
		done() {
			console.log(name + ": " + passed + " passed, " + failed + " failed");
			process.exit(failed ? 1 : 0);
		},
	};
	return api;
}

module.exports = { rules, ai, scenario, context, manifest, gameConfig, loadModel, newGame, mini, suite, GAME };
