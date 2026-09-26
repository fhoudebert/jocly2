/*
 * Every text file of the repository is UTF-8, without BOM.
 *
 *   node tests/core/text-utf8.test.js
 *
 * The rules, credits and descriptions are fetched as text by the pages and
 * decoded as UTF-8: a Latin-1 file shows "J\ufffdr\ufffdme" instead of "Jérôme"
 * (makromachy-credits.html did). The build copies them untouched - gulp.src
 * with encoding:false, see readSrc() in gulpfile.js - so nothing on the way
 * fixes them either.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const H = require("../fairy/harness.js");
const t = H.runner();

const ROOT = path.join(__dirname, "..", "..");
const TEXT = /\.(js|mjs|cjs|html?|json|gltf|css|md|txt|svg|xml|ini|py|sh|cpp|h)$|(^|\/)\.htaccess$/i;

let files;
try {
	files = execFileSync("git", ["ls-files", "src", "examples", "third-party", "tools", "tests"],
		{ cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 }).split("\n").filter(Boolean);
} catch(err) {
	console.log("not a git checkout, skipped");
	process.exit(0);
}

const decoder = new TextDecoder("utf-8", { fatal: true });
const notUtf8 = [], bom = [];
let checked = 0;
for(const file of files.filter((f) => TEXT.test(f))) {
	const full = path.join(ROOT, file);
	if(!fs.existsSync(full)) continue;
	const bytes = fs.readFileSync(full);
	checked++;
	try { decoder.decode(bytes); } catch(err) { notUtf8.push(file); }
	if(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) bom.push(file);
}

t.check("some text files were checked", checked > 500, true);
t.check("every text file is UTF-8", notUtf8, []);
t.check("no text file starts with a BOM", bom, []);

t.done("text files UTF-8");
