/*
 * Le modele Jocly dans un bac a sable, sans build : placement, validation
 * des coups par Model.Board.IsValidMove, generation, copie, signature, fin.
 *
 *   node tests/kriegspiel/model.test.js
 */
const { rules, loadModel, newGame, manifest, suite } = require("./harness.js");
const R = rules();
const t = suite("kriegspiel model");
const P = R.posOf;
const sandbox = loadModel();

function squares(names) { return names.split(/\s+/).map(P); }
const NORTH = { p: { I: squares("C3 C4 C5 C6 C7 C8 D4 D5 D6"), C: squares("B4 B5 B6 B7"), A: [P("D7")], AC: [P("C9")], T: [P("D3")], E: [P("B8")] } };
const SOUTH = { p: { I: squares("S2 S3 S4 S5 S6 R3 R4 R5 R6"), C: squares("Q3 Q4 Q5 Q6"), A: [P("S7")], AC: [P("R7")], T: [P("T5")], E: [P("T8")] } };

t.section("manifeste");
(function () {
	const game = manifest();
	const options = game.config.model.gameOptions;
	t.eq(game.name, "jeu-de-la-guerre", "identifiant du jeu");
	t.eq(game.modelScripts, ["kriegspiel-rules.js", "kriegspiel-ai.js", "kriegspiel-model.js"], "scripts du modele");
	t.eq(options.map, R.DEFAULT_MAP, "une seule carte : gameOptions.map est celle du moteur");
	t.eq(options.units, R.DEFAULT_UNITS, "memes coefficients que le moteur");
	t.eq([options.maxTurns, options.isolationVictory], [400, true], "maxTurns 400, isolationVictory active");
	const total = Object.keys(options.units).reduce((n, k) => n + options.units[k].count, 0);
	t.eq(total, 17, "17 unites par camp");
	const levels = game.config.model.levels;
	t.eq(levels.map((l) => l.ai), ["uct", "uct", "uct", "kriegspiel"], "trois niveaux uct, puis le niveau adosse au moteur externe");
	t.eq(game.config.model.maxLevel, levels.length, "maxLevel suit le nombre de niveaux");
})();

t.section("placement");
(function () {
	const game = newGame(sandbox), board = game.mBoard;
	t.eq(board.phase, 0, "la partie commence par le placement du Nord");
	t.ok(!board.IsValidMove(game, { m: [] }), "pas de tour de jeu pendant le placement");
	t.ok(!board.IsValidMove(game, SOUTH), "le Nord ne place pas au Sud");
	t.ok(board.IsValidMove(game, NORTH), "placement du Nord accepte");
	game.play(NORTH);
	t.eq([board.phase, board.mWho], [1, -1], "au Sud de placer");
	t.ok(!board.IsValidMove(game, NORTH), "le Sud ne place pas au Nord");
	game.play(SOUTH);
	t.eq([board.phase, board.mWho, board.turn], [2, 1, 2], "coup 3 : le Nord joue son premier tour");
	t.eq(board.grid.filter((v) => v > 0).length, 17, "17 unites au Nord");
	t.eq(board.grid.filter((v) => v < 0).length, 17, "17 unites au Sud");

	// les placements de l'IA
	const fresh = newGame(sandbox);
	fresh.mBoard.GenerateMoves(fresh);
	t.ok(fresh.mBoard.mMoves.length >= 8 && fresh.mBoard.mMoves.length <= 12, "8 a 12 placements candidats (" + fresh.mBoard.mMoves.length + ")");
	t.ok(fresh.mBoard.mMoves.every((m) => fresh.mBoard.IsValidMove(fresh, m)), "tous valides");
	const ctx = fresh.g.ctx;
	t.ok(fresh.mBoard.mMoves.every((m) => {
		const r = R.playTurn(ctx, fresh.mBoard, 1, m);
		const c = R.communications(ctx, r.state, 1, false);
		return c.count === 17;
	}), "tout le monde en communication au depart");
	const picked = fresh.mBoard.StaticGenerateMoves(fresh);
	t.ok(picked.length === 1 && fresh.mBoard.IsValidMove(fresh, picked[0]), "StaticGenerateMoves : un placement, sans recherche");
	// le generateur ne regarde pas le camp adverse : memes placements du Sud
	// quel que soit le deploiement du Nord
	fresh.play(picked[0]);
	fresh.mBoard.GenerateMoves(fresh);
	t.ok(fresh.mBoard.mMoves.length >= 8 && fresh.mBoard.mMoves.every((m) => fresh.mBoard.IsValidMove(fresh, m)), "placements du Sud valides");
	fresh.play(fresh.mBoard.mMoves[0]);
	t.eq(fresh.mBoard.StaticGenerateMoves(fresh), null, "plus de placement statique en phase de jeu");
})();

