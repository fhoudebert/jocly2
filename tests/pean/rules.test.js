/*
 * Le moteur de regles de Péan seul (pean-rules.js), sur de petits scenarios
 * construits pour chaque regle : geometrie, scenarios, mouvement, zones de
 * controle, groupes, ordres, combat, capacites, renforts, fin de partie,
 * deploiement libre, notation.
 *
 *   node tests/pean/rules.test.js
 */
const { rules, mini, scenario, suite } = require("./harness.js");
const R = rules();
const t = suite("pean rules");

function ctxOf(patch) { return R.makeContext({ scenario: mini(patch) }); }
function hx(ctx, text) { return R.parseHex(ctx, text); }
function camps(a, b, extra) {
	return Object.assign({
		camps: {
			A: Object.assign({ bord: "sud" }, a),
			B: Object.assign({ bord: "nord" }, b)
		}
	}, extra || {});
}
function U(type, hex, more) { return Object.assign({ type: type, hex: hex }, more || {}); }
function unitAt(turn, ctx, text) { return turn.unitAt(hx(ctx, text)); }
function names(ctx, list) { return list.map((h) => R.hexName(ctx, h)); }

t.section("geometrie");
(function () {
	const ctx = ctxOf();
	const even = hx(ctx, "2,2"), odd = hx(ctx, "3,2");
	t.eq([0, 1, 2, 3, 4, 5].map((d) => R.hexName(ctx, ctx.nb[even * 6 + d])),
		names(ctx, ["2,1", "3,1", "3,2", "2,3", "1,2", "1,1"].map((x) => hx(ctx, x))), "voisins d'une colonne paire (N, NE, SE, S, SO, NO)");
	t.eq([0, 1, 2, 3, 4, 5].map((d) => R.hexName(ctx, ctx.nb[odd * 6 + d])),
		names(ctx, ["3,1", "4,2", "4,3", "3,3", "2,3", "2,2"].map((x) => hx(ctx, x))), "voisins d'une colonne impaire");
	t.eq(ctx.nb[0 * 6 + 0], -1, "pas de voisin hors carte");
	t.eq([R.distance(ctx, 0, hx(ctx, "3,0")), R.distance(ctx, hx(ctx, "0,0"), hx(ctx, "0,5")), R.distance(ctx, hx(ctx, "2,2"), hx(ctx, "5,4"))], [3, 5, 4], "distances");
	t.eq([R.hexName(ctx, 0), R.hexName(ctx, hx(ctx, "11,9")), R.hexOf(ctx, "D3")], ["A1", "L10", hx(ctx, "3,2")], "notation colonne-lettre, ligne-numero");
	t.eq([R.colName(25), R.colName(26), R.colName(27)], ["Z", "AA", "AB"], "colonnes au-dela de Z");
	for(let d = 0; d < 6; d++)
		t.eq(R.dirBetween(ctx, even, ctx.nb[even * 6 + d]), d, "dirBetween " + d);
})();

t.section("scenarios");
(function () {
	["bataille-libre", "leuctres-371", "platees-479", "laurion-413"].forEach((name) => {
		t.eq(R.validateScenario(scenario(name)), [], name + " valide");
	});
	t.ok(R.validateScenario(mini({ types: { x: { force: 2, mvt: 3, pas: 2, traits: ["vol"] } } }))[0].includes("trait inconnu"), "trait hors vocabulaire refuse");
	t.ok(R.validateScenario(mini({ options: ["brouillard"] }))[0].includes("option inconnue"), "option inconnue refusee");
	t.ok(R.validateScenario(mini({ carte: { cols: 12, rows: 10, lignes: ["x"] } })).length === 1, "carte en texte de mauvaise taille");
	t.ok(R.validateScenario(mini({ carte: { cols: 12, rows: 10, cotes: { riviere: [["0,0", "5,5"]] } } }))[0].includes("pas voisins"), "riviere entre hexagones non voisins");
	t.ok(R.validateScenario(mini(camps({ unites: [U("hoplite", "2,8"), U("peltaste", "2,8")] }, { unites: [U("hoplite", "9,1")] })))[0].includes("deux unites"), "deux unites sur un hexagone");
	t.ok(R.validateScenario(mini({ carte: { cols: 12, rows: 10, terrain: { montagne: ["2,8"] } } }))[0].includes("infranchissable"), "unite sur une montagne");
	t.ok(R.validateScenario(mini({ table: [{ rapport: "1:1", resultat: "victoire" }] }))[0].includes("resultat inconnu"), "table : resultat inconnu");
	const ctx = R.makeContext({ scenario: scenario("leuctres-371") });
	t.eq([ctx.campSide.A, ctx.campSide.B], [1, -1], "Leuctres : les Thebains jouent en premier");
	const pl = R.makeContext({ scenario: scenario("platees-479") });
	t.eq([pl.campSide.A, pl.campSide.B], [-1, 1], "Platees : les Perses jouent en premier");
	t.ok(pl.edge.some((e) => e > 0) && pl.sideNames.indexOf("gue") >= 0, "Platees : l'Asopos et ses gues");
	t.eq(ctx.types.general.value, 40, "un scenario surcharge un type par defaut (cout du general)");
	t.eq(ctx.types.hoplite.force, 6, "les autres valeurs du type sont gardees");
})();

