/*
 * Le modele Jocly de Péan dans un bac a sable, sans build : manifeste,
 * validation par Model.Board.IsValidMove, generation, copie, signature,
 * deploiement libre, fin de partie.
 *
 *   node tests/pean/model.test.js
 */
const { rules, ai, loadModel, newGame, manifest, scenario, suite } = require("./harness.js");
const R = rules();
const AI = ai();
const t = suite("pean model");

function skinsHave(games, name) {
	return games.every((g) => g.config.view.skins[2].preload.indexOf("image|/res/images/" + name + ".png") >= 0);
}

t.section("manifeste");
(function () {
	const fs = require("fs"), path = require("path");
	const GAME = path.join(__dirname, "../../src/games/pean");
	const games = manifest();
	t.eq(games.map((g) => g.name), ["pean"], "un seul jeu : la bataille se choisit au prelude");
	const g = games[0], model = g.config.model, options = model.gameOptions;
	t.eq(g.modelScripts, ["pean-rules.js", "pean-ai.js", "pean-model.js"], "scripts du modele");
	t.eq(model.module, "pean", "module");
	t.eq(model.maxLevel, model.levels.length, "maxLevel");
	t.eq(model.levels.map((l) => l.ai), ["uct", "uct", "uct", "pean"], "trois niveaux uct, puis le Maréchal (moteur externe)");
	t.eq(options.preventRepeat, false, "pas de nulle par repetition (la limite de tours clot la partie)");
	t.eq(options.scenarios.map((sc) => sc.id), ["platees-479", "laurion-413", "leuctres-371", "bataille-libre"], "quatre batailles");
	t.eq(options.scenario, options.scenarios[0], "la premiere est celle de depart");
	t.eq(options.scenarios[2], scenario("leuctres-371"), "le manifeste embarque les fichiers tels quels");
	options.scenarios.forEach((sc) => {
		t.eq(R.validateScenario(sc), [], sc.id + " : scenario valide");
		Object.keys(sc.camps).forEach((k) => t.ok(sc.camps[k].embleme && sc.camps[k].banniere, sc.id + " : camp " + k + " a son embleme et sa banniere"));
		t.ok(sc.regles && sc.regles.fr && sc.regles.en, sc.id + " : conditions de victoire (regles) en francais et en anglais");
	});
	const dialog = options.prelude[0];
	t.eq(options.prelude.length, 2, "prelude : le choix, puis une etape vide qui rend la main");
	t.eq(options.prelude[1], 0, "etape vide");
	t.eq(dialog.labels, ["ΠΛΑΤΑΙΑΙ", "ΛΑΥΡΙΟΝ", "ΛΕΥΚΤΡΑ", "ΕΛΛΗΝΕΣ"], "noms en grec sous les vignettes");
	t.ok(dialog.thumbnails.length === 4 && dialog.thumbnails.every((f) => fs.existsSync(path.join(GAME, f))), "une vignette par bataille");
	t.ok(dialog.persistent === undefined, "le choix n'est pas retenu d'une partie a l'autre");
	t.ok(model.thumbnail === "thumbnail.png" && fs.existsSync(path.join(GAME, model.thumbnail)), "la vignette du jeu");
	const skins = g.config.view.skins;
	t.eq(skins.map((k) => k.name), ["tuiles", "wargame", "insignes", "carte"], "quatre skins, « tuiles » par defaut");
	t.ok(skins[0].preload.length >= 25 && skins[0].preload.every((p) =>
		fs.existsSync(path.join(GAME, p.replace(/^image\|/, "")))), "tuiles presentes");
	t.ok(skins[2].preload.length >= 3 && skins[2].preload.every((p) =>
		fs.existsSync(path.join(GAME, p.replace(/^image\|/, "")))), "emblemes et bannieres presents");
	t.ok(options.scenarios.every((sc) => Object.keys(sc.camps).every((k) =>
		skins[2].preload.indexOf("image|/res/images/emblemes/" + sc.camps[k].embleme + ".png") >= 0)), "les emblemes de toutes les batailles sont precharges");
	t.ok(/GPL v2/.test(fs.readFileSync(path.join(GAME, "credits-fr.html"), "utf8")), "credits : attribution Wesnoth");
	t.ok(["foret", "marais", "montagne", "mer", "colline", "ville", "camp"].every((n) => skinsHave(games, "terrain/" + n)), "pictogrammes de terrain prechargés");
	t.ok(/CC BY-SA 3\.0/.test(fs.readFileSync(path.join(GAME, "credits-fr.html"), "utf8")), "credits : attribution 0 A.D.");
	t.ok(/Heraklios/.test(fs.readFileSync(path.join(GAME, "credits-fr.html"), "utf8")), "credits : mention d'hommage");
})();

