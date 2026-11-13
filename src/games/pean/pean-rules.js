/*
 * Péan - moteur de regles d'un wargame tactique a hexagones, a deux joueurs,
 * sans hasard et a information complete.
 *
 * Inspire d'Heraklios (F. Marcela-Froideval, Jeux & Strategie, 1980) pour le
 * genre : hexagones, zones de controle, rapport de forces, charge, tir. Les
 * regles, les valeurs et la table de combat sont propres a ce module.
 *
 * Ce fichier ne depend d'AUCUNE globale Jocly : fonctions pures sur un etat
 * serialisable. Il est concatene dans le modele Jocly (index.js,
 * modelScripts) et peut etre charge seul (tests, futur portage Rust).
 *
 * Le moteur est GENERIQUE : tout ce qui distingue une bataille d'une autre
 * (carte, terrains, cotes d'hexagone, types d'unites, armees, renforts,
 * objectifs, options) vient du scenario (scenarios/*.json). Les types
 * d'unites sont composes a partir d'un vocabulaire ferme de TRAITS, seul
 * point ou une nouvelle regle demande du code.
 *
 * Conventions
 *   - carte rectangulaire cols x rows d'hexagones a sommet plat, colonnes
 *     impaires decalees vers le bas (« odd-q ») ; hex = row*cols + col ;
 *     dans les scenarios, un hexagone s'ecrit "col,row" (base 0) ; dans la
 *     notation, lettre(s) de colonne + numero de ligne (« J5 ») ;
 *   - directions 0..5 = N, NE, SE, S, SO, NO (sens horaire) ;
 *   - camps : 1 = le camp qui joue en premier, -1 = l'autre ;
 *   - force, mouvement et couts : en demi-points en interne (route = 1/2) ;
 *   - etat : { phase, turn, played, u, ctrl, hold, hs }
 *       phase   0 = deploiement libre du camp 1, 1 = du camp -1, 2 = jeu
 *       turn    coups Jocly joues (deploiements compris)
 *       played  tours de jeu joues (phase 2)
 *       u       unites : { i, s, t, h, p, f, a }
 *               i identifiant (= indice), s camp, t type, h hexagone
 *               (-1 detruite, -2 renfort pas encore arrive), p pas restants,
 *               f orientation (0..5, phalanges avec l'option « orientation »,
 *               -1 sinon), a tour d'arrivee d'un renfort (0 sinon)
 *       ctrl    camp qui controle chaque objectif (0 : personne)
 *       hold    tours consecutifs de tenue de chaque objectif
 *       hs      camp qui tient (hold) chaque objectif
 *   - coup :
 *       { p: [[type, hex], ...] }                      deploiement libre
 *       { o: [{ u: [ids], c: [hexes], f: dir }, ...],  ordres (mouvements)
 *         k: [{ a: [ids], t: id, v: id }, ...] }       combats
 *     o : chaque ordre active une unite ou un groupe ; c est le chemin du
 *     premier de u (le meneur), depart compris ; les autres membres du groupe
 *     suivent par translation. f (facultatif) : orientation finale d'une
 *     phalange. k : combats dans l'ordre ; a = attaquants, t = cible,
 *     v = attaquant qui avance dans l'hexagone libere (facultatif).
 */
