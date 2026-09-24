/*
 * L'Expert contre un VRAI moteur, sur toutes les ini maison.
 *
 *   node tests/fairy/native-engine.test.js
 *
 * CETTE SUITE NE TOURNE QUE SI UN MOTEUR EST LA. Elle cherche, dans l'ordre :
 *
 *   1. un binaire « fairy-stockfish » DANS CE REPERTOIRE-CI (tests/fairy/) ;
 *   2. $JOCLY_FAIRY_BINARY ;
 *   3. verif-ini/fairy-stockfish, a la racine du depot.
 *
 * Sans lui, elle SAUTE -- le depot ne porte pas de binaire, et une suite qui
 * exigerait un telechargement ne pourrait pas tourner chez tout le monde. Y
 * deposer un Fairy-Stockfish (construit avec largeboards=yes) suffit a
 * l'allumer :
 *
 *   cp /chemin/vers/fairy-stockfish tests/fairy/
 *   node tests/fairy/native-engine.test.js
 *
 * CE QU'ELLE MESURE. Une partie Expert contre Expert par couple
 * jeu/arrangement declarant un customVariantIni -- quinze jeux, trente-huit
 * couples -- et, a chaque coup, si jocly.fairy.js a du le « rattraper » :
 * un coup rendu par le moteur qui ne figure pas dans la liste de jocly,
 * remplace par le plus proche. C'est la trace commune de deux fautes :
 *
 *   - le moteur repond pour une AUTRE position (la reponse perimee collee a
 *     la sortie suivante, corrigee dans jocly.fairyworker.js) ;
 *   - le moteur ECRIT un coup que jocly ne sait pas relire (le roque d'une
 *     seule case, ecrit roi-prend-tour, corrige dans ResolveMove).
 *
 * Aucune des deux ne se voit a l'oeil : le coup de remplacement est legal, la
 * partie continue, et seule la console proteste. C'est pour ca que cette suite
 * ecoute console.error plutot que de regarder le plateau.
 *
 * Et une troisieme, qu'on ne voit pas non plus : chaque partie tient un
 * processus de moteur, rendu par destroy(). Trente-huit parties de suite sans
 * cette liberation ont epuise la memoire de la machine ou ce test a ete ecrit.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const DIST = path.join(ROOT, "dist", "node");
if(!fs.existsSync(path.join(DIST, "jocly.core.js"))) {
	console.log("SKIP - no build yet: run npx gulp build first");
	process.exit(0);
}

const CANDIDATES = [
	path.join(__dirname, "fairy-stockfish"),
	path.join(__dirname, "fairy-stockfish.exe"),
	process.env.JOCLY_FAIRY_BINARY,
	path.join(ROOT, "verif-ini", "fairy-stockfish"),
];
const BINARY = CANDIDATES.find((p) => p && fs.existsSync(p));
if(!BINARY) {
	console.log("SKIP - no engine: drop a fairy-stockfish binary (largeboards=yes) in tests/fairy/");
	process.exit(0);
}

const Jocly = require(path.join(DIST, "jocly.core.js"));
const JoclyFairy = require(path.join(DIST, "jocly.fairy.js")).JoclyFairy;
const JoclyFairyNative = require(path.join(DIST, "jocly.fairynative.js")).JoclyFairyNative;
const t = require("./harness.js").runner();

const PLIES = +(process.env.JOCLY_FAIRY_PLIES || 10);
const MOVETIME = +(process.env.JOCLY_FAIRY_MOVETIME || 40);

/* Les coups rattrapes, tels que jocly.fairy.js les signale. */
const caught = [];
const realError = console.error;
console.error = function (...args) {
	const text = String(args[0] || "");
	if(/not among Jocly's legal moves/.test(text)) caught.push(text.split("\n")[0]);
	else realError.apply(console, args);
};

/** Combien de moteurs tournent ? Rend null la ou `ps` n'existe pas. */
function engineCount() {
	try {
		const name = path.basename(BINARY);
		return execSync("ps -eo args", { encoding: "utf8" })
			.split("\n").filter((l) => l.indexOf(name) >= 0 && !/\bnode\b|ps -eo/.test(l)).length;
	} catch (e) {
		return null;
	}
}

/** Repond au prelude, s'il y en a un, par l'arrangement demande. */
async function started(game, setup) {
	const match = await Jocly.createMatch(game);
	for(let d = 0; d < 4; d++) {
		const list = await match.getPossibleMoves();
		const said = await match.getMoveString(list);
		if(!said.length || !said.every((s) => /^(#\d+|--)$/.test(s))) break;
		const want = setup === null ? -1 : said.indexOf("#" + setup);
		await match.playMove(list[want >= 0 ? want : 0]);
	}
	return match;
}

async function customIniTargets() {
	const list = [];
	for(const name of Object.keys(await Jocly.listGames())) {
		const config = await Jocly.getGameConfig(name).catch(() => null);
		if(!config) continue;
		for(const level of config.model.levels || []) {
			if(level.ai !== "fairy-stockfish") continue;
			if(Array.isArray(level.variants)) {
				for(const v of level.variants)
					if(v.customVariantIni || level.customVariantIni)
						list.push({ game: name, setup: v.setup, variant: v.variant });
			} else if(level.customVariantIni)
				list.push({ game: name, setup: null, variant: level.variant });
		}
	}
	return list;
}

(async function () {
	JoclyFairy.setEngineProvider(JoclyFairyNative.provider({ binary: BINARY }));
	const baseline = engineCount();
	const targets = await customIniTargets();
	t.check("des variantes a ini maison sont declarees", targets.length > 10, true);

	const trouble = [], idle = [], fallbacks = [];
	let plies = 0;
	for(const target of targets) {
		const before = caught.length;
		let played = 0;
		const match = await started(target.game, target.setup);
		const config = await match.getConfig();
		const level = Object.assign({},
			config.model.levels.find((l) => l.ai === "fairy-stockfish"), { moveTimeMs: MOVETIME });
		for(let ply = 0; ply < PLIES; ply++) {
			const result = await match.machineSearch({ level });
			// Un repli sur l'IA native de jocly veut dire que le moteur n'a
			// pas pu servir : binaire trop ancien, variante refusee, ini
			// illisible. Ce n'est pas un rattrapage, mais ce n'est pas un
			// succes non plus -- la suite n'aurait alors rien mesure.
			if(result.fairyFallback) { fallbacks.push(label(target)); break; }
			if(!result.move) break;
			const outcome = await match.playMove(result.move);
			played++;
			if(outcome && outcome.finished) break;
		}
		// Rend le processus du moteur : un par partie.
		await match.destroy();
		plies += played;
		if(caught.length > before) trouble.push(label(target) + " : " + (caught.length - before) + " coup(s), "
			+ caught[before].replace(/^fairy-stockfish: /, "").slice(0, 90));
		if(!played) idle.push(label(target));
	}
	function label(target) {
		return target.game + " #" + (target.setup === null ? "-" : target.setup);
	}

	console.log("  (" + targets.length + " variantes, " + plies + " coups joues a " + MOVETIME + " ms)");
	t.check("le moteur a servi partout", fallbacks, []);
	t.check("chaque variante a joue au moins un coup", idle, []);
	t.check("aucun coup du moteur n'a ete rattrape par « le plus proche »", trouble, []);

	if(baseline !== null) {
		// Laisse au systeme le temps de reclamer les processus sortis.
		await new Promise((r) => setTimeout(r, 500));
		t.check("aucun moteur laisse derriere soi", engineCount(), baseline);
	}

	console.error = realError;
	t.done("Moteur natif : les ini maison");
})().catch((e) => { console.error = realError; console.error(e); process.exit(1); });
