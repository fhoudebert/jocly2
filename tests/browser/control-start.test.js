/*
 * Le demarrage de la partie dans l'exemple control : une seule fois, et du bon
 * cote.
 *
 *   node tests/browser/control-start.test.js
 *
 * DEUX DEFAUTS TENAIENT ENSEMBLE, et tous deux venaient de la meme habitude :
 * rattraper apres coup un reglage qu'on aurait pu poser d'emblee.
 *
 * 1. LE COTE MEMORISE. Il vit dans une clef a part -- le panneau d'options
 *    n'enregistre que l'habillage, la notation, les sons -- et il etait
 *    applique APRES l'attachement, en posant la valeur dans la liste et en
 *    simulant un changement. Le plateau s'affichait donc d'abord a l'endroit
 *    par defaut, puis basculait ; et le gestionnaire de la liste lancant
 *    RunMatch, la partie demarrait DEUX fois.
 *
 * 2. LES ABANDONS N'ETAIENT PAS ATTENDUS. RunMatch ouvre par
 *    abortUserTurn().then(abortMachineSearch) et rangeait le resultat dans une
 *    variable jamais lue : la suite partait en parallele. Un RunMatch demande
 *    pendant qu'un tour tourne -- ce que fait CHAQUE changement d'option --
 *    pouvait donc ouvrir le tour suivant avant que l'abandon du precedent ne
 *    soit arrive, et l'abandon tuait alors le tour tout juste ouvert.
 *
 * Ce fichier lit la source plutot que de faire tourner la page : control.js
 * s'execute au chargement du document et parle a une vraie partie. Ce qui est
 * verifie, ce sont les deux enchainements -- ce qu'un lecteur ne voit pas en
 * relisant, parce qu'une promesse ignoree ne se remarque pas.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const t = require(path.join(ROOT, "tests", "fairy", "harness.js")).runner();

const src = fs.readFileSync(
	path.join(ROOT, "examples", "browser", "js", "control.js"), "utf8");

/* ------------------------------------- le cote memorise, pose a l'attachement */

// Il rejoint les options passees a attachElement, la ou vont deja toutes les
// autres : l'orientation est bonne des le premier trait.
t.check("le cote memorise est lu avant l'attachement",
	src.indexOf("savedViewAs") < src.indexOf("match.attachElement"), true);
t.check("et joint aux options d'attachement",
	/viewOptions\.viewAs\s*=\s*savedPlayer/.test(src), true);

// Une valeur que la liste ne connait pas est ignoree : une orientation
// inventee vaut moins que celle par defaut. C'est la meme regle que
// SetViewAs applique cote moteur.
t.check("une valeur inconnue est ignoree",
	/savedPlayer\s*=[\s\S]{0,200}:\s*null\s*;/.test(src), true);
t.check("et rien n'est ecrit dans ce cas", /if\(savedPlayer\)\s*\{/.test(src), true);

/* --------------------------------------- la partie ne demarre qu'une fois */

/*
 * La liste reflete l'etat sans le PROVOQUER : `.trigger("change")` appelait le
 * gestionnaire, qui lance RunMatch -- alors que la chaine qui suit en lance un
 * autre. Deux boucles de partie pour un chargement.
 */
{
	const block = /if\(config\.view\.switchable\)[\s\S]*?\n {28}\}/.exec(src);
	t.check("le bloc du cote est bien la", !!block, true);
	t.check("la liste est posee sans declencher son gestionnaire",
		/\$\("#view-as"\)\.val\(savedViewAs\)\s*;/.test(block ? block[0] : ""), true);
	t.check("plus aucun trigger sur cette liste",
		/#view-as[\s\S]{0,40}trigger\(/.test(src), false);
}

/* --------------------------------------- les abandons sont attendus */

/*
 * `promise` etait construite puis jetee. Le chainage est la seule chose qui
 * distingue « on abandonne le tour precedent PUIS on ouvre le suivant » de
 * « on fait les deux en meme temps et le sort decide » -- et rien, a la
 * lecture, ne signale une promesse ignoree.
 */
{
	const run = /function RunMatch\(match, progressBar\)[\s\S]*?\n\}/.exec(src);
	t.check("RunMatch est lisible", !!run, true);
	const body = run ? run[0] : "";
	t.check("les abandons sont chaines avant la suite",
		/promise\s*\n\s*\.then\(\s*\(\)\s*=>\s*\{\s*\n\s*return match\.getFinished\(\);/.test(body), true);
	// Et pas d'appel nu reste en place : deux `match.getFinished()` au meme
	// niveau signeraient un chainage a moitie fait.
	t.check("l'ancien appel non chaine a disparu",
		/\n    match\.getFinished\(\)\n        \.then\( \(result\)/.test(body), false);
}

/* --------------------------------------- le gestionnaire reste intact */

// Un changement VOULU par le joueur doit toujours appliquer le cote et
// relancer la partie : ce qui precede ne retire rien a ce chemin-la.
t.check("un changement du joueur applique toujours le cote",
	/setViewOptions\(\{[\s\S]{0,40}viewAs: player/.test(src), true);
t.check("et relance la partie", /viewAs: player[\s\S]{0,160}RunMatch\(match,progressBar\)/.test(src), true);

/* --------------------------------------- un tour, un resolveur */

/*
 * LE DESEQUILIBRE. `movePending` vit au niveau du MODULE -- c'est voulu, c'est
 * lui qui empeche deux tours de s'ouvrir en meme temps quand un changement
 * d'option relance RunMatch. Son resolveur, lui, vivait dans RunMatch, une
 * portee par APPEL : deux appels se partageaient le drapeau mais pas le
 * resolveur.
 *
 * Le garde-fou `if(movePending) return;` suffisait a l'eviter en pratique.
 * Mais si un second NextMove passait un jour, il ecraserait le resolveur du
 * premier, et la promesse de celui-ci ne serait JAMAIS tenue : tout ce qui
 * l'attend -- la fin de RunMatch, donc le tour suivant -- resterait en
 * suspens, sans erreur ni trace. Le genre de blocage qu'on ne retrouve pas.
 */
{
	t.check("le resolveur ne vit plus dans RunMatch",
		/movePendingResolver/.test(src), false);

	const next = /function NextMove\(\)[\s\S]*?\n    \}/.exec(src);
	t.check("NextMove est lisible", !!next, true);
	const body = next ? next[0] : "";

	// Capture dans le tour qu'il termine : il n'y a plus rien a ecraser.
	t.check("chaque tour capture le sien",
		/var resolveThisMove;[\s\S]{0,140}resolveThisMove = resolve/.test(body), true);

	/*
	 * Et la liberation est gardee deux fois. Un tour peut se terminer par sa
	 * fin normale PUIS par son abandon -- les deux chemins appelaient la
	 * liberation -- et il ne doit alors ni tenir sa promesse deux fois, ni
	 * effacer le drapeau d'un tour qui n'est pas le sien.
	 */
	t.check("elle ne rend la main qu'une fois",
		/if\(released\)\s*\n\s*return;/.test(body), true);
	t.check("et ne libere le drapeau que s'il est encore le sien",
		/if\(movePending === thisMove\)\s*\n\s*movePending = null;/.test(body), true);

	// Plus aucune remise a zero directe : c'etait le chemin qui pouvait
	// effacer le tour d'un autre.
	const raw = (body.match(/movePending = null/g) || []).length;
	t.check("un seul endroit remet le drapeau a zero", raw, 1);
}

t.done("control start");
