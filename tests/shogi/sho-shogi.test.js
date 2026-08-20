/*
 * Kotaishi Shogi and Sho Shogi, the same game with and without drops.
 *
 *   node tests/shogi/sho-shogi.test.js
 *
 * Sho Shogi is this game before drops were invented: same board, same pieces,
 * but a captured piece leaves play instead of joining the hand of its captor.
 * The choice is offered once, in a prelude, before the first move.
 *
 * Nothing was rebuilt for it. A drop here is an ordinary graph move from a
 * holding square, and drop-model.js already consults a table saying where each
 * captured type goes with "not all types have to go in hand" - so a hand table
 * that is empty produces no drops at all. What is checked below is that the
 * choice really does that, and that choosing Kotaishi afterwards puts the
 * table back.
 */

const H = require("../fairy/harness.js");

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "drop-model.js",
	"prelude-model.js", "shogi/kotaishi-shogi-model.js"];

// a game played out from the given prelude choice, counting what happened
function play(choice, plies) {
	const sandbox = H.loadModel(SCRIPTS);
	const game = H.newGame(sandbox);
	const geo = game.cbVar.geometry;
	const board = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];

	board.mMoves = [];
	board.GenerateMoves(game);
	const offered = board.mMoves.length;
	board.ApplyMove(game, { setup: choice });
	board.mMoves = [];
	board.GenerateMoves(game);
	const afterChoice = board.mMoves.length;   // the pass stage
	board.ApplyMove(game, board.mMoves[0]);

	const onBoard = (pos) => !!geo.BOARD_AREA[pos];
	let seed = 11, played = 0, drops = 0, captured = 0;
	const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
	while(played < plies) {
		board.mMoves = [];
		board.GenerateMoves(game);
		if(board.mMoves.length === 0)
			break;
		const move = board.mMoves[Math.floor(random() * board.mMoves.length)];
		if(!onBoard(move.f))
			drops++;
		if(move.c != null)
			captured++;
		board.ApplyMove(game, move);
		game.mPlayedMoves.push(move);
		board.mWho = -board.mWho;
		played++;
	}
	// the counters that show "x2" live on holding squares from the start and
	// are not pieces anyone captured
	let inHand = 0, princes = 0;
	board.pieces.forEach((piece) => {
		if(piece.p < 0 || onBoard(piece.p))
			return;
		const name = game.cbVar.pieceTypes[piece.t].name;
		if(name === "counter")
			return;
		inHand++;
		if(name.indexOf("prince") >= 0)   // a prisoner can never be a Crown Prince
			princes++;
	});
	return { offered, afterChoice, played, drops, captured, inHand, princes };
}

const t = H.runner();

console.log("\nthe prelude");

const sho = play(0, 200);        // button 0 is Sho shogi now
const kotaishi = play(1, 200);

t.check("two choices are offered", kotaishi.offered, 2);
t.check("then a single pass, so White still moves first", kotaishi.afterChoice, 1);

console.log("\nKotaishi: captured pieces come back");

t.ok("pieces are taken", kotaishi.captured > 0);
t.ok("they reach a hand", kotaishi.inHand > 0);
t.ok("and they are dropped again", kotaishi.drops > 0);

console.log("\nSho Shogi: they leave play");

t.ok("pieces are taken here too", sho.captured > 0);
t.check("but no hand ever receives one", sho.inHand, 0);
t.check("so nothing is ever dropped", sho.drops, 0);
t.ok("and the game runs its course", sho.played >= 100);

/*
 * The choice is a table swap, so a game of Sho Shogi must not leave the next
 * game of Kotaishi without its hands.
 */
console.log("\nchoosing again");

t.ok("Kotaishi after Sho Shogi still has its drops", (() => {
	play(0, 40);                       // a game of Sho shogi first
	return play(1, 200).drops > 0;     // then Kotaishi in a fresh sandbox
})());

t.ok("and Sho Shogi after Kotaishi still has none", (() => {
	play(1, 40);
	return play(0, 200).drops === 0;
})());

/*
 * The panel that shows the two buttons draws pieces from the game's own set.
 * Both faces have to name pieces this game really has, or a button comes up
 * blank - which is how it would fail, silently.
 */
console.log("\nthe two buttons");

const sandbox = H.loadModel(SCRIPTS);
const game = H.newGame(sandbox);
const types = game.cbVar.pieceTypes;
const abbrevs = [...new Set(Object.keys(types)
	.map((k) => types[k].abbrev || types[k].fenAbbrev).filter(Boolean))]
	.sort((a, b) => b.length - a.length);
const tokens = (row) => {
	const out = [];
	for(let i = 0; i < row.length; ) {
		const found = abbrevs.find((abbrev) => row.substr(i, abbrev.length) === abbrev);
		out.push(found || row.charAt(i));
		i += (found || row.charAt(i)).length;
	}
	return out;
};
const setups = game.cbVar.prelude[0].setups;
t.check("there are two of them", setups.length, 2);
// a rule cannot be drawn, so each button says which game it is
t.check("each one is named", game.cbVar.prelude[0].labels, ["Shō shogi", "Kōtaishi"]);
setups.forEach((setup) => {
	tokens(setup).forEach((id) => {
		let piece = null;
		for(const type in types)
			if((types[type].abbrev || types[type].fenAbbrev) === id)
				piece = types[type];
		t.ok('"' + setup + '" names a real piece with "' + id + '"', !!piece);
	});
});

/*
 * A prelude that only chooses a rule must not disturb the board. The one that
 * did left the hand counters - pieces drop-model takes off the board and
 * remembers - laid back on it, and the first drop then mistook a counter for
 * a second piece in hand: it shifted it into the hand and decremented its type
 * into a Crown Prince, which appeared among the prisoners.
 */
console.log("\nthe prelude leaves the board alone");

t.check("no counter is back on the board after the choice", (() => {
	const sandbox = H.loadModel(SCRIPTS);
	const game = H.newGame(sandbox);
	const geo = game.cbVar.geometry;
	const board = H.newBoard(sandbox, game);
	board.ApplyMove(game, { setup: 1 });          // Kotaishi
	board.mMoves = [];
	board.GenerateMoves(game);
	board.ApplyMove(game, board.mMoves[0]);       // the pass
	let counters = 0;
	board.pieces.forEach((piece) => {
		if(piece.p >= 0 && board.board[piece.p] >= 0
			&& game.cbVar.pieceTypes[piece.t].name === "counter")
			counters++;
	});
	return counters;
})(), 0);

t.check("and no prisoner turns into a Crown Prince", (() => {
	const kotaishiGame = play(1, 300);
	return kotaishiGame.princes;
})(), 0);

t.done("Kotaishi and Sho Shogi");
