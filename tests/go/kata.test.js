/*
 * The KataGo integration.
 *
 *   node tests/go/kata.test.js
 *
 * The engine itself is WebAssembly and needs a browser, so what is exercised
 * here is everything on Jocly's side of the worker boundary: what
 * jocly.kata.js posts, what it does with each reply, and how a game module
 * turns its position into the move sequence kataeval replays.
 *
 * That boundary is where the mistakes live. An engine returning a good move is
 * useless if the position it was given was wrong, and a position expressed as
 * "the moves that made it" is easy to get subtly wrong in ways that still look
 * like a legal game - a colour off by one ply, a pass dropped, komi missing.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(ROOT, "src");
const GO = path.join(SRC, "games", "go");

const t = require(path.join(ROOT, "tests", "fairy", "harness.js")).runner();
const manifest = require(path.join(GO, "index.js")).games;

/* ------------------------------------------- the position a game exports */

function loadModel() {
	const sandbox = {
		console, Math, JSON, Object, Array, Date,
		Int32Array, Int8Array, Uint8Array, Float64Array, setTimeout,
		Model: { Game: {}, Board: {}, Move: {} }, exports: {}, module: {},
	};
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	["jocly.util.js", "jocly.game.js"].forEach((f) =>
		vm.runInContext(fs.readFileSync(path.join(SRC, "core", f), "utf8"), sandbox, { filename: f }));
	vm.runInContext(fs.readFileSync(path.join(GO, "go-model.js"), "utf8"), sandbox, { filename: "go-model.js" });
	return sandbox;
}

const model = loadModel();
const proto = Object.assign({}, model.JocBoard.prototype, model.Model.Board);

function newGame(name) {
	const entry = manifest.filter((x) => x.name === name)[0];
	const game = Object.create(model.Model.Game);
	game.g = {};
	game.mOptions = JSON.parse(JSON.stringify(entry.config.model.gameOptions));
	game.mPlayedMoves = [];
	game.InitGame();
	game.mBoard = Object.create(proto);
	game.mBoard.InitialPosition(game);
	game.mBoard.mWho = 1;
	return game;
}

// play a point by its Go name, keeping mPlayedMoves as Jocly keeps it
function play(game, text) {
	const board = game.mBoard;
	board.GenerateMoves(game);
	const p = game.StringToCoord(text);
	const move = board.mMoves.filter((m) => m.p === p)[0];
	if(!move) throw new Error("no legal move at " + text);
	game.mPlayedMoves.push(move);
	board.ApplyMove(game, move);
	board.mWho = -board.mWho;
	return move;
}

const g9 = newGame("go9");

t.check("an empty board exports an empty sequence",
	g9.mBoard.goExportMoves(g9), { moves: [], toPlay: 1, komi: 5.5, boardSize: 9 });

play(g9, "E5");
t.check("black's first move is colour 1",
	g9.mBoard.goExportMoves(g9).moves, [{ loc: g9.StringToCoord("E5"), col: 1 }]);
t.check("and white is to play", g9.mBoard.goExportMoves(g9).toPlay, 2);

play(g9, "C3");
t.check("the colours alternate with the plies",
	g9.mBoard.goExportMoves(g9).moves.map((m) => m.col), [1, 2]);

// A pass is a move in the sequence, not an absence of one: drop it and every
// colour after it is wrong.
g9.mPlayedMoves.push({ p: -1 });
g9.mBoard.ApplyMove(g9, { p: -1 });
g9.mBoard.mWho = -g9.mBoard.mWho;
play(g9, "G7");
const exported = g9.mBoard.goExportMoves(g9);
t.check("a pass keeps its place in the sequence",
	exported.moves.map((m) => m.loc)[2], -1);
t.check("so the colours stay in step",
	exported.moves.map((m) => m.col), [1, 2, 1, 2]);
t.check("and the side to play is still right", exported.toPlay, 1);

t.check("komi and board size travel with the position",
	[exported.komi, exported.boardSize], [5.5, 9]);
t.check("a 19x19 game exports its own komi",
	newGame("go19").mBoard.goExportMoves(newGame("go19")).komi, 7.5);

/* ---------------------------------------------------- the engine driver */

