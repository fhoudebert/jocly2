/*
 * The two side panels of the control example, clicked in a real DOM.
 *
 *   node tests/browser/control-panels.test.js
 *
 * control.html and control_fr.html hold the game list and the rules in the
 * same slot beside the board: opening one hides the controls, closing it puts
 * them back. Only one of the three may be on screen at a time, and a click on
 * one link must not act as a click on the other - which is what happened when
 * the game-list handler was bound to the #links CONTAINER: the rules link
 * lives in that container too, so its click bubbled up and opened both panels.
 *
 * jsdom and jQuery are devDependencies; the suite skips this file when they
 * are not installed rather than failing.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const PAGES = path.join(ROOT, "examples", "browser");

let JSDOM, jquerySource;
try {
	JSDOM = require("jsdom").JSDOM;
	jquerySource = fs.readFileSync(
		path.join(ROOT, "node_modules", "jquery", "dist", "jquery.js"), "utf8");
} catch(err) {
	console.log("SKIP control-panels: jsdom and jquery are not installed");
	process.exit(0);
}

const H = require("../fairy/harness.js");
const t = H.runner();

/*
 * The handlers, taken from the shipped control.js rather than copied: what is
 * under test is the selector each one is bound to, and a copy would only ever
 * agree with itself. The three blocks are found by the lines that show and
 * hide the panels.
 */
const control = fs.readFileSync(path.join(PAGES, "js", "control.js"), "utf8");

function handlerBlock(marker) {
	// Where the marker names the element a handler is BOUND to, the binding is
	// the occurrence of it followed by .on("click") in the same statement -
	// the selector may appear elsewhere first, as $("#close-games span") does
	// when it is shown. Where the marker is something a handler DOES, there is
	// no such occurrence and the binding is the .on("click") above it.
	let bind = -1;
	for(let at = control.indexOf(marker); at >= 0; at = control.indexOf(marker, at + 1)) {
		const next = control.indexOf('.on("click"', at);
		if(next >= 0 && control.slice(at, next).indexOf(";") < 0) { bind = next; break; }
		if(bind < 0) bind = control.lastIndexOf('.on("click"', at);
	}
	if(bind < 0) throw new Error("no click handler for: " + marker);
	const start = control.lastIndexOf("\n", bind) + 1;
	// balanced from the .on( parenthesis, not from the first one on the line:
	// the selector's own brackets close immediately and would end it there
	let depth = 0, i = control.indexOf("(", bind);
	for(; i < control.length; i++) {
		if(control[i] === "(") depth++;
		else if(control[i] === ")") { depth--; if(depth === 0) break; }
	}
	return control.slice(start, i + 1) + ";";
}

/*
 * The three panel handlers whose binding selector is not what is being
 * questioned are found by that selector. The game-list one is found by what it
 * DOES instead - $("#games").show() - precisely because the selector it is
 * bound to is the thing under test: it used to be the #links container, which
 * holds the rules link too.
 */
function handlerOn(selector) {
	// the close handlers are bound on a child ("#close-games span"), so the
	// selector is matched as a prefix
	return handlerBlock('$("' + selector);
}

const OPEN_GAMES = handlerBlock('$("#games").show()');
const OPEN_RULES = handlerOn("#game-rules");
const CLOSE_GAMES = handlerOn("#close-games");
const CLOSE_RULES = handlerOn("#close-rules");

function page(file) {
	const html = fs.readFileSync(path.join(PAGES, file), "utf8");
	const dom = new JSDOM(html, { runScripts: "outside-only" });
	dom.window.eval(jquerySource);
	// LoadRules() fetches the rules file; the panels are what is being tested
	dom.window.eval("function LoadRules() { return Promise.resolve(true); }");
	dom.window.eval("var config = { model: { rules: { en: 'x', fr: 'x' } } };");
	dom.window.eval([OPEN_RULES, CLOSE_RULES, OPEN_GAMES, CLOSE_GAMES].join("\n"));
	const $ = dom.window.jQuery;
	return {
		click: (id) => $(id).trigger("click"),
		// jsdom does no layout, so :visible is no use: what is asked is what
		// jQuery's show()/hide() actually wrote on the element
		shown: () => ["#controls", "#games", "#rules"]
			.filter((id) => $(id)[0] && $(id)[0].style.display !== "none"),
	};
}

for(const file of ["control.html", "control_fr.html"]) {
	console.log("\n" + file);

	(() => {
		const p = page(file);
		p.click("#game-rules");
		// the bug: #links carried the game-list handler, so this click opened
		// the list as well and the reader got both at once
		t.check("the rules link opens the rules and nothing else",
			p.shown(), ["#rules"]);
	})();

	(() => {
		const p = page(file);
		p.click("#other-games");
		t.check("the games link opens the list and nothing else",
			p.shown(), ["#games"]);
	})();

	(() => {
		const p = page(file);
		p.click("#game-rules");
		p.click("#close-rules span");
		t.check("closing the rules brings the controls back", p.shown(), ["#controls"]);
	})();

	(() => {
		const p = page(file);
		p.click("#other-games");
		p.click("#close-games span");
		t.check("and so does closing the list", p.shown(), ["#controls"]);
	})();

	(() => {
		// one after the other, without going through the controls
		const p = page(file);
		p.click("#game-rules");
		p.click("#close-rules span");
		p.click("#other-games");
		t.check("one panel then the other leaves only the second", p.shown(), ["#games"]);
	})();
}

t.done("control panels");
