/*
 * Horde's move generator, checked against Fairy-Stockfish.
 *
 *   node tests/fairy/horde-perft.test.js
 *
 * Horde is a built-in Fairy-Stockfish variant, so unlike the Patchanka perft
 * there is no ini to get wrong: both sides are implementing the same published
 * rules independently, and the engine is the reference. Every position is
 * built on the Jocly side, exported as a FEN, and counted by both.
 *
 * What is actually at stake here is the first rank. A Pawn standing there
 * moves two squares, and that double step leaves no en passant behind it -
 * Fairy-Stockfish writes the second half as "enPassantRegion[BLACK] = Rank3BB"
 * in horde_variant(). Get only the first half right and the game still plays,
 * quite normally, with one extra capture available to Black that the rules do
 * not grant.
 *
 * So the two double steps have to reach the engine as a position plus the move
 * played in UCI, not as a FEN with the en passant square already filled in or
 * left out. Handed the field, the engine simply believes it; what matters is
 * what the engine sets itself when the Pawn steps, because that is what
 * happens inside its search.
 *
 * Point HORDE_ENGINE at a native Fairy-Stockfish binary to run the same
 * comparison against another build:
 *
 *   HORDE_ENGINE=../Fairy-Stockfish/src/stockfish node tests/fairy/horde-perft.test.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const FAIRY = path.join(ROOT, "third-party", "fairy-stockfish");

const H = require("./harness.js");
const t = H.runner();

/* ---- the model side ---- */

const model = H.context(["base-model.js", "grid-geo-model.js", "standard/horde-model.js"]);
const sandbox = model.sandbox, mGame = model.game;

const copy = (board) => {
	const fresh = Object.create(sandbox.Model.Board);
	fresh.Init && fresh.Init(mGame);
	fresh.CopyFrom(board);
	return fresh;
};

// Positions come from FENs rather than the harness's piece notation: Horde has
// three white Pawn types sharing the letter P, and which one a square holds is
// decided by its rank - the very rule under test. Importing exercises that
// rule, and hands the engine the same string.
function fromFen(fen) {
	const result = mGame.Import("pjn", fen);
	if(!result.status)
		throw new Error("the model rejected: " + fen);
	mGame.mInitial = result.initial;
	const board = H.newBoard(sandbox, mGame);
	delete mGame.mInitial;
	return board;
}

function perft(board, depth) {
	board.GenerateMoves(mGame);
	const moves = board.mMoves.slice();
	if(depth === 1)
		return moves.length;
	let nodes = 0;
	for(const move of moves) {
		const next = copy(board);
		next.ApplyMove(mGame, move);
		next.mWho = -next.mWho;
		nodes += perft(next, depth - 1);
	}
	return nodes;
}

const cases = [];
// `uci` gives the engine the position BEFORE that move and lets it play the
// move itself, so whatever en passant state follows is the engine's own.
function add(label, fen, depth, uci) {
	let board = fromFen(fen);
	if(uci) {
		board.GenerateMoves(mGame);
		const from = uci.slice(0, 2), to = uci.slice(2, 4);
		const move = board.mMoves.find((m) =>
			H.moveStr(board, mGame, m).indexOf(from) > 0 &&
			H.moveStr(board, mGame, m).indexOf(to) > from.length);
		if(!move)
			throw new Error("the model has no move " + uci + " in " + fen);
		const next = copy(board);
		next.ApplyMove(mGame, move);
		next.mWho = -next.mWho;
		board = next;
	}
	// The engine is given the FEN the MODEL exports, not the one written
	// above: that string is what jocly.fairy.js actually sends it, down to
	// the castling field base-model derives rather than reads.
	cases.push({
		label, uci, depth,
		fen: uci ? fromFen(fen).ExportBoardState(mGame) : board.ExportBoardState(mGame),
		expect: perft(copy(board), depth),
	});
}

const START = "rnbqkbnr/pppppppp/8/1PP2PP1/PPPPPPPP/PPPPPPPP/PPPPPPPP/PPPPPPPP w kq - 0 1";

// The opening array. Only eight moves exist at the start - the horde is packed
// solid - so the count only becomes interesting a few plies in.
add("the initial array", START, 4);

// A first-rank Pawn steps two squares...
add("a Pawn stepping two from the first rank", "4k3/8/8/8/8/8/8/1P6 w - - 0 1", 3);

// ...and Black may not answer it en passant, though the Pawn passed a square
// its Pawn attacks. This is the case a half-implementation gets wrong.
add("no en passant behind a first-rank double step",
	"4k3/8/8/8/8/2p5/8/1P6 w - - 0 1", 1, "b1b3");

