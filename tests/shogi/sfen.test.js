/*
 * SFEN and USI, against Chu Shogi.
 *
 *   node tests/shogi/sfen.test.js
 *
 * The corpus is ChuShogiLite's own: the 259 historic tsume positions of
 * historic-chu-shogi-puzzle-sfens.txt, copied into res/ so the test does not
 * need the network. Round-tripping those is what says the two programs mean
 * the same thing by an SFEN - a hand-written example would only say that this
 * file agrees with itself.
 */

const fs = require("fs");
const path = require("path");

const H = require("../fairy/harness.js");
const t = H.runner();

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "locust-move-model.js",
	"shogi/chu-shogi-model.js", "shogi/sfen-model.js"];

const cz = H.context(SCRIPTS);
const { sandbox, game, geo, types } = cz;
const Game = sandbox.Model.Game;   // ImportSFEN and the square helpers
// MoveFromUSI is a game method: it generates the move list when it has to

const Sq = (name) => geo.PosByName(name);
const USI = (move) => Object.assign(Object.create(sandbox.Model.Move), move).ToString("usi");

// the position ChuShogiLite starts from, character for character
const CSL_START = "lfcsgekgscfl/a1b1txot1b1a/mvrhdqndhrvm/pppppppppppp/3i4i3/12/12/"
	+ "3I4I3/PPPPPPPPPPPP/MVRHDNQDHRVM/A1B1TOXT1B1A/LFCSGKEGSCFL b - 1";

function board(sfen) {
	const result = Game.ImportSFEN(sfen);
	if(result.status === false) throw new Error("refused: " + sfen);
	game.mInitial = result.initial;
	const fresh = H.newBoard(sandbox, game);
	delete game.mInitial;
	return fresh;
}

function moves(b) {
	b.mMoves = [];
	b.GenerateMoves(game);
	return b.mMoves;
}

/* ------------------------------------------------------------------ *
 * the position
 * ------------------------------------------------------------------ */

console.log("\nthe board field is already SFEN");

(() => {
	const fresh = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];
	t.check("the opening position is written exactly as ChuShogiLite writes it",
		fresh.ExportSFEN(game), CSL_START);
	// the point of the exercise: Jocly's own FEN carries the same board field
	t.check("and it is the board field of the Jocly FEN, unchanged",
		fresh.ExportBoardState(game).split(" ")[0], CSL_START.split(" ")[0]);
})();

console.log("\nthe side to move");

(() => {
	const fresh = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];
	t.check("Jocly's w is SFEN's b", [fresh.ExportBoardState(game).split(" ")[1],
		fresh.ExportSFEN(game).split(" ")[1]], ["w", "b"]);
	t.check("and reading it back gives Jocly's side again",
		Game.ImportSFEN(CSL_START).initial.turn, 1);
	const gote = CSL_START.replace(" b ", " w ");
	t.check("the other way round too", Game.ImportSFEN(gote).initial.turn, -1);
})();

console.log("\nwhat is not an SFEN for this game");

t.check("a board with too few ranks is refused",
	Game.ImportSFEN("12/12/12 b - 1").status, false);
t.check("a rank that does not cover twelve files is refused",
	Game.ImportSFEN(CSL_START.replace("pppppppppppp", "ppppppp")).status, false);
t.check("a side to move that is neither b nor w is refused",
	Game.ImportSFEN(CSL_START.replace(" b ", " x ")).status, false);
// the six-field importer ACCEPTS a nine-file Shogi SFEN and lays it two files
// to the left, lances and all, without a word - which is what this refusal is
// for. The Shogi side of it (holdings in the third field) is not written yet.
t.check("and so is a board of the wrong width",
	Game.ImportSFEN("lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1").status,
	false);

console.log("\nthe move number");

(() => {
	// SFEN counts plies; the Jocly field it is translated into counts full
	// moves, so the two numbers are not the same one. The SFEN's own is kept
	// beside it, which is what ExportSFEN() counts on from.
	const read = Game.ImportSFEN(CSL_START.replace(" 1", " 42")).initial;
	t.check("is read", read.sfenMoveNumber, 42);
	t.check("and translated for the Jocly side", read.moveNumber, 21);
	const b = board(CSL_START);
	game.mPlayedMoves = [];
	t.check("and counts from one at the start", b.ExportSFEN(game).split(" ")[3], "1");
	const move = moves(b)[0];
	b.ApplyMove(game, move);
	game.mPlayedMoves.push(move);
	b.mWho = -b.mWho;
	t.check("and rises with each move played", b.ExportSFEN(game).split(" ")[3], "2");
	t.check("as does the side to move", b.ExportSFEN(game).split(" ")[1], "w");
})();

/* ------------------------------------------------------------------ *
 * coordinates
 * ------------------------------------------------------------------ */

console.log("\nsquares");

