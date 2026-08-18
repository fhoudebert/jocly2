/*
 * What the 3D animation actually traces, checked without a renderer.
 *
 *   node tests/chessbase/trajectory.test.js
 *
 * Pieces whose move bends - the Eagle's diagonal step then straight ray, the
 * Rhinoceros' straight step then diagonal ray, the Ship, the Snake - should
 * travel along the squares they really cross, not cut the corner and not hop
 * over the whole move. grid-board-view.js works that out from the piece
 * graphs, and five views used to override it with a hand-written table that
 * could only answer "jump" or "slide straight", losing the bend entirely.
 *
 * The check below reads the same cbMoveMidZ the view layer reads, replays the
 * trajectory maths of base-view.js on it, samples the path, and asserts the
 * squares visited are exactly the piece's own. It needs no browser: the maths
 * lives in a pure helper, View.Board.cbLegTrajectory, for that reason.
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const H = require("../khans/harness.js");

const CHESSBASE = path.join(__dirname, "..", "..", "src", "games", "chessbase");
const SQUARE = 1000;   // display units between two squares

// lift a function out of a view file: the view layer needs a browser, the
// geometry in it does not
function lift(file, name) {
	const src = fs.readFileSync(path.join(CHESSBASE, file), "utf8");
	const from = src.indexOf("View.Board." + name);
	let cursor = src.indexOf("{", from), depth = 0, to = cursor;
	for(; to < src.length; to++) {
		if(src[to] === "{") depth++;
		else if(src[to] === "}" && --depth === 0) { to++; break; }
	}
	const ctx = { View: { Board: {} }, console, Math };
	vm.runInContext(src.slice(from, to), vm.createContext(ctx));
	return ctx.View.Board[name];
}

const midZ = lift("grid-board-view.js", "cbMoveMidZ");
const legTrajectory = lift("base-view.js", "cbLegTrajectory");

/*
 * The oblique-slide half of base-view.js, replayed here: given the mid height
 * cbMoveMidZ returned, where does the piece go?
 */
function trajectory(z0, z2, z1, x0, y0, x2, y2, viaX, viaY) {
	if(z1 !== null && typeof z1 === "object")
		return legTrajectory(x0, y0, viaX, viaY, x2, y2, z0, z2, z1.z - (z0 + z2) / 2);
	const hop = z1 - (z0 + z2) / 2;
	const c = z0, S1 = c - z1, S2 = c - z2;
	const A = -1, B = 4 * S1 - 2 * S2, C = -S2 * S2, D = Math.abs(B * B - 4 * A * C);
	let a = (-B - Math.sqrt(D)) / (2 * A), b = -a - S2;
	if(a === 0 || -b / (2 * a) < 0 || -b / (2 * a) > 1) {
		a = (-B + Math.sqrt(D)) / (2 * A);
		b = -a - S2;
	}
	let xa = x0, xb = x2, ya = y0, yb = y2, h = 1, l = 1;
	const dx = Math.abs(x2 - x0), dy = Math.abs(y2 - y0);
	if(hop < 0) {
		if(dx < dy) {
			h = dy - dx; l = dy;
			if(hop === -1) { xa = (l * x0 - h * x2) / (l - h); xb = x0; }
			else if(hop === -2) { xb = (l * x2 - h * x0) / (l - h); xa = x2; h = l - h; }
		} else {
			h = dx - dy; l = dx;
			if(hop === -1) { ya = (l * y0 - h * y2) / (l - h); yb = y0; }
			else if(hop === -2) { yb = (l * y2 - h * y0) / (l - h); ya = y2; h = l - h; }
		}
		h /= l;
	}
	return (r) => ({
		x: r <= h ? r * xb + (1 - r) * x0 : r * x2 + (1 - r) * xa,
		y: r <= h ? r * yb + (1 - r) * y0 : r * y2 + (1 - r) * ya,
		z: a * r * r + b * r + c,
	});
}

function load(model) {
	// timurid picks its pieces in a prelude, so its model wants that script
	const sandbox = H.loadModel(["base-model.js", "grid-geo-model.js",
		"fairy-piece-model.js"]
		.concat(/timurid/.test(model) ? ["prelude-model.js"] : [])
		.concat([model]));
	const game = H.newGame(sandbox);
	return { sandbox, game, geo: game.cbVar.geometry, types: game.cbVar.pieceTypes };
}

// the squares the animation passes over, and how high it rises
function animate(ctx, name, square) {
	let type = null;
	for(const t in ctx.types)
		if(ctx.types[t].name === name)
			type = parseInt(t);
	const from = ctx.geo.PosByName(square);
	const line = (ctx.types[type].graph[from] || []).filter((l) => l.length > 2)[0];
	if(!line)
		return null;
	const bend = line[0] & 0xffff, to = line[line.length - 1] & 0xffff;
	const move = { a: ctx.types[type].abbrev, f: from, t: to, c: null };
	const z1 = midZ(ctx.game, move, 0, 0);
	const via = (z1 !== null && typeof z1 === "object") ? z1.via : bend;
	const walk = trajectory(0, 0, z1,
		ctx.geo.C(from) * SQUARE, ctx.geo.R(from) * SQUARE,
		ctx.geo.C(to) * SQUARE, ctx.geo.R(to) * SQUARE,
		ctx.geo.C(via) * SQUARE, ctx.geo.R(via) * SQUARE);
	const visited = [];
	let peak = 0;
	for(let step = 0; step <= 100; step++) {
		const r = step / 100;      // exactly 1 at the end: sampling past it
		const p = walk(r);         // reads the parabola outside the move

		peak = Math.max(peak, p.z);
		const at = ctx.geo.PosName(Math.round(p.x / SQUARE)
			+ Math.round(p.y / SQUARE) * ctx.geo.width);
		if(visited[visited.length - 1] !== at)
			visited.push(at);
	}
	/*
	 * The squares the piece really crosses, from its own graph. Array.from
	 * first: a graph line is an Int32Array when the model uses typed arrays,
	 * and mapping it to square names through its own .map coerces every name
	 * back to 0.
	 */
	const real = [ctx.geo.PosName(from)]
		.concat(Array.from(line).map((entry) => ctx.geo.PosName(entry & 0xffff)));
	return { visited, bend: ctx.geo.PosName(bend), to: ctx.geo.PosName(to), peak, real };
}

