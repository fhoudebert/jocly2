/*
 * The translation files of the control example against what the page and
 * control.js actually say.
 *
 *   node tests/browser/control-i18n.test.js
 *
 * lang/en.json is the list of everything there is to translate - the file a
 * new language starts from (see examples/browser/js/i18n.js). It is only
 * worth that if it is complete: every text marked data-i18n in control.html
 * and every literal passed to T() in control.js must be one of its keys.
 * Every other lang/<code>.json must be valid JSON, carry no key en.json does
 * not know (a typo there would never be found) and translate to a string.
 * A language MAY leave keys out: they show in English.
 */

const fs = require("fs");
const path = require("path");

const H = require("../fairy/harness.js");
const t = H.runner();

const PAGES = path.join(__dirname, "..", "..", "examples", "browser");
const LANG = path.join(PAGES, "lang");
const html = fs.readFileSync(path.join(PAGES, "control.html"), "utf8");
const control = fs.readFileSync(path.join(PAGES, "js", "control.js"), "utf8");

function decode(text) {
	return text.replace(/&laquo;/g, "\u00ab").replace(/&raquo;/g, "\u00bb")
		.replace(/&amp;/g, "&").replace(/&nbsp;/g, "\u00a0").trim();
}

// data-i18n="key" or data-i18n with the English text as content
const keys = new Set();
const marked = /<(\w+)[^>]*\sdata-i18n(?:="([^"]*)")?[\s>][^<]*?>?([^<]*)</g;
for(let m; (m = marked.exec(html)); )
	keys.add(m[2] ? decode(m[2]) : decode(m[3]));
for(let m, re = /data-i18n-attr="(\w+)"/g; (m = re.exec(html)); ) {
	const tag = html.slice(html.lastIndexOf("<", m.index), html.indexOf(">", m.index));
	const value = new RegExp("\\s" + m[1] + '="([^"]*)"').exec(tag);
	keys.add(decode(value[1]));
}
for(let m, re = /\bT\("((?:[^"\\]|\\.)*)"\)/g; (m = re.exec(control)); )
	keys.add(JSON.parse('"' + m[1] + '"'));
// T(player==... ? "A playing" : "B playing") and the verdicts built in a variable
for(const k of ["A playing", "B playing", "A wins", "B wins", "Draw"])
	keys.add(k);

const en = JSON.parse(fs.readFileSync(path.join(LANG, "en.json"), "utf8"));
t.check("the page and control.js mark some texts", keys.size > 25, true);
t.check("every marked text is in en.json",
	[...keys].filter((k) => !(k in en)), []);
t.check("en.json translates each key to itself",
	Object.keys(en).filter((k) => en[k] !== k), []);

for(const file of fs.readdirSync(LANG).filter((f) => /^[a-z]{2,3}\.json$/.test(f))) {
	if(file === "en.json") continue;
	let table = null;
	try { table = JSON.parse(fs.readFileSync(path.join(LANG, file), "utf8")); }
	catch(err) { t.check(file + " is valid JSON", String(err), ""); continue; }
	t.check(file + ": no key unknown to en.json",
		Object.keys(table).filter((k) => !(k in en)), []);
	t.check(file + ": every value is a non-empty string",
		Object.keys(table).filter((k) => typeof table[k] !== "string" || !table[k]), []);
}

// the redirect keeps the old address working
const fr = fs.readFileSync(path.join(PAGES, "control_fr.html"), "utf8");
t.check("control_fr.html sends to control.html in French",
	/control\.html\?/.test(fr) && /params\.set\("lang",\s*"fr"\)/.test(fr), true);

t.done("control i18n");
