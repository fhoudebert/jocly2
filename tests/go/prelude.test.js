/*
 * Go: the rule-set prelude.
 *
 *   node tests/go/prelude.test.js
 *
 * The choice of rules is asked before the first stone, and it is asked as a
 * MOVE - written "#0" or "#1" - so that it is recorded in the game record,
 * replayed when a game is loaded and undone like any other. That is the shape
 * checkers, mills and chessbase already use, and the reason the notation is
 * worth keeping identical: a host that skips over "#1 --" when replaying one
 * of them skips over it here too.
 *
 * WHAT MAKES THIS ONE DIFFERENT is how little it writes. A checkers dialog
 * restores 21 rule flags before applying a set; a Go rule set is one name,
 * written into mOptions.rules and read back by go-model.js's own goSetRules.
 * So most of what is checked below is the plumbing that carries a choice
 * safely - through a board copy, through a signature, through a Move - rather
 * than the choice itself.
 *
 * The traps are all ones the other preludes hit first, and they are checked
 * here because none of them fails loudly: a Move that drops `setup` makes
 * every button choose the first rule set, and a CopyFrom that drops the stage
 * makes a search play its opening move into the prelude's move list.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(ROOT, "src");
const GO = path.join(SRC, "games", "go");

const t = require(path.join(ROOT, "tests", "fairy", "harness.js")).runner();

const manifest = require(path.join(GO, "index.js")).games;

/*
 * Both model files, in manifest order. That order is the point: prelude-model
 * wraps go-model's InitGameExtra, board methods and Move methods, so loading
 * it first would wrap nothing.
 */
function loadModel() {
	const sandbox = {
		console, Math, JSON, Object, Array, Date,
		Int32Array, Int8Array, Uint8Array, Float64Array, setTimeout,
		Model: { Game: {}, Board: {}, Move: {} },
		exports: {}, module: {},
	};
	sandbox.global = sandbox;
	sandbox.window = sandbox;
	vm.createContext(sandbox);
	["jocly.util.js", "jocly.game.js"].forEach((f) => {
		vm.runInContext(fs.readFileSync(path.join(SRC, "core", f), "utf8"), sandbox, { filename: f });
	});
	["go-model.js", "prelude-model.js"].forEach((f) => {
		vm.runInContext(fs.readFileSync(path.join(GO, f), "utf8"), sandbox, { filename: f });
	});
	return sandbox;
}

const sandbox = loadModel();

function newGame(name) {
	const g = manifest.filter((x) => x.name === name)[0];
	const game = Object.create(sandbox.Model.Game);
	game.g = {};
	game.mOptions = JSON.parse(JSON.stringify(g.config.model.gameOptions));
	game.mPlayedMoves = [];
	function Move(args) { this.Init(args || {}); }
	Move.prototype = sandbox.Model.Move;
	game.mMoveClass = Move;
	game.CreateMove = (args) => new Move(args);
	game.InitGame();
	return game;
}

function newBoard(game) {
	const proto = Object.assign({}, sandbox.JocBoard.prototype, sandbox.Model.Board);
	const b = Object.create(proto);
	b.InitialPosition(game);
	b.mWho = 1;
	return b;
}

/* ------------------------------------------------------- the manifest */

manifest.forEach((entry) => {
	const opts = entry.config.model.gameOptions;
	t.check(entry.name + " asks the prelude", Array.isArray(opts.prelude), true);
	t.check(entry.name + " names a rule set to start from", opts.rules, "chinese-ogs");
	// prelude-model.js wraps go-model.js, so it has to be loaded after it.
	t.check(entry.name + " loads the two model files in order",
		entry.modelScripts, ["go-model.js", "prelude-model.js"]);
});

// The labels are handed to no dictionary - Jocly has none - so they are proper
// nouns, and the option each one writes is a name go-model.js knows.
{
	const dialog = manifest[0].config.model.gameOptions.prelude[0];
	t.check("two rule sets are offered", dialog.labels.length, 2);
	t.check("and each writes a name the model implements",
		dialog.rules.map((r) => r.rules), ["chinese-ogs", "tromp-taylor"]);
	// "Chinese (OGS)" and not "Chinese": KataGo's `chinese` preset uses the
	// SIMPLE ko rule, which this module does not implement. The label has to
	// say what is actually being played.
	t.check("the Chinese one says which Chinese", /OGS/.test(dialog.labels[0]), true);

	/*
	 * A flag beside each label, and BESIDE rather than INSTEAD OF.
	 *
	 * The flag is what the eye finds first, which is the point of having it.
	 * But it states nothing precisely: New Zealand is here because its rules
	 * allow self-capture, as Tromp-Taylor does - the very thing that separates
	 * the two choices - yet the two are not the same rule set (KataGo tells
	 * them apart by their ko rule) and John Tromp is Dutch. China stands for
	 * the OGS reading, not for Chinese tournament practice, which is the whole
	 * point of the "-ogs" suffix. The label carries that precision; without it
	 * two pictures are unreadable to a screen reader and to anyone who does
	 * not already know the convention.
	 */
	t.check("each choice carries a flag", dialog.flags.length, dialog.labels.length);
	t.check("and keeps its label",
		dialog.labels.filter((l) => !String(l).trim()), []);
	// Chemins relatifs au module : la vue les prefixe de fullPath, comme tout
	// ce que le module charge depuis res/.
	t.check("the flags are module-relative paths",
		dialog.flags.filter((f) => !/^res\/flags\/[A-Za-z_]+\.png$/.test(f)), []);
	// Et les fichiers existent : un chemin qui ne mene nulle part ne fait pas
	// echouer le build, il livre un bouton sans drapeau.
	dialog.flags.forEach((f) => {
		t.check("the file " + f + " is there",
			fs.existsSync(path.join(GO, f)), true);
	});
}

