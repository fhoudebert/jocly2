/*
 * The 8x8 draughts merge, and the prelude that drives it.
 *
 *   node tests/checkers/draughts8-prelude.test.js
 *
 * The point of the merge is that "English" and "German" are not two games but
 * two sets of values for the same nineteen rule flags, so the test that
 * matters is the last one here: for each button, every flag of the merged game
 * must come out identical to the standalone game it replaces. Everything
 * before it is the machinery that gets there.
 *
 * The checkers module has no harness of its own; loadModel() below is the
 * chessbase one from tests/fairy/harness.js with the module directory changed.
 * Its runner is reused as-is.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(ROOT, "src");
const CHECKERS = path.join(SRC, "games", "checkers");

const t = require(path.join(ROOT, "tests", "fairy", "harness.js")).runner();

const manifest = require(path.join(CHECKERS, "index.js")).games;
const entry = (name) => manifest.filter((g) => g.name === name)[0];

function loadModel(scripts) {
	const sandbox = {
		console, Math, JSON, Object, Array,
		Int32Array, Int16Array, Int8Array, Uint8Array, Float64Array,
		setTimeout,
		Model: { Game: {}, Board: {}, Move: {} },
		exports: {}, module: {},
	};
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	["jocly.util.js", "jocly.game.js"].forEach((file) => {
		vm.runInContext(fs.readFileSync(path.join(SRC, "core", file), "utf8"), sandbox, { filename: file });
	});
	scripts.forEach((script) => {
		vm.runInContext(fs.readFileSync(path.join(CHECKERS, script), "utf8"), sandbox, { filename: script });
	});
	return sandbox;
}

function newGame(name) {
	const g = entry(name);
	const sandbox = loadModel(g.modelScripts);
	const game = Object.create(sandbox.Model.Game);
	game.g = {};
	game.mOptions = JSON.parse(JSON.stringify(g.config.model.gameOptions));
	game.mOptions.levelOptions = {};
	game.mPlayedMoves = [];
	// The real loader builds these classes and hangs CreateMove off JocGame;
	// a sandbox game is a bare object, so give it just enough to make moves.
	function Move(args) { this.Init(args || {}); }
	Move.prototype = sandbox.Model.Move;
	game.mMoveClass = Move;
	game.CreateMove = function(args) { return new Move(args); };
	game.InitGame();
	return { sandbox, game };
}

function newBoard(sandbox, game) {
	const board = Object.create(sandbox.Model.Board);
	board.Init(game);
	board.InitialPosition(game);
	board.mWho = 1;
	return board;
}

/* ------------------------------------------------- the flags under test */

// Read off checkersbase-model's InitGame rather than typed out here, so a flag
// added there joins the comparison instead of quietly escaping it.
const RULE_FLAGS = (() => {
	const src = fs.readFileSync(path.join(CHECKERS, "checkersbase-model.js"), "utf8");
	const found = [];
	const re = /this\.g\.([A-Za-z0-9_]+)\s*=/g;
	let m;
	while((m = re.exec(src)) !== null)
		if(found.indexOf(m[1]) < 0)
			found.push(m[1]);
	// Graph and Coord are written into the same object by BuildGraphCoord but
	// are the board's geometry, not rules: no dialog can touch them.
	return found.filter((f) => f != "Graph" && f != "Coord");
})();

t.check("the rule flags were found in checkersbase-model", RULE_FLAGS.length > 12, true);

/* ---------------------------------------------------------- the buttons */

const d8 = newGame("draughts8");
let board = newBoard(d8.sandbox, d8.game);

t.check("the game opens in the prelude", board.preludeStage, 0);

board.GenerateMoves(d8.game);
t.check("one move per rule set", board.mMoves.map((m) => m.setup), [0, 1, 2, 3]);
t.check("the panel names all four",
	d8.game.mOptions.prelude[0].labels, ["English", "Brazilian", "Spanish", "German"]);

