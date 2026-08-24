/*
 * The Crazyhouse "Expert" level, against the Fairy-Stockfish build this
 * repository ships.
 *
 *   node tests/crazyhouse/crazyhouse-fairy.test.js
 *
 * This is §7.10 of the notes: "play a dozen moves at Expert level and check
 * none is refused". Two things have to agree for that, and neither fails
 * loudly when it does not:
 *
 * - the FEN the model hands the engine. Jocly keeps the pieces in hand on
 *   extra board columns, so the generic export describes a twelve-file board
 *   with no pocket; BuildShogiStyleFen() in jocly.fairy.js rebuilds it. If it
 *   gets it wrong the engine still answers - about a different position.
 * - the notation. jocly.fairy.js matches the engine's move against the
 *   model's own "engine" strings by edit distance, so a move that prints
 *   almost right is silently replaced by whatever prints closest to it. The
 *   promotions are the dangerous case: four moves that all printed "e7e8"
 *   would make "e7e8q" resolve to whichever came first.
 *
 * So the test plays the engine against the model's own legal move list, ply
 * by ply, and insists on an EXACT match each time - not the fuzzy one the
 * player would get, which is exactly what would hide the bug.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const FAIRY = path.join(ROOT, "third-party", "fairy-stockfish");

const H = require("../fairy/harness.js");
const t = H.runner();

const SCRIPTS = ["base-model.js", "grid-geo-model.js", "drop-model.js",
	"famous/crazyhouse-model.js"];
const cz = H.context(SCRIPTS);
const { sandbox, game, geo, types } = cz;

// the level as the manifest declares it
const games = require(path.join(ROOT, "src", "games", "chessbase", "index.js")).games;
const level = games.find((g) => g.name === "crazyhouse")
	.config.model.levels.find((l) => l.ai === "fairy-stockfish");

/* ---- the FEN, built the way jocly.fairy.js builds it ---- */

/*
 * BuildShogiStyleFen() is a closure inside jocly.fairy.js and not exported, so
 * the file is loaded and the function taken from its source - rather than
 * copied here, which would test a copy and not the shipped code.
 */
const FairySource = fs.readFileSync(path.join(ROOT, "src", "core", "jocly.fairy.js"), "utf8");
const start = FairySource.indexOf("function BuildShogiStyleFen");
const end = FairySource.indexOf("\n\t}", FairySource.indexOf("return placement", start)) + 3;
const BuildShogiStyleFen = new Function("JocGame",
	FairySource.slice(start, end) + "\nreturn BuildShogiStyleFen;")(sandbox.JocGame);

const Engine = (move) => cz.engine(move);
const Natural = (move) => cz.natural(move);

function moves(board) {
	board.mMoves = [];
	board.GenerateMoves(game);
	return board.mMoves;
}

/* ---- engine ---- */

function startEngine() {
	const Stockfish = require(path.join(FAIRY, "stockfish.js"));
	return Stockfish({ wasmBinary: fs.readFileSync(path.join(FAIRY, "stockfish.wasm")) })
		.then((engine) => {
			let lines = [], waiter = null;
			engine.addMessageListener((line) => {
				lines.push(line);
				if(waiter && waiter.done(line)) {
					const resolve = waiter.resolve, collected = lines;
					waiter = null; lines = [];
					resolve(collected);
				}
			});
			return {
				send: (cmd) => engine.postMessage(cmd),
				ask: (cmd, done) => new Promise((resolve, reject) => {
					lines = [];
					waiter = { done, resolve };
					const timer = setTimeout(() => reject(new Error("engine timeout on: " + cmd)), 30000);
					const original = resolve;
					waiter.resolve = (value) => { clearTimeout(timer); original(value); };
					engine.postMessage(cmd);
				}),
			};
		});
}