// USI counts the files from the right and letters the ranks from the top, so
// Jocly's bottom-left square is "12l"
t.check("a1 is 12l", Game.cbToUSISquare(Sq("a1")), "12l");
t.check("l12 is 1a", Game.cbToUSISquare(Sq("l12")), "1a");
t.check("a12 is 12a", Game.cbToUSISquare(Sq("a12")), "12a");
t.check("l1 is 1l", Game.cbToUSISquare(Sq("l1")), "1l");
t.check("every square survives the trip", (() => {
	const wrong = [];
	for(let f = 0; f < 12; f++) for(let r = 0; r < 12; r++) {
		const pos = geo.POS(f, r);
		if(Game.cbFromUSISquare(Game.cbToUSISquare(pos)) !== pos) wrong.push(geo.PosName(pos));
	}
	return wrong;
})(), []);
t.check("and nonsense is refused", Game.cbFromUSISquare("13a"), -1);

/* ------------------------------------------------------------------ *
 * moves
 * ------------------------------------------------------------------ */

console.log("\nmoves in USI");

(() => {
	const b = board(CSL_START);
	const all = moves(b);
	t.check("the opening moves are named as ChuShogiLite names them",
		all.map(USI).slice(0, 4), ["12i12h", "11i11h", "10i10h", "8i8h"]);
	// natural notation is what Tabulon saves; it must not have moved
	t.check("and the natural notation is untouched",
		all.slice(0, 4).map((m) => cz.natural(m)), ["a4-a5", "b4-b5", "c4-c5", "e4-e5"]);
	t.check("every move of the position has a name",
		all.filter((m) => /null|undefined/.test(USI(m))), []);
	t.check("and each names itself and nothing else",
		all.filter((m) => game.MoveFromUSI(b, USI(m)) !== m), []);
})();

console.log("\nthe Lion's two-leg move");

(() => {
	// a Lion with room to step out and back. Both of its two-leg moves here
	// end where they started ("6c6d6c"): that is the Lion passing its turn by
	// stepping onto an empty square and returning, which is a legal move in
	// Chu Shogi and one that only the three-square form can write down.
	const b = board(CSL_START);
	["7i7h", "7d7e", "7h7g", "6d6e", "7g7f"].forEach((usi) => {
		// the move list is cleared by hand: ApplyMove() does not, and
		// MoveFromUSI - like pickMove() - only generates when there is none,
		// so a stale list would have it matching the other side's moves
		b.mMoves = [];
		const move = game.MoveFromUSI(b, usi);
		if(!move) throw new Error("no " + usi);
		b.ApplyMove(game, move);
		b.mWho = -b.mWho;
	});
	const two = moves(b).filter((m) => m.via !== undefined);
	t.check("two-leg moves exist here", two.length > 0, true);
	t.check("and are written with three squares",
		two.every((m) => /^[0-9]{1,2}[a-l][0-9]{1,2}[a-l][0-9]{1,2}[a-l]\+?$/.test(USI(m))), true);
	t.check("the middle one being the square stepped on",
		USI(two[0]).match(/[0-9]{1,2}[a-l]/g)[1], Game.cbToUSISquare(two[0].via));
	t.check("and each resolves back to itself",
		two.filter((m) => game.MoveFromUSI(b, USI(m)) !== m), []);
})();

console.log("\nreading a move that is not there");

(() => {
	const b = board(CSL_START);
	// pickMove() would answer with the nearest string and play it; this says no
	t.check("an illegal move is refused", game.MoveFromUSI(b, "1a1b"), null);
	t.check("so is a square that does not exist", game.MoveFromUSI(b, "13a13b"), null);
	t.check("and so is rubbish", game.MoveFromUSI(b, "hello"), null);
})();

/* ------------------------------------------------------------------ *
 * the corpus
 * ------------------------------------------------------------------ */

console.log("\nChuShogiLite's own positions");

(() => {
	const file = path.join(__dirname, "..", "res", "historic-chu-shogi-puzzle-sfens.txt");
	const lines = fs.readFileSync(file, "utf8").replace(/\r/g, "").split("\n")
		.map((s) => s.trim()).filter(Boolean);
	t.check("the corpus is there", lines.length > 250, true);

	const refused = [], changed = [];
	for(const sfen of lines) {
		const result = Game.ImportSFEN(sfen);
		if(result.status === false) { refused.push(sfen); continue; }
		game.mInitial = result.initial;
		const b = H.newBoard(sandbox, game);
		delete game.mInitial;
		game.mPlayedMoves = [];
		if(b.ExportSFEN(game).split(" ")[0] !== sfen.split(" ")[0]) changed.push(sfen);
	}
	t.check("every position is read", refused, []);
	t.check("and comes back the same board", changed, []);

	// the whole string, not just the board: the side to move, the move number
	// and the last-Lion-capture square have to survive too
	const whole = [];
	for(const sfen of lines) {
		const result = Game.ImportSFEN(sfen);
		game.mInitial = result.initial;
		const b = H.newBoard(sandbox, game);
		game.mPlayedMoves = [];
		if(b.ExportSFEN(game) !== sfen) whole.push(sfen);
		delete game.mInitial;
	}
	t.check("character for character", whole, []);
})();