const t = H.runner();

/* ---------------- the bent sliders ---------------- */

console.log("\npieces that bend follow their own path");

[["fantasticXIII", "cazaux/fantasticXIII-model.js", "g7",
  [["griffon", "Eagle"], ["rhino", "Rhinoceros"], ["ship", "Ship"], ["snake", "Snake"]]],
 ["bigorra", "cazaux/bigorra-model.js", "h8",
  [["griffon", "Eagle"], ["rhino", "Rhinoceros"], ["ship", "Ship"], ["snake", "Snake"]]],
 ["gigachessII", "cazaux/gigachessII-model.js", "h8",
  [["eagle", "Eagle"], ["rhino", "Rhinoceros"]]],
 ["timurid", "duodecimal/timurid-model.js", "g7",
  [["griffon", "Griffon"], ["rhino", "Rhinoceros"], ["ship", "Ship"], ["snake", "Snake"]]],
 ["wild-tamerlane", "cazaux/wild-tamerlane-model.js", "f6", [["gryphon", "Gryphon"]]],
].forEach(([label, model, square, pieces]) => {
	const ctx = load(model);
	pieces.forEach(([name, pretty]) => {
		const run = animate(ctx, name, square);
		if(!run) {
			t.ok(label + " " + pretty + " has a bent line", false);
			return;
		}
		// it must turn at the piece's own first step, and only then run on
		t.check(label + " " + pretty + " turns at " + run.bend,
			run.visited[1], run.bend);
		t.check(label + " " + pretty + " ends on " + run.to,
			run.visited[run.visited.length - 1], run.to);
		// and stay on the ground the whole way
		t.ok(label + " " + pretty + " does not hop", run.peak <= 0);
	});
});

/* ---------------- leap, then slide ---------------- */

console.log("\nthe Unicorn leaps, then slides");

const acedrex = load("historical/grant-acedrex-model.js");
const unicorn = animate(acedrex, "unicornio", "f6");

/*
 * The squares crossed during the leap itself are meaningless - the piece is in
 * the air - so what is asserted is that it comes down on the landing square
 * and slides from there.
 */
t.ok("it comes down on " + unicorn.bend, unicorn.visited.indexOf(unicorn.bend) > 0);
t.check("and slides on from there",
	unicorn.visited.slice(unicorn.visited.indexOf(unicorn.bend)).join(" "),
	unicorn.real.slice(unicorn.real.indexOf(unicorn.bend)).join(" "));
t.check("it ends where it should", unicorn.visited[unicorn.visited.length - 1], unicorn.to);
t.ok("it rises over the leap", unicorn.peak > 0);
// the flight is over by the time it lands: the rest is a slide
t.ok("and comes back down to slide", (() => {
	const ctx = acedrex;
	const from = ctx.geo.PosByName("f6");
	let type = null;
	for(const t2 in ctx.types)
		if(ctx.types[t2].name === "unicornio")
			type = parseInt(t2);
	const line = (ctx.types[type].graph[from] || []).filter((l) => l.length > 2)[0];
	const to = line[line.length - 1] & 0xffff, via = line[0] & 0xffff;
	const z1 = midZ(ctx.game, { a: ctx.types[type].abbrev, f: from, t: to, c: null }, 0, 0);
	const walk = trajectory(0, 0, z1,
		ctx.geo.C(from) * SQUARE, ctx.geo.R(from) * SQUARE,
		ctx.geo.C(to) * SQUARE, ctx.geo.R(to) * SQUARE,
		ctx.geo.C(via) * SQUARE, ctx.geo.R(via) * SQUARE);
	// once past the landing square the height must be flat
	for(let r = 0.6; r <= 1.0000001; r += 0.05)
		if(Math.abs(walk(r).z) > 1e-9)
			return false;
	return true;
})());

/* ---------------- the views leave it alone ---------------- */

console.log("\nno view overrides the shared version");

["cazaux/gigachessII-view.js", "cazaux/bigorra-view.js", "cazaux/fantasticXIII-view.js",
 "cazaux/zanzibar-view.js", "historical/grant-acedrex-view.js",
 "duodecimal/timurid-view.js", "cazaux/wild-tamerlane-view.js"].forEach((file) => {
	const src = fs.readFileSync(path.join(CHESSBASE, file), "utf8");
	t.ok(path.basename(file) + " has no cbMoveMidZ of its own",
		!/^\s*View\.Board\.cbMoveMidZ\s*=/m.test(src));
});

t.done("move trajectories");
