/*
 * Shogi and its relatives: the Japanese game itself, its small forms (Mini,
 * Kyoto, Tori), its large form (Chu), and the Seireigi pair. Model and view
 * scripts live in shogi/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_view_css, config_view_defaultOptions, config_view_skins_world,
	config_view_skins_camera, config_view_sounds, config_model_gameOptions_2, config_view_skins_2,
	modelScripts_seireigi, modelScripts_chu_seireigi, modelScripts_105, modelScripts_106,
	modelScripts_107, modelScripts_108, modelScripts_kyoto, modelScripts_kotaishi,
	config_model_levels_15, config_model_levels_15_shogi_expert,
	config_model_levels_15_kotaishi_expert, config_model_levels_15_minishogi_expert,
	config_model_levels_15_kyotoshogi_expert, config_model_levels_15_torishogi_expert,
	config_view_js_chu_seireigi, config_view_js_seireigi, config_view_js_kotaishi,
	config_view_js_105, config_view_js_106, config_view_js_107, config_view_js_108
} = require("./shared.js");

exports.games = {

	"shogi": {
		"name": "shogi",
		"modelScripts": modelScripts_105,
		"config": {
			"status": true,
			"model": {
				"title-en": "Shogi",
				"summary": {
					"en": "Japanese Chess",
					"fr": "Les Échecs japonais"
				},
				"rules": {
					"en": "res/rules/shogi/shogi-rules.html",
					"fr": "res/rules/shogi/shogi-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/shogi/shogi-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/shogi/shogi-credits.html"
				},
				"gameOptions": config_model_gameOptions_2,
				"js": modelScripts_105,
				"description": {
					"en": "res/rules/shogi/shogi-description.html"
				},
				"levels": config_model_levels_15_shogi_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/shogi-600x600-3d.jpg",
						"res/visuals/shogi-600x600-2d.jpg"
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
					{
						"name": "skin2dwestern",
						"title": "2D Pictos",
						"3d": false,
						"preload": [
							"image|/res/shogi/shogi-picto-sprites.png"
						]
					},
					{
						"name": "skin2dmnemonic",
						"title": "2D Mnemonic",
						"3d": false,
						"preload": [
							"image|/res/shogi/shogi-mnemonic-sprites.png"
						]
					},
					config_view_skins_2
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_105,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_105
	},

	"kotaishi-shogi": {
		"name": "kotaishi-shogi",
		"modelScripts": modelScripts_kotaishi,
		"config": {
			"status": true,
			"model": {
				"title-en": "Kōtaishi Shogi",
				"summary": {
					"en": "Shogi with a drunk elephant",
					"fr": "Shogi avec un éléphant ivre"
				},
				"rules": {
					"en": "res/rules/shogi/kotaishi-rules.html",
					"fr": "res/rules/shogi/kotaishi-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/shogi/shogi-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/shogi/kotaishi-credits.html"
				},
				"gameOptions": config_model_gameOptions_2,
				"js": modelScripts_kotaishi,
				"description": {
					"en": "res/rules/shogi/shogi-description.html"
				},
				"levels": config_model_levels_15
				// fairy stockfish ne gère le prince royal 
                    //"levels": config_model_levels_15_kotaishi_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/shogi-600x600-3d.jpg",
						"res/visuals/shogi-600x600-2d.jpg"
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
					{
						"name": "skin2dmnemonic",
						"title": "2D Mnemonic",
						"3d": false,
						"preload": [
							"image|/res/shogi/shogi-mnemonic-sprites.png"
						]
					},
					{
						"name": "skin2dwestern",
						"title": "2D Pictos",
						"3d": false,
						"preload": [
							"image|/res/shogi/shogi-picto-sprites.png"
						]
					}
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_105,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_kotaishi
	},

	"seireigi": {
		"name": "seireigi",
		"modelScripts": modelScripts_seireigi,
		"config": {
			"status": true,
			"model": {

				"title-en": "Seireigi",
				"summary": {
					"en": "Shogi with more varied promotions",
					"fr": "Shogi aux promotions variées"
				},
				"rules": {
					"en": "res/rules/shogi/seireigi-rules.html",
					"fr": "res/rules/shogi/seireigi-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/shogi/seireigi-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/shogi/seireigi-credits.html"
				},
				"gameOptions": config_model_gameOptions_2,
				"js": modelScripts_seireigi,
				"description": {
					"en": "res/rules/shogi/seireigi-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/seireigi-600x600-3d.jpg",
						"res/visuals/seireigi-600x600-2d.jpg"
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
						"name": "skin2dwestern",

						"title": "2D Pictos",
						"3d": false,
						"preload": [
							"image|/res/shogi/seireigi-shogi-picto-sprites.png"
						]
					},
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
				"js": config_view_js_seireigi,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_seireigi
	},

	"chu-seireigi": {
		"name": "chu-seireigi",
		"modelScripts": modelScripts_chu_seireigi,
		"config": {
			"status": true,
			"model": {

				"title-en": "Chu Seireigi",
				"summary": {
					"en": "Spirit middle shogi variant",
					"fr": "Variante moyenne du Seireigi"
				},
				"rules": {
					"en": "res/rules/shogi/chu-seireigi-shogi-rules.html",
                        "fr": "res/rules/shogi/chu-seireigi-shogi-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/shogi/chu-seireigi-thumb.png",
				"released": 1396536978,

				"credits": {
					"en": "res/rules/shogi/seireigi-credits.html"
				},
				"gameOptions": config_model_gameOptions_2,
				"js": modelScripts_chu_seireigi,
				"description": {
					"en": "res/rules/shogi/chu-seireigi-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/chu-seireigi-600x600-2d.jpg",
                            "res/visuals/chu-seireigi-600x600-3d.jpg"
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
						"name": "skin2dwestern",
						"title": "2D Pictos",
						"3d": false,

						"preload": [
							"image|/res/shogi/chu-seireigi-shogi-picto-sprites.png"
						]
					},
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
					}
/*,
					config_view_skins_2*/
				],

				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_chu_seireigi,
				"useAutoComplete": true

			}
		},
		"viewScripts": config_view_js_chu_seireigi
	},

	"mini-shogi": {
		"name": "mini-shogi",
		"modelScripts": modelScripts_107,
		"config": {
			"status": true,
			"model": {
				"title-en": "Mini-Shogi",
				"summary": {
					"en": "Shogi on 5x5 with 6 pieces",
					"fr": "Shogi en 5x5 avec 6 pièces"
				},
				"rules": {
					"en": "res/rules/shogi/mini-shogi-rules.html",
					"fr": "res/rules/shogi/mini-shogi-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/shogi/mini-shogi-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/shogi/shogi-credits.html"
				},
				"gameOptions": config_model_gameOptions_2,
				"js": modelScripts_107,
				"description": {
					"en": "res/rules/shogi/mini-shogi-description.html"
				},
				"levels": config_model_levels_15_minishogi_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/mini-shogi-600x600-3d.jpg",
						"res/visuals/mini-shogi-600x600-2d.jpg"
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
					{
						"name": "skin2dwestern",
						"title": "2D Pictos",
						"3d": false,
						"preload": [
							"image|/res/shogi/shogi-picto-sprites.png"
						]
					},
					{
						"name": "skin2dmnemonic",
						"title": "2D Mnemonic",
						"3d": false,
						"preload": [
							"image|/res/shogi/shogi-mnemonic-sprites.png"
						]
					},
					config_view_skins_2
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_107,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_107
	},

	"kyoto-shogi": {
		"name": "kyoto-shogi",
		"modelScripts": modelScripts_kyoto,
		"config": {
			"status": true,
			"model": {
				"title-en": "Kyoto-Shogi",
				"summary": {
					"en": "5×5 Shogi with Move Promotion",
					"fr": "Shogi 5x5 avec promotion au déplacement"
				},
				"rules": {
					"en": "res/rules/shogi/kyoto-shogi-rules.html",
					"fr": "res/rules/shogi/kyoto-shogi-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/shogi/kyoto-shogi.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/shogi/kyoto-credits.html"
				},
				"gameOptions": config_model_gameOptions_2,
				"js": modelScripts_107,
				"description": {
					"en": "res/rules/shogi/kyoto-shogi-description.html"
				},
				"levels": config_model_levels_15_kyotoshogi_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/kyoto-shogi-600x600-3d.jpg",
						"res/visuals/kyoto-shogi-600x600-2d.jpg"
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
						"name": "skin2dmnemonic",
						"title": "2D Mnemonic",
						"3d": false,
						"preload": [
							"image|/res/shogi/shogi-mnemonic-sprites.png"
						]
					},
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
					{
						"name": "skin2dwestern",
						"title": "2D Pictos",
						"3d": false,
						"preload": [
							"image|/res/shogi/shogi-picto-sprites"
						]
					},

					config_view_skins_2
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_107,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_107
	},

	"tori-shogi": {
		"name": "tori-shogi",
		"modelScripts": modelScripts_106,
		"config": {
			"status": true,
			"model": {
				"title-en": "Tori Shogi",
				"summary": {
					"en": "7x7 Shogi Variant with bird pieces",
					"fr": "Variante de shogi en 7x7 avec des tuiles d'oiseaux"
				},
				"rules": {
					"en": "res/rules/shogi/tori-shogi-rules.html",
                        "fr": "res/rules/shogi/tori-shogi-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/shogi/tori-shogi-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/shogi/shogi-credits.html"
				},
				"gameOptions": config_model_gameOptions_2,
				"js": modelScripts_106,
				"description": {
					"en": "res/rules/shogi/tori-shogi-description.html"
				},
				"levels": config_model_levels_15_torishogi_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/tori-600x600-3d.jpg",
						"res/visuals/tori-600x600-2d.jpg"
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
				"js": config_view_js_106,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_106
	},

	"chu-shogi": {
		"name": "chu-shogi",
		"modelScripts": modelScripts_108,
		"config": {
			"status": true,
			"model": {
				"title-en": "Chu Shogi",
				"summary": {
					"en": "Historic 12x12 Shogi variant",
					"fr": "Variante historique de shogi en 12x12"
				},
				"rules": {
					"en": "res/rules/shogi/chu-shogi-rules.html",
					"fr": "res/rules/shogi/chu-shogi-rules_fr.html",
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/shogi/chu-shogi-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/shogi/shogi-credits.html"
				},
				"gameOptions": config_model_gameOptions_2,
				"js": modelScripts_108,
				"description": {
					"en": "res/rules/shogi/chu-shogi-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/chu-shogi-600x600-3d.jpg",
						"res/visuals/chu-shogi-600x600-2d.jpg"
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
					{
						"name": "skin2dmnemonic",
						"title": "2D Mnemonic",
						"3d": false,
						"preload": [
							"image|/res/shogi/tenjiku-shogi-mnemonic-sprites.png"
						]
					},
					config_view_skins_2
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_108,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_108
	},

	/*
	"tenjiku-shogi": {
		"name": "tenjiku-shogi",
		"modelScripts": modelScripts_tenjiku,
		"config": {
			"status": true,
			"model": {
				"title-en": "Tenjiku Shogi",
				"summary": {
					"en": "The 'exotic' shogi derived from Chu Shogi is the most extravagant of all historical variants.",
					"fr": "Le shogi 'exotique' issu du chu shogi est la plus extravagante des variantes historiques."
				},
				"rules": {
					"en": "res/rules/shogi/tenjiku-rules.html",
					"fr": "res/rules/shogi/tenjiku-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/shogi/tenjiku-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/shogi/shogi-credits.html"
				},
				"gameOptions": config_model_gameOptions_tenjiku,
				"js": modelScripts_tenjiku,
				"levels": config_model_levels_tenjiku
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/tenjiku-600x600-2d.jpg"
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
						"name": "skin2d",
						"title": "2D Classic",
						"3d": false,
						"preload": [
							"image|/res/images/cancel.png",
							"image|/res/images/whitebg.png",
							"image|/res/images/wikipedia.png",
							"image|/res/shogi/tenjiku-shogi-picto-sprites.png"
						]
					},
					{
						"name": "skin2dmnemonic",
						"title": "2D Mnemonic",
						"3d": false,
						"preload": [
							"image|/res/images/cancel.png",
							"image|/res/images/whitebg.png",
							"image|/res/images/wikipedia.png",
							"image|/res/shogi/tenjiku-shogi-mnemonic-sprites.png"
						]
					}
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_tenjiku,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_tenjiku
	},
	*/

};
