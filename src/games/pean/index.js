/*
 * Péan - wargame tactique a hexagones, deux joueurs, sans hasard.
 * Inspire d'Heraklios (F. Marcela-Froideval, Jeux & Strategie, 1980).
 *
 * Un jeu, plusieurs batailles : chaque scenario est un fichier JSON de
 * scenarios/, lu ici au build (gulp charge ce manifeste avec require) et
 * embarque dans gameOptions.scenarios ; la partie commence par un prelude,
 * le choix de la bataille (une vignette par scenario, son nom en grec
 * dessous). Ajouter une bataille = ajouter un fichier, une ligne a
 * SCENARIOS et sa vignette (extra/vignettes.py), sans toucher au code.
 *
 * Trois scripts de modele, dans cet ordre : les regles (pures), les
 * heuristiques de l'IA (pures elles aussi), puis l'habillage Jocly.
 */
exports.games = (function () {
	var modelScripts = [
		"pean-rules.js",
		"pean-ai.js",
		"pean-model.js"
	];
	var config_view_js = [
		"pean-xd-view.js"
	];

	// [fichier du scenario, vignette (extra/vignettes.py ; sous res/ pour etre
	// copiee dans dist), nom en grec sous la
	// vignette du prelude] ; l'ordre est celui du prelude (chronologique, la
	// bataille libre a la fin), le premier est le
	// scenario par defaut (la carte montree pendant le choix)
	var SCENARIOS = [
		["marathon-490", "res/images/batailles/marathon.png", "ΜΑΡΑΘΩΝ"],
		["thermopyles-480", "res/images/batailles/thermopyles.png", "ΘΕΡΜΟΠΥΛΑΙ"],
		["platees-479", "res/images/batailles/platees.png", "ΠΛΑΤΑΙΑΙ"],
		["laurion-413", "res/images/batailles/laurion.png", "ΛΑΥΡΙΟΝ"],
		["leuctres-371", "res/images/batailles/leuctres.png", "ΛΕΥΚΤΡΑ"],
		["bataille-libre", "res/images/batailles/libre.png", "ΕΛΛΗΝΕΣ"]
	];

	/*
	 * Les niveaux portent les grades de l'armee grecque, du chef d'enomotie
	 * (une trentaine d'hommes) au general en chef : Enomotarchos (caporal,
	 * sergent), Lochagos (capitaine), Taxiarchos (general de brigade),
	 * Strategos (general en chef, le moteur externe).
	 */
	var levels = [
		{
			"label": "Enomotarchos (Ἐνωμοτάρχης)",
			"ai": "uct",
			"maxDuration": 1,
			"maxLoops": 40,
			"candidates": 12,
			"playoutDepth": 0,
			"minVisitsExpand": 1,
			"c": 0.4,
			"ignoreLeaf": false,
			"useAlphaBeta": true,
			"propagation": "mixed",
			"propagateMultiVisits": false
		},
		{
			"label": "Lochagos (Λοχαγός)",
			"isDefault": true,
			"ai": "uct",
			"maxDuration": 2.5,
			"maxLoops": 150,
			"candidates": 18,
			"playoutDepth": 0,
			"minVisitsExpand": 1,
			"c": 0.4,
			"ignoreLeaf": false,
			"useAlphaBeta": true,
			"propagation": "mixed",
			"propagateMultiVisits": false
		},
		{
			"label": "Taxiarchos (Ταξίαρχος)",
			"ai": "uct",
			"maxDuration": 5,
			"maxLoops": 500,
			"candidates": 24,
			"playoutDepth": 0,
			"minVisitsExpand": 1,
			"c": 0.4,
			"ignoreLeaf": false,
			"useAlphaBeta": true,
			"propagation": "mixed",
			"propagateMultiVisits": false
		},
		{
			// Moteur externe, fourni par l'hote (Tabulon, crate `pean`) a
			// travers jocly.peanworker.js. Sans moteur, le tour est joue par
			// « Taxiarchos » et le repli est annonce : voir src/core/jocly.pean.js.
			// Le deploiement libre reste joue par l'IA du jeu.
			// Mesure (novembre 2026, « Taxiarchos » corrige, voir pean-ai.js
			// buildTurn) : 35 victoires, 2 nulles, 15 defaites sur 52 parties
			// (13 par scenario, camps alternes), 69 % ; 2,6 s par tour au plus.
			"label": "Strategos (Στρατηγός)",
			"ai": "pean",
			"moveTimeMs": 2500
		}
	];

	// les tuiles de Wesnoth de la skin « tuiles » (res/images/tuiles/)
	// les suites de cotes contigus dont Wesnoth fournit le rivage (voir
	// shoreImages dans la vue) : 1 a 4 cotes depuis chaque direction, et les six
	var RIVAGES = (function () {
		var D = ["n", "ne", "se", "s", "sw", "nw"], out = [D.join("-")];
		for (var len = 1; len <= 4; len++)
			for (var i = 0; i < 6; i++) {
				var run = [];
				for (var k = 0; k < len; k++) run.push(D[(i + k) % 6]);
				out.push(run.join("-"));
			}
		return out;
	})();

	// bords de marais : 1 a 3 cotes contigus depuis chaque direction
	var BORDS_MARAIS = RIVAGES.filter(function (r) { return r.split("-").length <= 3; });
	// bords de sentier : 1 a 3 cotes contigus, et les six
	var BORDS_SENTIER = RIVAGES.filter(function (r) { var n = r.split("-").length; return n <= 3 || n === 6; });

	// debords d'herbe (un cote par image) et de collines, poses par la vue
	var COTES = ["n", "ne", "se", "s", "sw", "nw"];
	var HERBE = [];
	["dry", "semi-dry"].forEach(function (g) {
		["abrupt", "medium", "long"].forEach(function (k) {
			COTES.forEach(function (d) { HERBE.push(g + "-" + k + "-" + d); });
		});
	});
	var COLLINES = COTES.concat(["n-ne", "s-sw"]).map(function (d) { return "dry-" + d; })
		.concat(["dry2-s", "dry2-se", "dry2-sw"])
		.concat(COTES.concat(["n-ne", "ne-se", "se-s", "s-sw", "sw-nw", "nw-n"]).map(function (d) { return "dry-to-water-" + d; }))
		.concat(["dry-to-water2-s", "dry-to-water2-s-sw", "dry-to-water2-se-s"]);

	function tileImages() {
		return ["plaine1", "plaine2", "plaine3", "plaine4", "plaine5", "route", "colline1", "colline2", "colline3",
			"foret1", "foret2", "foret3", "marais1", "marais2", "montagne1", "montagne2",
			"mer", "ville", "camp", "mine", "sentier1", "sentier2", "sentier3", "plage1", "plage2", "plage3"
		].map(function (t) { return "image|/res/images/tuiles/" + t + ".png"; })
			// rivages (sable sur la mer) et nenuphars des marais, poses par la vue
			.concat(RIVAGES.map(function (r) { return "image|/res/images/rivage/beach-" + r + ".png"; }))
			.concat(["nenuphars1", "nenuphars2"].map(function (t) { return "image|/res/images/decors/" + t + ".png"; }))
			.concat(BORDS_MARAIS.map(function (r) { return "image|/res/images/marais/water-" + r + ".png"; }))
			.concat(BORDS_SENTIER.map(function (r) { return "image|/res/images/sentier/stone-path-" + r + ".png"; }))
			.concat(HERBE.map(function (r) { return "image|/res/images/herbe/" + r + ".png"; }))
			.concat(COLLINES.map(function (r) { return "image|/res/images/collines/" + r + ".png"; }));
	}

	// emblemes, bannieres et pictogrammes de terrain utilises par un scenario
	function insigniaImages(scenario) {
		var list = ["foret", "marais", "montagne", "mer", "colline", "ville", "camp", "mine"].map(function (t) {
			return "image|/res/images/terrain/" + t + ".png";
		});
		function add(kind, name) {
			var path = "image|/res/images/" + kind + "/" + name + ".png";
			if (name && list.indexOf(path) < 0) list.push(path);
		}
		Object.keys(scenario.camps).forEach(function (k) {
			var camp = scenario.camps[k];
			add("emblemes", camp.embleme);
			add("bannieres", camp.banniere);
			(camp.unites || []).concat(camp.renforts || []).forEach(function (u) { add("emblemes", u.embleme); });
		});
		return list;
	}

	function game() {
		var scenarios = SCENARIOS.map(function (s) { return require("./scenarios/" + s[0] + ".json"); });
		var preload = tileImages();
		// decors (temple de Demeter, navires...) et tuiles propres a une bataille
		function add(img) { if (img && preload.indexOf(img) < 0) preload.push(img); }
		scenarios.forEach(function (sc) {
			var map = sc.carte || {};
			(sc.objectifs || []).concat(map.decors || []).forEach(function (o) {
				var name = o.decor || o.image;
				if (name) add("image|/res/images/decors/" + name + ".png");
			});
			Object.keys(map.tuiles || {}).forEach(function (k) {
				map.tuiles[k].forEach(function (t) { add("image|/res/images/tuiles/" + t + ".png"); });
			});
		});
		scenarios.forEach(function (sc) {
			insigniaImages(sc).forEach(function (img) { if (preload.indexOf(img) < 0) preload.push(img); });
		});
		// skins sans tuiles : ni tuiles, ni decors, ni debords entre terrains
		var insignia = preload.filter(function (img) { return !/\/(tuiles|decors|rivage|marais|sentier|herbe|collines)\//.test(img); });
		return {
			"name": "pean",
			"modelScripts": modelScripts,
			"config": {
				"status": true,
				"model": {
					"title-en": "Pean",
					"title": {
						"en": "Pean",
						"fr": "Péan"
					},
					"summary": {
						"en": "Hex wargame of Greek antiquity: Plataea, Laurium, Leuctra or a free battle",
						"fr": "Wargame à hexagones de l’Antiquité grecque : Platées, le Laurion, Leuctres ou une bataille libre"
					},
					"rules": {
						"en": "rules.html",
						"fr": "rules-fr.html"
					},
					"description": {
						"en": "description.html",
						"fr": "description-fr.html"
					},
					"credits": {
						"en": "credits.html",
						"fr": "credits-fr.html"
					},
					"thumbnail": "thumbnail.png",
					"module": "pean",
					"plazza": "true",
					"js": modelScripts,
					"maxLevel": levels.length,
					"defaultLevel": 2,
					"gameOptions": {
						// passer est permis et la limite de tours clot la partie :
						// une position repetee n'est pas une nulle
						"preventRepeat": false,
						"placementCandidates": 6,
						// les batailles, et celle de depart (montree pendant le prelude)
						"scenarios": scenarios,
						"scenario": scenarios[0],
						/*
						 * Le choix de la bataille, premier coup de la partie
						 * (« #k »), puis une etape vide (« -- ») qui rend la main :
						 * le moteur inverse le trait apres chaque coup, et c'est
						 * le premier camp qui doit jouer ensuite. Meme convention
						 * que go/index.js et checkers/index.js. Pas de
						 * `persistent` : on choisit a chaque partie.
						 */
						"prelude": [
							{
								"labels": SCENARIOS.map(function (s) { return s[2]; }),
								"thumbnails": SCENARIOS.map(function (s) { return s[1]; })
							},
							0
						],
						"levelOptions": {
							"candidates": 18
						}
					},
					"levels": levels
				},
				"view": {
					"title-en": "Pean view",
					"module": "pean",
					"js": config_view_js,
					"css": [
						"pean.css"
					],
					"xdView": true,
					"preferredRatio": 1.45,
					"switchable": true,
					"animateSelfMoves": false,
					"useNotation": true,
					"useShowMoves": true,
					"defaultOptions": {
						"sounds": false,
						"notation": true,
						"moves": true
					},
					"skins": [
						{
							// tuiles de terrain de Wesnoth (GPL v2+) et pions a
							// emblemes de 0 A.D. (CC BY-SA 3.0) : voir les credits
							"name": "tuiles",
							"title": "Tuiles (2D)",
							"preload": preload
						},
						{
							// tuiles, et pions carres de wargame
							"name": "wargame",
							"title": "Wargame (2D)",
							"preload": preload
						},
						{
							// les emblemes de 0 A.D. pour boucliers (CC BY-SA 3.0),
							// les pictogrammes de terrain de Wesnoth (GPL v2+) :
							// res/images/, voir les credits ; fonds de couleur
							"name": "insignes",
							"title": "Insignes (2D)",
							"preload": insignia
						},
						{
							// carte d'etat-major, papier clair
							"name": "carte",
							"title": "Carte (2D)",
							"preload": []
						}
					]
				}
			},
			"viewScripts": config_view_js
		};
	}

	return [game()];
})();
