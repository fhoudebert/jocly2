/*
 * The two things the rules suites cannot see: what the board actually draws,
 * and whether the search understands campmate.
 *
 *   npx gulp build && node tests/khans/game.test.js
 *
 * 1. Every piece type names an `aspect`, and an aspect that does not exist in
 *    fairy-set-view.js - or exists but points at a mesh/texture that is not in
 *    res/ - fails silently at run time: the piece simply does not appear, and
 *    only on the 3D skin, or only for that one piece. A typo like 'fr-bow2'
 *    costs nothing to make and is invisible until someone opens the game. So
 *    the aspects are checked against the view tables and against the disk.
 *
 * 2. Campmate is decided in the model's evaluate(), which the alpha-beta
 *    search reads through Board.Evaluate. That it ends the game when asked
 *    directly is what tests/khans/rules.test.js checks; that the AI actually
 *    plays it, and avoids letting the opponent play it, needs the real search
 *    on the real build.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..", "..");
const CHESSBASE = path.join(ROOT, "src", "games", "chessbase");

let Jocly;
try {
	Jocly = require(ROOT);
} catch(e) {
	console.log("SKIP - no build yet: run npx gulp build first");
	process.exit(0);
}

const H = require("./harness.js");
const t = H.runner();

/* ---------------- aspects ---------------- */

console.log("\npiece aspects");

const setView = fs.readFileSync(path.join(CHESSBASE, "fairy-set-view.js"), "utf8");
// cbFairyPieceStyle (2D sprite offsets) comes first, the 3D mesh table after.
// Split on the assignment: the name itself is mentioned earlier, inside the 2D
// function that delegates to it.
const split = setView.indexOf("View.Game.cbFairyPieceStyle3D =");
const styles2d = setView.slice(0, split), meshes3d = setView.slice(split);

const sandbox = H.loadModel();
const game = H.newGame(sandbox);
const aspects = [];
for(const type in game.cbVar.pieceTypes) {
	const pType = game.cbVar.pieceTypes[type];
	if(aspects.indexOf(pType.aspect) < 0)
		aspects.push(pType.aspect);
}
t.check("every piece type declares an aspect",
	aspects.filter((a) => !a).length, 0);

aspects.forEach((aspect) => {
	const declared2d = new RegExp('"' + aspect + '"\\s*:\\s*\\{\\s*"2d"').test(styles2d);
	const mesh = new RegExp('"' + aspect + '"\\s*:\\s*\\{\\s*mesh:\\s*\\{\\s*jsFile:\\s*"([^"]+)"')
		.exec(meshes3d);
	t.ok(aspect + " has a 2D sprite", declared2d);
	if(!mesh) {
		t.ok(aspect + " has a 3D mesh", false);
		return;
	}
	// the loader rewrites the historical ".js" mesh name to the ".gltf" that
	// actually ships (see jocly.xd-view.js)
	const gltf = mesh[1].replace(/\.js$/, ".gltf");
	t.ok(aspect + " ships " + path.basename(gltf), fs.existsSync(path.join(CHESSBASE, gltf)));
});

/*
 * The evaluation addresses pieces by type NUMBER, and the numbers are not in
 * the order the rules present the pieces (8 is the lancer, not the khatun).
 * A wrong number there is silent: the game still plays, the AI just encourages
 * the wrong development. So the numbers the model hard-codes are checked
 * against the names they are meant to mean.
 */
console.log("\nevaluation type numbers");
const source = fs.readFileSync(path.join(CHESSBASE, "asymmetric", "khans-model.js"), "utf8");
const nameOfType = (type) => (game.cbVar.pieceTypes[type] || {}).name;