t.section("prelude : le choix de la bataille");
(function () {
	const sandbox = loadModel();
	const game = newGame(sandbox), board = game.mBoard;
	t.eq([board.preludeStage, board.scen, board.mWho], [0, 0, 1], "la partie s'ouvre sur le choix, au premier camp");
	t.eq(game.g.ctx.id, "platees-479", "la carte de depart : Platees");
	board.GenerateMoves(game);
	t.eq(board.mMoves, [{ setup: 0 }, { setup: 1 }, { setup: 2 }, { setup: 3 }], "un coup par bataille");
	t.ok(!board.IsValidMove(game, {}) && !board.IsValidMove(game, { skip: 1 }), "rien d'autre");
	t.ok(!board.IsValidMove(game, { setup: 4 }), "pas de bataille 4");
	t.eq(board.ExportEngineRequest(game), null, "pas de requete au moteur pendant le prelude");
	const statics = board.StaticGenerateMoves(game);
	t.ok(statics.length === 1 && statics[0].setup >= 0 && statics[0].setup < 4, "la machine choisit sans chercher");
	t.eq(game.CreateMove({ setup: 2 }).ToString(), "#2", "notation « #2 »");
	t.ok(!game.CreateMove({ setup: 2 }).Equals(game.CreateMove({ setup: 1 })), "Move.Equals distingue les batailles");
	const sig0 = board.GetSignature();
	const copy = new (game.GetBoardClass())();
	copy.CopyFrom(board);
	t.eq(copy.preludeStage, 0, "la copie garde l'etape");
	game.play({ setup: 2 });
	t.eq([board.preludeStage, board.scen, board.mWho, game.g.ctx.id], [1, 2, -1, "leuctres-371"], "Leuctres choisi, au camp -1 de rendre la main");
	t.eq([board.phase, board.played, board.u.length], [2, 0, 37], "la position de depart de Leuctres");
	t.ok(board.GetSignature() !== sig0, "la signature change d'etape");
	board.GenerateMoves(game);
	t.eq(board.mMoves, [{ skip: 1 }], "etape vide : un seul coup");
	t.eq(game.CreateMove({ skip: 1 }).ToString(), "--", "notation « -- »");
	game.play({ skip: 1 });
	t.eq([board.preludeStage, board.mWho, board.played], [-1, 1, 0], "la bataille commence, au premier camp");
	board.GenerateMoves(game);
	t.ok(board.mMoves.length >= 6 && board.mMoves.every((m) => board.IsValidMove(game, m)), "tours candidats de Leuctres");
	t.ok(!board.IsValidMove(game, { setup: 1 }), "plus de choix de bataille");
	t.ok(board.ExportEngineRequest(game).context.cols === game.g.ctx.cols, "le moteur recoit le contexte de Leuctres");
	// le contexte suit le plateau : une copie d'une autre bataille le change
	const other = newGame(sandbox, "laurion-413").mBoard;
	const mixed = new (game.GetBoardClass())();
	mixed.CopyFrom(other);
	mixed.mWho = 1;
	mixed.GenerateMoves(game);
	t.eq(game.g.ctx.id, "laurion-413", "le contexte suit le plateau presente");
	board.GenerateMoves(game);
	t.eq(game.g.ctx.id, "leuctres-371", "et revient");
	// une nouvelle partie repart de la carte de depart
	board.InitialPosition(game);
	t.eq([board.preludeStage, board.scen, game.g.ctx.id], [0, 0, "platees-479"], "nouvelle partie : de nouveau le choix");
})();

t.section("partie a scenario fixe");
(function () {
	const sandbox = loadModel();
	const game = newGame(sandbox, "leuctres-371"), board = game.mBoard;
	t.eq([board.phase, board.played, board.u.length], [2, 0, 37], "Leuctres commence en phase de jeu, 37 unites");
	t.ok(!board.IsValidMove(game, { p: [] }), "pas de deploiement");
	board.GenerateMoves(game);
	t.ok(board.mMoves.length >= 6, "tours candidats (" + board.mMoves.length + ")");
	t.ok(board.mMoves.every((m) => board.IsValidMove(game, m)), "tous valides");
	const move = game.CreateMove(board.mMoves[0]);
	t.ok(typeof move.ToString() === "string" && move.ToString().length > 0, "notation : " + move.ToString());
	t.ok(move.Equals(game.CreateMove(JSON.parse(JSON.stringify(board.mMoves[0])))), "Move.Equals");
	// copie
	const copy = new (game.GetBoardClass())();
	copy.CopyFrom(board);
	t.eq(copy.GetSignature(), board.GetSignature(), "copie : meme signature");
	copy.u[0].h = 0;
	t.ok(board.u[0].h !== 0, "copie profonde des unites");
	// un coup joue
	const sig = board.GetSignature();
	game.play(board.mMoves[0]);
	t.eq([board.played, board.mWho], [1, -1], "au camp -1");
	t.ok(board.GetSignature() !== sig, "la signature change");
	t.ok(!board.IsValidMove(game, { o: [{ u: [0], c: [board.u[0].h] }] }), "le camp -1 ne commande pas le camp 1");
	t.ok(Array.isArray(JSON.parse(board.ExportBoardState(game)).state.u), "ExportBoardState : JSON");
	board.Evaluate(game, false, true);
	t.ok(typeof board.mEvaluation === "number" && !isNaN(board.mEvaluation), "evaluation numerique");
})();

