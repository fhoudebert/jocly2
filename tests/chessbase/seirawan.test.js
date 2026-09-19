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

/*
 * Le prélude d'abord : la partie s'ouvre sur le choix de la paire de pièces à
 * découvrir, et rien ne se joue avant. Deux demi-coups — la réponse, puis le
 * passage de trait — comme pour tout prélude de jocly.
 */
async function started(setup) {
	const m = await Jocly.createMatch(GAME);
	for (let ply = 0; ply < 2; ply++) {
		const list = await m.getPossibleMoves();
		const said = await m.getMoveString(list);
		if (!said.every((n) => /^(#\d+|--)$/.test(n))) break;
		const want = said.indexOf("#" + (setup === undefined ? 0 : setup));
		await m.playMove(list[want >= 0 ? want : 0]);
	}
	return m;
}

const match = await started();
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
		/*
		 * Les cases d'attente lues dans le MANIFESTE plutôt qu'écrites ici :
		 * elles ont déjà changé une fois — deux colonnes au lieu de quatre,
		 * l'échiquier ramené à gauche — et des indices recopiés auraient rendu
		 * le test muet sans cesser de passer.
		 */
		const gates = [];
		for (const k of Object.keys(game.cbVar.pieceTypes))
			if (/^gate-/.test(game.cbVar.pieceTypes[k].name || ""))
				(game.cbVar.pieceTypes[k].initial || []).forEach((p) => gates.push(p.p));
		t.check("les quatre cases d'attente sont connues", gates.length, 4);
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
		const fresh = await started();
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

	/* ------------------------------------------------ la vue */

	/*
	 * LA VUE N'EST PAS CELLE DU CRAZYHOUSE, et ses habillages en sont bien.
	 *
	 * Le jeu empruntait la vue du parachutage, faute d'une autre sachant
	 * dessiner des cases hors de l'échiquier : elle dessinait des mains
	 * (pièces miniatures aux coins), réservait leur place (plateau décalé) et
	 * son panneau de promotion parcourait des types parachutables que ce jeu
	 * n'a pas (« pieceType.aspect is undefined » à chaque animation).
	 *
	 * Et `view.skins` portait `config_view_skins_preload`, qui n'est pas une
	 * liste d'habillages mais la liste de ressources que l'un d'eux précharge.
	 * Le jeu s'ouvrait donc SANS habillage : des glyphes de secours à la place
	 * des pièces, une croix à la place des images. Aucun des deux défauts ne
	 * levait d'erreur au build.
	 *
	 * Ce qui se voit à l'écran ne se teste pas ici ; ce qui se teste, c'est
	 * que la vue n'emprunte plus la machinerie du parachutage et qu'elle
	 * apporte les apparences dont ses deux pièces ont besoin.
	 */
	{
		const fs = require("fs");
		const bundle = path.join(ROOT, "dist", "browser", "games", "chessbase", GAME + "-view.js");
		if (!fs.existsSync(bundle)) {
			t.check("le paquet de vue existe (lancer gulp build)", true, true);
		} else {
			// Sur le CODE, pas sur le texte : les commentaires du jeu nomment
			// le crazyhouse pour expliquer d'où il vient, et une recherche
			// naïve les prendrait pour l'emprunt qu'ils décrivent.
			const code = fs.readFileSync(bundle, "utf8")
				.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
			t.check("la vue n'embarque pas celle du parachutage",
				/cbDropView|cbHandLayout|dropView/.test(code), false);
			// fairy-set-view : l'ensemble Staunton ne connaît ni le cardinal ni
			// le marshall, et une pièce sans apparence ne se dessine pas.
			t.check("elle apporte les apparences des deux pièces",
				/fr-cardinal/.test(code) && /fr-marshall/.test(code), true);
		}

		/*
		 * TOUTES LES APPARENCES SONT PRÉFIXÉES `fr-`.
		 *
		 * fairy-set-view définit son propre jeu de pièces, orthodoxes
		 * comprises. Les noms classiques (`pawn`, `knight`) n'y existent pas,
		 * et une pièce dont l'apparence est inconnue retombe sur son NOM —
		 * elle se dessine alors n'importe comment, sans que rien ne le
		 * signale. C'est ce qui ne laissait correctes que les deux pièces
		 * féeriques.
		 */
		const types = game.cbVar.pieceTypes;
		const strays = Object.keys(types)
			.filter((k) => !/^fr-/.test(types[k].aspect || ""))
			.map((k) => types[k].name);
		t.check("chaque pièce a une apparence de l'ensemble féerique", strays, []);

		/*
		 * LES TROIS CASES DU PANNEAU ONT CHACUNE UNE APPARENCE.
		 *
		 * La vue ouvre son panneau de choix dès que plusieurs coups partagent
		 * la même case de départ et la même case d'arrivée — c'est le choix de
		 * promotion, et les variantes d'entrée sont exactement cela. Chaque
		 * case y est dessinée d'après le `pr` du coup ; celles qui n'en ont pas
		 * donnent `pieceTypes[undefined]`, et le panneau s'ouvre VIDE avec son
		 * seul bouton d'annulation.
		 *
		 * Deux coups sur trois manquaient de `pr` : celui qui fait entrer une
		 * pièce, et surtout celui qui n'en fait entrer aucune — le choix « je
		 * déplace seulement ma pièce ».
		 *
		 * Les deux correspondances sont reconstruites du MANIFESTE, comme la
		 * vue le fait : la pièce qui entre depuis sa case d'attente, la pièce
		 * qui bouge depuis sa case de départ. La vue tourne dans son propre
		 * cadre et n'a pas accès au plateau du modèle — c'est ce qui faisait
		 * échouer la première version.
		 */
		{
			const enters = {}, moving = {};
			for (const k of Object.keys(types)) {
				const m = /^gate-(.+)$/.exec(types[k].name || "");
				if (m) {
					const entered = Object.keys(types).find((u) => types[u].name === m[1]);
					(types[k].initial || []).forEach((p) => { enters[p.p] = Number(entered); });
				}
				(types[k].initial || []).forEach((p) => {
					if (moving[p.p] === undefined) moving[p.p] = Number(k);
				});
			}

			// Une partie neuve : celle du dessus a avancé, et les coups qu'on
			// avait relevés à l'ouverture n'y existent plus.
			const start = await started();
			const list = await start.getPossibleMoves();
			const said = await start.getMoveString(list);
			const ref = list[said.findIndex((n) => /\//.test(n))];
			const panel = list.filter((m) => m.f === ref.f && m.t === ref.t);
			t.check("le panneau compte trois cases", panel.length, 3);

			/*
			 * LE COUP PORTE LUI-MÊME le type de la pièce qui entre (`ei`).
			 *
			 * La vue le reconstruisait du manifeste, et cette reconstruction
			 * échouait en silence : le panneau s'ouvrait avec la seule pièce
			 * déplacée, les deux cases d'entrée manquant. Le modèle le sait de
			 * source sûre ; il le dit, et il n'y a plus rien à deviner de
			 * l'autre côté.
			 */
			t.check("chaque coup avec entrée dit quelle pièce entre",
				panel.filter((m) => m.en !== undefined && m.ei === undefined).length, 0);
			t.check("et le coup sans entrée n'en dit aucune",
				panel.filter((m) => m.en === undefined && m.ei !== undefined).length, 0);

			/*
			 * CHAQUE CASE DOIT AVOIR UN `pr` -- et c'est lui qui la rend
			 * CLIQUABLE, pas seulement dessinée.
			 *
			 * Le panneau du socle est indexé par le type de promotion : il ne
			 * retient que les coups qui ont un `pr`, et la cible du clic
			 * s'appelle « promo#<pr> ». Sans lui, les pièces se dessinaient
			 * mais les clics écoutaient des cibles inexistantes -- ce que
			 * aucune décoration de l'affichage ne pouvait corriger.
			 *
			 * Le coup sans entrée porte le type de la pièce qui bouge : la
			 * seule valeur qui ne change rien, `piece.t = move.pr` étant alors
			 * sans effet.
			 */
			t.check("chaque case du panneau est cliquable",
				panel.filter((m) => m.pr === undefined).length, 0);
			t.check("et les trois se distinguent",
				new Set(panel.map((m) => m.pr)).size, 3);

			const shown = panel.map((m) => m.pr);
			t.check("aucune case sans apparence",
				shown.filter((pr) => pr === undefined || !types[pr]).length, 0);
			t.check("et ce sont la pièce déplacée et les deux en attente",
				shown.map((pr) => types[pr].name).sort(),
				["cardinal", "knight", "marshall"]);
		}

		/*
		 * ET `pr` NE PROMEUT RIEN quand une entrée l'accompagne : il sert au
		 * panneau, pas aux règles. Le cavalier reste cavalier, c'est la pièce
		 * en attente qui entre — la notation le dit, et la position aussi.
		 */
		{
			const fresh2 = await started();
			const list = await fresh2.getPossibleMoves();
			const said = await fresh2.getMoveString(list);
			const k = said.indexOf("Nb1-c3/C");
			await fresh2.playMove(list[k]);
			const fen = await fresh2.getBoardState();
			t.check("le cavalier est bien arrivé, entier", /2N7/.test(fen), true);
			t.check("le cardinal a pris sa case", /^RCBQKBNR/.test(fen.split("/").pop()), true);
			// Et la notation n'annonce pas une promotion qui n'a pas lieu.
			t.check("aucune promotion dans la notation",
				said.filter((n) => /^Nb1-c3/.test(n)).some((n) => /=/.test(n)), false);
		}

		/*
		 * LA BANDE D'ATTENTE FIGURE DANS LE DESSIN DU PLATEAU.
		 *
		 * Le damier se peint depuis `boardLayout`, dont chaque caractère
		 * désigne une couleur. Les deux colonnes d'attente en étaient absentes
		 * et prenaient donc le fond du plateau — une zone sans limite où les
		 * deux pièces semblaient flotter.
		 *
		 * Leur symbole doit rester DISTINCT de ceux du damier : reprendre
		 * l'une de ses deux couleurs ferait lire la bande comme un
		 * prolongement de l'échiquier, ce qu'elle n'est pas — aucune pièce ne
		 * s'y déplace.
		 */
		{
			// Lu dans la SOURCE de la vue : boardLayout vit dans cbDefineView,
			// que Node ne charge pas -- la vue ne tourne que dans le
			// navigateur.
			const source = require("fs").readFileSync(
				path.join(ROOT, "src", "games", "chessbase", "famous", "seirawan-view.js"), "utf8");
			const block = /boardLayout:\s*\[([\s\S]*?)\]/.exec(source);
			t.check("le dessin du plateau est déclaré", !!block, true);
			const rows = (block ? block[1].match(/"[^"]+"/g) || [] : []).map((r) => r.slice(1, -1));
			t.check("le dessin couvre les huit rangées", rows.length, 8);
			t.check("et les dix colonnes, bande comprise",
				[...new Set(rows.map((r) => r.length))], [10]);
			t.check("la bande a son propre symbole",
				rows.every((r) => /==$/.test(r) && !/==/.test(r.slice(0, 8))), true);
		}

		const skins = (await match.getConfig()).view.skins;
		t.check("les habillages sont des habillages",
			skins.map((s) => s.name).sort(), ["skin2d", "skin3d"]);
	}

	/* ------------------------------------------------ le prélude */

	/*
	 * LE PRÉLUDE : quelle paire de pièces on veut découvrir.
	 *
	 * Il ne crée rien — il RETYPE les pièces posées aux portes, en lisant une
	 * chaîne d'abréviations. C'est pourquoi les vingt types existent dès la
	 * définition de la variante, et pourquoi seule la première paire est
	 * placée au départ.
	 */
	{
		const variant = (await started()).game.cbVar;
		const dialog = variant.prelude[0];
		// Trois colonnes : dix arrangements tiennent en quatre rangées plutôt
		// qu'en cinq.
		t.check("le panneau a trois colonnes", dialog.panelWidth, 3);
		t.check("un arrangement par paire", dialog.setups.length >= 10, true);

		/*
		 * LES LETTRES SONT UNIQUES, et c'est une contrainte de la variante et
		 * non des jeux d'origine.
		 *
		 * Toutes les paires vivent dans UNE table de types : deux pièces
		 * partageant une lettre rendraient l'arrangement du prélude ambigu —
		 * il cherche le type dont l'abréviation vaut la lettre — et le FEN
		 * illisible. Deux pièces ont donc dû changer de lettre par rapport à
		 * leur jeu d'origine : la tour couronnée du Spartan (« G », pris par
		 * le griffon) et sa machine (« W », pris par le marshall du Khan).
		 */
		{
			const seen = {};
			const clashes = [];
			for (const k of Object.keys(variant.pieceTypes)) {
				const a = variant.pieceTypes[k].abbrev;
				if (!a) continue;
				if (seen[a]) clashes.push(a + " : " + seen[a] + " et " + variant.pieceTypes[k].name);
				seen[a] = variant.pieceTypes[k].name;
			}
			t.check("aucune lettre n'est portée par deux pièces", clashes, []);

			/*
			 * ET IL EN RESTE. Une seule table de types contient toutes les
			 * paires, donc chaque pièce consomme une lettre de l'alphabet.
			 * Quatre ont déjà dû changer par rapport à leur jeu d'origine — le
			 * blaireau, le bélier, le faucon, le mammouth — parce que la leur
			 * était prise ici.
			 *
			 * Cette assertion dit où en est la réserve. Quand elle échouera,
			 * ce ne sera pas une régression : ce sera le signal qu'une paire
			 * de plus demande autre chose qu'une lettre unique.
			 */
			/*
			 * LA RÉSERVE EST ÉPUISÉE, et ce test le dit plutôt que de le
			 * cacher. Une seule table de types contient toutes les paires,
			 * donc chaque pièce consomme une lettre ; six ont déjà dû changer
			 * par rapport à leur jeu d'origine parce que la leur était prise.
			 *
			 * `P` est le pion et `O` se confond avec zéro dans un FEN : il n'y
			 * a plus de lettre utilisable. La onzième paire demandera autre
			 * chose — des abréviations à deux caractères pour les formes en
			 * attente, ou un prélude à deux étages qui choisit d'abord une
			 * famille. Cette assertion échouera alors, et ce sera le bon
			 * moment pour trancher.
			 */
			const free = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
				.filter((c) => !seen[c] && c !== "O" && c !== "P");
			t.check("les lettres encore utilisables (" + (free.join("") || "aucune") + ")",
				free.length, 0);

			/*
			 * UNE PIÈCE PARTAGÉE N'EST DÉCLARÉE QU'UNE FOIS.
			 *
			 * Le marshall paraît dans deux arrangements — la paire d'origine
			 * et celle du Khan. Deux déclarations auraient demandé deux
			 * lettres et deux types, pour une pièce qui se dessine pareil :
			 * un joueur qui la rencontre dans les deux arrangements doit
			 * reconnaître LA MÊME, c'est tout l'objet de ce jeu.
			 */
			const names = Object.keys(variant.pieceTypes).map((k) => variant.pieceTypes[k].name);
			t.check("aucun type n'est déclaré deux fois",
				names.filter((n, i) => names.indexOf(n) !== i), []);
			t.check("et le marshall n'existe qu'en un exemplaire",
				names.filter((n) => n === "marshall").length, 1);
		}

		/*
		 * L'ARRANGEMENT QUI EMPRUNTE écrit la lettre de la pièce empruntée.
		 *
		 * La chaîne du prélude est construite APRÈS la résolution des
		 * reprises : l'écrire depuis les données brutes donnerait une lettre
		 * inexistante pour la pièce partagée, et le prélude retyperait sur du
		 * vide — la case resterait avec la pièce de l'arrangement précédent,
		 * en silence.
		 */
		{
			const m = await started(3);
			const gates = [];
			for (const p of m.game.mBoard.pieces)
				if (p && /^gate-/.test(variant.pieceTypes[p.t].name || ""))
					gates.push(variant.pieceTypes[p.t].name);
			t.check("l'arrangement du Khan pose bien le marshall partagé",
				[...new Set(gates)].sort(), ["gate-crowned-knight", "gate-marshall"]);
		}
		t.check("deux lettres par arrangement",
			dialog.setups.every((s) => s.length === 2), true);

		/*
		 * LES LETTRES SONT EN MINUSCULE, et ce n'est pas cosmétique.
		 *
		 * Le prélude cherche le type dont `abbrev` vaut la lettre, et il prend
		 * LE PREMIER pour les blancs, LE DERNIER pour les noirs — une
		 * convention faite pour les variantes asymétriques. Forme de jeu et
		 * forme en attente partageant une lettre, les blancs recevaient la
		 * pièce JOUANTE et les noirs celle en attente : un camp se retrouvait
		 * sans entrée possible, l'autre non. Silencieusement.
		 */
		t.check("elles désignent les formes en attente",
			dialog.setups.every((s) => s === s.toLowerCase()), true);

		// Et chaque arrangement donne bien ses deux pièces, aux deux camps.
		for (let setup = 0; setup < dialog.setups.length; setup++) {
			const m = await started(setup);
			const list = await m.getPossibleMoves();
			const said = await m.getMoveString(list);
			t.check("l'arrangement " + setup + " permet d'entrer",
				said.filter((n) => /\//.test(n)).length > 0, true);
			const gates = [];
			for (const p of m.game.mBoard.pieces)
				if (p && /^gate-/.test(variant.pieceTypes[p.t].name || "")) gates.push(p.t);
			t.check("  et quatre pièces attendent", gates.length, 4);
			t.check("  les mêmes des deux côtés", new Set(gates).size, 2);
		}
	}

	t.done("Seirawan++");
})();
