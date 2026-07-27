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

check("titles are still declared",
	games.filter((g) => !g.config.model["title-en"]).map((g) => g.name), []);

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
