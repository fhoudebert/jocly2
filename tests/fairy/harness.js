/*
 * Pure-Node harness for the chessbase models: loads model scripts in a sandbox
 * and drives Model.Board directly, no build needed.
 *
 *   node tests/fairy/zanzibar-s.test.js
 *
 * Used by every suite in this folder, by tests/shogi/chu-shogi.test.js and by
 * two in tests/core/ - anything built on a chessbase model. It started as the
 * harness of Khan's Chess, which is why loadModel() with no argument still
 * loads that game; every other caller passes its own script list.
 *
 * setup() takes a { square: "wK", ... } map, a piece being its side (w/b) plus
 * the FEN abbrev of its type - so "bH" is a kheshig and "bK" the khan. A
 * trailing "*" marks a piece that has not moved yet (castling, pawn double
 * step).
 *
 * Same shape as tests/space-spartan/harness.js, which it is adapted from.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SRC = path.join(__dirname, "..", "..", "src");

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "asymmetric/khans-model.js"];

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
	// Evaluate() reads both of these (repetition rule, eval factors); a game
	// built by the real loader gets them from the manifest.
	game.mOptions = { preventRepeat: false, levelOptions: {} };
	game.mPlayedMoves = [];
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

function at(game, square) {
	const geo = game.cbVar.geometry;
	const pos = geo.PosByName(square);
	if(pos < 0 || pos >= geo.boardSize || geo.PosName(pos) !== square)
		throw new Error("bad square " + square);
	return pos;
}

function nameOf(game, pos) { return game.cbVar.geometry.PosName(pos); }

// The pawn comes in two types sharing the letter P: the one that still has its
// double step (the one carrying `initial`) and the one that has already moved.
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

// The king and the khan share the letter K, and both carry `initial`, so the
// letter alone does not identify a type - the side does. Filter on "has
// moved" first (the pawn's two types), then on side affinity (K/k).
function typeOfSided(game, abbrev, side, virgin) {
	const types = game.cbVar.pieceTypes;
	const match = [];
	for(const t in types)
		if((types[t].fenAbbrev || types[t].abbrev) === abbrev)
			match.push(parseInt(t));
	if(!match.length) throw new Error("unknown piece " + abbrev);
	let wanted = match.filter((t) => !!types[t].initial === !!virgin);
	if(!wanted.length) wanted = match;
	if(wanted.length > 1) {
		const sided = wanted.filter((t) => (types[t].initial || []).some((d) => d.s === side));
		if(sided.length)
			wanted = sided;
		else {
			// Types that never sit on a starting square carry no side in their
			// `initial`. base-model.js resolves those by name, a "-w"/"-b"
			// suffix (see its FEN import); do the same, or a moved black Pawn
			// comes back as the white one and walks up the board.
			const named = wanted.filter((t) =>
				new RegExp(side > 0 ? "-w$" : "-b$").test(types[t].name || ""));
			if(named.length)
				wanted = named;
		}
	}
	return wanted[0];
}

function setup(sandbox, game, pieces, who) {
	const list = [];
	for(const square in pieces) {
		let spec = pieces[square];
		const virgin = spec.slice(-1) === "*";
		if(virgin) spec = spec.slice(0, -1);
		const side = spec[0] === "w" ? 1 : -1;
		list.push({
			s: side,
			t: typeOfSided(game, spec.slice(1), side, virgin),
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

// Runs the game-level end-of-game detection (GenerateMoves + Evaluate, exactly
// what JocGame.GetFinished() does) and reports the outcome as a string.
function outcome(board, game) {
	board.mFinished = false;
	board.mWinner = 0;
	board.mMoves = [];
	board.GenerateMoves(game);
	if(!board.mFinished)
		board.Evaluate(game, true, true);
	if(!board.mFinished) return "playing";
	if(board.mWinner === 1) return "white";
	if(board.mWinner === -1) return "black";
	return "draw";
}

// Is the side to move attacked on its king square? board.check is only
// maintained across applied moves, so ask the threat graph directly - which is
// also what GenerateMoves() does.
function inCheck(board, game, who) {
	const side = who === undefined ? board.mWho : who;
	return board.cbGetAttackers(game, board.kings[side], side, 100).length > 0;
}

function census(board, game) {
	return board.pieces.filter((p) => p.p >= 0)
		.map((p) => (p.s > 0 ? "w" : "b") + (game.cbVar.pieceTypes[p.t].fenAbbrev || game.cbVar.pieceTypes[p.t].abbrev))
		.sort();
}

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


/*
 * A context around one model: the game, its geometry, its piece table, and the
 * handful of questions a rules test keeps asking of them - what a piece
 * reaches, which flags a square carries, what a Pawn promotes to, whether a
 * saved position reloads unchanged, whether a game plays out. Written for the
 * large Cazaux variants and used by any suite that wants the same vocabulary.
 */

