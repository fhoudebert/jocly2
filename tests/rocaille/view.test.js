/*
 * View and rules-page tests for Rocaille - pure Node:
 *   node tests/rocaille/view.test.js
 *
 * The view itself can only be judged in a browser. What is checked here is what
 * churns: every piece aspect has a column in the family sprite sheet, those
 * columns fit inside the PNG that ships with the game, the 12x10 layout really
 * has its ring of edge squares, and the rules pages (English and French) crop
 * the same sheet at the same columns as the view. That last check is the one
 * that catches a widened sheet leaving the pages mis-framed - it has caught it
 * once already, when the sheet grew a twelfth column for the Ghost.
 *
 * The Rococo suite does the same for Rococo; the two are deliberately separate,
 * since the games use different sheets and different column sets.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const h = require("../rococo/harness.js");

const CHESSBASE = path.join(__dirname, "..", "..", "src", "games", "chessbase");

let passed = 0, failed = 0;

function check(label, actual, expected) {
	const a = JSON.stringify(actual), e = JSON.stringify(expected);
	if(a === e)
		passed++;
	else {
		failed++;
		console.log("FAIL " + label + "\n  expected " + e + "\n  actual   " + a);
	}
}

// minimal deep-extend, the only thing the view scripts need from jQuery here
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
		console: console,
		Math: Math,
		Object: Object,
		Array: Array,
		JSON: JSON,
		$: { extend: extend },
		View: { Game: {}, Board: {}, Move: {} },
	};
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	scripts.forEach((script) => {
		const code = fs.readFileSync(path.join(CHESSBASE, script), "utf8");
		vm.runInContext(code, sandbox, { filename: script });
	});
	return sandbox;
}

// PNG dimensions, straight from the IHDR chunk
function pngSize(file) {
	const buf = fs.readFileSync(file);
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const sb = loadView(["base-view.js", "grid-board-view.js", "ultima/baroque-view.js", "ultima/rocaille-view.js"]);
const view = sb.View.Game;
view.mViewOptions = { fullPath: "" };
const def = view.cbDefineView();
const style = def.pieces;

/* ------------------------------------------------------- sprite mapping */

const CELL = 100;
const modelSb = h.loadModel(["base-model.js", "grid-geo-model.js", "ultima/baroque-core.js", "ultima/rocaille-model.js"]);
const game = h.newGame(modelSb);
const aspects = Object.keys(game.cbVar.pieceTypes).map((t) => game.cbVar.pieceTypes[t].aspect);

check("every piece type declares an aspect", aspects.filter((a) => !a), []);

check("every aspect has a sprite column",
	aspects.filter((aspect) => !style[aspect] || style[aspect]["2d"].clipx === undefined), []);

const columns = aspects.map((aspect) => style[aspect]["2d"].clipx / CELL);
check("columns are distinct", columns.length, new Set(columns).size);

/* ------------------------------------------------------- the sheet fits */

const file = def.pieces["default"]["2d"].file;
check("the sprite sheet is the family one", file, "/res/ultima/baroque-picto-sprites.png");

const size = pngSize(path.join(CHESSBASE, file));
check("the sheet is wide enough for every piece",
	size.width >= (Math.max.apply(null, columns) + 1) * CELL, true);
check("the sheet has one row per side", size.height, 2 * CELL);
check("White is the first row, Black the second",
	[style["1"]["default"]["2d"].clipy, style["-1"]["default"]["2d"].clipy], [0, CELL]);

/* ------------------------------------------------------- the 12x10 layout */

check("the board is 10 rows of 12 squares",
	[def.boardLayout.length, new Set(def.boardLayout.map((r) => r.length)).size, def.boardLayout[0].length],
	[10, 1, 12]);

const ring = def.boardLayout.filter((row, i) => i === 0 || i === 9).join("")
	+ def.boardLayout.map((row) => row[0] + row[11]).join("");
check("the whole outer ring is marked as edge squares",
	ring.split("").filter((c) => c !== "e"), []);
check("the ring is 40 squares",
	def.boardLayout.join("").split("").filter((c) => c === "e").length, 40);
check("no square of the 10x8 field is an edge square",
	def.boardLayout.slice(1, 9).map((r) => r.slice(1, 11)).join("").indexOf("e"), -1);

/* --------------------------------------- the rules pages use the sheet */

const manifest = require(path.join(CHESSBASE, "index.js")).games.find((g) => g.name == "rocaille");

check("the manifest declares both rules pages",
	manifest.config.model.rules,
	{ en: "res/rules/rocaille/rocaille-rules.html", fr: "res/rules/rocaille/rocaille-rules_fr.html" });

check("and a thumbnail that exists",
	fs.existsSync(path.join(CHESSBASE, manifest.config.model.thumbnail)), true);

const pageErrors = [];
["en", "fr"].forEach((lang) => {
	const rel = manifest.config.model.rules[lang];
	const full = path.join(CHESSBASE, rel);
	if(!fs.existsSync(full)) {
		pageErrors.push(lang + ": file missing");
		return;
	}
	const page = fs.readFileSync(full, "utf8");

	if(page.indexOf("{GAME}" + file) < 0)
		pageErrors.push(lang + ": does not draw from the sprite sheet");

	// the page declares --k-cols: it must equal the sheet's real column count,
	// or every icon is mis-framed
	const declared = /--k-cols:\s*(\d+)/.exec(page);
	if(!declared)
		pageErrors.push(lang + ": no --k-cols declared");
	else if(parseInt(declared[1]) !== size.width / CELL)
		pageErrors.push(lang + ": --k-cols is " + declared[1] + ", sheet has " + (size.width / CELL));

	// .k-<name> { --k-col: c } must name the same column the view clips
	aspects.forEach((aspect) => {
		const name = aspect.replace(/^rocaille-/, "");
		const found = new RegExp("\\.k-" + name + "\\s*\\{[^}]*--k-col:\\s*(\\d+)").exec(page);
		if(!found)
			pageErrors.push(lang + "/" + name + ": no rule in the page");
		else if(parseInt(found[1]) !== style[aspect]["2d"].clipx / CELL)
			pageErrors.push(lang + "/" + name + ": page column " + found[1]
				+ ", view column " + (style[aspect]["2d"].clipx / CELL));
	});

	// the ring swatch in the page should be the colour the view paints
	const swatch = /\.k-edge\s*\{[^}]*background:\s*(#[0-9A-Fa-f]{6})/.exec(page);
	if(!swatch)
		pageErrors.push(lang + ": no edge swatch");
	else if(swatch[1].toUpperCase() !== "#6E5037")
		pageErrors.push(lang + ": edge swatch " + swatch[1] + ", view paints #6E5037");

	// the page must actually say what the variant changes - the recap is the
	// point of the page for anyone who already knows Rococo
	["Rococo"].forEach((word) => {
		if(page.indexOf(word) < 0)
			pageErrors.push(lang + ": never mentions " + word);
	});
});
check("the rules pages and the view agree on every sprite column", pageErrors, []);

console.log((failed ? "FAILED - " : "OK - ") + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
