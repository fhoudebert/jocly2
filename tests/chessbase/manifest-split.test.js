/*
 * Guards the splitting-up of the chessbase manifest - pure Node:
 *   node tests/chessbase/manifest-split.test.js
 *
 * index.js used to be one 9524-line file: 2784 lines of shared building blocks
 * followed by 81 game entries. Those blocks now live in manifest/shared.js and
 * the games are moving out family by family into manifest/*.js, each leaving a
 * one-line reference at its place in index.js.
 *
 * Such a move must change nothing at all. What gulp writes into every
 * games/<module>/<game>-config.js is JSON.stringify(game.config), so if the
 * serialisation of exports.games is unchanged, the build output is unchanged -
 * which is what this suite checks, against the digests in
 * manifest-snapshot.json. ORDER included: examples/browser/js/multiple.js and
 * examples/node/list-games.js both iterate the game list as it comes, without
 * sorting, so a reordering would be visible on screen.
 *
 * The snapshot holds one digest per game rather than the 340 KB of JSON, which
 * keeps it readable in a diff and still names the game that moved.
 *
 * When a game is deliberately added, removed or edited, refresh the snapshot:
 *   node tests/chessbase/manifest-split.test.js --update
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CHESSBASE = path.join(__dirname, "..", "..", "src", "games", "chessbase");
const SNAPSHOT = path.join(__dirname, "manifest-snapshot.json");

const games = require(path.join(CHESSBASE, "index.js")).games;
const serialised = JSON.stringify(games);

const digest = (value) =>
	crypto.createHash("sha1").update(JSON.stringify(value)).digest("hex").slice(0, 16);

const current = {
	bytes: serialised.length,
	digest: digest(games),
	games: games.map((g) => ({ name: g.name, digest: digest(g) })),
};

if (process.argv.includes("--update")) {
	fs.writeFileSync(SNAPSHOT, JSON.stringify(current, null, "\t") + "\n");
	console.log("snapshot updated: " + games.length + " games, " + serialised.length + " bytes");
	process.exit(0);
}

let passed = 0, failed = 0;
function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if (a === e) passed++;
	else { failed++; console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a); }
}

const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));

check("the game list is unchanged, order included",
	current.games.map((g) => g.name), snapshot.games.map((g) => g.name));

// named per game, so a failure points at the entry that moved
check("every game entry serialises exactly as before",
	snapshot.games.filter((g, i) => !current.games[i] || current.games[i].digest !== g.digest)
		.map((g) => g.name), []);

check("the whole list serialises exactly as before", current.digest, snapshot.digest);
check("down to the same byte count", current.bytes, snapshot.bytes);

// the split is only worth doing if the pieces stay small
const size = (p) => fs.readFileSync(p, "utf8").split("\n").length;
const biggest = Math.max(size(path.join(CHESSBASE, "index.js")),
	...fs.readdirSync(path.join(CHESSBASE, "manifest"))
		.map((f) => size(path.join(CHESSBASE, "manifest", f))));
check("no manifest file is back above 9000 lines", biggest < 9000, true);

console.log(passed + " passed, " + failed + " failed"
	+ "  (" + games.length + " games, " + serialised.length + " bytes)");
process.exit(failed ? 1 : 0);
