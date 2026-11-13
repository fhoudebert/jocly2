/*
 * Péan - wargame tactique a hexagones, deux joueurs, sans hasard.
 * Inspire d'Heraklios (F. Marcela-Froideval, Jeux & Strategie, 1980).
 *
 * Un module, plusieurs jeux : un jeu par scenario. Le moteur (regles, IA,
 * vue) est commun ; chaque scenario est un fichier JSON de scenarios/, lu
 * ici au build (gulp charge ce manifeste avec require) et embarque dans
 * gameOptions.scenario. Ajouter une bataille = ajouter un fichier et une
 * ligne a SCENARIOS, sans toucher au code.
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

	// [nom du jeu, fichier du scenario, vignette]
	var SCENARIOS = [
		["pean-bataille-libre", "bataille-libre", "thumbnail.png"],
		["pean-leuctres", "leuctres-371", "thumbnail.png"],
		["pean-platees", "platees-479", "thumbnail.png"]
	];

	var levels = [
		{
			"label": "Caporal",
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
			"label": "Capitaine",
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
			"label": "Général",
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
		}
	];

	// emblemes, bannieres et pictogrammes de terrain utilises par un scenario
	function insigniaImages(scenario) {
		var list = ["foret", "marais", "montagne", "mer", "colline", "ville", "camp"].map(function (t) {
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

	function game(name, file, thumbnail) {
		var scenario = require("./scenarios/" + file + ".json");
		var title = scenario.titre || { fr: file, en: file };
		return {
			"name": name,
			"modelScripts": modelScripts,
			"config": {
				"status": true,
				"model": {
					"title-en": "Pean – " + title.en,
					"title": {
						"en": "Pean – " + title.en,
						"fr": "Péan – " + title.fr
					},
					"summary": {
						"en": scenario.resume ? scenario.resume.en : "Hex wargame of Greek antiquity",
						"fr": scenario.resume ? scenario.resume.fr : "Wargame à hexagones de l’Antiquité grecque"
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
					"thumbnail": thumbnail,
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
						"scenario": scenario,
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
							// les emblemes de 0 A.D. pour boucliers (CC BY-SA 3.0),
							// les pictogrammes de terrain de Wesnoth (GPL v2+) :
							// res/images/, voir les credits ; palette attique
							"name": "insignes",
							"title": "Insignes (2D)",
							"preload": insigniaImages(scenario)
						},
						{
							// figures rouges : fond de terre cuite, vernis noir
							"name": "attique",
							"title": "Céramique attique (2D)",
							"preload": []
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

	return SCENARIOS.map(function (s) { return game(s[0], s[1], s[2]); });
})();
