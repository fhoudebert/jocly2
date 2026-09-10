/*
 * La marque du dernier coup, sur les jeux chessbase.
 *
 *   node tests/chessbase/last-move.test.js
 *
 * CE QUE LA MARQUE RESOUT : sur un plateau qui change d'une piece par tour,
 * retrouver d'ou elle vient est une recherche -- surtout apres un coup joue
 * par le moteur, que le joueur n'a pas vu partir.
 *
 * CE QUI EST VERIFIE ICI, et ce ne peut pas etre l'aspect : la vue ne se juge
 * que dans un navigateur. Sont controlees les trois choses qui, elles, se
 * cassent sans bruit :
 *
 *   1. la marque a un gadget A ELLE. cell#pos et clicker#pos existent deja
 *      pour chaque case, mais tous deux sont pilotes par la machine a etats
 *      d'entree, dont le `unhighlight` fait `classes: ""` : une marque
 *      ecrite dessus serait effacee au premier clic sur cette case et
 *      reviendrait a l'affichage suivant. Intermittent, donc introuvable.
 *   2. les valeurs de lastMove.f QUI NE SONT PAS DES CASES -- -1 avant le
 *      premier coup, -2 pendant un prelude -- ne posent pas de marque.
 *   3. la feuille de style n'emploie pas de pourcentage la ou CSS exige une
 *      longueur. C'est ce qui a rendu la marque du go invisible pendant toute
 *      son existence : `border: 12% solid` est invalide et jete en entier.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const CHESSBASE = path.join(ROOT, "src", "games", "chessbase");

const t = require(path.join(ROOT, "tests", "fairy", "harness.js")).runner();

// extension profonde minimale : la seule chose que les vues empruntent a jQuery
function extend() {
	const args = Array.prototype.slice.call(arguments);
	const deep = args[0] === true;
	if(deep) args.shift();
	const target = args.shift();
	args.forEach((src) => {
		for(const key in src) {
			const value = src[key];
			if(deep && value && typeof value == "object" && !Array.isArray(value)) {
				if(typeof target[key] != "object" || target[key] === null)
					target[key] = {};
				extend(true, target[key], value);
			} else
				target[key] = value;
		}
	});
	return target;
}

function loadView(scripts) {
	const sandbox = {
		console, Math, Object, Array, JSON,
		$: { extend },
		View: { Game: {}, Board: {}, Move: {} },
	};
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	scripts.forEach((script) => {
		vm.runInContext(fs.readFileSync(path.join(CHESSBASE, script), "utf8"),
			sandbox, { filename: script });
	});
	return sandbox;
}

// Un xdv qui ne dessine rien et retient tout.
function fakeXdv() {
	const gadgets = {};
	return {
		gadgets,
		createGadget(name, spec) { gadgets[name] = { spec, props: {} }; },
		updateGadget(name, spec) {
			if(!gadgets[name]) throw new Error("gadget inconnu : " + name);
			extend(true, gadgets[name].props, spec);
			gadgets[name].last = spec;
		},
	};
}

const sb = loadView(["base-view.js", "grid-board-view.js"]);
const view = sb.View.Game;

/* ------------------------------------------------------- la creation */

const xdv = fakeXdv();
// Le minimum dont cbCreateLastMove a besoin : un chemin de ressources et le
// fragment de vue qui donne sa taille au gadget, comme pour les cibles.
view.g = { fullPath: "/games/chess" };
view.cbView = { clicker: { "2d": { width: 1300, height: 1300 }, "3d": { scale: [.9, .9, .9] } } };
view.g.boardSize = 64;
view.mShowLastMove = true;
view.cbCreateLastMove(xdv);

/*
 * DEUX marques. La case de depart seule dit d'ou la piece vient, pas ou elle
 * est allee -- et sur un plateau charge, la piece arrivee ne se distingue pas
 * de ses voisines. Les deux ensemble tracent le coup.
 */
t.check("les deux cases du coup ont leur marque",
	["lastfrom", "lastto"].filter((n) => !xdv.gadgets[n]), []);
const mark = xdv.gadgets["lastfrom"];
t.check("cachees tant qu'aucun coup n'a ete joue",
	["lastfrom", "lastto"].map((n) => xdv.gadgets[n].spec.base.visible), [false, false]);
