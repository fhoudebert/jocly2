/*
 * Le manifeste chessbase : la LISTE des jeux, et la taille de ses morceaux.
 *
 *   node tests/core/manifest-split.test.js
 *
 * index.js faisait 9524 lignes : 2784 de briques partagees puis 81 entrees de
 * jeu. Les briques vivent dans manifest/shared.js et les jeux sont sortis
 * famille par famille. Ce decoupage est TERMINE, et cette suite a ete ecrite
 * pour lui : elle comparait le manifeste serialise a un instantane -- une
 * empreinte par jeu, l'empreinte de l'ensemble, le nombre d'octets.
 *
 * CE QUI A CHANGE, ET POURQUOI. Une empreinte par jeu ne distingue pas une
 * regression d'une modification voulue : toute retouche d'un manifeste la
 * fait echouer, et la seule reponse possible est `--update`, qui re-entérine
 * ce qu'on vient d'ecrire. Le signal etait donc toujours le meme -- une
 * corvee, puis un instantane a re-valider, et un conflit de fusion a chaque
 * rebase. Pour un projet qui bouge moins, ce cout se paie encore a chaque
 * ajout de jeu, sans rien apprendre.
 *
 * Reste ce qu'une empreinte NE dit pas et qu'on ne voit pas autrement :
 *
 *   - la liste des jeux, ORDRE COMPRIS. examples/browser/js/multiple.js et
 *     examples/node/list-games.js la parcourent telle quelle, sans trier :
 *     un jeu deplace ou disparu se verrait a l'ecran, et nulle part ailleurs
 *     dans les tests. L'instantane ne garde donc plus que les NOMS -- lisible
 *     dans un diff, et `--update` n'est plus necessaire que lorsqu'on ajoute,
 *     retire ou deplace un jeu ;
 *   - le decoupage lui-meme : aucun fichier ne doit revenir au-dessus de
 *     9000 lignes ;
 *   - et ce que le manifeste PROMET : chaque ressource declaree (vignette,
 *     regles, description, credits, css) doit exister sur le disque. C'est le
 *     defaut qu'une empreinte laissait passer entierement -- elle comparait
 *     du texte a du texte, sans jamais regarder les fichiers -- et il se voit
 *     en production, par une vignette absente dans la liste des jeux.
 *
 * Quand un jeu est ajoute, retire ou deplace :
 *   node tests/core/manifest-split.test.js --update
 */

const fs = require("fs");
const path = require("path");

const CHESSBASE = path.join(__dirname, "..", "..", "src", "games", "chessbase");
const SNAPSHOT = path.join(__dirname, "manifest-snapshot.json");

const games = require(path.join(CHESSBASE, "index.js")).games;
const current = {
	games: games.map((g) => g.name),
};

if (process.argv.includes("--update")) {
	fs.writeFileSync(SNAPSHOT, JSON.stringify(current, null, "\t") + "\n");
	console.log("snapshot updated: " + games.length + " games");
	process.exit(0);
}

let passed = 0, failed = 0;
function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if (a === e) passed++;
	else { failed++; console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a); }
}

const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));
const before = snapshot.games;

check("the game list is unchanged, order included", current.games, before);

/*
 * Every resource the manifest promises must be on disk.
 *
 * The build copies exactly these fields (gulpfile.js, `resources`), so a name
 * that does not resolve ships a game whose thumbnail, rules or stylesheet is
 * a 404 - and nothing in the sources says so. A digest of the manifest could
 * not see it: it compared text to text.
 */
const missing = [];
for(const game of games) {
	for(const [section, fields] of [["model", ["thumbnail", "rules", "description", "credits"]],
	                                ["view", ["css"]]]) {
		for(const field of fields) {
			const value = game.config[section] && game.config[section][field];
			const files = typeof value === "string" ? [value]
				: (value && typeof value === "object" ? Object.values(value) : []);
			for(const file of files) {
				if(typeof file !== "string" || !file) continue;
				// Tous ces jeux viennent du module chessbase, et les chemins
				// declares y sont relatifs.
				const full = path.join(CHESSBASE, file);
				if(!fs.existsSync(full)) missing.push(game.name + " -> " + file);
			}
		}
	}
}
/*
 * L'ARDOISE, nommee et bornee.
 *
 * Quatre pages manquent pour de bon -- les credits du jeu qui perd et les
 * descriptions de quatre shogi -- et on ne les invente pas ici : il faut soit
 * les ecrire, soit retirer la declaration. En attendant, elles sont listees,
 * ce qui a deux effets : la suite reste verte sur un defaut connu, et
 * l'ardoise ne peut pas grossir sans que personne ne s'en apercoive.
 *
 * Elle se nettoie aussi : une entree comblee fait echouer la verification
 * suivante, qui demande a ce que la liste soit raccourcie. Une ardoise qu'on
 * ne relit jamais finit par decrire un etat qui n'existe plus.
 */
const KNOWN_GAPS = [
	"losing-chess -> res/rules/standard/credits.html",
	"losing-chess -> res/rules/standard/credits-fr.html",
	"shogi -> res/rules/shogi/shogi-description.html",
	"kotaishi-shogi -> res/rules/shogi/shogi-description.html",
	"mini-shogi -> res/rules/shogi/mini-shogi-description.html",
	"chu-shogi -> res/rules/shogi/chu-shogi-description.html",
];
check("no NEW resource is declared and missing",
	missing.filter((m) => KNOWN_GAPS.indexOf(m) < 0), []);
check("and the known gaps are still gaps - fill the page or drop the line, then shorten this list",
	KNOWN_GAPS.filter((m) => missing.indexOf(m) < 0), []);

// the split is only worth doing if the pieces stay small
const size = (p) => fs.readFileSync(p, "utf8").split("\n").length;
const biggest = Math.max(size(path.join(CHESSBASE, "index.js")),
	...fs.readdirSync(path.join(CHESSBASE, "manifest"))
		.map((f) => size(path.join(CHESSBASE, "manifest", f))));
check("no manifest file is back above 9000 lines", biggest < 9000, true);

console.log(passed + " passed, " + failed + " failed  (" + games.length + " games)");
process.exit(failed ? 1 : 0);
