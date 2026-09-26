/*
 * Translations of the example pages (control.html for now).
 *
 * ADDING A LANGUAGE is adding one file: copy lang/en.json to lang/<code>.json
 * (the two-letter code - "de", "es", "it"...) and translate the VALUES. The
 * keys are the English strings as written in the page and in control.js, the
 * way mogichex/lang/fr.json does it, so en.json is also the list of
 * everything there is to translate. Nothing else has to change: the page
 * picks the language up by itself.
 *
 * Which language: ?lang=xx in the URL, then window.JOCLY_LANG if a page sets
 * it, then the browser's own preference, then English. A language with no
 * file falls back to English, and so does any string a file does not have:
 * showing English is better than showing nothing.
 *
 * What the game MANIFESTS carry - titles, summaries, rules - is not in these
 * files: the manifests give it per language themselves ({ en: "...",
 * fr: "..." }) and Localized() below reads it with the same language.
 *
 * In the page, a translatable text is marked data-i18n and keeps its English
 * wording as its content, so the HTML stays readable as it is:
 *
 *     <button id="save" data-i18n>Save</button>
 *     <meta name="description" content="Jocly Game Control" data-i18n-attr="content">
 */
(function (global) {
	"use strict";

	// resolved now, while this script is the one running: lang/ sits beside js/
	var here = document.currentScript && document.currentScript.src || global.location.href;
	var LANG_DIR = new URL("../lang/", here).href;

	var table = {};
	var lang = "en";

	function Wanted() {
		var asked = new URLSearchParams(global.location.search).get("lang") ||
			global.JOCLY_LANG ||
			(global.navigator && (global.navigator.languages && global.navigator.languages[0] ||
				global.navigator.language)) ||
			"en";
		return String(asked).toLowerCase().split("-")[0];
	}

	/*
	 * Loads the table of the wanted language. Always resolves: a missing or
	 * broken file only means English.
	 */
	function Load() {
		var wanted = Wanted();
		if(wanted === "en" || !/^[a-z]{2,3}$/.test(wanted))
			return Promise.resolve(Done("en", {}));
		return fetch(LANG_DIR + wanted + ".json")
			.then(function (response) {
				if(!response.ok)
					throw new Error("HTTP " + response.status);
				return response.json();
			})
			.then(function (loaded) {
				return Done(wanted, loaded);
			}, function (err) {
				console.info("no translation for \"" + wanted + "\" (" + err.message + "), using English");
				return Done("en", {});
			});
	}

	function Done(code, loaded) {
		lang = code;
		table = loaded || {};
		document.documentElement.setAttribute("lang", lang);
		return lang;
	}

	/*
	 * One string. A level label may carry a timing - "Fast [1sec]" - which is
	 * not a word and must not be translated away, so the bracketed part is set
	 * aside and put back.
	 */
	function T(text) {
		if(text == null)
			return text;
		if(Object.prototype.hasOwnProperty.call(table, text))
			return table[text];
		var timed = /^(.*?)(\s*\[[^\]]*\])$/.exec(text);
		if(timed && Object.prototype.hasOwnProperty.call(table, timed[1]))
			return table[timed[1]] + timed[2];
		return text;
	}

	/*
	 * A translatable manifest field: a plain string, or { en: "...", fr: "..." }.
	 * Falls back to English, then to whatever translation exists.
	 */
	function Localized(field) {
		if(field == null)
			return "";
		if(typeof field == "string")
			return field;
		if(field[lang])
			return field[lang];
		if(field.en)
			return field.en;
		var first = Object.keys(field)[0];
		return first ? field[first] : "";
	}

	/*
	 * Translates the marked elements of the page (or of `root`). The English
	 * text is kept in data-i18n the first time, so that running it again -
	 * after a change of language - starts from the key, not from a
	 * translation.
	 */
	function Apply(root) {
		root = root || document;
		root.querySelectorAll("[data-i18n]").forEach(function (el) {
			var key = el.getAttribute("data-i18n");
			if(!key) {
				key = el.textContent.trim();
				el.setAttribute("data-i18n", key);
			}
			el.textContent = T(key);
		});
		root.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
			el.getAttribute("data-i18n-attr").split(/\s+/).forEach(function (attr) {
				var store = "data-i18n-" + attr;
				var key = el.getAttribute(store);
				if(key == null) {
					key = el.getAttribute(attr);
					el.setAttribute(store, key);
				}
				el.setAttribute(attr, T(key));
			});
		});
	}

	global.JoclyI18n = {
		load: Load,
		apply: Apply,
		T: T,
		localized: Localized,
		lang: function () { return lang; },
	};
})(window);
