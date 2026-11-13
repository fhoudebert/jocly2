/*
 * Une vraie partie par l'API publique (dist/node), IA uct des deux cotes,
 * sur Leuctres puis sur la bataille libre (deploiements compris).
 * Demande `npx gulp build` ; sans build, la suite saute.
 *
 *   node tests/pean/match.test.js [coups]
 */
const fs = require("fs");
const path = require("path");
const { suite } = require("./harness.js");

const DIST = path.join(__dirname, "..", "..", "dist", "node");
if(!fs.existsSync(path.join(DIST, "jocly.core.js")) ||
		!fs.existsSync(path.join(DIST, "games", "pean", "pean-leuctres-model.js"))) {
	console.log("SKIP - needs `npx gulp build`");
	process.exit(0);
}

const Jocly = require(path.join(DIST, "jocly.core.js"));
const t = suite("pean match");
const PLIES = parseInt(process.argv[2], 10) || 6;

async function run(name, plies) {
	const match = await Jocly.createMatch(name);
	const config = await match.getConfig();
	const level = Object.assign({}, config.model.levels[0], { maxDuration: 0.4, maxLoops: 12 });
	t.eq(config.model.levels.map((l) => l.label), ["Caporal", "Capitaine", "Général", "Maréchal"], name + " : trois niveaux uct et le Maréchal");
	let finished = false, n = 0;
	const notation = [];
	while(!finished && n < plies) {
		const result = await match.machineSearch({ level, threaded: false });
		t.ok(result && result.move, name + " coup " + (n + 1) + " : la recherche rend un coup");
		notation.push(await match.getMoveString(result.move));
		const applied = await match.applyMove(result.move);
		finished = applied.finished;
		n++;
	}
	console.log("  " + name + " : " + notation.join(" | ").slice(0, 300));
	t.ok(n === plies || finished, name + " : " + n + " coups joues");
	return match;
}

(async () => {
	await run("pean-leuctres", PLIES);
	const libre = await run("pean-bataille-libre", 3);
	t.eq(libre.game.mBoard.phase, 2, "bataille libre : apres les deux deploiements, phase de jeu");
	t.done();
})().catch((e) => {
	console.log("CRASH " + (e && e.stack || e));
	process.exit(1);
});