var PeanRules = (function () {
	"use strict";

	var FIRST = 1, SECOND = -1;
	// directions axiales (q, r), sommet plat : N, NE, SE, S, SO, NO
	var DQ = [0, 1, 1, 0, -1, -1];
	var DR = [-1, -1, 0, 1, 1, 0];
	var DIR_NAMES = ["N", "NE", "SE", "S", "SO", "NO"];
	var DEAD = -1, PENDING = -2;

	/* ---------- vocabulaire ferme ---------- */

	// traits d'unites implementes par le noyau
	var TRAITS = {
		phalange: true,   // profondeur, flancs (options), immunise contre la charge de face
		leger: true,      // ignore le surcout des terrains difficiles
		tir: true,        // attaque a exactement 2 hexagones, en ligne de vue
		monte: true,      // cout de terrain « monte » (cavalerie)
		desengage: true,  // peut quitter une zone de controle ennemie
		charge: true,     // double sa force apres une course droite
		general: true     // donne des ordres ; sa perte coute cher
	};

	// options de scenario
	var OPTIONS = { orientation: true, profondeur: true, charge: true };

	var DEFAULT_TERRAINS = {
		// cout : par classe de mouvement, en points (null : infranchissable)
		plaine: { cout: { pied: 1, monte: 1 }, def: 1 },
		route: { cout: { pied: 1, monte: 1 }, def: 1, route: true },
		colline: { cout: { pied: 2, monte: 2 }, def: 1.5, pasDeCharge: true, hauteur: 1 },
		foret: { cout: { pied: 2, monte: 3 }, def: 1.5, pasDeCharge: true, desordre: true },
		marais: { cout: { pied: 2, monte: 3 }, def: 1.5, pasDeCharge: true, desordre: true },
		ville: { cout: { pied: 1, monte: 1 }, def: 2 },
		camp: { cout: { pied: 1, monte: 1 }, def: 2 },
		montagne: { cout: null, bloqueTir: true },
		mer: { cout: null, bloqueTir: true }
	};

	// obstacles poses sur les cotes d'hexagone
	var DEFAULT_SIDES = {
		riviere: { cout: 2, attaque: 0.5, coupeZdc: true },
		gue: { cout: 1, attaque: 0.5, coupeZdc: false },
		mur: { cout: 1, attaque: 0.5, coupeZdc: false }
	};

	// caracteres des cartes en texte (carte.lignes)
	var DEFAULT_LEGEND = {
		".": "plaine", "=": "route", "c": "colline", "f": "foret", "m": "marais",
		"v": "ville", "k": "camp", "M": "montagne", "~": "mer"
	};

	var DEFAULT_TYPES = {
		hoplite: { code: "H", force: 6, mvt: 3, pas: 2, cout: 20, traits: ["phalange"],
			nom: { fr: "Hoplites", en: "Hoplites" } },
		peltaste: { code: "P", force: 3, mvt: 5, pas: 2, cout: 10, traits: ["leger"],
			nom: { fr: "Peltastes", en: "Peltasts" } },
		archer: { code: "A", force: 2, mvt: 4, pas: 2, cout: 10, traits: ["tir"],
			nom: { fr: "Archers", en: "Archers" } },
		frondeur: { code: "F", force: 2, mvt: 4, pas: 2, cout: 8, traits: ["tir", "leger"],
			nom: { fr: "Frondeurs", en: "Slingers" } },
		cavlegere: { code: "Cl", force: 3, mvt: 8, pas: 2, cout: 12, traits: ["monte", "desengage"],
			nom: { fr: "Cavalerie légère", en: "Light cavalry" } },
		cavlourde: { code: "Cv", force: 5, mvt: 6, pas: 2, cout: 20, traits: ["monte", "charge"],
			nom: { fr: "Cavalerie lourde", en: "Heavy cavalry" } },
		general: { code: "G", force: 1, mvt: 8, pas: 1, cout: 25, traits: ["monte", "general"],
			nom: { fr: "Général", en: "General" } }
	};

	var EDGES = ["sud", "nord", "est", "ouest"];

	/* ---------- outils ---------- */

	function clone(x) { return JSON.parse(JSON.stringify(x)); }

	function has(list, x) { return list.indexOf(x) >= 0; }

	function sideOfCamp(ctx, key) { return ctx.campSide[key] || 0; }

	/* ---------- contexte (scenario compile) ---------- */

	function parseHex(ctx, text) {
		if (typeof text === "number")
			return text;
		var m = /^\s*(\d+)\s*,\s*(\d+)\s*$/.exec(String(text));
		if (!m)
			throw new Error("hexagone illisible : " + text);
		var c = parseInt(m[1], 10), r = parseInt(m[2], 10);
		if (c >= ctx.cols || r >= ctx.rows)
			throw new Error("hexagone hors carte : " + text);
		return r * ctx.cols + c;
	}

	// "rows:13-15", "cols:0-3", "rect:2-5,10-12" (cols, rows) ou liste "c,r"
	function parseZone(ctx, spec) {
		var cells = [], i;
		function rect(c0, c1, r0, r1) {
			for (var r = r0; r <= r1; r++)
				for (var c = c0; c <= c1; c++)
					if (c >= 0 && c < ctx.cols && r >= 0 && r < ctx.rows)
						cells.push(r * ctx.cols + c);
		}
		(Array.isArray(spec) ? spec : [spec]).forEach(function (part) {
			var m;
			if (typeof part === "number") cells.push(part);
			else if ((m = /^rows:(\d+)-(\d+)$/.exec(part))) rect(0, ctx.cols - 1, +m[1], +m[2]);
			else if ((m = /^cols:(\d+)-(\d+)$/.exec(part))) rect(+m[1], +m[2], 0, ctx.rows - 1);
			else if ((m = /^rect:(\d+)-(\d+),(\d+)-(\d+)$/.exec(part))) rect(+m[1], +m[2], +m[3], +m[4]);
			else cells.push(parseHex(ctx, part));
		});
		var seen = {}, out = [];
		for (i = 0; i < cells.length; i++)
			if (!seen[cells[i]]) {
				seen[cells[i]] = true;
				out.push(cells[i]);
			}
		return out;
	}

	function dirOf(name, fallback) {
		if (typeof name === "number") return ((name % 6) + 6) % 6;
		var k = DIR_NAMES.indexOf(String(name || "").toUpperCase().replace("W", "O"));
		return k >= 0 ? k : fallback;
	}

	/*
	 * Verifie un scenario. Renvoie la liste des erreurs (vide s'il est bon).
	 */
	function validateScenario(sc) {
		var errors = [];
		try {
			makeContext({ scenario: sc });
		} catch (e) {
			errors.push(e.message);
		}
		return errors;
	}

	function makeContext(options) {
		options = options || {};
		var sc = options.scenario;
		if (!sc || typeof sc !== "object")
			throw new Error("pas de scenario");
		var map = sc.carte || {};
		var ctx = {
			id: sc.id || "?",
			scenario: sc,
			cols: map.cols | 0, rows: map.rows | 0,
			options: {}, tours: sc.tours || 12,
			rupture: sc.rupture !== undefined ? sc.rupture : 0.5,
			nulle: sc.nulle !== undefined ? sc.nulle : 0,
			chargeMin: sc.chargeMin || 3,
			orders: { base: 4, parGeneral: 1 },
			campSide: {}, camps: {}, home: {}, zone: {},
			free: !!(sc.deploiement && sc.deploiement.libre),
			budget: (sc.deploiement && sc.deploiement.budget) || 0,
			table: compileTable(sc.table)
		};
		if (ctx.cols < 4 || ctx.rows < 4 || ctx.cols > 60 || ctx.rows > 60)
			throw new Error("carte : cols et rows entre 4 et 60");
		var N = ctx.N = ctx.cols * ctx.rows;
		if (sc.ordres) {
			if (sc.ordres.base !== undefined) ctx.orders.base = sc.ordres.base;
			if (sc.ordres.parGeneral !== undefined) ctx.orders.parGeneral = sc.ordres.parGeneral;
		}
		(sc.options || []).forEach(function (o) {
			if (!OPTIONS[o])
				throw new Error("option inconnue : " + o);
			ctx.options[o] = true;
		});

		/* geometrie : coordonnees axiales et voisins */
		var aq = ctx.aq = new Int16Array(N), ar = ctx.ar = new Int16Array(N);
		var h, d, c, r;
		for (h = 0; h < N; h++) {
			c = h % ctx.cols;
			r = Math.floor(h / ctx.cols);
			aq[h] = c;
			ar[h] = r - ((c - (c & 1)) >> 1);
		}
		var nb = ctx.nb = new Int16Array(N * 6);
		for (h = 0; h < N; h++)
			for (d = 0; d < 6; d++)
				nb[h * 6 + d] = hexAt(ctx, aq[h] + DQ[d], ar[h] + DR[d]);

		/* terrains */
		var terrains = clone(DEFAULT_TERRAINS);
		Object.keys(sc.terrains || {}).forEach(function (k) {
			terrains[k] = Object.assign(terrains[k] || {}, sc.terrains[k]);
		});
		ctx.terrainNames = Object.keys(terrains);
		ctx.terrains = ctx.terrainNames.map(function (k) {
			var t = terrains[k];
			return {
				name: k,
				cost: t.cout ? { pied: Math.round(t.cout.pied * 2), monte: Math.round(t.cout.monte * 2) } : null,
				def: t.def || 1, noCharge: !!t.pasDeCharge, disorder: !!t.desordre,
				blocksFire: !!t.bloqueTir, road: !!t.route, height: t.hauteur || 0
			};
		});
		var terrainIndex = {};
		ctx.terrainNames.forEach(function (k, i) { terrainIndex[k] = i; });
		var terr = ctx.terr = new Uint8Array(N);
		var base = terrainIndex[map.defaut || "plaine"];
		if (base === undefined)
			throw new Error("terrain par defaut inconnu : " + map.defaut);
		for (h = 0; h < N; h++) terr[h] = base;
		if (map.lignes) {
			var legend = Object.assign({}, DEFAULT_LEGEND, map.legende || {});
			if (map.lignes.length !== ctx.rows)
				throw new Error("carte.lignes : " + ctx.rows + " lignes attendues");
			map.lignes.forEach(function (line, row) {
				var chars = line.replace(/\s+/g, "");
				if (chars.length !== ctx.cols)
					throw new Error("carte.lignes[" + row + "] : " + ctx.cols + " caracteres attendus, " + chars.length + " trouves");
				for (var col = 0; col < ctx.cols; col++) {
					var name = legend[chars.charAt(col)];
					if (name === undefined || terrainIndex[name] === undefined)
						throw new Error("carte.lignes[" + row + "] : caractere inconnu " + chars.charAt(col));
					terr[row * ctx.cols + col] = terrainIndex[name];
				}
			});
		}
		Object.keys(map.terrain || {}).forEach(function (k) {
			if (terrainIndex[k] === undefined)
				throw new Error("terrain inconnu : " + k);
			parseZone(ctx, map.terrain[k]).forEach(function (hh) { terr[hh] = terrainIndex[k]; });
		});

		/* cotes d'hexagone */
		var sides = clone(DEFAULT_SIDES);
		Object.keys(sc.cotes || {}).forEach(function (k) {
			sides[k] = Object.assign(sides[k] || {}, sc.cotes[k]);
		});
		ctx.sideNames = Object.keys(sides);
		ctx.sides = ctx.sideNames.map(function (k) {
			var s = sides[k];
			return { name: k, cost: Math.round((s.cout || 0) * 2), attack: s.attaque !== undefined ? s.attaque : 1, cutsZoc: !!s.coupeZdc };
		});
		var edge = ctx.edge = new Uint8Array(N * 6);   // 0 : rien, sinon indice + 1
		Object.keys(map.cotes || {}).forEach(function (k) {
			var si = ctx.sideNames.indexOf(k);
			if (si < 0)
				throw new Error("cote inconnu : " + k);
			map.cotes[k].forEach(function (pair) {
				var a = parseHex(ctx, pair[0]), b = parseHex(ctx, pair[1]);
				var dd = dirBetween(ctx, a, b);
				if (dd < 0)
					throw new Error("cote " + k + " : " + pair[0] + " et " + pair[1] + " ne sont pas voisins");
				edge[a * 6 + dd] = si + 1;
				edge[b * 6 + (dd + 3) % 6] = si + 1;
			});
		});

		/* types d'unites */
		var types = clone(DEFAULT_TYPES);
		Object.keys(sc.types || {}).forEach(function (k) {
			types[k] = Object.assign(types[k] || {}, sc.types[k]);
		});
		ctx.types = {};
		Object.keys(types).forEach(function (k) {
			var t = types[k];
			(t.traits || []).forEach(function (tr) {
				if (!TRAITS[tr])
					throw new Error("type " + k + " : trait inconnu " + tr);
			});
			if (!(t.force >= 0) || !(t.mvt > 0) || !(t.pas >= 1))
				throw new Error("type " + k + " : force, mvt et pas requis");
			ctx.types[k] = {
				key: k, code: t.code || k.charAt(0).toUpperCase(), nom: t.nom || { fr: k, en: k },
				force: t.force, mp: Math.round(t.mvt * 2), steps: t.pas, value: t.cout || 10, max: t.max || 0,
				traits: (t.traits || []).slice(),
				phalanx: has(t.traits || [], "phalange"), light: has(t.traits || [], "leger"),
				fire: has(t.traits || [], "tir"), mounted: has(t.traits || [], "monte"),
				disengage: has(t.traits || [], "desengage"), charge: has(t.traits || [], "charge"),
				general: has(t.traits || [], "general")
			};
		});
		ctx.typeKeys = Object.keys(ctx.types);

		/* camps */
		var keys = Object.keys(sc.camps || {});
		if (keys.length !== 2)
			throw new Error("deux camps attendus");
		var first = sc.premierJoueur || keys[0];
		if (keys.indexOf(first) < 0)
			throw new Error("premierJoueur inconnu : " + first);
		ctx.campSide[first] = FIRST;
		ctx.campSide[keys[0] === first ? keys[1] : keys[0]] = SECOND;
		ctx.campKey = {};
		keys.forEach(function (k) {
			var side = ctx.campSide[k], camp = sc.camps[k];
			ctx.campKey[side] = k;
			var bord = camp.bord || (side === FIRST ? "sud" : "nord");
			if (EDGES.indexOf(bord) < 0)
				throw new Error("camp " + k + " : bord inconnu " + bord);
			ctx.home[side] = bord;
			ctx.camps[side] = {
				key: k, nom: camp.nom || { fr: k, en: k }, couleur: camp.couleur || null, bord: bord,
				// noms d'images (res/images/emblemes/, res/images/bannieres/) : la vue seule s'en sert
				emblem: camp.embleme || null, banner: camp.banniere || null,
				facing: dirOf(camp.face, { sud: 0, nord: 3, est: 5, ouest: 2 }[bord])
			};
			ctx.zone[side] = camp.zone ? parseZone(ctx, camp.zone) : [];
		});

		/* armees : unites initiales et renforts */
		var units = [];
		ctx.initial = units;
		[FIRST, SECOND].forEach(function (side) {
			var camp = sc.camps[ctx.campKey[side]];
			(camp.unites || []).forEach(function (spec) {
				units.push(newUnit(ctx, units.length, side, spec, 0));
			});
			(camp.renforts || []).forEach(function (spec) {
				if (!(spec.tour >= 1))
					throw new Error("renfort sans tour");
				units.push(newUnit(ctx, units.length, side, spec, spec.tour));
			});
		});
		// noms propres et emblemes facultatifs (generaux, allies...), hors de l'etat
		ctx.unitNames = [];
		ctx.unitEmblems = [];
		[FIRST, SECOND].forEach(function (side) {
			var camp = sc.camps[ctx.campKey[side]];
			(camp.unites || []).concat(camp.renforts || []).forEach(function (spec) {
				ctx.unitNames.push(spec.nom || null);
				ctx.unitEmblems.push(spec.embleme || null);
			});
		});
		var seen = {};
		units.forEach(function (u) {
			if (u.a) return;
			if (seen[u.h])
				throw new Error("deux unites sur " + hexName(ctx, u.h));
			seen[u.h] = true;
		});
		if (!ctx.free)
			[FIRST, SECOND].forEach(function (side) {
				if (!units.some(function (u) { return u.s === side; }))
					throw new Error("camp " + ctx.campKey[side] + " sans unite");
			});

		/* objectifs */
		ctx.objectives = (sc.objectifs || []).map(function (o) {
			return {
				hex: parseHex(ctx, o.hex), points: o.points || 0,
				owner: o.camp ? sideOfCamp(ctx, o.camp) : 0,
				only: o.pour ? sideOfCamp(ctx, o.pour) : 0,
				immediate: !!o.immediat, hold: o.tenir || 1, nom: o.nom || null
			};
		});
		ctx.objAt = new Int16Array(N);
		ctx.objectives.forEach(function (o, i) { ctx.objAt[o.hex] = i + 1; });
		return ctx;
	}

	function newUnit(ctx, id, side, spec, arrival) {
		var t = ctx.types[spec.type];
		if (!t)
			throw new Error("type d'unite inconnu : " + spec.type);
		var h = parseHex(ctx, spec.hex);
		var tc = ctx.terrains[ctx.terr[h]];
		if (!tc.cost)
			throw new Error("unite sur un terrain infranchissable : " + spec.hex);
		var steps = spec.pas || t.steps;
		var facing = -1;
		if (t.phalanx && ctx.options.orientation)
			facing = dirOf(spec.face, ctx.camps[side].facing);
		return { i: id, s: side, t: spec.type, h: arrival ? PENDING : h, p: steps, f: facing, a: arrival || 0, e: arrival ? h : -1 };
	}

	/* ---------- geometrie ---------- */

	function hexAt(ctx, q, r) {
		var c = q;
		if (c < 0 || c >= ctx.cols)
			return -1;
		var row = r + ((c - (c & 1)) >> 1);
		if (row < 0 || row >= ctx.rows)
			return -1;
		return row * ctx.cols + c;
	}

	function distance(ctx, a, b) {
		var dq = ctx.aq[a] - ctx.aq[b], dr = ctx.ar[a] - ctx.ar[b];
		return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
	}

	function dirBetween(ctx, a, b) {
		for (var d = 0; d < 6; d++)
			if (ctx.nb[a * 6 + d] === b)
				return d;
		return -1;
	}

	function colName(c) {
		var s = "";
		c++;
		while (c > 0) {
			var m = (c - 1) % 26;
			s = String.fromCharCode(65 + m) + s;
			c = Math.floor((c - 1) / 26);
		}
		return s;
	}

	function hexName(ctx, h) {
		if (h < 0) return "-";
		return colName(h % ctx.cols) + (Math.floor(h / ctx.cols) + 1);
	}

	function hexOf(ctx, name) {
		var m = /^([A-Z]+)(\d+)$/.exec(String(name).toUpperCase());
		if (!m) throw new Error("hexagone illisible : " + name);
		var c = 0;
		for (var i = 0; i < m[1].length; i++) c = c * 26 + (m[1].charCodeAt(i) - 64);
		c--;
		var r = parseInt(m[2], 10) - 1;
		if (c < 0 || c >= ctx.cols || r < 0 || r >= ctx.rows) throw new Error("hors carte : " + name);
		return r * ctx.cols + c;
	}

	// distance d'un hexagone au bord de son camp
	function edgeDistance(ctx, side, h) {
		var c = h % ctx.cols, r = Math.floor(h / ctx.cols);
		switch (ctx.home[side]) {
			case "sud": return ctx.rows - 1 - r;
			case "nord": return r;
			case "est": return ctx.cols - 1 - c;
			default: return c;
		}
	}

	// ligne de vue a 2 hexagones : au moins un voisin commun libre et ouvert
	function lineOfFire(ctx, occ, a, b) {
		if (distance(ctx, a, b) !== 2)
			return false;
		for (var d = 0; d < 6; d++) {
			var m = ctx.nb[a * 6 + d];
			if (m < 0 || distance(ctx, m, b) !== 1)
				continue;
			if (occ[m] === 0 && !ctx.terrains[ctx.terr[m]].blocksFire)
				return true;
		}
		return false;
	}

	/* ---------- etat ---------- */

	function newState(ctx) {
		var st = {
			phase: ctx.free ? 0 : 2, turn: 0, played: 0,
			u: clone(ctx.initial),
			ctrl: ctx.objectives.map(function (o) { return o.owner; }),
			hold: ctx.objectives.map(function () { return 0; }),
			hs: ctx.objectives.map(function () { return 0; })
		};
		return st;
	}

	function copyState(st) {
		return {
			phase: st.phase, turn: st.turn, played: st.played,
			u: st.u.map(function (u) { return { i: u.i, s: u.s, t: u.t, h: u.h, p: u.p, f: u.f, a: u.a, e: u.e }; }),
			ctrl: st.ctrl.slice(), hold: st.hold.slice(), hs: st.hs.slice()
		};
	}

	// le camp au trait, d'apres l'etat
	function toMove(st) {
		if (st.phase < 2) return st.phase === 0 ? FIRST : SECOND;
		return st.played % 2 === 0 ? FIRST : SECOND;
	}

	function round(st) { return Math.floor(st.played / 2) + 1; }

	// occupation : indice d'unite + 1 par hexagone
	function occupancy(ctx, st) {
		var occ = new Int16Array(ctx.N);
		for (var i = 0; i < st.u.length; i++)
			if (st.u[i].h >= 0)
				occ[st.u[i].h] = i + 1;
		return occ;
	}

	// zone de controle exercee par les unites du camp `side`
	function zoc(ctx, st, side) {
		var z = new Uint8Array(ctx.N);
		for (var i = 0; i < st.u.length; i++) {
			var u = st.u[i];
			if (u.s !== side || u.h < 0)
				continue;
			for (var d = 0; d < 6; d++) {
				var n = ctx.nb[u.h * 6 + d];
				if (n < 0)
					continue;
				var e = ctx.edge[u.h * 6 + d];
				if (e && ctx.sides[e - 1].cutsZoc)
					continue;
				z[n] = 1;
			}
		}
		return z;
	}

	/* ---------- valeurs ---------- */

	function typeOf(ctx, u) { return ctx.types[u.t]; }

	function forceOf(ctx, u) {
		var t = ctx.types[u.t];
		return u.p >= t.steps ? t.force : Math.ceil(t.force / 2);
	}

	function stepCost(ctx, t, from, to, d) {
		var tt = ctx.terrains[ctx.terr[to]];
		if (!tt.cost)
			return -1;
		var c = tt.cost[t.mounted ? "monte" : "pied"];
		if (t.light && c > 2)
			c = 2;
		if (tt.road && ctx.terrains[ctx.terr[from]].road)
			c = 1;
		var e = ctx.edge[from * 6 + d];
		if (e)
			c += ctx.sides[e - 1].cost;
		return c;
	}

	// valeur perdue par un camp (unites detruites, pas perdus au prorata)
	function losses(ctx, st, side) {
		var lost = 0;
		st.u.forEach(function (u) {
			if (u.s !== side)
				return;
			var t = ctx.types[u.t];
			lost += t.value * (t.steps - u.p) / t.steps;
		});
		return lost;
	}

	function armyValue(ctx, st, side) {
		var v = 0;
		st.u.forEach(function (u) {
			if (u.s === side)
				v += ctx.types[u.t].value;
		});
		return v;
	}

	function ordersFor(ctx, st, side) {
		var n = ctx.orders.base;
		st.u.forEach(function (u) {
			if (u.s === side && u.h >= 0 && ctx.types[u.t].general)
				n += ctx.orders.parGeneral;
		});
		return n;
	}

	/* ---------- combat ---------- */

	var RESULTS = ["neant", "echange", "recul", "perte-recul", "elimination"];

	/*
	 * Table de combat par defaut (cadrage) : rapport attaque / defense,
	 * arrondi en faveur du defenseur, colonne la plus forte atteinte. Un
	 * scenario peut fournir la sienne (cle « table »), de la plus faible a la
	 * plus forte : [{ "rapport": "3:2", "resultat": "recul" }, ...]. Sous la
	 * premiere colonne, l'attaque est interdite.
	 */
	var DEFAULT_TABLE = [
		{ rapport: "1:1", resultat: "echange" },
		{ rapport: "3:2", resultat: "recul" },
		{ rapport: "2:1", resultat: "perte-recul" },
		{ rapport: "3:1", resultat: "elimination" }
	];

	function compileTable(spec) {
		return (spec || DEFAULT_TABLE).map(function (c) {
			var m = /^(\d+):(\d+)$/.exec(c.rapport || "");
			if (!m || +m[2] === 0)
				throw new Error("table : rapport illisible " + c.rapport);
			if (RESULTS.indexOf(c.resultat) < 0)
				throw new Error("table : resultat inconnu " + c.resultat);
			return { num: +m[1], den: +m[2], label: c.rapport, result: c.resultat };
		});
	}

	// indice de colonne (-1 : attaque interdite)
	function column(ctx, att, def) {
		var table = ctx.table, col = -1;
		for (var i = 0; i < table.length; i++)
			if (def <= 0 || att * table[i].den >= def * table[i].num)
				col = i;
		return col;
	}

	function columnLabel(ctx, col) { return col < 0 ? "<" + ctx.table[0].label : ctx.table[col].label; }

	/* ---------- le tour ---------- */

	/*
	 * Un tour en construction : sert a la saisie (vue), aux tours candidats
	 * (IA) et a la validation (playTurn). `st` n'est pas modifie (copie), sauf
	 * avec options.inPlace.
	 */
	function Turn(ctx, st, who, options) {
		options = options || {};
		this.ctx = ctx;
		this.who = who;
		this.st = options.inPlace ? st : copyState(st);
		this.error = null;
		this.o = [];          // ordres donnes
		this.k = [];          // combats livres
		this.results = [];    // issue de chaque combat
		this.ordered = {};    // unites deja activees
		this.charged = {};    // unite -> direction de sa course droite
		this.attacked = {};   // unites qui ont deja attaque
		this.targeted = {};   // unites deja attaquees
		this.combat = false;  // un combat declare clot les mouvements
		this.arrived = this.arrivals();
		this.maxOrders = ordersFor(ctx, this.st, who);
		this.refresh();
	}

	Turn.prototype.refresh = function () {
		this.occ = occupancy(this.ctx, this.st);
		this.zEnemy = zoc(this.ctx, this.st, -this.who);
	};

	// arrivee des renforts dus au debut du tour
	Turn.prototype.arrivals = function () {
		var ctx = this.ctx, st = this.st, who = this.who, list = [];
		if (st.phase < 2)
			return list;
		var now = round(st), occ = occupancy(ctx, st);
		st.u.forEach(function (u) {
			if (u.s !== who || u.h !== PENDING || u.a > now)
				return;
			if (occ[u.e] === 0) {
				u.h = u.e;
				occ[u.h] = u.i + 1;
				list.push(u.i);
				return;
			}
			// entree occupee : le voisin libre le plus proche du bord du camp
			var best = -1, bestD = 1e9;
			for (var d = 0; d < 6; d++) {
				var n = ctx.nb[u.e * 6 + d];
				if (n < 0 || occ[n] !== 0 || !ctx.terrains[ctx.terr[n]].cost)
					continue;
				var dd = edgeDistance(ctx, who, n);
				if (dd < bestD) { bestD = dd; best = n; }
			}
			if (best >= 0) {
				u.h = best;
				occ[best] = u.i + 1;
				list.push(u.i);
			}
		});
		return list;
	};

	Turn.prototype.unit = function (id) { return this.st.u[id]; };

	Turn.prototype.ordersLeft = function () { return this.maxOrders - this.o.length; };

	Turn.prototype.unitAt = function (h) {
		var k = this.occ[h];
		return k ? this.st.u[k - 1] : null;
	};

	/*
	 * Pourquoi ces unites ne peuvent-elles pas recevoir un ordre ? null si
	 * elles le peuvent. Un groupe : meme type, contigues, aucune dans une
	 * zone de controle ennemie.
	 */
	Turn.prototype.whyNotOrder = function (ids) {
		var ctx = this.ctx, self = this;
		if (this.combat) return "combat-started";
		if (!Array.isArray(ids) || ids.length === 0) return "no-unit";
		if (this.o.length >= this.maxOrders) return "no-order-left";
		var type = null, seen = {};
		for (var i = 0; i < ids.length; i++) {
			var u = this.st.u[ids[i]];
			if (!u || u.s !== this.who || u.h < 0) return "not-yours";
			if (seen[u.i]) return "bad-group";
			seen[u.i] = true;
			if (this.ordered[u.i]) return "already-ordered";
			if (type && u.t !== type) return "mixed-group";
			type = u.t;
			if (ids.length > 1 && this.zEnemy[u.h]) return "group-in-zoc";
			if (ids.length === 1 && this.zEnemy[u.h] && !ctx.types[u.t].disengage &&
					!(ctx.types[u.t].phalanx && ctx.options.orientation)) {
				// une unite engagee ne bouge pas ; une phalange peut encore pivoter
				return "in-zoc";
			}
		}
		if (ids.length > 1) {
			// contiguite : composante connexe
			var reached = {}, stack = [this.st.u[ids[0]].h];
			reached[stack[0]] = true;
			var hexes = {};
			ids.forEach(function (id) { hexes[self.st.u[id].h] = true; });
			while (stack.length) {
				var h = stack.pop();
				for (var d = 0; d < 6; d++) {
					var n = ctx.nb[h * 6 + d];
					if (n >= 0 && hexes[n] && !reached[n]) {
						reached[n] = true;
						stack.push(n);
					}
				}
			}
			if (Object.keys(reached).length !== ids.length) return "not-contiguous";
		}
		return null;
	};

	/*
	 * Les destinations d'une unite ou d'un groupe : { hexMeneur: chemin }.
	 * Le chemin est le plus economique ; une ligne droite est preferee a cout
	 * egal (elle seule permet la charge).
	 */
	Turn.prototype.reach = function (ids) {
		if (this.whyNotOrder(ids))
			return {};
		return ids.length === 1 ? this.reachOne(ids[0]) : this.reachGroup(ids);
	};

	Turn.prototype.reachOne = function (id) {
		var ctx = this.ctx, u = this.st.u[id], t = ctx.types[u.t];
		var start = u.h, mp = t.mp;
		var out = {};
		// une phalange engagee ne bouge pas (elle peut seulement pivoter)
		if (this.zEnemy[start] && !t.disengage)
			return out;
		var best = {}, prev = {}, queue = [start];
		best[start] = 0;
		while (queue.length) {
			// file a priorite naive : les graphes sont petits
			var bi = 0;
			for (var q = 1; q < queue.length; q++)
				if (best[queue[q]] < best[queue[bi]]) bi = q;
			var h = queue.splice(bi, 1)[0];
			var stop = h !== start && this.zEnemy[h];
			if (stop)
				continue;
			for (var d = 0; d < 6; d++) {
				var n = ctx.nb[h * 6 + d];
				if (n < 0) continue;
				var occ = this.occ[n];
				if (occ && this.st.u[occ - 1].s !== this.who) continue;
				// on ne passe pas directement d'une zone ennemie a une autre
				if (h === start && this.zEnemy[start] && this.zEnemy[n]) continue;
				var c = stepCost(ctx, t, h, n, d);
				if (c < 0) continue;
				var total = best[h] + c;
				if (total > mp) continue;
				if (best[n] === undefined || total < best[n]) {
					if (best[n] === undefined) queue.push(n);
					best[n] = total;
					prev[n] = h;
				}
			}
		}
		var self = this;
		Object.keys(best).forEach(function (key) {
			var dest = +key;
			if (dest === start || self.occ[dest]) return;
			var path = [dest];
			while (path[0] !== start) path.unshift(prev[path[0]]);
			out[dest] = path;
		});
		// ligne droite a cout egal ou superieur mais dans le potentiel
		for (var dd = 0; dd < 6; dd++) {
			var line = [start], spent = 0, h2 = start;
			for (var k = 0; k < 20; k++) {
				var nx = ctx.nb[h2 * 6 + dd];
				if (nx < 0) break;
				var oc = this.occ[nx];
				if (oc && this.st.u[oc - 1].s !== this.who) break;
				if (h2 === start && this.zEnemy[start] && this.zEnemy[nx]) break;
				var cc = stepCost(ctx, t, h2, nx, dd);
				if (cc < 0 || spent + cc > mp) break;
				spent += cc;
				line.push(nx);
				h2 = nx;
				if (!oc && line.length - 1 >= 2) out[nx] = line.slice();
				if (this.zEnemy[nx]) break;
			}
		}
		return out;
	};

	// position d'un membre du groupe pour une position donnee du meneur
	function shifted(ctx, from, leaderFrom, leaderTo) {
		return hexAt(ctx, ctx.aq[from] + ctx.aq[leaderTo] - ctx.aq[leaderFrom], ctx.ar[from] + ctx.ar[leaderTo] - ctx.ar[leaderFrom]);
	}

	Turn.prototype.reachGroup = function (ids) {
		var ctx = this.ctx, self = this;
		var units = ids.map(function (id) { return self.st.u[id]; });
		var t = ctx.types[units[0].t], lead = units[0].h;
		var members = {};
		units.forEach(function (u) { members[u.h] = true; });
		// etat : hexagone du meneur ; cout : depense de chaque membre (meme type : meme potentiel)
		var spent = {}, prev = {}, queue = [lead], out = {};
		spent[lead] = units.map(function () { return 0; });
		function worst(a) { return Math.max.apply(null, a); }
		while (queue.length) {
			var bi = 0;
			for (var q = 1; q < queue.length; q++)
				if (worst(spent[queue[q]]) < worst(spent[queue[bi]])) bi = q;
			var L = queue.splice(bi, 1)[0];
			var here = units.map(function (u) { return shifted(ctx, u.h, lead, L); });
			if (L !== lead && here.some(function (h) { return self.zEnemy[h]; }))
				continue;
			for (var d = 0; d < 6; d++) {
				var nL = ctx.nb[L * 6 + d];
				if (nL < 0) continue;
				var cost = [], ok = true;
				for (var i = 0; i < units.length && ok; i++) {
					var from = here[i], to = ctx.nb[from * 6 + d];
					if (to < 0) { ok = false; break; }
					var oc = self.occ[to];
					if (oc && self.st.u[oc - 1].s !== self.who) { ok = false; break; }
					var c = stepCost(ctx, t, from, to, d);
					if (c < 0 || spent[L][i] + c > t.mp) { ok = false; break; }
					cost.push(spent[L][i] + c);
				}
				if (!ok) continue;
				if (spent[nL] === undefined || worst(cost) < worst(spent[nL])) {
					if (spent[nL] === undefined) queue.push(nL);
					spent[nL] = cost;
					prev[nL] = L;
				}
			}
		}
		Object.keys(spent).forEach(function (key) {
			var L = +key;
			if (L === lead) return;
			var free = units.every(function (u) {
				var h = shifted(ctx, u.h, lead, L), oc = self.occ[h];
				return oc === 0 || ids.indexOf(oc - 1) >= 0;
			});
			if (!free) return;
			var path = [L];
			while (path[0] !== lead) path.unshift(prev[path[0]]);
			out[L] = path;
		});
		return out;
	};

	/*
	 * Donne un ordre : deplace l'unite (ou le groupe) le long de `path`
	 * (depart compris). `facing` : orientation finale d'une phalange
	 * (option « orientation »), 1 point de mouvement si elle differe de la
	 * direction du dernier pas.
	 */
	Turn.prototype.order = function (ids, path, facing) {
		var ctx = this.ctx, self = this;
		this.error = null;
		var why = this.whyNotOrder(ids);
		if (why) return this.fail(why);
		var units = ids.map(function (id) { return self.st.u[id]; });
		var t = ctx.types[units[0].t];
		if (!Array.isArray(path) || path.length === 0 || path[0] !== units[0].h)
			return this.fail("bad-path");
		var lead = units[0].h, steps = path.length - 1;
		var spent = units.map(function () { return 0; });
		var pos = units.map(function (u) { return u.h; });
		var startInZoc = units.map(function (u) { return !!self.zEnemy[u.h]; });
		if (steps > 0 && units.length === 1 && startInZoc[0] && !t.disengage)
			return this.fail("in-zoc");
		var dirs = [];
		for (var s = 1; s <= steps; s++) {
			var d = dirBetween(ctx, path[s - 1], path[s]);
			if (d < 0) return this.fail("bad-path");
			dirs.push(d);
			for (var i = 0; i < units.length; i++) {
				var from = pos[i], to = ctx.nb[from * 6 + d];
				if (to < 0) return this.fail("off-map");
				if (s > 1 && this.zEnemy[from]) return this.fail("zoc-stop");
				if (s === 1 && startInZoc[i] && this.zEnemy[to]) return this.fail("zoc-to-zoc");
				var oc = this.occ[to];
				if (oc && this.st.u[oc - 1].s !== this.who) return this.fail("enemy-in-way");
				var c = stepCost(ctx, t, from, to, d);
				if (c < 0) return this.fail("impassable");
				spent[i] += c;
				if (spent[i] > t.mp) return this.fail("too-far");
				pos[i] = to;
			}
		}
		// arrivee : hexagones libres (ou liberes par le groupe lui-meme)
		var dest = {};
		for (var j = 0; j < units.length; j++) {
			var oc2 = this.occ[pos[j]];
			if (dest[pos[j]]) return this.fail("stacking");
			dest[pos[j]] = true;
			if (oc2 && ids.indexOf(oc2 - 1) < 0) return this.fail("stacking");
		}
		// orientation
		var newFacing = units.map(function (u) { return u.f; });
		if (ctx.options.orientation && t.phalanx) {
			var natural = steps ? dirs[dirs.length - 1] : units[0].f;
			var wanted = (facing === undefined || facing === null) ? natural : facing;
			if (typeof wanted !== "number" || wanted < 0 || wanted > 5 || wanted !== Math.floor(wanted))
				return this.fail("bad-facing");
			if (wanted !== natural) {
				for (var w = 0; w < units.length; w++) {
					spent[w] += 2;
					if (spent[w] > t.mp) return this.fail("too-far");
				}
			}
			newFacing = units.map(function () { return wanted; });
		} else if (facing !== undefined && facing !== null)
			return this.fail("no-facing");
		if (steps === 0 && !(ctx.options.orientation && t.phalanx && newFacing[0] !== units[0].f))
			return this.fail("no-move");
		// charge : course en ligne droite d'au moins chargeMin hexagones
		var straight = steps >= ctx.chargeMin && dirs.every(function (x) { return x === dirs[0]; });
		units.forEach(function (u, k) {
			u.h = pos[k];
			u.f = newFacing[k];
			self.ordered[u.i] = true;
			if (straight && ctx.types[u.t].charge && ctx.options.charge &&
					!ctx.terrains[ctx.terr[pos[k]]].noCharge)
				self.charged[u.i] = dirs[0];
		});
		var record = { u: ids.slice(), c: path.slice() };
		if (facing !== undefined && facing !== null) record.f = facing;
		this.o.push(record);
		this.refresh();
		return true;
	};

	Turn.prototype.fail = function (why) {
		this.error = why;
		return false;
	};

	// les unites du camp au trait qui peuvent encore attaquer `target`
	Turn.prototype.attackersOf = function (targetId) {
		var ctx = this.ctx, target = this.st.u[targetId], list = [];
		if (!target || target.h < 0 || target.s === this.who || this.targeted[targetId])
			return list;
		for (var i = 0; i < this.st.u.length; i++) {
			var u = this.st.u[i];
			if (u.s !== this.who || u.h < 0 || this.attacked[i])
				continue;
			var t = ctx.types[u.t];
			if (t.force <= 0)
				continue;
			var dist = distance(ctx, u.h, target.h);
			if (t.fire ? (dist === 2 && lineOfFire(ctx, this.occ, u.h, target.h)) : dist === 1)
				list.push(i);
		}
		return list;
	};

	// les cibles possibles : { t: id, a: [attaquants possibles] }
	Turn.prototype.targets = function () {
		var out = [];
		for (var i = 0; i < this.st.u.length; i++) {
			var u = this.st.u[i];
			if (u.s === this.who || u.h < 0 || this.targeted[i])
				continue;
			var a = this.attackersOf(i);
			if (a.length)
				out.push({ t: i, a: a });
		}
		return out;
	};

	// phalanges amies alignees derriere `h` (a l'oppose de la direction `d`)
	Turn.prototype.depth = function (u, d) {
		var ctx = this.ctx;
		if (!ctx.options.profondeur || !ctx.types[u.t].phalanx || ctx.terrains[ctx.terr[u.h]].disorder)
			return 0;
		var back = (d + 3) % 6, h = u.h, n = 0;
		while (n < 2) {
			h = ctx.nb[h * 6 + back];
			if (h < 0) break;
			var oc = this.occ[h];
			if (!oc) break;
			var v = this.st.u[oc - 1];
			if (v.s !== u.s || !ctx.types[v.t].phalanx) break;
			n++;
		}
		return n;
	};

	/*
	 * Rapport de force d'une attaque de `ids` sur `targetId`, avec le detail
	 * de chaque contribution. null si l'attaque est impossible.
	 */
	Turn.prototype.strength = function (ids, targetId) {
		var ctx = this.ctx, self = this, target = this.st.u[targetId];
		if (!target || target.h < 0 || target.s === this.who || this.targeted[targetId])
			return null;
		var allowed = this.attackersOf(targetId);
		if (!ids.length) return null;
		var seen = {};
		for (var i = 0; i < ids.length; i++) {
			if (allowed.indexOf(ids[i]) < 0 || seen[ids[i]]) return null;
			seen[ids[i]] = true;
		}
		var tt = ctx.types[target.t], terrain = ctx.terrains[ctx.terr[target.h]];
		var parts = [], att = 0, melee = 0, flank = false, firstDir = -1;
		ids.forEach(function (id) {
			var u = self.st.u[id], t = ctx.types[u.t], f = forceOf(ctx, u), notes = [];
			if (!t.fire) {
				melee++;
				var d = dirBetween(ctx, u.h, target.h);          // de l'attaquant vers la cible
				var fromDefender = (d + 3) % 6;                   // de la cible vers l'attaquant
				if (firstDir < 0) firstDir = fromDefender;
				if (ctx.options.orientation && tt.phalanx && target.f >= 0) {
					var rel = (fromDefender - target.f + 6) % 6;
					if (rel === 2 || rel === 3 || rel === 4) flank = true;
				}
				var e = ctx.edge[u.h * 6 + d];
				var frontal = tt.phalanx && !(ctx.options.orientation && target.f >= 0 &&
					[2, 3, 4].indexOf((fromDefender - target.f + 6) % 6) >= 0);
				if (self.charged[id] !== undefined && !e && !terrain.noCharge && !frontal &&
						!(terrain.height > ctx.terrains[ctx.terr[u.h]].height)) {
					f *= 2;
					notes.push("charge");
				}
				if (e && ctx.sides[e - 1].attack !== 1) {
					f *= ctx.sides[e - 1].attack;
					notes.push(ctx.sides[e - 1].name);
				}
				var dp = self.depth(u, d);
				if (dp) {
					f += dp;
					notes.push("profondeur+" + dp);
				}
			} else
				notes.push("tir");
			att += f;
			parts.push({ id: id, f: f, notes: notes });
		});
		var def = forceOf(ctx, target) * terrain.def, defNotes = [];
		if (terrain.def !== 1) defNotes.push(terrain.name);
		if (flank) {
			def /= 2;
			defNotes.push("flanc");
		}
		if (firstDir >= 0) {
			var dd = this.depth(target, firstDir);
			if (dd) {
				def += dd;
				defNotes.push("profondeur+" + dd);
			}
		}
		var col = column(ctx, att, def);
		var result = col < 0 ? null : ctx.table[col].result;
		// tir seul : jamais de perte pour l'attaquant, resultat plafonne au recul
		if (melee === 0 && result)
			result = (result === "echange" || result === "neant") ? "neant" : "recul";
		return { att: att, def: def, col: col, ratio: columnLabel(ctx, col), result: result,
			parts: parts, defNotes: defNotes, ranged: melee === 0 };
	};

	/*
	 * Le plus petit ensemble d'attaquants qui garde le meilleur resultat
	 * possible sur `targetId` (parmi `ids`, tous les attaquants possibles par
	 * defaut). Les plus faibles sont ecartes d'abord ; le premier de la liste
	 * renvoyee est l'unite au contact la moins forte, celle qui subit la
	 * perte d'un echange. [] si aucune attaque n'est possible.
	 */
	Turn.prototype.minimalAttackers = function (targetId, ids) {
		var ctx = this.ctx, self = this;
		var all = (ids || this.attackersOf(targetId)).slice();
		var full = all.length ? this.strength(all, targetId) : null;
		if (!full || !full.result)
			return [];
		var keep = all.slice();
		var order = all.slice().sort(function (a, b) {
			return forceOf(ctx, self.st.u[a]) - forceOf(ctx, self.st.u[b]) || a - b;
		});
		for (var i = 0; i < order.length; i++) {
			var trial = keep.filter(function (id) { return id !== order[i]; });
			if (!trial.length) continue;
			var s = this.strength(trial, targetId);
			if (s && s.col === full.col && s.result === full.result)
				keep = trial;
		}
		return keep.sort(function (a, b) {
			var ua = self.st.u[a], ub = self.st.u[b];
			var fa = ctx.types[ua.t].fire ? 1 : 0, fb = ctx.types[ub.t].fire ? 1 : 0;
			return fa - fb || ctx.types[ua.t].value * ua.p / ctx.types[ua.t].steps - ctx.types[ub.t].value * ub.p / ctx.types[ub.t].steps || a - b;
		});
	};

	// hexagone de recul : vers le bord du camp, libre, hors zone ennemie
	Turn.prototype.retreatHex = function (u) {
		var ctx = this.ctx, t = ctx.types[u.t];
		var z = zoc(ctx, this.st, -u.s), best = -1, bestKey = null;
		for (var d = 0; d < 6; d++) {
			var n = ctx.nb[u.h * 6 + d];
			if (n < 0 || this.occ[n] || z[n] || stepCost(ctx, t, u.h, n, d) < 0)
				continue;
			var key = [edgeDistance(ctx, u.s, n), -ctx.terrains[ctx.terr[n]].def, d];
			if (!bestKey || key[0] < bestKey[0] || (key[0] === bestKey[0] && (key[1] < bestKey[1] ||
					(key[1] === bestKey[1] && key[2] < bestKey[2])))) {
				bestKey = key;
				best = n;
			}
		}
		return best;
	};

	Turn.prototype.loseStep = function (u, n) {
		u.p -= n || 1;
		if (u.p <= 0) {
			u.p = 0;
			u.h = DEAD;
		}
	};

	/*
	 * Livre un combat. `ids` : attaquants (le premier attaquant au contact
	 * subit la perte d'un echange) ; `advance` : attaquant au contact qui
	 * occupe l'hexagone libere (facultatif).
	 */
	Turn.prototype.attack = function (ids, targetId, advance) {
		this.error = null;
		if (!Array.isArray(ids) || typeof targetId !== "number")
			return this.fail("bad-combat");
		var s = this.strength(ids, targetId);
		if (!s) return this.fail("no-attack");
		if (!s.result) return this.fail("too-weak");
		var ctx = this.ctx, self = this, target = this.st.u[targetId], from = target.h;
		// une avance refusee annule tout le combat : l'etat est restaure
		var saved = { st: copyState(this.st), attacked: clone(this.attacked), targeted: clone(this.targeted), combat: this.combat };
		function undo(why) {
			self.st = saved.st;
			self.attacked = saved.attacked;
			self.targeted = saved.targeted;
			self.combat = saved.combat;
			self.refresh();
			return self.fail(why);
		}
		var res = { a: ids.slice(), t: targetId, at: from, att: s.att, def: s.def, ratio: s.ratio,
			result: s.result, lossA: -1, retreat: -1, lost: 0, advance: -1 };
		function retreat() {
			self.refresh();
			var to = self.retreatHex(target);
			if (to < 0) {
				res.lost++;
				self.loseStep(target);
			} else {
				target.h = to;
				res.retreat = to;
			}
		}
		switch (s.result) {
			case "neant":
				break;
			case "echange":
				res.lost++;
				this.loseStep(target);
				var victim = ids.filter(function (id) { return !ctx.types[self.st.u[id].t].fire; })[0];
				res.lossA = victim;
				this.loseStep(this.st.u[victim]);
				break;
			case "recul":
				retreat();
				break;
			case "perte-recul":
				res.lost++;
				this.loseStep(target);
				if (target.h >= 0) retreat();
				break;
			case "elimination":
				res.lost += target.p;
				target.p = 0;
				target.h = DEAD;
				break;
		}
		ids.forEach(function (id) { self.attacked[id] = true; });
		this.targeted[targetId] = true;
		this.combat = true;
		this.refresh();
		if (advance !== undefined && advance !== null) {
			var adv = this.st.u[advance];
			if (ids.indexOf(advance) < 0 || !adv || adv.h < 0 || ctx.types[adv.t].fire ||
					distance(ctx, adv.h, from) !== 1 || this.occ[from])
				return undo("bad-advance");
			var d = dirBetween(ctx, adv.h, from);
			if (stepCost(ctx, ctx.types[adv.t], adv.h, from, d) < 0)
				return undo("bad-advance");
			adv.h = from;
			if (adv.f >= 0) adv.f = d;
			res.advance = advance;
			this.refresh();
		}
		// h : hexagone de la cible, pour la notation (verifie au rejeu)
		var record = { a: ids.slice(), t: targetId, h: from };
		if (res.advance >= 0) record.v = advance;
		this.k.push(record);
		this.results.push(res);
		return true;
	};

	// fin du tour : controle des objectifs, compteurs
	Turn.prototype.finish = function () {
		var ctx = this.ctx, st = this.st, who = this.who;
		var occ = occupancy(ctx, st);
		ctx.objectives.forEach(function (o, i) {
			var oc = occ[o.hex], side = oc ? st.u[oc - 1].s : 0;
			if (side) st.ctrl[i] = side;
			if (side === who) {
				st.hold[i] = st.hs[i] === who ? st.hold[i] + 1 : 1;
				st.hs[i] = who;
			} else if (side !== st.hs[i]) {
				st.hold[i] = 0;
				st.hs[i] = side;
			}
		});
		st.played++;
		st.turn++;
		return true;
	};

	Turn.prototype.toMove = function () {
		return { o: clone(this.o), k: clone(this.k) };
	};

	/* ---------- deploiement libre ---------- */

	function checkPlacement(ctx, st, who, list) {
		if (!Array.isArray(list) || list.length === 0)
			return "empty";
		var zone = {}, used = {}, cost = 0, count = {};
		ctx.zone[who].forEach(function (h) { zone[h] = true; });
		st.u.forEach(function (u) { if (u.h >= 0) used[u.h] = true; });
		for (var i = 0; i < list.length; i++) {
			var item = list[i];
			if (!Array.isArray(item) || item.length !== 2) return "bad-item";
			var t = ctx.types[item[0]], h = item[1];
			if (!t) return "bad-type";
			if (typeof h !== "number" || h < 0 || h >= ctx.N || h !== Math.floor(h)) return "bad-hex";
			if (!zone[h]) return "out-of-zone";
			if (used[h]) return "stacking";
			if (!ctx.terrains[ctx.terr[h]].cost) return "impassable";
			used[h] = true;
			cost += t.value;
			count[item[0]] = (count[item[0]] || 0) + 1;
			if (t.max && count[item[0]] > t.max) return "too-many";
		}
		if (cost > ctx.budget) return "over-budget";
		if (!list.some(function (item) { return ctx.types[item[0]].general; })) return "no-general";
		return null;
	}

	function placementCost(ctx, list) {
		return list.reduce(function (n, item) { return n + ctx.types[item[0]].value; }, 0);
	}

	/* ---------- un coup complet ---------- */

	function playTurn(ctx, st, who, move, options) {
		options = options || {};
		function fail(error) { return { ok: false, error: error }; }
		if (!move || typeof move !== "object")
			return fail("no-move");
		if (toMove(st) !== who)
			return fail("wrong-side");
		if (st.phase < 2) {
			if (move.o !== undefined || move.k !== undefined)
				return fail("bad-move");
			if (!options.trusted) {
				var why = checkPlacement(ctx, st, who, move.p);
				if (why) return fail(why);
			}
			var out = options.inPlace ? st : copyState(st);
			move.p.forEach(function (item) {
				var t = ctx.types[item[0]];
				out.u.push({ i: out.u.length, s: who, t: item[0], h: item[1], p: t.steps,
					f: (t.phalanx && ctx.options.orientation) ? ctx.camps[who].facing : -1, a: 0, e: -1 });
			});
			out.phase++;
			out.turn++;
			return { ok: true, state: out, turn: null };
		}
		if (move.p !== undefined)
			return fail("bad-move");
		var turn = new Turn(ctx, st, who, options);
		var orders = move.o === undefined ? [] : move.o, combats = move.k === undefined ? [] : move.k;
		if (!Array.isArray(orders) || !Array.isArray(combats))
			return fail("bad-move");
		var i;
		for (i = 0; i < orders.length; i++) {
			var o = orders[i];
			if (!o || !Array.isArray(o.u) || !Array.isArray(o.c))
				return fail("bad-order");
			if (!turn.order(o.u, o.c, o.f))
				return fail(turn.error);
		}
		for (i = 0; i < combats.length; i++) {
			var k = combats[i];
			if (!k || !Array.isArray(k.a))
				return fail("bad-combat");
			if (k.h !== undefined && (!turn.st.u[k.t] || turn.st.u[k.t].h !== k.h))
				return fail("bad-target-hex");
			if (!turn.attack(k.a, k.t, k.v))
				return fail(turn.error);
		}
		turn.finish();
		return { ok: true, state: turn.st, turn: turn };
	}

	/* ---------- fin de partie ---------- */

	function points(ctx, st, side) {
		var vp = losses(ctx, st, -side);
		ctx.objectives.forEach(function (o, i) {
			if (st.ctrl[i] === side && (!o.only || o.only === side))
				vp += o.points;
		});
		return vp;
	}

	// { winner: 0 en cours | 1 | -1 | 2 nulle, reason }
	function outcome(ctx, st, mover) {
		if (st.phase < 2)
			return { winner: 0, reason: null };
		var sides = [mover, -mover], i;
		// armee aneantie : plus rien sur la carte ni a venir
		for (i = 0; i < 2; i++) {
			var s = sides[1 - i];   // l'adversaire du joueur d'abord
			if (!st.u.some(function (u) { return u.s === s && (u.h >= 0 || u.h === PENDING); }))
				return { winner: -s, reason: "annihilated" };
		}
		// rupture : la moitie de la valeur de l'armee perdue
		var broken = {};
		[1, -1].forEach(function (s) {
			var total = armyValue(ctx, st, s);
			broken[s] = total > 0 && losses(ctx, st, s) >= total * ctx.rupture;
		});
		if (broken[1] && broken[-1]) {
			var r1 = losses(ctx, st, 1) / armyValue(ctx, st, 1), r2 = losses(ctx, st, -1) / armyValue(ctx, st, -1);
			if (r1 === r2) return { winner: 2, reason: "broken" };
			return { winner: r1 > r2 ? -1 : 1, reason: "broken" };
		}
		if (broken[-mover]) return { winner: mover, reason: "broken" };
		if (broken[mover]) return { winner: -mover, reason: "broken" };
		// objectif decisif tenu
		for (i = 0; i < ctx.objectives.length; i++) {
			var o = ctx.objectives[i];
			if (o.immediate && st.hs[i] === mover && st.hold[i] >= o.hold && (!o.only || o.only === mover))
				return { winner: mover, reason: "objective" };
		}
		if (st.played >= 2 * ctx.tours) {
			var diff = points(ctx, st, 1) - points(ctx, st, -1);
			if (Math.abs(diff) <= ctx.nulle) return { winner: 2, reason: "points" };
			return { winner: diff > 0 ? 1 : -1, reason: "points" };
		}
		return { winner: 0, reason: null };
	}

	/* ---------- notation ---------- */

	/*
	 * Notation, sans l'etat : « D11-D8 » (ordre), « 8:D11-D8 » (groupe de 8),
	 * « D9/NE » (pivot), « 3xE7+ » (3 attaquants sur E7, avance).
	 */
	function moveToString(ctx, move) {
		if (move.p)
			return "@" + move.p.map(function (item) {
				return (ctx.types[item[0]] ? ctx.types[item[0]].code : item[0]) + hexName(ctx, item[1]);
			}).join(" ");
		var parts = [];
		(move.o || []).forEach(function (o) {
			var path = o.c.length > 1 ? hexName(ctx, o.c[0]) + "-" + hexName(ctx, o.c[o.c.length - 1]) : hexName(ctx, o.c[0]);
			parts.push((o.u.length > 1 ? o.u.length + ":" : "") + path + (o.f !== undefined ? "/" + DIR_NAMES[o.f] : ""));
		});
		(move.k || []).forEach(function (k) {
			parts.push(k.a.length + "x" + (k.h !== undefined ? hexName(ctx, k.h) : "#" + k.t) + (k.v !== undefined ? "+" : ""));
		});
		return parts.length ? parts.join(" ") : "--";
	}

	// un coup reduit a ses champs significatifs (comparaison, rejeu)
	function playableMove(move) {
		if (!move) return move;
		if (move.p) return { p: clone(move.p) };
		var out = {};
		if (move.o && move.o.length) out.o = clone(move.o);
		if (move.k && move.k.length) out.k = clone(move.k);
		return out;
	}

	var api = {
		FIRST: FIRST, SECOND: SECOND, DEAD: DEAD, PENDING: PENDING,
		DQ: DQ, DR: DR, DIR_NAMES: DIR_NAMES,
		TRAITS: TRAITS, OPTIONS: OPTIONS, RESULTS: RESULTS, DEFAULT_TABLE: DEFAULT_TABLE,
		DEFAULT_TERRAINS: DEFAULT_TERRAINS, DEFAULT_SIDES: DEFAULT_SIDES,
		DEFAULT_TYPES: DEFAULT_TYPES, DEFAULT_LEGEND: DEFAULT_LEGEND,
		makeContext: makeContext, validateScenario: validateScenario,
		parseHex: parseHex, parseZone: parseZone,
		hexAt: hexAt, distance: distance, dirBetween: dirBetween,
		hexName: hexName, hexOf: hexOf, colName: colName, edgeDistance: edgeDistance,
		lineOfFire: lineOfFire,
		newState: newState, copyState: copyState, toMove: toMove, round: round,
		occupancy: occupancy, zoc: zoc,
		typeOf: typeOf, forceOf: forceOf, stepCost: stepCost,
		losses: losses, armyValue: armyValue, ordersFor: ordersFor, points: points,
		column: column, columnLabel: columnLabel,
		Turn: Turn, checkPlacement: checkPlacement, placementCost: placementCost,
		playTurn: playTurn, outcome: outcome,
		moveToString: moveToString, playableMove: playableMove
	};
	return api;
})();

// charge seul (tests, autre habillage) : dans Jocly, `Model` existe deja
if (typeof module === "object" && module && module.exports && typeof Model === "undefined")
	module.exports = PeanRules;
