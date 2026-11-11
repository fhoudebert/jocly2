/*
 * Une vraie partie par l'API publique (dist/node), IA uct des deux cotes :
 * placement, recherche, application des coups, table des repetitions.
 * Demande `npx gulp build` ; sans build, la suite saute.
 *
 *   node tests/kriegspiel/match.test.js [coups]
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
const t = suite("kriegspiel match");
const PLIES = parseInt(process.argv[2], 10) || 14;

(async () => {
	const match = await Jocly.createMatch("jeu-de-la-guerre");
	const config = await match.getConfig();
	const level = Object.assign({}, config.model.levels[0], { maxDuration: 0.3, maxLoops: 15 });
	t.eq(config.model.levels.map((l) => l.label), ["Rapide", "Normal", "Fort", "Moyen (moteur)"], "quatre niveaux");
	let finished = false, plies = 0;
	const notation = [];
	while(!finished && plies < PLIES) {
		const result = await match.machineSearch({ level, threaded: false });
		t.ok(result && result.move, "coup " + (plies + 1) + " : la recherche rend un coup");
		notation.push(await match.getMoveString(result.move));
		const applied = await match.applyMove(result.move);
		finished = applied.finished;
		plies++;
		if(plies === 2)
			t.eq(match.game.mBoard.phase, 2, "apres les deux placements, phase de jeu");
		// la table des repetitions ne doit garder aucune visite de la
		// recherche : une signature par coup joue, pas davantage
		const visits = Object.keys(match.game.mVisitedBoards).length;
		t.ok(visits <= plies, "coup " + plies + " : pas de visite fantome dans la table des repetitions (" + visits + ")");
		if(finished)
			t.ok(match.game.mBoard.over !== 0 || applied.winner === Jocly.DRAW, "une fin de partie a une cause");
	}
	t.ok(/^Nord: I@/.test(notation[0]) && /^Sud: I@/.test(notation[1]), "les deux premiers coups sont les placements");
	t.ok(plies === PLIES || finished, "la partie avance sans exception");
	// sauvegarde et rechargement : chaque coup repasse IsValidMove
	const saved = await match.save();
	const again = await Jocly.createMatch("jeu-de-la-guerre");
	await again.load(saved);
	t.eq(again.game.mBoard.grid, match.game.mBoard.grid, "partie rechargee a l'identique");
	t.done();
})().catch((e) => {
	console.log("  FAIL  " + (e && e.stack || e));
	console.log("kriegspiel match: 0 passed, 1 failed");
	process.exit(1);
});
