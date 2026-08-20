/*
 * Chu Shogi, against the rules page shipped with it
 * (res/rules/shogi/chu-shogi-rules.html).
 *
 *   node tests/chessbase/chu-shogi.test.js
 *
 * The hard parts of this game turned out to be right: the Lion's two-step
 * power with its igui and its hop, the Falcon's and Eagle's restricted version
 * of it along a single ray, the rule that stops a Lion capturing a protected
 * Lion, and the promotion zone. What was missing was the quietest move in the
 * game.
 *
 * "The Lion can ... move to an adjacent empty square and back, effectively
 * passing a turn", and the Falcon and Eagle can do the same along their own
 * ray - "returning to the starting square ... needs the adjacent square either
 * to be empty or contain an opponent". Only the capturing version of that
 * move, the igui, was generated: a piece could pass a turn by eating
 * something, never by stepping out and back.
 *
 * It is entered in two clicks, like any two-leg move: click the square to
 * step on, then the same square again to stop there, the square the piece came
 * from to return - which passes the turn - or a further square to go on. The
 * checks below cover both the moves themselves and that click resolution,
 * which is replayed here from the move list rather than from a browser.
 */

const H = require("../fairy/harness.js");

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "locust-move-model.js",
	"shogi/chu-shogi-model.js"];

const sandbox = H.loadModel(SCRIPTS);
const game = H.newGame(sandbox);
const geo = game.cbVar.geometry;
const types = game.cbVar.pieceTypes;
const constants = sandbox.Model.Game.cbConstants;

const engine = (move) =>
	Object.assign(Object.create(sandbox.Model.Move), move).ToString("engine");

/*
 * The FIRST type of that name. Several pieces exist in a White and a Black
 * flavour under one name - the Go Between moves the same both ways but
 * promotes into a Drunk Elephant, which does not - so a lookup that keeps
 * scanning ends up on the wrong side's piece.
 */
const typeNamed = (name) => {
	for(const t in types)
		if(types[t].name === name)
			return parseInt(t);
	throw new Error("no piece named " + name);
};

function reach(name, square) {
	const from = geo.PosByName(square), out = new Set();
	(types[typeNamed(name)].graph[from] || []).forEach((line) => {
		for(const entry of line)
			if(entry & (constants.FLAG_MOVE | constants.FLAG_CAPTURE))
				out.add(entry & 0xffff);
	});
	return out.size;
}

function movesFrom(pieces, square, who) {
	const board = H.setup(sandbox, game,
		Object.assign({ a1: "wK", l12: "bK" }, pieces), who || 1);
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves.filter((move) => move.f === geo.PosByName(square));
}
const reaches = (pieces, from, to) =>
	movesFrom(pieces, from).some((move) => move.t === geo.PosByName(to));

const t = H.runner();

/* ---------------- the board ---------------- */

console.log("\nthe board and the armies");

t.check("a 12 x 12 board", [geo.width, geo.height], [12, 12]);
t.check("forty-six pieces a side", (() => {
	const board = H.newBoard(sandbox, game);
	return board.pieces.filter((piece) => piece.p >= 0 && piece.s > 0).length;
})(), 46);

/* ---------------- the reference guide ---------------- */

console.log("\nthe reference guide, piece by piece");

// "Gold general: moves and captures to adjacent squares in any orthogonal or
// the forward diagonal direction"
t.check("Gold: four orthogonals and two forward diagonals", reach("gold-w", "f7"), 6);
// "Silver general: any diagonal or the forward orthogonal"
t.check("Silver: four diagonals and straight ahead", reach("silver-w", "f7"), 5);
// "Pawn: moves and captures to the square directly in front of it"
t.check("Pawn: one square ahead", reach("pawn-w", "f7"), 1);
t.check("Copper: ahead, the forward diagonals and back", reach("copper-w", "f7"), 4);
t.check("Go Between: ahead and back", reach("go-between", "f7"), 2);
// "Kirin: diagonally adjacent squares, or by jumping to the second square
// orthogonally"
t.check("Kirin: four diagonal steps and four orthogonal leaps", reach("kirin", "f7"), 8);
// "Phoenix: orthogonally adjacent squares, or jumping to the second square
// diagonally"
t.check("Phoenix: four orthogonal steps and four diagonal leaps", reach("phoenix", "f7"), 8);
t.check("Blind Tiger: a King without the square straight ahead", reach("tiger-w", "f7"), 7);
t.check("Drunk Elephant: a King without the square straight behind",
	reach("elephant-w", "f7"), 7);