/*
 * A FLAG INSTEAD OF EACH NAME on the buttons.
 *
 * Jocly has no dictionary, so every word written into a manifest or a view is
 * a word nobody will ever translate. A picture reads in every language, and
 * here the picture is exact: these really are national rule sets, so the flag
 * says nothing the name did not. The words move to the rules page, which
 * already exists per language and where the same flag now stands beside the
 * section it selects.
 *
 * The names stay in the manifest as a FALLBACK - a missing flag would
 * otherwise leave a blank button, one you have to click to find out what it
 * does - and because their count is what fixes the number of buttons.
 */
{
	const dialog = d8.game.mOptions.prelude[0];
	t.check("and shows a flag for each",
		dialog.flags, ["res/flags/England.png", "res/flags/Brazil.png",
			"res/flags/Spain.png", "res/flags/Germany.png"]);
	// Read by the same index as labels and rules: a shorter list would leave
	// the last buttons blank, a longer one would point past the rule sets.
	t.check("the three lists line up",
		[dialog.flags.length, dialog.rules.length], [dialog.labels.length, dialog.labels.length]);
	// And the files are there. A path that leads nowhere does not fail the
	// build - it ships a blank button.
	dialog.flags.forEach((f) => {
		t.check("the file " + f + " is there", fs.existsSync(path.join(CHECKERS, f)), true);
	});
	// The view must actually reach for them, or the manifest is decoration.
	const view = fs.readFileSync(path.join(CHECKERS, "prelude-view.js"), "utf8");
	t.check("the view draws them", /dialog\.flags/.test(view) && /drawImage\(/.test(view), true);
	// Kept as a fallback rather than deleted: a blank button is worse than an
	// untranslated one.
	t.check("and falls back to the name when a flag is missing",
		/if\(!flag\)[\s\S]{0,700}fillText\(label/.test(view), true);
}

/*
 * Le lien entre le bouton et la regle qu'il choisit se fait dans la page de
 * regles, et nulle part ailleurs : le panneau ne montre plus que des images.
 * Une page qui aurait le texte sans le drapeau laisserait la moitie du lien a
 * deviner - dans les DEUX langues, une traduction qui l'oublierait etant une
 * traduction qui perd l'explication.
 */
["rules-draughts8.html", "rules-draughts8_fr.html"].forEach((page) => {
	const text = fs.readFileSync(path.join(CHECKERS, page), "utf8");
	["England", "Brazil", "Spain", "Germany"].forEach((flag) => {
		t.check(page + " carries the " + flag + " flag",
			text.indexOf("res/flags/" + flag + ".png") > 0, true);
	});
	// Par {GAME}, que l'hote remplace : les images vivent dans le module, pas
	// dans la page.
	t.check(page + " asks the host for them",
		/\{GAME\}\/res\/flags\//.test(text), true);
});

// checkersbase's Move.Init builds pos and capt and copies nothing else, so a
// setup handed to CreateMove used to come back without one - and every button
// then chose the first rule set.
const made = d8.game.CreateMove({ pos: [], capt: [], setup: 2 });
t.check("CreateMove keeps the setup", made.setup, 2);
t.check("a setup move prints as #n", made.ToString(), "#2");
t.check("two setups are not the same move",
	made.Equals(d8.game.CreateMove({ pos: [], capt: [], setup: 3 })), false);
t.check("the same setup is", made.Equals(d8.game.CreateMove({ pos: [], capt: [], setup: 2 })), true);
t.check("and a setup is not the turn pass",
	made.Equals(d8.game.CreateMove({ pos: [], capt: [] })), false);

// The search copies a board at every node; a stage lost there would drop the
// game into normal move generation before the rules are chosen.
const copy = Object.create(d8.sandbox.Model.Board);
copy.Init(d8.game);
copy.CopyFrom(board);
t.check("CopyFrom carries the stage", copy.preludeStage, 0);

// The machine answers the prelude instead of searching it, and must hand back
// an ARRAY - see the note in the model.
const staticMoves = board.StaticGenerateMoves(d8.game);
t.check("the machine gets an array of one move",
	Array.isArray(staticMoves) && staticMoves.length === 1, true);
t.check("and it is a setup", staticMoves[0].setup >= 0 && staticMoves[0].setup <= 3, true);

/* -------------------------------------------------- playing the prelude */

function choose(game, sandbox, setup) {
	const b = newBoard(sandbox, game);
	b.GenerateMoves(game);
	const move = b.mMoves.filter((m) => m.setup === setup)[0];
	b.ApplyMove(game, move);
	b.mWho = -b.mWho;
	// second, empty stage: Black passes, so White still moves first
	b.GenerateMoves(game);
	b.ApplyMove(game, b.mMoves[0]);
	b.mWho = -b.mWho;
	return b;
}

board = choose(d8.game, d8.sandbox, 1);
t.check("after both stages the prelude is over", board.preludeStage, -1);
board.GenerateMoves(d8.game);
t.check("and the opening moves are real moves",
	board.mMoves.length > 0 && board.mMoves.every((m) => m.setup === undefined), true);

/* ------------------------------------------------------ the merge itself */

/*
 * What the four standalone games produced, captured from their manifests on
 * the commit that removed them (checkers/index.js, entries english-draughts,
 * brazilian-draughts, spanish-draughts and german-draughts) by running their
 * InitGame and reading aGame.g.
 *
 * Comparing against the live games would say more, and did until they were
 * deleted; a merge is only proven by reproducing what it replaces. Frozen,
 * this still holds the prelude to the four rule sets it claims to offer - it
 * just no longer notices if the base defaults move underneath them, which is
 * what the RULE_FLAGS check below is for.
 */
const LEGACY_FLAGS = {
	"english-draughts": {
		compulsoryCatch: true,
		canStepBack: true,
		mustMoveForward: false,
		mustMoveForwardStrict: true,
		lastRowFreeze: false,
		lastRowCrown: true,
		captureLongestLine: true,
		noMove: "lose",
		kingCaptureShort: true,
		kingValue: 2,
		lastRowFactor: 0.001,
		canCaptureBackward: false,
		captureInstantRemove: false,
		longRangeKing: false,
		drawKvsK: true,
		drawKvs2K: true,
		whiteStarts: false,
		king180deg: false,
		suicide: false,
		invertNotation: true,
	},
	"brazilian-draughts": {
		compulsoryCatch: true,
		canStepBack: true,
		mustMoveForward: false,
		mustMoveForwardStrict: true,
		lastRowFreeze: false,
		lastRowCrown: true,
		captureLongestLine: true,
		noMove: "lose",
		kingCaptureShort: false,
		kingValue: 5,
		lastRowFactor: 0.001,
		canCaptureBackward: true,
		captureInstantRemove: false,
		longRangeKing: true,
		drawKvsK: true,
		drawKvs2K: true,
		whiteStarts: true,
		king180deg: false,
		suicide: false,
		invertNotation: false,
	},
	"spanish-draughts": {
		compulsoryCatch: true,
		canStepBack: true,
		mustMoveForward: false,
		mustMoveForwardStrict: true,
		lastRowFreeze: false,
		lastRowCrown: true,
		captureLongestLine: true,
		noMove: "lose",
		kingCaptureShort: false,
		kingValue: 5,
		lastRowFactor: 0.001,
		canCaptureBackward: false,
		captureInstantRemove: false,
		longRangeKing: true,
		drawKvsK: true,
		drawKvs2K: true,
		whiteStarts: true,
		king180deg: false,
		suicide: false,
		invertNotation: false,
	},
	"german-draughts": {
		compulsoryCatch: true,
		canStepBack: true,
		mustMoveForward: false,
		mustMoveForwardStrict: true,
		lastRowFreeze: false,
		lastRowCrown: true,
		captureLongestLine: false,
		noMove: "lose",
		kingCaptureShort: false,
		kingValue: 4,
		lastRowFactor: 0.001,
		canCaptureBackward: true,
		captureInstantRemove: false,
		longRangeKing: true,
		drawKvsK: true,
		drawKvs2K: true,
		whiteStarts: true,
		king180deg: false,
		suicide: false,
		invertNotation: false,
	},
};

t.check("the frozen table covers every rule flag the base sets",
	RULE_FLAGS.filter((f) => LEGACY_FLAGS["english-draughts"][f] === undefined), []);

const LEGACY = ["english-draughts", "brazilian-draughts", "spanish-draughts", "german-draughts"];

LEGACY.forEach((name, setup) => {
	const merged = newGame("draughts8");
	choose(merged.game, merged.sandbox, setup);
	const want = LEGACY_FLAGS[name];
	const got = {};
	Object.keys(want).forEach((f) => {
		got[f] = f == "invertNotation" ? !!merged.game.g[f] : merged.game.g[f];
	});
	t.check("button " + setup + " reproduces " + name, got, want);
});

// The isolation this rests on: a set names every flag it needs, and the
// defaults are restored before it is applied. Without that, German chosen
// after English would inherit English's canCaptureBackward - a game that is
// neither, and one no single-variant test would ever catch.
{
	const g = newGame("draughts8");
	choose(g.game, g.sandbox, 0);            // English: canCaptureBackward false
	t.check("English forbids backward capture", g.game.g.canCaptureBackward, false);
	g.game.mOptions.prelude[0].persistent = true;   // ask again rather than repeat
	choose(g.game, g.sandbox, 3);            // German, in the same game object
	t.check("German after English does not inherit it", g.game.g.canCaptureBackward, true);
	t.check("nor English's king value", g.game.g.kingValue, 4);
	t.check("nor its notation", !!g.game.g.invertNotation, false);
}

// The choice is remembered for the next game, as it is in chessbase.
{
	const g = newGame("draughts8");
	choose(g.game, g.sandbox, 2);
	t.check("the last choice is remembered", g.game.mOptions.prelude[0].persistent, 2);
	const b = newBoard(g.sandbox, g.game);
	b.GenerateMoves(g.game);
	t.check("so the next game does not ask again",
		b.mMoves.map((m) => m.setup), [2]);
}

/* ------------------------------------------------------------- manifest */

const d8entry = entry("draughts8");
t.check("the game ships the prelude model",
	d8entry.config.model.js.indexOf("prelude-model.js") >= 0, true);
t.check("and the view that draws the buttons",
	d8entry.config.view.js.indexOf("prelude-view.js") >= 0, true);
t.check("prelude-model.js comes after checkersbase-model.js",
	d8entry.config.model.js.indexOf("prelude-model.js")
		> d8entry.config.model.js.indexOf("checkersbase-model.js"), true);

// The gulpfile writes a manifest with JSON.stringify, so a dialog carrying a
// function would arrive at the browser as nothing at all.
t.check("the dialog survives JSON",
	JSON.parse(JSON.stringify(d8entry.config.model.gameOptions.prelude))[0].rules.length, 4);

["rules-draughts8.html", "rules-draughts8_fr.html"].forEach((file) => {
	t.check(file + " exists", fs.existsSync(path.join(CHECKERS, file)), true);
});


/* ------------------------------------------------------ the view's moves */

/*
 * The prelude produces two kinds of move that move nothing: the choice
 * itself, and the turn pass of a stage that asks nothing. Neither can go
 * through checkers-xd-view's xdPlayedMove, which opens on
 * board.board[aMove.pos[0]] and ends on aGame.g.Coord[aMove.pos[...]][0] -
 * with an empty pos that is a crash, not a no-op, and it happens after the
 * board is drawn, so it looks like a game that plays a move by itself and
 * then stops.
 *
 * The first version guarded on the move carrying a setup, which let the pass
 * straight through. So both are checked here, and the guard is on the shape
 * of the move rather than on the field.
 */
{
	const sandbox = { console, Math, JSON, Object, Array, setTimeout,
		View: { Game: {}, Board: {}, Move: {} } };
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);

	let animated = 0;
	sandbox.View.Game.xdInit = function() { };
	sandbox.View.Board.xdInput = function() { return "board input"; };
	sandbox.View.Board.xdPlayedMove = function(xdv, game, move) {
		animated++;
		// what the real one does first, and what an empty pos breaks on
		return game.g.Coord[move.pos[0]][0];
	};
	vm.runInContext(fs.readFileSync(path.join(CHECKERS, "prelude-view.js"), "utf8"),
		sandbox, { filename: "prelude-view.js" });

	let shown = 0;
	const viewGame = { g: { Coord: {} }, MoveShown: function() { shown++; } };
	const view = sandbox.View.Board;

	// caught rather than allowed to propagate: an unguarded move throws the
	// way it did in the browser, and a thrown suite says less than a named
	// failing check
	const play = (move) => {
		try {
			view.xdPlayedMove.call({}, null, viewGame, move);
			return null;
		} catch(e) {
			return e.message;
		}
	};

	t.check("the choice is not animated",
		[play({ pos: [], capt: [], setup: 2 }), animated, shown], [null, 0, 1]);
	t.check("nor is the turn pass, which carries no setup",
		[play({ pos: [], capt: [] }), animated, shown], [null, 0, 2]);

	// ...and a real move still is
	viewGame.g.Coord = { 12: [1, 2] };
	t.check("a board move still reaches the animation",
		[play({ pos: [12, 20], capt: [null, null] }), animated, shown], [null, 1, 2]);

	// The input is the board's own once the prelude is over.
	t.check("a finished prelude hands input back",
		view.xdInput.call({ preludeStage: -1 }, null, { mOptions: {} }), "board input");
}

t.done("draughts 8x8 prelude");
