/*
 * The ten-file boards: Grand chess and its neighbours - Hecto, Heavy,
 * Wildebeest, Hyderabad and Scirocco. Model and view scripts live in
 * decimal/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_model_levels_5,
	config_model_levels_5_grand_expert, config_model_levels_5_wildebeest_expert,
	config_model_levels_5_heavychess_expert, config_model_levels_5_hectochess_expert,
	config_view_css, config_view_defaultOptions, config_view_skins_world,
	config_view_skins_camera, config_view_sounds, config_view_skins_2, modelScripts_104,
	config_model_levels_15, config_view_js_104, config_view_skins_9, config_view_skins_11,
	modelScripts_34, modelScripts_hectochess, modelScripts_heavychess, config_view_js_31,
	modelScripts_37, config_view_js_33, modelScripts_44, config_view_js_40
} = require("./shared.js");

exports.games = {

	"grand-chess": {
		"name": "grand-chess",
		"modelScripts": modelScripts_34,
		"config": {
			"status": true,
			"model": {
				"title-en": "Grand Chess",
				"summary": {
					"en": "Chess on 10x10 (1984)",
					"fr": "Échecs en 10x10 (1984)"
				},
				"rules": {
					"en": "res/rules/decimal/grand-rules.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/decimal/grand-thumb.png",
				"released": 1404985842,
				"credits": {
					"en": "res/rules/decimal/grand-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_34,
				"description": {
					"en": "res/rules/decimal/grand-description.html"
				},
				"levels": config_model_levels_5_grand_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/grand-600x600-3d.jpg",
						"res/visuals/grand-600x600-2d.jpg"
					]
				},
				"xdView": true,
				"css": config_view_css,
				"preferredRatio": 1,
				"useShowMoves": true,
				"useNotation": true,
				"module": "chessbase",
				"defaultOptions": config_view_defaultOptions,
				"skins": config_view_skins_11,
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_31,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_31
	},

	"hectochess": {
		"name": "hectochess",
		"modelScripts": modelScripts_hectochess,
		"config": {
			"status": true,
			"model": {
				"title-en": "Hectochess",
				"summary": {
					"en": "Chess on 10x10 with champions and wizards",
					"fr": "Échecs en 10x10 avec champions et sorciers"
				},
				"rules": {
					"en": "res/rules/decimal/hectochess-rules.html",
                        "fr": "res/rules/decimal/hectochess-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/decimal/hectochess-thumb.png",
				"released": 1404985842,
				"credits": {
					"en": "res/rules/decimal/hectochess-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_hectochess,
				"description": {
					"en": "res/rules/decimal/hectochess-description.html"
				},
				"levels": config_model_levels_5_hectochess_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/hectochess-600x600-3d.jpg",
						"res/visuals/hectochess-600x600-2d.jpg"
					]
				},
				"xdView": true,
				"css": config_view_css,
				"preferredRatio": 1,
				"useShowMoves": true,
				"useNotation": true,
				"module": "chessbase",
				"defaultOptions": config_view_defaultOptions,
				"skins": config_view_skins_11,
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_31,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_31
	},

	"heavychess": {
		"name": "heavychess",
		"modelScripts": modelScripts_heavychess,
		"config": {
			"status": true,
			"model": {

				"title-en": "Heavy chess",
				"summary": {
					"en": "Chess on 10x10 with many strong pieces",
					"fr": "Échecs en 10x10 avec de nombreuses pièces puissantes"
				},
				"rules": {
					"en": "res/rules/decimal/heavychess-rules.html",
                        "fr": "res/rules/decimal/heavychess-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/decimal/heavychess-thumb.png",
				"released": 1404985842,
				"credits": {
					"en": "res/rules/decimal/heavychess-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_heavychess,
				"description": {
					"en": "res/rules/decimal/heavychess-description.html"
				},
				"levels": config_model_levels_5_heavychess_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/heavychess-600x600-3d.jpg",
						"res/visuals/heavychess-600x600-2d.jpg"
					]
				},
				"xdView": true,

				"css": config_view_css,
				"preferredRatio": 1,
				"useShowMoves": true,
				"useNotation": true,
				"module": "chessbase",
				"defaultOptions": config_view_defaultOptions,
				"skins": config_view_skins_11,
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,

				"js": config_view_js_31,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_31
	},

	"wildebeest-chess": {
		"name": "wildebeest-chess",
		"modelScripts": modelScripts_37,
		"config": {
			"status": true,
			"model": {
				"title-en": "Wildebeest Chess",
				"summary": {
					"en": "Chess on 11x10 (1987)",
					"fr": "Échecs en 11x10 (1987)"
				},
				"rules": {
					"en": "res/rules/wildebeest/wildebeest-rules.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/wildebeest/wildebeest-thumb.png",
				"released": 1405001496,
				"credits": {
					"en": "res/rules/wildebeest/wildebeest-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_37,
				"description": {
					"en": "res/rules/wildebeest/wildebeest-description.html"
				},
				"levels": config_model_levels_5_wildebeest_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/wildebeest-600x600-3d.jpg",
						"res/visuals/wildebeest-600x600-2d.jpg"
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
							"image|/res/images/wikipedia.png",
							"smoothedfilegeo|0|/res/fairy/pawn/pawn.js",
							"image|/res/fairy/pawn/pawn-diffusemap.jpg",
							"image|/res/fairy/pawn/pawn-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/knight/knight.js",
							"image|/res/fairy/knight/knight-diffusemap.jpg",
							"image|/res/fairy/knight/knight-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/bishop/bishop.js",
							"image|/res/fairy/bishop/bishop-diffusemap.jpg",
							"image|/res/fairy/bishop/bishop-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/queen/queen.js",
							"image|/res/fairy/queen/queen-diffusemap.jpg",
							"image|/res/fairy/queen/queen-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/king/king.js",
							"image|/res/fairy/king/king-diffusemap.jpg",
							"image|/res/fairy/king/king-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/rook/rook.js",
							"image|/res/fairy/rook/rook-diffusemap.jpg",
							"image|/res/fairy/rook/rook-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/camel/camel.js",
							"image|/res/fairy/camel/camel-diffusemap.jpg",
							"image|/res/fairy/camel/camel-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/dragon/dragon.js",
							"image|/res/fairy/dragon/dragon-diffusemap.jpg",
							"image|/res/fairy/dragon/dragon-normalmap.jpg"
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera
					},
					config_view_skins_9
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_33,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_33
	},

	"hyderabad-chess": {
		"name": "hyderabad-chess",
		"modelScripts": modelScripts_44,
		"config": {
			"status": true,
			"model": {
				"title-en": "Hyderabad Decimal Chess",
				"summary": {
					"en": "Shir Muhammad Khan Iman, 1797-1798",
					"fr": "Shir Muhammad Khan Iman, 1797-1798"
				},
				"rules": {
					"en": "res/rules/decimal/hyderabad-rules.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/decimal/hyderabad-thumb.png",
				"released": 1405068610,
				"credits": {
					"en": "res/rules/decimal/hyderabad-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_44,
				"description": {
					"en": "res/rules/decimal/hyderabad-description.html"
				},
				"levels": config_model_levels_5
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/hyderabad-600x600-3d.jpg",
						"res/visuals/hyderabad-600x600-2d.jpg"
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
							"image|/res/images/wikipedia.png",
							"smoothedfilegeo|0|/res/fairy/pawn/pawn.js",
							"image|/res/fairy/pawn/pawn-diffusemap.jpg",
							"image|/res/fairy/pawn/pawn-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/knight/knight.js",
							"image|/res/fairy/knight/knight-diffusemap.jpg",
							"image|/res/fairy/knight/knight-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/bishop/bishop.js",
							"image|/res/fairy/bishop/bishop-diffusemap.jpg",
							"image|/res/fairy/bishop/bishop-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/king/king.js",
							"image|/res/fairy/king/king-diffusemap.jpg",
							"image|/res/fairy/king/king-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/rook/rook.js",
							"image|/res/fairy/rook/rook-diffusemap.jpg",
							"image|/res/fairy/rook/rook-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/queen/queen.js",
							"image|/res/fairy/queen/queen-diffusemap.jpg",
							"image|/res/fairy/queen/queen-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/marshall/marshall.js",
							"image|/res/fairy/marshall/marshall-diffusemap.jpg",
							"image|/res/fairy/marshall/marshall-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/cardinal/cardinal.js",
							"image|/res/fairy/cardinal/cardinal-diffusemap.jpg",
							"image|/res/fairy/cardinal/cardinal-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/amazon/amazon.js",
							"image|/res/fairy/amazon/amazon-diffusemap.jpg",
							"image|/res/fairy/amazon/amazon-normalmap.jpg"
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera
					},
					config_view_skins_9
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_40,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_40
	},

	"scirocco-chess": {
		"name": "scirocco-chess",
		"modelScripts": modelScripts_104,
		"config": {
			"status": true,
			"model": {
				"title-en": "Scirocco",
				"summary": {
					"en": "10x10 variant with weak but promoting pieces",
					"fr": "Variante 10x10 avec des pièces faibles mais promouvables"
				},
				"rules": {
					"en": "res/rules/decimal/scirocco-rules.html",
                        "fr": "res/rules/decimal/scirocco-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/scirocco/scirocco-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/decimal/scirocco-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"js": modelScripts_104,
				"description": {
					"en": "res/rules/decimal/scirocco-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/scirocco-600x600-3d.jpg",
						"res/visuals/scirocco-600x600-2d.jpg"
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
				"js": config_view_js_104,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_104
	},

};
