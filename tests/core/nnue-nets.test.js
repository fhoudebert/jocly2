/*
 * The NNUE networks a level asks for, and the table that documents them.
 *
 *   node tests/core/nnue-nets.test.js
 *
 * Declaring an "evalFile" costs nothing when the file is absent - the worker
 * logs the miss once and the engine keeps its classical evaluation - which is
 * exactly why the two drift apart without anyone noticing. The table in
 * third-party/fairy-stockfish/nnue/README.md is what somebody reads before
 * downloading networks, and it had fallen five entries behind the configs,
 * while still pointing at src/games/chessbase/index.js for configs that had
 * moved to manifest/.
 *
 * So the table is checked against the configs rather than maintained beside
 * them. Adding an evalFile to a level fails this test until the row is
 * written, which is the whole point.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const H = require(path.join(ROOT, "tests", "fairy", "harness.js"));
const t = H.runner();

const README = path.join(ROOT, "third-party", "fairy-stockfish", "nnue", "README.md");

/* ---- what the levels ask for ---- */

const declared = {};   // file -> { games:Set, variants:Set }
require(path.join(ROOT, "src", "games", "chessbase", "index.js")).games.forEach((game) => {
	(game.config.model.levels || []).forEach((level) => {
		const note = (entry) => {
			if(!entry || !entry.evalFile)
				return;
			const file = entry.evalFile.replace(/^nnue\//, "");
			const seen = declared[file] || (declared[file] = { games: new Set(), variants: new Set() });
			seen.games.add(game.name);
			seen.variants.add(entry.variant || level.variant);
		};
		note(level);
		(level.variants || []).forEach(note);
	});
});

t.check("some level does ask for a network, or this proves nothing",
	Object.keys(declared).length > 0, true);

// the worker resolves the path against the fairy-stockfish asset directory,
// so anything not under nnue/ would silently 404 and fall back to classical
t.check("every declared network sits under nnue/",
	Object.keys(declared).filter((f) => f.indexOf("/") >= 0), []);

/* ---- what the table says ---- */

const rows = {};
fs.readFileSync(README, "utf8").split("\n").forEach((line) => {
	const cells = /^\|\s*`([^`]+\.nnue)`\s*\|([^|]*)\|([^|]*)\|/.exec(line);
	if(cells)
		rows[cells[1]] = { games: cells[2].trim(), variants: cells[3].trim() };
});

t.check("the README still has a table to check",
	Object.keys(rows).length > 0, true);

t.check("every network a level asks for is in the table",
	Object.keys(declared).sort().filter((f) => !rows[f]), []);
t.check("and the table lists no network no level asks for",
	Object.keys(rows).sort().filter((f) => !declared[f]), []);

Object.keys(declared).sort().forEach((file) => {
	if(!rows[file])
		return;
	t.check(file + ": the games named are the games that ask for it",
		rows[file].games, [...declared[file].games].sort().join(", "));
	// one net can serve several prelude setups sharing a piece set, and the
	// table says so in prose rather than listing them - so only the first
	// variant is checked against the column
	const first = [...declared[file].variants].sort()[0];
	t.check(file + ": the variant column names a variant it is used for",
		rows[file].variants.indexOf(first) >= 0
			|| [...declared[file].variants].some((v) => rows[file].variants.indexOf(v) >= 0),
		true);
});

/* ---- and the paths the prose points at ---- */

const text = fs.readFileSync(README, "utf8");
t.check("the README no longer sends the reader to the old config location",
	text.indexOf("src/games/chessbase/index.js"), -1);

t.done("NNUE networks");