t.check("Side Mover: the rank, plus ahead and back", reach("side-mover", "f7"), 13);
t.check("Vertical Mover: the file, plus left and right", reach("vertical-mover", "f7"), 13);
t.check("Reverse Chariot: the whole file", reach("reverse-chariot", "f7"), 11);
t.check("Dragon Horse: Bishop and King", reach("dragon-horse", "f7"), reach("bishop", "f7") + 4);
t.check("Dragon King: Rook and King", reach("dragon-king", "f7"), reach("rook", "f7") + 4);
t.check("Free King: Rook and Bishop",
	reach("queen", "f7"), reach("rook", "f7") + reach("bishop", "f7"));
// "Lion: move or capture by leaping to any square in the 5x5 area"
t.check("Lion: the 5x5 area around it", reach("lion", "f7"), 24);

/* ---------------- promotion ---------------- */

console.log("\npromotion, the eighteen pairs");

const promotesTo = (name, fromRow, toRow, capture, side) => {
	const type = typeNamed(name);
	const from = fromRow * geo.width + 5, to = toRow * geo.width + 5;
	return (game.cbVar.promote(game, { t: type, s: side || 1, p: from },
		{ t: to, f: from, c: capture === undefined ? null : capture }) || [])
		.map((into) => types[into].name);
};

[["pawn-w", "tokin-w"], ["go-between", "elephant2-w"], ["copper-w", "side-mover2"],
 ["silver-w", "vertical-mover2"], ["gold-w", "rook2"], ["leopard", "bishop2"],
 ["tiger-w", "flying-stag"], ["elephant-w", "crown-prince"], ["lance-w", "white-horse-w"],
 ["reverse-chariot", "whale-w"], ["side-mover", "free-boar"],
 ["vertical-mover", "flying-ox"], ["kirin", "lion2"], ["phoenix", "queen2"],
 ["bishop", "dragon-horse2"], ["rook", "dragon-king2"], ["dragon-horse", "falcon-w"],
 ["dragon-king", "eagle-w"]].forEach(([piece, into]) => {
	t.ok(piece + " becomes a " + into, promotesTo(piece, 7, 8).indexOf(into) >= 0);
});

// "Promotion is optional" - the piece unchanged is offered alongside
t.check("and it is optional", promotesTo("rook", 7, 8)[0], "rook");
// "The Lion, the Free King, the Horned Falcon, the Soaring Eagle, the King and
// every already promoted piece never promote"
["lion", "queen", "falcon-w", "eagle-w", "king", "tokin-w", "dragon-king2"]
	.forEach((name) => {
		t.check(name + " never promotes", promotesTo(name, 7, 8, 3), []);
	});

/*
 * "A piece may promote when it enters the last four ranks, and when it moves
 * inside or out of them while capturing." Four situations, and the last of
 * them used to be refused: the test asked that the move END in the zone.
 */
console.log("\nentering, staying, leaving");

t.ok("entering the zone, quietly", promotesTo("rook", 7, 8).length > 1);
t.ok("entering it with a capture", promotesTo("rook", 7, 8, 3).length > 1);
t.check("moving inside it quietly does not promote", promotesTo("rook", 8, 9), []);
t.ok("but capturing inside it does", promotesTo("rook", 8, 9, 3).length > 1);
/*
 * Leaving the zone never promotes, capture or no capture. Promoting on any
 * move that merely touches the zone is the MODERN Shogi rule, "apparently a
 * later invention ... but was never used in Chu Shogi" - the summary sentence
 * of the rules page said otherwise and has been corrected.
 */
t.check("leaving it quietly does not promote", promotesTo("rook", 8, 7), []);
t.check("nor does leaving it with a capture", promotesTo("rook", 8, 7, 3), []);
t.check("and away from the zone nothing promotes", promotesTo("rook", 5, 6, 3), []);
// Black's zone is the other end of the board
t.ok("Black entering its own zone", promotesTo("rook", 4, 3, null, -1).length > 1);
t.check("Black cannot capture its way out either", promotesTo("rook", 3, 4, 3, -1), []);
t.check("Black, far from it", promotesTo("rook", 6, 5, 3, -1), []);

/*
 * "There is a special rule for Pawns: when these reach the last rank, they are
 * ALLOWED to promote even on a non-capture." Allowed, not forced: promotion is
 * the player's choice throughout Chu Shogi, and the exception here is to the
 * capture requirement, not to the choice. A Pawn that declines simply becomes
 * dead wood.
 */
