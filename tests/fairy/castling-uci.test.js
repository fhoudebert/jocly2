/*
 * Le roque d'une seule case, tel que le moteur l'ecrit.
 *
 *   node tests/fairy/castling-uci.test.js
 *
 * AU MALETT (minichess 5x5, arrangement 2), le roi roque de c1 vers b1 : une
 * seule case. Le format « engine » de jocly ecrit alors le roque « c1b1 »,
 * exactement comme le simple pas de roi c1-b1. Fairy-Stockfish ne s'y trompe
 * pas : il ecrit ce roque ROI-PREND-TOUR, « c1a1 », et garde « c1b1 » pour le
 * pas de roi.
 *
 * jocly.fairy.js ne connaissait pas « c1a1 » : la recherche approchee jouait
 * la chaine la plus proche, « c1b1 » -- le pas de roi. L'Expert voulait roquer,
 * il deplacait son roi, et seule la console le disait. Trouve en rejouant
 * toutes les ini maison contre le vrai moteur, dans un navigateur.
 *
 * Le moteur est ici un faux, qui repond exactement ce que Fairy-Stockfish
 * repond dans cette position : c'est la TRADUCTION qu'on verifie, pas la
 * recherche.
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
const JoclyFairy = require(path.join(ROOT, "dist", "node", "jocly.fairy.js")).JoclyFairy;
const t = require("./harness.js").runner();

// Un moteur qui repond toujours `answer`, et retient ce qu'on lui a demande.
function fakeEngine(answer) {
	const asked = [];
	const provider = function () {
		const worker = {
			onmessage: null,
			postMessage(message) {
				const reply = (data) => setTimeout(() => worker.onmessage && worker.onmessage({ data }), 0);
				if(message.type === "Init") return reply({ type: "Ready" });
				if(message.type === "Search") {
					asked.push(message);
					return reply({ type: "Done", data: { bestMoveUci: answer } });
				}
			},
			terminate() {},
		};
		return worker;
	};
	provider.asked = asked;
	return provider;
}

// Malett, le cavalier blanc sorti de b1 : le roque est permis.
async function malettReadyToCastle() {
	const m = await Jocly.createMatch("minichess5x5-chess");
	const pick = async (test) => {
		const list = await m.getPossibleMoves();
		const said = await m.getMoveString(list);
		const i = said.findIndex(test);
		if(i < 0) throw new Error("coup introuvable parmi " + said.join(" "));
		await m.playMove(list[i]);
	};
	await pick((s) => s === "#2");
	const said = await m.getMoveString(await m.getPossibleMoves());
	if(said.every((s) => /^(#\d+|--)$/.test(s))) await pick(() => true);
	await pick((s) => /^Nb1-c3/.test(s));
	// Les Noirs jouent n'importe quoi : seul le roque blanc nous interesse.
	await pick((s) => /^[a-e]4-[a-e]3$/.test(s));
	return m;
}

async function engineMove(answer) {
	const m = await malettReadyToCastle();
	const config = await m.getConfig();
	const level = Object.assign({}, config.model.levels.find((l) => l.ai === "fairy-stockfish"),
		{ moveTimeMs: 10 });
	const errors = [];
	const realError = console.error;
	console.error = (...args) => { errors.push(String(args[0]).split("\n")[0]); };
	const provider = fakeEngine(answer);
	JoclyFairy.setEngineProvider(provider);
	try {
		const result = await m.machineSearch({ level });
		return { said: (await m.getMoveString(result.move)), errors, variant: provider.asked[0] && provider.asked[0].variant };
	} finally {
		console.error = realError;
		JoclyFairy.setEngineProvider(null);
	}
}

(async function () {
	// La position d'abord : les deux coups s'ecrivent pareil au format engine.
	{
		const m = await malettReadyToCastle();
		const list = await m.getPossibleMoves();
		const said = await m.getMoveString(list);
		const engine = await m.getMoveString(list, "engine");
		const both = said.filter((s, i) => engine[i] === "c1b1").sort();
		t.check("au format engine, roque et pas de roi s'ecrivent tous deux c1b1", both, ["Kc1-b1", "O-O"]);
	}

	// Le roque, ecrit roi-prend-tour par le moteur.
	{
		const r = await engineMove("c1a1");
		t.check("la recherche part bien vers le Malett", r.variant, "malettchess");
		t.check("« c1a1 » est joue comme le roque", r.said, "O-O");
		t.check("sans passer par la recherche approchee", r.errors.filter((e) => /not among/.test(e)), []);
	}

	// Le pas de roi, ecrit c1b1 : c'est lui, et pas le roque.
	{
		const r = await engineMove("c1b1");
		t.check("« c1b1 » est joue comme le pas de roi", r.said, "Kc1-b1");
		t.check("sans rien rattraper non plus", r.errors.filter((e) => /not among/.test(e)), []);
	}

	t.done("Roque d'une case, en UCI");
})().catch((e) => { console.error(e); process.exit(1); });
