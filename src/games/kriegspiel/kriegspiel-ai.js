/*
 * Le Jeu de la guerre - heuristiques de l'IA.
 *
 * Comme kriegspiel-rules.js, ce fichier ne depend d'aucune globale Jocly : il
 * ne connait que KriegspielRules. Trois services :
 *
 *   placements(ctx, who, count, rng)   deploiements candidats
 *   candidates(ctx, st, who, options)  tours candidats pour le camp au trait
 *   evaluate(ctx, st, toMove)          evaluation statique, > 0 pour le Nord
 *
 * Un tour complet (jusqu'a 5 deplacements + 1 attaque) a bien trop de
 * variantes pour etre enumere : candidates() en construit quelques dizaines
 * par des constructeurs gloutons (attaque, defense, transmissions, avance,
 * hasard). Les constructeurs raisonnent par approximation ; chaque tour est
 * ensuite joue pour de bon par le moteur de regles, qui a le dernier mot.
 */
var KriegspielAI = (function (R) {
	"use strict";

	var N = R.N, W = R.W;
	var SIGNAL = R.SIGNAL, CAVALRY = R.CAVALRY;
	// valeur des unites : I, C, A, AC, T, E
	var VALUE = [0, 10, 12, 14, 16, 13, 15];
	var ARSENAL_VALUE = 70;

	function unitsOf(st, side) {
		var list = [];
		for (var pos = 0; pos < N; pos++) {
			var v = st.grid[pos];
			if (v !== 0 && (v > 0) === (side > 0))
				list.push(pos);
		}
		return list;
	}

	// distance a l'arsenal ennemi debout le plus proche (999 s'il n'y en a plus)
	function enemyArsenalDistance(ctx, st, side, pos) {
		var best = 999;
		for (var i = 0; i < ctx.arsPos.length; i++)
			if (ctx.arsSide[i] !== side && st.ars[i] && ctx.arsDist[i][pos] < best)
				best = ctx.arsDist[i][pos];
		return best;
	}

	/* ---------- evaluation ---------- */

	function evaluate(ctx, st, toMove) {
		var comm = { "1": R.communications(ctx, st, 1, false), "-1": R.communications(ctx, st, -1, false) };
		var score = 0, pos, i;
		for (i = 0; i < ctx.arsPos.length; i++)
			if (st.ars[i])
				score += ctx.arsSide[i] * ARSENAL_VALUE;
		for (pos = 0; pos < N; pos++) {
			var v = st.grid[pos];
			if (v === 0)
				continue;
			var side = v > 0 ? 1 : -1, type = v < 0 ? -v : v;
			var inComm = comm[side].on[pos];
			var worth = VALUE[type] * (inComm ? 1 : 0.65);
			if (type < SIGNAL) {
				var dist = enemyArsenalDistance(ctx, st, side, pos);
				if (dist < 999)
					worth -= 0.12 * dist;
				if (inComm) {
					if (ctx.terr[pos] === R.FORT && ctx.fortBonus[type])
						worth += 1.5;
					else if (ctx.terr[pos] === R.PASS && ctx.passBonus[type])
						worth += 1;
					// arsenal ennemi vide a portee de mouvement : menace majeure
					if (dist <= ctx.move[type]) {
						for (i = 0; i < ctx.arsPos.length; i++)
							if (ctx.arsSide[i] !== side && st.ars[i] && st.grid[ctx.arsPos[i]] === 0 &&
								ctx.arsDist[i][pos] <= ctx.move[type])
								worth += side === toMove ? 40 : 10;
					}
				}
			}
			score += side * worth;
		}
		// menaces : ce que chaque camp peut detruire tout de suite
		[1, -1].forEach(function (attSide) {
			var list = R.attacksFor(ctx, st, attSide, comm[attSide], comm[-attSide], -1);
			var best = 0, sum = 0;
			for (var k = 0; k < list.length; k++) {
				var gain = VALUE[list[k].type] * (list[k].delta >= 2 ? 1 : 0.35);
				sum += gain;
				if (gain > best)
					best = gain;
			}
			// une seule attaque par tour : la meilleure compte, les autres pesent peu
			var weight = attSide === toMove ? 0.8 : 0.3;
			score += attSide * (weight * best + 0.05 * (sum - best));
		});
		// sans unite de transmission, un camp ne tient plus que par ses arsenaux
		[1, -1].forEach(function (side) {
			var signals = 0;
			for (var q = 0; q < N; q++)
				if (st.grid[q] === side * SIGNAL || st.grid[q] === side * R.COURIER)
					signals++;
			if (signals === 0)
				score -= side * 12;
		});
		if (st.retreat >= 0 && st.grid[st.retreat] !== 0)
			score -= (st.grid[st.retreat] > 0 ? 1 : -1) * 2;
		return score;
	}

	/* ---------- placements ---------- */

	/*
	 * Un deploiement autour d'un point d'ancrage : les 15 unites combattantes
	 * sur les cases libres les plus proches (un bloc compact, donc relie par
	 * contact), l'infanterie vers la frontiere, la cavalerie sur les ailes,
	 * l'artillerie au centre ; les deux unites de transmission sur des lignes
	 * issues des arsenaux, pres du bloc. Ne regarde PAS le camp adverse.
	 */
	function placementAround(ctx, who, anchor, rng) {
		var empty = R.newState();
		empty.phase = 2;
		var lines = R.communications(ctx, empty, who, false).lit;
		var cells = [];
		var ar = R.rowOf(anchor), ac = R.colOf(anchor);
		for (var pos = 0; pos < N; pos++) {
			if (R.territory(pos) !== who || ctx.terr[pos] === R.MOUNTAIN)
				continue;
			var dr = R.rowOf(pos) - ar, dc = R.colOf(pos) - ac;
			// bloc plus large que profond, avec un peu de bruit
			cells.push({ pos: pos, d: Math.abs(dr) * 2.2 + Math.abs(dc) + rng(100) / 150 });
		}
		cells.sort(function (a, b) { return a.d - b.d; });
		var block = cells.slice(0, 15).map(function (c) { return c.pos; });
		var taken = {};
		block.forEach(function (p) { taken[p] = true; });
		// vers la frontiere d'abord
		block.sort(function (a, b) { return who * (R.rowOf(b) - R.rowOf(a)) || R.colOf(a) - R.colOf(b); });
		var front = block.slice(0, 9), rear = block.slice(9);
		rear.sort(function (a, b) { return Math.abs(R.colOf(b) - ac) - Math.abs(R.colOf(a) - ac); });
		var p = { I: front, C: rear.slice(0, 4), A: [rear[4]], AC: [rear[5]], T: [], E: [] };
		// transmissions : cases sur une ligne, au plus pres du bloc, derriere lui
		var spots = [];
		for (pos = 0; pos < N; pos++) {
			if (R.territory(pos) !== who || ctx.terr[pos] === R.MOUNTAIN || taken[pos] || !lines[pos])
				continue;
			var near = 99;
			for (var i = 0; i < block.length; i++)
				near = Math.min(near, R.distance(pos, block[i]));
			var behind = who * (ar - R.rowOf(pos));
			spots.push({ pos: pos, d: near + (behind < 0 ? 1.5 : 0) + rng(100) / 120 });
		}
		spots.sort(function (a, b) { return a.d - b.d; });
		if (spots.length < 2)
			return null;
		p.T = [spots[0].pos];
		p.E = [spots[1].pos];
		return p;
	}

	function placements(ctx, who, count, rng) {
		var anchors = [];
		// pres des arsenaux, des forteresses et du col du camp, et au centre
		for (var i = 0; i < ctx.arsPos.length; i++)
			if (ctx.arsSide[i] === who)
				anchors.push(ctx.arsPos[i]);
		for (var pos = 0; pos < N; pos++)
			if (R.territory(pos) === who && (ctx.terr[pos] === R.FORT || ctx.terr[pos] === R.PASS))
				anchors.push(pos);
		var midRow = who === 1 ? 6 : 13;
		[5, 9, 12, 15, 19].forEach(function (col) { anchors.push(midRow * W + col); });
		var out = [], seen = {}, guard = 0;
		while (out.length < count && guard++ < count * 6) {
			var anchor = anchors[rng(anchors.length)];
			// decalage aleatoire, en restant dans le territoire
			var row = Math.max(who === 1 ? 1 : 11, Math.min(who === 1 ? 8 : 18, R.rowOf(anchor) + rng(5) - 2));
			var col = Math.max(2, Math.min(W - 3, R.colOf(anchor) + rng(7) - 3));
			var p = placementAround(ctx, who, row * W + col, rng);
			if (!p)
				continue;
			var state = R.newState();
			state.phase = who === 1 ? 0 : 1;
			var played = R.playTurn(ctx, state, who, { p: p });
			if (!played.ok)
				continue;
			// tout le monde doit etre en communication au depart
			var comm = R.communications(ctx, played.state, who, false);
			if (comm.count < comm.total)
				continue;
			var key = JSON.stringify(p);
			if (!seen[key]) {
				seen[key] = true;
				out.push({ p: p });
			}
		}
		return out;
	}

	/* ---------- tours candidats ---------- */

	// ce qu'une unite de ce type, posee en `from`, apporterait a une attaque sur `target`
	function attackShare(ctx, st, type, from, target) {
		if (type >= SIGNAL)
			return 0;
		var dr = R.rowOf(target) - R.rowOf(from), dc = R.colOf(target) - R.colOf(from);
		var steps = Math.max(Math.abs(dr), Math.abs(dc));
		if (steps === 0 || !(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)))
			return 0;
		var sr = dr > 0 ? 1 : dr < 0 ? -1 : 0, sc = dc > 0 ? 1 : dc < 0 ? -1 : 0;
		for (var k = 1; k < steps; k++)
			if (ctx.terr[from + k * (sr * W + sc)] === R.MOUNTAIN)
				return 0;
		if (type === CAVALRY && steps === 1 && ctx.terr[from] !== R.FORT &&
			ctx.terr[target] !== R.FORT && ctx.terr[target] !== R.PASS)
			return ctx.charge;
		return steps <= ctx.range[type] ? ctx.attack[type] : 0;
	}

	// meme chose en defense
	function defenseShare(ctx, st, type, from, target) {
		var dr = R.rowOf(target) - R.rowOf(from), dc = R.colOf(target) - R.colOf(from);
		var steps = Math.max(Math.abs(dr), Math.abs(dc));
		if (steps === 0 || steps > ctx.range[type] || !(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)))
			return 0;
		var sr = dr > 0 ? 1 : dr < 0 ? -1 : 0, sc = dc > 0 ? 1 : dc < 0 ? -1 : 0;
		for (var k = 1; k < steps; k++)
			if (ctx.terr[from + k * (sr * W + sc)] === R.MOUNTAIN)
				return 0;
		var value = ctx.defense[type];
		if (ctx.terr[from] === R.FORT) value += ctx.fortBonus[type];
		else if (ctx.terr[from] === R.PASS) value += ctx.passBonus[type];
		return value;
	}

	// l'unite resterait-elle en communication en `dest` ? (approximation : sur
	// une ligne, ou au contact d'une autre unite combattante en communication)
	function staysConnected(turn, from, dest, combat) {
		var comm = turn.comm(turn.who);
		if (comm.lit[dest])
			return true;
		if (!combat)
			return false;
		var ctx = turn.ctx, grid = turn.st.grid;
		for (var d = 0; d < 8; d++) {
			var q = ctx.next[dest * 8 + d];
			if (q >= 0 && q !== from && comm.on[q]) {
				var v = grid[q];
				if ((v < 0 ? -v : v) < SIGNAL)
					return true;
			}
		}
		return false;
	}

	function candidates(ctx, st, who, options) {
		options = options || {};
		var max = options.max || 32;
		var rng = options.rng || function (n) { return Math.floor(Math.random() * n); };
		var out = [], seen = {};

		// destinations de retraite, de la meilleure a la moins bonne
		var retreatDests = null;
		if (st.retreat >= 0 && R.sideOf(st.grid[st.retreat]) === who) {
			var probe = new R.Turn(ctx, st, who);
			var combatR = R.typeOf(st.grid[st.retreat]) < SIGNAL;
			var foes = unitsOf(st, -who);
			retreatDests = probe.dests(st.retreat).map(function (dest) {
				var score = staysConnected(probe, st.retreat, dest, combatR) ? 10 : 0;
				if (ctx.terr[dest] === R.FORT) score += 4;
				if (ctx.terr[dest] === R.PASS) score += 2;
				var near = 99;
				for (var i = 0; i < foes.length; i++)
					near = Math.min(near, R.distance(dest, foes[i]));
				score += Math.min(near, 4);
				if (R.enemyArsenalAt(ctx, st, dest, who) >= 0 && combatR) score += 100;
				return { dest: dest, score: score };
			}).sort(function (a, b) { return b.score - a.score; });
		}

		function start(variant) {
			var turn = new R.Turn(ctx, st, who);
			if (retreatDests && retreatDests.length)
				turn.move(st.retreat, retreatDests[(variant || 0) % retreatDests.length].dest);
			return turn;
		}

		function attackScore(turn, a) {
			var kind = turn.outcomeOf(a.target, a.delta);
			return VALUE[a.type] * (kind === "destroy" ? 1 : 0.4) + a.delta * 0.01;
		}

		function push(turn, noAttack) {
			if (!noAttack && turn.a === undefined) {
				var list = turn.attacks(), best = null, bestScore = -1;
				for (var i = 0; i < list.length; i++) {
					var s = attackScore(turn, list[i]);
					if (s > bestScore) { bestScore = s; best = list[i]; }
				}
				if (best)
					turn.attack(best.target);
			}
			var move = turn.toMove(), key = JSON.stringify(move);
			if (!seen[key]) {
				seen[key] = true;
				out.push(move);
			}
		}

		// une unite combattante amie a 2 cases au plus, aucun ennemi a moins de 4
		function escorted(turn, pos) {
			var grid = turn.st.grid, friend = false;
			for (var q = 0; q < N; q++) {
				var v = grid[q];
				if (v === 0)
					continue;
				var dist = R.distance(pos, q);
				if ((v > 0) === (who > 0)) {
					if (dist >= 1 && dist <= 2 && (v < 0 ? -v : v) < SIGNAL)
						friend = true;
				} else if (dist < 4 && (v < 0 ? -v : v) < SIGNAL)
					return false;
			}
			return friend;
		}

		function movable(turn) {
			return unitsOf(turn.st, who).filter(function (pos) { return !turn.whyNotMove(pos); });
		}

		// avance vers l'arsenal ennemi : chaque unite prend la case qui s'en
		// rapproche le plus sans perdre la communication
		function advance(turn, order) {
			var list = movable(turn);
			var dist = function (p) { return enemyArsenalDistance(ctx, turn.st, who, p); };
			if (order === "front")
				list.sort(function (a, b) { return dist(a) - dist(b); });
			else if (order === "rear")
				list.sort(function (a, b) { return dist(b) - dist(a); });
			else
				for (var i = list.length - 1; i > 0; i--) {
					var j = rng(i + 1), tmp = list[i];
					list[i] = list[j];
					list[j] = tmp;
				}
			for (var k = 0; k < list.length && turn.n < ctx.maxMoves; k++) {
				var from = list[k];
				if (turn.whyNotMove(from))
					continue;
				var combat = R.typeOf(turn.st.grid[from]) < SIGNAL;
				var dests = turn.dests(from), best = -1, bestDist = dist(from);
				for (var m = 0; m < dests.length; m++) {
					var d = dist(dests[m]) + rng(10) / 100;
					// une unite de transmission ne s'avance pas seule : elle
					// suit, a couvert d'une unite combattante amie
					if (!combat && !escorted(turn, dests[m]))
						continue;
					if (d < bestDist && staysConnected(turn, from, dests[m], combat)) {
						bestDist = d;
						best = dests[m];
					}
				}
				if (best >= 0)
					turn.move(from, best);
			}
		}

		/* 1. le tour vide, et toutes les attaques immediatement disponibles */
		var base = start(0);
		push(base, true);
		base.attacks().forEach(function (a) {
			var turn = start(0);
			turn.attack(a.target);
			push(turn);
		});
		if (retreatDests)
			for (var rv = 1; rv < Math.min(3, retreatDests.length); rv++)
				push(start(rv));

		/* 2. destruction d'un arsenal */
		(function () {
			var turn = start(0);
			movable(turn).forEach(function (from) {
				if (R.typeOf(turn.st.grid[from]) >= SIGNAL)
					return;
				turn.dests(from).forEach(function (dest) {
					if (R.enemyArsenalAt(ctx, turn.st, dest, who) < 0)
						return;
					var grab = start(0);
					if (grab.d === undefined && grab.move(from, dest)) {
						advance(grab, "front");
						push(grab);
					}
				});
			});
		})();

		/* 3. offensif : concentrer des unites sur une cible */
		(function () {
			var probe = start(0);
			var mine = unitsOf(probe.st, who).filter(function (p) { return R.typeOf(probe.st.grid[p]) < SIGNAL; });
			var targets = unitsOf(probe.st, -who).map(function (target) {
				var s = probe.strength(target);
				var near = 99;
				for (var i = 0; i < mine.length; i++)
					near = Math.min(near, R.distance(target, mine[i]));
				return { target: target, gap: s.def - s.att, near: near, type: R.typeOf(probe.st.grid[target]) };
			}).filter(function (x) { return x.near <= 5; });
			targets.sort(function (a, b) { return (a.gap - VALUE[a.type] * 0.2) - (b.gap - VALUE[b.type] * 0.2); });
			targets.slice(0, options.targets || 5).forEach(function (x) {
				var turn = start(0), target = x.target;
				while (turn.n < ctx.maxMoves) {
					if (turn.strength(target).delta >= 2)
						break;
					var best = null, bestGain = 0;
					var list = movable(turn);
					for (var i = 0; i < list.length; i++) {
						var from = list[i], type = R.typeOf(turn.st.grid[from]);
						if (type >= SIGNAL || R.distance(from, target) > 6)
							continue;
						var current = attackShare(ctx, turn.st, type, from, target);
						var dests = turn.dests(from);
						for (var k = 0; k < dests.length; k++) {
							var gain = attackShare(ctx, turn.st, type, dests[k], target) - current;
							if (gain > bestGain && staysConnected(turn, from, dests[k], true)) {
								bestGain = gain;
								best = [from, dests[k]];
							}
						}
					}
					if (!best)
						break;
					turn.move(best[0], best[1]);
				}
				if (turn.n === 0)
					return;
				var list2 = turn.attacks();
				for (var j = 0; j < list2.length; j++)
					if (list2[j].target === target) {
						turn.attack(target);
						break;
					}
				push(turn);
			});
		})();

		/* 4. defensif : soutenir ou retirer les unites menacees */
		(function () {
			var probe = start(0);
			var threats = R.attacksFor(ctx, probe.st, -who, probe.comm(-who), probe.comm(who), -1);
			threats.sort(function (a, b) { return VALUE[b.type] - VALUE[a.type]; });
			threats.slice(0, 3).forEach(function (threat) {
				var target = threat.target;
				// a) amener des soutiens
				var turn = start(0);
				while (turn.n < ctx.maxMoves) {
					if (turn.strength(target, -who).delta <= 0)
						break;
					var best = null, bestGain = 0, list = movable(turn);
					for (var i = 0; i < list.length; i++) {
						var from = list[i];
						if (from === target || R.distance(from, target) > 5)
							continue;
						var type = R.typeOf(turn.st.grid[from]);
						var current = defenseShare(ctx, turn.st, type, from, target);
						var dests = turn.dests(from);
						for (var k = 0; k < dests.length; k++) {
							var gain = defenseShare(ctx, turn.st, type, dests[k], target) - current;
							if (gain > bestGain && staysConnected(turn, from, dests[k], type < SIGNAL)) {
								bestGain = gain;
								best = [from, dests[k]];
							}
						}
					}
					if (!best)
						break;
					turn.move(best[0], best[1]);
				}
				if (turn.n > 0)
					push(turn);
				// b) retirer l'unite vers la case la moins exposee
				var flee = start(0);
				if (!flee.whyNotMove(target)) {
					var options2 = flee.dests(target), bestDest = -1, bestDelta = threat.delta;
					for (var m = 0; m < options2.length; m++) {
						var trial = new R.Turn(ctx, flee.st, who);
						trial.needRetreat = false;
						trial.trusted = true;
						trial.move(target, options2[m]);
						var bonus = ctx.terr[options2[m]] === R.FORT ? 0.5 : 0;
						var delta = trial.strength(options2[m], -who).delta - bonus;
						if (delta < bestDelta) {
							bestDelta = delta;
							bestDest = options2[m];
						}
					}
					if (bestDest >= 0 && flee.move(target, bestDest))
						push(flee);
				}
			});
		})();

		/* 5. transmissions : retablir ses lignes, couper celles de l'adversaire */
		(function () {
			var probe = start(0);
			var mineBefore = probe.comm(who).count, theirsBefore = probe.comm(-who).count;
			var best = null, bestGain = 0, bestCut = null, bestCutGain = 0, tried = 0;
			var theirLines = probe.comm(-who).lit;
			movable(probe).forEach(function (from) {
				var type = R.typeOf(probe.st.grid[from]);
				var dests = probe.dests(from);
				for (var k = 0; k < dests.length; k++) {
					var dest = dests[k];
					if (type >= SIGNAL) {
						var trial = R.copyState(probe.st);
						trial.grid[dest] = trial.grid[from];
						trial.grid[from] = 0;
						var gain = R.communications(ctx, trial, who, false).count - mineBefore;
						if (gain > bestGain) { bestGain = gain; best = [from, dest]; }
					} else if (theirLines[dest] && tried < 30 && staysConnected(probe, from, dest, true)) {
						tried++;
						var trial2 = R.copyState(probe.st);
						trial2.grid[dest] = trial2.grid[from];
						trial2.grid[from] = 0;
						var cut = theirsBefore - R.communications(ctx, trial2, -who, false).count;
						if (cut > bestCutGain) { bestCutGain = cut; bestCut = [from, dest]; }
					}
				}
			});
			[best, bestCut].forEach(function (step) {
				if (!step)
					return;
				var turn = start(0);
				if (turn.move(step[0], step[1])) {
					push(turn, false);
					var more = start(0);
					more.move(step[0], step[1]);
					advance(more, "front");
					push(more);
				}
			});
		})();

		/* 6. avance vers les arsenaux ennemis */
		["front", "rear", "random"].forEach(function (order) {
			var turn = start(0);
			advance(turn, order);
			if (turn.n > 0)
				push(turn);
		});

		/* 7. quelques variantes aleatoires legales */
		for (var guard = 0; out.length < max && guard < max; guard++) {
			var turn = start(rng(3));
			var wanted = 1 + rng(ctx.maxMoves);
			var pool = movable(turn);
			while (turn.n < wanted && pool.length) {
				var from = pool.splice(rng(pool.length), 1)[0];
				if (turn.whyNotMove(from))
					continue;
				var combat = R.typeOf(turn.st.grid[from]) < SIGNAL;
				var dests = turn.dests(from).filter(function (dest) {
					return staysConnected(turn, from, dest, combat);
				});
				if (dests.length)
					turn.move(from, dests[rng(dests.length)]);
			}
			push(turn);
		}

		return out.length > max ? out.slice(0, max) : out;
	}

	return {
		VALUE: VALUE,
		evaluate: evaluate,
		placements: placements,
		candidates: candidates
	};
})(KriegspielRules);

if (typeof module === "object" && module && module.exports && typeof Model === "undefined")
	module.exports = KriegspielAI;
