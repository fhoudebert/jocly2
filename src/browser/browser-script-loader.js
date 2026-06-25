/*
 * SystemJS 6.x dropped CommonJS module support entirely (the format used
 * throughout Jocly's *.core.js/*.game.js/*-view.js/*-model.js/*-config.js
 * files, e.g. `exports.foo = ...`), which only the legacy 0.x line provided
 * automatically. This module is a minimal drop-in replacement for the two
 * SystemJS APIs actually used here (`import` and `config`/`baseURL`).
 *
 * Earlier version of this file used plain <script> tag injection with a
 * shared global `exports` variable (mirroring how Workers reuse one
 * `exports` via importScripts()). That broke as soon as a module's
 * asynchronous callbacks (Promises resolved after the script finished
 * loading) tried to read `exports` again — by then the loader had already
 * restored the global to whatever it was before, since <script> execution
 * is not something we can observe finishing synchronously, and the next
 * load may have already reassigned it in the meantime.
 *
 * This version instead fetches each module's source as text and executes
 * it via `new Function("exports", source)`, giving every module its own
 * real `exports` object captured in a closure for its entire lifetime —
 * including any Promise callbacks that resolve long after the initial
 * load — exactly like a real CommonJS `require()` would.
 */
(function (global) {
	"use strict";

	var baseURL = "";
	var cache = {};

	function setBaseURL(url) {
		baseURL = url;
	}

	function getBaseURL() {
		return baseURL;
	}

	function importScript(relativeUrl) {
		var url = baseURL + relativeUrl;
		if (cache[url]) return cache[url];

		var resultPromise = fetch(url)
			.then(function (response) {
				if (!response.ok) {
					throw new Error("Failed to load script: " + url + " (" + response.status + ")");
				}
				return response.text();
			})
			.then(function (source) {
				var moduleExports = {};
				// Wrap and execute with `exports` as a real function
				// parameter (closure), not a global — this is what lets a
				// module's own asynchronous code (e.g. Promise.then
				// callbacks set up during load but firing later) keep
				// referring to the *same* exports object indefinitely,
				// regardless of what else gets loaded afterwards.
				// eslint-disable-next-line no-new-func
				var moduleFn = new Function("exports", "window", "document", "self", "global", source + "\n//# sourceURL=" + url);
				moduleFn(moduleExports, window, document, typeof self !== "undefined" ? self : window, global);
				return moduleExports;
			});

		cache[url] = resultPromise;
		return resultPromise;
	}

	global.BrowserScriptLoader = {
		setBaseURL: setBaseURL,
		getBaseURL: getBaseURL,
		import: importScript
	};
})(typeof window !== "undefined" ? window : this);
