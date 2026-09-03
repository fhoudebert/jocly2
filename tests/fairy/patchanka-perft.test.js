/*
 * Patchanka's Expert level, checked by counting moves.
 *
 *   node tests/fairy/patchanka-perft.test.js
 *
 * tests/core/fairy-inis.test.js already asks the engine whether it resolved
 * the variant to the declared start position and whether it can return a move.
 * That catches an ini the engine rejected outright. It does not catch an ini
 * the engine accepted and understood differently, which is the failure mode
 * that matters here: nine of the eleven piece types are compounds written in
 * Betza, and a compound the engine reads with one atom missing still plays.
 *
 * So the two move generators are compared directly. Every position below is
 * built on the Jocly side, exported as a FEN, and counted by both - the model
 * by walking its own GenerateMoves(), the engine by "go perft". The positions
 * are not chosen for coverage of the board but for the rules that are easy to
 * get wrong in an ini: the Soldier's double step from mid-board, the en
 * passant that follows it, the three promotions, and the Medusa's leaps over
 * its own men.
 *
 * Depth matters more than breadth. Several keys change nothing at depth 1 -
 * dropping promotedPieceType leaves the Kirin's promotion looking identical,
 * because a mandatory promotion with a single target is one move either way -
 * and only show up once the promoted piece has to move again.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const FAIRY = path.join(ROOT, "third-party", "fairy-stockfish");
const CUSTOM_VARIANT_PATH = "/jocly-custom-variants.ini";

const H = require("./harness.js");
const t = H.runner();

/* ---- the ini, taken from the manifest rather than repeated here ---- */

const game = require(path.join(ROOT, "src", "games", "chessbase", "index.js"))
	.games.filter((g) => g.name === "patchanka-chess")[0];
const expert = ((game && game.config.model.levels) || [])
	.filter((level) => level.ai === "fairy-stockfish")[0];

if(!expert) {
	console.log("\nPatchanka has no fairy-stockfish level - nothing to compare");
	t.done("Patchanka perft");
	return;
}

/* ---- the model side ---- */

const model = H.context(["base-model.js", "grid-geo-model.js", "cazaux/patchanka-model.js"]);
const sandbox = model.sandbox, mGame = model.game;

const copy = (board) => {
	const fresh = Object.create(sandbox.Model.Board);
	fresh.Init && fresh.Init(mGame);
	fresh.CopyFrom(board);
	return fresh;
};

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

// A case is described in Jocly's own terms; its FEN and its node count both
// come out of the model, so the test never hardcodes a number the model could
// silently drift away from.
const cases = [];
function add(label, pieces, who, prelude, depth) {
	let board = H.setup(sandbox, mGame, pieces, who);
	if(prelude)
		board = H.play(board, mGame, prelude);
	cases.push({
		label: label,
		fen: board.ExportBoardState(mGame),
		depth: depth,
		expect: perft(copy(board), depth),
	});
}

// the opening position, three plies deep
{
	const board = H.newBoard(sandbox, mGame);
	cases.push({ label: "the initial array", fen: board.ExportBoardState(mGame),
		depth: 3, expect: perft(copy(board), 3) });
}

// The Soldier steps two squares from anywhere, so a Pawn that has not moved
// yet can be the one capturing en passant - which needs the Soldier declared
// as a pawn type on the engine side, not just as a custom piece.
add("a Soldier's double step, answered en passant",
	{ b3: "wP*", c5: "bS", h1: "wK", h10: "bK" }, -1, "Sc5-c3", 1);
add("a Soldier catching a Soldier en passant",
	{ b3: "wS", c5: "bS", h1: "wK", h10: "bK" }, -1, "Sc5-c3", 1);
// forward one or two, sideways one, and no step backwards
add("a Soldier in the open", { e5: "wS", a1: "wK", j10: "bK" }, 1, null, 1);
// and no second double step handed to it by the Pawns' own machinery
add("a Soldier on the Pawns' rank", { e3: "wS", a1: "wK", j10: "bK" }, 1, null, 1);

// the three promotions, one move deep - enough to see the move exists and is
// forced, not enough to see what it turned into
add("a Kirin on the ninth rank", { c9: "wI", a1: "wK", j5: "bK" }, 1, null, 1);
add("a Phoenix on the ninth rank", { b9: "wH", a1: "wK", j5: "bK" }, 1, null, 1);
add("a Pawn on the ninth rank", { d9: "wP", a1: "wK", a5: "bK" }, 1, null, 1);

// The Medusa's Alfil and Dabbaba leaps land on squares its Queen move also
// reaches, so they only show when the ray is blocked - and the model has to
// offer each of those squares once, not twice.
add("a Medusa boxed in by its own men",
	{ e5: "wQ", d4: "wP", e6: "wP", a1: "wK", j10: "bK" }, 1, null, 1);

// deeper positions, where a promoted piece gets to move again
add("an open middlegame",
	{ e5: "wQ", d2: "wB", g7: "bI", b8: "bH", c3: "wS", f6: "bP", a1: "wK", j10: "bK" },
	1, null, 3);
add("a promotion race",
	{ d9: "wP*", e9: "wS", c9: "wI", b9: "wH", g2: "bP*", a1: "wK", j5: "bK" },
	1, null, 4);
add("Medusa, Kirins, Phoenix and a Bison on the board",
	{ e5: "wQ", c4: "wI", h3: "wB", b2: "wR", g8: "bI", i7: "bH", d7: "bZ",
	  f2: "wS", e1: "wK", a10: "bK" }, 1, null, 4);

/* ---- the engine side ---- */

function startEngine() {
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
				write: (text) => engine.FS.writeFile(CUSTOM_VARIANT_PATH, text),
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
	engine.write(expert.customVariantIni);
	engine.send("setoption name VariantPath value " + CUSTOM_VARIANT_PATH);
	await engine.ask("setoption name UCI_Variant value " + expert.variant,
		(line) => line.indexOf("info string variant " + expert.variant) === 0);

	console.log("\n" + cases.length + " positions, model against the bundled engine");

	for(const one of cases) {
		engine.send("position fen " + one.fen);
		const output = await engine.ask("go perft " + one.depth,
			(line) => line.indexOf("Nodes searched") === 0);
		const nodes = parseInt(output.filter((line) => line.indexOf("Nodes searched") === 0)[0]
			.split(":")[1].trim(), 10);
		t.check(one.label + " (depth " + one.depth + ")", nodes, one.expect);
		// A count that matches says the two agree on how many moves there are.
		// When it does not, the per-move split the engine printed says which
		// branch to look at, so it is worth showing.
		if(nodes !== one.expect) {
			console.log("    " + one.fen);
			console.log("    " + output.filter((line) => /^[a-z]\d+[a-z]\d+/.test(line.trim()))
				.map((line) => line.trim()).join("  "));
		}
	}

	t.done("Patchanka perft");
	process.exit(0);
})().catch((error) => {
	console.error("FAILED: " + error.message);
	process.exit(1);
});
