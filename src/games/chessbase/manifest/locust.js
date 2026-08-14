/*
 * The variants built on locust capture, where a piece is taken without the
 * capturer landing on its square: Werewolf, Elven, Makromachy and Minjiku
 * Shogi. Model and view scripts live in locust/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_view_css, config_view_defaultOptions,
	config_view_skins_world, config_view_skins_camera, config_view_sounds,
	config_model_gameOptions_2, config_view_skins_2, modelScripts_101, modelScripts_102,
	modelScripts_109, modelScripts_110, config_model_levels_15, config_view_js_101,
	config_view_js_102, config_view_js_109, config_view_js_110
} = require("./shared.js");

exports.games = {

	"werewolf-chess": {
		"name": "werewolf-chess",
		"modelScripts": modelScripts_101,
		"config": {
			"status": true,
			"model": {
				"title-en": "Werewolf Chess",
				"summary": {
					"en":"a contageous Werewolf replaces the Queen",
					"fr": "Un loup garou contagieux remplace la reine"
				},
				"rules": {
					"en": "res/rules/werewolf/werewolf-rules.html",
					"fr": "res/rules/werewolf/werewolf-rules_fr.html",
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/werewolf/werewolf-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/werewolf/werewolf-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"js": modelScripts_101,
				"description": {
					"en": "res/rules/werewolf/werewolf-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/werewolf-600x600-3d.jpg",
						"res/visuals/werewolf-600x600-2d.jpg"
					]
				},
				"xdView": true,
				"css": config_view_css,
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
						"preload": [
							"smoothedfilegeo|0|/res/ring-target.js",
							"image|/res/images/cancel.png",
							"image|/res/images/wikipedia.png"
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera
					},
					config_view_skins_2
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_101,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_101
	},

	"elven-chess": {
		"name": "elven-chess",
		"modelScripts": modelScripts_102,
		"config": {
			"status": true,
			"model": {
				"title-en": "Elven Chess",
				"summary": {
					"en": "10x10 variant with double-capturing super-piece",
					"fr": "Variante 10x10 avec une super-pièce à double capture"
				},
				"rules": {
					"en": "res/rules/elven/elven-rules.html",
					"fr": "res/rules/elven/elven-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/elven/elven-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/elven/elven-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"js": modelScripts_102,
				"description": {
					"en": "res/rules/elven/elven-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/elven-600x600-3d.jpg",
						"res/visuals/elven-600x600-2d.jpg"
					]
				},
				"xdView": true,
				"css": config_view_css,
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
						"preload": [
							"smoothedfilegeo|0|/res/ring-target.js",
							"image|/res/images/cancel.png",
							"image|/res/images/wikipedia.png"
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera
					},
					config_view_skins_2
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_102,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_102
	},

	"makromachy": {
		"name": "makromachy",
		"modelScripts": modelScripts_109,
		"config": {
			"status": true,
			"model": {
				"title-en": "Makromachy",
				"summary": {
					"en": "14x14 variant with flying pieces",
					"fr": "14x14 avec des pièces volantes"
				},
				"rules": {
					"en": "res/rules/makromachy/makromachy-rules.html",
					"fr": "res/rules/makromachy/makromachy-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/makromachy/makromachy-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/makromachy/makromachy-credits.html"
				},
				"gameOptions": config_model_gameOptions_2,
				"js": modelScripts_109,
				"description": {
					"en": "res/rules/makromachy/makromachy-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/makromachy-600x600-3d.jpg",
						"res/visuals/makromachy-600x600-2d.jpg"
					]
				},
				"xdView": true,
				"css": config_view_css,
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
						"preload": [
							"smoothedfilegeo|0|/res/ring-target.js",
							"image|/res/images/cancel.png",
							"image|/res/images/wikipedia.png"
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera
					},
					config_view_skins_2
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_109,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_109
	},

	"minjiku-shogi": {
		"name": "minjiku-shogi",
		"modelScripts": modelScripts_110,
		"config": {
			"status": true,
			"model": {
				"title-en": "Minjiku Shogi",
				"summary": {
					"en": "10x10 variant with flying pieces and Fire Dragon",
					"fr": "10x10 avec pièces volantes et dragon de feu"
				},
				"rules": {
					"en": "res/rules/minjiku-shogi/minjiku-shogi-rules.html",
					"fr": "res/rules/minjiku-shogi/minjiku-shogi-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/minjiku-shogi/minjiku-shogi-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/minjiku-shogi/minjiku-shogi-credits.html"
				},
				"gameOptions": config_model_gameOptions_2,
				"js": modelScripts_110,

				"description": {
					"en": "res/rules/minjiku-shogi/minjiku-shogi-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/minjiku-shogi-600x600-3d.jpg",
						"res/visuals/minjiku-shogi-600x600-2d.jpg"
					]
				},
				"xdView": true,
				"css": config_view_css,
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
						"preload": [
							"smoothedfilegeo|0|/res/ring-target.js",
							"image|/res/images/cancel.png",
							"image|/res/images/wikipedia.png"
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera
					},
					config_view_skins_2
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_110,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_110
	},

};