const minorList = /\[\[1,2\],\[1,3\],\[-1,(\d+)\],\[-1,(\d+)\]\]/.exec(source);
t.ok("the minor-piece list is where it was", !!minorList);
if(minorList) {
	t.check("Kingdom minors are the knight and bishop",
		[nameOfType(2), nameOfType(3)], ["knight", "bishop"]);
	t.check("Horde minors are the lancer and archer, not the kheshig or khatun",
		[nameOfType(parseInt(minorList[1])), nameOfType(parseInt(minorList[2]))].sort(),
		["archer", "lancer"]);
}
t.check("the scouts counted for promotion are scouts",
	nameOfType(parseInt(/material\[-1\]\.byType\[(\d+)\]/.exec(source)[1])), "scout");
t.check("the pawns counted for promotion are pawns",
	nameOfType(parseInt(/material\[1\]\.byType\[(\d+)\]/.exec(source)[1])), "pawn");
t.check("the bishop-pair penalty counts bishops",
	nameOfType(parseInt(/material\[1\]\.count\[(\d+)\]/.exec(source)[1])), "bishop");
t.check("a scout promotes into a khatun",
	nameOfType(game.cbVar.promote(game, { t: 7 }, { t: 3 })[0]), "khatun");

/*
 * The 50-move counter. The Horde has no pawns, so the ini hands that job to
 * the scouts ("nMoveRuleTypesBlack = s"); if the model disagreed, the two
 * would call a draw at different times - something perft can never show.
 */
const counter = (pieces, from) => {
	const board = H.setup(sandbox, game, pieces, -1);
	board.noCaptCount = 42;
	board.GenerateMoves(game);
	const move = board.mMoves.filter((m) => m.f === game.cbVar.geometry.PosByName(from))[0];
	board.ApplyMove(game, move);
	return board.noCaptCount;
};
t.check("a scout move resets the counter",
	counter({ e1: "wK", e8: "bK", d7: "bS" }, "d7"), 0);
t.check("a kheshig move does not",
	counter({ e1: "wK", e8: "bK", d7: "bH" }, "d7"), 43);

/* ---------------- the rules page ---------------- */

/*
 * Which moves hop and which slide. grid-board-view.js works this out from the
 * piece graphs, so the view does not need - and must not have - a hand-rolled
 * cbMoveMidZ: an override would have to re-derive all of this, and the ones
 * written before that code existed silently dropped the king's hop over the
 * rook when castling. What is checked here is the outcome, on this game's own
 * pieces, plus the fact that the view leaves it alone.
 */
console.log("\nmove animation");

const view = fs.readFileSync(path.join(CHESSBASE, "asymmetric", "khans-view.js"), "utf8");
t.ok("the view does not override cbMoveMidZ", view.indexOf("cbMoveMidZ =") < 0);

// lift the shared implementation out of grid-board-view.js and run it here:
// loading the whole view layer would need a browser
const gridView = fs.readFileSync(path.join(CHESSBASE, "grid-board-view.js"), "utf8");
const from = gridView.indexOf("View.Board.cbMoveMidZ");
let cursor = gridView.indexOf("{", from), depth = 0, to = cursor;
for(; to < gridView.length; to++) {
	if(gridView[to] === "{") depth++;
	else if(gridView[to] === "}" && --depth === 0) { to++; break; }
}
const viewCtx = { View: { Board: {} }, console };
require("vm").runInContext(gridView.slice(from, to), require("vm").createContext(viewCtx));
const midZ = viewCtx.View.Board.cbMoveMidZ;
const square = (name) => game.cbVar.geometry.PosByName(name);
const hops = (abbrev, f, to_, extra) =>
	midZ(game, Object.assign({ a: abbrev, f: square(f), t: square(to_), c: null }, extra), 0, 0) > 0;

t.check("the kheshig hops on a knight move", hops("H", "d4", "e6"), true);
t.check("and slides on a king step", hops("H", "d4", "d5"), false);
t.check("the lancer hops when it moves", hops("L", "d4", "e6"), true);
t.check("and slides when it captures down the file", hops("L", "d4", "d8"), false);
t.check("the archer slides along its diagonal", hops("A", "d4", "g7"), false);
t.check("the scout hops forward", hops("S", "d7", "e5"), true);
t.check("and slides onto the square it takes", hops("S", "d7", "d6"), false);
t.check("the king still hops over the rook when castling",
	hops("K", "e1", "g1", { cg: 1 }), true);

