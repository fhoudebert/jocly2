/*
 * Le moteur de regles seul, sans Jocly : carte, communications, rapport de
 * force, charge, retraite, arsenaux, fin de partie, validation d'un tour.
 *
 *   node tests/kriegspiel/rules.test.js
 */
const { rules, position, suite } = require("./harness.js");
const R = rules();
const t = suite("kriegspiel rules");
const ctx = R.makeContext({});
const P = R.posOf;
const ALL = { on: new Uint8Array(R.N).fill(1) };   // « tout le monde est en communication »

function comm(st, side) { return R.communications(ctx, st, side, false); }
function on(st, side, name) { return comm(st, side).on[P(name)] === 1; }
function lit(st, side, name) { return comm(st, side).lit[P(name)] === 1; }
function play(st, who, move) { return R.playTurn(ctx, st, who, move); }
function squares(names) { return names.split(/\s+/).map(P); }

/* ---------- carte ---------- */
t.section("carte");
(function () {
	const map = R.DEFAULT_MAP;
	t.eq([map.mountains.length, map.passes.length, map.forts.length], [18, 2, 6], "18 montagnes, 2 cols, 6 forteresses");
	// chaque forteresse est alignee, sans montagne entre les deux, avec un arsenal de son camp
	map.forts.forEach((name) => {
		const fort = P(name), side = R.territory(fort);
		const aligned = ctx.arsPos.some((ars, i) => {
			if(ctx.arsSide[i] !== side) return false;
			const dr = R.rowOf(ars) - R.rowOf(fort), dc = R.colOf(ars) - R.colOf(fort);
			if(!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return false;
			const steps = Math.max(Math.abs(dr), Math.abs(dc));
			for(let k = 1; k < steps; k++) {
				const p = (R.rowOf(fort) + Math.sign(dr) * k) * R.W + R.colOf(fort) + Math.sign(dc) * k;
				if(ctx.terr[p] === R.MOUNTAIN) return false;
			}
			return true;
		});
		t.ok(aligned, "forteresse " + name + " alignee avec un arsenal de son camp");
	});
	// orientation des chaines : une montagne est « parallele a la frontiere »
	// si elle a une voisine sur sa ligne, « perpendiculaire » sinon
	function orientation(side) {
		let parallel = 0, perpendicular = 0;
		map.mountains.map(P).filter((p) => R.territory(p) === side).forEach((p) => {
			const row = (q) => q >= 0 && q < R.N && R.rowOf(q) === R.rowOf(p) && ctx.terr[q] === R.MOUNTAIN;
			if(row(p - 1) || row(p + 1)) parallel++; else perpendicular++;
		});
		return [perpendicular, parallel];
	}
	t.eq(orientation(1), [5, 4], "Nord : 5 montagnes sur 9 perpendiculaires a la frontiere");
	t.eq(orientation(-1), [3, 6], "Sud : 6 montagnes sur 9 paralleles a la frontiere");
	t.eq(ctx.arsPos.map(R.posName), ["D8", "B15", "T3", "T23"], "arsenaux");
	t.eq(ctx.terr[P("D8")], R.PLAIN, "une case d'arsenal est une case de plaine");
})();

/* ---------- communications ---------- */
t.section("communications");
(function () {
	let st = position(R, { N: { I: "D9 D11 A8 I13 K20" } });
	t.ok(on(st, 1, "D9"), "ligne issue de l'arsenal D8");
	t.ok(on(st, 1, "A8"), "colonne de l'arsenal D8");
	t.ok(!on(st, 1, "D11"), "la montagne D10 arrete la ligne");
	t.ok(!lit(st, 1, "D10"), "la ligne s'arrete avant la montagne");
	t.ok(on(st, 1, "I13"), "la diagonale D8-I13 passe par le col F10");
	t.ok(!on(st, 1, "K20"), "unite hors de toute ligne : isolee");
	t.ok(lit(st, 1, "D8"), "la case de l'arsenal est en communication");

	st = position(R, { N: { I: "D3" }, S: { I: "D5" } });
	t.ok(!on(st, 1, "D3"), "une unite ennemie arrete la ligne");
	t.ok(!lit(st, 1, "D5") && lit(st, 1, "D6"), "elle l'arrete avant sa case");
	st = position(R, { N: { I: "D3" }, S: { T: "D5" } });
	t.ok(on(st, 1, "D3"), "une transmission ennemie ne l'arrete pas");
	st = position(R, { N: { I: "D3" }, S: { E: "D5" } });
	t.ok(on(st, 1, "D3"), "une estafette ennemie non plus");

	st = position(R, { N: { T: "D3", I: "H6" } });
	t.ok(!on(st, 1, "H6"), "sans seconde transmission, H6 est isolee");
	st = position(R, { N: { T: "D3", E: "H3", I: "H6" } });
	t.ok(on(st, 1, "H3") && on(st, 1, "H6"), "chaine de transmissions D8 > D3 > H3 > H6");
	st = position(R, { N: { T: "D3", E: "H3", I: "H6" }, ars: [0, 1, 1, 1] });
	t.ok(!on(st, 1, "H6"), "un arsenal detruit n'emet plus");

	// transmission au contact d'une unite en communication, mais hors ligne
	st = position(R, { N: { I: "D6 E1", T: "E5" } });
	t.ok(on(st, 1, "D6"), "D6 est sur la ligne");
	t.ok(!on(st, 1, "E5"), "la transmission au contact reste isolee");
	t.ok(!on(st, 1, "E1"), "et n'emet pas");
	st = position(R, { N: { I: "D6 E5 F4" } });
	t.ok(on(st, 1, "E5") && on(st, 1, "F4"), "contact en chaine entre unites combattantes");
	st = position(R, { N: { I: "D6 F4", T: "E5" } });
	t.ok(!on(st, 1, "F4"), "le contact ne passe pas par une transmission");
	// les forteresses ne propagent rien
	st = position(R, { N: { I: "B8 C9" } });
	t.ok(on(st, 1, "B8") && on(st, 1, "C9"), "forteresse B8 sur la colonne de D8, C9 sur sa diagonale");
	st = position(R, { N: { I: "H21 H19" }, ars: [1, 0, 1, 1] });
	t.ok(!on(st, 1, "H21") && !on(st, 1, "H19"), "une forteresse n'emet rien par elle-meme");
})();

/* ---------- transmissions en defense ---------- */
t.section("transmissions");
(function () {
	let st = position(R, { S: { T: "K3", I: "K5" }, N: { I: "K7" } });
	let s = R.strength(ctx, st, P("K5"), 1, comm(st, 1), comm(st, -1), -1, true);
	t.eq(s.def, 7, "transmission a 2 cases : +1 en defense");
	st = position(R, { S: { T: "K3", I: "K6" } });
	s = R.strength(ctx, st, P("K6"), 1, comm(st, 1), comm(st, -1), -1, true);
	t.eq(s.def, 6, "transmission a 3 cases : rien");
	st = position(R, { S: { T: "K3" } });
	s = R.strength(ctx, st, P("K3"), 1, comm(st, 1), comm(st, -1), -1, true);
	t.eq(s.def, 1, "une transmission en communication se defend pour 1");
	st = position(R, { S: { T: "K10" } });
	t.ok(!on(st, -1, "K10"), "K10 est hors ligne");
	s = R.strength(ctx, st, P("K10"), 1, comm(st, 1), comm(st, -1), -1, true);
	t.eq(s.def, 0, "une transmission isolee ne se defend pas");
	st = position(R, { S: { I: "K10" } });
	s = R.strength(ctx, st, P("K10"), 1, comm(st, 1), comm(st, -1), -1, true);
	t.eq(s.def, 0, "une unite combattante isolee non plus");
})();

/* ---------- rapport de force ---------- */
t.section("rapport de force");
(function () {
	/*
	 * L'exemple chiffre de RSG : infanterie du Sud en E5, defense 24 (6 pour
	 * elle-meme, 18 par deux autres pieces), attaque 30 (charge de cavalerie
	 * 21, deux autres unites 9) ; les unites en D3 et G6 ne comptent pas, hors
	 * de toute ligne. Le texte de RSG ne donne que ces sommes : les cases des
	 * soutiens sont sur sa figure, celles-ci en sont une reconstitution, avec
	 * une forteresse en E3 pour obtenir les 10 de l'infanterie retranchee.
	 */
	const custom = R.makeContext({ map: Object.assign({}, R.DEFAULT_MAP, { forts: ["E3"] }) });
	const st = position(R, {
		S: { I: "E5 E3 G6", A: "E7" },
		N: { C: "D5 C5 B5", I: "G5 D3", A: "H8" },
	});
	const s = R.strength(custom, st, P("E5"), 1, ALL, ALL, -1, true);
	t.eq(s.def, 24, "exemple RSG : defense 24");
	t.eq(s.att, 30, "exemple RSG : attaque 30");
	t.eq(s.charge, 3, "exemple RSG : charge de trois cavaliers (21)");
	t.ok(!s.attackers.some((a) => a[0] === P("D3")), "D3 hors ligne : aucune attaque");
	t.ok(!s.defenders.some((a) => a[0] === P("G6")), "G6 hors ligne : aucune defense");

	let st2 = position(R, { S: { I: "E11" }, N: { I: "E9" } });
	t.eq(R.strength(ctx, st2, P("E11"), 1, ALL, ALL, -1).att, 0, "la montagne E10 bloque le tir");
	st2 = position(R, { S: { I: "F11" }, N: { I: "F9" } });
	t.eq(R.strength(ctx, st2, P("F11"), 1, ALL, ALL, -1).att, 4, "le col F10 ne le bloque pas");
	st2 = position(R, { S: { I: "K5 K6" }, N: { I: "K7", A: "K8" } });
	const s2 = R.strength(ctx, st2, P("K5"), 1, ALL, ALL, -1);
	t.eq(s2.att, 9, "les unites ne bloquent pas les tirs (4 + 5)");
	t.eq(s2.def, 12, "le voisin soutient la cible (6 + 6)");
	st2 = position(R, { S: { I: "K5" }, N: { I: "K8", A: "K9" } });
	t.eq(R.strength(ctx, st2, P("K5"), 1, ALL, ALL, -1).att, 0, "hors de portee : rien");
	st2 = position(R, { S: { I: "K5" }, N: { I: "L7" } });
	t.eq(R.strength(ctx, st2, P("K5"), 1, ALL, ALL, -1).att, 0, "hors des 8 lignes : rien");
	st2 = position(R, { S: { I: "K5" }, N: { I: "K6 K7" } });
	const none = { on: new Uint8Array(R.N) };
	t.eq(R.strength(ctx, st2, P("K5"), 1, none, ALL, -1).att, 0, "des attaquants isoles ne comptent pas");
})();

/* ---------- charge ---------- */
t.section("charge");
(function () {
	function att(spec, target, c) {
		return R.strength(c || ctx, position(R, spec), P(target), 1, ALL, ALL, -1).att;
	}
	t.eq(att({ S: { I: "K5" }, N: { C: "K6" } }, "K5"), 7, "un cavalier en charge : 7");
	t.eq(att({ S: { I: "K5" }, N: { C: "K6 K7" } }, "K5"), 14, "colonne de 2 : 14");
	t.eq(att({ S: { I: "K5" }, N: { C: "K6 K7 K8" } }, "K5"), 21, "colonne de 3 : 21");
	t.eq(att({ S: { I: "K5" }, N: { C: "K6 K7 K8 K9" } }, "K5"), 28, "colonne de 4 : 28, le 4e frappe a 4 cases");
	t.eq(att({ S: { I: "K5" }, N: { C: "L6 M7 N8" } }, "K5"), 21, "colonne en diagonale");
	t.eq(att({ S: { I: "K5" }, N: { C: "K6 K8" } }, "K5"), 7, "trou dans la colonne : le second ne compte pas");
	t.eq(att({ S: { I: "K5" }, N: { C: "K6 K8", I: "K7" } }, "K5"), 11, "autre unite dans la colonne : 7 + 4");
	t.eq(att({ S: { I: "K5" }, N: { C: "K7" } }, "K5"), 4, "cavalier non adjacent : pas de charge");
	t.eq(att({ S: { I: "M3" }, N: { C: "M4 M5" } }, "M3"), 8, "cible en forteresse : pas de charge");
	t.eq(att({ S: { I: "O16" }, N: { C: "O15" } }, "O16"), 4, "cible dans un col : pas de charge");
	t.eq(att({ S: { I: "B9" }, N: { C: "B8 B7" } }, "B9"), 8, "cavalier en forteresse : pas de charge, colonne arretee");
	t.eq(att({ S: { I: "B6" }, N: { C: "B7 B8" } }, "B6"), 11, "cavalier en forteresse en 2e : 7 + 4");
	t.eq(att({ S: { I: "F11" }, N: { C: "F10" } }, "F11"), 7, "un cavalier dans un col peut charger");
	// en defense la cavalerie garde sa portee de 2 et ne charge pas
	const st = position(R, { S: { I: "K5", C: "K6 K7 K8" }, N: { I: "K4" } });
	t.eq(R.strength(ctx, st, P("K5"), 1, ALL, ALL, -1).def, 16, "cavalerie en defense : 6 + 5 + 5, portee 2");
	// le cavalier qui a fait retraite ne charge pas et coupe la colonne
	const st3 = position(R, { S: { I: "K5" }, N: { C: "K6 K7" } });
	t.eq(R.strength(ctx, st3, P("K5"), 1, ALL, ALL, P("K6")).att, 4, "l'unite en retraite est exclue de l'attaque");
})();

/* ---------- bonus et seuils ---------- */
t.section("bonus et seuils");
(function () {
	function def(code, name) {
		const spec = { N: {} };
		spec.N[code] = name;
		return R.defenseAt(ctx, position(R, spec), P(name));
	}
	t.eq([def("I", "A1"), def("I", "B8"), def("I", "F10")], [6, 10, 8], "infanterie : 6, 10 en forteresse, 8 dans un col");
	t.eq([def("A", "A1"), def("A", "B8"), def("A", "F10")], [8, 12, 10], "artillerie : 8, 12, 10");
	t.eq([def("AC", "A1"), def("AC", "B8"), def("AC", "F10")], [8, 12, 10], "artillerie a cheval : 8, 12, 10");
	t.eq([def("C", "A1"), def("C", "B8"), def("C", "F10")], [5, 5, 5], "cavalerie : aucun bonus");
	t.eq([def("T", "B8"), def("E", "F10")], [1, 1], "transmission et estafette : aucun bonus");
	// une forteresse sert le camp qui l'occupe, meme en territoire adverse
	t.eq(R.defenseAt(ctx, position(R, { S: { I: "B8" } }), P("B8")), 10, "le Sud dans une forteresse du Nord : 10");
	// le bonus vaut aussi quand l'unite soutient une voisine
	const st = position(R, { S: { I: "M3 M4" }, N: { I: "M5" } });
	t.eq(R.strength(ctx, st, P("M4"), 1, ALL, ALL, -1).def, 16, "soutien depuis une forteresse : 6 + 10");

	// delta = 0 : attaque interdite
	let r = play(position(R, { N: { C: "H4" }, S: { I: "H3", T: "G3" } }), 1, { m: [], a: P("H3") });
	t.ok(!r.ok && r.error === "no-effect", "delta = 0 : attaque refusee (" + r.error + ")");
	r = play(position(R, { N: { I: "H4" }, S: { I: "H3" } }), 1, { m: [], a: P("H3") });
	t.ok(!r.ok && r.error === "no-effect", "delta < 0 : attaque refusee");
	// delta = 1 : retraite forcee
	r = play(position(R, { N: { C: "H4" }, S: { I: "H3" } }), 1, { m: [], a: P("H3") });
	t.ok(r.ok && r.turn.result.delta === 1 && r.turn.result.outcome === "retreat", "delta = 1 : retraite forcee");
	t.eq(r.ok && r.state.retreat, P("H3"), "l'unite est marquee");
	t.ok(r.ok && r.state.grid[P("H3")] === -1, "et reste en place");
	// delta = 2 : destruction, l'attaquant ne bouge pas
	r = play(position(R, { N: { I: "H4 H5" }, S: { I: "H3" } }), 1, { m: [], a: P("H3") });
	t.ok(r.ok && r.turn.result.delta === 2 && r.turn.result.outcome === "destroy", "delta = 2 : destruction");
	t.ok(r.ok && r.state.grid[P("H3")] === 0 && r.state.grid[P("H4")] === 1 && r.state.retreat === -1, "cible retiree, attaquant en place");
	// on peut attaquer une unite de transmission
	r = play(position(R, { N: { I: "H4" }, S: { T: "H3" } }), 1, { m: [], a: P("H3") });
	t.ok(r.ok && r.turn.result.outcome === "destroy", "une transmission peut etre attaquee (4 contre 1)");
	// pas sa propre unite, pas une case vide
	r = play(position(R, { N: { I: "H4 H5" }, S: { I: "H3" } }), 1, { m: [], a: P("H5") });
	t.ok(!r.ok, "on n'attaque pas ses propres unites");
	r = play(position(R, { N: { I: "H4 H5" }, S: { I: "H3" } }), 1, { m: [], a: P("H2") });
	t.ok(!r.ok, "ni une case vide");
})();

/* ---------- retraite ---------- */
t.section("retraite");
(function () {
	const base = { N: { C: "H4" }, S: { I: "H3 K3 L3 N3 O3 P3" }, retreat: "H3" };
	let r = play(position(R, base), -1, { m: [] });
	t.ok(!r.ok && r.error === "retreat-first", "retraite ignoree : refuse");
	r = play(position(R, base), -1, { m: [[P("K3"), P("K4")]] });
	t.ok(!r.ok && r.error === "retreat-first", "un autre deplacement a la place : refuse");
	r = play(position(R, base), -1, { r: [P("K3"), P("K4")], m: [] });
	t.ok(!r.ok, "la retraite doit etre celle de l'unite marquee");
	r = play(position(R, base), -1, { r: [P("H3"), P("H1")], m: [] });
	t.ok(!r.ok && r.error === "unreachable", "retraite selon le mouvement normal de l'unite");
	r = play(position(R, base), -1, { r: [P("H3"), P("H2")], m: [] });
	t.ok(r.ok && r.state.retreat === -1 && r.state.grid[P("H2")] === -1, "retraite executee, marque levee");
	const four = [[P("K3"), P("K4")], [P("L3"), P("L4")], [P("N3"), P("N4")], [P("O3"), P("O4")]];
	r = play(position(R, base), -1, { r: [P("H3"), P("H2")], m: four });
	t.ok(r.ok, "retraite + 4 deplacements : 5 au total");
	r = play(position(R, base), -1, { r: [P("H3"), P("H2")], m: four.concat([[P("P3"), P("P4")]]) });
	t.ok(!r.ok && r.error === "too-many-moves", "retraite + 5 deplacements : refuse");
	r = play(position(R, base), -1, { r: [P("H3"), P("H2")], m: [[P("H2"), P("H1")]] });
	t.ok(!r.ok && r.error === "already-moved", "l'unite en retraite ne rebouge pas");
	r = play(position(R, { N: { C: "H4" }, S: { I: "H3" } }), -1, { r: [P("H3"), P("H2")], m: [] });
	t.ok(!r.ok && r.error === "no-retreat-due", "pas de retraite sans ordre de retraite");

	// l'unite qui a fait retraite ne participe pas a l'attaque de ce tour
	const turn = new R.Turn(ctx, position(R, { N: { C: "H4" }, S: { I: "H3 K3" }, retreat: "H3" }), -1);
	t.ok(turn.move(P("H3"), P("G3")), "retraite vers G3, au contact du cavalier");
	t.eq(turn.strength(P("H4")).att, 0, "elle ne compte pas dans l'attaque (K3 est hors de portee)");
	const free = new R.Turn(ctx, position(R, { N: { C: "H4" }, S: { I: "G3 K3" } }), -1);
	t.eq(free.strength(P("H4")).att, 4, "sans retraite, la meme unite attaquerait pour 4");

	// delta = 1 sur une unite isolee (defendue par une voisine a 2 cases) : detruite
	let st = position(R, { N: { C: "F6" }, S: { I: "G5 I3" } });
	t.ok(!on(st, -1, "G5") && on(st, -1, "I3"), "G5 isolee, I3 en communication");
	const iso = new R.Turn(ctx, st, 1);
	const s = iso.strength(P("G5"));
	t.eq([s.att, s.def], [7, 6], "une unite isolee est defendue par ses voisines (7 contre 6)");
	t.eq(iso.outcomeOf(P("G5"), s.delta), "destroy", "retraite impossible car isolee : detruite");
	t.ok(iso.attack(P("G5")) && iso.st.grid[P("G5")] === 0 && iso.st.retreat === -1, "l'unite est retiree tout de suite");
	// aucune case libre : detruite
	st = position(R, { S: { I: "T1 S1 S2 T2" }, N: { C: "R3" } });
	const blocked = new R.Turn(ctx, st, 1);
	t.eq(blocked.outcomeOf(P("T1"), 1), "destroy", "retraite impossible faute de case libre : detruite");
	t.eq(blocked.outcomeOf(P("S2"), 1), "retreat", "avec une case libre : retraite");
})();

/* ---------- arsenal ---------- */
t.section("arsenal");
(function () {
	const base = { N: { T: "S8", C: "S4", I: "S6" }, S: { I: "Q4" } };
	let st = position(R, base);
	t.ok(on(st, 1, "S4"), "le cavalier du Nord est en communication par sa transmission");
	let r = play(st, 1, { m: [[P("S4"), P("T3")]], d: P("T3") });
	t.ok(r.ok && r.state.ars[2] === 0 && r.state.ars[3] === 1, "une unite combattante qui entre dans l'arsenal vide le detruit");
	t.eq(R.moveToString({ m: [[P("S4"), P("T3")]], d: P("T3") }), "S4-T3!", "notation de la destruction");
	r = play(st, 1, { m: [[P("S4"), P("T3")]] });
	t.ok(!r.ok && r.error === "bad-arsenal-flag", "le coup doit signaler la destruction");
	r = play(st, 1, { m: [[P("S4"), P("T3")]], d: P("T3"), a: P("Q4") });
	t.ok(!r.ok && r.error === "arsenal-destroyed", "la destruction compte comme l'attaque du tour");
	const check = new R.Turn(ctx, st, 1);
	t.ok(check.attacks().some((a) => a.target === P("Q4")), "(sans elle, Q4 etait attaquable)");
	r = play(st, 1, { m: [[P("S4"), P("T3")], [P("S6"), P("S5")]], d: P("T3") });
	t.ok(r.ok, "les autres unites peuvent encore se deplacer");

	st = position(R, { N: { T: "S8", C: "S4" }, S: { I: "T3" } });
	r = play(st, 1, { m: [[P("S4"), P("T3")]], d: P("T3") });
	t.ok(!r.ok && r.error === "unreachable", "un arsenal occupe ne peut pas etre detruit");
	st = position(R, { N: { T: "S8", E: "S4" } });
	r = play(st, 1, { m: [[P("S4"), P("T3")]] });
	t.ok(r.ok && r.state.ars[2] === 1, "une unite de transmission ne detruit pas l'arsenal");
	st = position(R, { N: { I: "C8" } });
	r = play(st, 1, { m: [[P("C8"), P("D8")]] });
	t.ok(r.ok && r.state.ars[0] === 1, "une unite amie peut occuper son propre arsenal");
	// un seul arsenal par tour
	const two = R.makeContext({ map: Object.assign({}, R.DEFAULT_MAP, { arsenals: { north: ["D8", "B15"], south: ["T3", "T5"] } }) });
	st = position(R, { N: { T: "S8", C: "S4 S6" } });
	r = R.playTurn(two, st, 1, { m: [[P("S4"), P("T3")], [P("S6"), P("T5")]], d: P("T3") });
	t.ok(!r.ok, "pas deux destructions dans le meme tour");
	// la cavalerie s'arrete dans l'arsenal qu'elle detruit : elle ne le traverse pas
	const mid = R.makeContext({ map: Object.assign({}, R.DEFAULT_MAP, { arsenals: { north: ["D8", "B15"], south: ["T3", "R5"] } }) });
	st = position(R, { N: { C: "R4", I: "Q4 S4" }, S: { I: "Q5 S5 Q6 S6" } });
	t.ok(R.reach(mid, st, P("R4")).indexOf(P("R5")) >= 0, "le cavalier peut entrer dans l'arsenal");
	t.ok(R.reach(mid, st, P("R4")).indexOf(P("R6")) < 0, "mais ne va pas au-dela dans le meme deplacement");
	st.grid[P("R4")] = R.COURIER;
	t.ok(R.reach(mid, st, P("R4")).indexOf(P("R6")) >= 0, "une estafette, elle, ne fait que passer");
})();

/* ---------- fin de partie ---------- */
t.section("fin de partie");
(function () {
	let st = position(R, { N: { I: "D9" }, S: { I: "T4" }, ars: [1, 1, 0, 0] });
	t.eq(R.outcome(ctx, st, 1), { winner: 1, reason: "arsenals" }, "victoire A : les deux arsenaux detruits");
	st = position(R, { N: { I: "D9" }, S: { I: "T4" }, ars: [1, 1, 0, 1] });
	t.eq(R.outcome(ctx, st, 1).winner, 0, "un seul arsenal detruit : la partie continue");
	st = position(R, { N: { I: "D9" }, S: { T: "T4", E: "T5" } });
	t.eq(R.outcome(ctx, st, 1), { winner: 1, reason: "annihilated" }, "victoire B : plus d'unite combattante");
	st = position(R, { N: { I: "D9" }, S: { I: "K10 M12" } });
	t.eq(R.outcome(ctx, st, 1), { winner: 1, reason: "isolated" }, "victoire C : plus de transmission, tout est isole");
	t.eq(R.outcome(R.makeContext({ isolationVictory: false }), st, 1).winner, 0, "option isolationVictory desactivee : la partie continue");
	st = position(R, { N: { I: "D9" }, S: { I: "K10 M12", T: "L20" } });
	t.eq(R.outcome(ctx, st, 1).winner, 0, "il reste une transmission : pas de victoire C");
	st = position(R, { N: { I: "D9" }, S: { I: "K10 T4" } });
	t.eq(R.outcome(ctx, st, 1).winner, 0, "il reste une unite en communication : pas de victoire C");
	st = position(R, { N: { I: "D9" }, S: { I: "T4" }, turn: 400 });
	t.eq(R.outcome(ctx, st, 1), { winner: 2, reason: "max-turns" }, "nulle a maxTurns");
	t.eq(R.outcome(R.makeContext({ maxTurns: 0 }), st, 1).winner, 0, "maxTurns = 0 : pas de limite");
	st = position(R, { N: { I: "D9" }, S: { I: "T4" }, turn: 399 });
	t.eq(R.outcome(ctx, st, 1).winner, 0, "pas avant");
	st = position(R, { N: { T: "D9" }, S: { I: "T4" } });
	t.eq(R.outcome(ctx, st, 1).winner, -1, "le camp au trait peut aussi avoir perdu");
})();

/* ---------- validation d'un tour ---------- */
t.section("validation");
(function () {
	const six = "D2 D3 D4 D5 D6 D7";
	let st = position(R, { N: { I: six } });
	const moves = squares(six).map((p) => [p, p + R.W]);
	t.ok(play(st, 1, { m: moves.slice(0, 5) }).ok, "5 deplacements");
	let r = play(st, 1, { m: moves });
	t.ok(!r.ok && r.error === "too-many-moves", "6 deplacements : refuse");
	r = play(st, 1, { m: [[P("D7"), P("E7")], [P("E7"), P("F7")]] });
	t.ok(!r.ok && r.error === "already-moved", "une unite deplacee deux fois : refuse");
	t.ok(play(st, 1, { m: [] }).ok, "le tour vide est permis");
	t.ok(play(st, 1, {}).ok, "meme sans liste de deplacements");

	// chemin a travers des unites
	st = position(R, { N: { C: "G5", I: "F4 F5 F6" } });
	r = play(st, 1, { m: [[P("G5"), P("E5")]] });
	t.ok(!r.ok && r.error === "unreachable", "chemin a travers des unites amies : refuse");
	st = position(R, { N: { C: "G5", I: "F6" }, S: { I: "F4 F5" } });
	t.ok(on(st, 1, "G5"), "(le cavalier est en communication)");
	r = play(st, 1, { m: [[P("G5"), P("E5")]] });
	t.ok(!r.ok && r.error === "unreachable", "chemin a travers des unites ennemies : refuse");
	st = position(R, { N: { C: "G5", I: "F4 F6" } });
	t.ok(play(st, 1, { m: [[P("G5"), P("E5")]] }).ok, "le meme chemin, degage");
	r = play(st, 1, { m: [[P("G5"), P("F6")]] });
	t.ok(!r.ok, "pas sur une case occupee");
	st = position(R, { N: { C: "E9" } });
	r = play(st, 1, { m: [[P("E9"), P("E10")]] });
	t.ok(!r.ok, "pas sur une montagne");
	st = position(R, { N: { C: "D9" } });
	r = play(st, 1, { m: [[P("D9"), P("D11")]] });
	t.ok(!r.ok, "ni a travers");
	st = position(R, { N: { I: "D9" } });
	r = play(st, 1, { m: [[P("D9"), P("F9")]] });
	t.ok(!r.ok, "l'infanterie ne fait qu'un pas");

	// isolement
	st = position(R, { N: { I: "K20", T: "L20" } });
	r = play(st, 1, { m: [[P("K20"), P("K21")]] });
	t.ok(!r.ok && r.error === "isolated", "une unite isolee ne bouge pas");
	t.ok(play(st, 1, { m: [[P("L20"), P("L21")]] }).ok, "une transmission isolee peut bouger");
	st = position(R, { N: { I: "D6" } });
	r = play(st, 1, { m: [[P("D6"), P("E5")]] });
	t.ok(r.ok && !on(r.state, 1, "E5"), "une unite peut finir son deplacement isolee");
	// la communication est recalculee apres chaque deplacement
	st = position(R, { N: { I: "D6 E5" } });
	r = play(st, 1, { m: [[P("D6"), P("C6")], [P("E5"), P("F5")]] });
	t.ok(!r.ok && r.error === "isolated", "E5 perd le contact quand D6 s'en va, et ne peut plus bouger");
	r = play(st, 1, { m: [[P("E5"), P("F5")], [P("D6"), P("C6")]] });
	t.ok(r.ok, "dans l'autre ordre, les deux deplacements passent : l'ordre compte");

	// divers
	st = position(R, { N: { I: "D9" }, S: { I: "T4" } });
	t.ok(!play(st, 1, { m: [[P("T4"), P("S4")]] }).ok, "on ne deplace pas une unite adverse");
	t.ok(!play(st, 1, { m: [[P("A1"), P("A2")]] }).ok, "ni une case vide");
	t.ok(!play(st, 1, { m: [[P("D9"), 9999]] }).ok, "case hors plateau");
	t.ok(!play(st, 1, { m: "x" }).ok, "coup mal forme");
	t.ok(!play(st, 1, null).ok, "coup absent");
	t.ok(!play(st, 1, { m: [], d: P("T3") }).ok, "destruction d'arsenal annoncee a tort");

	// placement
	const fresh = R.newState();
	const good = { I: squares("A1 A2 A3 A4 A5 A6 A7 A8 A9"), C: squares("B1 B2 B3 B4"), A: [P("B5")], AC: [P("B6")], T: [P("D8")], E: [P("F10")] };
	r = R.playTurn(ctx, fresh, 1, { p: good });
	t.ok(r.ok && r.state.phase === 1, "placement du Nord (arsenal et col autorises)");
	t.eq(R.moveToString({ p: good }).slice(0, 16), "Nord: I@A1,I@A2,", "notation du placement");
	function bad(change, label, who, state) {
		const p = JSON.parse(JSON.stringify(good));
		change(p);
		const res = R.playTurn(ctx, state || fresh, who || 1, { p: p });
		t.ok(!res.ok, label + " (" + res.error + ")");
	}
	bad((p) => { p.I[0] = P("K1"); }, "placement hors de son territoire : refuse");
	bad((p) => { p.I[0] = P("C10"); }, "placement sur une montagne : refuse");
	bad((p) => { p.I[0] = P("A2"); }, "deux unites sur la meme case : refuse");
	bad((p) => { p.I.pop(); }, "une unite manquante : refuse");
	bad((p) => { p.C.push(P("B9")); }, "une unite en trop : refuse");
	bad((p) => { p.X = [1]; }, "type inconnu : refuse");
	t.ok(!R.playTurn(ctx, fresh, -1, { p: good }).ok, "le Sud ne place pas en premier");
	t.ok(!R.playTurn(ctx, fresh, 1, { m: [] }).ok, "pas de tour de jeu pendant le placement");
	t.ok(!R.playTurn(ctx, r.state, -1, { p: good }).ok, "le Sud ne place pas au Nord");
	const south = {};
	Object.keys(good).forEach((k) => { south[k] = good[k].map((p) => R.N - 1 - p); });
	const r2 = R.playTurn(ctx, r.state, -1, { p: south });
	t.ok(r2.ok && r2.state.phase === 2 && r2.state.turn === 2, "placement du Sud, puis phase de jeu");
	t.ok(!R.playTurn(ctx, r2.state, 1, { p: good }).ok, "plus de placement ensuite");
	t.ok(fresh.phase === 0 && fresh.grid.every((v) => v === 0), "playTurn ne modifie pas l'etat fourni");
})();

t.done();
