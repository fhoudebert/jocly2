/*
 * Khan's Chess <-> Fairy-Stockfish: does the "expert" level actually play THIS
 * game?
 *
 *   node tests/khans/fairy.test.js
 *
 * The variant has no built-in equivalent in the bundled engine, so the level
 * declares it at runtime with a customVariantIni (see manifest/asymmetric.js). A
 * wrong or drifting definition there does not fail loudly - the engine happily
 * searches a different game and returns a move Jocly then Levenshtein-matches
 * to something legal. So this suite drives the real wasm binary directly, with
 * the ini taken FROM THE MANIFEST rather than copied, and checks the two move
 * generators agree, position by position:
 *
 *   1. the level is declared the way jocly.fairy.js expects it
 *   2. the engine accepts the ini and the FEN Jocly exports for the start
 *      position, and reads back the same board
 *   3. over a pseudo-random game, Jocly's legal moves and the engine's perft-1
 *      move list are the SAME SET, ply after ply (this is what would catch a
 *      wrong Betza definition: mfhN vs fN, cK vs cW, ...)
 *   4. campmate: the engine plays the king to the far rank and scores it as a
 *      win, and the model agrees the game is then over
 *   5. stalemate: both sides agree there is no move (the ini says
 *      "stalemateValue = loss", the model says cbOnStaleMate = -1)
 *
 * Node has no Worker, so the in-app fairy-stockfish path always falls back to
 * the native AI here (see tests/fairy-fallback.js) - the engine has to be
 * driven directly, as below, to be exercised at all.
 *
 * Known, pre-existing and NOT khans-specific: Jocly's FEN export writes the
 * castling field from board.castled, which only records "has already castled",
 * not the loss of the right after a king/rook move. The engine repairs that
 * itself while parsing (verified: with the h1 rook gone it echoes "w Q" back
 * for a "w KQkq" input), except in the one case where a rook leaves h1/a1 and
 * comes back with the king never having moved. The random game below is seeded
 * and does not hit it; a strict comparison is kept rather than papering over
 * castling differences, so if it ever does, this test is meant to fail.
 */

const fs = require("fs");
const path = require("path");

const H = require("./harness.js");

const ROOT = path.join(__dirname, "..", "..");
const FAIRY = path.join(ROOT, "third-party", "fairy-stockfish");
const CUSTOM_VARIANT_PATH = "/jocly-custom-variants.ini"; // same as jocly.fairyworker.js

const t = H.runner();

/* ---------------- the level, as shipped ---------------- */

const game_config = require(path.join(ROOT, "src", "games", "chessbase", "manifest", "asymmetric.js"))
	.games["khans-chess"];
const levels = game_config.config.model.levels;
const level = levels.find((l) => l && l.ai === "fairy-stockfish");

console.log("\nlevel declaration");
t.ok("the game declares a fairy-stockfish level", !!level);
t.check("variant name", level && level.variant, "khans");
t.ok("carries a customVariantIni", !!(level && level.customVariantIni));
t.ok("declares the section it names", level.customVariantIni.indexOf("[khans:") >= 0);
// Same letters on both sides, so no pieceMap: that is the whole point of the
// model using Fairy-Stockfish's own l/s/a/t/h/k.
t.ok("no pieceMap needed", level.pieceMap === undefined);

/* ---------------- engine plumbing ---------------- */

function startEngine(ini) {
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
			const send = (cmd) => engine.postMessage(cmd);
			// run a command and collect its output up to the line the engine
			// ends that command with
			const ask = (cmd, done) => new Promise((resolve, reject) => {
				lines = [];
				waiter = { done, resolve };
				const timer = setTimeout(() => reject(new Error("engine timeout on: " + cmd)), 30000);
				const clear = (v) => { clearTimeout(timer); return v; };
				const original = resolve;
				waiter.resolve = (v) => original(clear(v));
				send(cmd);
			});
			engine.FS.writeFile(CUSTOM_VARIANT_PATH, ini);
			send("setoption name VariantPath value " + CUSTOM_VARIANT_PATH);
			send("setoption name UCI_Variant value khans");
			return {
				position: (fen) => send("position fen " + fen),
				show: () => ask("d", (l) => l.indexOf("Fen: ") === 0),
				perft: (depth) => ask("go perft " + (depth || 1), (l) => l.indexOf("Nodes searched") >= 0),
				search: (depth) => ask("go depth " + depth, (l) => l.indexOf("bestmove") === 0),
			};
		});
}

// "e2e4: 1" lines of a perft-1 dump
const perftMoves = (out) => out
	.map((l) => /^([a-h][1-8][a-h][1-8][a-z]?):/.exec(l.trim()))
	.filter(Boolean)
	.map((m) => m[1])
	.sort();

/* ---------------- the model side ---------------- */

const sandbox = H.loadModel();
const game = H.newGame(sandbox);

// the very string the fairy level would send the engine, for the move the
// engine would send back: Model.Move's own "engine" format
const engineFormat = (move) =>
	Object.assign(Object.create(sandbox.Model.Move), move).ToString("engine").toLowerCase();

function joclyMoves(board) {
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves.map(engineFormat).sort();
}

function cloneBoard(board) {
	const clone = Object.create(sandbox.Model.Board);
	clone.Init && clone.Init(game);
	clone.CopyFrom(board);
	return clone;
}

