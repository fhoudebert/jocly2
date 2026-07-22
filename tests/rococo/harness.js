/*
 * Pure-Node harness for the Rococo model (10x10 board with an outer edge ring).
 * Loads the model scripts in a sandbox and drives Model.Board directly.
 *
 * Square naming follows the source page: the inner 8x8 playing area is a1..h8
 * (file a = inner column 1, rank 1 = inner row 1). Raw board positions run
 * 0..99 as row*10 + col, so a1 = row 1 col 1 = 11 and h8 = 88. Edge squares
 * can be named with the same scheme using column 0/9 or row 0/9 via posRC.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = path.join(__dirname, "..", "..", "src");
const W = 10;

function loadModel(scripts) {
	const sandbox = {
		console, Math, JSON, Object, Array,
		Int32Array, Int16Array, Uint8Array,
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
	scripts.forEach((script) => {
		vm.runInContext(fs.readFileSync(path.join(SRC, "games", "chessbase", script), "utf8"), sandbox, { filename: script });
	});
	return sandbox;
}

function newGame(sandbox) {
	const game = Object.create(sandbox.Model.Game);
	game.g = {};
	game.InitGame();
	return game;
}

function newBoard(sandbox, game) {
	const board = Object.create(sandbox.Model.Board);
	board.Init && board.Init(game);
	board.InitialPosition(game);
	board.__game = game;
	return board;
}

function posRC(row, col) { return row * W + col; }

// "d1" -> row 1, col 4 ; letters a.. map to inner columns 1..
function posOf(square) {
	return parseInt(square[1] === "0" || /\d\d/.test(square.slice(1)) ? square.slice(1) : square[1]) * W
		+ (square.charCodeAt(0) - 96);
}

function nameOf(pos) {
	const r = Math.floor(pos / W), c = pos % W;
	if(c >= 1 && c <= 8 && r >= 1 && r <= 8)
		return String.fromCharCode(96 + c) + r;
	return "@" + c + "," + r;					// edge square
}

function setup(sandbox, game, pieces, who) {
	const types = game.cbVar.pieceTypes;
	const list = [];
	for(const square in pieces) {
		const spec = pieces[square];
		const side = spec[0] === "w" ? 1 : -1;
		const abbrev = spec.slice(1);
		let type = null;
		for(const t in types)
			if(types[t].fenAbbrev === abbrev)
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

function moveStr(board, move) {
	if(move.suicide)
		return (move.a || "") + nameOf(move.f) + "(suicide)";
	if(move.swap != null)
		return (move.a || "") + nameOf(move.f) + "<>" + nameOf(board.pieces[move.swap].p);
	if(move.mutual)
		return (move.a || "") + nameOf(move.f) + "!!" + nameOf(board.pieces[move.c].p);
	let str = (move.a || "") + nameOf(move.f) + "-" + nameOf(move.t);
	const victims = [];
	if(move.c != null)
		victims.push(nameOf(board.pieces[move.c].p));
	if(move.kills)
		move.kills.forEach((k) => victims.push(nameOf(board.pieces[k].p)));
	if(victims.length)
		str += "x" + victims.sort().join(",");
	if(move.pr != null)
		str += "=" + game_fenAbbrev(board, move.pr);
	return str;
}

// resolve a piece type index to its FEN abbrev via the game bound to the board
function game_fenAbbrev(board, t) {
	return board.__game ? board.__game.cbVar.pieceTypes[t].fenAbbrev : ("t" + t);
}

function movesFrom(board, game, square) {
	const from = posOf(square);
	board.GenerateMoves(game);
	return board.mMoves.filter((m) => m.f === from).map((m) => moveStr(board, m)).sort();
}

function capturesFrom(board, game, square) {
	return movesFrom(board, game, square).filter((m) => m.indexOf("x") >= 0);
}

function census(board, game) {
	return board.pieces.filter((p) => p.p >= 0)
		.map((p) => (p.s > 0 ? "w" : "b") + game.cbVar.pieceTypes[p.t].fenAbbrev + "@" + nameOf(p.p))
		.sort();
}

module.exports = { loadModel, newGame, newBoard, setup, posOf, posRC, nameOf, moveStr, movesFrom, capturesFrom, census, W };
