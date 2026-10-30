/*
 * View tests for Ultima - pure Node:
 *   node tests/ultima/view.test.js
 *
 * The view itself can only be judged in a browser; what is checked here is
 * the part that will churn while the sprite sheet is being filled in: every
 * piece aspect declared by the model has a column in the sheet, no two
 * pieces share a column, and the columns actually fit inside the PNG that
 * ships with the game.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const h = require("./harness.js");

const CHESSBASE = path.join(__dirname, "..", "..", "..", "src", "games", "chessbase");

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

const sb = loadView(["base-view.js", "grid-board-view.js", "fairy-set-view.js", "ultima/baroque-view.js", "ultima/ultima-view.js"]);
const view = sb.View.Game;
view.mViewOptions = { fullPath: "" };
const def = view.cbDefineView();
const style = def.pieces;

/* ------------------------------------------------------- sprite mapping */

const CELL = 100;
const modelSb = h.loadModel(["base-model.js", "grid-geo-model.js", "ultima/ultima-model.js"]);
const game = h.newGame(modelSb);
const aspects = Object.keys(game.cbVar.pieceTypes).map((t) => game.cbVar.pieceTypes[t].aspect);

check("every piece type declares an aspect", aspects.filter((a) => !a), []);

check("every aspect has a sprite column",
	aspects.filter((aspect) => !style[aspect] || style[aspect]["2d"].clipx === undefined), []);

const columns = aspects.map((aspect) => style[aspect]["2d"].clipx / CELL);
check("columns are distinct", columns.length, new Set(columns).size);
// the Long Leaper is the frog of column 10, as in Rococo and Rocaille, so the
// columns are no longer contiguous; the sheet-width check below still holds
check("the Long Leaper is the frog", style["ultima-leaper"]["2d"].clipx / CELL, 10);

/* ------------------------------------------------------- the sheet fits */

const file = def.pieces["default"]["2d"].file;
check("the sprite sheet is the expected file", file, "/res/ultima/baroque-picto-sprites.png");

const size = pngSize(path.join(CHESSBASE, file));
check("the sheet is wide enough for every piece", size.width >= (Math.max.apply(null, columns) + 1) * CELL, true);
check("the sheet has one row per side", size.height, 2 * CELL);
check("White is the first row, Black the second",
	[style["1"]["default"]["2d"].clipy, style["-1"]["default"]["2d"].clipy], [0, CELL]);
check("cell size matches the sheet",
	[def.pieces["default"]["2d"].clipwidth, def.pieces["default"]["2d"].clipheight], [CELL, CELL]);

/* ------------------------------------------ the rules pages use the sheet */

const manifest = require(path.join(CHESSBASE, "index.js")).games.find((g) => g.name == "ultima");

// both pages, not just the English one: the French page is a separate file and
// the sprite sheet moved under it once without anything noticing
check("the manifest declares both rules pages",
	manifest.config.model.rules,
	{ en: "res/rules/ultima/ultima-rules.html", fr: "res/rules/ultima/ultima-rules_fr.html" });

const pageErrors = [];
["en", "fr"].forEach((lang) => {
	const rel = manifest.config.model.rules[lang];
	const full = path.join(CHESSBASE, rel);
	if(!fs.existsSync(full)) {
		pageErrors.push(lang + ": page is missing");
		return;
	}
	const rules = fs.readFileSync(full, "utf8");
	if(rules.indexOf("{GAME}" + file) < 0)
		pageErrors.push(lang + ": does not draw from the sprite sheet");
	// the page declares --u-cols: it must equal the sheet's real column count,
	// or every icon is mis-framed (this is exactly what breaks when the shared
	// sheet grows a column and the page is not updated)
	const declared = /--u-cols:\s*(\d+)/.exec(rules);
	if(!declared)
		pageErrors.push(lang + ": no --u-cols declaration");
	else if(parseInt(declared[1]) !== size.width / CELL)
		pageErrors.push(lang + ": --u-cols is " + declared[1] + ", sheet has " + (size.width / CELL));
	// .u-<name> { --u-col: c } must name the same column the view clips
	aspects.forEach((aspect) => {
		const name = aspect.replace(/^ultima-/, "");
		const found = new RegExp("\\.u-" + name + "\\s*\\{[^}]*--u-col:\\s*(\\d+)").exec(rules);
		if(!found) {
			pageErrors.push(lang + ": " + name + " has no rule in the page");
			return;
		}
		const col = style[aspect]["2d"].clipx / CELL;
		if(parseInt(found[1]) !== col)
			pageErrors.push(lang + ": " + name + " page column " + found[1] + ", view column " + col);
	});
});
check("the rules pages and the view agree on every sprite column", pageErrors, []);

