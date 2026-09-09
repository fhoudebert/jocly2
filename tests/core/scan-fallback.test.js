// Repli Scan -> IA native, rendu visible via result.fairyFallback.
//
// CE QUE CE TEST GARDE. Le niveau "Champion" des dames internationales est
// adosse au moteur Scan (ai: "scan"). Tant que jocly.scan.js n'avait pas de
// repli, un moteur absent -- c'est-a-dire le cas par defaut, le binaire
// n'etant pas livre -- finissait sur `mBestMoves = []` et un `Done()` : l'hote
// n'avait aucun coup a jouer et rendait la main au joueur, qui se retrouvait a
// jouer les deux couleurs SANS AUCUN MESSAGE. jocly.fairy.js et jocly.kata.js
// avaient deja leur repli ; ce fichier etait le dernier des trois sans.
//
// Sous Node il n'y a pas de Worker, donc le moteur est toujours indisponible
// et le repli toujours emprunte : le test est deterministe sans avoir a
// simuler une panne.
//
// Voir aussi tests/core/fairy-fallback.js, dont ce fichier est le pendant.

const Jocly = require("../../dist/node/jocly.core.js");

let PASS = 0, FAIL = 0;
function ok(c, msg) {
	if(c) { PASS++; console.log("  \u2713", msg); }
	else  { FAIL++; console.log("  \u2717 ECHEC:", msg); }
}

(async () => {
	// Les dames internationales sont le seul jeu a declarer un niveau scan :
	// les regles de Scan sont celles du 10x10, et le tableau de niveaux
	// partage par les onze autres variantes de dames ne le contient pas.
	const match = await Jocly.createMatch("draughts");
	const levels = (match.game.config.model.levels) || [];
	const champion = levels.find((l) => l && l.ai === "scan");
	const native = levels.filter((l) => l && l.ai !== "scan").pop();

	ok(!!champion, "draughts declare bien un niveau scan (\"" +
		((champion || {}).label || (champion || {}).name) + "\")");
	if(!champion) {
		console.log("\nRESULTAT scan-fallback:", PASS, "OK /", FAIL, "ECHEC");
		process.exit(1);
	}

	const r = await match.machineSearch({ level: champion });

	// LE POINT PRINCIPAL : un coup est joue. C'est ce qui manquait, et son
	// absence rendait la main au joueur au milieu de sa partie.
	ok(r && r.move, "un coup est renvoye (repli sur l'IA native)");
	ok(r && r.fairyFallback, "result.fairyFallback renseigne (le repli est signale)");

	const f = (r && r.fairyFallback) || {};
	ok(f.engine === "scan", "fairyFallback.engine = scan");
	ok(typeof f.reason === "string" && f.reason, "fairyFallback.reason decrit la cause");

	// Les DEUX niveaux sont nommes. Celui que le joueur a choisi reste affiche
	// dans la liste deroulante de l'hote : ne citer que le remplacant
	// laisserait croire a une erreur d'affichage plutot qu'a un repli.
	ok(f.requested === (champion.label || champion.name),
		"fairyFallback.requested nomme le niveau demande (\"" + f.requested + "\")");
	ok(typeof f.level === "string" && f.level && f.level !== f.requested,
		"fairyFallback.level nomme celui qui joue vraiment (\"" + f.level + "\")");
	ok(!native || f.level === (native.label || native.name),
		"et c'est le plus fort des niveaux non-scan");

	// Le drapeau voyage jusqu'a l'hote a travers une frontiere serialisante
	// (iframe, worker) : un champ qui ne survivrait pas au clonage serait
	// perdu la ou il sert.
	const cloned = (typeof structuredClone === "function")
		? structuredClone(r) : JSON.parse(JSON.stringify(r));
	ok(cloned.fairyFallback && cloned.fairyFallback.engine === "scan"
		&& cloned.fairyFallback.requested === f.requested,
		"fairyFallback survit au structured-clone (frontiere embarquee)");

	// Une fois consomme, il ne doit pas coller au jeu : sinon le coup suivant
	// le reporterait et l'hote avertirait a nouveau, sans raison.
	ok(match.game.mFairyFallback === undefined, "marqueur purge du jeu apres le coup");

	if(native) {
		const r2 = await match.machineSearch({ level: native });
		ok(r2 && r2.move, "le niveau natif renvoie un coup");
		ok(!r2.fairyFallback, "et ne signale aucun repli");
	}

	console.log("\nRESULTAT scan-fallback:", PASS, "OK /", FAIL, "ECHEC");
	process.exit(FAIL ? 1 : 0);
})().catch((e) => { console.error("ERREUR TEST", e); process.exit(2); });