t.section("deploiement libre");
(function () {
	const sandbox = loadModel();
	const game = newGame(sandbox, "bataille-libre"), board = game.mBoard;
	t.eq([board.phase, board.u.length], [0, 0], "carte vide, deploiement du camp 1");
	board.GenerateMoves(game);
	t.ok(board.mMoves.length >= 3, "deploiements candidats (" + board.mMoves.length + ")");
	t.ok(board.mMoves.every((m) => board.IsValidMove(game, m)), "tous valides");
	const ctx = game.g.ctx;
	t.ok(board.mMoves.every((m) => R.placementCost(ctx, m.p) <= ctx.budget), "dans le budget");
	const statics = board.StaticGenerateMoves(game);
	t.ok(statics.length === 1 && board.IsValidMove(game, statics[0]), "StaticGenerateMoves : un deploiement");
	game.play(statics[0]);
	t.eq([board.phase, board.mWho], [1, -1], "au camp -1 de deployer");
	game.play(board.StaticGenerateMoves(game)[0]);
	t.eq([board.phase, board.mWho, board.played], [2, 1, 0], "puis la bataille");
	t.ok(board.u.some((u) => u.s === 1) && board.u.some((u) => u.s === -1), "deux armees");
	t.eq(board.StaticGenerateMoves(game), null, "plus de deploiement statique");
})();

t.section("fin de partie");
(function () {
	const sandbox = loadModel();
	const game = newGame(sandbox, "leuctres-371"), board = game.mBoard;
	// on detruit la moitie de l'armee du camp -1 « a la main »
	let lost = 0;
	const total = R.armyValue(game.g.ctx, board, -1);
	board.u.forEach((u) => {
		if(u.s === -1 && lost < total / 2) { lost += game.g.ctx.types[u.t].value; u.h = R.DEAD; u.p = 0; }
	});
	game.play({});
	t.eq([board.over, board.reason], [1, "broken"], "armee rompue apres le tour du camp 1");
	board.GenerateMoves(game);
	t.ok(board.mFinished && board.mWinner === 1 && board.mMoves.length === 0, "partie finie, gagnant 1");
	t.ok(!board.IsValidMove(game, {}), "plus de coup");
})();

t.section("IA : evaluation");
(function () {
	const ctx = R.makeContext({ scenario: scenario("leuctres-371") });
	const st = R.newState(ctx);
	const e0 = AI.evaluate(ctx, st);
	const hurt = R.copyState(st);
	const sp = hurt.u.find((u) => u.s === -1 && u.t === "spartiate");
	sp.h = R.DEAD; sp.p = 0;
	t.ok(AI.evaluate(ctx, hurt) > e0 + 20, "perdre une unite de Spartiates fait monter l'evaluation du camp 1");
	t.ok(Object.keys(AI.WEIGHTS).length >= 6, "poids nommes");
})();

t.section("IA : orientation des phalanges");
(function () {
	/*
	 * Une phalange ne recoit une orientation que pour faire face a un ennemi
	 * a 4 hexagones au plus (facingToward) ; sinon elle garde celle de sa
	 * marche. Regression : `var facing` n'etait pas remis a zero d'un ordre a
	 * l'autre dans buildTurn, et une orientation passait a l'ordre suivant.
	 */
	let checked = 0, leaked = 0;
	["leuctres-371", "platees-479", "laurion-413"].forEach((name) => {
		const ctx = R.makeContext({ scenario: scenario(name) });
		let st = R.newState(ctx);
		let seed = 77;
		const rng = (k) => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed % k; };
		for (let ply = 0; ply < 6; ply++) {
			const who = R.toMove(st);
			const enemies = st.u.filter((u) => u.s !== who && u.h >= 0);
			const moves = AI.candidates(ctx, st, who, { max: 16, rng });
			moves.forEach((m) => (m.o || []).forEach((o) => {
				if (o.f === undefined) return;
				checked++;
				const end = o.c[o.c.length - 1];
				if (!enemies.some((e) => R.distance(ctx, e.h, end) <= 4)) leaked++;
			}));
			const r = R.playTurn(ctx, st, who, moves[moves.length - 1]);
			st = r.state;
			if (R.outcome(ctx, st, who).winner) break;
		}
	});
	t.ok(checked > 0, "des phalanges orientees (" + checked + ")");
	t.eq(leaked, 0, "aucune orientation sans ennemi a portee");
})();

t.done();