console.log("\nrules page resources");

const entry = require(path.join(CHESSBASE, "manifest", "asymmetric.js")).games["khans-chess"].config.model;
// credits and description are optional - several games in the module declare
// neither - so only what the entry actually points at is checked
const declared = [entry.thumbnail]
	.concat(Object.values(entry.rules || {}))
	.concat(Object.values(entry.credits || {}))
	.concat(Object.values(entry.description || {}))
	.filter(Boolean);
declared.forEach((file) => {
	t.ok("the manifest's " + path.basename(file) + " exists",
		fs.existsSync(path.join(CHESSBASE, file)));
});

// every {GAME}-relative asset the pages point at
const referenced = [];
declared.filter((f) => /\.html$/.test(f)).forEach((file) => {
	const html = fs.readFileSync(path.join(CHESSBASE, file), "utf8");
	let match, re = /\{GAME\}\/([^"')\s]+)/g;
	while((match = re.exec(html)) !== null)
		if(referenced.indexOf(match[1]) < 0)
			referenced.push(match[1]);
});
t.ok("the pages do reference their diagrams", referenced.length >= 6);
referenced.forEach((file) => {
	t.ok(path.basename(file) + " is on disk", fs.existsSync(path.join(CHESSBASE, file)));
});

/* ---------------- the AI and campmate ---------------- */

(async () => {
	console.log("\nthe search and campmate");

	const match = await Jocly.createMatch("khans-chess");
	const levels = match.game.config.model.levels;
	const native = levels.filter((l) => l && l.ai !== "fairy-stockfish").pop();
	t.ok("a native level to search with (" + (native.label || native.name) + ")", !!native);

	// White to move, king on e7: e8/d8/f8 all enter the camp and none is
	// covered, so anything else throws away an immediate win.
	await match.load({ game: "khans-chess", initialBoard: "8/4K3/8/8/8/1k6/7l/8 w - - 0 1", playedMoves: [] });
	const found = await match.machineSearch({ level: native });
	const played = match.game.CreateMove(found.move).ToString("engine");
	t.ok("the AI walks into the camp (" + played + ")", /^e7[d-f]8$/.test(played));
	await match.applyMove(found.move);
	t.check("and the game is over, White winning", match.game.GetFinished(), 1);

	// The mirror image: the Horde is one step from ITS camp, the Kingdom to
	// move must not let it happen. Only Kd2 covers d1/e1 - taking the khan's
	// two entries away - so any other move loses on the spot.
	const match2 = await Jocly.createMatch("khans-chess");
	await match2.load({ game: "khans-chess", initialBoard: "8/8/8/8/8/8/3K4/4k3 b - - 0 1", playedMoves: [] });
	t.check("the Horde is already in", match2.game.GetFinished(), -1);

	// Defence: the khan stands on b2, one step from three camp squares, and
	// White has a rook that can cover the whole rank. Failing to see this is
	// losing on the spot, and it is the search reading evaluate(), not the
	// rules, that has to notice - hence at the real level, on the real build.
	const match3 = await Jocly.createMatch("khans-chess");
	await match3.load({ game: "khans-chess", initialBoard: "8/8/6K1/7R/8/8/1k6/8 w - - 0 1", playedMoves: [] });
	const defence = await match3.machineSearch({ level: native });
	await match3.applyMove(defence.move);
	t.check("the defence keeps the game alive", match3.game.GetFinished(), 0);
	const replies = await match3.getPossibleMoves();
	const campEntries = replies.filter((m) => (m.t & 0xffff) < 8
		&& match3.game.mBoard.pieces[match3.game.mBoard.board[m.f]].t === 12);
	t.check("and leaves the khan no way into the camp ("
		+ match3.game.CreateMove(defence.move).ToString("engine") + ")", campEntries.length, 0);

	t.done("Khan's Chess view and search");
})().catch((error) => { console.error("ERROR", error); process.exit(2); });
