/*
 * La notation des tours (PeanRules.turnNotation / parseMove) : un jeton
 * par tour, sans blanc ni caractere special du PGN, et relu exactement.
 *
 *   - regles : sur des parties entieres (tours candidats de l'IA et tours
 *     construits au hasard, deploiements compris), chaque tour s'ecrit puis
 *     se relit a l'identique ;
 *   - API (dist/node, si construit) : une partie jouee, ses coups ecrits
 *     comme Tabulon les ecrit dans un PJN (Move.ToString), puis relus un a un
 *     par pickMove dans une partie neuve, prelude compris : meme position.
 *
 *   node tests/pean/notation.test.js
 */
const fs = require("fs");
const path = require("path");
const { rules, ai, scenario, suite } = require("./harness.js");
const R = rules();
const AI = ai();
const t = suite("pean notation");

let seed = 2024;
function rng(n) {
	seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
	return seed % n;
}

// un tour construit au hasard : ordres de groupes et d'unites, orientations, combats
function randomTurn(ctx, st, who) {
	const turn = new R.Turn(ctx, st, who);
	for(let k = 0; k < 10 && turn.ordersLeft() > 0; k++) {
		const mine = turn.st.u.filter((u) => u.s === who && u.h >= 0 && !turn.ordered[u.i]);
		if(!mine.length) break;
		const u = mine[rng(mine.length)];
		let ids = [u.i];
		if(rng(3) === 0) {
			const mate = mine.find((v) => v.i !== u.i && v.t === u.t && R.distance(ctx, u.h, v.h) === 1);
			if(mate) ids.push(mate.i);
		}
		if(turn.whyNotOrder(ids)) ids = [u.i];
		if(turn.whyNotOrder(ids)) continue;
		const r = turn.reach(ids), dests = Object.keys(r);
		if(!dests.length) continue;
		let p = r[dests[rng(dests.length)]];
		// parfois un chemin pas a pas, autre que celui de reach
		if(rng(4) === 0 && p.length > 2) p = p.slice(0, 2);
		const f = ctx.options.orientation && ctx.types[u.t].phalanx && rng(3) === 0 ? rng(6) : undefined;
		turn.order(ids, p, f) || turn.order(ids, p);
	}
	for(let k = 0; k < 4; k++) {
		const tg = turn.targets();
		if(!tg.length) break;
		const pick = tg[rng(tg.length)];
		const s = turn.strength(pick.a, pick.t);
		if(s && s.result) turn.attack(pick.a, pick.t, rng(2) ? pick.a.find((id) => !ctx.types[turn.st.u[id].t].fire) : undefined);
	}
	return turn.toMove();
}

const FORBIDDEN = /[\s(){};\[\]]/;
let written = 0, compact = 0, groups = 0, fights = 0, advances = 0, facings = 0, places = 0;