/* ---------------------------------------------------------- the choice */

{
	const game = newGame("go9");
	const board = newBoard(game);

	t.check("a new board starts in the prelude", board.preludeStage, 0);
	t.check("and plays the declared rules until the choice is made",
		game.g.rules, "chinese-ogs");

	board.GenerateMoves(game);
	t.check("the moves are the buttons, not the board",
		board.mMoves.map((m) => m.setup), [0, 1]);

	// The signature has to separate the two: go-model.js hashes the STONES
	// alone, and during the prelude there are none, so before and after the
	// choice both hash to zero.
	const inPrelude = board.GetSignature();

	board.ApplyMove(game, board.mMoves[1]);
	t.check("choosing the second set switches the rules",
		[game.g.rules, game.g.suicideOk], ["tromp-taylor", true]);
	t.check("the signature said which side of it we were on",
		inPrelude === board.GetSignature(), false);

	/*
	 * A SECOND STAGE, EMPTY, AND IT IS NOT DECORATION.
	 *
	 * The engine flips the side to move after EVERY move it applies, the
	 * prelude answer included. With one stage, Black answered the question and
	 * WHITE laid the first stone - which is not how Go starts, and is what a
	 * player saw: the machine replying instantly to a button press.
	 *
	 * A stage the opponent walks through without deciding anything puts the
	 * count back. checkers/index.js and minichess5x5-model.js end their
	 * prelude arrays with the same bare 0.
	 */
	t.check("a second stage follows the question", board.preludeStage, 1);
	board.GenerateMoves(game);
	t.check("with one move and nothing to choose",
		board.mMoves.map((m) => m.setup), [undefined]);
	board.ApplyMove(game, board.mMoves[0]);
	t.check("and then the prelude is over", board.preludeStage, -1);

	board.GenerateMoves(game);
	t.check("play begins: every point, plus the pass",
		board.mMoves.length, game.g.points + 1);
	t.check("and no button is left among them",
		board.mMoves.filter((m) => m.setup !== undefined).length, 0);

	// A prelude move is not a pass. Counting it as one would end a game two
	// stages in, and it must leave the position history alone.
	t.check("it counted as neither a pass nor a stone",
		[board.passes, board.moveCount, board.hist.length], [0, 0, 1]);
}

/* ------------------------------------------------- carrying the choice */

{
	const game = newGame("go9");

	// go-model.js spells CopyFrom out field by field, so a stage left out is
	// a stage lost on the first copy - and a search would then play its
	// opening move into the prelude's move list.
	const board = newBoard(game);
	const copy = newBoard(game);
	copy.preludeStage = -1;
	copy.CopyFrom(board);
	t.check("a board copy carries the stage", copy.preludeStage, 0);

	/*
	 * All four Move methods, or none. go-model.js defines Init, CopyFrom,
	 * Equals and ToString, and every one handles exactly `p` and `c`. This is
	 * where the checkers prelude first came out with every button choosing
	 * the first rule set: both moves carry p:-1, so an Equals that compared
	 * only the point made them identical.
	 */
	const one = game.CreateMove({ p: -1, setup: 1 });
	const zero = game.CreateMove({ p: -1, setup: 0 });
	t.check("Init keeps the setup", one.setup, 1);
	t.check("Equals tells two buttons apart", one.Equals(zero), false);
	t.check("and still matches itself", one.Equals(game.CreateMove({ p: -1, setup: 1 })), true);

	const copied = game.CreateMove({ p: -1 });
	copied.CopyFrom(one);
	t.check("CopyFrom carries it", copied.setup, 1);
	copied.CopyFrom(game.CreateMove({ p: 40 }));
	t.check("and drops it when copying a real move", copied.setup, undefined);

	// "#1" in the record, the notation the other preludes already write.
	t.check("a choice is written as a number", one.ToString(), "#1");
	t.check("a pass is still a pass", game.CreateMove({ p: -1 }).ToString(), "pass");
	t.check("and a stone is still a point", game.CreateMove({ p: 40 }).ToString(), "E5");
}