t.check("a Pawn reaching the last rank may promote, quietly and by choice",
	promotesTo("pawn-w", 10, 11), ["pawn-w", "tokin-w"]);
t.check("and Black likewise", promotesTo("pawn-b", 1, 0, null, -1), ["pawn-b", "tokin-b"]);

/*
 * "The Elephant promotes to Prince, which is just another name for King ...
 * This counts as extinction royalty": two royals, and only losing the last one
 * ends the game. The model already says so - isKing: 2 on the Crown Prince.
 */
t.check("the King and the Crown Prince are the royal pieces",
	Object.keys(types).filter((k) => types[k].isKing).map((k) => types[k].name),
	["king", "crown-prince"]);
t.ok("and the Prince is the second royal, not a plain King",
	types[typeNamed("crown-prince")].isKing === 2);

/* ---------------- Lion power ---------------- */

console.log("\nLion power");

/*
 * Twenty-four squares, and on top of them one pass per adjacent empty square:
 * "move to an adjacent empty square and back, effectively passing a turn".
 * They have the same effect, and each is reached by stepping on its own
 * square, so every one of the eight has to exist for the click on that square
 * to offer the return.
 */
const lionMoves = movesFrom({ f7: "wN" }, "f7");
t.check("on an open board it reaches its whole area",
	new Set(lionMoves.filter((move) => move.t !== move.f)
		.map((move) => geo.PosName(move.t))).size, 24);
t.check("with no square reachable twice",
	lionMoves.filter((move) => move.t !== move.f).length, 24);
t.check("and one pass per adjacent empty square",
	lionMoves.filter((move) => move.t === move.f).length, 8);

// "capture an adjacent piece, and then go on moving or capturing once more"
t.ok("it takes two pieces in a row",
	movesFrom({ f7: "wN", f8: "bP", f9: "bR" }, "f7")
		.some((move) => geo.PosName(move.t) === "f9" && move.c != null));
// igui: capture without leaving the square
t.ok("or takes one and comes back where it stood",
	movesFrom({ f7: "wN", f8: "bP" }, "f7")
		.some((move) => move.t === move.f && geo.PosName(move.via) === "f8"));
// "move to an adjacent empty square and back, effectively passing a turn"
t.ok("or steps out onto an empty square and back, passing the turn",
	movesFrom({ f7: "wN", f8: "bP" }, "f7")
		.some((move) => move.t === move.f && move.kill == null));
// the Falcon and the Eagle pass the same way, on their own ray only
t.check("the Falcon passes straight ahead",
	movesFrom({ f7: "w+H" }, "f7").filter((m) => m.t === m.f).map(engine), ["+DH-f8-f7"]);
/*
 * How the clicks resolve, replayed with the arithmetic of multi-leg-view: a
 * move weighs 1 on the square it ends on and 64 on a square it steps through,
 * and above 64 the click chooses a leg instead of playing. The second click
 * then works on that action's own moves, which is where the three options come
 * from - stop here, go on, or return and pass the turn.
 */
const clickPlan = (pieces, square) => {
	const moves = movesFrom(pieces, square);
	const weight = {}, byTarget = {};
	moves.forEach((move) => {
		const target = move.via !== undefined ? move.via : move.t;
		weight[target] = (weight[target] || 0) + (move.via !== undefined ? 64 : 1);
		(byTarget[target] = byTarget[target] || []).push(move);
	});
	const plan = {};
	Object.keys(weight).forEach((target) => {
		plan[geo.PosName(target)] = {
			waits: weight[target] > 64,
			then: byTarget[target].map((move) => geo.PosName(move.t)).sort(),
		};
	});
	return plan;
};

const lionPlan = clickPlan({ f7: "wN" }, "f7");
t.check("stepping onto an adjacent square waits for a second click",
	lionPlan["g7"].waits, true);
t.check("which then offers stopping there or returning",
	lionPlan["g7"].then, ["f7", "g7"]);
t.check("a two-square leap still plays at once", lionPlan["h9"].waits, false);
t.check("every adjacent square behaves alike",
	["e6", "f6", "g6", "e7", "g7", "e8", "f8", "g8"]
		.filter((square) => !lionPlan[square].waits), []);
/*
 * With something to take, the same second click covers the three readings -
 * and, for the Lion, going on means any neighbour of the square it took on,
 * not just onwards in line: it "goes on moving or capturing once more as a
 * King".
 */
