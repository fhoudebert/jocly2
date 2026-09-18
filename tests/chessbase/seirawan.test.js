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

const GAME = "seirawan-chess";

(async function () {

	const match = await Jocly.createMatch(GAME);
	const game = match.game;
	const board = game.mBoard;

	/* ------------------------------------------------ la position de départ */

	/*
	 * UN ÉCHIQUIER DE 8x8, plus quatre colonnes hors jeu — deux de chaque côté.
	 * Les pièces attendent dans celles de droite, à hauteur de la rangée
	 * arrière de leur camp.
	 *
	 * La première version étendait la HAUTEUR, et c'était faux deux fois : les
	 * portes y étaient des cases ordinaires où tout coulissant descendait dès
	 * qu'elles se libéraient (Ra2-a1, Ke2-d1…), et toutes les rangées étaient
	 * décalées — le pion e4 s'écrivait « e5 ».
	 */
	t.check("l'échiquier fait 8 rangées", game.cbVar.geometry.height, 8);
	t.check("avec des colonnes hors jeu", game.cbVar.geometry.width > 8, true);

	const fen = await match.getBoardState();
	t.check("les quatre pièces attendent de côté",
		[/rnbqkbnrc!m!/.test(fen), /RNBQKBNRC!M!/.test(fen)], [true, true]);

	/*
	 * AUCUN COUP NE MÈNE À UNE PORTE. C'est l'assertion qui manquait, et elle
	 * aurait attrapé la première géométrie d'emblée : les graphes sont
	 * désormais confinés à la zone de jeu, donc une porte vidée reste
	 * inaccessible.
	 */
	{
		const gates = [];
		for (const r of [0, 7]) for (const n of [10, 11]) gates.push(r * 12 + n);
		const all = await match.getPossibleMoves();
		t.check("aucun coup ne mène à une case d'attente",
			all.filter((m) => gates.includes(m.t & 0xffff)).length, 0);
	}

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

	/*
	 * LES CASES PORTENT LEUR NOM D'ÉCHECS.
	 *
	 * La grille fait douze colonnes, mais l'échiquier commence à la troisième :
	 * sans correction, le pion `a` s'appelle « c2 » et chaque notation de ce
	 * jeu est illisible. La correction est faite sur la GÉOMÉTRIE, donc la
	 * notation du socle, l'export FEN et la lecture d'un coup écrit en
	 * profitent ensemble — là où le crazyhouse doit la refaire dans sa propre
	 * réécriture de ToString, n'ayant de toute façon pas le choix.
	 */
	t.check("l'ouverture s'écrit comme aux échecs",
		names.filter((n) => /^a2-a[34]$/.test(n)).length, 2);
	t.check("et le cavalier part bien de b1",
		entering.some((n) => /^Nb1-/.test(n)), true);
	// Aller-retour : un coup écrit se relit sur la même case.
	t.check("un nom de case se relit",
		game.cbVar.geometry.PosName(game.cbVar.geometry.PosByName("e1")), "e1");

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

	/* ------------------------------------------------ le roque */

	/*
	 * LE ROQUE LIBÈRE DEUX CASES — celle du roi et celle de la tour — et le
	 * S-Chess laisse entrer sur l'une ou l'autre. C'est le seul coup qui offre
	 * un CHOIX de case : partout ailleurs la pièce se pose sur la case quittée,
	 * et il n'y a rien à dire.
	 *
	 * D'où deux choses à vérifier ensemble : que les quatre variantes existent,
	 * et qu'elles s'écrivent différemment. « O-O/C » ne dirait pas laquelle des
	 * deux cases le cardinal occupe, et deux roques indiscernables feraient
	 * perdre le choix à la relecture — le même piège que la lettre de la pièce
	 * a déjà réglé pour les coups ordinaires.
	 */
	{
		const fresh = await Jocly.createMatch(GAME);
		for (const want of ["Ng1-f3", "Ng8-f6", "e2-e3", "e7-e6", "Bf1-e2", "Bf8-e7"]) {
			const list = await fresh.getPossibleMoves();
			const said = await fresh.getMoveString(list);
			await fresh.playMove(list[said.indexOf(want)]);
		}
		const list = await fresh.getPossibleMoves();
		const said = await fresh.getMoveString(list);
		const castles = [...new Set(said.filter((n) => /^O-O/.test(n)))];

		t.check("le roque simple reste proposé", castles.includes("O-O"), true);
		t.check("avec une variante par pièce et par case",
			castles.filter((n) => /^O-O\/[CM][eh]1$/.test(n)).sort(),
			["O-O/Ce1", "O-O/Ch1", "O-O/Me1", "O-O/Mh1"]);

		// Jouer l'une d'elles : la tour et le roi bougent, et la pièce entrante
		// prend la case nommée — pas l'autre.
		const chosen = said.indexOf("O-O/Mh1");
		const gate = list[chosen].en;
		await fresh.playMove(list[chosen]);
		const board = fresh.game.mBoard;
		const h1 = fresh.game.cbVar.geometry.PosByName("h1");
		t.check("la pièce entrante occupe la case nommée", board.board[h1] >= 0, true);
		t.check("et sa porte est vide", board.board[gate] < 0, true);

		/*
		 * LES DEUX CASES SE FERMENT. Au roque deux pièces bougent ; ne fermer
		 * que celle du roi laisserait la tour faire entrer une pièce longtemps
		 * après avoir roqué.
		 */
		t.check("les deux cases libérées sont fermées",
			[board.entranceSquares[fresh.game.cbVar.geometry.PosByName("e1")],
				board.entranceSquares[h1]], [false, false]);
	}

	t.done("Seirawan++");
})();