/* ------------------------------------------------------------------ *
 * the third field
 * ------------------------------------------------------------------ */

console.log("\nthe last Lion capture");

(() => {
	const b = board(CSL_START);
	game.mPlayedMoves = [];
	t.check("nothing to remember at the start", b.ExportSFEN(game).split(" ")[2], "-");
	// carried through the import for whoever needs it, but NOT applied: the
	// Lion-trade rule reads the previous move, not a field (locust-move-model.js)
	const withCapture = CSL_START.replace(" - ", " 6f ");
	t.check("a field that is there is handed on",
		Game.ImportSFEN(withCapture).initial.lionCapture, "6f");
	t.check("and an empty one reads as nothing",
		Game.ImportSFEN(CSL_START).initial.lionCapture, null);
})();

/* ------------------------------------------------------------------ *
 * Shogi itself: the third field is a hand
 * ------------------------------------------------------------------ */

const sh = H.context(["base-model.js", "grid-geo-model.js", "drop-model.js",
	"shogi/shogi-model.js", "shogi/sfen-model.js"]);
const shGame = sh.game, shModel = sh.sandbox.Model;
const shUSI = (move) => Object.assign(Object.create(shModel.Move), move).ToString("usi");

function shBoard(sfen) {
	const result = shModel.Game.ImportSFEN(sfen);
	if(result.status === false) throw new Error("refused: " + sfen);
	shGame.mInitial = result.initial;
	const fresh = H.newBoard(sh.sandbox, shGame);
	shGame.mPlayedMoves = [];
	return fresh;
}

console.log("\nShogi: the board, nine files wide");

(() => {
	const b = H.newBoard(sh.sandbox, shGame);
	shGame.mPlayedMoves = [];
	// Jocly stores a Shogi board on a thirteen-column grid, the outer two
	// columns each side being the hands: the SFEN has to be the nine
	t.check("the opening position is the standard SFEN",
		b.ExportSFEN(shGame),
		"lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1");
	t.check("where the Jocly FEN is thirteen wide",
		b.ExportBoardState(shGame).split(" ")[0].split("/")[0], "2lnsgkgsnl2");
	t.check("and the first moves are named as Shogi names them",
		(b.mMoves = [], b.GenerateMoves(shGame), b.mMoves.slice(0, 3).map(shUSI)),
		["9g9f", "8g8f", "7g7f"]);
})();

console.log("\nShogi: hands");

(() => {
	// 1.P-7f P-3d 2.Bx2b+ Sx2b, the opening bishop trade: one Bishop in each
	// hand, which is what the third field is for
	const b = H.newBoard(sh.sandbox, shGame);
	shGame.mPlayedMoves = [];
	["7g7f", "3c3d", "8h2b+", "3a2b"].forEach((usi) => {
		b.mMoves = [];
		const move = shGame.MoveFromUSI(b, usi);
		if(!move) throw new Error("no " + usi);
		b.ApplyMove(shGame, move);
		shGame.mPlayedMoves.push(move);
		b.mWho = -b.mWho;
	});
	t.check("a hand of one each is written",
		b.ExportSFEN(shGame),
		"lnsgkg1nl/1r5s1/pppppp1pp/6p2/9/2P6/PP1PPPPPP/7R1/LNSGKGSNL b Bb 5");

	// a drop is written the way USI writes it, with a star
	b.mMoves = [];
	const drop = shGame.MoveFromUSI(b, "B*4e");
	t.check("and the piece can be dropped back", !!drop, true);
	t.check("under its USI name", shUSI(drop), "B*4e");
})();

(() => {
	// counts, and the order SFEN puts them in: the strong pieces first,
	// R B G S N L P, one side's hand before the other's
	const deep = "9/9/9/9/4k4/9/9/9/4K4 w 2L3Prbg 42";
	const b = shBoard(deep);
	t.check("a deeper hand survives the trip", b.ExportSFEN(shGame), deep);
	b.mWho = 1;
	b.mMoves = [];
	b.GenerateMoves(shGame);
	const drops = b.mMoves.filter((m) => /\*/.test(shUSI(m)));
	t.check("and every held kind can be dropped",
		[...new Set(drops.map((m) => shUSI(m)[0]))].sort(), ["L", "P"]);
})();

console.log("\nShogi: the move number");

(() => {
	// SFEN counts plies and names the next one; the Jocly FEN counts full
	// moves, so feeding one into the other used to double it
	const b = shBoard("9/9/9/9/4k4/9/9/9/4K4 w - 42");
	t.check("is read and written back unchanged",
		b.ExportSFEN(shGame).split(" ")[3], "42");
	const move = (b.mMoves = [], b.GenerateMoves(shGame), b.mMoves[0]);
	b.ApplyMove(shGame, move);
	shGame.mPlayedMoves.push(move);
	b.mWho = -b.mWho;
	t.check("and counts one per move played",
		b.ExportSFEN(shGame).split(" ")[3], "43");
})();

t.done("SFEN and USI");