const lionCapture = clickPlan({ f7: "wN", f8: "bP", f9: "bR" }, "f7")["f8"].then;
t.ok("stop on the square it took", lionCapture.indexOf("f8") >= 0);
t.ok("or return, passing the turn", lionCapture.indexOf("f7") >= 0);
t.ok("or take again beyond it", lionCapture.indexOf("f9") >= 0);
t.check("and it may go on in any direction, as a King would",
	lionCapture.length, 9);
t.check("the Falcon's forward square waits too",
	clickPlan({ f7: "w+H" }, "f7")["f8"].then, ["f7", "f8"]);
const eaglePlan = clickPlan({ f7: "w+D" }, "f7");
t.check("both of the Eagle's forward diagonals wait",
	[eaglePlan["e8"].waits, eaglePlan["g8"].waits], [true, true]);
t.check("and its sideways move does not", eaglePlan["g7"].waits, false);
t.check("the Eagle passes on either of its diagonals",
	movesFrom({ f7: "w+D" }, "f7").filter((m) => m.t === m.f).map(engine).sort(),
	["+DK-e8-f7", "+DK-g8-f7"]);
t.check("an enemy on that square turns it into an igui",
	movesFrom({ f7: "w+H", f8: "bP" }, "f7").filter((m) => m.t === m.f).map(engine),
	["+DHxf8-f7"]);
t.check("a piece of its own leaves it no return move at all",
	movesFrom({ f7: "w+H", f8: "wR" }, "f7").filter((m) => m.t === m.f), []);

// the two read differently, which is the whole point of writing them down
t.check("a capture-and-return is written with an x",
	movesFrom({ f7: "wN", f8: "bP" }, "f7")
		.filter((move) => move.t === move.f && geo.PosName(move.via) === "f8")
		.map(engine), ["LNxf8-f7"]);
t.check("a pass is not",
	movesFrom({ f7: "wN", f8: "bP" }, "f7")
		.filter((move) => move.t === move.f && geo.PosName(move.via) === "g7")
		.map(engine), ["LN-g7-f7"]);
// a pass leaves the position exactly as it was
t.ok("and it changes nothing on the board", (() => {
	const board = H.setup(sandbox, game, { f7: "wN", a1: "wK", l12: "bK" }, 1);
	const before = board.ExportBoardState(game);
	board.mMoves = [];
	board.GenerateMoves(game);
	const pass = board.mMoves.find((move) => move.t === move.f);
	const undo = board.cbQuickApply(game, pass);
	board.cbQuickUnapply(game, undo);
	return board.ExportBoardState(game) === before;
})());
// "over an occupied square without disturbing it"
t.ok("it hops over a piece of its own", reaches({ f7: "wN", f8: "wR" }, "f7", "f9"));

/* ---------------- keeping the Lions on the board ---------------- */

console.log("\nthe restrictions on trading Lions");

// does any move at all take the piece on that square, however it gets there?
const canTake = (pieces, from, victim) =>
	movesFrom(pieces, from).some((move) => geo.PosName(move.t) === victim
		|| (move.via !== undefined && geo.PosName(move.via) === victim));

/*
 * "A Lion cannot capture a Lion if that would expose it to recapture in the
 * next turn, as if it had become an absolute royal for one turn." Landing on
 * the protected square is what is forbidden - not the capture itself, which
 * an adjacent Lion can always make in passing and come home from.
 */
t.ok("a Lion takes an unprotected Lion", reaches({ f7: "wN", f8: "bN" }, "f7", "f8"));
t.ok("it may not stay on a protected square",
	!reaches({ f7: "wN", f8: "bN", f10: "bR" }, "f7", "f8"));
t.ok("but it always takes an adjacent Lion, protected or not, in passing",
	canTake({ f7: "wN", f8: "bN", f10: "bR" }, "f7", "f8"));
t.check("taking it and coming home is one of the ways",
	movesFrom({ f7: "wN", f8: "bN", f10: "bR" }, "f7")
		.filter((move) => move.t === move.f && geo.PosName(move.via) === "f8")
		.map(engine), ["LNxf8-f7"]);

/*
 * Two squares away it is another matter: a protected Lion may only be taken
 * along with something else worth taking. "This additionally captured piece
 * must not be a Pawn or Go Between, though."
 */
t.ok("a Lion two squares off, unprotected, may be taken",
	canTake({ f7: "wN", f9: "bN" }, "f7", "f9"));
