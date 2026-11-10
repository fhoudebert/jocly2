/*
 * Parties completes sur le modele Jocly, menees jusqu'au bout :
 *   - IA contre IA : chaque camp joue le meilleur de ses tours candidats a
 *     un coup de profondeur (l'evaluation statique), avec un peu de hasard ;
 *   - hasard contre hasard : un tour candidat tire au sort.
 * Chaque coup joue passe Model.Board.IsValidMove, aucune exception n'est
 * toleree, et les invariants de l'etat sont verifies apres chaque coup.
 *
 * La duree moyenne des parties IA contre IA est affichee a titre indicatif,
 * en regard des 110 coups environ que Debord donne pour une partie.
 *
 *   node tests/kriegspiel/fuzz.test.js [parties IA] [parties hasard]
 */
const { rules, loadModel, newGame, suite } = require("./harness.js");
const R = rules();
const t = suite("kriegspiel fuzz");
const sandbox = loadModel();

const AI_GAMES = parseInt(process.argv[2], 10) || 6;
const RANDOM_GAMES = parseInt(process.argv[3], 10) || 3;

function invariants(game, label) {
	const b = game.mBoard, ctx = game.g.ctx;
	let north = 0, south = 0, ok = true;
	for(let pos = 0; pos < R.N; pos++) {
		const v = b.grid[pos];
		if(v === 0) continue;
		if(ctx.terr[pos] === R.MOUNTAIN || Math.abs(v) > 6) ok = false;
		if(v > 0) north++; else south++;
	}
	if(north > 17 || south > 17) ok = false;
	if(b.retreat >= 0 && (b.grid[b.retreat] === 0 || R.sideOf(b.grid[b.retreat]) !== b.mWho)) ok = false;
	// un arsenal debout n'est jamais occupe par une unite combattante ennemie
	ctx.arsPos.forEach((pos, i) => {
		const v = b.grid[pos];
		if(b.ars[i] && v !== 0 && R.sideOf(v) !== ctx.arsSide[i] && R.typeOf(v) < R.SIGNAL) ok = false;
	});
	if(!ok) t.ok(false, "invariants rompus " + label);
	return ok;
}

function pick(game, smart) {
	const board = game.mBoard;
	board.mMoves = [];
	board.GenerateMoves(game);
	const moves = board.mMoves;
	if(!moves.length)
		throw new Error("no candidate move");
	if(!smart || board.phase < 2 || Math.random() < 0.05)
		return moves[Math.floor(Math.random() * moves.length)];
	const Board = game.GetBoardClass();
	let best = null, bestScore = -Infinity;
	for(const move of moves) {
		const next = new Board();
		next.CopyFrom(board);
		next.mWho = board.mWho;
		next.ApplyMove(game, move);
		next.mWho = -board.mWho;
		next.mFinished = false;
		next.Evaluate(game, false, false);
		let score;
		if(next.mFinished)
			score = next.mWinner === board.mWho ? 1e6 : next.mWinner === -board.mWho ? -1e6 : 0;
		else
			score = next.mEvaluation * board.mWho + Math.random() * 0.5;
		if(score > bestScore) { bestScore = score; best = move; }
	}
	return best;
}

function playGame(smart, label) {
	const game = newGame(sandbox), board = game.mBoard;
	let plies = 0, finished = false, candidates = 0, generated = 0, time = 0;
	while(!finished) {
		const started = Date.now();
		const move = pick(game, smart);
		time += Date.now() - started;
		generated++;
		candidates += board.mMoves.length;
		if(!board.mMoves.every((m) => board.IsValidMove(game, m)))
			throw new Error("a candidate move is not valid at ply " + plies);
		finished = game.play(move);   // leve une exception si IsValidMove refuse
		plies++;
		if(!invariants(game, label + " ply " + plies))
			break;
		if(plies > 1000)
			throw new Error("game does not end");
	}
	return { plies, winner: board.mWinner, reason: board.reason, candidates: candidates / generated, ms: time / generated };
}

function run(count, smart, title) {
	t.section(title);
	const results = [];
	for(let i = 0; i < count; i++) {
		try {
			const r = playGame(smart, title + " #" + i);
			results.push(r);
			t.ok(r.reason !== null, "la partie se termine (" + r.plies + " coups, " + r.reason + ")");
			t.ok(r.plies <= 400, "au plus maxTurns coups");
			console.log("    #" + (i + 1) + "  " + String(r.plies).padStart(3) + " coups  " +
				(r.winner === 1 ? "Nord" : r.winner === -1 ? "Sud " : "nulle") + "  " + r.reason +
				"  (" + r.candidates.toFixed(0) + " candidats/coup, " + r.ms.toFixed(0) + " ms/coup)");
		} catch(e) {
			t.ok(false, title + " #" + i + " : " + (e && e.stack || e));
		}
	}
	return results;
}

const smart = run(AI_GAMES, true, "IA contre IA");
run(RANDOM_GAMES, false, "hasard contre hasard");

if(smart.length) {
	const mean = smart.reduce((n, r) => n + r.plies, 0) / smart.length;
	const decided = smart.filter((r) => r.winner !== sandbox.JocGame.DRAW).length;
	console.log("  duree moyenne IA contre IA : " + mean.toFixed(0) + " coups Jocly (placements compris) sur " +
		smart.length + " parties, dont " + decided + " decidees ; Debord : environ 110 coups (indicatif)");
}
t.done();