/* ----------------------------------------------------- the machine side */

{
	const game = newGame("go9");
	const board = newBoard(game);

	/*
	 * The machine answers the prelude rather than searching it, and the answer
	 * must be an ARRAY: JocGame.StartMachine tests `moves && moves.length > 0`
	 * to decide whether to short-circuit, so a bare object there sends the
	 * stage to a real engine instead.
	 */
	const answer = board.StaticGenerateMoves(game);
	t.check("the machine answers with a list", Array.isArray(answer), true);
	t.check("of one move", answer.length, 1);
	t.check("carrying a choice", [0, 1].indexOf(answer[0].setup) >= 0, true);
	t.check("built through CreateMove, so the field survived Init",
		answer[0] instanceof game.mMoveClass, true);

	// Once the prelude is over, Go's own StaticGenerateMoves is back: it
	// returns null so the native AI cannot pass by accident.
	board.ApplyMove(game, game.CreateMove({ p: -1, setup: 0 }));
	const walkThrough = board.StaticGenerateMoves(game);
	t.check("the empty stage answers itself too", walkThrough.length, 1);
	t.check("with nothing chosen", walkThrough[0].setup, undefined);
	board.ApplyMove(game, walkThrough[0]);
	t.check("and afterwards the game's own answer is back",
		board.StaticGenerateMoves(game), null);
}

/* ------------------------------------------------- what the engine hears */

{
	// The chosen rules travel to the engine the same way the declared ones do
	// - through goExportMoves - so a game played under Tromp-Taylor is
	// analysed under Tromp-Taylor. Without this the engine would play the
	// rules of its own config and could offer a self-capture the board refuses.
	const game = newGame("go9");
	const board = newBoard(game);
	board.GenerateMoves(game);
	board.ApplyMove(game, board.mMoves[1]);
	t.check("the export names the chosen rule set",
		board.goExportMoves(game).rules, "tromp-taylor");
}

/* --------------------------------------------------------- remembering */

{
	/*
	 * `persistent: true` becomes the chosen index once a choice is made, and
	 * a dialog whose persistent is a number is not asked again: the stage
	 * answers itself with the remembered choice. That is the checkers
	 * convention, and it means the panel appears ONCE per load of the module,
	 * not once per game.
	 */
	const game = newGame("go9");
	const dialog = game.mOptions.prelude[0];
	t.check("the dialog starts out asking", dialog.persistent, true);

	const board = newBoard(game);
	board.GenerateMoves(game);
	board.ApplyMove(game, board.mMoves[1]);
	t.check("and remembers what was chosen", dialog.persistent, 1);

	const next = newBoard(game);
	next.GenerateMoves(game);
	t.check("the next game answers itself",
		next.mMoves.map((m) => m.setup), [1]);
	// Still a move, so the record of the second game says which rules it was
	// played under just as plainly as the first.
	t.check("and still records the choice", next.mMoves[0].setup, 1);
}

/* ------------------------------------------------ who lays the first stone */

/*
 * The whole point of the empty stage, checked the way the engine does it:
 * jocly.game.js flips mWho after each ApplyMove (three places do it, all of
 * them outside the model). An ODD number of prelude plies therefore hands the
 * opening move to the wrong side, and no amount of correct rule-setting makes
 * up for it.
 */
{
	const game = newGame("go9");
	const board = newBoard(game);
	t.check("Black is to move before the prelude", board.mWho, 1);

	let plies = 0;
	while(board.preludeStage >= 0) {
		board.GenerateMoves(game);
		board.ApplyMove(game, board.mMoves[0]);
		board.mWho = -board.mWho;              // ce que fait le moteur
		plies++;
	}
	t.check("the prelude takes an even number of plies", plies % 2, 0);
	t.check("so Black still lays the first stone", board.mWho, 1);

	// Et la partie enregistree porte les deux, dans la forme que les deux
	// autres modules ecrivent : « #0 -- ». Tabulon sait deja la relire.
	board.GenerateMoves(game);
	t.check("the walk-through move is written like the others",
		game.CreateMove({ p: -2 }).ToString(), "--");
	// Surtout PAS « pass » : une passe a un sens au go, et une partie
	// rechargee la compterait comme telle.
	t.check("and a real pass is still a pass",
		game.CreateMove({ p: -1 }).ToString(), "pass");
	t.check("the two are not the same move",
		game.CreateMove({ p: -2 }).Equals(game.CreateMove({ p: -1 })), false);
}

t.done("Go prelude");