t.ok("protected, not on its own",
	!canTake({ f7: "wN", f9: "bN", f11: "bR" }, "f7", "f9"));
t.ok("protected, yes if a Rook goes with it",
	canTake({ f7: "wN", f8: "bR", f9: "bN", f11: "bR" }, "f7", "f9"));
t.ok("but a Pawn is not payment enough",
	!canTake({ f7: "wN", f8: "bP", f9: "bN", f11: "bR" }, "f7", "f9"));
t.ok("nor a Go Between",
	!canTake({ f7: "wN", f8: "bI", f9: "bN", f11: "bR" }, "f7", "f9"));

// and the restriction is on Lion taking Lion, not on everyone
t.ok("a Rook may take a protected Lion",
	reaches({ f7: "wR", f9: "bN", f10: "bR" }, "f7", "f9"));

/*
 * "A non-Lion cannot capture a Lion when on the previous turn a Lion was
 * captured by a non-Lion on another square" - the counter-strike rule, which
 * depends on what the previous move did rather than on the position.
 */
const afterWhitePlays = (whiteTo, blackTaker) => {
	const pieces = { l1: "wK", a12: "bK", c1: "wR", c3: "bN", h8: "wN" };
	pieces[blackTaker === "rook" ? "h12" : "g7"] = blackTaker === "rook" ? "bR" : "bN";
	const board = H.setup(sandbox, game, pieces, 1);
	board.mMoves = [];
	board.GenerateMoves(game);
	const move = board.mMoves.find((m) => m.f === geo.PosByName("c1")
		&& geo.PosName(m.t) === whiteTo);
	board.ApplyMove(game, move);
	board.mWho = -1;
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves.filter((m) => m.t === geo.PosByName("h8")).map(engine);
};
t.check("after a Rook took a Lion, a Rook may not take one back",
	afterWhitePlays("c3", "rook"), []);
t.check("a Lion still may", afterWhitePlays("c3", "lion"), ["g7h8"]);
t.check("and with no Lion taken, the Rook is free to",
	afterWhitePlays("d1", "rook"), ["h12h8"]);

/*
 * The Falcon and the Eagle have the same power along one ray only: straight
 * ahead for the Falcon, the forward diagonals for the Eagle. "For the second
 * step they can only decide if they want to continue in the same direction,
 * or move back to their starting square."
 */
console.log("\nthe Falcon and the Eagle, on their own ray");

const falcon = movesFrom({ f7: "w+H", f8: "bP" }, "f7").map(engine);
t.ok("the Falcon takes ahead and returns", falcon.indexOf("+DHxf8-f7") >= 0);
t.ok("or takes ahead and goes on", falcon.indexOf("+DHxf8-f9") >= 0);
const eagle = movesFrom({ f7: "w+D", g8: "bP" }, "f7").map(engine);
t.ok("the Eagle does the same on its diagonal", eagle.indexOf("+DKxg8-f7") >= 0);
t.ok("and continues along it", eagle.indexOf("+DKxg8-h9") >= 0);
// sideways there is no such power: one square, one capture, and that is all
t.check("the Falcon has no such power sideways",
	movesFrom({ f7: "w+H", g7: "bP" }, "f7").map(engine).filter((m) => m.indexOf("g7") >= 0),
	["f7g7"]);

/* ---------------- it runs ---------------- */

console.log("\nthe whole thing");

t.check("a saved position reloads unchanged", (() => {
	const board = H.newBoard(sandbox, game);
	const before = {};
	board.pieces.forEach((piece) => {
		if(piece.p >= 0) before[piece.p] = types[piece.t].name + "/" + piece.s;
	});
	const back = sandbox.Model.Game.Import("pjn", board.ExportBoardState(game)).initial;
	const after = {};
	(back.pieces || []).forEach((piece) => {
		after[piece.p] = types[piece.t].name + "/" + piece.s;
	});
	return Object.keys(before).filter((pos) => before[pos] !== after[pos]).length;
})(), 0);

t.check("a game runs", (() => {
	const play = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];
	let seed = 5150, played = 0;
	const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
	while(played < 60) {
		play.mMoves = [];
		play.GenerateMoves(game);
		if(play.mMoves.length === 0)
			break;
		const move = play.mMoves[Math.floor(random() * play.mMoves.length)];
		play.ApplyMove(game, move);
		game.mPlayedMoves.push(move);
		play.mWho = -play.mWho;
		played++;
	}
	return played;
})(), 60);

t.done("Chu Shogi");
