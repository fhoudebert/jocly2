/*
 * Shogi and its relatives: the Japanese game itself, its small forms (Mini,
 * Kyoto, Tori), its large form (Chu), and the Seireigi pair. Model and view
 * scripts live in shogi/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_levels_shogi_expert, config_model_levels_minishogi_expert,
	config_model_levels_kyotoshogi_expert, config_model_levels_torishogi_expert, config_view_css,
	config_view_defaultOptions, config_view_skins_world, config_view_skins_camera,
	config_view_sounds, config_model_gameOptions_2, config_view_skins_2,
	config_model_gameOptions_levelOptions_tenjiku, config_model_levels_mateSearch_tenjiku,
	config_model_levels_15, config_model_levels_kotaishi_expert
} = require("./shared.js");

// declarations only this family uses, lifted out of shared.js
var modelScripts_seireigi = [
	"base-model.js",
	"grid-geo-model.js",
	"drop-model.js",
	"shogi/seireigi-shogi-model.js"
]

var modelScripts_chu_seireigi = [
	"base-model.js",
	"grid-geo-model.js",
	"drop-model.js",
        "fairy-piece-model.js",
	"shogi/chu-seireigi-model.js"
]

var modelScripts_105 = [
	"base-model.js",
	"grid-geo-model.js",
	"drop-model.js",
	"shogi/shogi-model.js",
	"shogi/sfen-model.js"
]

var modelScripts_106 = [
	"base-model.js",
	"grid-geo-model.js",
	"drop-model.js",
	"shogi/tori-shogi-model.js",
	"shogi/sfen-model.js"
]

var modelScripts_107 = [
	"base-model.js",
	"grid-geo-model.js",
	"drop-model.js",
	"shogi/mini-shogi-model.js",
	"shogi/sfen-model.js"
]

var modelScripts_108 = [
	"base-model.js",
	"grid-geo-model.js",
	"locust-move-model.js",
	"shogi/chu-shogi-model.js",
	"shogi/sfen-model.js"
]

var config_model_gameOptions_tenjiku = {
	"preventRepeat": true,
	"uctTransposition": "state",
	"uctIgnoreLoop": false,
	"levelOptions": config_model_gameOptions_levelOptions_tenjiku
}

var config_model_levels_tenjiku = [
	{
		"name": "easy",
		"label": "Easy",
		"ai": "uct",
		"playoutDepth": 0,
		"minVisitsExpand": 1,
		"c": 0.6,
		"ignoreLeaf": false,
		"uncertaintyFactor": 3,
		"maxNodes": 20000
	},
	{
		"name": "fast",
		"label": "Fast [5sec]",
		"ai": "uct",
		"playoutDepth": 0,
		"minVisitsExpand": 1,
		"c": 0.6,
		"ignoreLeaf": false,
		"uncertaintyFactor": 3,
		"mateSearch": config_model_levels_mateSearch_tenjiku,
		"maxDuration": 5,
		"isDefault": true
	},
	{
		"name": "medium",
		"label": "Medium",
		"ai": "uct",
		"playoutDepth": 0,
		"minVisitsExpand": 1,
		"c": 0.6,
		"ignoreLeaf": false,
		"uncertaintyFactor": 3,
		"mateSearch": config_model_levels_mateSearch_tenjiku,
		"maxNodes": 150000,
		"maxDuration": 40
	},
	{
		"name": "strong",
		"label": "Strong",
		"ai": "uct",
		"playoutDepth": 0,
		"minVisitsExpand": 1,
		"c": 0.6,
		"ignoreLeaf": false,
		"uncertaintyFactor": 3,
		"mateSearch": config_model_levels_mateSearch_tenjiku,
		"maxNodes": 500000,
		"maxDuration": 120
	},
	{
		"name": "hyper",
		"label": "10 min",
		"ai": "uct",
		"playoutDepth": 0,
		"minVisitsExpand": 1,
		"c": 0.6,
		"ignoreLeaf": false,
		"uncertaintyFactor": 3,
		"mateSearch": config_model_levels_mateSearch_tenjiku,
		"maxNodes": 2500000,
		"maxDuration": 600
	},
	{
		"name": "correspondence",
		"label": "20 min",
		"ai": "uct",
		"playoutDepth": 0,
		"minVisitsExpand": 1,
		"c": 0.6,
		"ignoreLeaf": false,
		"uncertaintyFactor": 3,
		"mateSearch": config_model_levels_mateSearch_tenjiku,
		"maxNodes": 5000000,
		"maxDuration": 1200
	}
]

var modelScripts_tenjiku = [
	"base-model.js",
	"grid-geo-model.js",
	"locust-move-model.js",
	"shogi/tenjiku-shogi-model.js"
]

var modelScripts_kyoto = [
	"base-model.js",
	"grid-geo-model.js",
	"drop-model.js",
	"shogi/kyoto-shogi-model.js"
]

var modelScripts_kotaishi = [
	"base-model.js",
	"grid-geo-model.js",
	"drop-model.js",
	// the game opens by asking whether to play it with drops (Kotaishi) or
	// without (Sho Shogi) - see the prelude in the model
	"prelude-model.js",
	"shogi/kotaishi-shogi-model.js"
]

var config_model_levels_15_shogi_expert = config_model_levels_15.concat([config_model_levels_shogi_expert]);

var config_model_levels_15_kotaishi_expert = config_model_levels_15.concat([config_model_levels_kotaishi_expert]);

var config_model_levels_15_minishogi_expert = config_model_levels_15.concat([config_model_levels_minishogi_expert]);

var config_model_levels_15_kyotoshogi_expert = config_model_levels_15.concat([config_model_levels_kyotoshogi_expert]);

var config_model_levels_15_torishogi_expert = config_model_levels_15.concat([config_model_levels_torishogi_expert]);

var config_view_js_chu_seireigi = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/chu-seireigi-set-view.js",
	"drop-view.js",
	"shogi/chu-seireigi-view.js"
]

	var config_view_js_seireigi = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/seireigi-shogi-set-view.js",
	"drop-view.js",
	"shogi/seireigi-shogi-view.js"
]

	var config_view_js_kotaishi = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/kotaishi-shogi-set-view.js",
	"drop-view.js",
	"shogi/shogi-view.js",
	// draws the opening choice between Kotaishi and Sho Shogi
	"prelude-view.js"
]

var config_view_js_105 = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/shogi-set-view.js",
	"drop-view.js",
	"shogi/shogi-view.js"
]

var config_view_js_106 = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/tori-set-view.js",
	"drop-view.js",
	"shogi/tori-shogi-view.js"
]

var config_view_js_107 = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/shogi-set-view.js",
	"drop-view.js",
	"shogi/mini-shogi-view.js"
]

var config_view_js_108 = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/tenjiku-set-view.js",
	"multi-leg-view.js",
	"shogi/chu-shogi-view.js"
]

var config_view_js_tenjiku = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/tenjiku-set-view.js",
	"multi-leg-view.js",
	"shogi/tenjiku-shogi-view.js"
]

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
				// Shō shogi is the better-known name: the 16th-century game
				// modern Shogi grew out of. Kōtaishi is the same game with
				// drops, and the two are offered in a prelude - see the model.
				// The game keeps its id, so saved games and links still work.
				"title-en": "Shō Shogi",
				"summary": {
					"en": "The ancestor of Shogi, with a drunk elephant - with or without drops",
					"fr": "L'ancêtre du Shogi, avec un éléphant ivre - avec ou sans parachutage"
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

};