// Meme aspect pour les deux : la piece les departage toute seule, puisqu'elle
// est sur l'une et pas sur l'autre. Deux aspects demanderaient un code a
// apprendre.
t.check("de meme aspect",
	xdv.gadgets["lastfrom"].spec["2d"].initialClasses,
	xdv.gadgets["lastto"].spec["2d"].initialClasses);

/*
 * z 102 : au-dessus des cases (101), sous les cibles cliquables (103). Une
 * marque au-dessus des cibles masquerait ce sur quoi on peut cliquer ; en
 * dessous des cases elle serait invisible.
 */
t.check("place entre les cases et les cibles", mark.spec["2d"].z, 102);

// La taille vient de cbView.clicker, propre a chaque jeu : une taille ecrite
// ici serait juste sur un 8x8 et fausse partout ailleurs.
t.check("dimensionne comme les cibles du jeu",
	[mark.spec["2d"].width, mark.spec["3d"].scale], [1300, [.9, .9, .9]]);

// En 3D, le maillage d'anneau que la geometrie declare : chaque plateau a le
// sien (carre, hexagone, cylindre...), donc la marque epouse la case sans
// qu'un fichier soit ajoute.
t.check("l'anneau 3D est celui de la geometrie",
	mark.spec["3d"].file, "/games/chess" + view.cbTargetMesh);
t.check("dans la couleur de la marque, distincte de celles des cibles",
	[mark.spec["3d"].materials.ring.color, view.cbLastMoveColor === view.cbTargetSelectColor,
		view.cbLastMoveColor === view.cbTargetCancelColor],
	[view.cbLastMoveColor, false, false]);
// L'anneau ne projette pas d'ombre : il ne represente pas un objet pose sur le
// plateau, et une ombre le ferait lire comme une piece.
t.check("et sans ombre portee", mark.spec["3d"].castShadow, false);

/* ------------------------------------------------------- l'affichage */

// Une geometrie de travail : cbMakeDisplaySpec delegue a cbView.coords, que
// chaque plateau fournit. Deux cases suffisent a montrer que la marque suit.
view.cbView.coords = {
	"2d": function(pos) { return { x: pos * 10, y: pos * 20 }; },
};
view.mViewAs = 1;

function show(lastMove) {
	view.cbDisplayLastMove(xdv, { lastMove });
	return {
		from: xdv.gadgets["lastfrom"].last,
		to: xdv.gadgets["lastto"].last,
	};
}

// La taille accompagne la position a chaque mise a jour : le gadget la
// reprend de cbView.clicker, comme les cellules le font.
t.check("un coup joue pose la marque sur sa case de depart",
	show({ f: 12, t: 20, c: null }).from["2d"],
	{ x: 120, y: 240, z: 0, rotateX: 0, rotateY: 0, rotate: 0, width: 1300, height: 1300 });
t.check("et une autre sur sa case d'arrivee",
	show({ f: 12, t: 20, c: null }).to["2d"].x, 200);
t.check("les deux visibles",
	[show({ f: 12, t: 20, c: null }).from.base.visible,
		show({ f: 12, t: 20, c: null }).to.base.visible], [true, true]);

t.check("le coup suivant les deplace, il ne les ajoute pas",
	[show({ f: 3, t: 4, c: null }).from["2d"].x,
		show({ f: 3, t: 4, c: null }).to["2d"].x], [30, 40]);

/*
 * Le roque. La case d'arrivee du roi n'est pas `t` telle quelle : la
 * generation empile la case dans les 16 bits BAS et un nombre de pas dans les
 * hauts (`t: pos | step*(j-last)<<16`), et le modele demasque partout ou il
 * s'en sert -- cbApplyCastle fait `move.t & 0xffff`, la notation aussi. Sans
 * le masque, le controle de borne ferait disparaitre la marque : le coup le
 * plus spectaculaire de la partie serait le seul a n'etre pas marque.
 */
t.check("un roque est marque sur la vraie case du roi",
	show({ f: 4, t: 6 | (2 << 16), c: null }).to["2d"].x, 60);

/*
 * Les deux valeurs qui ne sont pas des cases. base-model.js pose
 * `{f:-1,t:0,c:null}` dans InitialPosition -- son commentaire dit qu'il est la
 * pour ne jamais etre pris pour une capture, et il ne doit pas davantage etre
 * pris pour une case -- et prelude-model.js cache l'etage du prelude dans ce
 * meme champ, a -2. Marquer l'une ou l'autre poserait l'anneau n'importe ou,
 * ou ferait tomber la vue.
 */
