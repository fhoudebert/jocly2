/*
 * setViewOptions() and the input that used to die with the view.
 *
 *   node tests/core/set-view-options.test.js
 *
 * Changing a view option tears the view down and builds it again.
 * The input state machine does not survive that - its click handlers live on
 * the gadgets, and a skin change additionally runs xdv.unbuildGadgets(), which
 * destroys every gadget's representation. Only View.Board.HumanTurn binds
 * them, and setViewOptions() did not call it.
 *
 * A user whose turn it was therefore lost the board on any option change,
 * until something restarted the turn. The sample app happens to call
 * RunMatch() after every setViewOptions(), which aborts the pending turn and
 * begins a fresh one, so the bug never showed there. Elsewhere it showed as a
 * board that ignored clicks - and confusingly, toggling a second option put it
 * right, because that toggle went through the same compensating path.
 *
 * jocly.core.js does not export GameProxy and its methods refuse to run under
 * node, so the function is lifted out of the source and called with a game
 * that records what is asked of it. That tests the shipped code, ordering
 * included, rather than asserting that some line exists in the file.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const CORE = path.join(ROOT, "src", "core", "jocly.core.js");

const t = require(path.join(ROOT, "tests", "fairy", "harness.js")).runner();

// ---- lift GameProxy.prototype.setViewOptions out of the source ----

function extract(name) {
	const src = fs.readFileSync(CORE, "utf8");
	const head = "GameProxy.prototype." + name + " = function (options) {";
	const start = src.indexOf(head);
	if(start < 0) throw new Error("not found: " + name);
	let i = src.indexOf("{", start), depth = 0;
	for(; ; i++) {
		if(src[i] == "{") depth++;
		else if(src[i] == "}") { depth--; if(depth == 0) break; }
	}
	return src.slice(start + head.length - 1, i + 1);
}

// the free names the body closes over
const build = (jsContext, ProxiedMethod) =>
	new Function("jsContext", "ProxiedMethod",
		"return function (options) " + extract("setViewOptions") + ";")(jsContext, ProxiedMethod);

const setViewOptions = build("browser", function() {
	throw new Error("should not have been proxied");
});

function proxy(pendingTurn, viewOptions) {
	const calls = [];
	const record = (name) => function() { calls.push(name); };
	return {
		calls,
		area: {},
		userTurnReject: pendingTurn ? function() { } : undefined,
		game: {
			calls,
			mViewOptions: viewOptions || { switchable: true },
			HumanTurn: record("HumanTurn"),
			HumanTurnEnd: record("HumanTurnEnd"),
			GameDestroyView: record("GameDestroyView"),
			GameInitView: record("GameInitView"),
			DisplayBoard: record("DisplayBoard"),
		},
	};
}

/* ------------------------------------------------------------ the fix */

const p = proxy(true);
setViewOptions.call(p, { skin: "skin3d" }).then(() => {
	t.check("a pending turn is ended before the view goes and started after it comes back",
		p.calls,
		["HumanTurnEnd", "GameDestroyView", "GameInitView", "DisplayBoard", "HumanTurn"]);

	const q = proxy(false);
	return setViewOptions.call(q, { skin: "skin3d" }).then(() => {
		t.check("with no turn pending, nothing is armed",
			q.calls, ["GameDestroyView", "GameInitView", "DisplayBoard"]);

		/* ------------------------------------------- unchanged behaviour */

		const r = proxy(true);
		return setViewOptions.call(r, {
			skin: "skin2d", notation: true, sounds: false,
			showMoves: true, autoComplete: true, anaglyph: false,
		}).then(() => {
			t.check("the options still reach the game",
				[r.game.mSkin, r.game.mNotation, r.game.mSounds,
					r.game.mShowMoves, r.game.mAutoComplete, r.game.mAnaglyph],
				["skin2d", true, false, true, true, false]);

			const s = proxy(false);
			return setViewOptions.call(s, {}).then(() => {
				t.check("an option not given is left alone", s.game.mSkin, undefined);

				const u = proxy(false, { switchable: true });
				return setViewOptions.call(u, { viewAs: -1 }).then(() => {
					t.check("viewAs is honoured on a switchable view", u.game.mViewAs, -1);

					const v = proxy(false, { switchable: false });
					return setViewOptions.call(v, { viewAs: -1 }).then(() => {
						t.check("and ignored otherwise", v.game.mViewAs, undefined);

						/* ------------------------------------ the guards */

						const detached = { game: {} };
						return setViewOptions.call(detached, {}).then(
							() => t.check("a detached match is refused", "resolved", "rejected"),
							(e) => t.check("a detached match is refused",
								/not attached/.test(e.message), true));
					});
				});
			});
		});
	});
}).then(() => {
	// A match running in an iframe has no game of its own: the call is
	// forwarded, and the whole body above must not run locally.
	const forwarded = build("browser", function(self, name) {
		return Promise.resolve("proxied:" + name);
	});
	return forwarded.call({ area: {} }, {}).then((r) => {
		t.check("a match without a local game forwards the call", r, "proxied:setViewOptions");
	});
}).then(() => {
	// node has no view to rebuild
	const inNode = build("node", function() { throw new Error("should not have been proxied"); });
	return inNode.call(proxy(true), {}).then(
		() => t.check("node is refused", "resolved", "rejected"),
		(e) => t.check("node is refused", /not supported in node/.test(e.message), true));
}).then(() => {
	t.done("setViewOptions");
}, (e) => {
	console.log("  FAIL unexpected: " + e.message);
	process.exit(1);
});
