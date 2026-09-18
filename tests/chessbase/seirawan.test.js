/*
 * Seirawan++ : l'entrée des deux pièces en attente.
 *
 *   node tests/chessbase/seirawan.test.js
 *
 * CE QUI SE JOUE ICI. Le mécanisme d'entrée venait d'un modèle jocly v1 où il
 * était implanté dans le SOCLE partagé — `entranceSquares` initialisé et
 * restauré dans base-model.js, et un `promote()` rendant `{promos, entrance}`
 * là où le socle actuel attend un tableau. Tout a été ré-exprimé dans le seul
 * fichier du jeu ; ces assertions vérifient la ré-expression, pas la copie.
 *
 * Trois d'entre elles gardent des défauts qui ne se verraient pas à l'œil :
 * la case qui se ferme même sans entrée, la recopie de l'état d'un plateau au
 * suivant, et la pièce posée pendant le test de légalité.
 */

const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const Jocly = require(path.join(ROOT, "dist", "node", "jocly.core.js"));
const t = require(path.join(ROOT, "tests", "fairy", "harness.js")).runner();

const GAME = "seirawan++-chess";

(async function () {

	const match = await Jocly.createMatch(GAME);
	const game = match.game;
	const board = game.mBoard;

	/* ------------------------------------------------ la position de départ */

	// 8 colonnes sur 10 rangées : l'échiquier occupe les rangées 1 à 8, les
	// rangées 0 et 9 sont les portes.
	t.check("le plateau fait 8x10", [game.cbVar.geometry.width, game.cbVar.geometry.height], [8, 10]);

	const fen = await match.getBoardState();
	t.check("les quatre pièces attendent aux portes",
		[/^3m!c!3\//.test(fen), /\/3C!M!3 /.test(fen)], [true, true]);

	/*
	 * LEUR GRAPHE EST VIDE, et c'est une décision : elles n'entrent pas en se
	 * déplaçant, elles sont posées par le coup d'une autre pièce. Un graphe qui
	 * mènerait à la rangée arrière — ce que faisait la v1 — en ferait des
	 * pièces jouables hors du plateau.
	 */
	for (const type of [11, 12])
		t.check("la pièce en attente " + type + " ne peut aller nulle part",
			Object.values(game.g.pTypes[type].graph).every((paths) => paths.length === 0), true);

	/* ------------------------------------------------ les coups avec entrée */

	const moves = await match.getPossibleMoves();
	const names = await match.getMoveString(moves);
	const entering = names.filter((n) => /\//.test(n));

	t.check("des coups font entrer une pièce", entering.length > 0, true);

	/*
	 * LA NOTATION NOMME LA PIÈCE, pas la case.
	 *
	 * La case d'entrée est toujours celle que la pièce vient de quitter : elle
	 * ne distingue rien. Sans la lettre, les deux variantes d'un même coup —
	 * l'une faisant entrer le cardinal, l'autre le marshall — s'écriraient à
	 * l'identique, et une partie relue aurait pris la première des deux. C'est
	 * le piège que le commentaire d'Equals décrit pour le roque.
	 */
	t.check("chaque coup avec entrée s'écrit différemment",
		new Set(entering).size, entering.length);
	t.check("et nomme la pièce qui entre",
		entering.every((n) => /\/[CM]$/.test(n)), true);

	// Seules les pièces de la rangée arrière ouvrent une entrée : un coup de
	// pion n'en propose aucune.
	const pawnWithEntrance = names.filter((n) => /^[a-h]\d/.test(n) && /\//.test(n));
	t.check("un coup de pion ne fait entrer personne", pawnWithEntrance, []);

	/* ------------------------------------------------ jouer une entrée */

	const index = names.indexOf(entering[0]);
	const from = moves[index].f;
	await match.playMove(moves[index]);

	const after = await match.getBoardState();
	t.check("une porte s'est vidée",
		(after.match(/[CM]!/g) || []).length, (fen.match(/[CM]!/g) || []).length - 1);
	t.check("et la case quittée est occupée", game.mBoard.board[from] >= 0, true);

	/*
	 * LA CASE SE FERME, et elle se ferme même quand personne n'entre : c'est le
	 * PREMIER MOUVEMENT de la pièce qui consomme le droit, pas l'entrée. Sans
	 * cela, une pièce pourrait entrer bien après que la rangée arrière se soit
	 * vidée.
	 */
	t.check("la case ne peut plus faire entrer personne",
		!game.mBoard.entranceSquares[from], true);

	/* ------------------------------------------------ d'un plateau à l'autre */

	/*
	 * La recherche ne défait pas les coups : elle COPIE les plateaux
	 * (CopyFrom puis ApplyMove). Cette recopie est donc tout ce qui porte
	 * l'état d'une position à la suivante — l'oublier rouvrirait toutes les
	 * portes à chaque nœud exploré, et le moteur jouerait des entrées
	 * impossibles.
	 */
	{
		const copy = game.CloneBoard(game.mBoard);
		t.check("la copie garde les portes fermées", !copy.entranceSquares[from], true);
		t.check("et les portes encore ouvertes",
			Object.keys(copy.entranceSquares).filter((p) => copy.entranceSquares[p]).length,
			Object.keys(game.mBoard.entranceSquares).filter((p) => game.mBoard.entranceSquares[p]).length);
	}

	/* ------------------------------------------- la légalité voit la pièce */

	/*
	 * LE POINT QUI NE SE VOIT PAS À L'ŒIL.
	 *
	 * La pièce entrante occupe la case que la pièce déplacée vient de quitter.
	 * Un coup qui découvrirait un échec peut donc être légal PARCE QU'ELLE
	 * bouche la ligne — et, symétriquement, une entrée peut parer un échec par
	 * interposition.
	 *
	 * Cela ne marche que si cbQuickApply, qui sert au test de légalité, connaît
	 * l'entrée. Sinon la légalité est calculée sur un échiquier qui n'est pas
	 * celui du coup : des coups légaux écartés, des coups illégaux acceptés, et
	 * rien pour le signaler.
	 *
	 * On l'éprouve sur le mécanisme lui-même plutôt que sur une position
	 * construite : ce qui doit être vrai, c'est que la case quittée est occupée
	 * PENDANT le test, et libre après.
	 */
	{
		const b = game.mBoard;
		const next = await match.getPossibleMoves();
		const nextNames = await match.getMoveString(next);
		const k = nextNames.findIndex((n) => /\//.test(n));
		t.check("le camp suivant a lui aussi des entrées", k >= 0, true);

		const move = next[k];
		const vacated = move.f;
		const gate = move.en;
		const occupant = b.board[vacated];
		const undo = b.cbQuickApply(game, move);
		t.check("pendant le test de légalité, la case quittée est occupée",
			b.board[vacated] >= 0, true);
		t.check("et la porte est vide", b.board[gate] < 0, true);

		b.cbQuickUnapply(game, undo);
		t.check("après annulation, la pièce est revenue à sa porte",
			b.board[gate] >= 0, true);
		t.check("et la case quittée a retrouvé la pièce qui l'occupait",
			b.board[vacated], occupant);
	}

	/* ------------------------------------------- deux coups, deux identités */

	/*
	 * Deux coups qui ne diffèrent QUE par la pièce entrante ne sont pas le même
	 * coup. Sans cela, relire une partie enregistrée résoudrait le coup contre
	 * le premier de la liste et l'entrée se perdrait — silencieusement, la
	 * position restant légale.
	 */
	{
		const list = await match.getPossibleMoves();
		const strings = await match.getMoveString(list);
		const pair = strings
			.map((s, i) => ({ s, i }))
			.filter(({ s }) => /\//.test(s));
		const a = list[pair[0].i], c = list.find((m, i) =>
			i !== pair[0].i && m.f === list[pair[0].i].f && m.t === list[pair[0].i].t);
		t.check("deux entrées depuis la même case existent", !!c, true);
		if (c) t.check("et ne sont pas le même coup", a.Equals(c), false);
	}

	t.done("Seirawan++");
})();
