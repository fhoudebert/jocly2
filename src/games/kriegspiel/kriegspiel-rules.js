/*
 * Le Jeu de la guerre (Guy Debord, Alice Becker-Ho) - moteur de regles.
 *
 * Ce fichier ne depend d'AUCUNE globale Jocly : ce sont des fonctions pures
 * sur un etat serialisable. Il est concatene tel quel dans le modele Jocly
 * (voir index.js, modelScripts) et peut etre charge seul - par les tests de
 * tests/kriegspiel/, ou par un autre habillage (Tauri, HTML5...).
 *
 * Conventions
 *   - plateau 25 colonnes x 20 lignes, pos = ligne*25 + (colonne-1),
 *     ligne A = 0 ; notation "D8" = ligne D, colonne 8 ;
 *   - camps : 1 = Nord (lignes A-J), -1 = Sud (lignes K-T) ;
 *   - etat : { phase, grid, ars, retreat, turn }
 *       phase   0 = le Nord place, 1 = le Sud place, 2 = jeu
 *       grid    500 entiers : 0 = vide, camp * type sinon
 *       ars     4 drapeaux : arsenaux encore debout (2 du Nord, 2 du Sud)
 *       retreat case de l'unite du camp au trait qui doit faire retraite, ou -1
 *       turn    nombre de coups joues (placements compris)
 *   - coup :  { p: { I:[..9], C:[..4], A:[.], AC:[.], T:[.], E:[.] } }
 *       ou    { r: [de,vers], m: [[de,vers]...], a: cible, d: caseArsenal }
 *     r = retraite forcee, m = deplacements, a = attaque, d = case de
 *     l'arsenal detruit pendant le tour (obligatoire quand il y en a un).
 *
 * Les regles sont redigees d'apres celles de Debord, completees par celles
 * de RSG la ou Debord laisse le point ouvert. Aucun texte ni code n'en est
 * repris.
 */