function context(scripts) {
	const sandbox = loadModel(scripts);
	const game = newGame(sandbox);
	const ctx = {
		sandbox, game,
		geo: game.cbVar.geometry,
		types: game.cbVar.pieceTypes,
		constants: sandbox.Model.Game.cbConstants,
	};
	ctx.typeNamed = (pieceName, letter) => {
		for(const t in ctx.types)
			if(ctx.types[t].name === pieceName
				&& (letter === undefined || (ctx.types[t].fenAbbrev || ctx.types[t].abbrev) === letter))
				return parseInt(t);
		throw new Error(name + " has no piece named " + pieceName);
	};
	// every square a piece can reach from one square of an empty board
	ctx.reach = (pieceName, square, letter) => {
		const from = ctx.geo.PosByName(square), out = new Set();
		(ctx.types[ctx.typeNamed(pieceName, letter)].graph[from] || []).forEach((line) => {
			for(const entry of line)
				if(entry & (ctx.constants.FLAG_MOVE | ctx.constants.FLAG_CAPTURE))
					out.add(entry & 0xffff);
		});
		return out.size;
	};
	// which of move / capture / screen-capture apply on a given square
	ctx.flagsOn = (pieceName, from, to) => {
		const start = ctx.geo.PosByName(from), target = ctx.geo.PosByName(to);
		let found = "";
		(ctx.types[ctx.typeNamed(pieceName)].graph[start] || []).forEach((line) => {
			for(const entry of line)
				if((entry & 0xffff) === target) {
					found = [];
					if(entry & ctx.constants.FLAG_MOVE) found.push("move");
					if(entry & ctx.constants.FLAG_CAPTURE) found.push("capture");
					if(entry & ctx.constants.FLAG_SCREEN_CAPTURE) found.push("screen");
					found = found.join("+");
				}
		});
		return found;
	};
	/*
	 * The piece arrives on `row` from the row before it. That matters for
	 * Minjiku, where promotion is offered on ENTERING the zone: a quiet move
	 * from one zone square to another does not promote, so a test starting
	 * inside the zone would report no promotion at all.
	 */
	/*
	 * The moves of the piece standing on one square, on a board holding just
	 * what is asked for. The caller supplies the Kings: where they may stand
	 * without being in check is the caller's business, not the harness's.
	 */
	ctx.movesFrom = (pieces, square, who) => {
		const board = setup(sandbox, game, pieces, who || 1);
		board.mMoves = [];
		board.GenerateMoves(game);
		return board.mMoves.filter((move) => move.f === ctx.geo.PosByName(square));
	};
	// what the move reads as, for an assertion that names squares
	ctx.engine = (move) =>
		Object.assign(Object.create(sandbox.Model.Move), move).ToString("engine");
	ctx.natural = (move) =>
		Object.assign(Object.create(sandbox.Model.Move), move).ToString("natural");

	ctx.promotesTo = (pieceName, row, letter) => {
		const type = ctx.typeNamed(pieceName, letter);
		const to = row * ctx.geo.width + 3;
		const from = to - ctx.geo.width;
		const list = ctx.game.cbVar.promote(ctx.game,
			{ t: type, s: 1, p: from }, { t: to, f: from, c: null }) || [];
		return list.map((into) => ctx.types[into].name);
	};
	ctx.sides = () => {
		const board = newBoard(ctx.sandbox, ctx.game);
		let white = 0;
		board.pieces.forEach((piece) => { if(piece.p >= 0 && piece.s > 0) white++; });
		return white;
	};
	// a position saved and reloaded must come back as the same pieces
	ctx.roundTrip = () => {
		const board = newBoard(ctx.sandbox, ctx.game);
		const before = {};
		board.pieces.forEach((piece) => {
			if(piece.p >= 0) before[piece.p] = ctx.types[piece.t].name + "/" + piece.s;
		});
		const back = ctx.sandbox.Model.Game.Import("pjn", board.ExportBoardState(ctx.game)).initial;
		const after = {};
		(back.pieces || []).forEach((piece) => {
			after[piece.p] = ctx.types[piece.t].name + "/" + piece.s;
		});
		return Object.keys(before).filter((pos) => before[pos] !== after[pos]).length;
	};
	ctx.plays = (plies) => {
		const board = newBoard(ctx.sandbox, ctx.game);
		ctx.game.mPlayedMoves = [];
		let seed = 4242, played = 0;
		const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
		while(played < plies) {
			board.mMoves = [];
			board.GenerateMoves(ctx.game);
			if(board.mMoves.length === 0)
				break;
			const move = board.mMoves[Math.floor(random() * board.mMoves.length)];
			board.ApplyMove(ctx.game, move);
			ctx.game.mPlayedMoves.push(move);
			board.mWho = -board.mWho;
			played++;
		}
		return played;
	};
	return ctx;
}

module.exports = { loadModel, newGame, newBoard, setup, at, nameOf, typeOf, context,
                   moves, movesFrom, moveStr, play, outcome, inCheck, census, runner, SCRIPTS };
