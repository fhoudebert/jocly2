/*
 * The status line of the control example: who won, and by how much.
 *
 *   node tests/browser/control-status.test.js
 *
 * WHY THIS SUITE EXISTS. Go's status bar used to write "Black wins by 3.5"
 * itself. It cannot: Jocly has no translations, so a sentence drawn by a
 * game's view is English in every client and every language. The views now
 * state the margin as a stone and a number, and the words are the client's
 * business - which moves a piece of the result OUT of the library and into
 * every client that shows one.
 *
 * So the contract has two ends and both are checked here: the client must ask
 * for the score, and it must survive a game that has none. Read statically -
 * this file is about which calls control.js makes, and jsdom is not needed to
 * see them (control-panels.test.js does need it, and skips without it).
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const CONTROL = path.join(ROOT, "examples", "browser", "js", "control.js");
const GO_MODEL = path.join(ROOT, "src", "games", "go", "go-model.js");

const t = require("../fairy/harness.js").runner();

const control = fs.readFileSync(CONTROL, "utf8");
const goModel = fs.readFileSync(GO_MODEL, "utf8");

/* ------------------------------------------------- the client asks for it */

t.check("the winner notice reads the score",
	/getBoardState\(\s*["']score["']\s*\)/.test(control), true);

// It needs the match to ask, and it used to take the winner alone: a call site
// left un-updated would throw on the last move of every game.
t.check("and is given the match to ask with",
	/function NotifyWinner\(\s*match\s*,\s*winner\s*\)/.test(control), true);
// Declaration included: it takes `match` first too, so every occurrence of
// the name is followed by it, and a call site left behind shows up as a gap.
t.check("every mention of it passes the match",
	control.match(/NotifyWinner\(/g).length,
	control.match(/NotifyWinner\(\s*match\s*,/g).length);

/* --------------------------------------------- and the game publishes it */

t.check("go answers that format", /format\s*!==?\s*["']score["']/.test(goModel), true);
for(const field of ["margin", "counted"])
	t.check("with a " + field, new RegExp("\\b" + field + ":").test(goModel), true);

/* ------------------------------------- a game without a score still works */

// Every other game answers getBoardState with its board notation, a STRING,
// and some reject outright. Neither may cost the client its verdict, so the
// margin has to be added inside a guard and a catch, not assumed.
t.check("a non-object answer is guarded",
	/typeof\s+state\s*==\s*["']object["']/.test(control), true);
t.check("and a rejection is caught", /\.catch\(/.test(control), true);

/* -------------------------------------------------- the words stay French */

// The margin is a number and joins a translated verdict; the verdict itself
// must keep coming from the page's own table, not from the library.
t.check("the verdict is still translated", /verdict\s*=\s*T\(text\)/.test(control), true);
for(const key of ["A wins", "B wins", "Draw"])
	t.check('"' + key + '" is in the table',
		control.indexOf('"' + key + '":') > 0, true);

t.done("Control status");