// A Pawn that merely walks to the second rank has not spent anything: it
// steps two from there, and THAT one does allow en passant.
add("a Pawn that walked to the second rank still steps two",
	"4k3/8/8/8/8/8/8/1P6 w - - 0 1", 4);
add("en passant behind a second-rank double step",
	"4k3/8/8/8/p7/8/1P6/8 w - - 0 1", 1, "b2b4");

// Black's own double step and en passant are untouched.
add("Black stepping two, answered en passant",
	"4k3/1p6/8/2P5/8/8/8/8 b - - 0 1", 1, "b7b5");

// Promotion, and the promoted piece moving again.
add("a Pawn on the seventh rank", "4k3/6P1/8/8/8/8/8/8 w - - 0 1", 3);

// Black castles; White has no rights to lose, and none to write into the FEN.
add("Black castling both ways", "r3k2r/8/8/8/8/8/PPPPPPPP/PPPPPPPP b kq - 0 1", 2);

// A King with the horde closing in: every check, and every Pawn move that does
// not expose one, has to be counted the same way by both sides.
add("the King in front of the horde",
	"4k3/8/8/1PP2PP1/PPPPPPPP/PPPPPPPP/8/8 b - - 0 1", 3);

// A thinned horde in the open, where Black's pieces have room to work.
add("a thinned horde against a full army",
	"rnbqkbnr/pppppppp/8/8/3P4/2P5/1P6/P7 w kq - 0 1", 4);

/* ---- the engine side ---- */

function startNativeEngine(binary) {
	const child = require("child_process").spawn(binary, [], { stdio: ["pipe", "pipe", "ignore"] });
	let lines = [], waiter = null, buffer = "";
	child.stdout.on("data", (chunk) => {
		buffer += chunk.toString();
		const parts = buffer.split("\n");
		buffer = parts.pop();
		parts.forEach((line) => {
			line = line.replace(/\r$/, "");
			lines.push(line);
			if(waiter && waiter.done(line)) {
				const resolve = waiter.resolve, collected = lines;
				waiter = null; lines = [];
				resolve(collected);
			}
		});
	});
	return Promise.resolve({
		send: (cmd) => child.stdin.write(cmd + "\n"),
		ask: (cmd, done) => new Promise((resolve, reject) => {
			lines = [];
			waiter = { done, resolve };
			const timer = setTimeout(() => reject(new Error("engine timeout on: " + cmd)), 120000);
			const original = resolve;
			waiter.resolve = (value) => { clearTimeout(timer); original(value); };
			child.stdin.write(cmd + "\n");
		}),
	});
}

function startEngine() {
	if(process.env.HORDE_ENGINE)
		return startNativeEngine(process.env.HORDE_ENGINE);
	const Stockfish = require(path.join(FAIRY, "stockfish.js"));
	return Stockfish({ wasmBinary: fs.readFileSync(path.join(FAIRY, "stockfish.wasm")) })
		.then((engine) => {
			let lines = [], waiter = null;
			engine.addMessageListener((line) => {
				lines.push(line);
				if(waiter && waiter.done(line)) {
					const resolve = waiter.resolve, collected = lines;
					waiter = null; lines = [];
					resolve(collected);
				}
			});
			return {
				send: (cmd) => engine.postMessage(cmd),
				ask: (cmd, done) => new Promise((resolve, reject) => {
					lines = [];
					waiter = { done, resolve };
					const timer = setTimeout(() => reject(new Error("engine timeout on: " + cmd)), 120000);
					const original = resolve;
					waiter.resolve = (value) => { clearTimeout(timer); original(value); };
					engine.postMessage(cmd);
				}),
			};
		});
}

(async () => {
	const engine = await startEngine();
	await engine.ask("uci", (line) => line === "uciok");
	await engine.ask("setoption name UCI_Variant value horde",
		(line) => line.indexOf("info string variant horde") === 0);

	console.log("\n" + cases.length + " positions, model against the bundled engine");

	for(const c of cases) {
		engine.send("position fen " + c.fen + (c.uci ? " moves " + c.uci : ""));
		const out = await engine.ask("go perft " + c.depth,
			(line) => line.indexOf("Nodes searched") === 0);
		const line = out.filter((l) => l.indexOf("Nodes searched") === 0)[0];
		const nodes = parseInt(line.split(":")[1]);
		t.check(c.label + " (depth " + c.depth + ")", c.expect, nodes);
	}

	// A guard on the guard: the start position's counts are published, so if
	// both sides drifted together this still catches it.
	t.check("the published opening counts",
		[1, 2, 3, 4].map((d) => perft(copy(fromFen(START)), d)),
		[8, 128, 1274, 23310]);

	t.done("Horde perft");
	process.exit(0);
})();
