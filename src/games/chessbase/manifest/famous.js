/*
 * The "famous" family: the variants played by millions rather than by
 * enthusiasts - western chess and its Chess960 shuffle, Xiangqi, Janggi,
 * Makruk, Shatranj, Spartan chess. Their model and view scripts live in
 * famous/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_model_levels_5, config_model_levels_5_expert,
	config_model_levels_5_xiangqi_expert, config_model_levels_5_shatranj_expert,
	config_model_levels_5_chess960_expert, config_model_levels_5_makruk_expert, config_view_css,
	config_view_defaultOptions, config_view_skins_world, config_view_skins_camera,
	config_view_skins, config_view_skins_camera_2, config_view_skins_preload_2,
	config_view_sounds, config_view_js, modelScripts_2, config_model_gameOptions_2,
	config_view_skins_world_2, config_view_skins_preload_3, config_view_js_2, modelScripts_janggi,
	config_view_js_janggi, config_view_skins_2, config_view_skins_3, modelScripts_12,
	config_view_skins_world_3, config_view_js_12, modelScripts_103,
	config_model_levels_15_spartan_expert, config_view_js_103, modelScripts_14,
	config_model_gameOptions_3, config_view_js_14, modelScripts_28, config_view_js_28
} = require("./shared.js");

exports.games = {

	"classic-chess": {
		"name": "classic-chess",
		"modelScripts": modelScripts,
		"config": {
			"status": true,
			"model": {
				"title-en": "Chess",
				"summary": {
					"en":"Regular Orthodox Classic Western Chess",
					"fr": "Les Échecs classiques (Orthodoxe)",
				},
				"thumbnail": "res/rules/famous/knight-thumbnail.png",
				"module": "chessbase",
				"plazza": "true",
				"released": 1389887778,
				"rules": {
					"en": "res/rules/famous/rules.html",
					"fr": "res/rules/famous/rules-fr.html"
				},
				"credits": {
					"en": "res/rules/famous/credits.html",
					"fr": "res/rules/famous/credits-fr.html"
				},
				"gameOptions": config_model_gameOptions,
				"js": modelScripts,
				"levels": config_model_levels_5_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/classic-chess-600x600-3d.jpg",
						"res/visuals/classic-chess-600x600-2d.jpg"
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
					config_view_skins,
					{
						"name": "skin3dflat",
						"title": "3D Flat",
						"3d": true,
						"preload": [
							"smoothedfilegeo|0|/res/ring-target.js",
							"image|/res/images/cancel.png",
							"image|/res/images/wikipedia.png",
							"image|/res/extruded/wood.jpg",
							"image|/res/extruded/wikipedia-pieces-diffuse-white.jpg",
							"image|/res/extruded/wikipedia-pieces-diffuse-black.jpg",
							"smoothedfilegeo|0|/res/extruded/flat3dpieces-king.js",
							"smoothedfilegeo|0|/res/extruded/flat3dpieces-queen.js",
							"smoothedfilegeo|0|/res/extruded/flat3dpieces-pawn.js",
							"smoothedfilegeo|0|/res/extruded/flat3dpieces-rook.js",
							"smoothedfilegeo|0|/res/extruded/flat3dpieces-knight.js",
							"smoothedfilegeo|0|/res/extruded/flat3dpieces-bishop.js"
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera_2
					},
					{
						"name": "skin2dfull",
						"title": "2D Classic",
						"3d": false,
						"preload": config_view_skins_preload_2
					},
					{
						"name": "skin2dwood",
						"title": "2D Wood",
						"3d": false,
						"preload": [
							"image|/res/images/cancel.png",
							"image|/res/images/whitebg.png",
							"image|/res/images/wikipedia.png",
							"image|/res/images/woodenpieces2d2.png",
							"image|/res/images/wood.jpg"
						]
					}
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js
	},

	"xiangqi": {
		"name": "xiangqi",
		"modelScripts": modelScripts_2,
		"config": {
			"status": true,
			"model": {
				"title-en": "Xiangqi",
				"summary": {
					"en": "Chinese Chess",
					"fr": "Les Échecs chinois"
				},
				"rules": {
					"en": "res/rules/xiangqi/xiangqi-rules.html",
                        "fr": "res/rules/xiangqi/xiangqi-rules-fr.html",

				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/xiangqi/xiangqi-thumb.png",
				"released": 1394466978,
				"credits": {
					"en": "res/rules/xiangqi/xiangqi-credits.html"
				},
				"gameOptions": config_model_gameOptions_2,
				"js": modelScripts_2,
				"description": {
					"en": "res/rules/xiangqi/xiangqi-description.html"
				},
				"levels": config_model_levels_5_xiangqi_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/xiangqi-600x600-3d.jpg",
						"res/visuals/xiangqi-600x600-2d.jpg"
					]
				},
				"xdView": true,
				"css": config_view_css,
				"preferredRatio": 0.9,
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
							"smoothedfilegeo|0|/res/xiangqi/token.js",
							"image|/res/xiangqi/clearwoodtexture.jpg",
							"image|/res/xiangqi/decoration-cross.png",
							"image|/res/xiangqi/whitebg.png",
							"image|/res/xiangqi/xiangqi-pieces-sprites-playera.png",
							"image|/res/xiangqi/xiangqi-pieces-sprites-playerb.png",
							"image|/res/xiangqi/piecebump.jpg"
						],
						"world": config_view_skins_world_2,
						"camera": config_view_skins_camera
					},
					{
						"name": "skin3dwall",
						"title": "3D Wall",
						"3d": true,
						"preload": [
							"smoothedfilegeo|0|/res/ring-target.js",
							"image|/res/images/cancel.png",
							"smoothedfilegeo|0|/res/xiangqi/token.js",
							"image|/res/xiangqi/wood3.jpg",
							"image|/res/xiangqi/clearwoodtexture.jpg",
							"image|/res/xiangqi/decoration-cross.png",
							"image|/res/xiangqi/whitebg.png",
							"image|/res/xiangqi/xiangqi-pieces-sprites-playera.png",
							"image|/res/xiangqi/xiangqi-pieces-sprites-playerb.png",
							"image|/res/xiangqi/piecebump.jpg"
						],
						"world": config_view_skins_world_2,
						"camera": config_view_skins_camera_2
					},
					{
						"name": "skin3dwestern",
						"title": "3D Western",
						"3d": true,
						"preload": config_view_skins_preload_3,
						"world": config_view_skins_world_2,
						"camera": config_view_skins_camera
					},
					{
						"name": "skin3dwallwestern",
						"title": "3D Wall Western",
						"3d": true,
						"preload": config_view_skins_preload_3,
						"world": config_view_skins_world_2,
						"camera": config_view_skins_camera_2
					},
					{
						"name": "skin2d",
						"title": "2D Classic",
						"3d": false,
						"preload": [
							"image|/res/images/cancel.png",
							"image|/res/images/whitebg.png",
							"image|/res/xiangqi/wood3.jpg",
							"image|/res/xiangqi/clearwoodtexture.jpg",
							"image|/res/xiangqi/decoration-cross.png",
							"image|/res/xiangqi/whitebg.png",
							"image|/res/xiangqi/xiangqi-pieces-sprites.png"
						]
					},
					{
						"name": "skin2dwestern",
						"title": "2D Western",
						"3d": false,
						"preload": [
							"image|/res/images/cancel.png",
							"image|/res/images/whitebg.png",
							"image|/res/xiangqi/wood3.jpg",
							"image|/res/xiangqi/clearwoodtexture.jpg",
							"image|/res/xiangqi/decoration-cross.png",
							"image|/res/xiangqi/whitebg.png",
							"image|/res/xiangqi/xiangqi-pieces-sprites-western.png"
						]
					}
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_2,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_2
	},

	"janggi": {
		"name": "janggi",
		"modelScripts": modelScripts_janggi,
		"config": {
			"status": true,
			"model": {
				"title-en": "Janggi",
				"summary": {
					"en": "Korean Chess",
					"fr": "Les Échecs coréens"
				},
				"rules": {
					"en": "res/rules/janggi/janggi-rules.html",
					"fr": "res/rules/janggi/janggi-rules-fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/janggi/janggi-thumb.png",
				"released": 1786000000,
				"credits": {
					"en": "res/rules/janggi/janggi-credits.html"
				},
				"gameOptions": config_model_gameOptions_2,
				"js": modelScripts_janggi,
				"description": {
					"en": "res/rules/janggi/janggi-description.html"
				},
				"levels": config_model_levels_5
			},
			"view": {
				"title-en": "Chessbase view",
				"xdView": true,
				"css": config_view_css,
				"preferredRatio": 0.9,
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
							"smoothedfilegeo|0|/res/xiangqi/token.js",
							"image|/res/xiangqi/wood2.jpg",
							"image|/res/xiangqi/whitebg.png",
							"image|/res/janggi/janggi-pieces-sprites-glyphs.png",
							"image|/res/xiangqi/piecebump.jpg"
						],
						"world": config_view_skins_world_2,
						"camera": config_view_skins_camera
					},
					{
						"name": "skin3dwall",
						"title": "3D Wall",
						"3d": true,
						"preload": [
							"smoothedfilegeo|0|/res/ring-target.js",
							"image|/res/images/cancel.png",
							"smoothedfilegeo|0|/res/xiangqi/token.js",
							"image|/res/xiangqi/wood2.jpg",
							"image|/res/xiangqi/whitebg.png",
							"image|/res/janggi/janggi-pieces-sprites-glyphs.png",
							"image|/res/xiangqi/piecebump.jpg"
						],
						"world": config_view_skins_world_2,
						"camera": config_view_skins_camera_2
					},
					{
						"name": "skin3dwestern",
						"title": "3D Western",
						"3d": true,
						"preload": [
							"smoothedfilegeo|0|/res/ring-target.js",
							"image|/res/images/cancel.png",
							"smoothedfilegeo|0|/res/xiangqi/token.js",
							"image|/res/xiangqi/wood2.jpg",
							"image|/res/xiangqi/whitebg.png",
							"image|/res/xiangqi/xiangqi-pieces-sprites-western-player.png",
							"image|/res/xiangqi/piecebump.jpg"
						],
						"world": config_view_skins_world_2,
						"camera": config_view_skins_camera
					},
					{
						"name": "skin2d",
						"title": "2D Classic",
						"3d": false,
						"preload": [
							"image|/res/images/cancel.png",
							"image|/res/images/whitebg.png",
							"image|/res/xiangqi/wood2.jpg",
							"image|/res/janggi/janggi-pieces-sprites.png"
						]
					},
					{
						"name": "skin2dwestern",
						"title": "2D Pictograms",
						"3d": false,
						"preload": [
							"image|/res/images/cancel.png",
							"image|/res/images/whitebg.png",
							"image|/res/xiangqi/wood2.jpg",
							"image|/res/janggi/janggi-pieces-sprites-western.png"
						]
					}
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_janggi,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_janggi
	},

	"makruk": {
		"name": "makruk",
		"modelScripts": modelScripts_12,
		"config": {
			"status": true,
			"model": {
				"title-en": "Makruk",
				"summary": {
					"en": "Thai Chess",
					"fr": "Les Échecs thaïlandais"
				},
				"rules": {
					"en": "res/rules/makruk/mk-rules.html",
                        "fr": "res/rules/makruk/mk-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/makruk/mk-thumb.png",
				"released": 1393948578,
				"credits": {
					"en": "res/rules/makruk/mk-credits.html"
				},
				"gameOptions": config_model_gameOptions_2,
				"js": modelScripts_12,
				"description": {
					"en": "res/rules/makruk/mk-description.html"
				},
				"levels": config_model_levels_5_makruk_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/makruk-600x600-3d.jpg",
						"res/visuals/makruk-600x600-2d.jpg"
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
							"image|/res/images/wood-chipboard-5.jpg",
							"smoothedfilegeo|0|/res/makruk/pawn/mk-pawn.js",
							"image|/res/makruk/pawn/mk-pawn-diffusemap.jpg",
							"image|/res/makruk/pawn/mk-pawn-normalmap.jpg",
							"smoothedfilegeo|0|/res/makruk/knight/mk-knight.js",
							"image|/res/makruk/knight/mk-knight-diffusemap.jpg",
							"image|/res/makruk/knight/mk-knight-normalmap.jpg",
							"smoothedfilegeo|0|/res/makruk/bishop/mk-bishop.js",
							"image|/res/makruk/bishop/mk-bishop-diffusemap.jpg",
							"image|/res/makruk/bishop/mk-bishop-normalmap.jpg",
							"smoothedfilegeo|0|/res/makruk/rook/mk-rook.js",
							"image|/res/makruk/rook/mk-rook-diffusemap.jpg",
							"image|/res/makruk/rook/mk-rook-normalmap.jpg",
							"smoothedfilegeo|0|/res/makruk/queen/mk-queen.js",
							"image|/res/makruk/queen/mk-queen-diffusemap.jpg",
							"image|/res/makruk/queen/mk-queen-normalmap.jpg",
							"smoothedfilegeo|0|/res/makruk/king/mk-king.js",
							"image|/res/makruk/king/mk-king-diffusemap.jpg",
							"image|/res/makruk/king/mk-king-normalmap.jpg"
						],
						"world": config_view_skins_world_3,
						"camera": config_view_skins_camera
					},
					{
						"name": "skin2d",
						"title": "2D Classic",
						"3d": false,
						"preload": [
							"image|/res/images/cancel.png",
							"image|/res/images/whitebg.png",
							"image|/res/images/wikipedia.png",
							"image|/res/images/wood-chipboard-4.jpg"
						]
					}
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_12,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_12
	},

	"shatranj-chess": {
		"name": "shatranj-chess",
		"modelScripts": modelScripts_14,
		"config": {
			"status": true,
			"model": {
				"title-en": "Shatranj",
				"summary": {
					"en": "Ancient Chess",
					"fr": "Les Échecs anciens"
				},
				"rules": {
					"en": "res/rules/shatranj/shatranj-rules.html",
                        "fr": "res/rules/shatranj/shatranj-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/shatranj/shatranj-thumb.png",
				"released": 1401461778,
				"credits": {
					"en": "res/rules/shatranj/shatranj-credits.html"
				},
				"gameOptions": config_model_gameOptions_3,
				"obsolete": false,
				"js": modelScripts_14,
				"description": {
					"en": "res/rules/shatranj/shatranj-description.html"
				},
				"levels": config_model_levels_5_shatranj_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/shatranj-600x600-3d.jpg",
						"res/visuals/shatranj-600x600-2d.jpg"
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
							"smoothedfilegeo|0|/res/nishapur/pawn/pawn.js",
							"image|/res/nishapur/pawn/pawn-diffusemap.jpg",
							"image|/res/nishapur/pawn/pawn-normalmap.jpg",
							"smoothedfilegeo|0|/res/nishapur/knight/knight.js",
							"image|/res/nishapur/knight/knight-diffusemap.jpg",
							"image|/res/nishapur/knight/knight-normalmap.jpg",
							"smoothedfilegeo|0|/res/nishapur/elephant/elephant.js",
							"image|/res/nishapur/elephant/elephant-diffusemap.jpg",
							"image|/res/nishapur/elephant/elephant-normalmap.jpg",
							"smoothedfilegeo|0|/res/nishapur/rook/rook.js",
							"image|/res/nishapur/rook/rook-diffusemap.jpg",
							"image|/res/nishapur/rook/rook-normalmap.jpg",
							"smoothedfilegeo|0|/res/nishapur/general/general.js",
							"image|/res/nishapur/general/general-diffusemap.jpg",
							"image|/res/nishapur/general/general-normalmap.jpg",
							"smoothedfilegeo|0|/res/nishapur/king/king.js",
							"image|/res/nishapur/king/king-diffusemap.jpg",
							"image|/res/nishapur/king/king-normalmap.jpg",
							"image|/res/images/wikipedia.png",
							"image|/res/images/wood-chipboard-2.jpg"
						],
						"world": config_view_skins_world_3,
						"camera": config_view_skins_camera
					},
					{
						"name": "skin2d",
						"title": "2D Classic",
						"3d": false,
						"preload": [
							"image|/res/images/cancel.png",
							"image|/res/images/whitebg.png",
							"image|/res/images/wikipedia.png",
							"image|/res/images/wood-chipboard-2.jpg",
							"image|/res/nishapur/nishapur-2d-sprites.png"
						]
					}
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_14,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_14
	},

	"chess960": {
		"name": "chess960",
		"modelScripts": modelScripts_28,
		"config": {
			"status": true,
			"model": {
				"title-en": "Chess 960",
				"summary": {
					"en":"Chess from randomized positions",
					"fr": "Échecs avec placement aléatoire"
				},
				"rules": {
					"en": "res/rules/famous/chess960-rules.html",
                        "fr": "res/rules/famous/chess960-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/famous/chess960-thumb.png",
				"released": 1401720878,
				"credits": {
					"en": "res/rules/famous/chess960-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_28,
				"description": {
					"en": "res/rules/famous/chess960-description.html",
                        "fr": "res/rules/famous/chess960-description_fr.html"
				},
				"levels": config_model_levels_5_chess960_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/chess960-600x600-3d.jpg",
						"res/visuals/chess960-600x600-2d.jpg"
					]
				},
				"xdView": true,
				"css": config_view_css,
				"preferredRatio": 1,
				"useShowMoves": true,
				"useNotation": true,
				"module": "chessbase",
				"defaultOptions": config_view_defaultOptions,
				"skins": config_view_skins_3,
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_28,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_28
	},

	"spartan-chess": {
		"name": "spartan-chess",
		"modelScripts": modelScripts_103,
		"config": {
			"status": true,
			"model": {
				"title-en": "Spartan Chess",
				"summary": {
					"en":"An unorthodox Spartan army combats FIDE",
					"fr": "L’armée spartiate combat la FIDE"
				},
				"rules": {
					"en": "res/rules/spartan/spartan-rules.html",
					"fr": "res/rules/spartan/spartan-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/spartan/spartan-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/spartan/spartan-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"js": modelScripts_103,
				"description": {
					"en": "spartan-description.html"
				},
				"levels": config_model_levels_15_spartan_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/spartan-600x600-3d.jpg",
						"res/visuals/spartan-600x600-2d.jpg"
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
				"js": config_view_js_103,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_103
	},

};
