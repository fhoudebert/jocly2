#!/usr/bin/env node
/*
 * Péan - laboratoire : mesure l'equilibre d'un scenario par auto-jeu.
 *
 *   node src/games/pean/extra/lab.js SCENARIO [options]
 *
 *   SCENARIO          nom (leuctres-371) ou chemin d'un fichier JSON
 *   --games N         parties (defaut 20)
 *   --mode M          glouton (defaut) : chaque camp joue le meilleur de ses
 *                     tours candidats a un coup de profondeur, avec du bruit
 *                     pour varier les parties ; tres rapide.
 *                     uct : l'IA Jocly (dist/node, `npx gulp build`), niveau
 *                     --level (0 Caporal, 1 Capitaine, 2 General).
 *   --level L         niveau uct (defaut 0)
 *   --candidates K    tours candidats par coup en mode glouton (defaut 12)
 *   --seed S          graine du hasard (mode glouton)
 *   --json            resultat en JSON
 *
 * Affiche, pour chaque camp, la part des victoires (nulles comptees pour
 * moitie), la duree moyenne en tours, et les raisons de fin. Critere du
 * cadrage pour un scenario : entre 35 et 65 % pour chaque camp.
 */
const fs = require("fs");
const path = require("path");

const GAME = path.join(__dirname, "..");
const args = process.argv.slice(2);
function opt(name, def) {
	const k = args.indexOf("--" + name);
	return k >= 0 ? args[k + 1] : def;
}
const target = args[0];
if(!target || target.startsWith("--")) {
	console.error("usage: lab.js SCENARIO [--games N] [--mode glouton|uct] [--level L] [--candidates K] [--seed S] [--json]");
	process.exit(2);
}
const file = fs.existsSync(target) ? target : path.join(GAME, "scenarios", target + ".json");
const scenario = JSON.parse(fs.readFileSync(file, "utf8"));
const GAMES = parseInt(opt("games", "20"), 10);
const MODE = opt("mode", "glouton");
const LEVEL = parseInt(opt("level", "0"), 10);
const CANDIDATES = parseInt(opt("candidates", "12"), 10);
let seed = parseInt(opt("seed", String(Date.now() % 100000)), 10);

global.PeanRules = require(path.join(GAME, "pean-rules.js"));
const R = global.PeanRules;
const AI = require(path.join(GAME, "pean-ai.js"));

function rng(n) {
	seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
	return seed % n;
}

function greedyGame() {
	const ctx = R.makeContext({ scenario });
	let st = R.newState(ctx), end = { winner: 0 }, plies = 0;
	while(!end.winner && plies < 400) {
		const who = R.toMove(st);
		let move;
		if(st.phase < 2) {
			const list = AI.placements(ctx, st, who, 4, rng);
			move = list[rng(list.length)];
		} else {
			let best = -Infinity;
			AI.candidates(ctx, st, who, { max: CANDIDATES, rng }).forEach((m) => {
				const r = R.playTurn(ctx, st, who, m);
				if(!r.ok) return;
				const v = who * AI.evaluate(ctx, r.state) + (rng(1000) / 1000) * 3;
				if(v > best) { best = v; move = m; }
			});
		}
		const r = R.playTurn(ctx, st, who, move);
		if(!r.ok) throw new Error("tour refuse : " + r.error);
		st = r.state;
		plies++;
		end = R.outcome(ctx, st, who);
	}
	return { ctx, st, end };
}

async function uctGame(Jocly, name) {
	const match = await Jocly.createMatch(name);
	match.game.mOptions.scenario = scenario;
	match.game.InitGame();
	match.game.mBoard.InitialPosition(match.game);
	const config = await match.getConfig();
	const level = Object.assign({}, config.model.levels[LEVEL]);
	let finished = false, n = 0;
	while(!finished && n < 400) {
		const result = await match.machineSearch({ level, threaded: false });
		finished = (await match.applyMove(result.move)).finished;
		n++;
	}
	const b = match.game.mBoard;
	return { ctx: match.game.g.ctx, st: b, end: { winner: b.over || (b.mFinished ? 2 : 0), reason: b.reason || "?" } };
}

(async () => {
	let Jocly = null;
	if(MODE === "uct") {
		const dist = path.join(GAME, "..", "..", "..", "dist", "node", "jocly.core.js");
		if(!fs.existsSync(dist)) {
			console.error("mode uct : `npx gulp build` d'abord");
			process.exit(2);
		}
		Jocly = require(dist);
	}
	const tally = { "1": 0, "-1": 0, "2": 0 }, reasons = {};
	let turns = 0, ctx = null;
	for(let g = 0; g < GAMES; g++) {
		const r = MODE === "uct" ? await uctGame(Jocly, "pean-leuctres") : greedyGame();
		ctx = r.ctx;
		tally[r.end.winner] = (tally[r.end.winner] || 0) + 1;
		const key = (r.end.winner === 2 ? "nulle" : ctx.campKey[r.end.winner]) + " " + r.end.reason;
		reasons[key] = (reasons[key] || 0) + 1;
		turns += r.st.played / 2;
		if(MODE === "uct" && !args.includes("--json"))
			console.log("  partie " + (g + 1) + " : " + key + ", " + r.st.played / 2 + " tours");
	}
	const share = (s) => (tally[s] + tally[2] / 2) / GAMES;
	const out = {
		scenario: scenario.id, mode: MODE + (MODE === "uct" ? " " + LEVEL : ""), games: GAMES,
		camps: { [ctx.campKey[1]]: Math.round(share(1) * 100), [ctx.campKey[-1]]: Math.round(share(-1) * 100) },
		nulles: tally[2], toursMoyens: Math.round(turns / GAMES * 10) / 10, tours: ctx.tours, fins: reasons,
		equilibre: share(1) >= 0.35 && share(1) <= 0.65
	};
	if(args.includes("--json"))
		console.log(JSON.stringify(out));
	else
		console.log(out.scenario + " [" + out.mode + ", " + GAMES + " parties] " +
			Object.keys(out.camps).map((k) => k + " " + out.camps[k] + " %").join(" / ") +
			" · nulles " + out.nulles + " · " + out.toursMoyens + " tours sur " + out.tours +
			" · " + (out.equilibre ? "EQUILIBRE" : "desequilibre") + "\n  fins : " + JSON.stringify(out.fins));
})();