t.section("mouvement et terrain");
(function () {
	const ctx = ctxOf({ carte: { cols: 12, rows: 10, terrain: { colline: ["2,6", "2,5"], foret: ["6,6"], route: ["rect:0-11,3-3"] } } });
	const st = R.newState(ctx), turn = new R.Turn(ctx, st, 1);
	const hop = unitAt(turn, ctx, "2,8");
	const reach = turn.reachOne(hop.i);
	t.ok(reach[hx(ctx, "2,7")] && reach[hx(ctx, "2,6")], "colline : 1 + 2 = 3 points, on y entre");
	t.ok(!reach[hx(ctx, "2,5")] || reach[hx(ctx, "2,5")].indexOf(hx(ctx, "2,6")) < 0, "pas de deuxieme colline dans le meme elan");
	t.ok(reach[hx(ctx, "5,8")] && !reach[hx(ctx, "6,8")], "plaine : 3 hexagones, pas 4");
	t.eq(R.stepCost(ctx, ctx.types.cavlourde, hx(ctx, "6,7"), hx(ctx, "6,6"), 0), 6, "foret : 3 points pour un monte (en demi-points)");
	t.eq(R.stepCost(ctx, ctx.types.peltaste, hx(ctx, "6,7"), hx(ctx, "6,6"), 0), 2, "unite legere : 1 point en foret");
	const mine = ctxOf({ carte: { cols: 12, rows: 10, lignes: Array.from({ length: 10 }, (_, r) => r === 5 ? "....x......." : "............") } });
	t.eq([mine.terrainNames[mine.terr[hx(mine, "4,5")]], mine.terrains[mine.terr[hx(mine, "4,5")]].def,
		R.stepCost(mine, mine.types.cavlegere, hx(mine, "4,6"), hx(mine, "4,5"), 0)], ["mine", 1.5, 4], "mine (x) : defense x1,5, 2 points pour un monte");
	t.eq(R.stepCost(ctx, ctx.types.hoplite, hx(ctx, "4,3"), hx(ctx, "5,3"), R.dirBetween(ctx, hx(ctx, "4,3"), hx(ctx, "5,3"))), 1, "route a route : 1/2 point");
	t.eq(R.stepCost(ctx, ctx.types.hoplite, hx(ctx, "4,4"), hx(ctx, "4,3"), 0), 2, "vers une route depuis la plaine : 1 point");
	const river = ctxOf({ carte: { cols: 12, rows: 10, cotes: { riviere: [["2,8", "2,7"]], gue: [["3,8", "3,7"]] } } });
	t.eq(R.stepCost(river, river.types.hoplite, hx(river, "2,8"), hx(river, "2,7"), 0), 6, "riviere : +2");
	t.eq(R.stepCost(river, river.types.hoplite, hx(river, "3,8"), hx(river, "3,7"), 0), 4, "gue : +1");
	const sea = ctxOf({ carte: { cols: 12, rows: 10, terrain: { mer: ["2,7"] } } });
	t.ok(!new R.Turn(sea, R.newState(sea), 1).reachOne(0 + R.newState(sea).u[0].i)[hx(sea, "2,7")], "mer infranchissable");
	// chemin passant par une unite amie, sans s'y arreter
	const pass = ctxOf(camps({ unites: [U("hoplite", "2,8"), U("peltaste", "2,7")] }, { unites: [U("hoplite", "9,1")] }));
	const tp = new R.Turn(pass, R.newState(pass), 1);
	const r2 = tp.reachOne(unitAt(tp, pass, "2,8").i);
	t.ok(r2[hx(pass, "2,6")] && !r2[hx(pass, "2,7")], "on traverse un ami, on ne s'arrete pas sur lui");
	t.ok(!tp.order([unitAt(tp, pass, "2,8").i], [hx(pass, "2,8"), hx(pass, "2,7")]) && tp.error === "stacking", "empilement refuse");
})();