t.section("ecrire puis relire, sur des parties entieres");
["bataille-libre", "leuctres-371", "platees-479", "laurion-413"].forEach((name) => {
	const ctx = R.makeContext({ scenario: scenario(name) });
	for(let game = 0; game < 3; game++) {
		let st = R.newState(ctx), bad = 0;
		for(let ply = 0; ply < 40; ply++) {
			const who = R.toMove(st);
			let move;
			if(st.phase < 2) move = AI.placements(ctx, st, who, 2, rng)[0];
			else if(game === 0) move = AI.candidates(ctx, st, who, { max: 6, rng })[rng(3)] || {};
			else move = randomTurn(ctx, st, who);
			const n = R.turnNotation(ctx, st, who, move);
			const back = n && R.parseMove(ctx, st, who, n);
			written++;
			if(!n || FORBIDDEN.test(n) || !back ||
					JSON.stringify(R.playableMove(back)) !== JSON.stringify(R.playableMove(move))) {
				if(bad++ < 3) t.ok(false, name + " : « " + n + " » " + JSON.stringify(move) + " -> " + JSON.stringify(back));
			}
			if(n) {
				if(/^@/.test(n)) places++;
				if(/(^|,)[A-Z]+\d+-[A-Z]+\d+(&|\/|,|$)/.test(n)) compact++;
				if(/&[A-Z]+\d+[^x]*?(,|$)/.test(n.split(",").filter((p) => p.indexOf("x") < 0).join(","))) groups++;
				if(/x/.test(n)) fights++;
				if(/\+/.test(n)) advances++;
				if(/\//.test(n)) facings++;
			}
			const r = R.playTurn(ctx, st, who, move);
			if(!r.ok) break;
			st = r.state;
			if(R.outcome(ctx, st, who).winner) break;
		}
		t.eq(bad, 0, name + " partie " + (game + 1) + " : tous les tours relus a l'identique");
	}
});
t.ok(compact > 20 && groups > 3 && fights > 10 && advances > 2 && facings > 2 && places >= 6,
	"couvert : " + [written + " tours", compact + " chemins courts", groups + " groupes", fights + " combats",
		advances + " avances", facings + " orientations", places + " deploiements"].join(", "));

t.section("ce qui ne designe rien");
(function () {
	const ctx = R.makeContext({ scenario: scenario("leuctres-371") });
	const st = R.newState(ctx), who = R.toMove(st);
	["", "Z99-A1", "A1-A2", "1x", "xA1", "@HA1", "O13-O10 U13-U10", "O13-O10/ZZ"].forEach((bad) =>
		t.eq(R.parseMove(ctx, st, who, bad), null, "« " + bad + " » : null"));
	t.eq(R.playableMove(R.parseMove(ctx, st, who, "pass")), {}, "« pass » : le tour vide");
	t.eq(R.turnNotation(ctx, st, who, {}), "pass", "et il s'ecrit ainsi");
	t.eq(R.parseMove(ctx, st, who, "--"), null, "« -- » est reserve au prelude");
})();

/* ---------- par l'API : ce que fait Tabulon ---------- */
const DIST = path.join(__dirname, "..", "..", "dist", "node");
if(!fs.existsSync(path.join(DIST, "games", "pean", "pean-model.js"))) {
	console.log("  (API : dist absent, `npx gulp build`)");
	t.done();
} else (async () => {
	const Jocly = require(path.join(DIST, "jocly.core.js"));
	t.section("une partie ecrite puis relue par pickMove (prelude compris)");
	for(const [name, plies] of [["bataille-libre", 6], ["platees-479", 6]]) {
		const match = await Jocly.createMatch("pean");
		const config = await match.getConfig();
		const k = config.model.gameOptions.scenarios.findIndex((sc) => sc.id === name);
		const level = Object.assign({}, config.model.levels[0], { maxDuration: 0.3, maxLoops: 10 });
		await match.applyMove({ setup: k });
		await match.applyMove({ skip: 1 });
		for(let i = 0; i < plies; i++) {
			const r = await match.machineSearch({ level, threaded: false });
			if((await match.applyMove(r.move)).finished) break;
		}
		const played = await match.getPlayedMoves();
		const tokens = await match.getMoveString(played);
		t.ok(tokens.every((tok) => tok && !FORBIDDEN.test(tok)), name + " : un jeton par coup (" + tokens.slice(0, 3).join(" ") + " ...)");
		t.eq(tokens.slice(0, 2), ["#" + k, "--"], name + " : le prelude en tete");
		const again = await Jocly.createMatch("pean");
		let ok = 0;
		for(const tok of tokens) {
			const move = await again.pickMove(tok);
			if(!move) break;
			await again.applyMove(move);
			ok++;
		}
		t.eq(ok, tokens.length, name + " : tous les coups relus");
		t.eq(again.game.mBoard.GetSignature(), match.game.mBoard.GetSignature(), name + " : meme position");
		t.eq(await again.pickMove("O13-O10 U13-U10"), null, name + " : un jeton illisible n'est pas devine");
	}
	t.done();
})().catch((e) => { console.log("  FAIL  " + (e && e.stack || e)); process.exit(1); });
