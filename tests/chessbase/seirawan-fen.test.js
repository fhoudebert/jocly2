/*
 * Seirawan++ : le FEN, écrit et relu.
 *
 *   node tests/chessbase/seirawan-fen.test.js
 *
 * CE QUI SE JOUE ICI. La grille interne a dix colonnes et écrit les pièces en
 * attente « C! », mais elle ne dit RIEN des cases encore ouvertes à l'entrée :
 * une position enregistrée en milieu de partie se rouvrait donc avec ses seize
 * portes rouvertes, et une pièce entrait là où la règle ne le permet plus.
 *
 * Le FEN du S-Chess, lui, les porte dans son champ de roque -- et c'est aussi
 * celui qu'écrivent PyChess et Fairy-Stockfish. C'est désormais celui du jeu.
 * Les deux formes se LISENT, pour que les parties déjà enregistrées s'ouvrent.
 *
 * Trois défauts sont gardés ici, et aucun ne se verrait à l'œil :
 *   - une porte fermée qui se rouvre au rechargement ;
 *   - un pion relu sur sa case de départ + une rangée, qui se remet à avancer
 *     de deux cases ;
 *   - le prélude qui se redemande alors que la position dit déjà la paire.
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
	for (let d = 0; d < 2; d++) {
		const list = await m.getPossibleMoves();
		const said = await m.getMoveString(list);
		if (!/^(#\d+|--)$/.test(said[0] || "")) break;
		const want = said.indexOf("#" + (setup === undefined ? 0 : setup));
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
	return m;
}

async function reopen(fen) {
	const m = await Jocly.createMatch(GAME);
	await m.load({ game: GAME, initialBoard: fen, playedMoves: [] });
	return m;
}

const moveList = async (m) => (await m.getMoveString(await m.getPossibleMoves())).sort();

(async function () {

	/* ---------------------------------------------------- la position de départ */
	{
		const m = await started(0);
		const fen = await m.getBoardState();
		t.check("la position de départ est celle du S-Chess",
			fen.split(" ").slice(0, 3).join(" "),
			"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[CMcm] w KQBCDFGkqbcdfg");
		/*
		 * Le champ dit les droits de roque PUIS les colonnes encore ouvertes.
		 * K et Q couvrent déjà e1/h1 et e1/a1 -- c'est ainsi que le moteur les
		 * écrit, et ExportFairyFen les omet pour cette raison : les huit cases
		 * de la rangée arrière sont donc bien ouvertes.
		 */
		const back = await reopen(fen);
		t.check("elle se relit à l'identique", await back.getBoardState(), fen);
		t.check("et sans redemander la paire", (await moveList(back))[0] !== "#0", true);
		t.check("les mêmes coups y sont légaux", await moveList(back), await moveList(m));
	}

	/* ------------------------------------------- un milieu de partie, avec portes fermées */
	{
		const m = await play(await started(0),
			["g2-g3", "b7-b6", "Ng1-f3", "Bc8-b7/M", "Bf1-g2", "Ng8-f6/C", "O-O/Ce1", "Mc8-d6"]);
		const fen = await m.getBoardState();
		const field = fen.split(" ")[2];

		// Blanc a roqué et fait entrer son cardinal : plus de roque, et seules
		// restent ouvertes les cases dont la pièce n'a pas bougé.
		t.check("le champ dit ce qui reste ouvert", field, "ABCDkq");
		t.check("la poche ne garde que ce qui attend encore", /\[M\]/.test(fen), true);

		const back = await reopen(fen);
		t.check("un milieu de partie se relit à l'identique", await back.getBoardState(), fen);
		t.check("avec exactement les mêmes coups", await moveList(back), await moveList(m));

		/*
		 * LA PORTE FERMÉE. g1 a été quittée par le cavalier, donc plus aucune
		 * entrée par là -- et c'est ce que l'ancien FEN perdait.
		 */
		const entries = (await moveList(back)).filter((n) => /\//.test(n));
		t.check("aucune entrée par une case déjà quittée",
			entries.filter((n) => /^(Nf3|Bg2|Rf1|Kg1)/.test(n)), []);
		t.check("mais les cases intactes en offrent encore",
			entries.some((n) => /^Nb1/.test(n)), true);
	}

	/* --------------------------------------------------------- le pion importé */
	{
		const m = await play(await started(0), ["g2-g3", "b7-b6"]);
		const back = await reopen(await m.getBoardState());
		const said = await moveList(back);
		t.check("un pion relu sur g3 n'avance plus de deux cases",
			said.filter((n) => /^g3-/.test(n)), ["g3-g4"]);
		t.check("celui qui n'a pas bougé le peut toujours",
			said.filter((n) => /^h2-/.test(n)), ["h2-h3", "h2-h4"]);
	}

	/* ------------------------------------------ un autre arrangement, lu du FEN */
	{
		// La paire est dans la poche : « H » et « I » sont le phénix et le
		// kirin du chu shogi (arrangement 4). Rien d'autre ne la dit.
		const back = await reopen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[HIhi] w KQBCDFGkqbcdfg - 0 1");
		const entries = (await moveList(back)).filter((n) => /\//.test(n));
		t.check("la poche désigne la paire, sans prélude",
			entries.filter((n) => /^Nb1-a3/.test(n)).sort(), ["Nb1-a3/H", "Nb1-a3/I"]);
	}

	/* ------------------------------------------- l'ANCIENNE forme se lit encore */
	{
		// Ce qu'écrivait la grille interne : dix colonnes, « C! » aux portes.
		// Les parties enregistrées avant ce changement en sont pleines.
		const old = "rnbqkbnrc!m!/pppppppp2/10/10/10/10/PPPPPPPP2/RNBQKBNRC!M! w KQkq - 0 2";
		const back = await reopen(old);
		const said = await moveList(back);
		t.check("l'ancienne forme ouvre toujours une partie jouable", said.length > 20, true);
		t.check("et ses pièces en attente entrent",
			said.filter((n) => /^Nb1-a3/.test(n)).sort(), ["Nb1-a3", "Nb1-a3/C", "Nb1-a3/M"]);
		t.check("elle se réécrit dans la forme actuelle",
			(await back.getBoardState()).split(" ")[0],
			"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[CMcm]");
	}

	/* ------------------------------ un FEN venu d'ailleurs : refus, pas repli */
	{
		/*
		 * PyChess écrit « [HEhe] » : le faucon et l'éléphant du S-Chess. Les
		 * deux lettres existent ici, mais dans deux arrangements DIFFÉRENTS
		 * (le phénix du chu, l'éléphant du shako) -- la position s'ouvrirait
		 * donc avec les mauvaises pièces, sans rien dire. À l'appelant de
		 * traduire les lettres (Tabulon le fait, `pieceMap`).
		 */
		let refused = null;
		try { await reopen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[HEhe] w KQBCDFGkqbcdfg - 0 1"); }
		catch (e) { refused = e; }
		t.check("une poche d'un autre alphabet est refusée", !!refused, true);

		// Et un refus, pas un échiquier amputé : le socle, lui, se serait
		// contenté de sauter le crochet et d'ouvrir une partie sans pièces en
		// attente.
		t.check("le message dit que la lecture a échoué",
			/import failed/.test(refused && refused.message || ""), true);

		// Une paire qui existe bel et bien passe, elle.
		const ok = await reopen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[JMjm] w KQBCDFGkqbcdfg - 0 1");
		t.check("celle du Khan, qui emprunte le marshall, est acceptée",
			/\[JMjm\]/.test(await ok.getBoardState()), true);
	}

	t.done("Seirawan++ : le FEN");
})().catch((e) => { console.error(e); process.exit(1); });
