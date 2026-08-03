/*
 * Space Spartan - pieces, evaluation, 50-move counter:
 *   node tests/space-spartan/rules.test.js
 *
 * Three 6x8 planes, A below, B in the middle, C on top. Squares are named
 * plane + file + rank, as the engine prints them.
 *
 * Two families face each other: the FIDE army moves in the plane and changes
 * plane only to capture; the Spartan army mirrors it - the hoplite MOVES where
 * the pawn CAPTURES and captures where the pawn moves - and everything else it
 * has is a leaper, which is what keeps it in the game on a crowded board.
 *
 * What is checked below is the geometry of each Spartan piece (so that a
 * future retune of the values cannot silently change the moves), the two
 * evaluation terms that used to see only one of the two armies, and the
 * 50-move counter.
 */

const h = require("./harness.js");

const sb = h.loadModel();
const game = h.newGame(sb);
const t = h.runner();

const pos = (pieces, who) => h.setup(sb, game, pieces, who);
const from = (board, square) => h.movesFrom(board, game, square);

console.log("\n-- the two armies --");
{
	const board = h.newBoard(sb, game);
	const tally = {};
	h.census(board, game).forEach((p) => tally[p] = (tally[p] || 0) + 1);
	t.check("Persians", { P: tally.wP, N: tally.wN, B: tally.wB, R: tally.wR, Q: tally.wQ, K: tally.wK },
		{ P: 18, N: 4, B: 4, R: 2, Q: 1, K: 1 });
	t.check("Spartans", { H: tally.bH, M: tally.bM, S: tally.bS, O: tally.bO, C: tally.bC, K: tally.bK, E: tally.bE },
		{ H: 18, M: 4, S: 4, O: 1, C: 1, K: 1, E: 1 });
	t.check("30 men each", [Object.keys(tally).filter((k) => k[0] === "w").reduce((n, k) => n + tally[k], 0),
	                        Object.keys(tally).filter((k) => k[0] === "b").reduce((n, k) => n + tally[k], 0)], [30, 30]);

	board.GenerateMoves(game);
	t.check("Persian opening moves", board.mMoves.length, 49);
	board.mWho = -1;
	board.GenerateMoves(game);
	t.check("Spartan opening moves", board.mMoves.length, 74);
}

console.log("\n-- pawn and hoplite are mirror images --");
{
	// a lone pawn and a lone hoplite in mid-board, enemies all around them so
	// that every capture is available
	const ring = { "Bb6": "bH", "Bd6": "bH", "Cc6": "bH", "Ac6": "bH" };
	const pawn = pos(Object.assign({ "Aa1": "wK", "Cf8": "bK", "Bc5": "wP" }, ring), 1);
	t.check("the pawn steps straight and takes sideways or through the planes",
		from(pawn, "Bc5"), ["PBc5-Bc6", "PBc5xAc6", "PBc5xBb6", "PBc5xBd6", "PBc5xCc6"]);

	const guard = { "Bc4": "wP", "Cb4": "wP", "Cd4": "wP", "Ab4": "wP", "Ad4": "wP" };
	const hoplit = pos(Object.assign({ "Aa1": "wK", "Cf8": "bK", "Bc5": "bH" }, guard), -1);
	t.check("the hoplite steps sideways and takes straight or through the planes",
		from(hoplit, "Bc5"), ["HBc5-Bb4", "HBc5-Bd4", "HBc5xAb4", "HBc5xAd4", "HBc5xBc4", "HBc5xCb4", "HBc5xCd4"]);
}

console.log("\n-- the initial hoplite jumps two squares diagonally --");
{
	const board = pos({ "Aa1": "wK", "Cf8": "bK", "Bc7": "bH*" }, -1);
	// "=H" is the initial hoplite turning into the ordinary one, the way an
	// initial pawn does after its first move
	t.check("one step or two, always diagonally forward", from(board, "Bc7"),
		["HBc7-Ba5=H", "HBc7-Bb6=H", "HBc7-Bd6=H", "HBc7-Be5=H"]);
}

console.log("\n-- homoioi: one or two steps, orthogonally or between planes --");
{
	const board = pos({ "Aa1": "wK", "Cf8": "bK", "Bc5": "bM" }, -1);
	t.check("ten squares from Bc5", from(board, "Bc5"),
		["MBc5-Ac5", "MBc5-Ba5", "MBc5-Bb5", "MBc5-Bc3", "MBc5-Bc4",
		 "MBc5-Bc6", "MBc5-Bc7", "MBc5-Bd5", "MBc5-Be5", "MBc5-Cc5"]);
}

console.log("\n-- skiritai: sideways to move, diagonally to fight --");
{
	const board = pos({ "Aa1": "wK", "Cf8": "bK", "Bc5": "bS" }, -1);
	const list = from(board, "Bc5");
	t.ok("it may step sideways", list.indexOf("SBc5-Bb5") >= 0 && list.indexOf("SBc5-Bd5") >= 0);
	t.ok("it jumps two squares diagonally in its plane", list.indexOf("SBc5-Ba3") >= 0);
	t.ok("it changes plane by the corners", list.indexOf("SBc5-Cd6") >= 0 && list.indexOf("SBc5-Ab4") >= 0);
	t.check("18 squares in all from Bc5", list.length, 18);

	// the sideways step is a move, never a capture
	const blocked = pos({ "Aa1": "wK", "Cf8": "bK", "Bc5": "bS", "Bb5": "wP", "Bb4": "wP" }, -1);
	const list2 = from(blocked, "Bc5");
	t.ok("it cannot take sideways", list2.indexOf("SBc5xBb5") < 0);
	t.ok("but it does take diagonally", list2.indexOf("SBc5xBb4") >= 0);
}