(async () => {
	const engine = await startEngine();

	console.log("\nthe level");

	t.check("declares the engine's own built-in variant", level.variant, "crazyhouse");
	t.check("and no custom definition for it", level.customVariantIni, undefined);
	t.check("and asks for the pocket FEN", level.pocketGeometry, true);

	engine.send("setoption name UCI_Variant value crazyhouse");
	engine.send("position startpos");
	const shown = (await engine.ask("d", (line) => line.indexOf("Fen: ") === 0))
		.find((line) => line.indexOf("Fen: ") === 0).slice(5).trim();

	console.log("\nthe position both sides think they are playing");

	const board = H.newBoard(sandbox, game);
	game.mPlayedMoves = [];
	board.__game = game;
	const ours = BuildShogiStyleFen({ mBoard: board, cbVar: game.cbVar,
		mPlayedMoves: [] , g: game.g }, false);

	// the engine normalises the empty pocket away ("[]" is dropped), and
	// rewrites the clocks; the placement and the side to move are the test
	const placement = (fen) => fen.split(/\s+/).slice(0, 2).join(" ").replace("[]", "");
	t.check("the same board and the same side to move",
		placement(ours), placement(shown));

	console.log("\ntwelve plies, the engine against the model's own move list");

	let played = 0, drops = 0, exact = 0, refused = [];
	const line = [];
	while(played < 12) {
		const legal = moves(board);
		if(legal.length === 0) break;

		const fen = BuildShogiStyleFen({ mBoard: board, cbVar: game.cbVar,
			mPlayedMoves: [], g: game.g }, false);
		engine.send("setoption name UCI_Variant value crazyhouse");
		engine.send("position fen " + fen);
		const answer = await engine.ask("go movetime 200",
			(l) => l.indexOf("bestmove") === 0);
		const uci = answer.find((l) => l.indexOf("bestmove") === 0).split(" ")[1];
		if(!uci || uci === "(none)") break;

		// what the player would get: the nearest string. What is checked: that
		// the nearest string is also an exact one.
		const strings = legal.map((m) => Engine(m).toLowerCase());
		const hit = strings.indexOf(uci.toLowerCase());
		if(hit < 0)
			refused.push(uci + " (legal: " + strings.slice(0, 8).join(" ") + " ...)");
		else
			exact++;

		const move = legal[hit < 0 ? 0 : hit];
		if(!geo.BOARD_AREA[move.f]) drops++;
		line.push(Natural(move));
		board.ApplyMove(game, move);
		game.mPlayedMoves.push(move);
		board.mWho = -board.mWho;
		played++;
	}

	console.log("  " + line.join(" "));
	t.check("twelve plies played", played, 12);
	t.check("every engine move is one of the model's, exactly", refused, []);
	t.check("and each was matched without guessing", exact, 12);

	console.log("\nand from a position with a hand and an en-passant square");

	/*
	 * The two fields the generic export gets wrong at once: a pocket, and an
	 * en-passant square that PosName() would write two files to the right.
	 * Moves are given in the engine's own notation, which is unambiguous.
	 */
	const scripted = (uciLine) => {
		const b = H.newBoard(sandbox, game);
		game.mPlayedMoves = [];
		uciLine.forEach((uci) => {
			const legal = moves(b);
			const move = legal.find((m) => Engine(m).toLowerCase() === uci);
			if(!move)
				throw new Error("no " + uci + " in " + legal.map(Engine).join(" "));
			b.ApplyMove(game, move);
			game.mPlayedMoves.push(move);
			b.mWho = -b.mWho;
		});
		return b;
	};

	const Fen = (b) => BuildShogiStyleFen({ mBoard: b, cbVar: game.cbVar,
		mPlayedMoves: [], g: game.g }, false);

	{
		const b = scripted(["e2e4", "d7d5", "g1f3", "d5e4", "f3e5", "e4e3",
			"e5f7", "d8d5", "f7h8", "d5d7", "e1e2", "c7c5"]);
		const fen = Fen(b);
		const pocket = /\[([^\]]*)\]/.exec(fen.split(" ")[0])[1];
		// White holds the Pawn and the Rook its Knight took; Black holds the
		// Pawn it took on e4
		t.check("the pocket names what each side took",
			pocket.split("").sort().join(""), "PRp");

		/*
		 * The engine's own reading of it. Only the placement and the side to
		 * move are compared: Fairy-Stockfish normalises the two fields after
		 * them, and is right to.
		 *
		 * - castling. ExportBoardState() writes "KQkq" for any side that has
		 *   not castled YET, whether or not its King and Rooks have moved -
		 *   it reads board.castled, which is a plain "has castled" boolean.
		 *   Here White has played Ke2 and lost the h8 Rook, so the engine
		 *   answers "q". It works this out from the piece positions, which
		 *   covers this position and every ordinary one; what it cannot see
		 *   is a King that moved and came home again. That is not a
		 *   Crazyhouse matter - classic-chess exports the same field from the
		 *   same code - and is left alone here.
		 * - the en-passant square, which the engine keeps only when the
		 *   capture is actually available. It is, in the position below.
		 */
		engine.send("setoption name UCI_Variant value crazyhouse");
		engine.send("position fen " + fen);
		const shown2 = (await engine.ask("d", (l) => l.indexOf("Fen: ") === 0))
			.find((l) => l.indexOf("Fen: ") === 0).slice(5).trim();
		// the pocket is compared as a set of letters, not as a string: the
		// engine writes it back in its own order (its pieces before ours,
		// by value) and neither order means anything
		const bare = (f) => f.replace(/\[[^\]]*\]/, "");
		const held = (f) => (/\[([^\]]*)\]/.exec(f) || ["", ""])[1].split("").sort().join("");
		t.check("and the engine reads the same board back",
			bare(shown2.split(/\s+/).slice(0, 2).join(" ")),
			bare(fen.split(/\s+/).slice(0, 2).join(" ")));
		t.check("holding the same pieces", held(shown2), held(fen));

		const legal = moves(b).map((m) => Engine(m).toLowerCase());
		engine.send("position fen " + fen);
		const perft = await engine.ask("go perft 1", (l) => /^Nodes searched/.test(l));
		const nodes = parseInt(/(\d+)/.exec(perft.find((l) => /^Nodes searched/.test(l)))[1]);
		t.check("and counts the same moves as the model, drops and all",
			nodes, legal.length);
	}

	{
		// an en-passant capture that is really available: the engine keeps
		// the square only then, so this is what proves it read ours
		const b = scripted(["e2e4", "d7d5", "e4d5", "c7c5"]);
		const fen = Fen(b);
		t.check("we write the square the Pawn skipped", fen.split(" ")[3], "c6");
		engine.send("setoption name UCI_Variant value crazyhouse");
		engine.send("position fen " + fen);
		const shown3 = (await engine.ask("d", (l) => l.indexOf("Fen: ") === 0))
			.find((l) => l.indexOf("Fen: ") === 0).slice(5).trim();
		t.check("and the engine keeps it", shown3.split(/\s+/)[3], "c6");
		const legal = moves(b).map((m) => Engine(m).toLowerCase());
		t.check("both offer the capture", legal.indexOf("d5c6") >= 0, true);
		engine.send("position fen " + fen);
		const perft = await engine.ask("go perft 1", (l) => /^Nodes searched/.test(l));
		const nodes = parseInt(/(\d+)/.exec(perft.find((l) => /^Nodes searched/.test(l)))[1]);
		t.check("and the same number of moves in all", nodes, legal.length);
	}

	{
		// a Pawn in hand, and the engine asked to use it
		const b = scripted(["e2e4", "d7d5", "e4d5"]);
		const fen = Fen(b);
		engine.send("setoption name UCI_Variant value crazyhouse");
		engine.send("position fen " + fen);
		const answer = await engine.ask("go movetime 200",
			(l) => l.indexOf("bestmove") === 0);
		const uci = answer.find((l) => l.indexOf("bestmove") === 0).split(" ")[1];
		const legal = moves(b).map((m) => Engine(m).toLowerCase());
		t.check("a position with a Pawn in hand is understood (" + uci + ")",
			legal.indexOf(uci.toLowerCase()) >= 0, true);
		engine.send("position fen " + fen);
		const perft = await engine.ask("go perft 1", (l) => /^Nodes searched/.test(l));
		const nodes = parseInt(/(\d+)/.exec(perft.find((l) => /^Nodes searched/.test(l)))[1]);
		t.check("and the drops it sees are the ones the model offers",
			nodes, legal.length);
	}

	t.done("crazyhouse / fairy-stockfish");
})().catch((error) => { console.error("ERROR", error); process.exit(2); });