function loadKata(WorkerClass) {
	const sandbox = {
		console: { log: () => { }, info: () => { }, warn: () => { }, error: () => { } },
		Math, JSON, Object, Array, Promise, setTimeout,
		Worker: WorkerClass,
		WeakMap,
		JocUtil: { schedule: (obj, name, args) => obj[name](args) },
	};
	sandbox.window = sandbox;
	sandbox.global = sandbox;
	vm.createContext(sandbox);
	vm.runInContext(fs.readFileSync(path.join(SRC, "core", "jocly.kata.js"), "utf8"),
		sandbox, { filename: "jocly.kata.js" });
	return sandbox.JoclyKata;
}

// A worker that records what it is posted and answers on demand.
function fakeWorker(script) {
	const posted = [];
	function W(url) {
		this.url = url;
		W.last = this;
		this.postMessage = (m) => {
			posted.push(m);
			if(m.type === "Init")
				setTimeout(() => this.onmessage({ data: { type: "Ready", data: { backend: "CPU" } } }), 0);
		};
	}
	W.posted = posted;
	return W;
}

// A game stub with just enough of Jocly on it for startMachine.
const GO_LEVELS = manifest.filter((x) => x.name === "go9")[0].config.model.levels;

function engineGame(goGame) {
	return {
		g: goGame.g,
		config: { baseURL: "/dist/", model: { levels: GO_LEVELS } },
		started: [],
		StartMachine(options) { this.started.push(options.level); },
		mBoard: goGame.mBoard,
		mPlayedMoves: goGame.mPlayedMoves,
		mBestMoves: null,
		done: 0,
		progress: [],
		mProgressCallback(p) { this.progress.push(p); },
		Done() { this.done++; },
	};
}

function run(goGame, level) {
	const W = fakeWorker();
	const Kata = loadKata(W);
	const game = engineGame(goGame);
	Kata.startMachine(game, { level: level });
	return { W, Kata, game };
}

const LEVEL = manifest.filter((x) => x.name === "go9")[0]
	.config.model.levels.filter((l) => l.ai === "kata")[0];

t.check("the manifest declares kata levels", LEVEL !== undefined, true);
// One fixed name whatever network is dropped in: the levels named an upstream
// file once, and that file stopped existing.
t.check("naming the net by a fixed local name", LEVEL.net, "katago-nnetwork.bin.gz");
t.check("the same on every board",
  [...new Set(manifest.map((g) => g.config.model.levels.filter((l) => l.ai === "kata")
    .map((l) => l.net)).flat())], ["katago-nnetwork.bin.gz"]);

const ready = () => new Promise((r) => setTimeout(r, 5));

(function () {
	const board = newGame("go9");
	play(board, "E5");
	const { W, game } = run(board, LEVEL);

	const init = W.posted.filter((m) => m.type === "Init")[0];
	t.check("the worker is told where to load from", init.baseURL, "/dist/katago/");
	t.check("which net to load", init.net, LEVEL.net);
	t.check("and the board size, which fixes it for that worker", init.boardSize, 9);
	t.check("the worker script is the Jocly one, not upstream's",
		W.last.url, "/dist/jocly.kataworker.js");

	// the search goes out once the worker says it is ready
	return ready().then(() => {
		const search = W.posted.filter((m) => m.type === "Search")[0];
		t.check("the search carries the move sequence, not a board",
			search.moves, [{ loc: board.StringToCoord("E5"), col: 1 }]);
		t.check("with the side to play and the komi",
			[search.toPlay, search.komi], [2, 5.5]);
		t.check("and the level's budget",
			[search.visits, search.moveTimeMs, search.gumbel],
			[LEVEL.visits, LEVEL.moveTimeMs, LEVEL.gumbel]);

		/* --------------------------------------------------- the answer */

		// A point the game will play comes back as the real Move object, with
		// its capture list - which is what the view animates.
		const c3 = board.StringToCoord("C3");
		W.last.onmessage({ data: { type: "Progress", percent: 42 } });
		W.last.onmessage({ data: { type: "Done", data: { bestMove: c3, winrate: 0.5 } } });
		return ready().then(() => {
			t.check("progress is reported", game.progress, [42]);
			t.check("the chosen point becomes a legal move object",
				game.mBestMoves.length && game.mBestMoves[0].p, c3);
			t.check("and the turn is handed back once", game.done, 1);
		});
	});
})()

/* ------------------------------------------------- when it goes wrong */

/*
 * Every one of these has to end with the turn handed back. An engine that
 * fails silently does not lose a game, it hangs it: Jocly waits on Done() and
 * the board simply stops.
 */