console.log("\n-- evaluation sees both armies --");
{
	// material as Evaluate() builds it, so that cbVar.evaluate can be called
	// on its own
	function materialOf(board) {
		const m = { "1": { count: [], byType: {} }, "-1": { count: [], byType: {} } };
		for(let i = 0; i < game.g.pTypes.length; i++) m["1"].count[i] = m["-1"].count[i] = 0;
		board.pieces.filter((p) => p.p >= 0).forEach((p) => {
			m[p.s].count[p.t]++;
			(m[p.s].byType[p.t] = m[p.s].byType[p.t] || []).push(p);
		});
		return m;
	}
	function evaluate(board) {
		const material = materialOf(board);
		let pv = { "1": 0, "-1": 0 };
		board.pieces.filter((p) => p.p >= 0).forEach((p) => {
			const T = game.g.pTypes[p.t];
			if(!T.isKing) pv[p.s] += T.value;
		});
		const diff = pv["1"] - pv["-1"];
		const values = { pieceValue: diff, pieceValueRatio: diff / (pv["1"] + pv["-1"] + 1) };
		game.cbVar.evaluate.call(board, game, values, material, null, pv);
		return values;
	}

	// one deployed minor each: the term must cancel out. Types 3/5 are White's
	// bishops and knights, 10/11 the Spartan homoioi and skiritai.
	const both = pos({ "Aa1": "wK", "Cf8": "bK", "Bc4": "wN", "Bc5": "bM" }, 1);
	t.check("a deployed knight and a deployed homoioi cancel out",
		evaluate(both).minorPiecesMoved, undefined);

	const whiteOnly = pos({ "Aa1": "wK", "Cf8": "bK", "Bc4": "wN" }, 1);
	t.check("a lone deployed knight counts for White", evaluate(whiteOnly).minorPiecesMoved, 1);

	const blackOnly = pos({ "Aa1": "wK", "Cf8": "bK", "Bc5": "bM" }, 1);
	t.check("a lone deployed homoioi counts for Black", evaluate(blackOnly).minorPiecesMoved, -1);

	// the spare king is invisible to pieceValue, the model adds it back
	const oneKing = pos({ "Aa1": "wK", "Cf8": "bK", "Bc4": "wN" }, 1);
	const twoKings = pos({ "Aa1": "wK", "Cf8": "bK", "Ba8": "bE", "Bc4": "wN" }, 1);
	t.check("with one Spartan king, material is the knight alone", evaluate(oneKing).pieceValue, 2.9);
	t.check("with two, the spare king is worth something", evaluate(twoKings).pieceValue, 2.9 - 4.5);
	// equal material used to divide 0 by 0 here
	const equal = pos({ "Aa1": "wK", "Cf8": "bK", "Ba8": "bE" }, 1);
	t.ok("equal material stays a number", !isNaN(evaluate(equal).pieceValueRatio));
}

console.log("\n-- 50-move counter --");
{
	const board = pos({ "Bc1": "wK", "Cf8": "bK", "Bc5": "bH", "Ba1": "wP" }, 1);
	t.check("fresh position", board.noCaptCount, 0);
	h.play(board, game, "KBc1-Bc2");
	t.check("a king move does not reset it", board.noCaptCount, 1);
	h.play(board, game, "HBc5-Bb4");
	t.check("a hoplite move does", board.noCaptCount, 0);
	h.play(board, game, "KBc2-Bc3");
	h.play(board, game, "KCf8-Cf7");
	t.check("two more quiet moves", board.noCaptCount, 2);
	h.play(board, game, "PBa1-Ba2");
	t.check("a pawn move resets it too", board.noCaptCount, 0);
}

console.log("\n-- the rules pages say what the model does --");
{
	const fs = require("fs"), path = require("path");
	const dir = path.join(__dirname, "..", "..", "src", "games", "chessbase", "res", "rules", "3dchess");
	const page = (f) => fs.readFileSync(path.join(dir, f), "utf8");
	const en = page("space-spartan-rules.html"), fr = page("space-spartan-rules-fr.html");

	t.ok("the English page announces the two Spartan kings", /2 Kings<\/b>/.test(en));
	t.ok("the French page announces the two Spartan kings", /2 Rois<\/b>/.test(fr));
	t.ok("the English page explains the duple check", /duple check/.test(en));
	t.ok("the French page explains the duple check", /échec double/.test(fr));
	t.ok("both pages have a promotion section", /<h2>Promotion<\/h2>/.test(en) && /<h2>Promotion<\/h2>/.test(fr));
	t.ok("neither page still gives both armies the FIDE pieces",
		!/each player starts with 18 Pawns/.test(en) && !/Chaque joueur commence avec 18 Pions/.test(fr));
	t.ok("castling is no longer announced for both sides",
		!/Castling: yes/.test(en) && !/Roque : oui/.test(fr));
}

t.done("space-spartan/rules");