t.check("avant le premier coup, aucune marque",
	show({ f: -1, t: 0, c: null }).from.base.visible, false);
t.check("pendant un prelude non plus",
	show({ f: -2, t: 0, c: null }).from.base.visible, false);
// Une case hors du plateau ne se marque pas non plus : mieux vaut une marque
// manquante qu'une marque posee a cote du damier.
t.check("ni une case hors du plateau",
	show({ f: 4, t: 999, c: null }).to.base.visible, false);

// Une position chargee peut n'avoir aucun lastMove : ne rien marquer est
// exact, aucun coup n'ayant ete joue.
t.check("ni sur une position sans dernier coup",
	[show(undefined).from.base.visible, show(undefined).to.base.visible], [false, false]);
t.check("ni sur un champ incomplet", show({ t: 5 }).from.base.visible, false);

/* --------------------------------------------------------- l'option */

/*
 * Debranchee, la marque disparait -- et les DEUX cases avec elle. Le circuit
 * est celui de mShowMoves a l'octet pres : mViewOptions.useShowLastMove dit
 * que la vue sait la dessiner, mShowLastMove dit si elle l'est en ce moment.
 */
view.mShowLastMove = false;
t.check("l'option decochee efface les deux marques",
	[show({ f: 12, t: 20, c: null }).from.base.visible,
		show({ f: 12, t: 20, c: null }).to.base.visible], [false, false]);
view.mShowLastMove = true;
t.check("et recochee les remet", show({ f: 12, t: 20, c: null }).from.base.visible, true);

/* ------------------------------------------------------- la feuille */

const css = fs.readFileSync(path.join(CHESSBASE, "chessbase.css"), "utf8");
t.check("la classe est definie", /\.cb-lastmove\s*\{/.test(css), true);

/*
 * Pas de pourcentage la ou CSS demande une longueur. `border-width` et les
 * longueurs de `box-shadow` prennent une <length>, jamais un pourcentage :
 * « border: 6% solid » se lit naturellement, est invalide, et le navigateur
 * jette la declaration ENTIERE sans rien dire. C'est ce qui a rendu la marque
 * du dernier coup du go invisible depuis sa creation, et la meme faute
 * s'ecrivait ici mot pour mot.
 */
const rule = /\.cb-lastmove\s*\{([^}]*)\}/.exec(css)[1];
t.check("pas de bordure en pourcentage",
	/border(-(top|right|bottom|left))?(-width)?\s*:[^;]*\d\s*%/.test(rule), false);
t.check("pas d'ombre en pourcentage", /box-shadow\s*:[^;]*\d\s*%/.test(rule), false);

// Le degrade, lui, prend des pourcentages : c'est ce qui permet a la marque de
// suivre la taille de la case sans qu'aucun pixel soit ecrit nulle part.
t.check("l'anneau est peint par un degrade", /radial-gradient/.test(rule), true);
t.check("dimensionne en pourcentage", /\d\s*%/.test(rule), true);

// La 2D et la 3D doivent montrer la meme couleur : deux constantes, deux
// fichiers, et rien d'autre pour les tenir ensemble.
const hex = view.cbLastMoveColor.toString(16).padStart(6, "0");
const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
t.check("la couleur de la 2D est celle de la 3D",
	new RegExp("rgba?\\(\\s*" + rgb[0] + "\\s*,\\s*" + rgb[1] + "\\s*,\\s*" + rgb[2] + "\\b").test(rule),
	true);

/* --------------------------------------------- branche dans l'affichage */

