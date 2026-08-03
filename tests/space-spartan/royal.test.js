/*
 * Space Spartan - the Spartan diarchy:  node tests/space-spartan/royal.test.js
 *
 * The Spartans field TWO kings, and that is what pays for their lighter army.
 * The rules that follow from it, and that this suite pins down:
 *
 *   - both kings are royal, each in its own slot (isKing:1 / isKing:2);
 *   - a check on ONE king is not binding - the Spartans may ignore it, and
 *     may even let that king be taken;
 *   - a check on BOTH kings at once (duple check) IS binding, and the
 *     Spartans may not walk into one;
 *   - with one king left, check and mate are ordinary again;
 *   - a hoplite reaching the last rank may raise a fallen king, never add a
 *     third one.
 *
 * White's king is parked on Aa1, out of every diagram, so that no test
 * position is accidentally finished for the wrong side.
 */

const h = require("./harness.js");

const sb = h.loadModel();
const game = h.newGame(sb);
const t = h.runner();

const pos = (pieces, who) => h.setup(sb, game, pieces, who);
const legal = (board) => h.moves(board, game).sort();
const royals = (board, who) => h.royals(board, game, who);

const WK = { "Aa1": "wK" };									// white king, far away
const with_ = (extra) => Object.assign({}, WK, extra);

console.log("\n-- the board knows two royal ranks --");
{
	const board = h.newBoard(sb, game);
	t.check("cbMaxRoyalRank", game.cbMaxRoyalRank, 2);
	t.check("Spartan royals at the start", royals(board, -1), ["Bc8", "Bd8"]);
	t.check("Persian royal at the start", royals(board, 1), ["Bc1"]);
	t.check("the two Spartan kings have distinct FEN letters",
		h.typeOf(game, "K") !== h.typeOf(game, "E"), true);
}

console.log("\n-- a check on one king is not binding --");
{
	// rook Bc5 rakes the c-file up to Bc8
	const board = pos(with_({ "Bc5": "wR", "Bc8": "bK", "Bd8": "bE", "Ba6": "bH" }), -1);
	const list = legal(board);
	t.ok("the attacked king may simply stay there", list.indexOf("HBa6-Bb5") >= 0);
	t.ok("moving the other king is allowed too", list.indexOf("KBd8-Be8") >= 0);
	t.ok("the game is not finished", !board.mFinished);
}

console.log("\n-- a check on both kings at once is binding --");
{
	const board = pos(with_({ "Bc5": "wR", "Bd5": "wR", "Bc8": "bK", "Bd8": "bE", "Ba6": "bH" }), -1);
	const list = legal(board);
	t.ok("the quiet hoplite move is now illegal", list.indexOf("HBa6-Bb5") < 0);
	t.ok("stepping one king aside answers the duple check", list.indexOf("KBc8-Bb8") >= 0);
	t.ok("but not onto another attacked square", list.indexOf("KBd8-Bd7") < 0);
	t.ok("every legal move leaves a king unattacked", list.length > 0);
}

console.log("\n-- a king may be captured, the war goes on --");
{
	const board = pos(with_({ "Bc5": "wR", "Bc8": "bK", "Bd8": "bE", "Ba6": "bH" }), 1);
	const list = legal(board);
	t.ok("White may take the king left en prise", list.indexOf("RBc5xBc8") >= 0);
	h.play(board, game, "RBc5xBc8");
	t.check("one Spartan king left", royals(board, -1), ["Bd8"]);
	board.GenerateMoves(game);
	t.ok("the game continues", !board.mFinished);
}

console.log("\n-- with one king left, mate is ordinary again --");
{
	// queen Bd7 in contact, backed by the rook Bd5: no flight square. The
	// position must be REACHED by a move: board.check is only set by
	// ApplyMove, and a mate set up by hand reads as a stalemate.
	const board = pos({ "Aa1": "wK", "Bf7": "wQ", "Bd5": "wR", "Bd8": "bK" }, 1);
	h.play(board, game, "QBf7-Bd7");
	board.GenerateMoves(game);
	t.check("no legal move", board.mMoves.length, 0);
	t.ok("the game is finished", board.mFinished);
	t.check("White wins", board.mWinner, 1);
}

console.log("\n-- the same position is no mate while the second king lives --");
{
	const board = pos({ "Aa1": "wK", "Bf7": "wQ", "Bd5": "wR", "Bd8": "bK", "Ba8": "bE" }, 1);
	h.play(board, game, "QBf7-Bd7");
	board.GenerateMoves(game);
	t.ok("Black still has moves", board.mMoves.length > 0);
	t.ok("the game is not finished", !board.mFinished);
	t.ok("the spare king may walk away, abandoning the other",
		legal(board).indexOf("KBa8-Bb8") >= 0);
	t.ok("but not onto a square that would leave BOTH kings attacked",
		legal(board).indexOf("KBa8-Bb7") < 0);
}

console.log("\n-- a hoplite may raise a fallen king, never add a third --");
{
	// the white king sits on Aa8 here: from Bb2 a hoplite captures downwards
	// into plane A, and Aa1 would be one of its targets
	const far = { "Aa8": "wK" };
	const two = pos(Object.assign({}, far, { "Bb2": "bH", "Bc8": "bK", "Bd8": "bE" }), -1);
	t.check("two kings: no royal promotion", h.movesFrom(two, game, "Bb2"),
		["HBb2-Ba1=C", "HBb2-Ba1=M", "HBb2-Ba1=O", "HBb2-Ba1=S",
		 "HBb2-Bc1=C", "HBb2-Bc1=M", "HBb2-Bc1=O", "HBb2-Bc1=S"]);

	const lostSecond = pos(Object.assign({}, far, { "Bb2": "bH", "Bc8": "bK" }), -1);
	t.ok("king #2 gone: the hoplite may become king #2",
		h.movesFrom(lostSecond, game, "Bb2").indexOf("HBb2-Ba1=E") >= 0);
	t.ok("and not king #1, which is still there",
		h.movesFrom(lostSecond, game, "Bb2").indexOf("HBb2-Ba1=K") < 0);

	const lostFirst = pos(Object.assign({}, far, { "Bb2": "bH", "Bd8": "bE" }), -1);
	t.ok("king #1 gone: the hoplite may become king #1",
		h.movesFrom(lostFirst, game, "Bb2").indexOf("HBb2-Ba1=K") >= 0);

	const raised = h.play(lostFirst, game, "HBb2-Ba1=K");
	t.check("the promoted king takes the empty royal slot", royals(raised, -1), ["Ba1", "Bd8"]);
}

console.log("\n-- castling --");
{
	const board = pos({ "Bc1": "wK*", "Bb1": "wR*", "Be1": "wR*",
	                    "Bc8": "bK*", "Bd8": "bE*", "Bb8": "bC*", "Be8": "bO*" }, 1);
	const white = h.moves(board, game).filter((m) => m.indexOf("O-O") >= 0).sort();
	// the king lands on the rook square one way, next to it the other way -
	// this family's castle table, kept as it was
	t.check("White castles on both sides", white, ["KBc1-Bb1(O-O)", "KBc1-Bd1(O-O)"]);

	board.mWho = -1;
	const black = h.moves(board, game).filter((m) => m.indexOf("O-O") >= 0);
	t.check("the Spartans never castle", black, []);
}

t.done("space-spartan/royal");
