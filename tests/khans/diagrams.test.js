/*
 * The movement diagrams of the rules page, drawn FROM THE MODEL'S OWN GRAPHS.
 *
 *   node tests/khans/diagrams.test.js            check they are up to date
 *   node tests/khans/diagrams.test.js --update   redraw them
 *
 * Khan's Chess is a game of divergent pieces: "moves as a knight, captures as
 * a rook" is not something a reader can guess from a piece portrait, so the
 * rules page needs a real diagram per piece - and a diagram that says the
 * wrong thing is worse than none. Deriving them from cbVar.pieceTypes[t].graph
 * rather than drawing them by hand means they cannot disagree with what the
 * game actually plays: change a graph in khans-model.js and this test fails
 * until the pictures are redrawn.
 *
 * Green disc = may move there (FLAG_MOVE), red ring = may capture there
 * (FLAG_CAPTURE), both = a square that is both, as for the kheshig, which is
 * the only Horde piece that captures where it moves.
 *
 * SVG rather than PNG: it is text, so it diffs, and gulp copies a module's
 * res/** verbatim into the build.
 */

const fs = require("fs");
const path = require("path");

const H = require("./harness.js");

const OUT = path.join(__dirname, "..", "..", "src", "games", "chessbase", "res", "rules", "khans");
const UPDATE = process.argv.indexOf("--update") >= 0;

const sandbox = H.loadModel();
const game = H.newGame(sandbox);
const c = sandbox.Model.Game.cbConstants;
const MASK = 0xffff;

const CELL = 34, BOARD = 8 * CELL;
const LIGHT = "#F1D9B3", DARK = "#C7885D";
const MOVE = "#2E7D32", CAPTURE = "#C62828";

// piece name -> [fen letter, the square it stands on]
const SUBJECTS = [
	["scout",   "S", "d4"],
	["khatun",  "T", "d4"],
	["archer",  "A", "d4"],
	["lancer",  "L", "d4"],
	["kheshig", "H", "d4"],
];

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
function pattern(type, square) {
	const from = geo.PosByName(square);
	const flags = {};
	const graph = game.cbVar.pieceTypes[type].graph[from] || [];
	graph.forEach((line) => {
		for(let i = 0; i < line.length; i++) {
			const entry = line[i];
			const pos = entry & MASK;
			flags[pos] = (flags[pos] || 0)
				| (entry & c.FLAG_MOVE ? 1 : 0)
				| (entry & c.FLAG_CAPTURE ? 2 : 0);
		}
	});
	return { from, flags };
}

function svg(name, letter, square) {
	const { from, flags } = pattern(typeByName(name), square);
	const x = (pos) => geo.C(pos) * CELL;
	const y = (pos) => (7 - geo.R(pos)) * CELL;
	const parts = [];
	parts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + BOARD + ' ' + BOARD + '"'
		+ ' width="' + BOARD + '" height="' + BOARD + '" role="img"'
		+ ' aria-label="' + name + ': green = move, red = capture">');
	for(let pos = 0; pos < 64; pos++)
		parts.push('<rect x="' + x(pos) + '" y="' + y(pos) + '" width="' + CELL + '" height="' + CELL
			+ '" fill="' + ((geo.C(pos) + geo.R(pos)) % 2 ? LIGHT : DARK) + '"/>');
	Object.keys(flags).map(Number).sort((a, b) => a - b).forEach((pos) => {
		const cx = x(pos) + CELL / 2, cy = y(pos) + CELL / 2;
		if(flags[pos] & 2)
			parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="12" fill="none" stroke="'
				+ CAPTURE + '" stroke-width="3"/>');
		if(flags[pos] & 1)
			parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="6" fill="' + MOVE + '"/>');
	});
	parts.push('<circle cx="' + (x(from) + CELL / 2) + '" cy="' + (y(from) + CELL / 2)
		+ '" r="14" fill="#1B1B1B"/>');
	parts.push('<text x="' + (x(from) + CELL / 2) + '" y="' + (y(from) + CELL / 2 + 6)
		+ '" text-anchor="middle" font-family="sans-serif" font-size="17" font-weight="bold"'
		+ ' fill="#FFFFFF">' + letter + '</text>');
	parts.push('</svg>');
	return parts.join("\n") + "\n";
}