t.section("zones de controle");
(function () {
	const ctx = ctxOf(camps({ unites: [U("hoplite", "2,8"), U("cavlegere", "5,6"), U("peltaste", "8,8")] },
		{ unites: [U("hoplite", "5,5"), U("hoplite", "8,6")] }, { cotes: undefined }));
	const st = R.newState(ctx), turn = new R.Turn(ctx, st, 1);
	const z = R.zoc(ctx, st, -1);
	t.ok(z[hx(ctx, "5,6")] && z[hx(ctx, "4,5")] && !z[hx(ctx, "5,7")], "les six voisins d'une unite");
	const cav = unitAt(turn, ctx, "5,6");
	t.eq(turn.whyNotOrder([cav.i]), null, "la cavalerie legere engagee peut se desengager");
	const reach = turn.reachOne(cav.i);
	t.ok(reach[hx(ctx, "4,6")] && reach[hx(ctx, "4,6")].length > 2, "pas directement d'une zone ennemie a une autre : il faut en sortir");
	t.ok(!turn.order([cav.i], [hx(ctx, "5,6"), hx(ctx, "4,6")]) && turn.error === "zoc-to-zoc", "le validateur refuse le passage direct");
	t.ok(reach[hx(ctx, "5,8")], "elle s'eloigne");
	const pel = unitAt(turn, ctx, "8,8");
	const rp = turn.reachOne(pel.i);
	t.ok(rp[hx(ctx, "8,7")], "on entre dans une zone ennemie...");
	t.ok(!rp[hx(ctx, "7,6")] || rp[hx(ctx, "7,6")].indexOf(hx(ctx, "8,7")) < 0, "...et on s'y arrete");
	t.ok(!turn.order([pel.i], [hx(ctx, "8,8"), hx(ctx, "8,7"), hx(ctx, "7,7")]) && turn.error === "zoc-stop", "le validateur refuse de traverser une zone");
	// unite engagee : pas de mouvement
	const ctx2 = ctxOf(camps({ unites: [U("peltaste", "5,6")] }, { unites: [U("hoplite", "5,5")] }));
	const t2 = new R.Turn(ctx2, R.newState(ctx2), 1);
	t.eq(t2.whyNotOrder([unitAt(t2, ctx2, "5,6").i]), "in-zoc", "unite engagee immobile");
	// la riviere coupe la zone de controle, pas le gue
	const ctx3 = ctxOf(camps({ unites: [U("hoplite", "5,7")] }, { unites: [U("hoplite", "5,5")] },
		{ carte: { cols: 12, rows: 10, cotes: { riviere: [["5,5", "5,6"]], gue: [["5,5", "4,5"]] } } }));
	const z3 = R.zoc(ctx3, R.newState(ctx3), -1);
	t.ok(!z3[hx(ctx3, "5,6")], "pas de zone a travers une riviere");
	t.ok(z3[hx(ctx3, "4,5")], "zone a travers un gue");
})();

t.section("ordres et groupes");
(function () {
	const ctx = ctxOf(camps({ unites: [U("hoplite", "3,7"), U("hoplite", "4,7"), U("hoplite", "5,7"), U("peltaste", "6,7"), U("hoplite", "8,7")] },
		{ unites: [U("hoplite", "5,1")] }, { ordres: { base: 2, parGeneral: 1 } }));
	const st = R.newState(ctx);
	let turn = new R.Turn(ctx, st, 1);
	const line = ["3,7", "4,7", "5,7"].map((x) => unitAt(turn, ctx, x).i);
	t.eq(turn.maxOrders, 2, "ordres : base du scenario");
	t.eq(turn.whyNotOrder([line[0], unitAt(turn, ctx, "6,7").i]), "mixed-group", "groupe de types differents refuse");
	t.eq(turn.whyNotOrder([line[0], unitAt(turn, ctx, "8,7").i]), "not-contiguous", "groupe non contigu refuse");
	const dests = turn.reach(line);
	const north2 = hx(ctx, "3,5");
	t.ok(dests[north2], "le groupe peut avancer de deux hexagones");
	t.ok(turn.order(line, dests[north2]), "ordre de groupe accepte");
	t.eq(line.map((id) => R.hexName(ctx, turn.st.u[id].h)), names(ctx, ["3,5", "4,5", "5,5"].map((x) => hx(ctx, x))), "la ligne garde sa forme");
	t.ok(turn.order([unitAt(turn, ctx, "6,7").i], [hx(ctx, "6,7"), hx(ctx, "6,6")]), "deuxieme ordre");
	t.ok(!turn.order([unitAt(turn, ctx, "8,7").i], [hx(ctx, "8,7"), hx(ctx, "8,6")]) && turn.error === "no-order-left", "pas de troisieme ordre");
	turn = new R.Turn(ctx, st, 1);
	t.ok(!turn.order([line[0]], [hx(ctx, "3,7"), hx(ctx, "3,6")]) || !turn.order([line[0]], [hx(ctx, "3,6"), hx(ctx, "3,5")]), "une unite ne recoit qu'un ordre");
	// un general donne un ordre de plus
	const g = ctxOf(camps({ unites: [U("hoplite", "3,7"), U("general", "3,8")] }, { unites: [U("hoplite", "5,1")] }));
	t.eq(new R.Turn(g, R.newState(g), 1).maxOrders, 5, "4 ordres + 1 par general");
	// groupe : empilement sur une unite amie hors du groupe
	const blk = ctxOf(camps({ unites: [U("hoplite", "3,7"), U("hoplite", "3,8"), U("peltaste", "3,6")] }, { unites: [U("hoplite", "5,1")] }));
	const tb = new R.Turn(blk, R.newState(blk), 1);
	const col = [unitAt(tb, blk, "3,7").i, unitAt(tb, blk, "3,8").i];
	t.ok(!tb.reach(col)[hx(blk, "3,6")], "une colonne ne finit pas sur un ami");
	t.ok(tb.reach(col)[hx(blk, "3,4")], "mais le traverse");
})();

