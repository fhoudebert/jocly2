/*
 * Every game with an Expert (Fairy-Stockfish) level, played by the engine
 * itself through match.machineSearch(), looking for ONE thing: an answer of
 * the engine that jocly.fairy.js has to "catch" by approximate matching.
 *
 *   node tests/fairy/engine-notation.test.js        (after npx gulp build)
 *   ENGINE_PLIES=30 ENGINE_GAMES=xiangqi,kyoto-shogi node tests/fairy/...
 *
 * When the engine's move is not among Jocly's moves as spelled for it
 * (Move.ToString("engine")), ResolveMove plays "the closest one" and says so
 * on console.error - the game goes on, often with the right move, sometimes
 * with another one. Nothing else notices. That is how three whole families
 * went unseen:
 *
 *   - xiangqi: ranks counted from 0 by Jocly (a0-i9), from 1 by the engine
 *     (a1-i10) - no answer ever matched; "h3e3" (a cannon) once became
 *     "e3e4" (a pawn);
 *   - gustav3-chess: the wall squares of the a- and j-files were written as
 *     empty squares in the FEN, so the engine moved through them;
 *   - kyoto-shogi: drops name the face the piece lands on ("+L@b4", "N@c4")
 *     and a turned-back piece carries a trailing "-" (e5d4-).
 *
 * Plus chess960, whose opening setup move ("--") was sent to the engine as a
 * chess position. The console is therefore listened to, and the test fails
 * on the first such message, per game.
 *
 * The engine is the real wasm build, driven the way jocly.fairyworker.js
 * drives it (same provider as tests/fairy/seirawan-perft.test.js). A short
 * think time is enough: what is checked is that the answer is FOUND, not
 * that it is good.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const FAIRY = path.join(ROOT, "third-party", "fairy-stockfish");
const DIST = path.join(ROOT, "dist", "node", "jocly.core.js");
const CUSTOM_VARIANT_PATH = "/jocly-custom-variants.ini";

if(!fs.existsSync(DIST)) {
	console.log("SKIP - no build yet: run npx gulp build first");
	process.exit(0);
}

const Jocly = require(DIST);
const JoclyFairy = require(path.join(ROOT, "dist", "node", "jocly.fairy.js")).JoclyFairy;
const t = require("./harness.js").runner();

const PLIES = +(process.env.ENGINE_PLIES || 12);
const MOVETIME = +(process.env.ENGINE_MOVETIME || 30);
const ONLY = process.env.ENGINE_GAMES ? process.env.ENGINE_GAMES.split(",") : null;

function uciSession(engine) {
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
			const timer = setTimeout(() => reject(new Error("engine timeout on: " + cmd)), 60000);
			waiter = { done, resolve: (v) => { clearTimeout(timer); resolve(v); } };
			engine.postMessage(cmd);
		}),
	};
}

// A Worker-shaped provider, as in seirawan-perft.test.js (see there for the
// isready barrier and the well-formed bestmove check).
function wasmProvider(engine) {
	const session = uciSession(engine);
	let ready = session.ask("uci", (l) => l === "uciok");
	return function () {
		const worker = {
			onmessage: null, onerror: null,
			postMessage(message) {
				const reply = (data) => setTimeout(() => worker.onmessage && worker.onmessage({ data }), 0);
				if(message.type === "Init") { ready.then(() => reply({ type: "Ready" })); return; }
				if(message.type !== "Search") return;
				ready = ready.then(async () => {
					if(message.customVariantIni) {
						engine.FS.writeFile(CUSTOM_VARIANT_PATH, message.customVariantIni);
						session.send("setoption name VariantPath value " + CUSTOM_VARIANT_PATH);
					}
					session.send("setoption name UCI_Variant value " + message.variant);
					if(typeof message.skillLevel === "number")
						session.send("setoption name Skill Level value " + message.skillLevel);
					session.send("setoption name UCI_Chess960 value " + (message.chess960 ? "true" : "false"));
					await session.ask("isready", (l) => l === "readyok");
					session.send("position fen " + message.fen);
					const wellFormed = (l) => {
						const at = l.lastIndexOf("bestmove ");
						if(at < 0) return false;
						const tail = l.slice(at);
						return /^bestmove\s+\S+(?:\s+ponder\s+\S+)?\s*$/.test(tail) && !/info/.test(tail);
					};
					const out = await session.ask("go movetime " + MOVETIME, wellFormed);
					const last = out[out.length - 1];
					reply({ type: "Done", data: { bestMoveUci: last.slice(last.lastIndexOf("bestmove ")).split(/\s+/)[1] } });
				}).catch((err) => reply({ type: "Error", error: String(err) }));
			},
		};
		return worker;
	};
}

(async function () {

const Stockfish = require(path.join(FAIRY, "stockfish.js"));
const engine = await Stockfish({ wasmBinary: fs.readFileSync(path.join(FAIRY, "stockfish.wasm")) });
JoclyFairy.setEngineProvider(wasmProvider(engine));

let caught = [];
const realError = console.error;
console.error = function (...args) {
	const text = args.join(" ");
	if(/not among Jocly's legal moves/.test(text)) { caught.push(text.split("\n")[0]); return; }
	realError.apply(console, args);
};

const games = [];
for(const name of Object.keys(await Jocly.listGames())) {
	if(ONLY && ONLY.indexOf(name) < 0) continue;
	const config = await Jocly.getGameConfig(name).catch(() => null);
	if(config && (config.model.levels || []).some((l) => l.ai === "fairy-stockfish"))
		games.push(name);
}
t.ok("games with an Expert level were found (" + games.length + ")", games.length > (ONLY ? 0 : 30));

for(const name of games) {
	caught = [];
	const match = await Jocly.createMatch(name);
	const level = Object.assign({}, match.game.config.model.levels
		.filter((l) => l.ai === "fairy-stockfish")[0], { moveTimeMs: MOVETIME });
	let played = 0, fallbacks = 0, error = null;
	try {
		for(let ply = 0; ply < PLIES; ply++) {
			if((await match.getFinished()).finished) break;
			// a prelude (setup choice) is played as the first option: the
			// engine does not choose arrangements
			const list = await match.getPossibleMoves();
			const said = await match.getMoveString(list);
			if(said.length && said.every((s) => /^(#\d+|--)$/.test(s))) {
				await match.playMove(list[0]);
				continue;
			}
			const result = await match.machineSearch({ level });
			if(result.fairyFallback) { fallbacks++; break; }
			if(!result.move) break;
			await match.playMove(result.move);
			played++;
		}
	} catch(err) { error = String(err && err.message || err).slice(0, 200); }
	t.check(name + ": every engine move found as it was written",
		{ caught: caught.slice(0, 2), fallbacks, error }, { caught: [], fallbacks: 0, error: null });
	if(played === 0)
		console.log("    " + name + ": no engine move played");
}

console.error = realError;
JoclyFairy.setEngineProvider(null);
t.done("Engine notation");

})().catch((err) => { console.log("CRASH " + (err && err.stack || err)); process.exit(1); });
