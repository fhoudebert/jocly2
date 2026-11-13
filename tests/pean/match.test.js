/*
 * Une vraie partie par l'API publique (dist/node), IA uct des deux cotes,
 * sur Leuctres puis sur la bataille libre (deploiements compris), la
 * bataille choisie au prelude ; puis un prelude joue par la machine.
 * Demande `npx gulp build` ; sans build, la suite saute.
 *
 *   node tests/pean/match.test.js [coups]
 */
const fs = require("fs");
const path = require("path");
const { suite } = require("./harness.js");

const DIST = path.join(__dirname, "..", "..", "dist", "node");
if(!fs.existsSync(path.join(DIST, "jocly.core.js")) ||
		!fs.existsSync(path.join(DIST, "games", "pean", "pean-model.js"))) {
	console.log("SKIP - needs `npx gulp build`");
	process.exit(0);
}

const Jocly = require(path.join(DIST, "jocly.core.js"));
const t = suite("pean match");
const PLIES = parseInt(process.argv[2], 10) || 6;

async function run(name, plies) {
	const match = await Jocly.createMatch("pean");
	const config = await match.getConfig();
	const level = Object.assign({}, config.model.levels[0], { maxDuration: 0.4, maxLoops: 12 });
	t.eq(config.model.levels.map((l) => l.label), ["Caporal", "Capitaine", "Général", "Maréchal"], name + " : trois niveaux uct et le Maréchal");
	// le prelude : la bataille, puis l'etape vide
	const k = config.model.gameOptions.scenarios.findIndex((sc) => sc.id === name);
	t.ok((await match.applyMove({ setup: k })).finished === false, name + " : choisi au prelude (#" + k + ")");
	await match.applyMove({ skip: 1 });
	t.eq([match.game.g.ctx.id, match.game.mBoard.mWho], [name, 1], name + " : la bataille commence, au premier camp");
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
	await run("leuctres-371", PLIES);
	const libre = await run("bataille-libre", 3);
	t.eq(libre.game.mBoard.phase, 2, "bataille libre : apres les deux deploiements, phase de jeu");
	// la machine repond elle-meme au prelude
	const match = await Jocly.createMatch("pean");
	const config = await match.getConfig();
	const level = Object.assign({}, config.model.levels[0], { maxDuration: 0.4, maxLoops: 12 });
	const first = await match.machineSearch({ level, threaded: false });
	t.ok(first.move && first.move.setup >= 0 && first.move.setup < 4, "la machine choisit une bataille");
	await match.applyMove(first.move);
	const second = await match.machineSearch({ level, threaded: false });
	t.ok(second.move && second.move.skip, "puis rend la main");
	await match.applyMove(second.move);
	t.eq(match.game.mBoard.preludeStage, -1, "prelude fini");
	t.done();
})().catch((e) => {
	console.log("CRASH " + (e && e.stack || e));
	process.exit(1);
});
