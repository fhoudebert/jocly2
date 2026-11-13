/*
 * Le niveau « Maréchal », adosse a un moteur externe ("ai": "pean",
 * src/core/jocly.pean.js), par l'API publique. Demande `npx gulp build` ;
 * sans build, la suite saute.
 *
 *   - sans moteur (pas de Worker en node, ou worker sans moteur) : le tour
 *     est joue par le niveau uct le plus fort, et le repli est annonce ;
 *   - avec un moteur (un faux Worker, comme celui que Tabulon substitue) :
 *     son tour est joue s'il est legal, refuse sinon ;
 *   - deploiement libre : l'IA du jeu deploie, sans moteur et sans annonce.
 *
 *   node tests/pean/engine.test.js
 */
const fs = require("fs");
const path = require("path");
const { suite, rules } = require("./harness.js");
// avant tout modele Jocly : pean-rules.js ne s'exporte que hors de Jocly
const R = rules();

const DIST = path.join(__dirname, "..", "..", "dist", "node");
if(!fs.existsSync(path.join(DIST, "jocly.core.js")) ||
		!fs.existsSync(path.join(DIST, "games", "pean", "pean-leuctres-model.js"))) {
	console.log("SKIP - needs `npx gulp build`");
	process.exit(0);
}

const Jocly = require(path.join(DIST, "jocly.core.js"));
const t = suite("pean engine level");

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

async function start(name) {
	const match = await Jocly.createMatch(name || "pean-leuctres");
	const config = await match.getConfig();
	const levels = config.model.levels;
	return { match, marechal: levels[levels.length - 1] };
}

(async () => {
	t.section("le niveau");
	{
		const { marechal } = await start();
		t.eq([marechal.label, marechal.ai], ["Maréchal", "pean"], "le dernier niveau est adosse au moteur");
		t.ok(marechal.moveTimeMs > 0 && marechal.moveTimeMs <= 3000, "moins de 3 s par tour");
	}

	t.section("sans moteur");
	{
		delete global.Worker;
		const { match, marechal } = await start();
		const result = await match.machineSearch({ level: marechal, threaded: false });
		t.ok(result && result.move, "un tour est joue quand meme");
		t.ok(match.game.mBoard.IsValidMove(match.game, result.move), "et il est legal");
		const fallback = result.fairyFallback;
		t.ok(fallback && fallback.engine === "pean", "le repli est annonce (engine: pean)");
		t.eq(fallback && [fallback.requested, fallback.level], ["Maréchal", "Général"], "niveau demande et niveau qui joue reellement");
	}

	t.section("avec un moteur");
	{
		const log = [];
		let chosen = null;
		global.Worker = fakeWorker(() => ({ type: "Done", data: { bestMove: chosen } }), log);
		const { match, marechal } = await start();
		const g = match.game, board = g.mBoard;
		// le moteur avance une unite : sa premiere destination
		const turn = new R.Turn(g.g.ctx, board, board.mWho);
		const unit = turn.st.u.find((u) => u.s === board.mWho && u.h >= 0 && Object.keys(turn.reach([u.i])).length);
		const dest = Object.keys(turn.reach([unit.i]))[0];
		chosen = { o: [{ u: [unit.i], c: turn.reach([unit.i])[dest] }], k: [] };
		const result = await match.machineSearch({ level: marechal, threaded: false });
		t.eq(R.playableMove(JSON.parse(JSON.stringify(result.move))), R.playableMove(chosen), "le tour du moteur est celui qui est joue");
		t.ok(/jocly\.peanworker\.js$/.test(log[0].url), "le worker demande est jocly.peanworker.js");
		const search = log.find((m) => m.type === "Search");
		const request = JSON.parse(search.request);
		t.eq(request.moveTimeMs, marechal.moveTimeMs, "budget du niveau");
		t.eq(request.state.played, board.played, "l'etat de la partie est envoye");
		t.eq(request.context.types.length, g.g.ctx.typeKeys.length, "avec le contexte compile du scenario");
		t.ok(!result.fairyFallback, "aucun repli annonce");
	}

	t.section("tour du moteur refuse par les regles");
	{
		global.Worker = fakeWorker(() => ({ type: "Done", data: { bestMove: { o: [{ u: [0], c: [0, 499] }] } } }), []);
		const { match, marechal } = await start();
		const result = await match.machineSearch({ level: marechal, threaded: false });
		t.ok(result && result.move && match.game.mBoard.IsValidMove(match.game, result.move), "un tour legal est joue a la place");
		t.ok(result.fairyFallback && /refused by the rules/.test(result.fairyFallback.reason), "le repli dit pourquoi");
	}

	t.section("moteur en erreur");
	{
		global.Worker = fakeWorker(() => ({ type: "Error", error: "aucun tour" }), []);
		const { match, marechal } = await start();
		const result = await match.machineSearch({ level: marechal, threaded: false });
		t.ok(result && result.move, "repli sur l'IA du jeu");
		t.ok(result.fairyFallback && /aucun tour/.test(result.fairyFallback.reason), "avec la raison donnee par le moteur");
	}

	t.section("deploiement libre");
	{
		const log = [];
		global.Worker = fakeWorker(() => ({ type: "Error", error: "ne doit pas etre appele" }), log);
		const { match, marechal } = await start("pean-bataille-libre");
		t.eq(match.game.mBoard.phase, 0, "la bataille libre commence par le deploiement");
		const result = await match.machineSearch({ level: marechal, threaded: false });
		t.ok(result && result.move && result.move.p, "un deploiement est joue");
		t.ok(!result.fairyFallback, "sans annonce de repli");
		t.ok(!log.some((m) => m.type === "Search"), "le moteur n'est pas interroge");
	}
	delete global.Worker;
	t.done();
})().catch((e) => {
	console.log("  FAIL  " + (e && e.stack || e));
	console.log("pean engine level: 0 passed, 1 failed");
	process.exit(1);
});
