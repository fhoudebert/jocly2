exports.games = (function() {
	var modelScripts = [
		"mills-model.js",
		"9-men-morris-model.js"
	]
	var config_model_levels = {
		"label": "Easy",
		"maxDepth": 2,
		"potential": 100,
		"placingRace": 1,
		"isDefault": true
	}
	var config_model_levels_2 = {
		"label": "Medium",
		"maxDepth": 4,
		"potential": 300,
		"placingRace": 1
	}
	var config_model_levels_3 = {
		"label": "Hard",
		"maxDepth": 8,
		"potential": 1000,
		"placingRace": 2
	}
	var config_model_levels_4 = [
		config_model_levels,
		config_model_levels_2,
		config_model_levels_3
	]
	var config_view_css = [
		"mills.css",
		"9-men-morris.css"
	]
	var config_view_js = [
		"mills-xd-view.js",
		"9-men-morris-view.js"
	]
	var config_view_visuals_600x600 = [
		"res/visuals/ninemen-600x600-3d.jpg",
		"res/visuals/ninemen-600x600-2d.jpg"
	]
	var config_model_rules = {
		"en": "rules.html",
		"fr": "rules-fr.html"
	}
	var config_view_visuals = {
		"600x600": config_view_visuals_600x600
	}
	var config_view_defaultOptions = {
		"sounds": true,
		"notation": false,
		"moves": true
	}
	var config_view_sounds = {
		"move1": "move1",
		"move2": "move2",
		"move3": "move3",
		"move4": "move4",
		"tac1": "tac1",
		"tac2": "tac2",
		"tac3": "tac3",
		"capture": "promo",
		"usermove": null
	}
	var config_view_skins_camera = {
		"radius": 14,
		"elevationAngle": 45,
		"distMax": 39.5,
		"distMin": 10.1,
		"elevationMin": -89.9,
		"elevationMax": 89.9,
		"limitCamMoves": true
	}
	var config_view_skins_world_lightPosition = {
		"x": 0,
		"y": 18,
		"z": 0
	}
	var config_view_skins_world = {
		"lightIntensity": 0.6,
		"skyLightIntensity": 0.3,
		"lightPosition": config_view_skins_world_lightPosition,
		"color": 0,
		"fog": false
	}
	var config_view_skins_preload = [
		"image|/res/xd-view/meshes/woodcell1x512.jpg",
		"image|/res/xd-view/meshes/piecetop-bump.jpg",
		"image|/res/xd-view/meshes/piecediff.jpg",
		"smoothedfilegeo|0|/res/xd-view/meshes/piece-v2.js",
		"smoothedfilegeo|0|/res/xd-view/meshes/boardoriented.js",
		"smoothedfilegeo|0|/res/xd-view/meshes/ring-target.js"
	]
	var config_view_skins = {
		"name": "classic3d",
		"title": "3D Classic",
		"3d": true,
		"camera": config_view_skins_camera,
		"world": config_view_skins_world,
		"preload": config_view_skins_preload
	}
	var config_view_skins_2 = {
		"name": "stone",
		"title": "Stone"
	}
	var config_view_skins_3 = {
		"name": "suede",
		"title": "Suede"
	}
	var config_view_skins_4 = {
		"name": "wood",
		"title": "Wood"
	}
	var config_view_skins_5 = [
		config_view_skins,
		config_view_skins_2,
		config_view_skins_3,
		config_view_skins_4
	]
	var config_view_css_2 = [
		"mills.css",
		"12-men-morris.css"
	]
	var config_view_js_2 = [
		"mills-xd-view.js",
		"12-men-morris-view.js"
	]
	// The merged 12-men game: the prelude asks which rule set before the first
	// move. prelude-model.js must come after mills-model.js, whose InitGame,
	// board methods and all four Move methods it wraps; prelude-view.js after
	// mills-xd-view.js, whose xdInit publishes the cell size it measures in
	// and whose state machine it stands in for.
	var modelScripts_morris9 = [
		"mills-model.js",
		"9-men-morris-model.js",
		"prelude-model.js"
	]
	var config_view_js_morris9 = [
		"mills-xd-view.js",
		"9-men-morris-view.js",
		"prelude-view.js"
	]
	var modelScripts_morris12 = [
		"mills-model.js",
		"12-men-morris-model.js",
		"prelude-model.js"
	]
	var config_view_js_morris12 = [
		"mills-xd-view.js",
		"12-men-morris-view.js",
		"prelude-view.js"
	]
	/*
	 * The two rule sets, as the differences from the manifest's own options.
	 *
	 * 9 and 12 Men's Morris offer the same choice, so the table is built here
	 * rather than written twice, with only the button captions passed in. A
	 * function rather than a shared constant on purpose: prelude-model.js
	 * writes the chosen index back into "persistent" to remember it, and two
	 * games sharing one object would remember each other's answer.
	 *
	 * Each set names every option it needs even when the value matches the
	 * default, because prelude-model.js restores the defaults before applying
	 * a set. Without that, picking the plain game after the flying one would
	 * keep canFly and play a third game that is neither.
	 *
	 * Note poundInMill is tested as "== false" in mills-model.js, so leaving
	 * it out is not the same as setting it true: undefined allows a man in a
	 * mill to be taken, which is what the flying variant does.
	 */
	function MorrisPrelude(plain, fly) {
		return [
			{
				"panelWidth": 2,
				"labels": [
					plain,
					fly
				],
				"persistent": true,
				"rules": [
					{
						"poundInMill": false,
						"canFly": false
					},
					{
						"poundInMill": true,
						"canFly": true
					}
				]
			},
			0
		]
	}
	var config_model_prelude_morris12 = MorrisPrelude("12 Men´s Morris", "12 Men´s Morris Fly")
	var config_model_prelude_morris9 = MorrisPrelude("9 Men´s Morris", "9 Men´s Morris Fly")
	var config_view_visuals_600x600_2 = [
		"res/visuals/twelvemen-600x600-3d.jpg",
		"res/visuals/twelvemen-600x600-2d.jpg"
	]
	var config_view_visuals_2 = {
		"600x600": config_view_visuals_600x600_2
	}
	var config_view = {
		"title-en": "12 Men´s Morris View",
		"switchable": true,
		"xdView": true,
		"css": config_view_css_2,
		"js": config_view_js_2,
		"module": "mills",
		"preferredRatio": 1.2857142857143,
		"visuals": config_view_visuals_2,
		"animateSelfMoves": false,
		"useNotation": true,
		"useShowMoves": true,
		"defaultOptions": config_view_defaultOptions,
		"sounds": config_view_sounds,
		"skins": config_view_skins_5
	}
	/*
	 * The 9-men view, lifted out of the two entries that inlined it. They were
	 * identical but for the title, where "9-men-morris" said "7 Men´s Morris
	 * View" - a copy-paste slip; the correct one is kept.
	 */
	var config_view_9 = {
		"title-en": "9 Men´s Morris View",
		"switchable": true,
		"xdView": true,
		"css": config_view_css,
		"js": config_view_js,
		"module": "mills",
		"preferredRatio": 1.2857142857143,
		"visuals": config_view_visuals,
		"animateSelfMoves": false,
		"useNotation": true,
		"useShowMoves": true,
		"defaultOptions": config_view_defaultOptions,
		"sounds": config_view_sounds,
		"skins": config_view_skins_5
	}
	var config_view_morris9 = Object.assign({}, config_view_9, {
		"js": config_view_js_morris9
	})
	// The board and the set are the plain 12-men ones; only the script list
	// differs, so the view is that one with the overlay appended rather than a
	// copy that could drift from it.
	var config_view_morris12 = Object.assign({}, config_view, {
		"js": config_view_js_morris12
	})
	var modelScripts_3 = [
		"mills-model.js",
		"6-men-morris-model.js"
	]
	var config_view_js_3 = [
		"mills-xd-view.js",
		"6-men-morris-view.js"
	]
	var modelScripts_5 = [
		"mills-model.js",
		"7-men-morris-model.js"
	]
	var config_view_js_5 = [
		"mills-xd-view.js",
		"7-men-morris-view.js"
	]
	return [
		{
			"name": "morris9",
			"modelScripts": modelScripts_morris9,
			"config": {
				"status": true,
				"model": {
				    "title": {
					    "en": "9 Men´s Morris",
					    "fr": "Marelle à 9"
				    },
					"summary": {
						"en": "An old board game, plain or flying",
						"fr": "Jeu du moulin classique ou avec saut"
					},
					"rules": {
						"en": "rules-morris9.html",
						"fr": "rules-morris9-fr.html"
					},
					"maxLevel": 7,
					"plazza": "true",
					"thumbnail": "mensmorris9-thumb3d.png",
					"module": "mills",
					"credits": {
						"en": "credits.html",
						"fr": "credits-fr.html"
					},
					"description": {
						"en": "description.html",
						"fr": "description-fr.html"
					},
					"js": modelScripts_morris9,
					"gameOptions": {
						"preventRepeat": true,
						"width": 7,
						"height": 7,
						"mencount": 9,
						"poundInMill": false,
						"prelude": config_model_prelude_morris9
					},
					"levels": config_model_levels_4
				},
				"view": config_view_morris9
			},
			"viewScripts": config_view_js_morris9
		},
		{
			"name": "morris12",
			"modelScripts": modelScripts_morris12,
			"config": {
				"status": true,
				"model": {
				    "title": {
					    "en": "12 Men´s Morris",
					    "fr": "Marelle à 12"
				    },
					"summary": {
						"en": "An old board game, plain or flying",
						"fr": "Jeu du moulin classique ou avec saut"
					},
					"rules": {
						"en": "rules-morris12.html",
						"fr": "rules-morris12-fr.html"
					},
					"maxLevel": 7,
					"plazza": "true",
					"thumbnail": "mensmorris12-thumb3d.png",
					"module": "mills",
					"credits": {
						"en": "credits.html",
						"fr": "credits-fr.html"
					},
					"description": {
						"en": "description.html",
						"fr": "description-fr.html"
					},
					"js": modelScripts_morris12,
					"gameOptions": {
						"preventRepeat": true,
						"width": 7,
						"height": 7,
						"mencount": 12,
						"poundInMill": false,
						"prelude": config_model_prelude_morris12
					},
					"levels": config_model_levels_4
				},
				"view": config_view_morris12
			},
			"viewScripts": config_view_js_morris12
		},
		{
			"name": "6-men-morris",
			"modelScripts": modelScripts_3,
			"config": {
				"status": true,
				"model": {
				    "title": {
					    "en": "6 Men´s Morris",
					    "fr": "Marelle à 6"
				    },
					"summary": {
						"en": "An old board game, plain or flying",
						"fr": "Jeu du moulin classique ou avec saut"
					},
					"rules": config_model_rules,
					"maxLevel": 7,
					"plazza": "true",
					"thumbnail": "mensmorris6-thumb3d.png",
					"module": "mills",
					"credits": {
						"en": "credits.html",
						"fr": "credits-fr.html"
					},
					"description": {
						"en": "description.html",
						"fr": "description-fr.html"
					},
					"js": modelScripts_3,
					"gameOptions": {
						"preventRepeat": true,
						"width": 5,
						"height": 5,
						"mencount": 6,
						"poundInMill": false
					},
					"levels": config_model_levels_4
				},
				"view": {
					"title-en": "6 Men´s Morris View",
					"switchable": true,
					"xdView": true,
					"css": [
						"mills.css",
						"6-men-morris.css"
					],
					"js": config_view_js_3,
					"module": "mills",
					"preferredRatio": 1.4,
					"visuals": {
						"600x600": [
							"res/visuals/sixmen-600x600-3d.jpg",
							"res/visuals/sixmen-600x600-2d.jpg"
						]
					},
					"animateSelfMoves": false,
					"useNotation": true,
					"useShowMoves": true,
					"defaultOptions": config_view_defaultOptions,
					"sounds": config_view_sounds,
					"skins": config_view_skins_5
				}
			},
			"viewScripts": config_view_js_3
		},
		{
			"name": "7-men-morris",
			"modelScripts": modelScripts_5,
			"config": {
				"status": true,
				"model": {
				    "title": {
					    "en": "7 Men´s Morris",
					    "fr": "Marelle à 7"
				    },
					"summary": {
						"en": "An old board game, plain or flying",
						"fr": "Jeu du moulin classique ou avec saut"
					},
					"rules": config_model_rules,
					"maxLevel": 7,
					"plazza": "true",
					"thumbnail": "mensmorris7-thumb3d.png",
					"module": "mills",
					"credits": {
						"en": "credits.html",
						"fr": "credits-fr.html"
					},
					"description": {
						"en": "description.html",
						"fr": "description-fr.html"
					},
					"js": modelScripts_5,
					"gameOptions": {
						"preventRepeat": true,
						"width": 5,
						"height": 5,
						"mencount": 7,
						"poundInMill": false
					},
					"levels": config_model_levels_4
				},
				"view": {
					"title-en": "7 Men´s Morris View",
					"switchable": true,
					"xdView": true,
					"css": [
						"mills.css",
						"7-men-morris.css"
					],
					"js": config_view_js_5,
					"module": "mills",
					"preferredRatio": 1.4,
					"visuals": {
						"600x600": [
							"res/visuals/sevenmen-600x600-3d.jpg",
							"res/visuals/sevenmen-600x600-2d.jpg"
						]
					},
					"animateSelfMoves": false,
					"useNotation": true,
					"useShowMoves": true,
					"defaultOptions": config_view_defaultOptions,
					"sounds": config_view_sounds,
					"skins": config_view_skins_5
				}
			},
			"viewScripts": config_view_js_5
		}
	]
})()