/*
 * The starting position, drawn from the `initial` declarations of the piece
 * types - so the rules page cannot show a setup the game does not deal.
 */
function setupSvg() {
	const parts = [];
	parts.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + BOARD + ' ' + BOARD + '"'
		+ ' width="' + BOARD + '" height="' + BOARD + '" role="img"'
		+ ' aria-label="Khan\'s Chess starting position">');
	const x = (pos) => geo.C(pos) * CELL;
	const y = (pos) => (7 - geo.R(pos)) * CELL;
	for(let pos = 0; pos < 64; pos++)
		parts.push('<rect x="' + x(pos) + '" y="' + y(pos) + '" width="' + CELL + '" height="' + CELL
			+ '" fill="' + ((geo.C(pos) + geo.R(pos)) % 2 ? LIGHT : DARK) + '"/>');
	const men = [];
	for(const t in game.cbVar.pieceTypes) {
		const pType = game.cbVar.pieceTypes[t];
		(pType.initial || []).forEach((man) => men.push({
			pos: man.p, side: man.s,
			letter: pType.fenAbbrev || pType.abbrev || "?",
		}));
	}
	men.sort((a, b) => a.pos - b.pos).forEach((man) => {
		const cx = x(man.pos) + CELL / 2, cy = y(man.pos) + CELL / 2;
		const horde = man.side < 0;
		parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="14" fill="'
			+ (horde ? "#1B1B1B" : "#FCFCFC") + '" stroke="#1B1B1B" stroke-width="1.5"/>');
		parts.push('<text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle"'
			+ ' font-family="sans-serif" font-size="17" font-weight="bold" fill="'
			+ (horde ? "#FFFFFF" : "#1B1B1B") + '">' + man.letter + '</text>');
	});
	parts.push('</svg>');
	return parts.join("\n") + "\n";
}

const t = H.runner();

console.log("\n" + (UPDATE ? "redrawing" : "checking") + " the Horde diagrams");
[["setup", setupSvg()]].concat(SUBJECTS.map(([name, letter, square]) =>
		[name + "-moves", svg(name, letter, square)]))
	.forEach(([base, drawn]) => {
		const file = path.join(OUT, (base === "setup" ? "khans-setup" : base) + ".svg");
		if(UPDATE) {
			fs.writeFileSync(file, drawn);
			console.log("  written " + path.basename(file));
			t.ok(base, true);
		} else {
			const onDisk = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
			if(onDisk === null)
				t.ok(base + " (missing - run with --update)", false);
			else
				t.ok(base + " diagram matches the model", onDisk === drawn);
		}
	});

/*
 * The diagrams are only worth anything if they say what the rules say, so
 * assert the patterns themselves rather than just their pictures.
 */
console.log("\nwhat the diagrams show");
const squares = (name, want) => {
	const { flags } = pattern(typeByName(name), "d4");
	return Object.keys(flags).map(Number).filter((pos) => flags[pos] & want)
		.map((pos) => geo.PosName(pos)).sort();
};
t.check("scout moves to the 4 forward knight squares", squares("scout", 1), ["b3","c2","e2","f3"]);
t.check("scout captures straight ahead only", squares("scout", 2), ["d3"]);
t.check("khatun captures on the 8 king squares", squares("khatun", 2).length, 8);
t.check("khatun moves on the 8 knight squares", squares("khatun", 1).length, 8);
t.check("archer captures along the diagonals", squares("archer", 2).length, 13);
t.check("lancer captures along the lines", squares("lancer", 2).length, 14);
t.check("kheshig moves and captures alike", squares("kheshig", 1), squares("kheshig", 2));

t.done("Khan's Chess diagrams");
