/*
 * Minimal pure-Node harness to exercise a chessbase model without building
 * the library or starting a match: it loads the model scripts in a sandbox
 * providing the few globals they use (Model, JocGame), then instantiates a
 * game and a board directly.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = path.join(__dirname, "..", "..", "src");

function loadModel(scripts) {
	const sandbox = {
		console: console,
		Math: Math,
		Int32Array: Int32Array,
		Int16Array: Int16Array,
		Uint8Array: Uint8Array,
		Object: Object,
		Array: Array,
		JSON: JSON,
		Model: { Game: {}, Board: {}, Move: {} },
		exports: {},
		module: {},
		setTimeout: setTimeout,
	};
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);

	// JocGame provides LetsTwist() and Zobrist(), used by the base model;
	// jocly.util.js provides the MersenneTwister they rely on
	["jocly.util.js", "jocly.game.js"].forEach((file) => {
		const code = fs.readFileSync(path.join(SRC, "core", file), "utf8");
		vm.runInContext(code, sandbox, { filename: file });
	});

	scripts.forEach((script) => {
		const code = fs.readFileSync(path.join(SRC, "games", "chessbase", script), "utf8");
		vm.runInContext(code, sandbox, { filename: script });
	});

	return sandbox;
}

function newGame(sandbox) {
	const Model = sandbox.Model;
	const game = Object.create(Model.Game);
	game.g = {};
	game.InitGame();
	return game;
}

function newBoard(sandbox, game) {
	const board = Object.create(sandbox.Model.Board);
	board.Init && board.Init(game);
	board.InitialPosition(game);
	return board;
}

// build a board from a sparse description: { "e4": "wK", ... }
function setup(sandbox, game, pieces, who) {
	const Model = sandbox.Model;
	const list = [];
	const types = game.cbVar.pieceTypes;
	for(const square in pieces) {
		const spec = pieces[square];
		const side = spec[0] == "w" ? 1 : -1;
		const abbrev = spec.slice(1);
		let type = null;
		for(const t in types)
			if(types[t].fenAbbrev == abbrev)
				type = parseInt(t);
		if(type === null)
			throw new Error("unknown piece " + spec);
		list.push({ s: side, t: type, p: posOf(square), m: true });
	}
	game.mInitial = { pieces: list, turn: who === undefined ? 1 : who };
	const board = newBoard(sandbox, game);
	delete game.mInitial;
	return board;
}

function posOf(square) {
	return (parseInt(square[1]) - 1) * 8 + (square.charCodeAt(0) - 97);
}

function nameOf(pos) {
	return String.fromCharCode(97 + (pos & 7)) + ((pos >> 3) + 1);
}

// readable form of a generated move, e.g. "Wd4-d6xc4,e5"
function moveStr(board, move) {
	if(move.suicide)
		return (move.a || "") + nameOf(move.f) + "(suicide)";
	let str = (move.a || "") + nameOf(move.f) + "-" + nameOf(move.t);
	const victims = [];
	if(move.c != null)
		victims.push(nameOf(board.pieces[move.c].p));
	if(move.kills)
		move.kills.forEach((k) => victims.push(nameOf(board.pieces[k].p)));
	if(victims.length)
		str += "x" + victims.sort().join(",");
	return str;
}

function moveStrings(board, game) {
	board.GenerateMoves(game);
	return board.mMoves.map((m) => moveStr(board, m));
}

// pieces on the board, as a sorted "wK@e4" list
function census(board, game) {
	return board.pieces
		.filter((p) => p.p >= 0)
		.map((p) => (p.s > 0 ? "w" : "b") + game.cbVar.pieceTypes[p.t].fenAbbrev + "@" + nameOf(p.p))
		.sort();
}

module.exports = { loadModel, newGame, newBoard, setup, posOf, nameOf, moveStr, moveStrings, census };