t.section("table de combat");
(function () {
	const ctx = ctxOf();
	t.eq([R.column(ctx, 5, 6), R.column(ctx, 6, 6), R.column(ctx, 8.9, 6), R.column(ctx, 9, 6), R.column(ctx, 12, 6), R.column(ctx, 18, 6), R.column(ctx, 40, 6)],
		[-1, 0, 0, 1, 2, 3, 3], "colonnes 1:1, 3:2, 2:1, 3:1, arrondi en faveur du defenseur");
	const custom = ctxOf({ table: [{ rapport: "2:1", resultat: "recul" }, { rapport: "4:1", resultat: "elimination" }] });
	t.eq([R.column(custom, 11, 6), R.column(custom, 12, 6), R.column(custom, 24, 6)], [-1, 0, 1], "table propre au scenario");
})();

function duel(attackers, defenders, extra) {
	const ctx = ctxOf(camps({ unites: attackers }, { unites: defenders }, extra));
	return { ctx: ctx, turn: new R.Turn(ctx, R.newState(ctx), 1) };
}

t.section("resultats");
(function () {
	// echange : 6 contre 6
	let d = duel([U("hoplite", "5,6")], [U("hoplite", "5,5")]);
	let a = unitAt(d.turn, d.ctx, "5,6"), b = unitAt(d.turn, d.ctx, "5,5");
	t.eq(d.turn.strength([a.i], b.i).result, "echange", "6 contre 6 : echange");
	d.turn.attack([a.i], b.i);
	t.eq([a.p, b.p, R.forceOf(d.ctx, b)], [1, 1, 3], "un pas de chaque cote ; entamee, force divisee par deux (arrondi superieur)");
	t.ok(!d.turn.order([unitAt(d.turn, d.ctx, "5,6").i], [a.h]) && d.turn.error === "combat-started", "plus de mouvement apres un combat");
	t.ok(!d.turn.attack([a.i], b.i), "une cible n'est attaquee qu'une fois");
	// recul vers son bord, hors zone ennemie
	d = duel([U("hoplite", "5,6"), U("peltaste", "4,6")], [U("hoplite", "5,5")]);
	b = unitAt(d.turn, d.ctx, "5,5");
	const ids = [unitAt(d.turn, d.ctx, "5,6").i, unitAt(d.turn, d.ctx, "4,6").i];
	t.eq(d.turn.strength(ids, b.i).result, "recul", "9 contre 6 : recul");
	d.turn.attack(ids, b.i);
	t.eq(R.hexName(d.ctx, b.h), R.hexName(d.ctx, hx(d.ctx, "5,4")), "recul vers le nord (bord du camp B)");
	t.eq(b.p, 2, "sans perte");
	// recul impossible : bord de carte, perte d'un pas
	d = duel([U("hoplite", "5,1"), U("peltaste", "4,1")], [U("hoplite", "5,0")]);
	b = unitAt(d.turn, d.ctx, "5,0");
	d.turn.attack([unitAt(d.turn, d.ctx, "5,1").i, unitAt(d.turn, d.ctx, "4,1").i], b.i);
	t.ok(b.p === 1 && b.h === hx(d.ctx, "5,0") || b.h !== hx(d.ctx, "5,0"), "recul : un hexagone libre hors zone, sinon un pas perdu");
	// elimination et avance
	d = duel([U("hoplite", "5,6"), U("hoplite", "4,6"), U("hoplite", "6,6")], [U("hoplite", "5,5")]);
	b = unitAt(d.turn, d.ctx, "5,5");
	const three = ["5,6", "4,6", "6,6"].map((x) => unitAt(d.turn, d.ctx, x).i);
	t.eq(d.turn.strength(three, b.i).result, "elimination", "18 contre 6 : elimination");
	t.eq(d.turn.minimalAttackers(b.i), three.slice().sort((x, y) => x - y), "les trois sont necessaires");
	t.ok(d.turn.attack(three, b.i, three[0]), "attaque avec avance");
	t.eq([b.h, b.p, d.turn.st.u[three[0]].h], [R.DEAD, 0, hx(d.ctx, "5,5")], "defenseur elimine, l'attaquant avance");
	// avance impossible (le defenseur n'a pas quitte l'hexagone) : le combat est annule
	d = duel([U("hoplite", "5,6")], [U("hoplite", "5,5")]);
	a = unitAt(d.turn, d.ctx, "5,6");
	b = unitAt(d.turn, d.ctx, "5,5");
	t.ok(!d.turn.attack([a.i], b.i, a.i) && d.turn.error === "bad-advance", "avance refusee");
	t.eq([d.turn.st.u[a.i].p, d.turn.st.u[b.i].p, !!d.turn.targeted[b.i], d.turn.combat], [2, 2, false, false], "et rien n'a change");
	t.ok(d.turn.attack([a.i], b.i), "le meme combat, sans avance");
	// moins de 1:1 : interdit
	d = duel([U("peltaste", "5,6")], [U("hoplite", "5,5")]);
	t.ok(!d.turn.attack([unitAt(d.turn, d.ctx, "5,6").i], unitAt(d.turn, d.ctx, "5,5").i) && d.turn.error === "too-weak", "3 contre 6 : interdit");
})();

