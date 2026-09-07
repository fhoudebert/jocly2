/*
 * Three-check chess: the counters and the verdict they carry.
 *
 *   node tests/fairy/threecheck.test.js
 */

const H = require("./harness.js");

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "standard/threecheck-model.js"];

const cz = H.context(SCRIPTS);
const { sandbox, game } = cz;
const t = H.runner();

// ---------------------------------------------------------------- counting

// Rook on an open file, kings facing each other: Ra1-e1 is check, and nothing
// else in the position is.
function checkLadder(who) {
	return H.setup(sandbox, game, {
		"a1": "wR", "h1": "wK", "e8": "bK", "a8": "bR", "h8": "bN",
	}, who);
}

let b = checkLadder(1);
t.check("fresh board: no checks yet", b.tcChecks, [0, 0]);

H.play(b, game, "Ra1-e1");
t.check("white check counted", b.tcChecks, [1, 0]);
t.check("still playing", H.outcome(b, game), "playing");

H.play(b, game, "Ke8-f8");
t.check("black quiet move counts nothing", b.tcChecks, [1, 0]);

H.play(b, game, "Re1-f1");
t.check("second white check", b.tcChecks, [2, 0]);
t.check("two checks is not a win", H.outcome(b, game), "playing");

H.play(b, game, "Kf8-g8");
H.play(b, game, "Rf1-g1");
t.check("third white check", b.tcChecks, [3, 0]);
t.check("three checks wins", H.outcome(b, game), "white");
t.check("decided position has no moves", (b.mMoves || []).length, 0);

// The counter is per side: black's checks must not feed white's total.
b = H.setup(sandbox, game, { "h1": "wK", "h7": "wR", "e8": "bK", "a2": "bR" }, -1);
H.play(b, game, "Ra2-a1");
t.check("black check counted on black's side", b.tcChecks, [0, 1]);

// ------------------------------------------------------------------ copy

// CopyFrom runs on every node of the search; a counter lost there silently
// resets mid-tree.
b = checkLadder(1);
H.play(b, game, "Ra1-e1");
const copy = Object.create(sandbox.Model.Board);
copy.Init && copy.Init(game);
copy.CopyFrom(b);
t.check("CopyFrom carries the counters", copy.tcChecks, [1, 0]);
copy.tcChecks[0] = 9;
t.check("copy does not share the array", b.tcChecks, [1, 0]);

// --------------------------------------------------------------- signature

// Two boards, same pieces, different check counts: genuinely different states.
const b0 = checkLadder(1);
const b1 = checkLadder(1);
b1.tcChecks[0] = 2;
t.ok("check counts change the signature", b0.GetSignature() !== b1.GetSignature());
b1.tcChecks[0] = 0;
t.check("same counts, same signature", b1.GetSignature(), b0.GetSignature());

// ---------------------------------------------------------- mate still wins

// Ordinary checkmate is untouched - and the mating move is also a check, so
// the counter moves with it.
b = H.setup(sandbox, game, { "e1": "wK", "a7": "wR", "b1": "wR", "h8": "bK" }, 1);
H.play(b, game, "Rb1-b8");
t.check("mate is still a win", H.outcome(b, game), "white");
t.check("the mating check is counted too", b.tcChecks, [1, 0]);

// ------------------------------------------------------------------- FEN

// Fairy-Stockfish writes the checks REMAINING, white first, as a seventh
// field after the en-passant square (its threecheck startFen).
const fresh = H.setup(sandbox, game, { "e1": "wK*", "e8": "bK*" }, 1);
game.mPlayedMoves = [];
let fen = fresh.ExportBoardState(game);
t.check("export: seven fields", fen.split(" ").length, 7);
t.check("export: fresh position is 3+3", fen.split(" ")[4], "3+3");

fresh.tcChecks[0] = 2;
fresh.tcChecks[1] = 1;
fen = fresh.ExportBoardState(game);
t.check("export: 2 given by white leaves 1+2", fen.split(" ")[4], "1+2");

// Round trip: the engine-style FEN must come back as the same counters.
let imported = game.Import("pjn", "4k3/8/8/8/8/8/8/4K3 w - - 1+2 0 1");
t.ok("import: status", imported.status);
t.check("import: remaining 1+2 means 2 and 1 delivered", imported.initial.tcChecks, [2, 1]);

// Lichess writes the same two numbers as a trailing "+w+b", already counted
// as delivered.
imported = game.Import("pjn", "4k3/8/8/8/8/8/8/4K3 w - - 0 1 +2+1");
t.ok("import: lichess spelling accepted", imported.status);
t.check("import: lichess counts are delivered counts", imported.initial.tcChecks, [2, 1]);

// A plain six-field FEN is still a plain six-field FEN.
imported = game.Import("pjn", "4k3/8/8/8/8/8/8/4K3 w - - 0 1");
t.ok("import: bare FEN still loads", imported.status);
t.check("import: bare FEN has no counters", imported.initial.tcChecks, undefined);

// InitialPosition picks them up.
game.mInitial = {
	pieces: [{ s: 1, t: 8, p: 4, m: true }, { s: -1, t: 8, p: 60, m: true }],
	turn: 1,
	tcChecks: [2, 1],
};
const loaded = Object.create(sandbox.Model.Board);
loaded.Init && loaded.Init(game);
loaded.InitialPosition(game);
delete game.mInitial;
t.check("InitialPosition reads mInitial.tcChecks", loaded.tcChecks, [2, 1]);

// ...and a fresh game after a loaded one does not inherit them.
const after = H.setup(sandbox, game, { "e1": "wK*", "e8": "bK*" }, 1);
t.check("next fresh board starts at 0-0", after.tcChecks, [0, 0]);

t.done("three-check");