t.section("tour de jeu");
(function () {
	const game = newGame(sandbox), board = game.mBoard;
	game.play(NORTH);
	game.play(SOUTH);
	t.ok(board.IsValidMove(game, { m: [] }), "tour vide");
	t.ok(board.IsValidMove(game, { m: [[P("D6"), P("E6")]] }), "un deplacement");
	t.ok(!board.IsValidMove(game, { m: [[P("D6"), P("F6")]] }), "infanterie : un seul pas");
	t.ok(!board.IsValidMove(game, { m: [[P("C5"), P("D5")]] }), "pas sur une case occupee");
	t.ok(!board.IsValidMove(game, { m: [[P("S2"), P("R2")]] }), "pas une unite adverse");
	const six = [["D4", "E4"], ["D5", "E5"], ["D6", "E6"], ["D7", "E7"], ["C9", "D9"], ["C3", "D2"]].map((s) => s.map(P));
	t.ok(board.IsValidMove(game, { m: six.slice(0, 5) }), "5 deplacements");
	t.ok(!board.IsValidMove(game, { m: six }), "6 deplacements : refuse");
	t.ok(!board.IsValidMove(game, { m: [[P("D6"), P("E6")], [P("E6"), P("F6")]] }), "une unite deplacee deux fois : refuse");
	t.ok(!board.IsValidMove(game, { m: [], a: P("S2") }), "attaque sans effet : refuse");
	t.ok(!board.IsValidMove(game, { r: [P("D6"), P("E6")], m: [] }), "retraite sans ordre : refuse");
	t.ok(!board.IsValidMove(game, NORTH), "plus de placement");
	t.ok(!board.IsValidMove(game, { m: [], d: P("T3") }), "destruction d'arsenal fictive : refuse");

	// les candidats de l'IA passent tous le validateur, tour vide compris
	board.GenerateMoves(game);
	t.ok(board.mMoves.length >= 10, "des tours candidats (" + board.mMoves.length + ")");
	t.ok(board.mMoves.every((m) => board.IsValidMove(game, m)), "tous valides");
	t.ok(board.mMoves.some((m) => JSON.stringify(m) === '{"m":[]}'), "le tour vide en fait partie");
	const keys = board.mMoves.map((m) => JSON.stringify(m));
	t.eq(new Set(keys).size, keys.length, "dedoublonnes");

	// copie et signature
	const Board = game.GetBoardClass();
	const copy = new Board();
	copy.CopyFrom(board);
	t.eq(copy.GetSignature(), board.GetSignature(), "meme signature apres copie");
	copy.mWho = board.mWho;
	copy.ApplyMove(game, { m: [[P("D6"), P("E6")]] });
	t.ok(board.grid[P("D6")] === 1 && board.grid[P("E6")] === 0, "la copie est independante");
	t.ok(copy.GetSignature(true) !== board.GetSignature(true), "signature differente apres un coup");
	const twin = new Board();
	twin.CopyFrom(board);
	twin.turn += 10;
	t.eq(twin.GetSignature(true), board.GetSignature(true), "la signature ignore le compteur de coups (repetitions)");
	twin.turn += 1;
	t.ok(twin.GetSignature(true) !== board.GetSignature(true), "mais pas le trait (parite du compteur)");
	twin.turn -= 11;
	twin.mWho = -board.mWho;
	t.eq(twin.GetSignature(true), board.GetSignature(true), "elle ne lit pas mWho, que le coeur inverse a des moments differents");

	// position en texte, pour le moteur externe
	const exported = board.ExportBoardState(game).split(" ");
	t.eq(exported.slice(0, 5), ["N", "2", "2", "1111", "-"], "ExportBoardState : trait, phase, coups, arsenaux, retraite");
	let cells = 0, units = 0;
	exported[5].replace(/\d+|[A-Za-z]/g, (tok) => { if(/\d/.test(tok)) cells += parseInt(tok, 10); else { cells++; units++; } return ""; });
	t.eq([cells, units], [500, 34], "ExportBoardState : 500 cases, 34 unites");
	t.ok(exported[5].indexOf("T") >= 0 && exported[5].indexOf("t") >= 0 && exported[5].indexOf("H") >= 0, "Nord en majuscules, Sud en minuscules, H pour l'artillerie a cheval");
	const south = new Board();
	south.CopyFrom(board);
	south.mWho = -1;
	south.retreat = 137;
	south.ars = [1, 0, 1, 1];
	t.eq(south.ExportBoardState(game).split(" ").slice(0, 5), ["S", "2", "2", "1011", "137"], "ExportBoardState : trait au Sud, arsenal detruit, retraite due");

	// notation
	const Move = game.GetMoveClass();
	t.eq(new Move({ r: [P("E5"), P("E6")], m: [[P("F3"), P("G4")], [P("H2"), P("H4")]], a: P("E7") }).ToString(),
		"r:E5-E6 F3-G4 H2-H4 xE7", "notation d'un tour");
	t.eq(new Move({ m: [[P("G7"), P("T3")]], d: P("T3") }).ToString(), "G7-T3!", "notation d'une destruction d'arsenal");
	t.eq(new Move({ m: [] }).ToString(), "-", "notation du tour vide");
	t.ok(/^Nord: I@C3,.*AC@C9,T@D3,E@B8$/.test(new Move(NORTH).ToString()), "notation du placement");
	t.ok(new Move({ m: [] }).Equals(new Move({})), "Equals : {} et { m: [] } sont le meme tour vide");
	t.ok(!new Move({ m: [] }).Equals(new Move({ m: [], a: 3 })), "Equals distingue une attaque");
})();

