/*
 * Rocaille weighs its pieces with its own material table (values dial of
 * baroque-core.js), measured on its setup; Rococo keeps the default one.
 */
const h = require("../rococo/harness.js");
let pass = 0, fail = 0;
function check(label, actual, expected) {
	if(JSON.stringify(actual) === JSON.stringify(expected)) pass++;
	else { fail++; console.log("FAIL " + label + "\n  expected " + JSON.stringify(expected) + "\n  actual   " + JSON.stringify(actual)); }
}
function values(variant) {
	const sb = h.loadModel(["base-model.js", "grid-geo-model.js", "ultima/baroque-core.js", "ultima/" + variant + "-model.js"]);
	const game = h.newGame(sb), out = {};
	for(const t in game.cbVar.pieceTypes) out[game.cbVar.pieceTypes[t].name] = game.cbVar.pieceTypes[t].value;
	return out;
}
const rocaille = values("rocaille"), rococo = values("rococo");
check("Rocaille table", rocaille, { "cannon-pawn": 1, "advancer": 6, "long-leaper": 4.5, "swapper": 4.5,
	"withdrawer": 2.5, "chameleon": 4, "immobilizer": 12, "king": 0 });
check("Rococo keeps the default table", rococo, { "cannon-pawn": 2, "advancer": 6, "long-leaper": 6, "swapper": 6,
	"withdrawer": 5, "chameleon": 5, "immobilizer": 8, "king": 0 });
// the rules page shows the same figures
const fs = require("fs"), path = require("path");
const RULES = path.join(__dirname, "..", "..", "..", "src", "games", "chessbase", "res", "rules", "rocaille");
for(const [file, nums] of [["rocaille-rules_fr.html", ["≈ 12", "6", "4,5", "4", "2,5", "1"]], ["rocaille-rules.html", ["≈ 12", "6", "4.5", "4", "2.5", "1"]]]) {
	const html = fs.readFileSync(path.join(RULES, file), "utf8");
	nums.forEach((n) => check(file + " shows " + n, html.includes("<td>" + n + "</td>"), true));
}
console.log((fail ? "FAILED" : "OK") + " - " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