t.section("terrain et cotes au combat");
(function () {
	let d = duel([U("hoplite", "5,6")], [U("hoplite", "5,5")], { carte: { cols: 12, rows: 10, terrain: { colline: ["5,5"] } } });
	let s = d.turn.strength([unitAt(d.turn, d.ctx, "5,6").i], unitAt(d.turn, d.ctx, "5,5").i);
	t.eq([s.def, s.result], [9, null], "colline : defense x1,5");
	d = duel([U("hoplite", "5,6"), U("hoplite", "4,6"), U("hoplite", "6,6")], [U("hoplite", "5,5")], { carte: { cols: 12, rows: 10, terrain: { ville: ["5,5"] } } });
	s = d.turn.strength(["5,6", "4,6", "6,6"].map((x) => unitAt(d.turn, d.ctx, x).i), unitAt(d.turn, d.ctx, "5,5").i);
	t.eq([s.def, s.ratio], [12, "3:2"], "ville : defense x2");
	d = duel([U("hoplite", "5,6"), U("hoplite", "4,6")], [U("hoplite", "5,5")], { carte: { cols: 12, rows: 10, cotes: { riviere: [["5,6", "5,5"]] } } });
	s = d.turn.strength(["5,6", "4,6"].map((x) => unitAt(d.turn, d.ctx, x).i), unitAt(d.turn, d.ctx, "5,5").i);
	t.eq(s.att, 9, "attaque a travers une riviere : x1/2");
})();

t.section("tir");
(function () {
	let d = duel([U("archer", "5,7"), U("archer", "4,7"), U("archer", "6,7")], [U("peltaste", "5,5")]);
	const tgt = unitAt(d.turn, d.ctx, "5,5");
	const arch = ["5,7", "4,7", "6,7"].map((x) => unitAt(d.turn, d.ctx, x).i);
	t.eq(d.turn.attackersOf(tgt.i).sort(), arch.slice().sort(), "tir a exactement 2 hexagones");
	let s = d.turn.strength(arch, tgt.i);
	t.eq([s.att, s.def, s.result, s.ranged], [6, 3, "recul", true], "tir seul : 2:1 plafonne au recul");
	s = d.turn.strength([arch[0], arch[1]], tgt.i);
	t.eq(s.result, "neant", "4 contre 3, tir seul : 1:1 est sans effet");
	d.turn.attack(arch, tgt.i);
	t.ok(arch.every((id) => d.turn.st.u[id].p === 2), "le tireur ne perd jamais de pas");
	// 1:1 au tir : sans effet
	d = duel([U("archer", "5,7")], [U("archer", "5,5")]);
	s = d.turn.strength([unitAt(d.turn, d.ctx, "5,7").i], unitAt(d.turn, d.ctx, "5,5").i);
	t.eq(s.result, "neant", "tir a 1:1 : sans effet");
	// ligne de vue : hexagone intermediaire occupe
	d = duel([U("archer", "5,7"), U("hoplite", "5,6")], [U("peltaste", "5,5")]);
	t.ok(d.turn.attackersOf(unitAt(d.turn, d.ctx, "5,5").i).indexOf(unitAt(d.turn, d.ctx, "5,7").i) < 0, "pas de tir a travers une unite");
	d = duel([U("archer", "5,7")], [U("peltaste", "5,5")], { carte: { cols: 12, rows: 10, terrain: { montagne: ["5,6"] } } });
	t.eq(d.turn.attackersOf(unitAt(d.turn, d.ctx, "5,5").i), [], "pas de tir par-dessus une montagne");
	d = duel([U("archer", "5,6")], [U("peltaste", "5,5")]);
	t.eq(d.turn.attackersOf(unitAt(d.turn, d.ctx, "5,5").i), [], "les tireurs ne combattent pas au contact");
})();

