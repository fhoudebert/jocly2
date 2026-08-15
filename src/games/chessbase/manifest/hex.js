/*
 * The hexagonal boards: Glinski, Brusky, De Vasa, McCooey and Shafran. Model
 * and view scripts live in hex/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_view_defaultOptions, config_view_skins_world,
	config_view_sounds, config_model_levels_15, config_view_skins_preload_4,
	config_view_skins_preload_6, config_view_skins_camera_3, config_view_skins_6,
	config_view_skins_7, config_view_skins_preload_8
} = require("./shared.js");

// declarations only this family uses, lifted out of shared.js
var modelScripts_17 = [
	"base-model.js",
	"hex-geo-model.js",
	"hex/glinski-model.js"
]

var config_view_css_2 = [
	"chessbase.css",
	"hex.css"
]

var config_view_skins_8 = [
	config_view_skins_6,
	config_view_skins_7
]

var config_view_js_17 = [
	"base-view.js",
	"hex-board-view.js",
	"staunton-set-view.js",
	"hex/glinski-view.js"
]

var modelScripts_18 = [
	"base-model.js",
	"hex-geo-model.js",
	"hex/brusky-model.js"
]

var config_view_js_18 = [
	"base-view.js",
	"hex-board-view.js",
	"staunton-set-view.js",
	"hex/brusky-view.js"
]

var modelScripts_19 = [
	"base-model.js",
	"hex-geo-model.js",
	"hex/devasa-model.js"
]

var config_view_js_19 = [
	"base-view.js",
	"hex-board-view.js",
	"staunton-set-view.js",
	"hex/devasa-view.js"
]

var modelScripts_20 = [
	"base-model.js",
	"hex-geo-model.js",
	"hex/mccooey-model.js"
]

var config_view_js_20 = [
	"base-view.js",
	"hex-board-view.js",
	"staunton-set-view.js",
	"hex/mccooey-view.js"
]

var modelScripts_21 = [
	"base-model.js",
	"hex-geo-model.js",
	"hex/shafran-model.js"
]

var config_view_js_21 = [
	"base-view.js",
	"hex-board-view.js",
	"staunton-set-view.js",
	"hex/shafran-view.js"
]

exports.games = {

	"glinski-chess": {
		"name": "glinski-chess",
		"modelScripts": modelScripts_17,
		"config": {
			"status": true,
			"model": {
				"title-en": "Glinski Chess",
				"summary": {
					"en": "Hexagonal Chess",
					"fr": "Échecs hexagonaux"
				},
				"rules": {
					"en": "res/rules/glinski/glinski-rules.html",
                        "fr": "res/rules/glinski/glinski-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/glinski/glinski-thumb.png",
				"released": 1396882578,
				"credits": {
					"en": "res/rules/glinski/glinski-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_17,
				"description": {
					"en": "res/rules/glinski/glinski-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/glinski-600x600-3d.jpg",
						"res/visuals/glinski-600x600-2d.jpg"
					]
				},
				"xdView": true,
				"css": config_view_css_2,
				"preferredRatio": 0.89,
				"useShowMoves": true,
				"useNotation": true,
				"module": "chessbase",
				"defaultOptions": config_view_defaultOptions,
				"skins": config_view_skins_8,
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_17,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_17
	},

	"brusky-chess": {
		"name": "brusky-chess",
		"modelScripts": modelScripts_18,
		"config": {
			"status": true,
			"model": {
				"title-en": "Brusky Chess",
				"summary": {
					"en": "Hexagonal Chess",
					"fr": "Échecs hexagonaux"
				},
				"rules": {
					"en": "res/rules/brusky/brusky-rules.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/brusky/brusky-thumb.png",
				"released": 1398790818,
				"credits": {
					"en": "res/rules/brusky/brusky-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_18,
				"description": {
					"en": "res/rules/brusky/brusky-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/brusky-600x600-3d.jpg",
						"res/visuals/brusky-600x600-2d.jpg"
					]
				},
				"xdView": true,
				"css": config_view_css_2,
				"preferredRatio": 1.7,
				"useShowMoves": true,
				"useNotation": true,
				"module": "chessbase",
				"defaultOptions": config_view_defaultOptions,
				"skins": [
					{
						"name": "skin3d",
						"title": "3D Classic",
						"3d": true,
						"preload": config_view_skins_preload_4,
						"world": config_view_skins_world,
						"camera": config_view_skins_camera_3
					},
					config_view_skins_7
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_18,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_18
	},

	"devasa-chess": {
		"name": "devasa-chess",
		"modelScripts": modelScripts_19,
		"config": {
			"status": true,
			"model": {
				"title-en": "De Vasa Chess",
				"summary": {
					"en": "Hexagonal Chess",
					"fr": "Échecs hexagonaux"
				},
				"rules": {
					"en": "res/rules/devasa/devasa-rules.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/devasa/devasa-thumb.png",
				"released": 1403189777,
				"credits": {
					"en": "res/rules/devasa/devasa-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_19,
				"description": {
					"en": "res/rules/devasa/devasa-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/devasa-600x600-3d.jpg",
						"res/visuals/devasa-600x600-2d.jpg"
					]
				},
				"xdView": true,
				"css": config_view_css_2,
				"preferredRatio": 1.154700538,
				"useShowMoves": true,
				"useNotation": true,
				"module": "chessbase",
				"defaultOptions": config_view_defaultOptions,
				"skins": [
					{
						"name": "skin3d",
						"title": "3D Classic",
						"3d": true,
						"preload": config_view_skins_preload_6,
						"world": config_view_skins_world,
						"camera": {
							"fov": 45,
							"distMax": 50,
							"radius": 14.5,
							"elevationAngle": 45,
							"elevationMin": 0,
							"distMin": 0,
							"rotationAngle": 80
						}
					},
					config_view_skins_7
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_19,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_19
	},

	"mccooey-chess": {
		"name": "mccooey-chess",
		"modelScripts": modelScripts_20,
		"config": {
			"status": true,
			"model": {
				"title-en": "McCooey Chess",
				"summary": {
					"en": "Hexagonal Chess",
					"fr": "Échecs hexagonaux"
				},
				"rules": {
					"en": "res/rules/mccooey/mccooey-rules.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/mccooey/mccooey-thumb.png",
				"released": 1402671378,
				"credits": {
					"en": "res/rules/mccooey/mccooey-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_20,
				"description": {
					"en": "res/rules/mccooey/mccooey-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/mccooey-600x600-3d.jpg",
						"res/visuals/mccooey-600x600-2d.jpg"
					]
				},
				"xdView": true,
				"css": config_view_css_2,
				"preferredRatio": 1,
				"useShowMoves": true,
				"useNotation": true,
				"module": "chessbase",
				"defaultOptions": config_view_defaultOptions,
				"skins": config_view_skins_8,
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_20,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_20
	},

	"shafran-chess": {
		"name": "shafran-chess",
		"modelScripts": modelScripts_21,
		"config": {
			"status": true,
			"model": {
				"title-en": "Shafran Chess",
				"summary": {
					"en": "Hexagonal Chess",
					"fr": "Échecs hexagonaux"
				},
				"rules": {
					"en": "res/rules/shafran/shafran-rules.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/shafran/shafran-thumb.png",
				"released": 1403535378,
				"credits": {
					"en": "res/rules/shafran/shafran-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_21,
				"description": {
					"en": "res/rules/shafran/shafran-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/shafran-600x600-3d.jpg",
						"res/visuals/shafran-600x600-2d.jpg"
					]
				},
				"xdView": true,
				"css": config_view_css_2,
				"preferredRatio": 1,
				"useShowMoves": true,
				"useNotation": true,
				"module": "chessbase",
				"defaultOptions": config_view_defaultOptions,
				"skins": [
					{
						"name": "skin3d",
						"title": "3D Classic",
						"3d": true,
						"preload": config_view_skins_preload_8,
						"world": config_view_skins_world,
						"camera": config_view_skins_camera_3
					},
					config_view_skins_7
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_21,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_21
	},

};
