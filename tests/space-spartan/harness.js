/*
 * Pure-Node harness for the Space Spartan model (three 6x8 planes stacked, so
 * 144 squares, pos = plane*48 + row*6 + col). Loads the model scripts in a
 * sandbox and drives Model.Board directly - no build needed.
 *
 * Squares are named the way the engine names them, PosName()-style: plane
 * letter A/B/C, then file a..f, then rank 1..8. White's king starts on Bc1,
 * the two Spartan kings on Bc8 and Bd8.
 *
 * setup() takes a { square: "wK", ... } map. A piece is its side (w/b) plus
 * the FEN abbrev of its type, so the two Spartan kings are told apart: "bK"
 * is king #1 (isKing:1) and "bE" is king #2 (isKing:2).
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = path.join(__dirname, "..", "..", "src");

const SCRIPTS = ["base-model.js", "multiplan-geo-model.js", "3d/space-spartan-model.js"];

function loadModel(scripts) {
	const sandbox = {
		console, Math, JSON, Object, Array,
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
	(scripts || SCRIPTS).forEach((script) => {
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

// "Bc5" -> 1*48 + 4*6 + 2. PosByName does not range-check, and an out-of-board
// file quietly folds into the next row (a "h8" lands on Cb1), so check here.
function at(game, square) {
	const geo = game.cbVar.geometry;
	const pos = geo.PosByName(square);
	if(pos < 0 || pos >= geo.boardSize || geo.PosName(pos) !== square)
		throw new Error("bad square " + square);
	return pos;
}

function nameOf(game, pos) { return game.cbVar.geometry.PosName(pos); }

// Pawn and hoplite each come in two types sharing one letter: the one that
// still has its double step (it is the one carrying `initial`) and the one
// that has already moved. A trailing "*" in a setup asks for the first.
function typeOf(game, abbrev, virgin) {
	const types = game.cbVar.pieceTypes;
	const match = [];
	for(const t in types)
		if((types[t].fenAbbrev || types[t].abbrev) === abbrev)
			match.push(parseInt(t));
	if(!match.length) throw new Error("unknown piece " + abbrev);
	const wanted = match.filter((t) => !!types[t].initial === !!virgin);
	return wanted.length ? wanted[0] : match[0];
}

// pieces: { "Bc8": "bK", "Bd8": "bE", ... } ; moved defaults to true so that
// nothing is accidentally castleable or double-steppable in a test position.
// A trailing "*" ("wK*") marks a piece that has NOT moved yet, which is what
// castling and the initial hoplite jump need.
function setup(sandbox, game, pieces, who) {
	const list = [];
	for(const square in pieces) {
		let spec = pieces[square];
		const virgin = spec.slice(-1) === "*";
		if(virgin) spec = spec.slice(0, -1);
		list.push({
			s: spec[0] === "w" ? 1 : -1,
			t: typeOf(game, spec.slice(1), virgin),
			p: at(game, square),
			m: !virgin,
		});
	}
	game.mInitial = { pieces: list, turn: who === undefined ? 1 : who };
	const board = newBoard(sandbox, game);
	delete game.mInitial;
	return board;
}

function moveStr(board, game, move) {
	const abbrev = (t) => game.cbVar.pieceTypes[t].abbrev || "P";
	const piece = board.pieces[board.board[move.f]];
	let str = abbrev(piece.t) + nameOf(game, move.f)
		+ (move.c != null ? "x" : "-") + nameOf(game, move.t);
	if(move.pr != null) str += "=" + (game.cbVar.pieceTypes[move.pr].fenAbbrev || abbrev(move.pr));
	if(move.cg !== undefined) str += "(O-O)";
	return str;
}

function moves(board, game) {
	board.GenerateMoves(game);
	return board.mMoves.map((m) => moveStr(board, game, m));
}

function movesFrom(board, game, square) {
	const from = at(game, square);
	board.GenerateMoves(game);
	return board.mMoves.filter((m) => m.f === from).map((m) => moveStr(board, game, m)).sort();
}

// apply a move given by its printed form, and hand the turn over - the engine
// does not flip mWho itself
function play(board, game, str) {
	board.GenerateMoves(game);
	const move = board.mMoves.find((m) => moveStr(board, game, m) === str);
	if(!move) throw new Error("no such move: " + str + "\n  legal: " + moves(board, game).join(" "));
	board.ApplyMove(game, move);
	board.mWho = -board.mWho;
	return board;
}

// live royals of a side, by rank, validated against the board
function royals(board, game, who) {
	const out = [];
	for(let k = 1; k <= game.cbMaxRoyalRank; k++) {
		const pos = board.kings[who * k];
		if(pos === undefined || pos < 0) continue;
		const idx = board.board[pos];
		if(idx < 0) continue;
		const pc = board.pieces[idx];
		if(pc.s !== who || !game.g.pTypes[pc.t].isKing) continue;
		if(out.indexOf(nameOf(game, pos)) < 0) out.push(nameOf(game, pos));
	}
	return out;
}

function census(board, game) {
	return board.pieces.filter((p) => p.p >= 0)
		.map((p) => (p.s > 0 ? "w" : "b") + (game.cbVar.pieceTypes[p.t].fenAbbrev || game.cbVar.pieceTypes[p.t].abbrev))
		.sort();
}

// tiny assertion kit, same shape as the other suites here
function runner() {
	let passed = 0, failed = 0;
	return {
		check(label, actual, expected) {
			const a = JSON.stringify(actual), e = JSON.stringify(expected);
			if(a === e) { passed++; console.log("  ok   " + label); }
			else { failed++; console.log("  FAIL " + label + "\n    expected " + e + "\n    actual   " + a); }
		},
		ok(label, cond) { this.check(label, !!cond, true); },
		done(title) {
			console.log("\n" + title + ": " + passed + " passed, " + failed + " failed");
			process.exit(failed ? 1 : 0);
		},
	};
}

module.exports = { loadModel, newGame, newBoard, setup, at, nameOf, typeOf,
                   moves, movesFrom, moveStr, play, royals, census, runner, SCRIPTS };