// Plain perft on the model, to compare with the engine's own. Deep enough to
// exercise the interaction between the two armies rather than each piece on
// its own - a leaper/slider mix-up shows up in the node count long before it
// shows up in a game.
function joclyPerft(board, depth) {
	board.mMoves = [];
	board.GenerateMoves(game);
	if(depth <= 1)
		return board.mMoves.length;
	let nodes = 0;
	const moves = board.mMoves.slice();
	for(const move of moves) {
		const next = cloneBoard(board);
		next.ApplyMove(game, move);
		next.mWho = -next.mWho;
		nodes += joclyPerft(next, depth - 1);
	}
	return nodes;
}

// deterministic pseudo-random walk, so a failure is reproducible
let seed = 20240817;
const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

(async () => {
	const engine = await startEngine(level.customVariantIni);

	/* -------- start position -------- */

	console.log("\nstart position");
	const board = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];
	const startFen = board.ExportBoardState(game);
	engine.position(startFen);
	const shown = (await engine.show()).find((l) => l.indexOf("Fen: ") === 0).slice(5).trim();
	t.check("the engine reads back the board Jocly exported",
		shown.split(" ")[0], startFen.split(" ")[0]);
	// "kq" dropped by the engine itself: the Horde owns no castleable piece
	t.check("castling rights resolved by the engine", shown.split(" ")[2], "KQ");
	t.check("same move count on move 1",
		perftMoves(await engine.perft(1)).length, joclyMoves(board).length);

	/* -------- perft -------- */

	console.log("\nperft from the start position");
	for(let depth = 1; depth <= 4; depth++) {
		engine.position(startFen);
		const out = await engine.perft(depth);
		const theirs = parseInt(/Nodes searched:\s*(\d+)/.exec(
			out.find((l) => l.indexOf("Nodes searched") >= 0))[1]);
		const ours = joclyPerft(cloneBoard(board), depth);
		t.check("depth " + depth + " (" + theirs + " nodes)", ours, theirs);
	}

	/* -------- a whole game, ply by ply -------- */

	console.log("\nmove generation agreement");
	let plies = 0, divergence = null, ended = null;
	while(plies < 80) {
		const fen = board.ExportBoardState(game);
		engine.position(fen);
		const theirs = perftMoves(await engine.perft(1));
		const ours = joclyMoves(board);
		if(JSON.stringify(theirs) !== JSON.stringify(ours)) {
			divergence = { ply: plies, fen: fen,
				onlyEngine: theirs.filter((m) => ours.indexOf(m) < 0),
				onlyJocly: ours.filter((m) => theirs.indexOf(m) < 0) };
			break;
		}
		if(ours.length === 0) { ended = "no move"; break; }
		// campmate ends the game for the model; the engine reports it by
		// having no legal move at all, so stop before the boards diverge
		if(H.outcome(board, game) !== "playing") { ended = "game over"; break; }
		board.mMoves = [];
		board.GenerateMoves(game);
		const move = board.mMoves[Math.floor(random() * board.mMoves.length)];
		board.ApplyMove(game, move);
		game.mPlayedMoves.push(move);
		board.mWho = -board.mWho;
		plies++;
	}
	if(divergence)
		console.log("    ply " + divergence.ply + "  " + divergence.fen
			+ "\n    engine only: " + divergence.onlyEngine.join(" ")
			+ "\n    jocly only : " + divergence.onlyJocly.join(" "));
	t.ok("identical legal moves over " + plies + " plies (" + (ended || "80 plies") + ")", !divergence);
	t.ok("the random game actually got somewhere", plies >= 20);

	/* -------- campmate -------- */

	console.log("\ncampmate");
	// White king on e7, one step from the camp; the Horde cannot cover e8.
	const campFen = "8/4K3/8/8/8/1k6/8/8 w - - 0 1";
	engine.position(campFen);
	const searched = await engine.search(10);
	const best = searched.find((l) => l.indexOf("bestmove") === 0).split(" ")[1];
	// any square of the 8th rank ends it, the engine picks whichever
	t.ok("the engine walks into the camp (" + best + ")", /^e7[d-f]8$/.test(best));
	const scored = searched.filter((l) => l.indexOf("score mate 1") > 0).length;
	t.ok("and scores it as an immediate win", scored > 0);

	const campBoard = H.setup(sandbox, game, { e7: "wK", b3: "bK" }, 1);
	t.check("the model offers the same move",
		joclyMoves(campBoard).indexOf("e7e8") >= 0, true);
	// once played, the engine has no move left either (flagRegionWhite = *8)
	engine.position("4K3/8/8/8/8/1k6/8/8 b - - 0 1");
	t.check("game over for the engine too", perftMoves(await engine.perft(1)).length, 0);
	t.check("game over for the model", H.outcome(H.setup(sandbox, game, { e8: "wK", b3: "bK" }, -1), game), "white");

	/* -------- stalemate -------- */

	console.log("\nstalemate");
	const stale = { a8: "bK", b6: "wQ", d1: "wK" };
	const staleFen = "k7/8/1Q6/8/8/8/8/3K4 b - - 0 1";
	engine.position(staleFen);
	t.check("no move for the engine", perftMoves(await engine.perft(1)).length, 0);
	t.check("no move for the model", joclyMoves(H.setup(sandbox, game, stale, -1)).length, 0);
	t.check("and the model gives the win to the Kingdom",
		H.outcome(H.setup(sandbox, game, stale, -1), game), "white");

	t.done("Khan's Chess / Fairy-Stockfish");
})().catch((error) => { console.error("ERROR", error); process.exit(2); });