// cbDisplayLastMove doit etre appelee par xdDisplay, sinon rien de ce qui
// precede n'arrive jamais a l'ecran.
const src = fs.readFileSync(path.join(CHESSBASE, "base-view.js"), "utf8");
const display = /View\.Board\.xdDisplay\s*=\s*function[\s\S]*?\n\t\}/.exec(src)[0];
t.check("xdDisplay pose la marque", /cbDisplayLastMove\(/.test(display), true);
t.check("et xdInit cree le gadget",
	/cbCreateLastMove\(xdv\)/.test(src), true);

/* --------------------------------------------- l'option, de bout en bout */

/*
 * Une option ne sert a rien si un maillon de la chaine l'ignore, et elle en a
 * quatre : le manifeste declare la CAPACITE, jocly.game.js la lit en valeur de
 * depart, jocly.core.js la transporte dans les deux sens, et jocly.embed.js
 * tient une copie de la meme table. Chacun de ces quatre points a deja ete
 * oublie pour une option ou une autre, et l'oubli ne se voit pas : la case a
 * cocher s'affiche et ne fait rien.
 */
{
	const core = fs.readFileSync(path.join(ROOT, "src", "core", "jocly.core.js"), "utf8");
	const gameJs = fs.readFileSync(path.join(ROOT, "src", "core", "jocly.game.js"), "utf8");
	const embed = fs.readFileSync(path.join(ROOT, "src", "browser", "jocly.embed.js"), "utf8");

	/*
	 * Eteinte par defaut, et c'est une decision, pas un oubli : une marque
	 * permanente sur deux cases est un ajout visuel a des vues dont
	 * l'apparence est reglee depuis longtemps. La CAPACITE, elle, reste lue
	 * dans le manifeste -- c'est ce qui fait apparaitre la case a cocher, et
	 * les deux sont independants.
	 */
	t.check("la marque est eteinte au demarrage",
		/mShowLastMove\s*=\s*false/.test(gameJs), true);
	t.check("mais la capacite reste declaree par le jeu",
		/useShowLastMove/.test(core), true);
	// Un jeu peut renverser ce defaut comme pour les autres options.
	t.check("et un jeu peut l'allumer par defaultOptions",
		/"mShowLastMove":\s*"lastmove"/.test(gameJs), true);

	/*
	 * Eteinte, mais ALLUMABLE, et c'est le point : l'etat de depart est pose
	 * dans JocGame.prototype.Init, qui tourne une fois a la creation de la
	 * partie. setViewOptions reconstruit la vue (GameDestroyView,
	 * GameInitView, DisplayBoard) sans repasser par Init -- sinon un
	 * `false` ecrit la aurait rallume... eteint la case a chaque
	 * reconstruction, et la case a cocher n'aurait jamais tenu. C'est deja
	 * ainsi que mShowMoves fonctionne ; on verifie que le defaut n'a pas ete
	 * pose ailleurs, dans un chemin rejoue a chaque affichage.
	 */
	const initBlock = /JocGame\.prototype\.Init\s*=\s*function[\s\S]*?\n\}/.exec(gameJs)[0];
	t.check("le defaut est pose a la creation de la partie, pas a chaque vue",
		/mShowLastMove\s*=\s*false/.test(initBlock), true);
	t.check("et nulle part ailleurs",
		(gameJs.match(/mShowLastMove\s*=\s*false/g) || []).length, 1);
	t.check("setViewOptions la recoit",
		/"mShowLastMove":\s*"showLastMove"/.test(core), true);
	t.check("getViewOptions la renvoie",
		/useShowLastMove\)[\s\S]{0,80}options\.showLastMove/.test(core), true);
	t.check("et jocly.embed.js porte la meme table",
		/"mShowLastMove":\s*"showLastMove"/.test(embed), true);

	// Tous les jeux chessbase la declarent, et exactement ceux qui declarent
	// deja « montrer les coups » : les deux options ont la meme portee, et une
	// liste qui divergerait laisserait des jeux avec une marque qu'on ne peut
	// pas eteindre.
	const games = require(path.join(CHESSBASE, "index.js")).games;
	t.check("chaque jeu chessbase declare la capacite",
		games.filter((g) => !g.config.view.useShowLastMove).map((g) => g.name), []);
	t.check("ni plus ni moins que « montrer les coups »",
		games.filter((g) => !!g.config.view.useShowMoves !== !!g.config.view.useShowLastMove)
			.map((g) => g.name), []);

	// Le client de reference sait la montrer, dans les deux langues : une page
	// traduite qui oublie une option la rend inaccessible a ses lecteurs.
	["control.html", "control_fr.html"].forEach((page) => {
		const html = fs.readFileSync(path.join(ROOT, "examples", "browser", page), "utf8");
		t.check(page + " porte la case a cocher",
			/id="options-lastmove-input"/.test(html), true);
	});
	const control = fs.readFileSync(path.join(ROOT, "examples", "browser", "js", "control.js"), "utf8");
	t.check("control.js la lit et la renvoie",
		/options\.showLastMove/.test(control) && /opts\.showLastMove\s*=/.test(control), true);
}

t.done("Chessbase last move");
