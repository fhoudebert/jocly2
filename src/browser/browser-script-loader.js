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
 * it wrapped as `(function(exports){ <source> \nreturn exports;})({})`,
 * via *indirect* eval (calling `globalEval(...)` through a variable rather
 * than literally writing `eval(...)`, which per the language spec forces
 * the call to run against the global scope instead of the caller's local
 * scope). This gives each module its own real `exports` object captured
 * in a closure for its entire lifetime — including any Promise callbacks
 * that resolve long after the initial load, exactly like a real CommonJS
 * `require()` would — while still letting the module's code see every
 * other global (jQuery's `$`, `THREE`, etc.) exactly as a plain <script>
 * tag would, since indirect eval runs in the real global scope rather
 * than a `new Function(...)`'s isolated parameter list (which an earlier
 * version of this file used, and which silently broke any module
 * referencing a global that hadn't been explicitly threaded through).
 */
(function (global) {
	"use strict";

	var baseURL = "";
	var cache = {};
	var globalEval = eval; // eslint-disable-line no-eval -- indirect eval, see comment above

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
				var wrapped = "(function(exports){\n" + source + "\n;return exports;\n})({})\n//# sourceURL=" + url;
				return globalEval(wrapped);
			});

		cache[url] = resultPromise;
		return resultPromise;
	}

	// Some third-party scripts (three.js being the case that surfaced this)
	// are UMD bundles whose own top-level wrapper checks
	// `typeof exports === "object" && typeof module !== "undefined"` to
	// decide whether to act as a CommonJS module — and if so, call their
	// factory with a *literal* `global` argument from their own bundler
	// output (e.g. `factory(void 0, ...)`), not a real reference to the
	// global object. Loading them through importScript() above satisfies
	// the `typeof exports === "object"` half of that check (since we hand
	// it an empty object) without satisfying what the script actually
	// needs to attach itself to `window`, crashing instead. These scripts
	// were never meant to be loaded as CommonJS to begin with — they're
	// plain globals, exactly like a classic <script> tag — so load them
	// that way instead, via real <script> injection.
	function loadGlobalScript(relativeUrl) {
		var url = baseURL + relativeUrl;
		if (cache[url]) return cache[url];

		var resultPromise = new Promise(function (resolve, reject) {
			var script = document.createElement("script");
			script.src = url;
			script.onload = function () {
				resolve();
			};
			script.onerror = function () {
				reject(new Error("Failed to load script: " + url));
			};
			document.head.appendChild(script);
		});

		cache[url] = resultPromise;
		return resultPromise;
	}

	global.BrowserScriptLoader = {
		setBaseURL: setBaseURL,
		getBaseURL: getBaseURL,
		import: importScript,
		loadGlobalScript: loadGlobalScript
	};
})(typeof window !== "undefined" ? window : this);