t.section("charge");
(function () {
	const opts = { options: ["charge"] };
	let d = duel([U("cavlourde", "5,9")], [U("peltaste", "5,5")], opts);
	let cav = unitAt(d.turn, d.ctx, "5,9"), tgt = unitAt(d.turn, d.ctx, "5,5");
	const straight = [hx(d.ctx, "5,9"), hx(d.ctx, "5,8"), hx(d.ctx, "5,7"), hx(d.ctx, "5,6")];
	t.ok(d.turn.order([cav.i], straight), "course droite de 3 hexagones");
	let s = d.turn.strength([cav.i], tgt.i);
	t.eq([s.att, s.parts[0].notes], [10, ["charge"]], "force doublee");
	d = duel([U("cavlourde", "4,9")], [U("peltaste", "5,5")], opts);
	cav = unitAt(d.turn, d.ctx, "4,9");
	tgt = unitAt(d.turn, d.ctx, "5,5");
	d.turn.order([cav.i], [hx(d.ctx, "4,9"), hx(d.ctx, "4,8"), hx(d.ctx, "4,7"), hx(d.ctx, "5,7"), hx(d.ctx, "5,6")]);
	t.eq(d.turn.strength([cav.i], tgt.i).att, 5, "course brisee : pas de charge");
	d = duel([U("cavlourde", "5,9")], [U("hoplite", "5,5")], opts);
	d.turn.order([unitAt(d.turn, d.ctx, "5,9").i], straight);
	t.eq(d.turn.strength([unitAt(d.turn, d.ctx, "5,6").i], unitAt(d.turn, d.ctx, "5,5").i).att, 5, "pas de charge contre une phalange (de face)");
	d = duel([U("cavlourde", "5,9")], [U("peltaste", "5,5")], Object.assign({ carte: { cols: 12, rows: 10, terrain: { colline: ["5,5"] } } }, opts));
	d.turn.order([unitAt(d.turn, d.ctx, "5,9").i], straight);
	t.eq(d.turn.strength([unitAt(d.turn, d.ctx, "5,6").i], unitAt(d.turn, d.ctx, "5,5").i).att, 5, "pas de charge en montee");
	d = duel([U("cavlourde", "5,9")], [U("peltaste", "5,5")]);
	d.turn.order([unitAt(d.turn, d.ctx, "5,9").i], straight);
	t.eq(d.turn.strength([unitAt(d.turn, d.ctx, "5,6").i], unitAt(d.turn, d.ctx, "5,5").i).att, 5, "sans l'option charge, pas de charge");
})();

t.section("phalange : profondeur et flancs");
(function () {
	let d = duel([U("hoplite", "5,6"), U("hoplite", "5,7"), U("hoplite", "5,8")], [U("hoplite", "5,5")], { options: ["profondeur"] });
	let s = d.turn.strength([unitAt(d.turn, d.ctx, "5,6").i], unitAt(d.turn, d.ctx, "5,5").i);
	t.eq([s.att, s.parts[0].notes], [8, ["profondeur+2"]], "attaque : +1 par phalange derriere, +2 au plus");
	// une seule colonne pousse : deux phalanges profondes n'ajoutent pas leurs bonus
	d = duel([U("hoplite", "5,6"), U("hoplite", "5,7"), U("hoplite", "5,8"), U("hoplite", "4,6"), U("hoplite", "4,7")], [U("hoplite", "5,5")], { options: ["profondeur"] });
	s = d.turn.strength(["5,6", "4,6"].map((x) => unitAt(d.turn, d.ctx, x).i), unitAt(d.turn, d.ctx, "5,5").i);
	t.eq([s.att, s.ratio], [14, "2:1"], "deux colonnes (+2 et +1) : seul le meilleur bonus compte (6 + 6 + 2)");
	d = duel([U("hoplite", "5,6"), U("hoplite", "4,6")], [U("hoplite", "5,5"), U("hoplite", "5,4")], { options: ["profondeur"] });
	s = d.turn.strength(["5,6", "4,6"].map((x) => unitAt(d.turn, d.ctx, x).i), unitAt(d.turn, d.ctx, "5,5").i);
	t.eq([s.def, s.defNotes], [7, ["profondeur+1"]], "defense : profondeur dans l'axe du premier attaquant");
	d = duel([U("hoplite", "5,6"), U("hoplite", "5,7")], [U("hoplite", "5,5")], { options: ["profondeur"], carte: { cols: 12, rows: 10, terrain: { foret: ["5,6"] } } });
	t.eq(d.turn.strength([unitAt(d.turn, d.ctx, "5,6").i], unitAt(d.turn, d.ctx, "5,5").i).att, 6, "phalange desordonnee en foret : pas de profondeur");
	// orientation : le defenseur (camp B) regarde le sud ; attaque par le nord = de dos
	d = duel([U("hoplite", "5,4")], [U("hoplite", "5,5")], { options: ["orientation"] });
	s = d.turn.strength([unitAt(d.turn, d.ctx, "5,4").i], unitAt(d.turn, d.ctx, "5,5").i);
	t.eq([s.def, s.defNotes, s.result], [3, ["flanc"], "perte-recul"], "attaquee de dos : defense divisee par deux (6 contre 3)");
	d = duel([U("hoplite", "5,6")], [U("hoplite", "5,5")], { options: ["orientation"] });
	t.eq(d.turn.strength([unitAt(d.turn, d.ctx, "5,6").i], unitAt(d.turn, d.ctx, "5,5").i).def, 6, "de face : defense entiere");
	d = duel([U("hoplite", "5,4")], [U("hoplite", "5,5")], { options: ["orientation"], flanc: 0.75 });
	t.eq(d.turn.strength([unitAt(d.turn, d.ctx, "5,4").i], unitAt(d.turn, d.ctx, "5,5").i).def, 4.5, "malus de flanc reglable par scenario");
	// pivot : 1 point de mouvement
	d = duel([U("hoplite", "5,8")], [U("hoplite", "5,1")], { options: ["orientation"] });
	const h = unitAt(d.turn, d.ctx, "5,8");
	t.eq(h.f, 0, "la phalange du camp sud regarde le nord");
	const p3 = [hx(d.ctx, "5,8"), hx(d.ctx, "5,7"), hx(d.ctx, "5,6"), hx(d.ctx, "5,5")];
	t.ok(!d.turn.order([h.i], p3, 2) && d.turn.error === "too-far", "3 hexagones + pivot : trop loin");
	t.ok(d.turn.order([h.i], p3.slice(0, 3), 2) && h.f === 2, "2 hexagones + pivot");
	d = duel([U("hoplite", "5,6")], [U("hoplite", "5,5")], { options: ["orientation"] });
	const engaged = unitAt(d.turn, d.ctx, "5,6");
	t.ok(d.turn.order([engaged.i], [engaged.h], 1) && engaged.f === 1, "une phalange engagee peut pivoter");
	t.eq(R.forceOf(d.ctx, engaged), 6, "le pivot ne change rien d'autre");
})();

