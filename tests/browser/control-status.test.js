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

/* ------------------------------------------------ the thinking clock */

/*
 * The engines run in the browser on this page - wasm Fairy-Stockfish, wasm
 * KataGo and their nets - so a turn takes seconds where a host with a native
 * binary answers in milliseconds. A still status line does not distinguish
 * "thinking" from "dead", and the progress bar only moves for engines that
 * report progress, which the wasm ones largely do not.
 *
 * The formatter is taken FROM the shipped file rather than copied here: a copy
 * would only ever agree with itself.
 */
function lift(name) {
	const at = control.indexOf("function " + name);
	if(at < 0) throw new Error("not found: " + name);
	let depth = 0, i = control.indexOf("{", at);
	for(let j = i; j < control.length; j++) {
		if(control[j] === "{") depth++;
		else if(control[j] === "}" && --depth === 0)
			return (0, eval)("(" + control.slice(at, j + 1) + ")");
	}
	throw new Error("unbalanced: " + name);
}

{
	const FormatElapsed = lift("FormatElapsed");
	// The tenth is the point: it is what separates a search that is running
	// from one that has finished without handing back.
	t.check("a fresh clock shows a tenth", FormatElapsed(0), "0.0 s");
	t.check("seconds under the minute", FormatElapsed(3400), "3.4 s");
	t.check("and right up to it", FormatElapsed(59900), "59.9 s");
	// Past a minute the tenth is noise and the figure gets long; minutes read
	// faster, and the zero must be kept or 1:05 and 1:50 look alike.
	t.check("minutes above it", FormatElapsed(60000), "1:00");
	t.check("with the seconds padded", FormatElapsed(65000), "1:05");
	t.check("and no cap on the minutes", FormatElapsed(605000), "10:05");
}

// Started on the machine branch only - a human turn has nothing to time - and
// stopped in the link that also hides the progress bar, which runs AFTER the
// .catch: an aborted turn must not leave a timer counting for a search that
// ended.
t.check("the clock starts with the machine turn",
	/progressBar\.style\.width = 0;[\s\S]{0,120}stopClock = StartThinkingClock/.test(control), true);
t.check("and is stopped where the progress bar is hidden",
	/stopClock\(\);[\s\S]{0,160}progressBar\.style\.display = "none"/.test(control), true);
t.check("the interval is cleared, not just forgotten",
	/clearInterval\(timer\)/.test(control), true);

// The unit is not translated - "s" is the same word in both languages - so it
// must not have crept into the table, where it would be a string nobody uses.
t.check("no unit in the dictionary", /"\s*s\s*":/.test(control), false);

t.done("Control status");
