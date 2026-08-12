/*
 * View and rules-page tests for Rococo - pure Node:
 *   node tests/rococo/view.test.js
 *
 * The view itself can only be judged in a browser. What is checked here is
 * what churns: every piece aspect has a column in the sprite sheet shared with
 * Ultima, those columns fit inside the PNG that ships with the game, the 10x10
 * layout really has its ring of edge squares, and the rules pages (English and
 * French) crop the same sheet at the same columns as the view. That last check
 * is the one that catches a widened sheet leaving the pages mis-framed.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const h = require("./harness.js");

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

const sb = loadView(["base-view.js", "grid-board-view.js", "ultima/baroque-view.js", "ultima/rococo-view.js"]);
const view = sb.View.Game;
view.mViewOptions = { fullPath: "" };
const def = view.cbDefineView();
const style = def.pieces;

/* ------------------------------------------------------- sprite mapping */

const CELL = 100;
const modelSb = h.loadModel(["base-model.js", "grid-geo-model.js", "ultima/baroque-core.js", "ultima/rococo-model.js"]);
const game = h.newGame(modelSb);
const aspects = Object.keys(game.cbVar.pieceTypes).map((t) => game.cbVar.pieceTypes[t].aspect);

check("every piece type declares an aspect", aspects.filter((a) => !a), []);

check("every aspect has a sprite column",
	aspects.filter((aspect) => !style[aspect] || style[aspect]["2d"].clipx === undefined), []);

const columns = aspects.map((aspect) => style[aspect]["2d"].clipx / CELL);
check("columns are distinct", columns.length, new Set(columns).size);

/* ------------------------------------------------------- the sheet fits */

const file = def.pieces["default"]["2d"].file;
check("the sprite sheet is the one shared with Ultima",
	file, "/res/ultima/baroque-picto-sprites.png");

const size = pngSize(path.join(CHESSBASE, file));
check("the sheet is wide enough for every piece",
	size.width >= (Math.max.apply(null, columns) + 1) * CELL, true);
check("the sheet has one row per side", size.height, 2 * CELL);
check("White is the first row, Black the second",
	[style["1"]["default"]["2d"].clipy, style["-1"]["default"]["2d"].clipy], [0, CELL]);

/* ------------------------------------------------------ the 10x10 layout */

check("the board is 10 rows of 10 squares",
	[def.boardLayout.length, new Set(def.boardLayout.map((r) => r.length)).size, def.boardLayout[0].length],
	[10, 1, 10]);

const ring = def.boardLayout.filter((row, i) => i === 0 || i === 9).join("")
	+ def.boardLayout.map((row) => row[0] + row[9]).join("");
check("the whole outer ring is marked as edge squares",
	ring.split("").filter((c) => c !== "e"), []);
check("the ring is 36 squares",
	def.boardLayout.join("").split("").filter((c) => c === "e").length, 36);
check("no inner square is an edge square",
	def.boardLayout.slice(1, 9).map((r) => r.slice(1, 9)).join("").indexOf("e"), -1);

/* --------------------------------------- the rules pages use the sheet */

const manifest = require(path.join(CHESSBASE, "index.js")).games.find((g) => g.name == "rococo");

check("the manifest declares both rules pages",
	manifest.config.model.rules,
	{ en: "res/rules/rococo/rococo-rules.html", fr: "res/rules/rococo/rococo-rules_fr.html" });

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

	// the page declares --r-cols: it must equal the sheet's real column count,
	// or every icon is mis-framed
	const declared = /--r-cols:\s*(\d+)/.exec(page);
	if(!declared)
		pageErrors.push(lang + ": no --r-cols declared");
	else if(parseInt(declared[1]) !== size.width / CELL)
		pageErrors.push(lang + ": --r-cols is " + declared[1] + ", sheet has " + (size.width / CELL));

	// .r-<name> { --r-col: c } must name the same column the view clips
	aspects.forEach((aspect) => {
		const name = aspect.replace(/^rococo-/, "");
		const found = new RegExp("\\.r-" + name + "\\s*\\{[^}]*--r-col:\\s*(\\d+)").exec(page);
		if(!found)
			pageErrors.push(lang + "/" + name + ": no rule in the page");
		else if(parseInt(found[1]) !== style[aspect]["2d"].clipx / CELL)
			pageErrors.push(lang + "/" + name + ": page column " + found[1]
				+ ", view column " + (style[aspect]["2d"].clipx / CELL));
	});

	// every piece should actually be shown in the table
	aspects.forEach((aspect) => {
		const name = aspect.replace(/^rococo-/, "");
		if(page.indexOf("r-icon r-" + name) < 0)
			pageErrors.push(lang + "/" + name + ": not shown in the page");
	});
});
check("the rules pages and the view agree on every sprite column", pageErrors, []);

check("the thumbnail declared in the manifest exists",
	fs.existsSync(path.join(CHESSBASE, manifest.config.model.thumbnail)), true);

/* ------------------------------------------------------------ 2D only */

check("no 3D board spec", def.board["3d"], undefined);
check("no 3D coords", def.coords["3d"], undefined);

/* ------------------------------------------- pieces fit inside a square */

// A sprite is drawn to fill its gadget exactly, so a gadget wider than a square
// spills over the neighbouring ones. Rococo's board is small enough that it never
// did, but the size is shared with the rest of the family now, so it is checked
// here too.
{
	const FIELD = 12000, MARGIN = 0.67;			// grid-board-view.js
	const cols = 10 + 2 * MARGIN, rows = 10 + 2 * MARGIN;
	const ratio = cols / rows;
	const square = ratio < 1 ? (FIELD * ratio) / cols : (FIELD / ratio) / rows;

	const piece = def.pieces["default"]["2d"];
	check("a piece fits inside a board square", piece.width <= square, true);
	check("while filling most of it", piece.width / square > 0.9, true);
}

console.log((failed ? "FAILED" : "OK") + " - " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
