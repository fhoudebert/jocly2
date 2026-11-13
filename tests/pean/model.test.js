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
	const games = manifest();
	t.eq(games.map((g) => g.name), ["pean-bataille-libre", "pean-leuctres", "pean-platees", "pean-laurion"], "un jeu par scenario");
	games.forEach((g) => {
		t.eq(g.modelScripts, ["pean-rules.js", "pean-ai.js", "pean-model.js"], g.name + " : scripts du modele");
		t.eq(g.config.model.module, "pean", g.name + " : module commun");
		t.eq(R.validateScenario(g.config.model.gameOptions.scenario), [], g.name + " : scenario embarque valide");
		t.eq(g.config.model.maxLevel, g.config.model.levels.length, g.name + " : maxLevel");
		t.eq(g.config.model.levels.map((l) => l.ai), ["uct", "uct", "uct", "pean"], g.name + " : trois niveaux uct, puis le Maréchal (moteur externe)");
		t.eq(g.config.model.gameOptions.preventRepeat, false, g.name + " : pas de nulle par repetition (la limite de tours clot la partie)");
	});
	const fs = require("fs"), path = require("path");
	games.forEach((g) => {
		const skins = g.config.view.skins;
		t.eq(skins.map((k) => k.name), ["tuiles", "wargame", "insignes", "carte"], g.name + " : quatre skins, « tuiles » par defaut");
		t.ok(skins[0].preload.length >= 25 && skins[0].preload.every((p) =>
			fs.existsSync(path.join(__dirname, "../../src/games/pean", p.replace(/^image\|/, "")))), g.name + " : tuiles presentes");
		t.ok(skins[2].preload.length >= 3 && skins[2].preload.every((p) =>
			fs.existsSync(path.join(__dirname, "../../src/games/pean", p.replace(/^image\|/, "")))), g.name + " : emblemes et bannieres presents");
		const sc = g.config.model.gameOptions.scenario;
		Object.keys(sc.camps).forEach((k) => t.ok(sc.camps[k].embleme && sc.camps[k].banniere, g.name + " : camp " + k + " a son embleme et sa banniere"));
		t.ok(/^thumbnail-.+\.png$/.test(g.config.model.thumbnail) &&
			fs.existsSync(path.join(__dirname, "../../src/games/pean", g.config.model.thumbnail)), g.name + " : sa vignette");
		t.ok(sc.regles && sc.regles.fr && sc.regles.en, g.name + " : conditions de victoire (regles) en francais et en anglais");
	});
	t.ok(/GPL v2/.test(fs.readFileSync(path.join(__dirname, "../../src/games/pean/credits-fr.html"), "utf8")), "credits : attribution Wesnoth");
	t.ok(["foret", "marais", "montagne", "mer", "colline", "ville", "camp"].every((n) => skinsHave(games, "terrain/" + n)), "pictogrammes de terrain prechargés");
	t.ok(/CC BY-SA 3\.0/.test(fs.readFileSync(path.join(__dirname, "../../src/games/pean/credits-fr.html"), "utf8")), "credits : attribution 0 A.D.");
	t.eq(games[1].config.model.gameOptions.scenario, scenario("leuctres-371"), "le manifeste embarque le fichier tel quel");
	t.ok(/Heraklios/.test(require("fs").readFileSync(require("path").join(__dirname, "../../src/games/pean/credits-fr.html"), "utf8")), "credits : mention d'hommage");
})();

t.section("partie a scenario fixe");
(function () {
	const sandbox = loadModel("pean-leuctres");
	const game = newGame(sandbox, "pean-leuctres"), board = game.mBoard;
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
	const sandbox = loadModel("pean-bataille-libre");
	const game = newGame(sandbox, "pean-bataille-libre"), board = game.mBoard;
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
	const sandbox = loadModel("pean-leuctres");
	const game = newGame(sandbox, "pean-leuctres"), board = game.mBoard;
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

t.done();
