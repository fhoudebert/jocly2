/*
 * What the rules page claims each Horde piece does, checked against the model.
 *
 *   node tests/khans/diagrams.test.js
 *
 * Khan's Chess is a game of divergent pieces: "moves as a knight, captures as
 * a rook" is not something a reader can guess from a piece portrait, so the
 * rules page carries a movement diagram per piece - and a diagram that says
 * the wrong thing is worse than none. The pictures themselves are drawn by
 * hand (res/rules/khans/*-moves.png); what is mechanical, and what this file
 * asserts, is the move set they are supposed to depict, read straight out of
 * cbVar.pieceTypes[t].graph. If a graph in khans-model.js changes, this fails
 * and names the drawing that has gone stale.
 *
 * The convention in those drawings: a green marker is a square the piece may
 * move to, a red one a square it may capture on. Only the kheshig has the two
 * sets equal - every other Horde piece captures somewhere it cannot move, or
 * the reverse.
 */

const fs = require("fs");
const path = require("path");

const H = require("./harness.js");

const RULES = path.join(__dirname, "..", "..", "..", "src", "games", "chessbase", "res", "rules", "khans");

const sandbox = H.loadModel();
const game = H.newGame(sandbox);
const c = sandbox.Model.Game.cbConstants;
const MASK = 0xffff;

const geo = game.cbVar.geometry;
const typeByName = (name) => {
	for(const t in game.cbVar.pieceTypes)
		if(game.cbVar.pieceTypes[t].name === name)
			return parseInt(t);
	throw new Error("no such piece type: " + name);
};

/*
 * Walk one piece's graph from one square. A graph is a list of lines (a single
 * square for a leaper, a whole ray for a slider), each entry being a position
 * OR-ed with its flags - the same structure cbGeneratePseudoLegalMoves reads.
 * The board is empty here, so every square of a ray is reachable and nothing
 * blocks: what comes out is the piece's pattern, not a position's move list.
 */
function pattern(name, square) {
	const from = geo.PosByName(square);
	const flags = {};
	const graph = game.cbVar.pieceTypes[typeByName(name)].graph[from] || [];
	graph.forEach((line) => {
		for(let i = 0; i < line.length; i++) {
			const pos = line[i] & MASK;
			flags[pos] = (flags[pos] || 0)
				| (line[i] & c.FLAG_MOVE ? 1 : 0)
				| (line[i] & c.FLAG_CAPTURE ? 2 : 0);
		}
	});
	return flags;
}

const squares = (name, want, square) => {
	const flags = pattern(name, square || "d4");
	return Object.keys(flags).map(Number).filter((pos) => flags[pos] & want)
		.map((pos) => geo.PosName(pos)).sort();
};

const t = H.runner();

console.log("\nwhat the diagrams have to show");

// the scout only ever moves towards rank 1, so its diagram is drawn from d7
t.check("scout moves to the 4 forward knight squares",
	squares("scout", 1, "d7"), ["b6", "c5", "e5", "f6"]);
t.check("scout captures straight ahead only", squares("scout", 2, "d7"), ["d6"]);

t.check("khatun moves on the 8 knight squares", squares("khatun", 1).length, 8);
t.check("khatun captures on the 8 king squares", squares("khatun", 2).length, 8);
t.check("khatun never captures where it moves",
	squares("khatun", 1).filter((s) => squares("khatun", 2).indexOf(s) >= 0), []);

t.check("archer moves on the 8 knight squares", squares("archer", 1).length, 8);
t.check("archer captures along the diagonals", squares("archer", 2).length, 13);

t.check("lancer moves on the 8 knight squares", squares("lancer", 1).length, 8);
t.check("lancer captures along the lines", squares("lancer", 2).length, 14);

t.check("kheshig moves and captures alike", squares("kheshig", 1), squares("kheshig", 2));
t.check("kheshig covers the knight and king squares together",
	squares("kheshig", 1).length, 16);

/*
 * The drawings are art, not generated, so nothing here can check what they
 * depict - but a rules page pointing at a file that is not there is worth
 * catching, and so is a piece that lost its diagram entirely.
 */
console.log("\nevery divergent piece has a diagram");

const pages = ["khans-rules.html", "khans-rules_fr.html"]
	.map((name) => fs.readFileSync(path.join(RULES, name), "utf8"));

["scout", "khatun", "archer", "lancer"].forEach((name) => {
	const file = name + "-moves.png";
	t.ok(file + " exists", fs.existsSync(path.join(RULES, file)));
	t.ok("both rules pages show " + file, pages.every((page) => page.indexOf(file) >= 0));
});
// the kheshig captures where it moves, so the set's centaur figure serves
t.ok("the kheshig is illustrated too",
	pages.every((page) => page.indexOf("centaur.png") >= 0));

t.done("Khan's Chess diagrams");
