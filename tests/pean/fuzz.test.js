/*
 * Parties completes sur le moteur, menees jusqu'au bout, pour chaque
 * scenario :
 *   - IA contre IA : chaque camp joue le meilleur de ses tours candidats a
 *     un coup de profondeur (evaluation statique) ;
 *   - hasard contre hasard : un tour candidat tire au sort, ou un tour
 *     construit au hasard par le Turn (ordres et combats quelconques).
 * Chaque tour passe la validation (playTurn), aucune exception n'est
 * toleree, et les invariants de l'etat sont verifies apres chaque tour.
 *
 * La duree des parties IA contre IA et le vainqueur sont affiches a titre
 * indicatif (equilibre des scenarios).
 *
 *   node tests/pean/fuzz.test.js [parties IA par scenario] [parties hasard par scenario]
 */
const { rules, ai, scenario, suite } = require("./harness.js");
const R = rules();
const AI = ai();
const t = suite("pean fuzz");

const AI_GAMES = parseInt(process.argv[2], 10) || 2;
const RANDOM_GAMES = parseInt(process.argv[3], 10) || 6;
const SCENARIOS = ["bataille-libre", "leuctres-371", "platees-479"];

let seed = 12345;
function rng(n) {
	seed = (seed * 1103515245 + 12345) & 0x7fffffff;
	return seed % n;
}

function invariants(ctx, st) {
	const seen = {};
	for(const u of st.u) {
		const t = ctx.types[u.t];
		if(!t) return "type " + u.t;
		if(u.h === R.DEAD) { if(u.p !== 0) return "mort avec des pas"; continue; }
		if(u.h === R.PENDING) continue;
		if(u.h < 0 || u.h >= ctx.N) return "hors carte";
		if(seen[u.h]) return "empilement en " + R.hexName(ctx, u.h);
		seen[u.h] = true;
		if(!ctx.terrains[ctx.terr[u.h]].cost) return "terrain infranchissable";
		if(u.p < 1 || u.p > t.steps) return "pas " + u.p;
		if((u.f >= 0) !== (t.phalanx && !!ctx.options.orientation)) return "orientation";
	}
	return null;
}

// un tour au hasard, construit pas a pas avec le Turn (ce que ferait un humain distrait)
function randomTurn(ctx, st, who) {
	const turn = new R.Turn(ctx, st, who);
	const mine = turn.st.u.filter((u) => u.s === who && u.h >= 0);
	for(let k = 0; k < 8 && turn.ordersLeft() > 0; k++) {
		const u = mine[rng(mine.length)];
		if(!u || turn.whyNotOrder([u.i])) continue;
		const dests = Object.keys(turn.reach([u.i]));
		if(dests.length) turn.order([u.i], turn.reach([u.i])[dests[rng(dests.length)]]);
	}
	for(let k = 0; k < 4; k++) {
		const tg = turn.targets();
		if(!tg.length) break;
		const pick = tg[rng(tg.length)];
		const ids = pick.a.filter(() => rng(3) > 0);
		if(ids.length && turn.strength(ids, pick.t) && turn.strength(ids, pick.t).result)
			turn.attack(ids, pick.t, rng(2) ? ids[0] : undefined);
	}
	return turn.toMove();
}

function play(name, mode) {
	const ctx = R.makeContext({ scenario: scenario(name) });
	let st = R.newState(ctx), plies = 0, end = { winner: 0 };
	while(!end.winner && plies < 200) {
		const who = R.toMove(st);
		let move;
		if(st.phase < 2)
			move = AI.placements(ctx, st, who, 2, rng)[rng(1) || 0];
		else if(mode === "ai") {
			let best = -1e9;
			AI.candidates(ctx, st, who, { max: 10, rng }).forEach((m) => {
				const r = R.playTurn(ctx, st, who, m);
				if(!r.ok) { t.ok(false, name + " : candidat invalide " + r.error); return; }
				const v = who * AI.evaluate(ctx, r.state);
				if(v > best) { best = v; move = m; }
			});
		} else if(mode === "candidate") {
			const list = AI.candidates(ctx, st, who, { max: 6, rng });
			move = list[rng(list.length)];
		} else
			move = randomTurn(ctx, st, who);
		const r = R.playTurn(ctx, st, who, JSON.parse(JSON.stringify(move)));
		if(!r.ok) {
			t.ok(false, name + "/" + mode + " : tour refuse (" + r.error + ") " + JSON.stringify(move).slice(0, 200));
			return null;
		}
		st = r.state;
		plies++;
		const bad = invariants(ctx, st);
		if(bad) {
			t.ok(false, name + "/" + mode + " : invariant viole apres " + plies + " coups : " + bad);
			return null;
		}
		end = R.outcome(ctx, st, who);
	}
	t.ok(end.winner !== 0, name + "/" + mode + " : la partie se termine (" + plies + " coups)");
	return { plies, winner: end.winner, reason: end.reason, camp: end.winner === 2 ? "nulle" : ctx.campKey[end.winner] };
}

SCENARIOS.forEach((name) => {
	t.section(name);
	const results = [];
	for(let i = 0; i < AI_GAMES; i++) {
		const r = play(name, "ai");
		if(r) results.push(r);
	}
	if(results.length)
		console.log("  IA contre IA : " + results.map((r) => r.camp + " (" + r.reason + ", " + r.plies + " coups)").join(", "));
	for(let i = 0; i < RANDOM_GAMES; i++)
		play(name, i % 2 ? "candidate" : "random");
});

t.done();