.then(() => {
	// A point the game will not play. That is a rules disagreement - superko
	// is the likely one - and worth saying out loud rather than passing
	// instead and leaving someone to wonder why the engine gave up a move.
	const board = newGame("go9");
	play(board, "E5");
	const { W, game } = run(board, LEVEL);
	return ready().then(() => {
		W.last.onmessage({ data: { type: "Done", data: { bestMove: board.StringToCoord("E5") } } });
		return ready().then(() => {
			t.check("a move the game refuses yields none", game.mBestMoves, []);
			t.check("but the turn still comes back", game.done, 1);
		});
	});
})

.then(() => {
	/*
	 * The net is missing, or the module failed to load - which is what
	 * happens on a machine where nobody has installed a network.
	 *
	 * Handing the turn back with no move is not enough: the host has nothing
	 * to play, gives the turn to the human, and the player ends up moving for
	 * both colours with no idea why. So the game falls back to its own AI and
	 * says so through the channel the search result already carries to the
	 * host - the same one jocly.fairy.js uses.
	 */
	const board = newGame("go9");
	const { W, game } = run(board, LEVEL);
	return ready().then(() => {
		W.last.onmessage({ data: { type: "Error", error: "kgeLoad: no such file" } });
		return ready().then(() => {
			t.check("a missing engine falls back to a native level",
				game.started.length, 1);
			t.check("to the strongest one that is not this engine",
				game.started[0].ai, undefined);
			t.check("and the degradation is reported, not just logged",
				[game.mFairyFallback.engine, game.mFairyFallback.level],
				["kata", game.started[0].label]);
			t.check("with the reason",
				/kgeLoad/.test(game.mFairyFallback.reason), true);
		});
	});
})

.then(() => {
	// A game with no native level at all has nowhere to fall back to: then,
	// and only then, the turn comes back empty.
	const W = fakeWorker();
	const Kata = loadKata(W);
	const board = newGame("go9");
	const game = engineGame(board);
	game.config.model = { levels: [LEVEL] };
	Kata.startMachine(game, { level: LEVEL });
	return ready().then(() => {
		W.last.onmessage({ data: { type: "Error", error: "no network" } });
		return ready().then(() => {
			t.check("with no native level, the turn is handed back empty",
				[game.mBestMoves, game.done], [[], 1]);
		});
	});
})

.then(() => {
	const board = newGame("go9");
	const { Kata, W, game } = run(board, LEVEL);
	return ready().then(() => {
		Kata.abortMachine(game);
		t.check("aborting reaches the worker",
			W.posted.filter((m) => m.type === "Stop").length, 1);
		W.last.onmessage({ data: { type: "Aborted" } });
		return ready().then(() => {
			t.check("an abort is marked as one", game.mAborted, true);
			t.check("and still hands the turn back", game.done, 1);
		});
	});
})

.then(() => {
	// A game module that does not export a move sequence is not eligible, and
	// must be told so rather than misplayed.
	const W = fakeWorker();
	const Kata = loadKata(W);
	const game = { g: { size: 9 }, config: {}, mBoard: {}, mBestMoves: null, done: 0, Done() { this.done++; } };
	game.config.model = { levels: GO_LEVELS };
	game.StartMachine = function(options) { this.started.push(options.level); };
	game.started = [];
	Kata.startMachine(game, { level: LEVEL });
	t.check("a game with no goExportMoves also falls back", game.started.length, 1);
	t.check("without ever starting a worker", W.posted.length, 0);
})

/* --------------------------------------------------------- the wiring */