t.section("renforts");
(function () {
	const ctx = ctxOf(camps({ unites: [U("hoplite", "2,8")], renforts: [{ type: "cavlegere", hex: "0,9", tour: 2 }, { type: "peltaste", hex: "2,8", tour: 1 }] },
		{ unites: [U("hoplite", "9,1")] }));
	let st = R.newState(ctx);
	t.eq(st.u.filter((u) => u.h === R.PENDING).length, 2, "deux renforts en attente");
	let turn = new R.Turn(ctx, st, 1);
	t.eq(turn.arrived.length, 1, "tour 1 : un renfort arrive");
	const pel = turn.st.u.find((u) => u.t === "peltaste");
	t.ok(pel.h >= 0 && pel.h !== hx(ctx, "2,8"), "entree occupee : un voisin libre");
	turn.finish();
	st = turn.st;
	st = new R.Turn(ctx, st, -1).st;
	const t2 = new R.Turn(ctx, st, -1);
	t2.finish();
	const t3 = new R.Turn(ctx, t2.st, 1);
	t.eq(t3.arrived.length, 1, "tour 2 : la cavalerie arrive");
	t.ok(t3.whyNotOrder([t3.arrived[0]]) === null, "un renfort peut bouger des son arrivee");
})();

t.section("fin de partie");
(function () {
	// rupture
	let ctx = ctxOf(camps({ unites: [U("hoplite", "5,6"), U("hoplite", "4,6"), U("hoplite", "6,6")] },
		{ unites: [U("hoplite", "5,5"), U("hoplite", "9,1")] }));
	let st = R.newState(ctx), turn = new R.Turn(ctx, st, 1);
	turn.attack(["5,6", "4,6", "6,6"].map((x) => unitAt(turn, ctx, x).i), unitAt(turn, ctx, "5,5").i);
	turn.finish();
	t.eq(R.outcome(ctx, turn.st, 1), { winner: 1, reason: "broken" }, "la moitie de la valeur perdue : armee rompue");
	// aneantissement
	ctx = ctxOf(camps({ unites: [U("hoplite", "5,6"), U("hoplite", "4,6"), U("hoplite", "6,6")] }, { unites: [U("hoplite", "5,5")] }, { rupture: 2 }));
	st = R.newState(ctx);
	turn = new R.Turn(ctx, st, 1);
	turn.attack(["5,6", "4,6", "6,6"].map((x) => unitAt(turn, ctx, x).i), unitAt(turn, ctx, "5,5").i);
	turn.finish();
	t.eq(R.outcome(ctx, turn.st, 1).reason, "annihilated", "plus rien sur la carte : aneanti");
	// points et objectifs
	ctx = ctxOf(camps({ unites: [U("hoplite", "5,6")] }, { unites: [U("hoplite", "9,1")] },
		{ tours: 1, nulle: 5, objectifs: [{ hex: "5,5", points: 10 }, { hex: "9,9", points: 3, camp: "B" }] }));
	st = R.newState(ctx);
	t.eq(st.ctrl, [0, -1], "controle initial des objectifs");
	turn = new R.Turn(ctx, st, 1);
	turn.order([unitAt(turn, ctx, "5,6").i], [hx(ctx, "5,6"), hx(ctx, "5,5")]);
	turn.finish();
	t.eq(turn.st.ctrl, [1, -1], "occuper un objectif en prend le controle");
	t.eq(R.outcome(ctx, turn.st, 1).winner, 0, "partie en cours");
	const t2 = new R.Turn(ctx, turn.st, -1);
	t2.finish();
	t.eq([R.points(ctx, t2.st, 1), R.points(ctx, t2.st, -1)], [10, 3], "points : objectifs tenus");
	t.eq(R.outcome(ctx, t2.st, -1), { winner: 1, reason: "points" }, "dernier tour : victoire aux points (ecart 7 > 5)");
	// objectif decisif, tenu deux tours
	ctx = ctxOf(camps({ unites: [U("hoplite", "5,6")] }, { unites: [U("hoplite", "9,1")] },
		{ objectifs: [{ hex: "5,5", points: 0, immediat: true, tenir: 2, pour: "A" }] }));
	st = R.newState(ctx);
	turn = new R.Turn(ctx, st, 1);
	turn.order([unitAt(turn, ctx, "5,6").i], [hx(ctx, "5,6"), hx(ctx, "5,5")]);
	turn.finish();
	t.eq(R.outcome(ctx, turn.st, 1).winner, 0, "tenu un tour : pas encore");
	let t3 = new R.Turn(ctx, turn.st, -1);
	t3.finish();
	t3 = new R.Turn(ctx, t3.st, 1);
	t3.finish();
	t.eq(R.outcome(ctx, t3.st, 1), { winner: 1, reason: "objective" }, "tenu deux tours : victoire");
})();

