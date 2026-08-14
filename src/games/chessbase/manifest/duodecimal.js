/*
 * The twelve-file boards: Reformed Courier, Ley Chess Alpha, Gross chess and
 * Timurid chess. Model and view scripts live in duodecimal/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_model_levels_5, config_view_css,
	config_view_defaultOptions, config_view_skins_world, config_view_skins_camera,
	config_view_sounds, config_model_levels_15, config_view_skins_9, modelScripts_47,
	config_view_js_42, modelScripts_lca, config_view_js_lca, modelScripts_timurid,
	modelScripts_gross, config_view_js_timurid, config_view_js_duodecimal
} = require("./shared.js");

exports.games = {

	"reformed-courier-chess": {
		"name": "reformed-courier-chess",
		"modelScripts": modelScripts_47,
		"config": {
			"status": true,
			"model": {
				"title-en": "Reformed Courierspiel",
				"summary": {
					"en": "Clément Bégnis, 2011",
					"fr": "Clément Bégnis, 2011"
				},
				"rules": {
					"en": "res/rules/reformed-courier/reformed-courier-rules.html",
                        "fr": "res/rules/reformed-courier/reformed-courier-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/reformed-courier/reformed-courier-thumb.png",
				"released": 1405068613,
				"credits": {
					"en": "res/rules/reformed-courier/reformed-courier-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_47,
				"description": {
					"en": "res/rules/reformed-courier/reformed-courier-description.html"
				},
				"levels": config_model_levels_5
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/reformed-courier-600x600-3d.jpg",
						"res/visuals/reformed-courier-600x600-2d.jpg"
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
							"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
							"image|/res/fairy/elephant/elephant-diffusemap.jpg",
							"image|/res/fairy/elephant/elephant-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/lighthouse/lighthouse.js",
							"image|/res/fairy/lighthouse/lighthouse-diffusemap.jpg",
							"image|/res/fairy/lighthouse/lighthouse-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/unicorn/unicorn.js",
							"image|/res/fairy/unicorn/unicorn-diffusemap.jpg",
							"image|/res/fairy/unicorn/unicorn-normalmap.jpg"
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera
					},
					config_view_skins_9
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_42,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_42
	},

	"leychessalpha-chess": {
		"name": "leychessalpha-chess",
		"modelScripts": modelScripts_lca,
		"config": {
			"status": true,
			"model": {
				"title-en": "LeyChessAlpha",
				"summary": {
					"en": "Chess on 12x12 with fairy pieces",
					"fr": "Échecs en 12x12 avec des pièces féeriques"
				},
				"rules": {
					"en": "res/rules/duodecimal/leychessalpha-rules.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/duodecimal/leychessalpha-thumb.png",
				"released": 1402412178,
				"credits": {
					"en": "res/rules/duodecimal/leychessalpha-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_lca,
				"description": {
					"en": "res/rules/duodecimal/leychessalpha-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/leychessalpha-600x600-3d.jpg",
						"res/visuals/leychessalpha-600x600-2d.jpg"
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
							"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
							"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
							"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
							"image|/res/fairy/elephant/elephant-diffusemap.jpg",
							"image|/res/fairy/elephant/elephant-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/admiral/admiral.js",
							"image|/res/fairy/admiral/admiral-diffusemap.jpg",
							"image|/res/fairy/admiral/admiral-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/camel/camel.js",
							"image|/res/fairy/camel/camel-diffusemap.jpg",
							"image|/res/fairy/camel/camel-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/lion/lion.js",
							"image|/res/fairy/lion/lion-diffusemap.jpg",
							"image|/res/fairy/lion/lion-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/eagle/eagle.js",
							"image|/res/fairy/eagle/eagle-diffusemap.jpg",
							"image|/res/fairy/eagle/eagle-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/unicorn/unicorn.js",
							"image|/res/fairy/unicorn/unicorn-diffusemap.jpg",
							"image|/res/fairy/unicorn/unicorn-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/lighthouse/lighthouse.js",
							"image|/res/fairy/lighthouse/lighthouse-diffusemap.jpg",
							"image|/res/fairy/lighthouse/lighthouse-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/amazon/amazon.js",
							"image|/res/fairy/amazon/amazon-diffusemap.jpg",
							"image|/res/fairy/amazon/amazon-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/cardinal/cardinal.js",
							"image|/res/fairy/cardinal/cardinal-diffusemap.jpg",
							"image|/res/fairy/cardinal/cardinal-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/marshall/marshall.js",
							"image|/res/fairy/marshall/marshall-diffusemap.jpg",
							"image|/res/fairy/marshall/marshall-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/dragon/dragon.js",
							"image|/res/fairy/dragon/dragon-diffusemap.jpg",
							"image|/res/fairy/dragon/dragon-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/crowned-rook/crowned-rook.js",
							"image|/res/fairy/crowned-rook/crowned-rook-diffusemap.jpg",
							"image|/res/fairy/crowned-rook/crowned-rook-normalmap.jpg",
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera
					},
					config_view_skins_9
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_lca,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_lca
	},

	"gross-chess": {
 			"name": "gross-chess",
 			"modelScripts": modelScripts_gross,
 			"config": {
 				"status": true,
 				"model": {
 					"title-en": "Gross Chess",

 					"summary": {
 						"en": "Omega/Gothic/Cambaluc Chess on 12x12",
 						"fr": "Échecs Omega/Gothic/Cambaluc en 12x12"
 					},
 					"rules": {
 						"en": "res/rules/duodecimal/gross-rules.html",
					"fr": "res/rules/duodecimal/gross-rules_fr.html"
 					},
 					"module": "chessbase",
 					"plazza": "true",
 					"thumbnail": "res/rules/duodecimal/gross-thumb.png",
 					"released": 1497874349,

 					"credits": {
 						"en": "res/rules/duodecimal/gross-credits.html"
 					},
 					"gameOptions": config_model_gameOptions,
 					"obsolete": false,
 					"js": modelScripts_gross,

 					"description": {
 						"en": "res/rules/duodecimal/gross-description.html"
 					},
 					"levels": config_model_levels_15
 				},
 				"view": {
 					"title-en": "Gross view",
 					"visuals": {
 						"600x600": [
 							"res/visuals/gross-600x600-3d.jpg",
 							"res/visuals/gross-600x600-2d.jpg"
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
 								"smoothedfilegeo|0|/res/fairy/rook/rook.js",
 								"image|/res/fairy/rook/rook-diffusemap.jpg",
 								"image|/res/fairy/rook/rook-normalmap.jpg",

 								"smoothedfilegeo|0|/res/fairy/bishop/bishop.js",
 								"image|/res/fairy/bishop/bishop-diffusemap.jpg",
 								"image|/res/fairy/bishop/bishop-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/knight/knight.js",
 								"image|/res/fairy/knight/knight-diffusemap.jpg",
 								"image|/res/fairy/knight/knight-normalmap.jpg",

 								"smoothedfilegeo|0|/res/fairy/queen/queen.js",
 								"image|/res/fairy/queen/queen-diffusemap.jpg",
 								"image|/res/fairy/queen/queen-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/king/king.js",
 								"image|/res/fairy/king/king-diffusemap.jpg",

 								"image|/res/fairy/king/king-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/prince/prince.js",
							"image|/res/fairy/prince/prince-diffusemap.jpg",
							"image|/res/fairy/prince/prince-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
 								"image|/res/fairy/elephant/elephant-diffusemap.jpg",

 								"image|/res/fairy/elephant/elephant-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
 								"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
 								"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/griffon/griffon.js",
 								"image|/res/fairy/griffon/griffon-diffusemap.jpg",

 								"image|/res/fairy/griffon/griffon-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/lion/lion.js",
							"image|/res/fairy/lion/lion-diffusemap.jpg",
							"image|/res/fairy/lion/lion-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/camel/camel.js",

 								"image|/res/fairy/camel/camel-diffusemap.jpg",
 								"image|/res/fairy/camel/camel-normalmap.jpg"							      
 							],
 							"world": config_view_skins_world,
 							"camera": config_view_skins_camera
 						},

 						config_view_skins_9
 					],
 					"animateSelfMoves": false,
 					"switchable": true,
 					"sounds": config_view_sounds,
 					"js": config_view_js_duodecimal,

 					"useAutoComplete": true
 				}
 			},
 			"viewScripts": config_view_js_duodecimal
	},

	"timurid-chess": {
 			"name": "timurid-chess",
 			"modelScripts": modelScripts_timurid,
 			"config": {
 				"status": true,
 				"model": {
 					"title-en": "Timurid",

 					"summary": {
 						"en": "Tamerlan II on 12x12 with fairy pieces",
 						"fr": "Tamerlan II en 12x12 avec des pièces féeriques"
 					},
 					"rules": {
 						"en": "res/rules/duodecimal/timurid-rules.html",
					"fr": "res/rules/duodecimal/timurid-rules_fr.html"
 					},
 					"module": "chessbase",
 					"plazza": "true",
 					"thumbnail": "res/rules/duodecimal/timurid-thumb.png",
 					"released": 1497874349,

 					"credits": {
 						"en": "res/rules/duodecimal/timurid-credits.html"
 					},
 					"gameOptions": config_model_gameOptions,
 					"obsolete": false,
 					"js": modelScripts_timurid,
 					"description": {
 						"en": "res/rules/duodecimal/timurid-description.html"
 					},
 					"levels": config_model_levels_15
 				},
 				"view": {
 					"title-en": "Timurid view",
 					"visuals": {
 						"600x600": [
 							"res/visuals/wild-babur-600x600-3d.jpg",
 							"res/visuals/wild-mirza-600x600-2d.jpg"
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
 								"smoothedfilegeo|0|/res/fairy/rook/rook.js",
 								"image|/res/fairy/rook/rook-diffusemap.jpg",
 								"image|/res/fairy/rook/rook-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/bishop/bishop.js",
 								"image|/res/fairy/bishop/bishop-diffusemap.jpg",
 								"image|/res/fairy/bishop/bishop-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/knight/knight.js",
 								"image|/res/fairy/knight/knight-diffusemap.jpg",
 								"image|/res/fairy/knight/knight-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/queen/queen.js",
 								"image|/res/fairy/queen/queen-diffusemap.jpg",
 								"image|/res/fairy/queen/queen-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/king/king.js",
 								"image|/res/fairy/king/king-diffusemap.jpg",
 								"image|/res/fairy/king/king-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/prince/prince.js",
							"image|/res/fairy/prince/prince-diffusemap.jpg",
							"image|/res/fairy/prince/prince-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
 								"image|/res/fairy/elephant/elephant-diffusemap.jpg",
 								"image|/res/fairy/elephant/elephant-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
 								"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
 								"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/griffon/griffon.js",
 								"image|/res/fairy/griffon/griffon-diffusemap.jpg",
 								"image|/res/fairy/griffon/griffon-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/lion/lion.js",
							"image|/res/fairy/lion/lion-diffusemap.jpg",
							"image|/res/fairy/lion/lion-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/camel/camel.js",
 								"image|/res/fairy/camel/camel-diffusemap.jpg",
 								"image|/res/fairy/camel/camel-normalmap.jpg"							      
 							],
 							"world": config_view_skins_world,
 							"camera": config_view_skins_camera
 						},
 						config_view_skins_9
 					],
 					"animateSelfMoves": false,
 					"switchable": true,
 					"sounds": config_view_sounds,
 					"js": config_view_js_timurid,
 					"useAutoComplete": true
 				}
 			},
 			"viewScripts": config_view_js_timurid
	},

};
