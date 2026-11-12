/*
 * Le niveau adosse a un moteur externe ("ai": "kriegspiel",
 * src/core/jocly.kriegspiel.js), par l'API publique. Demande
 * `npx gulp build` ; sans build, la suite saute.
 *
 *   - sans moteur (pas de Worker en node, ou worker sans moteur) : le coup
 *     est joue par le niveau uct le plus fort, et le repli est annonce ;
 *   - avec un moteur (un faux Worker, comme celui que Tabulon substitue) :
 *     son coup est joue s'il est legal, refuse sinon.
 *
 *   node tests/kriegspiel/engine.test.js
 */
const fs = require("fs");
const path = require("path");
const { suite } = require("./harness.js");

const DIST = path.join(__dirname, "..", "..", "dist", "node");
if(!fs.existsSync(path.join(DIST, "jocly.core.js")) ||
		!fs.existsSync(path.join(DIST, "games", "kriegspiel", "jeu-de-la-guerre-model.js"))) {
	console.log("SKIP - needs `npx gulp build`");
	process.exit(0);
}

const Jocly = require(path.join(DIST, "jocly.core.js"));
const t = suite("kriegspiel engine level");

/* un faux moteur : repond a Search par ce que `reply(message)` renvoie */
function fakeWorker(reply, log) {
	return function Worker(url) {
		log.push({ url });
		this.postMessage = (message) => {
			log.push(message);
			const answer = message.type === "Init" ? { type: "Ready" } :
				message.type === "Search" ? reply(message) : { type: "Aborted" };
			setTimeout(() => this.onmessage && this.onmessage({ data: answer }), 0);
		};
	};
}

async function start() {
	const match = await Jocly.createMatch("jeu-de-la-guerre");
	const config = await match.getConfig();
	const uct = config.model.levels[0];
	// les deux placements, par l'IA
	for(let i = 0; i < 2; i++)
		await match.applyMove((await match.machineSearch({ level: uct, threaded: false })).move);
	return { match, expert: config.model.levels[3] };
}

(async () => {
	t.section("parseMove");
	await start();   // charge le coeur, qui publie JoclyKriegspiel
	const parse = global.JoclyKriegspiel.parseMove;
	t.eq(parse("pass"), { m: [] }, "pass");
	t.eq(parse("137-112 108-134 x212"), { m: [[137, 112], [108, 134]], a: 212 }, "deplacements et attaque");
	t.eq(parse("r:137-112 5-6"), { m: [[5, 6]], r: [137, 112] }, "retraite");
	t.eq(parse("403-452 d452"), { m: [[403, 452]], d: 452 }, "arsenal detruit");
	let threw = false;
	try { parse("E5-E6"); } catch(e) { threw = true; }
	t.ok(threw, "un coup illisible leve une exception");

	t.section("sans moteur");
	{
		delete global.Worker;
		const { match, expert } = await start();
		t.eq(expert.ai, "kriegspiel", "le 4e niveau est adosse au moteur");
		const result = await match.machineSearch({ level: expert, threaded: false });
		t.ok(result && result.move, "un coup est joue quand meme");
		t.ok(match.game.mBoard.IsValidMove(match.game, result.move), "et il est legal");
		const fallback = result.fairyFallback;
		t.ok(fallback && fallback.engine === "kriegspiel", "le repli est annonce (engine: kriegspiel)");
		t.eq(fallback && [fallback.requested, fallback.level], ["Maréchal", "Général"], "niveau demande et niveau qui joue reellement");
	}

	t.section("avec un moteur");
	{
		const log = [];
		// le moteur avance son infanterie la plus au sud d'une case
		let chosen = null;
		global.Worker = fakeWorker((message) => ({ type: "Done", data: { bestMove: chosen } }), log);
		const { match, expert } = await start();
		const board = match.game.mBoard, R = match.game.g.rules, ctx = match.game.g.ctx;
		const turn = new R.Turn(ctx, board, board.mWho);
		let from = -1, to = -1;
		for(let pos = R.N - 1; pos >= 0 && from < 0; pos--)
			if(board.grid[pos] === R.INFANTRY && turn.dests(pos).length) { from = pos; to = turn.dests(pos)[0]; }
		chosen = from + "-" + to;
		const result = await match.machineSearch({ level: expert, threaded: false });
		t.eq(JSON.parse(JSON.stringify(result.move)), { m: [[from, to]] }, "le coup du moteur est celui qui est joue");
		t.ok(/jocly\.kriegspielworker\.js$/.test(log[0].url), "le worker demande est jocly.kriegspielworker.js");
		const search = log.find((m) => m.type === "Search");
		t.eq(search.position, board.ExportBoardState(match.game), "la position envoyee est ExportBoardState");
		t.eq([search.moveTimeMs, search.maxTurns, search.isolationVictory], [3000, 400, true], "budget du niveau et options du jeu");
		t.ok(!result.fairyFallback, "aucun repli annonce");
	}

	t.section("coup du moteur refuse par les regles");
	{
		global.Worker = fakeWorker(() => ({ type: "Done", data: { bestMove: "0-499" } }), []);
		const { match, expert } = await start();
		const result = await match.machineSearch({ level: expert, threaded: false });
		t.ok(result && result.move && match.game.mBoard.IsValidMove(match.game, result.move), "un coup legal est joue a la place");
		t.ok(JSON.stringify(result.move) !== '{"m":[[0,499]]}', "pas celui du moteur");
		t.ok(result.fairyFallback && /refused by the rules/.test(result.fairyFallback.reason), "le repli dit pourquoi");
	}

	t.section("moteur en erreur");
	{
		global.Worker = fakeWorker(() => ({ type: "Error", error: "phase de placement" }), []);
		const { match, expert } = await start();
		const result = await match.machineSearch({ level: expert, threaded: false });
		t.ok(result && result.move, "repli sur l'IA du jeu");
		t.ok(result.fairyFallback && /placement/.test(result.fairyFallback.reason), "avec la raison donnee par le moteur");
	}
	delete global.Worker;
	t.done();
})().catch((e) => {
	console.log("  FAIL  " + (e && e.stack || e));
	console.log("kriegspiel engine level: 0 passed, 1 failed");
	process.exit(1);
});
