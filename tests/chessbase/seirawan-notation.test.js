/*
 * Seirawan++ : la notation des coups.
 *
 *   node tests/chessbase/seirawan-notation.test.js
 *
 * Une partie ne se relit que si chaque coup s'écrit d'UNE seule façon, et
 * qu'aucune écriture n'est partagée par deux coups : c'est sur la chaîne que
 * Tabulon et pickMove retrouvent le coup d'un fichier PJN.
 *
 * Le défaut gardé ici : le socle écrit l'échec APRÈS la promotion
 * (« Qd1-h5=Q+ »), et le modèle ne retirait le « =X » factice qu'en fin de
 * chaîne. Dès qu'un coup de la rangée arrière donnait échec, on lisait donc un
 * cavalier promu en cavalier, et l'entrée se collait derrière l'échec :
 * « Qd1-h5=C+/C ».
 */

const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const DIST = path.join(ROOT, "dist", "node", "jocly.core.js");
if(!fs.existsSync(DIST)) {
	console.log("SKIP - no build yet: run npx gulp build first");
	process.exit(0);
}
const Jocly = require(DIST);
const t = require(path.join(ROOT, "tests", "fairy", "harness.js")).runner();

const GAME = "seirawan-chess";

async function started(setup) {
	const m = await Jocly.createMatch(GAME);
	for (let ply = 0; ply < 2; ply++) {
		const list = await m.getPossibleMoves();
		const said = await m.getMoveString(list);
		if (!said.every((n) => /^(#\d+|--)$/.test(n))) break;
		const want = said.indexOf("#" + setup);
		await m.playMove(list[want >= 0 ? want : 0]);
	}
	return m;
}

async function play(m, seq) {
	for (const s of seq) {
		const list = await m.getPossibleMoves();
		const said = await m.getMoveString(list);
		const i = said.indexOf(s);
		if (i < 0) throw new Error("coup introuvable : " + s + " parmi " + said.join(" "));
		await m.playMove(list[i]);
	}
}

(async function () {

	/* -------------------------------------- l'échec d'un coup de la rangée arrière */
	{
		const m = await started(0);
		await play(m, ["e2-e4", "f7-f6"]);
		const said = await m.getMoveString(await m.getPossibleMoves());
		const queen = said.filter((s) => /^Qd1-h5/.test(s)).sort();
		t.check("Qh5+ : sans promotion factice, l'entrée AVANT l'échec",
			queen, ["Qd1-h5+", "Qd1-h5/C+", "Qd1-h5/M+"]);
		t.check("aucun coup ne s'écrit « =X+/Y »",
			said.filter((s) => /=[A-Z][+#]/.test(s) && /\//.test(s)), []);
	}

	/* ---------------------------------------------- le roque et ses deux entrées */
	{
		const m = await started(0);
		await play(m, ["g2-g3", "b7-b6", "Ng1-f3", "Bc8-b7/M", "Bf1-g2", "Ng8-f6/C"]);
		const said = await m.getMoveString(await m.getPossibleMoves());
		t.check("le roque s'écrit avec la pièce ET la case d'entrée",
			said.filter((s) => /^O-O/.test(s)).sort(),
			["O-O", "O-O/Ce1", "O-O/Ch1", "O-O/Me1", "O-O/Mh1"]);
	}

	/*
	 * ------------------------------- chaque écriture désigne UN coup, et un seul
	 *
	 * Des parties au hasard, dans quatre arrangements, jusqu'au bout ou à 80
	 * demi-coups : à chaque position, les chaînes des coups légaux doivent
	 * être toutes différentes, et aucune ne doit annoncer une promotion d'une
	 * pièce en elle-même.
	 */
	let seed = 12345;
	const rand = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
	let positions = 0, clashes = [], selfPromos = [];
	/*
	 * Quatre arrangements, deux parties chacun : assez pour plusieurs
	 * centaines de positions, ce que la verification finale exige. Quatre
	 * parties par arrangement doublaient la duree sans rien couvrir de plus
	 * -- les collisions d'ecriture, quand il y en a, se voient des les
	 * premiers coups, l'ecriture d'un coup ne dependant que de la position.
	 */
	for (const setup of [0, 3, 4, 9]) {
		for (let game = 0; game < 2; game++) {
			const m = await started(setup);
			for (let ply = 0; ply < 80; ply++) {
				const list = await m.getPossibleMoves();
				if (!list.length) break;
				const said = await m.getMoveString(list);
				positions++;
				const seen = {};
				said.forEach((s) => { if (seen[s]) clashes.push(s); seen[s] = true; });
				said.forEach((s) => {
					const p = /^([A-Z])[a-h][1-8][-x][a-h][1-8]=([A-Z])/.exec(s);
					if (p && p[1] === p[2]) selfPromos.push(s);
				});
				// Les coups qui donnent échec en priorité : ce sont eux que le
				// défaut touchait.
				const checks = said.map((s, i) => /\+$/.test(s) ? i : -1).filter((i) => i >= 0);
				const pick = checks.length && rand(3) === 0 ? checks[rand(checks.length)] : rand(list.length);
				await m.playMove(list[pick]);
				if ((await m.getFinished()).finished) break;
			}
		}
	}
	t.check("positions parcourues (" + positions + ")", positions > 400, true);
	t.check("aucune écriture partagée par deux coups", clashes.slice(0, 5), []);
	t.check("aucune promotion d'une pièce en elle-même", selfPromos.slice(0, 5), []);

	/* ------------------------------------- le nom standard de l'arrangement 0 */
	{
		const config = await Jocly.getGameConfig(GAME);
		const expert = config.model.levels.find((l) => l.ai === "fairy-stockfish");
		const first = expert.variants.find((v) => v.setup === 0);
		t.check("l'arrangement 0 se déclare « seirawan » pour les PGN", first.pgnVariant, "seirawan");
		t.check("avec ses lettres : H(awk) = cardinal, E(lephant) = marshall",
			first.pieceMap, { C: "H", M: "E" });
	}

	t.done("Seirawan++ : notation");
})().catch((e) => { console.error(e); process.exit(1); });