.then(() => {
	const gameJs = fs.readFileSync(path.join(SRC, "core", "jocly.game.js"), "utf8");
	t.check("StartMachine dispatches on the kata level",
		/level\.ai=="kata"[\s\S]{0,400}JoclyKata\.startMachine/.test(gameJs), true);
	t.check("AbortMachine reaches it too",
		/JoclyKata\.abortMachine/.test(gameJs), true);
	t.check("and node loads the module, as it does the other engines",
		/jocly\.kata\.js"\)\.JoclyKata/.test(gameJs), true);

	const gulp = fs.readFileSync(path.join(ROOT, "gulpfile.js"), "utf8");
	t.check("the worker is built", /jocly\.kataworker\.js/.test(gulp), true);
	t.check("the core module is bundled", /src\/core\/jocly\.kata\.js/.test(gulp), true);

	/*
	 * ...and bundled in the NODE list too, which the line above cannot see:
	 * the same filename appears in the browser list, so a search of the whole
	 * gulpfile passes on either one. It did, while the node list was missing
	 * jocly.kata.js - and the cost was not "no Go in node". jocly.game.js
	 * requires it OUTRIGHT on that path (the guarded `typeof JoclyScan` form
	 * lets Scan be absent; kata has no such guard), so require("jocly.core.js")
	 * threw and every node consumer of the dist went down with it.
	 *
	 * Checked against what jocly.game.js actually requires rather than against
	 * a list written here, so a fifth module added tomorrow is covered without
	 * anyone remembering this file.
	 */
	{
		const from = gulp.indexOf('gulp.task("build-node-core"');
		const nodeTask = gulp.slice(from, gulp.indexOf("gulp.task(", from + 10));
		const required = [...gameJs.matchAll(/r\("\.\/(jocly\.[a-z]+\.js)"\)/g)].map((m) => m[1]);
		t.check("the node path requires a handful of modules", required.length > 2, true);
		required.forEach((file) => {
			t.check("the node build ships " + file,
				nodeTask.indexOf("src/core/" + file) > 0, true);
		});
	}
	t.check("the plain engine is shipped", /third-party\/katago\/kataeval\.wasm/.test(gulp), true);
	// Looked for in what the build actually copies, not in the file text: the
	// gulpfile explains in a comment why the threaded build is left out, and a
	// plain search would match that comment and pass for the wrong reason.
	const copied = (gulp.match(/gulp\.src\(\[[^\]]*\]/g) || []).join(" ");
	t.check("and the threaded one is not, since nothing loads it",
		/kataeval-mt/.test(copied), false);
	t.check("the plain one is in a copied list", /kataeval\.wasm/.test(copied), true);

	const kata = path.join(ROOT, "third-party", "katago");
	t.check("the artifacts are present",
		["kataeval.js", "kataeval.wasm"].filter((f) => !fs.existsSync(path.join(kata, f))), []);
	t.check("with a README saying where the nets come from",
		fs.existsSync(path.join(kata, "README.md")), true);
	t.check("no net is bundled, as with the NNUEs",
		fs.readdirSync(kata).filter((f) => /\.bin\.gz$/.test(f)), []);


	// The worker must drive the plain ABI, not the threaded one.
	const worker = fs.readFileSync(path.join(SRC, "browser", "jocly.kataworker.js"), "utf8");
	t.check("the worker calls the plain search", /kgeSearch/.test(worker), true);
	t.check("and none of the threaded-only entry points",
		["kgeSearchBegin", "kgePollAll", "kgePonderBegin", "kgeSetStrength"]
			.filter((fn) => new RegExp(fn + "\\s*[\'\"]").test(worker)), []);

	// ...and every kge function it names must actually be exported by the
	// build that ships, which is the one thing that would fail only at runtime.
	const built = fs.readFileSync(path.join(kata, "kataeval.js"), "utf8");
	const named = (worker.match(/["\']kge[A-Za-z0-9]+["\']/g) || [])
		.map((x) => x.replace(/["\']/g, ""));
	t.check("every ABI call the worker makes exists in the shipped build",
		named.filter((fn) => built.indexOf("_" + fn) < 0), []);

	// The README has to say where to get one: the file is not in the
	// repository, so it is the only instruction anyone has.
	const readme = fs.readFileSync(path.join(kata, "README.md"), "utf8");
	t.check("the README names the file the levels expect",
		readme.indexOf(LEVEL.net) >= 0, true);
	t.check("and where to download a network",
		/pasky\/pachi\/releases/.test(readme), true);
	t.check("with a command that writes it under that name",
		new RegExp("curl[\\s\\S]{0,200}" + LEVEL.net.replace(/\./g, "\\.")).test(readme), true);

	// The worker says so when it finds the network, and names the path it
	// looked at when it does not: its absence is the one setup mistake that is
	// otherwise silent until the engine is asked to move.
	t.check("the worker reports the network it loaded",
		/network found:/.test(worker), true);
	t.check("and names the expected path when it cannot",
		/expected the network at/.test(worker), true);
	const core = fs.readFileSync(path.join(SRC, "core", "jocly.kata.js"), "utf8");
	t.check("the page console hears about it too, not only the worker's",
		/console\.info\("\[kata\]"/.test(core), true);
})

.then(() => t.done("KataGo integration"), (e) => {
	console.log("  FAIL unexpected: " + (e && e.stack || e));
	process.exit(1);
});