t.section("fin de partie");
(function () {
	function playing(setup, options) {
		const game = newGame(sandbox, options), board = game.mBoard;
		game.play(NORTH);
		game.play(SOUTH);
		setup(board);
		return game;
	}
	// victoire A : le dernier arsenal du Sud tombe
	let game = playing((b) => {
		b.grid.fill(0);
		b.grid[P("S8")] = R.SIGNAL; b.grid[P("S4")] = R.CAVALRY;
		b.grid[P("K20")] = -R.INFANTRY; b.grid[P("T23")] = 0;
		b.ars = [1, 1, 1, 0];
	});
	let finished = game.play({ m: [[P("S4"), P("T3")]], d: P("T3") });
	t.ok(finished && game.mBoard.mWinner === 1 && game.mBoard.reason === "arsenals", "victoire A pour le Nord");
	t.ok(!game.mBoard.IsValidMove(game, { m: [] }), "plus de coup une fois la partie finie");
	game.mBoard.GenerateMoves(game);
	t.ok(game.mBoard.mFinished && game.mBoard.mMoves.length === 0, "GenerateMoves signale la fin");

	// victoire B : la derniere unite combattante du Sud est detruite
	game = playing((b) => {
		b.grid.fill(0);
		b.grid[P("H4")] = R.INFANTRY; b.grid[P("H5")] = R.INFANTRY;
		b.grid[P("H3")] = -R.INFANTRY; b.grid[P("T5")] = -R.SIGNAL;
	});
	finished = game.play({ m: [], a: P("H3") });
	t.ok(finished && game.mBoard.mWinner === 1 && game.mBoard.reason === "annihilated", "victoire B pour le Nord");
	t.eq(game.mBoard.last && game.mBoard.last.outcome, "destroy", "l'issue de l'attaque est gardee pour la vue");

	// victoire C, et son option
	const isolate = (b) => {
		b.grid.fill(0);
		b.grid[P("D9")] = R.INFANTRY; b.grid[P("H4")] = R.INFANTRY; b.grid[P("H5")] = R.INFANTRY;
		b.grid[P("H3")] = -R.SIGNAL; b.grid[P("K10")] = -R.INFANTRY;
	};
	game = playing(isolate);
	finished = game.play({ m: [], a: P("H3") });
	t.ok(finished && game.mBoard.mWinner === 1 && game.mBoard.reason === "isolated", "victoire C pour le Nord");
	game = playing(isolate, { isolationVictory: false });
	finished = game.play({ m: [], a: P("H3") });
	t.ok(!finished, "isolationVictory desactivee : la partie continue");

	// nulle par maxTurns
	game = playing(() => {}, { maxTurns: 4 });
	t.ok(!game.play({ m: [] }), "coup 3 : la partie continue");
	finished = game.play({ m: [] });
	t.ok(finished && game.mBoard.mWinner === sandbox.JocGame.DRAW && game.mBoard.reason === "max-turns", "nulle au 4e coup avec maxTurns = 4");

	// le Sud gagne aussi
	game = playing((b) => {
		b.grid.fill(0);
		b.grid[P("D9")] = R.INFANTRY;
		b.grid[P("E7")] = -R.CAVALRY; b.grid[P("E3")] = -R.SIGNAL; b.grid[P("T4")] = -R.INFANTRY;
		b.ars = [1, 0, 1, 1];
	});
	game.play({ m: [] });
	finished = game.play({ m: [[P("E7"), P("D8")]], d: P("D8") });
	t.ok(finished && game.mBoard.mWinner === -1, "victoire A pour le Sud");
})();

t.done();