var KriegspielRules = (function () {
	"use strict";

	var W = 25, H = 20, N = W * H;
	var NORTH = 1, SOUTH = -1;
	// les 8 directions, dans le sens horaire a partir du nord
	var DX = [0, 1, 1, 1, 0, -1, -1, -1];
	var DY = [-1, -1, 0, 1, 1, 1, 0, -1];

	var INFANTRY = 1, CAVALRY = 2, ARTILLERY = 3, HORSE_ARTILLERY = 4, SIGNAL = 5, COURIER = 6;
	var CODES = ["", "I", "C", "A", "AC", "T", "E"];
	var NAMES = ["", "infantry", "cavalry", "artillery", "horseArtillery", "signal", "courier"];
	var TYPE_OF_CODE = { I: 1, C: 2, A: 3, AC: 4, T: 5, E: 6 };

	var PLAIN = 0, MOUNTAIN = 1, PASS = 2, FORT = 3;

	var DEFAULT_UNITS = {
		I: { count: 9, move: 1, range: 2, attack: 4, defense: 6, fort: 4, pass: 2 },
		C: { count: 4, move: 2, range: 2, attack: 4, defense: 5, charge: 7 },
		A: { count: 1, move: 1, range: 3, attack: 5, defense: 8, fort: 4, pass: 2 },
		AC: { count: 1, move: 2, range: 3, attack: 5, defense: 8, fort: 4, pass: 2 },
		T: { count: 1, move: 1, range: 2, attack: 0, defense: 1 },
		E: { count: 1, move: 2, range: 2, attack: 0, defense: 1 }
	};

	var DEFAULT_MAP = {
		mountains: ["C10", "C11", "C12", "C13", "D10", "E10", "G10", "H10", "I10",
			"N11", "N12", "N13", "N14", "N15", "N16", "P16", "Q16", "R16"],
		passes: ["F10", "O16"],
		forts: ["B8", "I13", "H21", "M3", "L15", "O23"],
		arsenals: { north: ["D8", "B15"], south: ["T3", "T23"] }
	};

	/* ---------- notation ---------- */

	function posName(pos) {
		return String.fromCharCode(65 + Math.floor(pos / W)) + (pos % W + 1);
	}

	function posOf(name) {
		var m = /^([A-Ta-t])(\d{1,2})$/.exec(name);
		if (!m)
			throw new Error("bad square " + name);
		var row = m[1].toUpperCase().charCodeAt(0) - 65, col = parseInt(m[2], 10);
		if (col < 1 || col > W)
			throw new Error("bad square " + name);
		return row * W + col - 1;
	}

	function rowOf(pos) { return Math.floor(pos / W); }
	function colOf(pos) { return pos % W; }
	function sideOf(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }
	function typeOf(v) { return v < 0 ? -v : v; }
	function territory(pos) { return pos < N / 2 ? NORTH : SOUTH; }
	function distance(a, b) {
		return Math.max(Math.abs(rowOf(a) - rowOf(b)), Math.abs(colOf(a) - colOf(b)));
	}

	/* ---------- contexte : carte et tables, calcules une fois ---------- */

	function makeContext(options) {
		options = options || {};
		var map = options.map || DEFAULT_MAP;
		var units = options.units || DEFAULT_UNITS;
		var ctx = {
			W: W, H: H, N: N,
			terr: new Uint8Array(N),
			arsPos: [], arsSide: [],
			arsAt: new Int8Array(N),      // indice d'arsenal + 1, ou 0
			next: new Int16Array(N * 8),  // voisin dans chaque direction, ou -1
			move: [0], range: [0], attack: [0], defense: [0], count: [0],
			fortBonus: [0], passBonus: [0],
			charge: (units.C && units.C.charge) || 7,
			maxMoves: options.maxMoves || 5,
			maxTurns: options.maxTurns === undefined ? 400 : options.maxTurns,
			isolationVictory: options.isolationVictory === undefined ? true : !!options.isolationVictory
		};
		for (var t = 1; t <= 6; t++) {
			var u = units[CODES[t]];
			ctx.move[t] = u.move; ctx.range[t] = u.range; ctx.attack[t] = u.attack || 0;
			ctx.defense[t] = u.defense; ctx.count[t] = u.count;
			ctx.fortBonus[t] = u.fort || 0; ctx.passBonus[t] = u.pass || 0;
		}
		map.mountains.forEach(function (n) { ctx.terr[posOf(n)] = MOUNTAIN; });
		map.passes.forEach(function (n) { ctx.terr[posOf(n)] = PASS; });
		map.forts.forEach(function (n) { ctx.terr[posOf(n)] = FORT; });
		map.arsenals.north.forEach(function (n) { ctx.arsPos.push(posOf(n)); ctx.arsSide.push(NORTH); });
		map.arsenals.south.forEach(function (n) { ctx.arsPos.push(posOf(n)); ctx.arsSide.push(SOUTH); });
		ctx.arsPos.forEach(function (p, i) { ctx.arsAt[p] = i + 1; });
		for (var pos = 0; pos < N; pos++)
			for (var d = 0; d < 8; d++) {
				var c = colOf(pos) + DX[d], r = rowOf(pos) + DY[d];
				ctx.next[pos * 8 + d] = (c >= 0 && c < W && r >= 0 && r < H) ? r * W + c : -1;
			}
		// distance (en pas de roi, montagnes contournees) a chaque arsenal
		ctx.arsDist = ctx.arsPos.map(function (from) {
			var dist = new Int16Array(N).fill(999), queue = [from], head = 0;
			dist[from] = 0;
			while (head < queue.length) {
				var p = queue[head++];
				for (var d = 0; d < 8; d++) {
					var q = ctx.next[p * 8 + d];
					if (q >= 0 && ctx.terr[q] !== MOUNTAIN && dist[q] === 999) {
						dist[q] = dist[p] + 1;
						queue.push(q);
					}
				}
			}
			return dist;
		});
		return ctx;
	}

	/* ---------- etat ---------- */

	function newState() {
		var grid = new Array(N);
		for (var i = 0; i < N; i++)
			grid[i] = 0;
		return { phase: 0, grid: grid, ars: [1, 1, 1, 1], retreat: -1, turn: 0 };
	}

	function copyState(st) {
		return { phase: st.phase, grid: st.grid.slice(), ars: st.ars.slice(), retreat: st.retreat, turn: st.turn };
	}

	// l'arsenal ENNEMI encore debout qui se trouve sur cette case, ou -1
	function enemyArsenalAt(ctx, st, pos, side) {
		var i = ctx.arsAt[pos] - 1;
		return (i >= 0 && st.ars[i] && ctx.arsSide[i] !== side) ? i : -1;
	}

	/* ---------- communications ---------- */

	/*
	 * Renvoie { lit, on, segs, count, total } pour un camp :
	 *   lit[pos]  la case est sur une ligne de communication du camp
	 *   on[pos]   l'unite du camp qui s'y trouve est en communication
	 *   segs      [source, derniere case atteinte] de chaque rayon (pour la vue)
	 *   count     unites du camp en communication ; total : unites du camp
	 */
	function communications(ctx, st, side, wantSegs) {
		var grid = st.grid, terr = ctx.terr, next = ctx.next;
		var lit = new Uint8Array(N), on = new Uint8Array(N), emitted = new Uint8Array(N);
		var queue = [], segs = wantSegs ? [] : null;
		for (var i = 0; i < ctx.arsPos.length; i++)
			if (ctx.arsSide[i] === side && st.ars[i]) {
				lit[ctx.arsPos[i]] = 1;
				queue.push(ctx.arsPos[i]);
			}
		while (queue.length) {
			var src = queue.pop();
			for (var d = 0; d < 8; d++) {
				var p = src, last = src;
				for (;;) {
					p = next[p * 8 + d];
					if (p < 0 || terr[p] === MOUNTAIN)
						break;
					var v = grid[p];
					if (v !== 0) {
						var enemy = (v > 0) !== (side > 0);
						var signal = (v < 0 ? -v : v) >= SIGNAL;
						// une unite ennemie arrete la ligne AVANT sa case, sauf
						// une unite de transmission, que la ligne traverse
						if (enemy && !signal)
							break;
						if (!enemy && signal && !emitted[p]) {
							emitted[p] = 1;
							queue.push(p);
						}
					}
					lit[p] = 1;
					last = p;
				}
				if (segs && last !== src)
					segs.push([src, last]);
			}
		}
		// unites sur une ligne, puis contact en chaine entre unites combattantes
		var stack = [], count = 0, total = 0, pos;
		for (pos = 0; pos < N; pos++) {
			var u = grid[pos];
			if (u === 0 || (u > 0) !== (side > 0))
				continue;
			total++;
			if (lit[pos]) {
				on[pos] = 1;
				count++;
				if ((u < 0 ? -u : u) < SIGNAL)
					stack.push(pos);
			}
		}
		while (stack.length) {
			pos = stack.pop();
			for (var d2 = 0; d2 < 8; d2++) {
				var q = next[pos * 8 + d2];
				if (q < 0 || on[q])
					continue;
				var w = grid[q];
				if (w !== 0 && (w > 0) === (side > 0) && (w < 0 ? -w : w) < SIGNAL) {
					on[q] = 1;
					count++;
					stack.push(q);
				}
			}
		}
		return { lit: lit, on: on, segs: segs, count: count, total: total };
	}

	/* ---------- deplacement ---------- */

	/*
	 * Cases que l'unite posee en `from` peut atteindre : pas orthogonaux ou
	 * diagonaux par des cases VIDES (ni amie ni ennemie), montagnes exclues,
	 * sur une longueur au plus egale a son mouvement. Une unite combattante
	 * qui entre dans un arsenal ennemi debout s'y arrete (elle le detruit).
	 * Ne dit rien du droit de bouger (communication, 5 deplacements...).
	 */
	function reach(ctx, st, from) {
		var v = st.grid[from];
		if (v === 0)
			return [];
		var side = sideOf(v), type = typeOf(v), combat = type < SIGNAL;
		var seen = {}, frontier = [from], dests = [];
		seen[from] = true;
		for (var step = 0; step < ctx.move[type] && frontier.length; step++) {
			var nextFrontier = [];
			for (var i = 0; i < frontier.length; i++)
				for (var d = 0; d < 8; d++) {
					var q = ctx.next[frontier[i] * 8 + d];
					if (q < 0 || seen[q] || ctx.terr[q] === MOUNTAIN || st.grid[q] !== 0)
						continue;
					seen[q] = true;
					dests.push(q);
					if (!(combat && enemyArsenalAt(ctx, st, q, side) >= 0))
						nextFrontier.push(q);
				}
			frontier = nextFrontier;
		}
		return dests;
	}

	/* ---------- combat ---------- */

	// coefficient defensif d'une unite, bonus de terrain compris
	function defenseAt(ctx, st, pos) {
		var type = typeOf(st.grid[pos]);
		var value = ctx.defense[type];
		if (ctx.terr[pos] === FORT)
			value += ctx.fortBonus[type];
		else if (ctx.terr[pos] === PASS)
			value += ctx.passBonus[type];
		return value;
	}

	/*
	 * Rapport de force sur la case `target`, attaquee par `attSide`.
	 * commA / commD : communications de l'attaquant et du defenseur.
	 * excluded : case de l'unite qui a fait retraite ce tour (n'attaque pas).
	 * Renvoie { att, def, delta, attackers, defenders, charge } ; attackers et
	 * defenders listent [case, valeur], charge le nombre de cavaliers en charge.
	 */
	function strength(ctx, st, target, attSide, commA, commD, excluded, details) {
		var grid = st.grid, terr = ctx.terr, next = ctx.next;
		var att = 0, def = 0, charge = 0;
		var attackers = details ? [] : null, defenders = details ? [] : null;
		if (grid[target] !== 0 && commD.on[target]) {
			def += defenseAt(ctx, st, target);
			if (details) defenders.push([target, def]);
		}
		var chargeAllowed = terr[target] !== FORT && terr[target] !== PASS;
		for (var d = 0; d < 8; d++) {
			var p = target, charging = chargeAllowed;
			for (var k = 1; k <= 4; k++) {
				p = next[p * 8 + d];
				if (p < 0 || terr[p] === MOUNTAIN)
					break;
				var v = grid[p];
				if (v === 0) {
					charging = false;
					continue;
				}
				var type = v < 0 ? -v : v, value;
				if ((v > 0) === (attSide > 0)) {
					var able = type < SIGNAL && commA.on[p] && p !== excluded;
					if (charging && type === CAVALRY && able && terr[p] !== FORT) {
						att += ctx.charge;
						charge++;
						if (details) attackers.push([p, ctx.charge]);
						continue;
					}
					charging = false;
					if (able && k <= ctx.range[type]) {
						att += ctx.attack[type];
						if (details) attackers.push([p, ctx.attack[type]]);
					}
				} else {
					charging = false;
					if (commD.on[p] && k <= ctx.range[type]) {
						value = defenseAt(ctx, st, p);
						def += value;
						if (details) defenders.push([p, value]);
					}
				}
			}
		}
		return { att: att, def: def, delta: att - def, attackers: attackers, defenders: defenders, charge: charge };
	}

	// toutes les attaques qui ont un effet (delta >= 1) pour attSide
	function attacksFor(ctx, st, attSide, commA, commD, excluded) {
		var list = [];
		for (var pos = 0; pos < N; pos++) {
			var v = st.grid[pos];
			if (v === 0 || (v > 0) === (attSide > 0))
				continue;
			var s = strength(ctx, st, pos, attSide, commA, commD, excluded, false);
			if (s.delta >= 1)
				list.push({ target: pos, att: s.att, def: s.def, delta: s.delta, type: typeOf(v) });
		}
		return list;
	}

	/* ---------- le tour, pas a pas ---------- */

	/*
	 * Un tour en cours de construction. Sert a la validation (playTurn), a
	 * l'IA et a la saisie de la vue : memes regles pour tous.
	 * options.inPlace : travaille sur st lui-meme ; options.trusted : ne
	 * revalide pas les deplacements (coups deja valides, chemin de l'IA).
	 */
	function Turn(ctx, st, who, options) {
		options = options || {};
		this.ctx = ctx;
		this.who = who;
		this.st = options.inPlace ? st : copyState(st);
		this.trusted = !!options.trusted;
		this.n = 0;                // deplacements faits, retraite comprise
		this.moved = {};           // cases actuelles des unites deja deplacees
		this.r = undefined;
		this.m = [];
		this.a = undefined;
		this.d = undefined;        // case de l'arsenal detruit ce tour
		this.excluded = -1;        // l'unite qui a fait retraite n'attaque pas
		this.result = null;        // issue de l'attaque
		this.error = null;
		this.needRetreat = this.st.retreat >= 0 && sideOf(this.st.grid[this.st.retreat]) === who;
		if (!this.needRetreat)
			this.st.retreat = -1;
		this._comm = {};
	}

	Turn.prototype.comm = function (side) {
		var c = this._comm[side];
		if (!c)
			c = this._comm[side] = communications(this.ctx, this.st, side, false);
		return c;
	};

	// null si l'unite en `from` a le droit de bouger maintenant, sinon la raison
	Turn.prototype.whyNotMove = function (from) {
		var v = this.st.grid[from];
		if (this.a !== undefined)
			return "attack-done";
		if (v === 0 || sideOf(v) !== this.who)
			return "not-yours";
		if (this.needRetreat && from !== this.st.retreat)
			return "retreat-first";
		if (this.moved[from])
			return "already-moved";
		if (this.n >= this.ctx.maxMoves)
			return "too-many-moves";
		// les unites de transmission se deplacent meme isolees
		if (typeOf(v) < SIGNAL && !this.comm(this.who).on[from])
			return "isolated";
		return null;
	};

	// destinations permises pour l'unite en `from` ([] si elle ne peut pas bouger)
	Turn.prototype.dests = function (from) {
		if (this.whyNotMove(from))
			return [];
		var list = reach(this.ctx, this.st, from);
		if (this.d !== undefined && typeOf(this.st.grid[from]) < SIGNAL) {
			// la destruction d'un arsenal compte comme l'attaque du tour :
			// pas de seconde destruction
			var self = this;
			list = list.filter(function (q) {
				return enemyArsenalAt(self.ctx, self.st, q, self.who) < 0;
			});
		}
		return list;
	};

	Turn.prototype.move = function (from, to) {
		if (!this.trusted) {
			var why = this.whyNotMove(from);
			if (!why && this.dests(from).indexOf(to) < 0)
				why = "unreachable";
			if (why) {
				this.error = why;
				return false;
			}
		}
		var st = this.st, v = st.grid[from];
		st.grid[from] = 0;
		st.grid[to] = v;
		if (typeOf(v) < SIGNAL) {
			var ai = enemyArsenalAt(this.ctx, st, to, this.who);
			if (ai >= 0) {
				st.ars[ai] = 0;
				this.d = to;
			}
		}
		this.moved[to] = true;
		this.n++;
		if (this.needRetreat) {
			this.r = [from, to];
			this.excluded = to;
			this.needRetreat = false;
			st.retreat = -1;
		} else
			this.m.push([from, to]);
		this._comm = {};
		return true;
	};

	// les attaques possibles maintenant (delta >= 1)
	Turn.prototype.attacks = function () {
		if (this.a !== undefined || this.d !== undefined || this.needRetreat)
			return [];
		return attacksFor(this.ctx, this.st, this.who, this.comm(this.who), this.comm(-this.who), this.excluded);
	};

	// le rapport de force sur une case, avec le detail des contributions
	Turn.prototype.strength = function (target, attSide) {
		if (attSide === undefined)
			attSide = this.who;
		return strength(this.ctx, this.st, target, attSide, this.comm(attSide), this.comm(-attSide),
			attSide === this.who ? this.excluded : -1, true);
	};

	// ce que donnerait l'attaque : "destroy", "retreat" ou null (sans effet)
	Turn.prototype.outcomeOf = function (target, delta) {
		if (delta < 1)
			return null;
		if (delta >= 2)
			return "destroy";
		// retraite forcee ; l'unite qui ne peut pas la faire est detruite
		var v = this.st.grid[target];
		var canMove = typeOf(v) >= SIGNAL || this.comm(-this.who).on[target];
		if (!canMove || reach(this.ctx, this.st, target).length === 0)
			return "destroy";
		return "retreat";
	};

	Turn.prototype.attack = function (target) {
		var why = null, st = this.st, v = st.grid[target];
		if (this.a !== undefined)
			why = "attack-done";
		else if (this.d !== undefined)
			why = "arsenal-destroyed";
		else if (this.needRetreat)
			why = "retreat-first";
		else if (v === undefined || v === 0 || sideOf(v) === this.who)
			why = "no-target";
		if (why) {
			this.error = why;
			return false;
		}
		var s = strength(this.ctx, st, target, this.who, this.comm(this.who), this.comm(-this.who), this.excluded, false);
		var outcome = this.outcomeOf(target, s.delta);
		if (!outcome) {
			this.error = "no-effect";
			return false;
		}
		this.a = target;
		this.result = { target: target, att: s.att, def: s.def, delta: s.delta, outcome: outcome, unit: v };
		if (outcome === "destroy")
			st.grid[target] = 0;
		else
			st.retreat = target;
		this._comm = {};
		return true;
	};

	Turn.prototype.finish = function () {
		if (this.needRetreat) {
			this.error = "retreat-first";
			return false;
		}
		this.st.turn++;
		return true;
	};

	Turn.prototype.toMove = function () {
		var move = { m: this.m.map(function (s) { return [s[0], s[1]]; }) };
		if (this.r)
			move.r = [this.r[0], this.r[1]];
		if (this.a !== undefined)
			move.a = this.a;
		if (this.d !== undefined)
			move.d = this.d;
		return move;
	};

	/* ---------- placement ---------- */

	function checkPlacement(ctx, st, who, p) {
		if (!p || typeof p !== "object")
			return "no-placement";
		var used = {};
		for (var t = 1; t <= 6; t++) {
			var list = p[CODES[t]];
			if (!Array.isArray(list) || list.length !== ctx.count[t])
				return "bad-count";
			for (var i = 0; i < list.length; i++) {
				var pos = list[i];
				if (typeof pos !== "number" || pos !== Math.floor(pos) || pos < 0 || pos >= N)
					return "bad-square";
				if (territory(pos) !== who)
					return "outside-territory";
				if (ctx.terr[pos] === MOUNTAIN)
					return "mountain";
				if (st.grid[pos] !== 0 || used[pos])
					return "occupied";
				used[pos] = true;
			}
		}
		for (var key in p)
			if (!TYPE_OF_CODE[key])
				return "bad-unit";
		return null;
	}

	/* ---------- un coup complet ---------- */

	/*
	 * Joue un coup. Renvoie { ok, error, state, turn }. Par defaut l'etat
	 * fourni n'est pas modifie ; options.inPlace le modifie, options.trusted
	 * saute les verifications de deplacement (coup deja valide).
	 */
	function playTurn(ctx, st, who, move, options) {
		options = options || {};
		function fail(error) { return { ok: false, error: error }; }
		if (!move || typeof move !== "object")
			return fail("no-move");
		if (st.phase < 2) {
			if ((st.phase === 0) !== (who === NORTH))
				return fail("wrong-side");
			if (!options.trusted) {
				var why = checkPlacement(ctx, st, who, move.p);
				if (why)
					return fail(why);
				if (move.m !== undefined || move.r !== undefined || move.a !== undefined || move.d !== undefined)
					return fail("bad-move");
			}
			var out = options.inPlace ? st : copyState(st);
			for (var t = 1; t <= 6; t++)
				move.p[CODES[t]].forEach(function (pos) { out.grid[pos] = who * t; });
			out.phase++;
			out.turn++;
			return { ok: true, state: out, turn: null };
		}
		if (move.p !== undefined)
			return fail("bad-move");
		var turn = new Turn(ctx, st, who, options);
		function pair(x) {
			return Array.isArray(x) && x.length === 2 && typeof x[0] === "number" && typeof x[1] === "number" &&
				x[0] >= 0 && x[0] < N && x[1] >= 0 && x[1] < N && x[0] === Math.floor(x[0]) && x[1] === Math.floor(x[1]);
		}
		if (turn.needRetreat) {
			if (!pair(move.r) || move.r[0] !== st.retreat)
				return fail("retreat-first");
			if (!turn.move(move.r[0], move.r[1]))
				return fail(turn.error);
		} else if (move.r !== undefined)
			return fail("no-retreat-due");
		var moves = move.m === undefined ? [] : move.m;
		if (!Array.isArray(moves))
			return fail("bad-move");
		for (var i = 0; i < moves.length; i++) {
			if (!pair(moves[i]))
				return fail("bad-move");
			if (!turn.move(moves[i][0], moves[i][1]))
				return fail(turn.error);
		}
		if (move.a !== undefined) {
			if (typeof move.a !== "number" || !turn.attack(move.a))
				return fail(turn.error || "no-target");
		}
		if (!options.trusted && move.d !== turn.d)
			return fail("bad-arsenal-flag");
		if (!turn.finish())
			return fail(turn.error);
		return { ok: true, state: turn.st, turn: turn };
	}

	/* ---------- fin de partie ---------- */

	// pourquoi ce camp a perdu, ou null
	function lossReason(ctx, st, side) {
		var arsenals = 0, combat = 0, signals = 0, i;
		for (i = 0; i < ctx.arsPos.length; i++)
			if (ctx.arsSide[i] === side && st.ars[i])
				arsenals++;
		if (arsenals === 0)
			return "arsenals";
		for (i = 0; i < N; i++) {
			var v = st.grid[i];
			if (v !== 0 && (v > 0) === (side > 0)) {
				if (typeOf(v) < SIGNAL) combat++; else signals++;
			}
		}
		if (combat === 0)
			return "annihilated";
		if (ctx.isolationVictory && signals === 0 && communications(ctx, st, side, false).count === 0)
			return "isolated";
		return null;
	}

	/*
	 * Issue de la partie apres le coup de `mover` :
	 * { winner: 0 | 1 | -1 | 2 (nulle), reason }.
	 */
	function outcome(ctx, st, mover) {
		if (st.phase < 2)
			return { winner: 0, reason: null };
		var reason = lossReason(ctx, st, -mover);
		if (reason)
			return { winner: mover, reason: reason };
		reason = lossReason(ctx, st, mover);
		if (reason)
			return { winner: -mover, reason: reason };
		if (ctx.maxTurns && st.turn >= ctx.maxTurns)
			return { winner: 2, reason: "max-turns" };
		return { winner: 0, reason: null };
	}

	/* ---------- notation d'un coup ---------- */

	function moveToString(move) {
		var parts = [];
		if (move.p) {
			var first = null, items = [];
			for (var t = 1; t <= 6; t++)
				(move.p[CODES[t]] || []).forEach(function (pos) {
					if (first === null) first = pos;
					items.push(CODES[t] + "@" + posName(pos));
				});
			return (first !== null && territory(first) === SOUTH ? "Sud: " : "Nord: ") + items.join(",");
		}
		var flagged = false;
		function step(s) {
			var text = posName(s[0]) + "-" + posName(s[1]);
			if (!flagged && move.d !== undefined && s[1] === move.d) {
				flagged = true;
				text += "!";
			}
			return text;
		}
		if (move.r)
			parts.push("r:" + step(move.r));
		(move.m || []).forEach(function (s) { parts.push(step(s)); });
		if (move.a !== undefined)
			parts.push("x" + posName(move.a));
		return parts.length ? parts.join(" ") : "-";
	}

	// le coup reduit a ce que les regles lisent, dans un ordre fixe (comparaison)
	function playableMove(move) {
		if (!move || typeof move !== "object")
			return move;
		var out = {};
		if (move.p !== undefined) out.p = move.p;
		if (move.r !== undefined) out.r = move.r;
		if (move.p === undefined) out.m = move.m === undefined ? [] : move.m;
		if (move.a !== undefined) out.a = move.a;
		if (move.d !== undefined) out.d = move.d;
		return out;
	}

	var api = {
		W: W, H: H, N: N, NORTH: NORTH, SOUTH: SOUTH,
		INFANTRY: INFANTRY, CAVALRY: CAVALRY, ARTILLERY: ARTILLERY,
		HORSE_ARTILLERY: HORSE_ARTILLERY, SIGNAL: SIGNAL, COURIER: COURIER,
		PLAIN: PLAIN, MOUNTAIN: MOUNTAIN, PASS: PASS, FORT: FORT,
		CODES: CODES, NAMES: NAMES, TYPE_OF_CODE: TYPE_OF_CODE,
		DEFAULT_MAP: DEFAULT_MAP, DEFAULT_UNITS: DEFAULT_UNITS,
		posName: posName, posOf: posOf, rowOf: rowOf, colOf: colOf,
		sideOf: sideOf, typeOf: typeOf, territory: territory, distance: distance,
		makeContext: makeContext, newState: newState, copyState: copyState,
		enemyArsenalAt: enemyArsenalAt,
		communications: communications, reach: reach,
		defenseAt: defenseAt, strength: strength, attacksFor: attacksFor,
		Turn: Turn, checkPlacement: checkPlacement, playTurn: playTurn,
		lossReason: lossReason, outcome: outcome, moveToString: moveToString, playableMove: playableMove
	};
	return api;
})();

// charge seul (tests, autre habillage) : dans Jocly, `Model` existe deja et le
// fichier est concatene dans un module dont il ne faut pas ecraser l'export
if (typeof module === "object" && module && module.exports && typeof Model === "undefined")
	module.exports = KriegspielRules;