/* ---------------------------------------------------------------- 3D */

// The 3D view borrows the fairy set: every aspect the model fields must name a
// piece fairy-set-view.js knows, whose mesh and textures are really on disk,
// and the manifest must both load fairy-set-view.js before the family view and
// offer - and preload - a 3D skin.
{
	check("3D board spec", typeof def.board["3d"].display, "function");
	check("3D coords", typeof def.coords["3d"], "function");
	const s3 = style["default"]["3d"].scale[0];
	// classic chess sets fairy pieces at 0.6 on 8x8; bigger boards shrink them
	check("3D piece scale shrinks with the board", s3 > 0.3 && s3 <= 0.6, true);
	check("3D click layer wider than the piece", def.clicker["3d"].scale[0] > s3, true);
	const map = view.baroquePieces3d, fairy = view.cbFairyPieceStyle3D;
	const RES = path.join(CHESSBASE, "res");
	const manifest = require(path.join(CHESSBASE, "manifest", "ultima.js")).games["ultima"];
	const skin = manifest.config.view.skins.find((s) => s["3d"]);
	check("manifest offers a 3D skin", !!skin, true);
	const scripts = manifest.viewScripts;
	check("fairy-set-view.js loaded before baroque-view.js",
		scripts.indexOf("fairy-set-view.js") >= 0 &&
		scripts.indexOf("fairy-set-view.js") < scripts.indexOf("ultima/baroque-view.js"), true);
	aspects.forEach((aspect) => {
		const fr = map[aspect];
		check(aspect + " has a 3D piece", typeof fr, "string");
		const spec = fairy[fr];
		check(aspect + " -> " + fr + " known to fairy-set-view.js", !!(spec && spec.mesh), true);
		if(!spec || !spec.mesh) return;
		const mesh = spec.mesh.jsFile.replace(/\.js$/, ".gltf");
		check(fr + " mesh on disk", fs.existsSync(path.join(CHESSBASE, mesh)), true);
		const ch = spec.materials.mat0.channels;
		const imgs = [ch.diffuse.texturesImg.diffImg, ch.normal.texturesImg.normalImg];
		imgs.forEach((img) => check(fr + " texture " + path.basename(img), fs.existsSync(path.join(CHESSBASE, img)), true));
		check(fr + " preloaded by the 3D skin", skin.preload.indexOf("smoothedfilegeo|0|" + spec.mesh.jsFile) >= 0, true);
	});
}


/* ------------------------------------------- pieces fit inside a square */

// A sprite is drawn to fill its gadget exactly, so a gadget wider than a square
// spills over the neighbouring ones. Ultima's board is small enough that it never
// did, but the size is shared with the rest of the family now, so it is checked
// here too.
{
	const FIELD = 12000, MARGIN = 0.67;			// grid-board-view.js
	const cols = 8 + 2 * MARGIN, rows = 8 + 2 * MARGIN;
	const ratio = cols / rows;
	const square = ratio < 1 ? (FIELD * ratio) / cols : (FIELD / ratio) / rows;

	const piece = def.pieces["default"]["2d"];
	check("a piece fits inside a board square", piece.width <= square, true);
	check("while filling most of it", piece.width / square > 0.9, true);
}

console.log((failed ? "FAILED" : "OK") + " - " + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
