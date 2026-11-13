/*
 * Péan - heuristiques de l'IA.
 *
 * Comme pean-rules.js, ce fichier ne depend d'aucune globale Jocly : il ne
 * connait que PeanRules. Trois services :
 *
 *   placements(ctx, st, who, count, rng)   deploiements candidats (bataille libre)
 *   candidates(ctx, st, who, options)      tours candidats pour le camp au trait
 *   evaluate(ctx, st, weights)             evaluation statique, > 0 pour le camp 1
 *
 * Un tour (N ordres d'unite ou de groupe, puis des combats) a bien trop de
 * variantes pour etre enumere : candidates() en construit quelques dizaines
 * par des generateurs orientes (avancer en ligne, prendre les objectifs,
 * tenir, harceler par le tir, charger) avec un peu de bruit. Les combats,
 * eux, sont choisis exactement : la table est deterministe. Chaque tour est
 * ensuite rejoue par le moteur de regles, qui a le dernier mot.
 *
 * L'evaluation est une somme ponderee de traits nommes (WEIGHTS) :
 * reglable, et mesurable en duel (tests/pean/match.test.js).
 */
var PeanAI = (function (R) {
	"use strict";

	var WEIGHTS = {
		material: 1,        // valeur des unites, au prorata des pas
		objective: 0.5,     // objectifs controles (monte vers 1 en fin de partie)
		approach: 0.04,     // pression sur les objectifs (distance relative)
		exposure: 0.45,     // unites attaquables a 3:2 ou mieux au prochain tour adverse
		terrain: 0.6,       // unites sur un terrain defensif
		cohesion: 0.5,      // phalanges epaulees (voisine de meme camp)
		contact: 0.02,      // rapprochement general des lignes
		urgency: 0.25       // le camp mene aux points cherche le contact, de plus en plus
	};

	function unitsOf(st, side) {
		return st.u.filter(function (u) { return u.s === side && u.h >= 0; });
	}

	function worth(ctx, u) {
		var t = ctx.types[u.t];
		return t.value * u.p / t.steps;
	}

	function defenseAt(ctx, u, h) {
		return R.forceOf(ctx, u) * ctx.terrains[ctx.terr[h]].def;
	}

	/*
	 * Force adverse qui pourrait frapper `h` au prochain tour, a la grosse :
	 * unites de contact a portee de mouvement d'un voisin, tireurs a portee
	 * d'un hexagone a distance 2. Pas de chemin calcule : c'est une estimation.
	 */
	function threatOn(ctx, enemies, h) {
		var sum = 0;
		for (var i = 0; i < enemies.length; i++) {
			var e = enemies[i], t = ctx.types[e.t];
			if (t.force <= 0)
				continue;
			var reach = Math.floor(t.mp / 2 / 1.4), d = R.distance(ctx, e.h, h);
			if (t.fire ? (d <= reach + 2 && d >= 2) : d <= reach + 1)
				sum += R.forceOf(ctx, e) * (t.charge && d >= 3 ? 1.5 : 1);
		}
		return sum;
	}

	function riskOf(ratio) {
		return ratio >= 3 ? 0.7 : ratio >= 2 ? 0.45 : ratio >= 1.5 ? 0.2 : 0;
	}

	/* ---------- evaluation ---------- */

	function evaluate(ctx, st, weights) {
		var W = weights || WEIGHTS;
		var mover = R.toMove(st), score = 0;
		var progress = Math.min(1, st.played / (2 * ctx.tours));
		var side, i, j;
		var units = { "1": unitsOf(st, 1), "-1": unitsOf(st, -1) };
		// le camp mene aux points (objectifs + pertes infligees) doit agir
		var lead = R.points(ctx, st, 1) - R.points(ctx, st, -1);
		var behind = lead > ctx.nulle ? -1 : lead < -ctx.nulle ? 1 : 0;
		var urge = behind ? W.urgency * Math.min(1, Math.abs(lead) / 20) * (0.3 + progress) : 0;
		[1, -1].forEach(function (s) {
			var mine = units[s], enemies = units[-s];
			var sub = 0;
			// materiel : y compris les renforts a venir
			st.u.forEach(function (u) {
				if (u.s === s && (u.h >= 0 || u.h === R.PENDING))
					sub += W.material * worth(ctx, u);
			});
			for (i = 0; i < mine.length; i++) {
				var u = mine[i], t = ctx.types[u.t], terrain = ctx.terrains[ctx.terr[u.h]];
				var w = worth(ctx, u);
				// exposition : plus lourde pour le camp qui va subir le prochain tour
				var threat = threatOn(ctx, enemies, u.h);
				if (threat > 0) {
					var risk = riskOf(threat / Math.max(0.5, defenseAt(ctx, u, u.h)));
					sub -= W.exposure * risk * w * (s === mover ? 0.35 : 1);
				}
				if (terrain.def > 1 && !t.fire)
					sub += W.terrain * (terrain.def - 1) * R.forceOf(ctx, u);
				if (t.phalanx) {
					for (var d = 0; d < 6; d++) {
						var n = ctx.nb[u.h * 6 + d];
						if (n < 0) continue;
						for (j = 0; j < mine.length; j++)
							if (mine[j].h === n && ctx.types[mine[j].t].phalanx) {
								sub += W.cohesion;
								break;
							}
					}
				}
				// rapprochement : distance a l'ennemi le plus proche
				if (enemies.length) {
					var best = 99;
					for (j = 0; j < enemies.length; j++)
						best = Math.min(best, R.distance(ctx, u.h, enemies[j].h));
					sub -= (W.contact + (s === behind ? urge : 0)) * Math.min(best, 12);
				}
			}
			score += s * sub;
		});
		// objectifs : controle, et pression (qui en est le plus pres)
		ctx.objectives.forEach(function (o, k) {
			var wObj = W.objective + (1 - W.objective) * progress * progress;
			for (side = 1; side >= -1; side -= 2) {
				if (o.only && o.only !== side)
					continue;
				if (st.ctrl[k] === side)
					score += side * wObj * o.points;
				var mineD = 99, theirD = 99;
				units[side].forEach(function (u) { mineD = Math.min(mineD, R.distance(ctx, u.h, o.hex)); });
				units[-side].forEach(function (u) { theirD = Math.min(theirD, R.distance(ctx, u.h, o.hex)); });
				score += side * W.approach * o.points * Math.max(-4, Math.min(4, theirD - mineD)) / 4;
			}
		});
		return score;
	}

	/* ---------- combats ---------- */

	// gain attendu d'une attaque, du point de vue de l'attaquant
	function combatGain(ctx, turn, ids, targetId, s) {
		var target = turn.st.u[targetId], tt = ctx.types[target.t];
		var step = tt.value / tt.steps, gain = 0;
		switch (s.result) {
			case "elimination": gain = worth(ctx, target) + 2; break;
			case "perte-recul": gain = step * 1.25; break;
			case "recul": gain = step * 0.3; break;
			case "echange":
				var victim = ids.filter(function (id) { return !ctx.types[turn.st.u[id].t].fire; })[0];
				var vt = ctx.types[turn.st.u[victim].t];
				gain = step - vt.value / vt.steps + (target.p === 1 ? 3 : 0);
				break;
			default: gain = -1;
		}
		// recul impossible : le defenseur perd un pas de plus
		if ((s.result === "recul" || s.result === "perte-recul") && target.p > (s.result === "recul" ? 0 : 1)) {
			turn.refresh();
			if (turn.retreatHex(target) < 0)
				gain += step;
		}
		return gain;
	}

	/*
	 * Livre les combats rentables, le meilleur d'abord. `greed` : seuil de
	 * gain (negatif : accepte des echanges couteux).
	 */
	function fight(ctx, turn, greed, rng, noise) {
		for (var guard = 0; guard < 12; guard++) {
			var best = null;
			turn.targets().forEach(function (tg) {
				var s = turn.strength(tg.a, tg.t);
				if (!s || !s.result || s.result === "neant")
					return;
				var ids = turn.minimalAttackers(tg.t, tg.a);
				var s2 = turn.strength(ids, tg.t);
				var gain = combatGain(ctx, turn, ids, tg.t, s2) + (noise ? rng(100) / 100 * noise : 0);
				if (gain > greed && (!best || gain > best.gain))
					best = { ids: ids, t: tg.t, gain: gain, s: s2 };
			});
			if (!best)
				return;
			var target = turn.st.u[best.t], from = target.h;
			// avance : vers un objectif, ou par une unite deja au contact d'un autre ennemi
			var adv;
			if (best.s.result === "elimination" || best.s.result === "perte-recul" || best.s.result === "recul") {
				var melee = best.ids.filter(function (id) {
					return !ctx.types[turn.st.u[id].t].fire && R.distance(ctx, turn.st.u[id].h, from) === 1;
				});
				if (melee.length && (ctx.objAt[from] || greed < 0 || rng(3) === 0))
					adv = melee[melee.length - 1];
			}
			// une avance refusee (hexagone non libere) annule le combat : sans avance
			if (!turn.attack(best.ids, best.t, adv) && !turn.attack(best.ids, best.t))
				return;
		}
	}

	/* ---------- mouvements ---------- */

	function groupsOf(ctx, turn, who) {
		// composantes contigues de meme type parmi les unites libres
		var free = unitsOf(turn.st, who).filter(function (u) {
			return !turn.ordered[u.i] && !turn.zEnemy[u.h];
		});
		var at = {};
		free.forEach(function (u) { at[u.h] = u; });
		var seen = {}, groups = [];
		free.forEach(function (u) {
			if (seen[u.i]) return;
			var comp = [u], stack = [u];
			seen[u.i] = true;
			while (stack.length) {
				var v = stack.pop();
				for (var d = 0; d < 6; d++) {
					var n = ctx.nb[v.h * 6 + d], w = n >= 0 ? at[n] : null;
					if (w && !seen[w.i] && w.t === u.t) {
						seen[w.i] = true;
						comp.push(w);
						stack.push(w);
					}
				}
			}
			if (comp.length >= 2)
				groups.push(comp.map(function (x) { return x.i; }));
		});
		return groups;
	}

	/*
	 * Interet d'une position pour une unite, selon le mode du generateur.
	 *   advance   : au contact, la ou l'on peut frapper fort
	 *   objective : vers les objectifs a prendre ou a garder
	 *   hold      : terrain defensif, pas d'exposition
	 */
	function placeScore(ctx, turn, u, h, mode, enemies, friendsAt, charge) {
		var t = ctx.types[u.t], terrain = ctx.terrains[ctx.terr[h]];
		var score = 0, nearest = 99, nearestE = null, k;
		for (k = 0; k < enemies.length; k++) {
			var d = R.distance(ctx, h, enemies[k].h);
			if (d < nearest) { nearest = d; nearestE = enemies[k]; }
		}
		// objectifs
		ctx.objectives.forEach(function (o, i) {
			if (o.only && o.only !== u.s) return;
			var mine = turn.st.ctrl[i] === u.s;
			var dObj = R.distance(ctx, h, o.hex);
			var wObj = mode === "objective" ? 1.2 : 0.35;
			if (!mine) score -= wObj * o.points / 10 * dObj;
			else if (h === o.hex) score += o.points / 5;
		});
		if (t.fire) {
			// tireur : a 2 d'un ennemi, jamais au contact
			if (nearest === 2) score += 8;
			else if (nearest === 1) score -= 10;
			else score -= 1.5 * (nearest - 2);
		} else if (mode === "hold") {
			score += 4 * (terrain.def - 1) * R.forceOf(ctx, u);
			if (nearest <= 1) score -= 3;
		} else if (!t.general) {
			// contact : attaque possible depuis h ?
			if (nearest === 1 && nearestE) {
				var att = R.forceOf(ctx, u) * (charge ? 2 : 1), def = defenseAt(ctx, nearestE, nearestE.h);
				for (var dd = 0; dd < 6; dd++) {
					var n = ctx.nb[nearestE.h * 6 + dd], f = n >= 0 ? friendsAt[n] : null;
					if (f && f.i !== u.i) att += R.forceOf(ctx, f);
				}
				var ratio = att / Math.max(0.5, def);
				score += ratio >= 3 ? 12 : ratio >= 2 ? 9 : ratio >= 1.5 ? 5 : ratio >= 1 ? 1 : -6;
			} else
				score -= (mode === "advance" ? 1.6 : 0.6) * nearest;
		}
		if (t.general) {
			// general : derriere ses lignes, pres des siens
			score -= nearest <= 2 ? 15 : 0;
			score -= 0.5 * Math.abs(nearest - 4);
		}
		// exposition a la riposte
		var threat = threatOn(ctx, enemies, h);
		var risk = riskOf(threat / Math.max(0.5, R.forceOf(ctx, u) * terrain.def));
		score -= risk * worth(ctx, u) * (mode === "advance" ? 0.25 : 0.6);
		if (!t.fire && terrain.def > 1) score += 1.5 * (terrain.def - 1);
		return score;
	}

	function enemiesOf(turn, who) { return unitsOf(turn.st, -who); }

	function friendsMap(turn, who) {
		var m = {};
		unitsOf(turn.st, who).forEach(function (u) { m[u.h] = u; });
		return m;
	}

	// orientation conseillee d'une phalange : vers l'ennemi le plus proche
	function facingToward(ctx, h, enemies, fallback) {
		var best = null, bd = 99;
		enemies.forEach(function (e) {
			var d = R.distance(ctx, h, e.h);
			if (d < bd) { bd = d; best = e; }
		});
		if (!best || bd > 4) return fallback;
		var bestDir = fallback, bestDist = 99;
		for (var d = 0; d < 6; d++) {
			var n = ctx.nb[h * 6 + d];
			if (n < 0) continue;
			var dist = R.distance(ctx, n, best.h);
			if (dist < bestDist) { bestDist = dist; bestDir = d; }
		}
		return bestDir;
	}

	/*
	 * Un tour par un generateur : `mode`, `noise` (bruit sur les scores),
	 * `groups` (proportion d'ordres de groupe), `greed` (seuil des combats).
	 */
	function buildTurn(ctx, st, who, plan, rng) {
		var turn = new R.Turn(ctx, st, who);
		var noise = plan.noise || 0;
		function jitter() { return noise ? (rng(1000) / 1000 - 0.5) * noise : 0; }
		while (turn.ordersLeft() > 0 && !turn.combat) {
			var enemies = enemiesOf(turn, who), friends = friendsMap(turn, who);
			var best = null;
			// groupes
			if (plan.groups) {
				groupsOf(ctx, turn, who).forEach(function (ids) {
					var dests = turn.reach(ids), lead = turn.st.u[ids[0]];
					var units = ids.map(function (id) { return turn.st.u[id]; });
					var here = units.reduce(function (n, u) { return n + placeScore(ctx, turn, u, u.h, plan.mode, enemies, friends, false); }, 0);
					Object.keys(dests).forEach(function (key) {
						var L = +key, path = dests[key];
						var sc = 0;
						units.forEach(function (u) {
							var h = R.hexAt(ctx, ctx.aq[u.h] + ctx.aq[L] - ctx.aq[lead.h], ctx.ar[u.h] + ctx.ar[L] - ctx.ar[lead.h]);
							sc += placeScore(ctx, turn, u, h, plan.mode, enemies, friends, false);
						});
						// un ordre de groupe vaut plusieurs ordres : bonus a la taille
						var value = (sc - here) * plan.groups + 0.5 * ids.length + jitter();
						if (value > 0.5 && (!best || value > best.value))
							best = { ids: ids, path: path, value: value };
					});
				});
			}
			// unites seules
			unitsOf(turn.st, who).forEach(function (u) {
				if (turn.ordered[u.i] || turn.whyNotOrder([u.i]))
					return;
				var t = ctx.types[u.t];
				var here = placeScore(ctx, turn, u, u.h, plan.mode, enemies, friends, false);
				var dests = turn.reach([u.i]);
				Object.keys(dests).forEach(function (key) {
					var h = +key, path = dests[key];
					var straight = path.length - 1 >= ctx.chargeMin && t.charge && ctx.options.charge;
					if (straight) {
						var d0 = R.dirBetween(ctx, path[0], path[1]);
						for (var s = 2; s < path.length; s++)
							if (R.dirBetween(ctx, path[s - 1], path[s]) !== d0) { straight = false; break; }
					}
					var value = placeScore(ctx, turn, u, h, plan.mode, enemies, friends, straight) - here + jitter();
					if (value > 0.5 && (!best || value > best.value))
						best = { ids: [u.i], path: path, value: value };
				});
			});
			if (!best)
				break;
			var facing;
			var t0 = ctx.types[turn.st.u[best.ids[0]].t];
			if (ctx.options.orientation && t0.phalanx) {
				var end = best.path[best.path.length - 1];
				var natural = best.path.length > 1 ? R.dirBetween(ctx, best.path[best.path.length - 2], end) : turn.st.u[best.ids[0]].f;
				var want = facingToward(ctx, end, enemies, natural);
				if (want !== natural)
					facing = want;
			}
			// order() verifie tout avant de toucher a l'etat : on peut reessayer
			if (!turn.order(best.ids, best.path, facing) && !turn.order(best.ids, best.path))
				break;
		}
		// pivots des phalanges engagees de flanc (option orientation)
		if (ctx.options.orientation) {
			unitsOf(turn.st, who).forEach(function (u) {
				if (turn.ordersLeft() <= 0 || turn.combat || turn.ordered[u.i] || !ctx.types[u.t].phalanx || !turn.zEnemy[u.h])
					return;
				var want = facingToward(ctx, u.h, enemiesOf(turn, who), u.f);
				if (want !== u.f && ctx.types[u.t].mp >= 2)
					turn.order([u.i], [u.h], want);
			});
		}
		fight(ctx, turn, plan.greed, rng, noise ? 1 : 0);
		return turn;
	}

	var PLANS = [
		{ mode: "advance", groups: 1, greed: 0.5 },
		{ mode: "objective", groups: 1, greed: 0.5 },
		{ mode: "hold", groups: 0.6, greed: 1 },
		{ mode: "advance", groups: 0, greed: -2 },
		{ mode: "advance", groups: 1.4, greed: 0 },
		{ mode: "objective", groups: 0.5, greed: 0 }
	];

	function candidates(ctx, st, who, options) {
		options = options || {};
		var max = options.max || 24;
		var rng = options.rng || function (n) { return Math.floor(Math.random() * n); };
		var seen = {}, list = [];
		function push(turn) {
			var move = turn.toMove();
			var key = JSON.stringify(move);
			if (seen[key]) return;
			seen[key] = true;
			list.push(move);
		}
		// combats seuls, sans bouger
		var still = new R.Turn(ctx, st, who);
		fight(ctx, still, 0.5, rng, 0);
		push(still);
		var tries = 0;
		while (list.length < max && tries < max * 2) {
			var plan = PLANS[tries % PLANS.length];
			var noisy = tries >= PLANS.length;
			push(buildTurn(ctx, st, who, {
				mode: plan.mode, groups: plan.groups, greed: plan.greed,
				noise: noisy ? 6 + (tries % 3) * 4 : 0
			}, rng));
			tries++;
		}
		return list;
	}

	/* ---------- deploiement libre ---------- */

	// une armee pour le budget : general, ligne d'hoplites, ailes, tireurs
	function buyArmy(ctx, rng) {
		var budget = ctx.budget, list = [];
		function cost(k) { return ctx.types[k] ? ctx.types[k].value : 1e9; }
		function count(k) { return list.filter(function (x) { return x === k; }).length; }
		function buy(k) {
			var t = ctx.types[k];
			if (!t || cost(k) > budget || (t.max && count(k) >= t.max)) return false;
			list.push(k);
			budget -= cost(k);
			return true;
		}
		var generals = ctx.typeKeys.filter(function (k) { return ctx.types[k].general; });
		buy(generals[0]);
		var line = ctx.typeKeys.filter(function (k) { return ctx.types[k].phalanx; });
		var horse = ctx.typeKeys.filter(function (k) { return ctx.types[k].mounted && !ctx.types[k].general; });
		var shot = ctx.typeKeys.filter(function (k) { return ctx.types[k].fire; });
		var light = ctx.typeKeys.filter(function (k) { return ctx.types[k].light && !ctx.types[k].fire; });
		var nLine = 3 + rng(3), i;
		for (i = 0; i < nLine && line.length; i++) buy(line[rng(line.length)]);
		var nHorse = 1 + rng(3);
		for (i = 0; i < nHorse && horse.length; i++) buy(horse[rng(horse.length)]);
		for (var guard = 0; guard < 40 && budget > 0; guard++) {
			var pool = [shot, light, horse, line][rng(4)];
			if (!pool.length) continue;
			if (!buy(pool[rng(pool.length)]) && guard > 20) break;
		}
		return list;
	}

	function placements(ctx, st, who, count, rng) {
		rng = rng || function (n) { return Math.floor(Math.random() * n); };
		var zone = ctx.zone[who].filter(function (h) { return ctx.terrains[ctx.terr[h]].cost; });
		var used = {};
		st.u.forEach(function (u) { if (u.h >= 0) used[u.h] = true; });
		zone = zone.filter(function (h) { return !used[h]; });
		var out = [], seenKeys = {};
		for (var attempt = 0; attempt < count * 4 && out.length < count; attempt++) {
			var army = buyArmy(ctx, rng);
			// rangs : 0 = le plus pres de l'ennemi
			var depthOf = function (h) { return R.edgeDistance(ctx, who, h); };
			var maxDepth = 0;
			zone.forEach(function (h) { maxDepth = Math.max(maxDepth, depthOf(h)); });
			var center = Math.floor(ctx.cols / 2) - 3 + rng(7);
			var lateral = function (h) {
				var c = h % ctx.cols;
				return (ctx.home[who] === "est" || ctx.home[who] === "ouest") ? Math.floor(h / ctx.cols) : c;
			};
			var free = zone.slice();
			var take = function (rank, side) {
				// la case libre du rang voulu la plus proche du centre (ou d'une aile)
				var best = -1, bestKey = 1e9;
				free.forEach(function (h, k) {
					var key = Math.abs(depthOf(h) - rank) * 100;
					var lat = lateral(h) - center;
					key += side === 0 ? Math.abs(lat) : side < 0 ? (lat > -3 ? 50 + lat : Math.abs(lat + 6)) : (lat < 3 ? 50 - lat : Math.abs(lat - 6));
					if (key < bestKey) { bestKey = key; best = k; }
				});
				return best >= 0 ? free.splice(best, 1)[0] : -1;
			};
			var front = maxDepth, list = [], wing = 1;
			army.forEach(function (k) {
				var t = ctx.types[k], h;
				if (t.phalanx) h = take(front, 0);
				else if (t.general) h = take(front - 2, 0);
				else if (t.fire) h = take(front - 1, 0);
				else if (t.mounted) { h = take(front, wing); wing = -wing; }
				else { h = take(front, -wing); wing = -wing; }
				if (h >= 0) list.push([k, h]);
			});
			if (R.checkPlacement(ctx, st, who, list))
				continue;
			var key = JSON.stringify(list);
			if (seenKeys[key]) continue;
			seenKeys[key] = true;
			out.push({ p: list });
		}
		return out;
	}

	return {
		WEIGHTS: WEIGHTS,
		evaluate: evaluate, candidates: candidates, placements: placements,
		buildTurn: buildTurn, fight: fight, threatOn: threatOn
	};
})(PeanRules);

if (typeof module === "object" && module && module.exports && typeof Model === "undefined")
	module.exports = PeanAI;
