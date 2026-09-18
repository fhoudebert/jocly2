/*
 * Manifest tests for the chessbase module - pure Node:
 *   node tests/chessbase/manifest.test.js
 *
 * The summary is what a player reads in the game list before opening anything,
 * so it is the one string every game is judged on. It may be written either as
 * a plain string or as { en, fr }; a plain string shows the same text whatever
 * language the app is set to, which is how sixty-nine of them stayed English
 * for French players.
 *
 * This suite holds the line: every game declares a summary, and every summary
 * carries both languages. It also checks the pair actually differs where it
 * should - a French summary identical to its English is usually one that was
 * never translated, though a handful legitimately match, being names and dates
 * (Tressau, 1840) rather than sentences.
 */

const path = require("path");

const CHESSBASE = path.join(__dirname, "..", "..", "src", "games", "chessbase");
const games = require(path.join(CHESSBASE, "index.js")).games;

let passed = 0, failed = 0;
function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if(a === e) passed++;
	else { failed++; console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a); }
}

check("the module has games", games.length > 0, true);

check("every game declares a summary",
	games.filter((g) => !g.config.model.summary).map((g) => g.name), []);

// a plain string is shown as-is in every language, which is the failure this
// suite exists to catch
check("no summary is a bare string",
	games.filter((g) => typeof g.config.model.summary === "string").map((g) => g.name), []);

check("every summary has both languages",
	games.filter((g) => {
		const s = g.config.model.summary;
		return !s.en || !s.fr;
	}).map((g) => g.name), []);

check("no summary is empty",
	games.filter((g) => {
		const s = g.config.model.summary;
		return !String(s.en).trim() || !String(s.fr).trim();
	}).map((g) => g.name), []);

// Where the two languages read the same, it should be because the text is a
// name, a date or a bare dimension - "Tressau, 1840" needs no translating.
// What must not pass is an English sentence copied into the French field, so
// identical pairs are flagged only when they carry an English word that would
// have had to change.
{
	const english = /\b(chess|shogi|variant|board|with|without|and|the|on a|by|century)\b/i;
	const suspicious = games.filter((g) => {
		const s = g.config.model.summary;
		return s.en === s.fr && english.test(String(s.en));
	}).map((g) => g.name);
	check("no summary is English text copied into the French field", suspicious, []);
}

/*
 * A title, under either spelling. "title-en" is the old form and still the
 * common one; "title" carries the same text indexed by locale, the way
 * `summary` above already is. What must not happen is neither - a game with no
 * title at all is a blank line in every list that shows it.
 */
/*
 * UN NOM DE JEU TRAVERSE DES URL, et c'est ce qui limite les caractères qu'il
 * peut porter. Il voyage dans la barre d'adresse d'une fenêtre de partie
 * (`play.html?game=…`), dans les liens d'invitation, dans les noms de fichiers
 * exportés.
 *
 * Le `+` est le piège : dans une chaîne de requête il vaut ESPACE. Un jeu
 * nommé « seirawan++-chess » arrivait donc comme « seirawan  -chess » et la
 * fenêtre échouait sur « Game not found » — pas à la déclaration, pas au
 * build, seulement à l'ouverture. Les enjolivures vont dans le TITRE, qui
 * n'est jamais analysé ; l'identifiant reste sobre.
 */
check("game names survive a URL round trip",
	games.filter((g) => decodeURIComponent(encodeURIComponent(g.name)) !== g.name
		|| new URLSearchParams("game=" + g.name).get("game") !== g.name)
		.map((g) => g.name), []);

/*
 * Et des caractères qu'un nom de fichier accepte partout : le build écrit
 * `<module>/<nom>-model.js`, et un dist se copie entre systèmes.
 *
 * Les majuscules passent -- `fantasticXIII-chess` et `giga-chessII` en
 * portent depuis toujours, et ni une URL ni un système de fichiers ne s'en
 * plaint. Ce qui est refusé, ce sont les caractères qui ont un SENS ailleurs :
 * `+` (un espace dans une requête), `%` (une séquence d'échappement), `&` `?`
 * `#` (des séparateurs), `/` (un chemin), et l'espace.
 */
check("game names are plain", games.filter((g) => !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(g.name))
	.map((g) => g.name), []);

check("titles are still declared",
	games.filter((g) => !g.config.model["title-en"] && !g.config.model.title)
		.map((g) => g.name), []);

// A translated title must actually carry English: that is the fallback every
// client falls back TO, so a title that only exists in French is a game with
// no name for everyone else.
check("a translated title still has English",
	games.filter((g) => {
		const title = g.config.model.title;
		return title && typeof title === "object" && !String(title.en || "").trim();
	}).map((g) => g.name), []);

// a rules page or a thumbnail that points nowhere shows up as a broken link in
// the app, so the paths are checked to exist
{
	const fs = require("fs");
	const broken = [];
	games.forEach((g) => {
		const model = g.config.model;
		if(model.thumbnail && !fs.existsSync(path.join(CHESSBASE, model.thumbnail)))
			broken.push(g.name + "/thumbnail");
		if(model.rules)
			for(const lang in model.rules)
				if(!fs.existsSync(path.join(CHESSBASE, model.rules[lang])))
					broken.push(g.name + "/rules." + lang);
	});
	check("every declared rules page and thumbnail exists", broken, []);
}

console.log((failed ? "FAILED - " : "OK - ") + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