t.section("deploiement libre");
(function () {
	const sc = scenario("bataille-libre");
	const ctx = R.makeContext({ scenario: sc });
	const st = R.newState(ctx);
	t.eq([st.phase, R.toMove(st), st.u.length], [0, 1, 0], "le camp 1 deploie d'abord, sur une carte vide");
	const H = (x) => hx(ctx, x);
	t.eq(R.checkPlacement(ctx, st, 1, [["hoplite", H("5,13")]]), "no-general", "un general au moins");
	t.eq(R.checkPlacement(ctx, st, 1, [["general", H("5,2")]]), "out-of-zone", "dans sa zone");
	t.eq(R.checkPlacement(ctx, st, 1, [["general", H("5,13")], ["hoplite", H("5,13")]]), "stacking", "un par hexagone");
	const many = [["general", H("1,13")]];
	for(let c = 2; c < 12; c++) many.push(["hoplite", H(c + ",14")]);
	t.eq(R.checkPlacement(ctx, st, 1, many), "over-budget", "dans le budget");
	t.eq(R.checkPlacement(ctx, st, 1, [["general", H("1,13")], ["general", H("2,13")], ["general", H("3,13")]]), "too-many", "maximum par type");
	const ok = [["general", H("11,15")], ["hoplite", H("10,12")], ["hoplite", H("11,12")], ["archer", H("10,13")]];
	t.eq(R.checkPlacement(ctx, st, 1, ok), null, "deploiement valide");
	const r = R.playTurn(ctx, st, 1, { p: ok });
	t.ok(r.ok && r.state.phase === 1 && r.state.u.length === 4, "phase suivante : le camp -1 deploie");
	t.ok(!R.playTurn(ctx, r.state, 1, { p: ok }).ok, "pas deux fois le meme camp");
	t.eq(r.state.u[1].f, 0, "phalange orientee vers l'ennemi");
})();

t.section("validation d'un tour complet et notation");
(function () {
	const ctx = R.makeContext({ scenario: scenario("leuctres-371") });
	const st = R.newState(ctx), H = (x) => hx(ctx, x);
	const turn = new R.Turn(ctx, st, 1);
	const cav = unitAt(turn, ctx, "3,9");
	t.ok(turn.order([cav.i], turn.reachOne(cav.i)[H("3,6")]), "charge de la cavalerie thebaine");
	const target = unitAt(turn, ctx, "3,5");
	t.ok(turn.attack([cav.i], target.i, cav.i), "et attaque");
	const move = turn.toMove();
	t.eq(R.moveToString(ctx, move), "D10-D7 1xD6+", "notation");
	t.ok(R.playTurn(ctx, st, 1, move).ok, "le tour se rejoue");
	t.ok(!R.playTurn(ctx, st, -1, move).ok, "pas pour l'autre camp");
	const bad = JSON.parse(JSON.stringify(move));
	bad.k[0].h = H("0,0");
	t.eq(R.playTurn(ctx, st, 1, bad).error, "bad-target-hex", "hexagone de la cible verifie");
	const reversed = { k: move.k, o: move.o };
	t.ok(R.playTurn(ctx, st, 1, { k: move.k }).ok === false, "sans le mouvement, la charge ne porte pas");
	t.ok(R.playTurn(ctx, st, 1, reversed).ok, "l'ordre des cles n'importe pas");
	t.eq(R.playTurn(ctx, st, 1, {}).ok, true, "un tour sans rien est permis");
})();

t.section("contexte exporte (moteur externe)");
(function () {
	["bataille-libre", "leuctres-371", "platees-479", "laurion-413"].forEach((name) => {
		const ctx = R.makeContext({ scenario: scenario(name) });
		const x = JSON.parse(JSON.stringify(R.exportContext(ctx)));
		t.eq([x.cols, x.rows, x.terr.length, x.edge.length], [ctx.cols, ctx.rows, ctx.N, ctx.N * 6], name + " : carte");
		t.eq(x.types.map((k) => k.key), ctx.typeKeys, name + " : types, dans l'ordre du contexte");
		t.eq(x.objectives.map((o) => o.hex), ctx.objectives.map((o) => o.hex), name + " : objectifs");
		t.ok(x.terrains.every((tt) => tt.cost === null || tt.cost.length === 2), name + " : couts (pied, monte) ou infranchissable");
		t.eq(x.home, [ctx.home[1], ctx.home[-1]], name + " : bords des camps");
	});
})();

t.done();
