/*
 * Game manifest of the chessbase module: the one thing gulp reads when it
 * builds this module (HandleModuleGames requires this directory), and the list
 * every game in it is exposed through.
 *
 * The shared building blocks - script lists, level sets, game options, skins,
 * cameras, worlds - live in manifest/shared.js. Game entries move out of here
 * family by family into manifest/<family>.js, each leaving a one-line
 * reference at its own place in the array: the order of exports.games is part
 * of what callers see, so entries stay where they were.
 *
 * tests/chessbase/manifest-split.test.js is what makes that safe: it checks
 * the serialisation of every entry against a snapshot, which is exactly what
 * gulp writes into games/chessbase/<game>-config.js.
 */

const {
	modelScripts, config_model_gameOptions, config_model_levels_5,
	config_model_levels_5_amazon_expert, config_model_levels_5_chancellor_expert,
	config_model_levels_5_knightmate_expert, config_model_levels_5_grand_expert,
	config_model_levels_5_capablanca_expert, config_model_levels_5_antichess_expert,
	config_model_levels_5_wildebeest_expert, config_model_levels_5_heavychess_expert,
	config_model_levels_5_gardner_expert, config_model_levels_5_losalamos_expert,
	config_model_levels_5_mini4x4_expert, config_model_levels_5_mini4x5_expert,
	config_model_levels_5_micro4x5_expert, config_model_levels_5_baby_expert,
	config_model_levels_5_malett_expert, config_model_levels_5_attack_expert,
	config_model_levels_5_demi_expert, config_model_levels_5_gustav3_expert,
	config_model_levels_5_hectochess_expert, config_model_levels_5_tuttifrutti_expert,
	config_view_css, config_view_defaultOptions, config_view_skins_preload,
	config_view_skins_world_lightPosition, config_view_skins_world_skyLightPosition,
	config_view_skins_world, config_view_skins_camera, config_view_skins,
	config_view_skins_camera_2, config_view_skins_preload_2, config_view_sounds, config_view_js,
	config_model_gameOptions_2, modelScripts_3, config_view_skins_2, config_view_skins_3,
	config_view_js_3, modelScripts_4, config_view_js_4, modelScripts_5, config_view_js_5,
	modelScripts_6, config_view_js_6, modelScripts_7, config_view_js_7, modelScripts_8,
	config_view_js_8, modelScripts_9, config_view_js_9, modelScripts_10, config_view_js_10,
	modelScripts_11, config_model_levels_10, config_model_levels_10_courier_expert,
	config_view_js_11, config_view_skins_world_3, modelScripts_13, modelScripts_100,
	modelScripts_rococo, config_view_js_rococo, modelScripts_rocaille, config_view_js_rocaille,
	modelScripts_ultima, config_view_js_ultima, modelScripts_101, modelScripts_102,
	modelScripts_104, modelScripts_seireigi, modelScripts_chu_seireigi, modelScripts_105,
	modelScripts_106, modelScripts_107, modelScripts_108, config_model_gameOptions_tenjiku,
	config_model_levels_tenjiku, modelScripts_tenjiku, modelScripts_109, modelScripts_110,
	modelScripts_kyoto, modelScripts_kotaishi, config_model_levels_15,
	config_model_levels_15_shako_expert, config_model_levels_15_shogi_expert,
	config_model_levels_15_kotaishi_expert, config_model_levels_15_minishogi_expert,
	config_model_levels_15_kyotoshogi_expert, config_model_levels_15_torishogi_expert,
	config_model_levels_15_pemba_expert, config_view_js_13, config_view_js_100,
	config_view_js_101, config_view_js_102, config_view_js_104, config_view_js_chu_seireigi,
	config_view_js_seireigi, config_view_js_kotaishi, config_view_js_105, config_view_js_106,
	config_view_js_107, config_view_js_108, config_view_js_tenjiku, config_view_js_109,
	config_view_js_110, config_model_gameOptions_3, modelScripts_knightmate, config_model_rules,
	config_model_credits, config_view_js_15, config_view_skins_preload_4, config_view_skins_4,
	modelScripts_16, config_view_skins_camera_targetBounds, config_view_skins_5,
	config_view_js_16, modelScripts_17, config_view_css_2, config_view_skins_preload_6,
	config_view_skins_camera_3, config_view_skins_7, config_view_skins_8, config_view_js_17,
	modelScripts_18, config_view_js_18, modelScripts_19, config_view_js_19, modelScripts_20,
	config_view_js_20, modelScripts_21, config_view_skins_preload_8, config_view_js_21,
	modelScripts_22, config_view_css_3, config_view_skins_camera_4, config_view_js_22,
	modelScripts_23, config_view_js_23, modelScripts_24, modelScripts_space_spartan,
	config_view_js_space_spartan, config_view_js_24, modelScripts_25,
	config_view_skins_camera_target, config_view_js_25, modelScripts_26, config_view_js_26,
	modelScripts_27, config_view_js_27, modelScripts_29, config_view_skins_9, config_view_js_29,
	modelScripts_capablanca, config_view_skins_11, config_view_js_capablanca,
	config_view_skins_13, modelScripts_34, modelScripts_hectochess, modelScripts_heavychess,
	config_view_js_31, modelScripts_35, config_view_js_32, modelScripts_36, modelScripts_37,
	config_view_js_33, modelScripts_38, config_view_js_34, modelScripts_39, config_view_js_35,
	modelScripts_40, config_view_js_36, modelScripts_41, config_view_js_37, modelScripts_42,
	config_view_js_38, modelScripts_43, config_view_js_39, modelScripts_44, config_view_js_40,
	modelScripts_45, modelScripts_46, config_view_js_41, modelScripts_47, config_view_js_42,
	modelScripts_48, config_view_js_43, modelScripts_49, config_view_js_44, modelScripts_tera,
	config_view_js_tera, modelScripts_giga, config_view_js_giga, modelScripts_lca,
	config_view_js_lca, modelScripts_wtamerlane, config_view_js_wtamerlane,
	modelScripts_fantasticXIII, config_view_js_fantasticXIII, modelScripts_bigorra,
	config_view_js_bigorra, modelScripts_pemba, config_view_js_pemba, modelScripts_gigaII,
	config_view_js_gigaII, modelScripts_timurid, modelScripts_gross, config_view_js_timurid,
	config_view_js_duodecimal, modelScripts_zanzibars, config_view_js_zanzibars,
	modelScripts_acedrex, config_view_js_acedrex
} = require("./manifest/shared.js");

const famous = require("./manifest/famous.js").games;

exports.games = (function () {
	return [
		famous["classic-chess"],
		{
			"name": "losing-chess",
			"modelScripts": [
				"base-model.js",
				"grid-geo-model.js",
				"standard/losing-model.js"
			],
			"config": {
				"status": true,
				"model": {
					"title-en": "Losing Chess",
					"summary": {
						"en": "Also known as Antichess, Suicide Chess, Giveaway Chess, ...",
						"fr": "Aussi appelé Antichess, Suicide Chess ou Giveaway Chess…"
					},
					"thumbnail": "res/rules/standard/knight-inv-thumbnail.png",
					"module": "chessbase",
					"plazza": "true",
					"released": 1495039002,
					"rules": {
						"en": "res/rules/standard/losing-rules.html",
						"fr": "res/rules/standard/losing-rules_fr.html",
					},
					"credits": {
						"en": "res/rules/standard/credits.html",
						"fr": "res/rules/standard/credits-fr.html"
					},
					"gameOptions": config_model_gameOptions,
					"js": [
						"base-model.js",
						"grid-geo-model.js",
						"standard/losing-model.js"
					],
					"levels": config_model_levels_5_antichess_expert
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
		famous["xiangqi"],
		famous["janggi"],
		{
			"name": "gardner-chess",
			"modelScripts": modelScripts_3,
			"config": {
				"status": true,
				"model": {
					"title-en": "Gardner MiniChess",
					"summary": {
						"en": "Gardner 5x5 minichess (1969)",
						"fr": "Mini-échecs 5x5 de Gardner (1969)"
					},
					"rules": {
						"en": "res/rules/mini/gardner-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/mini/gardner-thumb.png",
					"released": 1398178578,
					"credits": {
						"en": "res/rules/mini/gardner-credits.html"
					},
					"gameOptions": config_model_gameOptions_2,
					"obsolete": false,
					"js": modelScripts_3,
					"levels": config_model_levels_5_gardner_expert,
					"description": {
						"en": "res/rules/mini/gardner-description.html"
					}
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/gardner-600x600-3d.jpg",
							"res/visuals/gardner-600x600-2d.jpg"
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
					"js": config_view_js_3,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_3
		},
		{
			"name": "mini4x4-chess",
			"modelScripts": modelScripts_4,
			"config": {
				"status": true,
				"model": {
					"title-en": "Mini Chess 4x4",
					"summary": {
						"en": "4x4 mini chess variant",
						"fr": "Variante d’échecs miniature en 4x4"
					},
					"rules": {
						"en": "res/rules/mini/mini4x4-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/mini/mini4x4-thumb.png",
					"released": 1398178577,
					"credits": {
						"en": "res/rules/mini/mini4x4-credits.html"
					},
					"gameOptions": config_model_gameOptions_2,
					"obsolete": false,
					"js": modelScripts_4,
					"levels": config_model_levels_5_mini4x4_expert,
					"description": {
						"en": "res/rules/mini/mini4x4-description.html"
					}
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/mini4x4-600x600-3d.jpg",
							"res/visuals/mini4x4-600x600-2d.jpg"
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
					"js": config_view_js_4,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_4
		},
		{
			"name": "mini4x5-chess",
			"modelScripts": modelScripts_5,
			"config": {
				"status": true,
				"model": {
					"title-en": "Mini Chess 4x5",
					"summary": {
						"en": "4x5 mini chess variant",
						"fr": "Variante d’échecs miniature en 4x5"
					},
					"rules": {
						"en": "res/rules/mini/mini4x5-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/mini/mini4x5-thumb.png",
					"released": 1398178576,
					"credits": {
						"en": "res/rules/mini/mini4x5-credits.html"
					},
					"gameOptions": config_model_gameOptions_2,
					"obsolete": false,
					"js": modelScripts_5,
					"levels": config_model_levels_5_mini4x5_expert,
					"description": {
						"en": "res/rules/mini/mini4x5-description.html"
					}
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/mini4x5-600x600-3d.jpg",
							"res/visuals/mini4x5-600x600-2d.jpg"
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
					"js": config_view_js_5,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_5
		},
		{
			"name": "micro4x5-chess",
			"modelScripts": modelScripts_6,
			"config": {
				"status": true,
				"model": {
					"title-en": "Micro Chess",
					"summary": {
						"en": "4x5 chess variant by Glimne (1997)",
						"fr": "Variante d’échecs 4x5 de Glimne (1997)"
					},
					"rules": {
						"en": "res/rules/mini/micro4x5-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/mini/micro4x5-thumb.png",
					"released": 1398178575,
					"credits": {
						"en": "res/rules/mini/micro4x5-credits.html"
					},
					"gameOptions": config_model_gameOptions_2,
					"obsolete": false,
					"js": modelScripts_6,
					"levels": config_model_levels_5_micro4x5_expert,
					"description": {
						"en": "res/rules/mini/micro4x5-description.html"
					}
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/micro4x5-600x600-3d.jpg",
							"res/visuals/micro4x5-600x600-2d.jpg"
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
					"js": config_view_js_6,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_6
		},
		{
			"name": "baby-chess",
			"modelScripts": modelScripts_7,
			"config": {
				"status": true,
				"model": {
					"title-en": "Baby Chess",
					"summary": {
						"en": "5x5 Baby chess",
						"fr": "Baby chess en 5x5"
					},
					"rules": {
						"en": "res/rules/mini/baby-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/mini/baby-thumb.png",
					"released": 1398178574,
					"credits": {
						"en": "res/rules/mini/baby-credits.html"
					},
					"gameOptions": config_model_gameOptions_2,
					"obsolete": false,
					"js": modelScripts_7,
					"levels": config_model_levels_5_baby_expert,
					"description": {
						"en": "res/rules/mini/baby-description.html"
					}
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/baby-600x600-3d.jpg",
							"res/visuals/baby-600x600-2d.jpg"
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
					"js": config_view_js_7,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_7
		},
		{
			"name": "malett-chess",
			"modelScripts": modelScripts_8,
			"config": {
				"status": true,
				"model": {
					"title-en": "Malett Chess",
					"summary": {
						"en": "5x5 chess variant by Jeff Malett",
						"fr": "Variante d’échecs 5x5 de Jeff Malett"
					},
					"rules": {
						"en": "res/rules/mini/malett-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/mini/malett-thumb.png",
					"released": 1398178573,
					"credits": {
						"en": "res/rules/mini/malett-credits.html"
					},
					"gameOptions": config_model_gameOptions_2,
					"obsolete": false,
					"js": modelScripts_8,
					"levels": config_model_levels_5_malett_expert,
					"description": {
						"en": "res/rules/mini/malett-description.html"
					}
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/malett-600x600-3d.jpg",
							"res/visuals/malett-600x600-2d.jpg"
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
					"js": config_view_js_8,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_8
		},
		{
			"name": "los-alamos-chess",
			"modelScripts": modelScripts_9,
			"config": {
				"status": true,
				"model": {
					"title-en": "Los Alamos Chess",
					"summary": {
						"en": "6x6 chess variant",
						"fr": "Variante d’échecs en 6x6"
					},
					"rules": {
						"en": "res/rules/mini/los-alamos-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/mini/los-alamos-thumb.png",
					"released": 1398178573,
					"credits": {
						"en": "res/rules/mini/los-alamos-credits.html"
					},
					"gameOptions": config_model_gameOptions_2,
					"obsolete": false,
					"js": modelScripts_9,
					"levels": config_model_levels_5_losalamos_expert,
					"description": {
						"en": "res/rules/mini/los-alamos-description.html"
					}
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/los-alamos-600x600-3d.jpg",
							"res/visuals/los-alamos-600x600-2d.jpg"
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
					"js": config_view_js_9,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_9
		},
		{
			"name": "attack-chess",
			"modelScripts": modelScripts_10,
			"config": {
				"status": true,
				"model": {
					"title-en": "Chess Attack",
					"summary": {
						"en": "5x6 chess variant",
						"fr": "Variante d’échecs en 5x6"
					},
					"rules": {
						"en": "res/rules/mini/attack-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/mini/attack-thumb.png",
					"released": 1398178572,
					"credits": {
						"en": "res/rules/mini/attack-credits.html"
					},
					"gameOptions": config_model_gameOptions_2,
					"obsolete": false,
					"js": modelScripts_10,
					"levels": config_model_levels_5_attack_expert,
					"description": {
						"en": "res/rules/mini/attack-description.html"
					}
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/attack-600x600-3d.jpg",
							"res/visuals/attack-600x600-2d.jpg"
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
					"js": config_view_js_10,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_10
		},
		{
			"name": "courier-chess",
			"modelScripts": modelScripts_11,
			"config": {
				"status": true,
				"model": {
					"title-en": "Courier Chess",
					"summary": {
						"en": "12x8 chess (12th century)",
						"fr": "Échecs en 12x8 (XIIe siècle)"
					},
					"rules": {
						"en": "res/rules/historical/courier-rules.html",
                        "fr": "res/rules/historical/courier-rules_fr.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/historical/courier-thumb.png",
					"released": 1393430178,
					"credits": {
						"en": "res/rules/historical/courier-credits.html"
					},
					"gameOptions": config_model_gameOptions_2,
					"js": modelScripts_11,
					"description": {
						"en": "res/rules/historical/courier-description.html"
					},
					"levels": config_model_levels_10_courier_expert
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/courier-600x600-3d.jpg",
							"res/visuals/courier-600x600-2d.jpg"
						]
					},
					"xdView": true,
					"css": config_view_css,
					"preferredRatio": 1.5,
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
								"smoothedfilegeo|0|/res/courierchess/cc-pawn/cc-pawn.js",
								"image|/res/courierchess/cc-pawn/cc-pawn-diffuse.jpg",
								"image|/res/courierchess/cc-pawn/cc-pawn-normal.jpg",
								"smoothedfilegeo|0|/res/courierchess/cc-archer/cc-archer.js",
								"image|/res/courierchess/cc-archer/cc-archer-diffuse.jpg",
								"image|/res/courierchess/cc-archer/cc-archer-normal.jpg",
								"smoothedfilegeo|0|/res/courierchess/cc-queen/cc-queen.js",
								"image|/res/courierchess/cc-queen/cc-queen-diffuse.jpg",
								"image|/res/courierchess/cc-queen/cc-queen-normal.jpg",
								"smoothedfilegeo|0|/res/courierchess/cc-schleich/cc-schleich.js",
								"image|/res/courierchess/cc-schleich/cc-schleich-diffuse.jpg",
								"image|/res/courierchess/cc-schleich/cc-schleich-normal.jpg",
								"smoothedfilegeo|0|/res/courierchess/cc-knight/cc-knight.js",
								"image|/res/courierchess/cc-knight/cc-knight-diffuse.jpg",
								"image|/res/courierchess/cc-knight/cc-knight-normal.jpg",
								"smoothedfilegeo|0|/res/courierchess/cc-man/cc-man.js",
								"image|/res/courierchess/cc-man/cc-man-diffuse.jpg",
								"image|/res/courierchess/cc-man/cc-man-normal.jpg",
								"smoothedfilegeo|0|/res/courierchess/cc-courier/cc-courier.js",
								"image|/res/courierchess/cc-courier/cc-courier-diffuse.jpg",
								"image|/res/courierchess/cc-courier/cc-courier-normal.jpg",
								"smoothedfilegeo|0|/res/courierchess/cc-rook/cc-rook.js",
								"image|/res/courierchess/cc-rook/cc-rook-diffuse.jpg",
								"image|/res/courierchess/cc-rook/cc-rook-normal.jpg",
								"smoothedfilegeo|0|/res/courierchess/cc-king/cc-king.js",
								"image|/res/courierchess/cc-king/cc-king-diffuse.jpg",
								"image|/res/courierchess/cc-king/cc-king-normal.jpg",
								"image|/res/images/crackles.jpg",
								"image|/res/images/tileralpha.png"
							],
							"world": config_view_skins_world,
							"camera": {
								"fov": 45,
								"distMax": 50,
								"radius": 12,
								"elevationAngle": 60,
								"elevationMin": 0
							}
						},
						{
							"name": "skin2d",
							"title": "2D Classic",
							"3d": false,
							"preload": [
								"image|/res/courierchess/wikipedia-courier-sprites.png"
							]
						}
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_11,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_11
		},
		famous["makruk"],
		{
			"name": "shako-chess",
			"modelScripts": modelScripts_13,
			"config": {
				"status": true,
				"model": {
					"title-en": "Shako",
					"summary": {
						"en": "10x10 Chess",
						"fr": "Échecs en 10x10"
					},
					"rules": {
						"en": "res/rules/shako/shako-rules.html",
						"fr": "res/rules/shako/shako-rules-fr.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/shako/shako-thumb.png",
					"released": 1396536978,
					"credits": {
						"en": "res/rules/shako/shako-credits.html",
						"fr": "res/rules/shako/shako-credits-fr.html"
					},
					"gameOptions": config_model_gameOptions,
					"js": modelScripts_13,
					"description": {
						"en": "res/rules/shako/shako-description.html",
						"fr": "res/rules/shako/shako-description-fr.html"
					},
					"levels": config_model_levels_15_shako_expert
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/shako-600x600-3d.jpg",
							"res/visuals/shako-600x600-2d.jpg"
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
					"js": config_view_js_13,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_13
		},
		famous["shatranj-chess"],
		{
			"name": "knightmate-chess",
			"modelScripts": modelScripts_knightmate,
			"config": {
				"status": true,
				"model": {
					"title-en": "KnightMate",
					"summary": {
						"en": "Checkmate the royal knight",
						"fr": "Mate le cavalier royal"
					},
					"rules": config_model_rules,
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/standard/knightmate.png",
					"released": 1389887778,
					"rules": {
						"en": "res/rules/standard/knightmate.html",
					},
					"credits": config_model_credits,
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_knightmate,
					"levels": config_model_levels_5_knightmate_expert
				},
				"view": {
					"title-en": "Chessbase view",
					"js": config_view_js_15,
					"visuals": {
						"600x600": [
							"res/visuals/knightmate-600x600-3d.jpg",
							"res/visuals/knightmate-600x600-2d.png"
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
							"preload": config_view_skins_preload_4,
							"world": config_view_skins_world,
							"camera": config_view_skins_camera
						},
						config_view_skins_4
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_15
		},
		{
			"name": "raumschach",
			"modelScripts": modelScripts_16,
			"config": {
				"status": true,
				"model": {
					"title-en": "Raumschach",
					"summary": {
						"en":"5x5x5 Chess",
						"fr": "Échecs 3D 5x5x5"
					},
					"rules": {
						"en": "res/rules/raumschach/raumschach-rules.html",
                        "fr": "res/rules/raumschach/raumschach-rules_fr.html",
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/raumschach/raumschach-thumb.png",
					"released": 1402066578,
					"credits": {
						"en": "res/rules/raumschach/raumschach-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_16,
					"description": {
						"en": "res/rules/raumschach/raumschach-description.html"
					},
					"levels": config_model_levels_10
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/raumschach-600x600-3d.jpg",
							"res/visuals/raumschach-600x600-2d.jpg"
						]
					},
					"xdView": true,
					"css": config_view_css,
					"preferredRatio": 1.1,
					"useShowMoves": true,
					"useNotation": true,
					"module": "chessbase",
					"defaultOptions": config_view_defaultOptions,
					"skins": [
						{
							"name": "skin3d",
							"title": "3D ClaDssic",
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
								"smoothedfilegeo|0|/res/fairy/unicorn/unicorn.js",
								"image|/res/fairy/unicorn/unicorn-diffusemap.jpg",
								"image|/res/fairy/unicorn/unicorn-normalmap.jpg"
							],
							"world": {
								"lightIntensity": 1,
								"skyLightIntensity": 0.5,
								"lightCastShadow": false,
								"fog": false,
								"color": 4686804,
								"lightPosition": config_view_skins_world_lightPosition,
								"skyLightPosition": config_view_skins_world_skyLightPosition,
								"lightShadowDarkness": 0.55,
								"ambientLightColor": 16777215
							},
							"camera": {
								"fov": 45,
								"distMax": 200,
								"radius": 24,
								"elevationAngle": 40,
								"elevationMin": -89,
								"rotationAngle": 150,
								"target": [
									0,
									0,
									5000
								],
								"targetBounds": config_view_skins_camera_targetBounds
							}
						},
						config_view_skins_5
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_16,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_16
		},
		{
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
		{
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
		{
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
		{
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
		{
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
		{
			"name": "circular-chess",
			"modelScripts": modelScripts_22,
			"config": {
				"status": true,
				"model": {
					"title-en": "Modern Circular Chess",
					"summary": {
						"en": "Chess on a ring",
						"fr": "Échecs sur un anneau"
					},
					"rules": {
						"en": "res/rules/circular/circular-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/circular/circular-thumb.png",
					"released": 1397055378,
					"credits": {
						"en": "res/rules/circular/circular-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_22,
					"description": {
						"en": "res/rules/circular/circular-description.html"
					},
					"levels": config_model_levels_5
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/circular-600x600-3d.jpg",
							"res/visuals/circular-600x600-2d.jpg"
						]
					},
					"xdView": true,
					"css": config_view_css_3,
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
							"camera": config_view_skins_camera_4
						},
						config_view_skins_7
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_22,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_22
		},
		{
			"name": "byzantine-chess",
			"modelScripts": modelScripts_23,
			"config": {
				"status": true,
				"model": {
					"title-en": "Byzantine Chess",
					"summary": {
						"en":"10th century circular Chess",
						"fr": "Échecs circulaires (Xe siècle)",
					},
					"rules": {
						"en": "res/rules/byzantine/byzantine-rules.html",
                        "fr": "res/rules/byzantine/byzantine-rules_fr.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/byzantine/byzantine-thumb.png",
					"released": 1401461778,
					"credits": {
						"en": "res/rules/byzantine/byzantine-credits.html"
					},
					"gameOptions": config_model_gameOptions_3,
					"obsolete": false,
					"js": modelScripts_23,
					"description": {
						"en": "res/rules/byzantine/byzantine-description.html"
					},
					"levels": config_model_levels_5
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/byzantine-600x600-3d.jpg",
							"res/visuals/byzantine-600x600-2d.jpg"
						]
					},
					"xdView": true,
					"css": config_view_css_3,
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
								"image|/res/byzantine/byzantine-board.jpg"
							],
							"world": config_view_skins_world_3,
							"camera": config_view_skins_camera_4
						},
						{
							"name": "skin2d",
							"title": "2D Classic",
							"3d": false,
							"preload": [
								"image|/res/images/wikipedia.png",
								"image|/res/byzantine/byzantine-board.jpg",
								"image|/res/nishapur/nishapur-2d-sprites.png"
							]
						}
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_23,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_23
		},
		{
			"name": "3dchess",
			"modelScripts": modelScripts_24,
			"config": {
				"status": true,
				"model": {
					"title-en": "3D Chess",
					"summary": {
						"en": "Asymmetric 3D Chess (6x8x3)",
						"fr": "Échecs 3D asymétriques (6x8x3)"
					},
					"rules": {
						"en": "res/rules/3dchess/3dchess-rules.html",
                        "fr": "res/rules/3dchess/3dchess-rules-fr.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/3dchess/3dchess-thumb.png",
					"released": 1402584978,
					"credits": {
						"en": "res/rules/3dchess/3dchess-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_24,
					"description": {
						"en": "res/rules/3dchess/3dchess-description.html"
					},
					"levels": config_model_levels_15
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/3dchess-600x600-3d.jpg",
							"res/visuals/3dchess-600x600-2d.jpg"
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
							"preload": config_view_skins_preload,
							"world": {
								"lightIntensity": 0.8,
								"skyLightIntensity": 0.5,
								"lightCastShadow": false,
								"fog": false,
								"color": 4686804,
								"lightPosition": config_view_skins_world_lightPosition,
								"skyLightPosition": config_view_skins_world_skyLightPosition,
								"lightShadowDarkness": 0.55,
								"ambientLightColor": 8947848
							},
							"camera": {
								"fov": 45,
								"distMax": 200,
								"radius": 18,
								"elevationAngle": 30,
								"elevationMin": -89,
								"rotationAngle": 150,
								"target": [
									0,
									0,
									2500
								],
								"targetBounds": config_view_skins_camera_targetBounds
							}
						},
						config_view_skins_5
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_24,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_24
		},
		{
			"name": "space-spartan",
			"modelScripts": modelScripts_space_spartan,
			"config": {
				"status": true,
				"model": {
					"title-en": "Space Spartan",
					"summary": {
						"en": "6x8x3 Chess",
						"fr": "Échecs en 6x8x3"
					},
					"rules": {
						"en": "res/rules/3dchess/space-spartan-rules.html",
                        "fr": "res/rules/3dchess/space-spartan-rules-fr.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/3dchess/space-spartan.png",
					"released": 1402584978,
					"credits": {
						"en": "res/rules/3dchess/space-spartan-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_space_spartan,
					"levels": config_model_levels_15
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/space_spartan-600x600-3d.jpg",
							"res/visuals/space_spartan-600x600-2d.png"
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
							"preload": config_view_skins_preload,
							"world": {
								"lightIntensity": 0.8,
								"skyLightIntensity": 0.5,
								"lightCastShadow": false,
								"fog": false,

								"color": 4686804,
								"lightPosition": config_view_skins_world_lightPosition,
								"skyLightPosition": config_view_skins_world_skyLightPosition,
								"lightShadowDarkness": 0.55,
								"ambientLightColor": 8947848
							},
							"camera": {

								"fov": 45,
								"distMax": 200,
								"radius": 18,
								"elevationAngle": 30,
								"elevationMin": -89,
								"rotationAngle": 150,
								"target": [
									0,
									0,
									2500
								],
								"targetBounds": config_view_skins_camera_targetBounds
							}
						},
						config_view_skins_5
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_space_spartan,
					"useAutoComplete": true

				}
			},
			"viewScripts": config_view_js_space_spartan
		},
		{
			"name": "cylinder-chess",
			"modelScripts": modelScripts_25,
			"config": {
				"status": true,
				"model": {
					"title-en": "Cylinder Chess",
					"summary": {
						"en": "Cylinder Chess",
						"fr": "Échecs cylindriques"
					},
					"rules": {
						"en": "res/rules/cylinder/cylinder-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/cylinder/cylinder-thumb.png",
					"released": 1401720978,
					"credits": {
						"en": "res/rules/cylinder/cylinder-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_25,
					"description": {
						"en": "res/rules/cylinder/cylinder-description.html"
					},
					"levels": config_model_levels_5
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/cylinder-600x600-3d.jpg",
							"res/visuals/cylinder-600x600-2d.jpg"
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
							"preload": config_view_skins_preload_4,
							"world": {
								"lightIntensity": 1,
								"skyLightIntensity": 1,
								"lightCastShadow": false,
								"fog": false,
								"color": 4686804,
								"lightPosition": {
									"x": 10,
									"y": 15,
									"z": 0
								},
								"skyLightPosition": config_view_skins_world_skyLightPosition,
								"lightShadowDarkness": 0.55,
								"ambientLightColor": 16777215
							},
							"camera": {
								"fov": 45,
								"distMax": 200,
								"radius": 18,
								"elevationAngle": 0,
								"elevationMin": -89,
								"rotationAngle": -90,
								"target": config_view_skins_camera_target,
								"targetBounds": config_view_skins_camera_targetBounds
							}
						},
						config_view_skins_5
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_25,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_25
		},
		{
			"name": "cubic-chess",
			"modelScripts": modelScripts_26,
			"config": {
				"status": true,
				"model": {
					"title-en": "Cube chess",
					"summary": {
						"en": "Frontier variant on a cube",
						"fr": "Variante Frontier sur un cube"
					},
					"rules": {
						"en": "res/rules/cube/cubic-rules.html",
                        "fr": "res/rules/cube/cubic-rules_fr.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/cube/cubic-chess-thumb.png",
					"released": 1395590178,
					"credits": config_model_credits,
					"gameOptions": config_model_gameOptions,
					"js": modelScripts_26,
					"levels": config_model_levels_5
				},
				"view": {
					"title-en": "Chessbase view",
					"js": config_view_js_26,
					"xdView": true,
					"css": config_view_css,
					"preferredRatio": 1.3333333333333,
					"useShowMoves": true,
					"useNotation": true,
					"module": "chessbase",
					"defaultOptions": {
						"sounds": true,
						"moves": false,
						"notation": false,
						"autocomplete": false
					},
					"skins": [
						{
							"name": "skin3d",
							"title": "3D Classic",
							"3d": true,
							"preload": config_view_skins_preload_4,
							"world": {
								"lightIntensity": 0,
								"skyLightIntensity": 0,
								"lightCastShadow": false,
								"fog": false,
								"color": 4686804,
								"lightPosition": {
									"x": 9,
									"y": 14,
									"z": 9
								},
								"skyLightPosition": config_view_skins_world_skyLightPosition,
								"lightShadowDarkness": 0.55,
								"ambientLightColor": 16777215
							},
							"camera": {
								"fov": 45,
								"distMax": 200,
								"radius": 25,
								"elevationAngle": 45,
								"elevationMin": -89,
								"rotationAngle": -45,
								"target": config_view_skins_camera_target,
								"targetBounds": config_view_skins_camera_targetBounds
							}
						},
						config_view_skins_4
					],
					"animateSelfMoves": false,
					"switchable": false,
					"sounds": config_view_sounds,
					"useAutoComplete": false
				}
			},
			"viewScripts": config_view_js_26
		},
		{
			"name": "rollerball-chess",
			"modelScripts": modelScripts_27,
			"config": {
				"status": true,
				"model": {
					"title-en": "Rollerball Chess",
					"summary": {
						"en": "Chess variant on an unusual board",
						"fr": "Variante d’échecs sur un tablier inhabituel"
					},
					"rules": {
						"en": "res/rules/rollerball/rollerball-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/rollerball/rollerball-thumb.png",
					"released": 1397141778,
					"credits": {
						"en": "res/rules/rollerball/rollerball-credits.html"
					},
					"gameOptions": {
						"preventRepeat": true,
						"uctTransposition": "state",
						"uctIgnoreLoop": false,
						"levelOptions": {
							"checkFactor": 0.2,
							"pieceValueFactor": 1,
							"posValueFactor": 0.1,
							"averageDistKingFactor": -0.01,
							"castleFactor": 0.1,
							"minorPiecesMovedFactor": 0.1,
							"pieceValueRatioFactor": 1,
							"endingKingFreedomFactor": 0.01,
							"endingDistKingFactor": 0.05,
							"distKingCornerFactor": 0.1,
							"distPawnPromoFactor": -0.05,
							"distKingThroneFactor": -0.1
						}
					},
					"obsolete": false,
					"js": modelScripts_27,
					"description": {
						"en": "res/rules/rollerball/rollerball-description.html"
					},
					"levels": config_model_levels_5
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/rollerball-600x600-3d.jpg",
							"res/visuals/rollerball-600x600-2d.jpg"
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
								"smoothedfilegeo|0|/res/staunton/pawn/pawn-classic.js",
								"image|/res/staunton/pawn/pawn-diffusemap.jpg",
								"image|/res/staunton/pawn/pawn-normalmap.jpg",
								"smoothedfilegeo|0|/res/staunton/knight/knight.js",
								"image|/res/staunton/knight/knight-diffusemap.jpg",
								"image|/res/staunton/knight/knight-normalmap.jpg",
								"smoothedfilegeo|0|/res/staunton/bishop/bishop.js",
								"image|/res/staunton/bishop/bishop-diffusemap.jpg",
								"image|/res/staunton/bishop/bishop-normalmap.jpg",
								"smoothedfilegeo|0|/res/staunton/rook/rook.js",
								"image|/res/staunton/rook/rook-diffusemap.jpg",
								"image|/res/staunton/rook/rook-normalmap.jpg",
								"smoothedfilegeo|0|/res/staunton/queen/queen.js",
								"image|/res/staunton/queen/queen-diffusemap.jpg",
								"image|/res/staunton/queen/queen-normalmap.jpg",
								"smoothedfilegeo|0|/res/staunton/king/king.js",
								"image|/res/staunton/king/king-diffusemap.jpg",
								"image|/res/staunton/king/king-normalmap.jpg",
								"image|/res/images/wood.jpg"
							],
							"world": config_view_skins_world,
							"camera": config_view_skins_camera_4
						},
						config_view_skins_7
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_27,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_27
		},
		famous["chess960"],
		{
			"name": "metamachy-chess",
			"modelScripts": modelScripts_29,
			"config": {
				"status": true,
				"model": {
					"title-en": "Metamachy",
					"summary": {
						"en": "Chess on 12x12 with fairy pieces",
						"fr": "Échecs en 12x12 avec des pièces féeriques"
					},
					"rules": {
						"en": "res/rules/metamachy/metamachy-rules.html",
                        "fr": "res/rules/metamachy/metamachy-rules_fr.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/metamachy/metamachy-thumb.png",
					"released": 1402412178,
					"credits": {
						"en": "res/rules/metamachy/metamachy-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_29,
					"description": {
						"en": "res/rules/metamachy/metamachy-description.html"
					},
					"levels": config_model_levels_15
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/metamachy-600x600-3d.jpg",
							"res/visuals/metamachy-600x600-2d.jpg"
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
								"image|/res/fairy/eagle/eagle-normalmap.jpg"
							],
							"world": config_view_skins_world,
							"camera": config_view_skins_camera
						},
						config_view_skins_9
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_29,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_29
		},
		{
			"name": "capablanca-chess",
			"modelScripts": modelScripts_capablanca,
			"config": {
				"status": true,
				"model": {
					"title-en": "10x8 Chess variants",
					"summary": {
						"en": "Capablanca, Janus, Carrera, Gothic …",
						"fr": "Capablanca, Janus, Carrera, Gothic…"
					},
					"rules": {
						"en": "res/rules/capa10x8/capablanca-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/capa10x8/capablanca-thumb.png",
					"released": 1404893076,
					"credits": {
						"en": "res/rules/capa10x8/capablanca-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_capablanca,
					"description": {
						"en": "res/rules/capa10x8/capablanca-description.html"
					},
					"levels": config_model_levels_5_capablanca_expert
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/capablanca-600x600-3d.jpg",
							"res/visuals/capablanca-600x600-2d.jpg"
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
					"js": config_view_js_capablanca,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_capablanca
		},
		{
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
		{
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
		{
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
		{
			"name": "modern-chess",
			"modelScripts": modelScripts_35,
			"config": {
				"status": true,
				"model": {
					"title-en": "Modern Chess",
					"summary": {
						"en": "Chess on 9x9 (1968)",
						"fr": "Échecs en 9x9 (1968)"
					},
					"rules": {
						"en": "res/rules/knighted/modern-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/knighted/modern-thumb.png",
					"released": 1404999946,
					"credits": {
						"en": "res/rules/knighted/modern-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_35,
					"description": {
						"en": "res/rules/knighted/modern-description.html"
					},
					"levels": config_model_levels_5
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/modern-600x600-3d.jpg",
							"res/visuals/modern-600x600-2d.jpg"
						]
					},
					"xdView": true,
					"css": config_view_css,
					"preferredRatio": 1,
					"useShowMoves": true,
					"useNotation": true,
					"module": "chessbase",
					"defaultOptions": config_view_defaultOptions,
					"skins": config_view_skins_13,
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_32,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_32
		},
		{
			"name": "chancellor-chess",
			"modelScripts": modelScripts_36,
			"config": {
				"status": true,
				"model": {
					"title-en": "Chancellor Chess",
					"summary": {
						"en": "Chess on 9x9 (1887)",
						"fr": "Échecs en 9x9 (1887)"
					},
					"rules": {
						"en": "res/rules/knighted/chancellor-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/knighted/chancellor-thumb.png",
					"released": 1404918051,
					"credits": {
						"en": "res/rules/knighted/chancellor-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_36,
					"description": {
						"en": "res/rules/knighted/chancellor-description.html"
					},
					"levels": config_model_levels_5_chancellor_expert
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/chancellor-600x600-3d.jpg",
							"res/visuals/chancellor-600x600-2d.jpg"
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
								"smoothedfilegeo|0|/res/fairy/marshall/marshall.js",
								"image|/res/fairy/marshall/marshall-diffusemap.jpg",
								"image|/res/fairy/marshall/marshall-normalmap.jpg"
							],
							"world": config_view_skins_world,
							"camera": config_view_skins_camera
						},
						config_view_skins_9
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_32,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_32
		},
		{
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
		{
			"name": "smess",
			"modelScripts": modelScripts_38,
			"config": {
				"status": true,
				"model": {
					"title-en": "Smess",
					"summary": {
						"en": "The Ninny's Chess (1970)",
						"fr": "Les échecs du nigaud (1970)"
					},
					"rules": {
						"en": "res/rules/smess/smess-rules.html",
						"fr": "res/rules/smess/smess-rules_fr.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/smess/smess-thumb.png",
					"released": 1402671377,
					"credits": {
						"en": "res/rules/smess/smess-credits.html"
					},
					"gameOptions": {
						"preventRepeat": true,
						"uctTransposition": "state",
						"uctIgnoreLoop": false,
						"levelOptions": {
							"endingKingFreedomFactor": 0.01,
							"pieceValueFactor": 1,
							"posValueFactor": 0.1,
							"averageDistKingFactor": -0.01,
							"castleFactor": 0.1,
							"minorPiecesMovedFactor": 0.1,
							"checkFactor": 0.2,
							"pieceValueRatioFactor": 1,
							"endingDistKingFactor": 0.05,
							"distKingCornerFactor": 0.1,
							"distPawnPromo1Factor": 0.3,
							"distPawnPromo2Factor": 0.2,
							"distPawnPromo3Factor": 0.1,
							"distPawnPromo4Factor": 0.05,
							"distPawnPromo5Factor": 0.03
						}
					},
					"obsolete": false,
					"js": modelScripts_38,
					"description": {
						"en": "res/rules/smess/smess-description.html"
					},
					"levels": config_model_levels_5
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/smess-600x600-3d.jpg",
							"res/visuals/smess-600x600-2d.jpg"
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
								"smoothedfilegeo|0|/res/smess/token.js",
								"image|/res/smess/promo.png",
								"image|/res/smess/arrow-top.png",
								"image|/res/smess/arrow-top-left.png",
								"image|/res/images/wood-chipboard-4.jpg",
								"image|/res/smess/playera-bg.png",
								"image|/res/smess/playerb-bg.png",
								"image|/res/smess/smess-pieces-sprites.png"
							],
							"world": config_view_skins_world,
							"camera": config_view_skins_camera
						},
						{
							"name": "skin2d",
							"title": "2D Classic",
							"3d": false,
							"preload": [
								"image|/res/images/cancel.png",
								"image|/res/images/whitebg.png",
								"image|/res/smess/promo.png",
								"image|/res/smess/arrow-top.png",
								"image|/res/smess/arrow-top-left.png",
								"image|/res/images/wood-chipboard-4.jpg",
								"image|/res/smess/smess-pieces-sprites-a.png",
								"image|/res/smess/smess-pieces-sprites-b.png"
							]
						}
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_34,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_34
		},
		{
			"name": "demi-chess",
			"modelScripts": modelScripts_39,
			"config": {
				"status": true,
				"model": {
					"title-en": "Demi-Chess",
					"summary": {
						"en": "4x8 chess variant by Peter Krystufek (1986)",
						"fr": "Variante d’échecs 4x8 de Peter Krystufek (1986)"
					},
					"rules": {
						"en": "res/rules/demi/demi-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/demi/demi-thumb.png",
					"released": 1403189778,
					"credits": {
						"en": "res/rules/demi/demi-credits.html"
					},
					"gameOptions": config_model_gameOptions_2,
					"obsolete": false,
					"js": modelScripts_39,
					"levels": config_model_levels_5_demi_expert,
					"description": {
						"en": "res/rules/demi/demi-description.html"
					}
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/demi-600x600-3d.jpg",
							"res/visuals/demi-600x600-2d.jpg"
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
					"js": config_view_js_35,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_35
		},
		{
			"name": "romanchenko-chess",
			"modelScripts": modelScripts_40,
			"config": {
				"status": true,
				"model": {
					"title-en": "Romanchenko's Chess",
					"summary": {
						"en": "Shifted 8x8 chess variant by V. Romanchenko",
						"fr": "Variante d’échecs 8x8 décalés de V. Romanchenko"
					},
					"rules": {
						"en": "res/rules/standard/romanchenko-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/standard/romanchenko-thumb.png",
					"released": 1403535377,
					"credits": {
						"en": "standard/romanchenko-credits.html"
					},
					"gameOptions": config_model_gameOptions_2,
					"obsolete": false,
					"js": modelScripts_40,
					"levels": config_model_levels_5,
					"description": {
						"en": "res/rules/standard/romanchenko-description.html"
					}
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/romanchenko-600x600-3d.jpg",
							"res/visuals/romanchenko-600x600-2d.jpg"
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
					"js": config_view_js_36,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_36
		},
		{
			"name": "amazon-chess",
			"modelScripts": modelScripts_41,
			"config": {
				"status": true,
				"model": {
					"title-en": "Amazon Chess",
					"summary": {
						"en": "18th century, Russia",
						"fr": "XVIIIe siècle, Russie"
					},
					"rules": {
						"en": "res/rules/amazon/amazon-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/amazon/amazon-thumb.png",
					"released": 1405068607,
					"credits": {
						"en": "res/rules/amazon/amazon-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_41,
					"levels": config_model_levels_5_amazon_expert,
					"description": {
						"en": "res/rules/amazon/amazon-description.html"
					}
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/amazon-600x600-3d.jpg",
							"res/visuals/amazon-600x600-2d.jpg"
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
					"js": config_view_js_37,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_37
		},
		{
			"name": "dukerutland-chess",
			"modelScripts": modelScripts_42,
			"config": {
				"status": true,
				"model": {
					"title-en": "Duke of Rutland Chess",
					"summary": {
						"en": "Chess on 14x10 (1747)",
						"fr": "Échecs en 14x10 (1747)"
					},
					"rules": {
						"en": "res/rules/dukerutland/dukerutland-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/dukerutland/dukerutland-thumb.png",
					"released": 1405068608,
					"credits": {
						"en": "res/rules/dukerutland/dukerutland-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_42,
					"description": {
						"en": "res/rules/dukerutland/dukerutland-description.html"
					},
					"levels": config_model_levels_5
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/dukerutland-600x600-3d.jpg",
							"res/visuals/dukerutland-600x600-2d.jpg"
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
								"smoothedfilegeo|0|/res/fairy/crowned-rook/crowned-rook.js",
								"image|/res/fairy/crowned-rook/crowned-rook-diffusemap.jpg",
								"image|/res/fairy/crowned-rook/crowned-rook-normalmap.jpg"
							],
							"world": config_view_skins_world,
							"camera": config_view_skins_camera
						},
						config_view_skins_9
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_38,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_38
		},
		{
			"name": "gustav3-chess",
			"modelScripts": modelScripts_43,
			"config": {
				"status": true,
				"model": {
					"title-en": "Gustav III Chess",
					"summary": {
						"en": "Gustav Johan Billberg, 1839",
						"fr": "Gustav Johan Billberg, 1839"
					},
					"rules": {
						"en": "res/rules/amazon/gustav3-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/amazon/gustav3-thumb.png",
					"released": 1405068609,
					"credits": {
						"en": "res/rules/amazon/gustav3-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_43,
					"description": {
						"en": "res/rules/amazon/gustav3-description.html"
					},
					"levels": config_model_levels_5_gustav3_expert
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/gustav3-600x600-3d.jpg",
							"res/visuals/gustav3-600x600-2d.jpg"
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
					"js": config_view_js_39,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_39
		},
		{
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
		{
			"name": "kaisergame-chess",
			"modelScripts": modelScripts_45,
			"config": {
				"status": true,
				"model": {
					"title-en": "Kaiserspiel",
					"summary": {
						"en": "Tressau, 1840",
						"fr": "Tressau, 1840"
					},
					"rules": {
						"en": "res/rules/tressau/kaisergame-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/tressau/kaisergame-thumb.png",
					"released": 1405068611,
					"credits": {
						"en": "res/rules/tressau/kaisergame-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_45,
					"description": {
						"en": "res/rules/tressau/kaisergame-description.html"
					},
					"levels": config_model_levels_5
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/kaisergame-600x600-3d.jpg",
							"res/visuals/kaisergame-600x600-2d.jpg"
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
					"js": config_view_js_31,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_31
		},
		{
			"name": "sultangame-chess",
			"modelScripts": modelScripts_46,
			"config": {
				"status": true,
				"model": {
					"title-en": "Sultanspiel",
					"summary": {
						"en": "Tressau, 1840",
						"fr": "Tressau, 1840"
					},
					"rules": {
						"en": "res/rules/tressau/sultangame-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/tressau/sultangame-thumb.png",
					"released": 1405068612,
					"credits": {
						"en": "res/rules/tressau/sultangame-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_46,
					"description": {
						"en": "res/rules/tressau/sultangame-description.html"
					},
					"levels": config_model_levels_5
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/sultangame-600x600-3d.jpg",
							"res/visuals/sultangame-600x600-2d.jpg"
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
								"smoothedfilegeo|0|/res/fairy/cardinal/cardinal.js",
								"image|/res/fairy/cardinal/cardinal-diffusemap.jpg",
								"image|/res/fairy/cardinal/cardinal-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/marshall/marshall.js",
								"image|/res/fairy/marshall/marshall-diffusemap.jpg",
								"image|/res/fairy/marshall/marshall-normalmap.jpg",
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
					"js": config_view_js_41,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_41
		},
		{
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
		{
			"name": "tutti-frutti-chess",
			"modelScripts": modelScripts_48,
			"config": {
				"status": true,
				"model": {
					"title-en": "Tutti-Frutti Chess",
					"summary": {
						"en": "Ralph Betza et Philip Cohen, 1978-79",
						"fr": "Ralph Betza et Philip Cohen, 1978-1979"
					},
					"rules": {
						"en": "res/rules/amazon/tutti-frutti-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/amazon/tutti-frutti-thumb.png",
					"released": 1405068614,
					"credits": {
						"en": "res/rules/amazon/tutti-frutti-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_48,
					"description": {
						"en": "res/rules/amazon/tutti-frutti-description.html"
					},
					"levels": config_model_levels_5_tuttifrutti_expert
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/tutti-frutti-600x600-3d.jpg",
							"res/visuals/tutti-frutti-600x600-2d.jpg"
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
								"smoothedfilegeo|0|/res/fairy/amazon/amazon.js",
								"image|/res/fairy/amazon/amazon-diffusemap.jpg",
								"image|/res/fairy/amazon/amazon-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/marshall/marshall.js",
								"image|/res/fairy/marshall/marshall-diffusemap.jpg",
								"image|/res/fairy/marshall/marshall-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/cardinal/cardinal.js",
								"image|/res/fairy/cardinal/cardinal-diffusemap.jpg",
								"image|/res/fairy/cardinal/cardinal-normalmap.jpg"
							],
							"world": config_view_skins_world,
							"camera": config_view_skins_camera
						},
						config_view_skins_9
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_43,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_43
		},
		{
			"name": "sweet16-chess",
			"modelScripts": modelScripts_49,
			"config": {
				"status": true,
				"model": {
					"title-en": "Sweet 16 Chess",
					"summary": {
						"en": "A huge 16x16 Chess Variant",
						"fr": "Une immense variante d’échecs en 16x16"
					},
					"rules": {
						"en": "res/rules/standard/sweet16-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/standard/sweet16-thumb.png",
					"released": 1482940591,
					"credits": {
						"en": "res/rules/standard/sweet16-credits.html"
					},
					"gameOptions": {
						"preventRepeat": true,
						"uctTransposition": "state",
						"uctIgnoreLoop": false,
						"levelOptions": config_view_skins_preload_4
					},
					"obsolete": false,
					"js": modelScripts_49,
					"description": {
						"en": "res/rules/standard/sweet16-description.html"
					},
					"levels": config_model_levels_5
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/sweet16-600x600-3d.jpg",
							"res/visuals/sweet16-600x600-2d.jpg"
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
					"js": config_view_js_44,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_44
		},
		{
			"name": "tera-chess",
			"modelScripts": modelScripts_tera,
			"config": {
				"status": true,
				"model": {
					"title-en": "Terachess",
					"summary": {
						"en": "Chess on 16x16 with fairy pieces",
						"fr": "Échecs en 16x16 avec des pièces féeriques"
					},
					"rules": {
						"en": "res/rules/terachess/terachess-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/terachess/terachess-thumb.png",
					"released": 1497442763,
					"credits": {
						"en": "res/rules/terachess/terachess-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_tera,
					"description": {
						"en": "res/rules/terachess/terachess-description.html"
					},
					"levels": config_model_levels_15
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/terachess-600x600-3d.jpg",
							"res/visuals/terachess-600x600-2d.jpg"
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
								"smoothedfilegeo|0|/res/fairy/corporal/corporal.js",
								"image|/res/fairy/corporal/corporal-diffusemap.jpg",
								"image|/res/fairy/corporal/corporal-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/prince/prince.js",
								"image|/res/fairy/prince/prince-diffusemap.jpg",
								"image|/res/fairy/prince/prince-normalmap.jpg",
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
								"smoothedfilegeo|0|/res/fairy/star/star.js",
								"image|/res/fairy/star/star-diffusemap.jpg",
								"image|/res/fairy/star/star-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/bow/bow.js",
								"image|/res/fairy/bow/bow-diffusemap.jpg",
								"image|/res/fairy/bow/bow-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/rhino/rhino.js",
								"image|/res/fairy/rhino/rhino-diffusemap.jpg",
								"image|/res/fairy/rhino/rhino-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/bull/bull.js",
								"image|/res/fairy/bull/bull-diffusemap.jpg",
								"image|/res/fairy/bull/bull-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/antelope/antelope.js",
								"image|/res/fairy/antelope/antelope-diffusemap.jpg",
								"image|/res/fairy/antelope/antelope-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/lion/lion.js",
								"image|/res/fairy/lion/lion-diffusemap.jpg",
								"image|/res/fairy/lion/lion-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
								"image|/res/fairy/elephant/elephant-diffusemap.jpg",
								"image|/res/fairy/elephant/elephant-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
								"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
								"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/machine/machine.js",
								"image|/res/fairy/machine/machine-diffusemap.jpg",
								"image|/res/fairy/machine/machine-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/buffalo/buffalo.js",
								"image|/res/fairy/buffalo/buffalo-diffusemap.jpg",
								"image|/res/fairy/buffalo/buffalo-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/ship/ship.js",
								"image|/res/fairy/ship/ship-diffusemap.jpg",
								"image|/res/fairy/ship/ship-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/eagle/eagle.js",
								"image|/res/fairy/eagle/eagle-diffusemap.jpg",
								"image|/res/fairy/eagle/eagle-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/camel/camel.js",
								"image|/res/fairy/camel/camel-diffusemap.jpg",
								"image|/res/fairy/camel/camel-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/amazon/amazon.js",
								"image|/res/fairy/amazon/amazon-diffusemap.jpg",
								"image|/res/fairy/amazon/amazon-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/marshall/marshall.js",
								"image|/res/fairy/marshall/marshall-diffusemap.jpg",
								"image|/res/fairy/marshall/marshall-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/cardinal/cardinal.js",
								"image|/res/fairy/cardinal/cardinal-diffusemap.jpg",
								"image|/res/fairy/cardinal/cardinal-normalmap.jpg"
							],
							"world": config_view_skins_world,
							"camera": config_view_skins_camera
						},
						config_view_skins_9
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_tera,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_tera
		},
		{
			"name": "giga-chess",
			"modelScripts": modelScripts_giga,
			"config": {
				"status": true,
				"model": {
					"title-en": "Gigachess",
					"summary": {
						"en": "Chess on 14x14 with fairy pieces",
						"fr": "Échecs en 14x14 avec des pièces féeriques"
					},
					"rules": {
						"en": "res/rules/gigachess/gigachess-rules.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/gigachess/gigachess-thumb.png",
					"released": 1497771910,
					"credits": {
						"en": "res/rules/gigachess/gigachess-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_giga,
					"description": {
						"en": "res/rules/gigachess/gigachess-description.html"
					},
					"levels": config_model_levels_15
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/gigachess-600x600-3d.jpg",
							"res/visuals/gigachess-600x600-2d.jpg"
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
								"smoothedfilegeo|0|/res/fairy/corporal/corporal.js",
								"image|/res/fairy/corporal/corporal-diffusemap.jpg",
								"image|/res/fairy/corporal/corporal-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/prince/prince.js",
								"image|/res/fairy/prince/prince-diffusemap.jpg",
								"image|/res/fairy/prince/prince-normalmap.jpg",
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
								"smoothedfilegeo|0|/res/fairy/bow/bow.js",
								"image|/res/fairy/bow/bow-diffusemap.jpg",
								"image|/res/fairy/bow/bow-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/lion/lion.js",
								"image|/res/fairy/lion/lion-diffusemap.jpg",
								"image|/res/fairy/lion/lion-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
								"image|/res/fairy/elephant/elephant-diffusemap.jpg",
								"image|/res/fairy/elephant/elephant-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
								"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
								"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/machine/machine.js",
								"image|/res/fairy/machine/machine-diffusemap.jpg",
								"image|/res/fairy/machine/machine-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/buffalo/buffalo.js",
								"image|/res/fairy/buffalo/buffalo-diffusemap.jpg",
								"image|/res/fairy/buffalo/buffalo-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/ship/ship.js",
								"image|/res/fairy/ship/ship-diffusemap.jpg",
								"image|/res/fairy/ship/ship-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/eagle/eagle.js",
								"image|/res/fairy/eagle/eagle-diffusemap.jpg",
								"image|/res/fairy/eagle/eagle-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/camel/camel.js",
								"image|/res/fairy/camel/camel-diffusemap.jpg",
								"image|/res/fairy/camel/camel-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/amazon/amazon.js",
								"image|/res/fairy/amazon/amazon-diffusemap.jpg",
								"image|/res/fairy/amazon/amazon-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/marshall/marshall.js",
								"image|/res/fairy/marshall/marshall-diffusemap.jpg",
								"image|/res/fairy/marshall/marshall-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/cardinal/cardinal.js",
								"image|/res/fairy/cardinal/cardinal-diffusemap.jpg",
								"image|/res/fairy/cardinal/cardinal-normalmap.jpg"
							],
							"world": config_view_skins_world,
							"camera": config_view_skins_camera
						},
						config_view_skins_9
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_giga,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_giga
		},
		{
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
		{	  		
			"name": "fantasticXIII-chess",
			"modelScripts": modelScripts_fantasticXIII,
			"config": {
				"status": true,
				"model": {
					"title-en": "Fantastic XIII",
					"summary": {
						"en": "Chess on 13x13 with fairy pieces",
						"fr": "Échecs en 13x13 avec des pièces féeriques"
					},
					"rules": {
						"en": "res/rules/fantasticXIII/fantasticXIII-rules.html",
						"fr": "res/rules/fantasticXIII/fantasticXIII-rules-fr.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/fantasticXIII/fantasticXIII-thumb.png",
					"released": 1497771910,
					"credits": {
						"en": "res/rules/fantasticXIII/fantasticXIII-credits.html"
					},
					"gameOptions": config_model_gameOptions,

					"obsolete": false,
					"js": modelScripts_fantasticXIII,
					"description": {
						"en": "res/rules/fantasticXIII/fantasticXIII-description.html",
						"fr": "res/rules/fantasticXIII/fantasticXIII-description-fr.html"
					},
					"levels": config_model_levels_15
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/fantasticXIII-600x600-3d.jpg",
							"res/visuals/fantasticXIII-600x600-2d.jpg"
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
								"smoothedfilegeo|0|/res/fairy/king/king.js",
								"image|/res/fairy/king/king-diffusemap.jpg",
								"image|/res/fairy/king/king-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/mamoth/mamoth.js",
 								"image|/res/fairy/mamoth/mamoth-diffusemap.jpg",
 								"image|/res/fairy/mamoth/mamoth-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/squirrel/squirrel.js",
 								"image|/res/fairy/squirrel/squirrel-diffusemap.jpg",
 								"image|/res/fairy/squirrel/squirrel-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/griffon/griffon.js",
 								"image|/res/fairy/griffon/griffon-diffusemap.jpg",
 								"image|/res/fairy/griffon/griffon-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/axe/axe.js",
 								"image|/res/fairy/axe/axe-diffusemap.jpg",
 								"image|/res/fairy/axe/axe-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/hawk/hawk.js",
 								"image|/res/fairy/hawk/hawk-diffusemap.jpg",
 								"image|/res/fairy/hawk/hawk-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/ship/ship.js",
 								"image|/res/fairy/ship/ship-diffusemap.jpg",
 								"image|/res/fairy/ship/ship-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/dragon/dragon.js",
 								"image|/res/fairy/dragon/dragon-diffusemap.jpg",
 								"image|/res/fairy/dragon/dragon-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/leopard/leopard.js",
 								"image|/res/fairy/leopard/leopard-diffusemap.jpg",
 								"image|/res/fairy/leopard/leopard-normalmap.jpg"	
							],
							"world": config_view_skins_world,
							"camera": config_view_skins_camera
						},
						config_view_skins_9
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_fantasticXIII,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_fantasticXIII
		},
		{
			"name": "bigorra-chess",
			"modelScripts": modelScripts_bigorra,
			"config": {
				"status": true,
				"model": {
					"title-en": "Bigorra",

					"summary": {
						"en": "FantasticXIII + Gigachess II - 16x16",
						"fr": "FantasticXIII + Gigachess II — 16x16"
					},
					"rules": {
						"en": "res/rules/fantasticXIII/bigorra-rules.html",
                        			"fr": "res/rules/fantasticXIII/bigorra-rules-fr.html"
					},
					"module": "chessbase",
					"plazza": "true",

					"thumbnail": "res/rules/fantasticXIII/bigorra-thumb.png",
					"released": 1497771910,
					"credits": {
						"en": "res/rules/fantasticXIII/fantasticXIII-credits.html"
					},

					"gameOptions": config_model_gameOptions,

					"obsolete": false,
					"js": modelScripts_bigorra,
					"description": {
						"en": "res/rules/fantasticXIII/bigorra-description.html",
						"fr": "res/rules/fantasticXIII/bigorra-description-fr.html"

					},
					"levels": config_model_levels_15
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {

						"600x600": [
							"res/visuals/bigorra-600x600-3d.jpg",
							"res/visuals/bigorra-600x600-2d.jpg"
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
								"smoothedfilegeo|0|/res/fairy/king/king.js",
								"image|/res/fairy/king/king-diffusemap.jpg",
								"image|/res/fairy/king/king-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/prince/prince.js",
								"image|/res/fairy/prince/prince-diffusemap.jpg",
								"image|/res/fairy/prince/prince-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/mamoth/elephant.js",
 								"image|/res/fairy/mamoth/mamoth-diffusemap.jpg",
 								"image|/res/fairy/mamoth/mamoth-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/squirrel/squirrel.js",
 								"image|/res/fairy/squirrel/squirrel-diffusemap.jpg",
 								"image|/res/fairy/squirrel/squirrel-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/griffon/griffon.js",
 								"image|/res/fairy/griffon/griffon-diffusemap.jpg",
 								"image|/res/fairy/griffon/griffon-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/axe/axe.js",
 								"image|/res/fairy/axe/axe-diffusemap.jpg",
 								"image|/res/fairy/axe/axe-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/hawk/hawk.js",
 								"image|/res/fairy/hawk/hawk-diffusemap.jpg",
 								"image|/res/fairy/hawk/hawk-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/knight/knight.js",
								"image|/res/fairy/knight/knight-diffusemap.jpg",
								"image|/res/fairy/knight/knight-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/bishop/bishop.js",
								"image|/res/fairy/bishop/bishop-diffusemap.jpg",
								"image|/res/fairy/bishop/bishop-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/queen/queen.js",
								"image|/res/fairy/queen/queen-diffusemap.jpg",
								"image|/res/fairy/queen/queen-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/rook/rook.js",
								"image|/res/fairy/rook/rook-diffusemap.jpg",
								"image|/res/fairy/rook/rook-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
								"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
								"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
								"image|/res/fairy/elephant/elephant-diffusemap.jpg",
								"image|/res/fairy/elephant/elephant-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/prince/prince.js",
								"image|/res/fairy/prince/prince-diffusemap.jpg",
								"image|/res/fairy/prince/prince-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/camel/camel.js",
								"image|/res/fairy/camel/camel-diffusemap.jpg",
								"image|/res/fairy/camel/camel-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/lion/lion.js",
								"image|/res/fairy/lion/lion-diffusemap.jpg",
								"image|/res/fairy/lion/lion-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/bow/bow.js",
								"image|/res/fairy/bow/bow-diffusemap.jpg",
								"image|/res/fairy/bow/bow-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/machine/machine.js",
								"image|/res/fairy/machine/machine-diffusemap.jpg",
								"image|/res/fairy/machine/machine-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/buffalo/buffalo.js",
								"image|/res/fairy/buffalo/buffalo-diffusemap.jpg",
								"image|/res/fairy/buffalo/buffalo-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/rhino/rhino.js",
								"image|/res/fairy/rhino/rhino-diffusemap.jpg",
								"image|/res/fairy/rhino/rhino-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/giraffe/giraffe.js",
								"image|/res/fairy/giraffe/giraffe-diffuse-map.jpg",
								"image|/res/fairy/giraffe/giraffe-normal-map.jpg",
								"smoothedfilegeo|0|/res/fairy/ship/ship.js",
 								"image|/res/fairy/ship/ship-diffusemap.jpg",
 								"image|/res/fairy/ship/ship-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/dragon/dragon.js",
 								"image|/res/fairy/dragon/dragon-diffusemap.jpg",
 								"image|/res/fairy/dragon/dragon-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/leopard/leopard.js",
 								"image|/res/fairy/leopard/leopard-diffusemap.jpg",
 								"image|/res/fairy/leopard/leopard-normalmap.jpg"	
							],
							"world": config_view_skins_world,

							"camera": config_view_skins_camera
						},
						config_view_skins_9
					],
					"animateSelfMoves": false,
					"switchable": true,

					"sounds": config_view_sounds,
					"js": config_view_js_bigorra,
					"useAutoComplete": true
				}
			},

			"viewScripts": config_view_js_bigorra
		},
		{
 			"name": "wild-tamerlane-chess",
 			"modelScripts": modelScripts_wtamerlane,
 			"config": {
 				"status": true,
 				"model": {
 					"title-en": "Wild Tamerlane",
 					"summary": {
 						"en": "Chess on 11x11 with fairy pieces",
 						"fr": "Échecs en 11x11 avec des pièces féeriques"
 					},
 					"rules": {
 						"en": "res/rules/wildtamerlane/wild-tamerlane-rules.html"
 					},
 					"module": "chessbase",
 					"plazza": "true",
 					"thumbnail": "res/rules/wildtamerlane/wild-tamerlane-thumb.png",
 					"released": 1497874349,
 					"credits": {
 						"en": "res/rules/wildtamerlane/wild-tamerlane-credits.html"
 					},
 					"gameOptions": config_model_gameOptions,
 					"obsolete": false,
 					"js": modelScripts_wtamerlane,
 					"description": {
 						"en": "res/rules/wildtamerlane/wild-tamerlane-description.html"
 					},
 					"levels": config_model_levels_15
 				},
 				"view": {
 					"title-en": "Wild Tamerlane view",
 					"visuals": {
 						"600x600": [
 							"res/visuals/wild-tamerlane-600x600-3d.jpg",
 							"res/visuals/wild-tamerlane-600x600-2d.jpg"
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
 								"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
 								"image|/res/fairy/elephant/elephant-diffusemap.jpg",
 								"image|/res/fairy/elephant/elephant-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
 								"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
 								"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/eagle/eagle.js",
 								"image|/res/fairy/eagle/eagle-diffusemap.jpg",
 								"image|/res/fairy/eagle/eagle-normalmap.jpg",
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
 					"js": config_view_js_wtamerlane,
 					"useAutoComplete": true
 				}
 			},
 			"viewScripts": config_view_js_wtamerlane
  		},
		{
 			"name": "pemba-chess",
 			"modelScripts": modelScripts_pemba,
 			"config": {
 				"status": true,
 				"model": {
 					"title-en": "Pemba",
 					"summary": {
 						"en": "Extended Shako on 10x10 with fairy pieces",
 						"fr": "Shako étendu en 10x10 avec des pièces féeriques"
 					},
 					"rules": {
 						"en": "res/rules/shako/pemba-rules.html",
						"fr": "res/rules/shako/pemba-rules-fr.html"
 					},
 					"module": "chessbase",
 					"plazza": "true",
 					"thumbnail": "res/rules/shako/pemba-thumb.png",
 					"released": 1497874349,
 					"credits": {
 						"en": "res/rules/shako/pemba-credits.html"
 					},
 					"gameOptions": config_model_gameOptions,
 					"obsolete": false,
 					"js": modelScripts_pemba,
 					"description": {
 						"en": "res/rules/shako/pemba-description.html",
						"fr": "res/rules/shako/pemba-description-fr.html"
 					},
 					"levels": config_model_levels_15_pemba_expert
 				},
 				"view": {
 					"title-en": "pemba view",
 					"visuals": {
 						"600x600": [
 							"res/visuals/pemba-600x600-3d.jpg",
 							"res/visuals/pemba-600x600-2d.jpg"
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
 								"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
 								"image|/res/fairy/elephant/elephant-diffusemap.jpg",
 								"image|/res/fairy/elephant/elephant-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
 								"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
 								"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/bow/bow.js",
								"image|/res/fairy/bow/bow-diffusemap.jpg",
								"image|/res/fairy/bow/bow-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/camel/camel.js",
 								"image|/res/fairy/camel/camel-diffusemap.jpg",
 								"image|/res/fairy/camel/camel-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/giraffe/giraffe.js",
 								"image|/res/fairy/giraffe/giraffe-diffuse-map.jpg",
 								"image|/res/fairy/giraffe/giraffe-normal-map.jpg"							      
 							],
 							"world": config_view_skins_world,
 							"camera": config_view_skins_camera
 						},
 						config_view_skins_9
 					],
 					"animateSelfMoves": false,
 					"switchable": true,
 					"sounds": config_view_sounds,
 					"js": config_view_js_pemba,
 					"useAutoComplete": true
 				}
 			},
 			"viewScripts": config_view_js_pemba
  		}	,	  		
		{
			"name": "giga-chessII",
			"modelScripts": modelScripts_gigaII,
			"config": {
				"status": true,
				"model": {
					"title-en": "Gigachess II",
					"summary": {
						"en": "Chess on 14x14 with fairy pieces",
						"fr": "Échecs en 14x14 avec des pièces féeriques"
					},
					"rules": {
						"en": "res/rules/gigachess/gigachessII-rules.html",
                        			"fr": "res/rules/gigachess/gigachessII-rules_fr.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/gigachess/gigachessII-thumb.png",
					"released": 1497771910,
					"credits": {
						"en": "res/rules/gigachess/gigachessII-credits.html"
					},
					"gameOptions": config_model_gameOptions,

					"obsolete": false,
					"js": modelScripts_gigaII,
					"description": {
						"en": "res/rules/gigachess/gigachessII-description.html"
					},
					"levels": config_model_levels_15
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/gigachessII-600x600-3d.jpg",
							"res/visuals/gigachessII-600x600-2d.jpg"
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
								"smoothedfilegeo|0|/res/fairy/prince/prince.js",
								"image|/res/fairy/prince/prince-diffusemap.jpg",
								"image|/res/fairy/prince/prince-normalmap.jpg",
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
								"smoothedfilegeo|0|/res/fairy/bow/bow.js",
								"image|/res/fairy/bow/bow-diffusemap.jpg",
								"image|/res/fairy/bow/bow-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/lion/lion.js",
								"image|/res/fairy/lion/lion-diffusemap.jpg",
								"image|/res/fairy/lion/lion-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
								"image|/res/fairy/elephant/elephant-diffusemap.jpg",
								"image|/res/fairy/elephant/elephant-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
								"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
								"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/machine/machine.js",
								"image|/res/fairy/machine/machine-diffusemap.jpg",
								"image|/res/fairy/machine/machine-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/buffalo/buffalo.js",
								"image|/res/fairy/buffalo/buffalo-diffusemap.jpg",
								"image|/res/fairy/buffalo/buffalo-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/eagle/eagle.js",
								"image|/res/fairy/eagle/eagle-diffusemap.jpg",
								"image|/res/fairy/eagle/eagle-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/camel/camel.js",
								"image|/res/fairy/camel/camel-diffusemap.jpg",
								"image|/res/fairy/camel/camel-normalmap.jpg",
	                            "smoothedfilegeo|0|/res/fairy/star/star.js",
								"image|/res/fairy/star/star-diffusemap.jpg",
								"image|/res/fairy/star/star-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/rhino/rhino.js",
								"image|/res/fairy/rhino/rhino-diffusemap.jpg",
								"image|/res/fairy/rhino/rhino-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/giraffe/giraffe.js",
								"image|/res/fairy/giraffe/giraffe-diffuse-map.jpg",
								"image|/res/fairy/giraffe/giraffe-normal-map.jpg",
								"smoothedfilegeo|0|/res/fairy/amazon/amazon.js",
								"image|/res/fairy/amazon/amazon-diffusemap.jpg",
								"image|/res/fairy/amazon/amazon-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/marshall/marshall.js",
								"image|/res/fairy/marshall/marshall-diffusemap.jpg",
								"image|/res/fairy/marshall/marshall-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/cardinal/cardinal.js",
								"image|/res/fairy/cardinal/cardinal-diffusemap.jpg",
								"image|/res/fairy/cardinal/cardinal-normalmap.jpg"
							],
							"world": config_view_skins_world,
							"camera": config_view_skins_camera
						},
						config_view_skins_9
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_gigaII,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_gigaII
		},
		{
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
		{
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
		{
			"name": "zanzibar-s-chess",
			"modelScripts": modelScripts_zanzibars,
			"config": {
				"status": true,
				"model": {
					"title-en": "Zanzibar S",
					"summary": {
						"en": "Extended Metamachy - 12x12",
						"fr": "Metamachie étendu — 12x12"
					},
					"rules": {
						"en": "res/rules/metamachy/zanzibar-s-rules.html",
						"fr": "res/rules/metamachy/zanzibar-s-rules_fr.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/metamachy/zanzibar-s-thumb.png",
					"released": 1402412178,
					"credits": {
						"en": "res/rules/metamachy/zanzibar-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"obsolete": false,
					"js": modelScripts_zanzibars,
					"description": {
						"en": "res/rules/metamachy/zanzibar-description.html"
					},
					"levels": config_model_levels_15
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/zanzibar-600x600-3d.jpg",
							"res/visuals/zanzibar-600x600-2d.jpg"
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
								"smoothedfilegeo|0|/res/fairy/prince/prince.js",
								"image|/res/fairy/prince/prince-diffusemap.jpg",
								"image|/res/fairy/prince/prince-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/camel/camel.js",
								"image|/res/fairy/camel/camel-diffusemap.jpg",
								"image|/res/fairy/camel/camel-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/lion/lion.js",
								"image|/res/fairy/lion/lion-diffusemap.jpg",
								"image|/res/fairy/lion/lion-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/bow/bow.js",
								"image|/res/fairy/bow/bow-diffusemap.jpg",
								"image|/res/fairy/bow/bow-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/machine/machine.js",
								"image|/res/fairy/machine/machine-diffusemap.jpg",
								"image|/res/fairy/machine/machine-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/buffalo/buffalo.js",
								"image|/res/fairy/buffalo/buffalo-diffusemap.jpg",
								"image|/res/fairy/buffalo/buffalo-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/rhino/rhino.js",
								"image|/res/fairy/rhino/rhino-diffusemap.jpg",
								"image|/res/fairy/rhino/rhino-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/giraffe/giraffe.js",
								"image|/res/fairy/giraffe/giraffe-diffuse-map.jpg",
								"image|/res/fairy/giraffe/giraffe-normal-map.jpg",
								"smoothedfilegeo|0|/res/fairy/eagle/eagle.js",
								"image|/res/fairy/eagle/eagle-diffusemap.jpg",
								"image|/res/fairy/eagle/eagle-normalmap.jpg"
							],
							"world": config_view_skins_world,
							"camera": config_view_skins_camera
						},
						config_view_skins_9
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_zanzibars,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_zanzibars
		},
		{
			"name": "team-mate-chess",
			"modelScripts": modelScripts_100,
			"config": {
				"status": true,
				"model": {
					"title-en": "Team-Mate Chess",
					"summary": {
						"en": "8x8 variant with many different pieces",
						"fr": "Variante 8x8 aux pièces très variées"
					},
					"rules": {
						"en": "res/rules/team-mate/team-mate-rules.html",
						"fr": "res/rules/team-mate/team-mate-rules_fr.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/team-mate/team-mate-thumb.png",
					"released": 1396536978,
					"credits": {
						"en": "res/rules/team-mate/team-mate-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"js": modelScripts_100,
					"description": {
						"en": "res/rules/team-mate/team-mate-description.html"
					},
					"levels": config_model_levels_15
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/team-mate-600x600-3d.jpg",
							"res/visuals/team-mate-600x600-2d.jpg"
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
					"js": config_view_js_100,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_100
		},
		{
			"name": "ultima",
			"modelScripts": modelScripts_ultima,
			"config": {
				"status": true,
				"model": {
					"title-en": "Ultima",
					"summary": {
						"en":"Each piece has its own exotic way of capturing.",
						"fr":"Chaque pièce capture d’une manière exotique."
					},
					"rules": {
						"en": "res/rules/ultima/ultima-rules.html",
                        "fr": "res/rules/ultima/ultima-rules_fr.html"
					},
					"module": "chessbase",
                    "thumbnail": "res/rules/ultima/ultima-thumb.png",
					"gameOptions": config_model_gameOptions,
					"js": modelScripts_ultima,
					"levels": config_model_levels_15
				},
				"view": {
					"title-en": "Chessbase view",
					"xdView": true,
					"css": config_view_css,
					"preferredRatio": 1,
					"useShowMoves": true,
					"useNotation": true,
					"module": "chessbase",
					"defaultOptions": config_view_defaultOptions,
					"skins": [
						config_view_skins_2
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_ultima,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_ultima
		},
		{
			"name": "rococo",
			"modelScripts": modelScripts_rococo,
			"config": {
				"status": true,
				"preventRepeat": true,
				"model": {
					"title-en": "Rococo",
					"summary": {
						"en":"an Ultima cousin on a 10x10 board with an edge ring",
						"fr": "Un cousin de Ultima sur un tablier couronné de 10x10"
					},
					"rules": {
						"en": "res/rules/rococo/rococo-rules.html",
						"fr": "res/rules/rococo/rococo-rules_fr.html"
					},
					"rules": {
						"en": "res/rules/rococo/rococo-rules.html",
						"fr": "res/rules/rococo/rococo-rules_fr.html"
					},
					"module": "chessbase",
					"thumbnail": "res/rules/rococo/rococo-thumb.png",
					"gameOptions": config_model_gameOptions,
					"js": modelScripts_rococo,
					"levels": config_model_levels_15
				},
				"view": {
					"title-en": "Chessbase view",
					"xdView": true,
					"css": config_view_css,
					"preferredRatio": 1,
					"useShowMoves": true,
					"useNotation": true,
					"module": "chessbase",
					"defaultOptions": config_view_defaultOptions,
					"skins": [
						config_view_skins_2
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_rococo,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_rococo
		},
		{
			"name": "rocaille",
			"modelScripts": modelScripts_rocaille,
			"config": {
				"status": true,
				"preventRepeat": true,
				"model": {
					"title-en": "Rocaille",
					"summary": {
						"en": "a quieter Rococo: a 12x10 field inside an edge ring, and check binds",
						"fr": "Un Rococo apaisé sur tablier couronné de 12x10"
					},
					"rules": {
						"en": "res/rules/rocaille/rocaille-rules.html",
						"fr": "res/rules/rocaille/rocaille-rules_fr.html"
					},
					"module": "chessbase",
					"thumbnail": "res/rules/rocaille/rocaille-thumb.png",
					"gameOptions": config_model_gameOptions,
					"js": modelScripts_rocaille,
					"levels": config_model_levels_15
				},
				"view": {
					"title-en": "Chessbase view",
					"xdView": true,
					"css": config_view_css,
					"preferredRatio": 1.2,
					"useShowMoves": true,
					"useNotation": true,
					"module": "chessbase",
					"defaultOptions": config_view_defaultOptions,
					"skins": [
						config_view_skins_2
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_rocaille,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_rocaille
		},
		{
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
		{
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
		famous["spartan-chess"],
		{
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
		{
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
		{
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
		{
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
		{
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
		{
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
		{
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
		{
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
		{
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
	/*	{
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
		},*/
		{
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
		{
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
		{
			"name": "acedrex-chess",
			"modelScripts": modelScripts_acedrex,
			"config": {
				"status": true,
				"model": {
					"title-en": "Grant acedrex",
					"summary": {
						"en": "Medieval Castillan chess variant",
						"fr": "Variante d’échecs médiévale de Castille"
					},
					"rules": {
						"en": "res/rules/historical/grant-acedrex-rules.html",
						"fr": "res/rules/historical/grant-acedrex-rules_fr.html"
					},
					"module": "chessbase",
					"plazza": "true",
					"thumbnail": "res/rules/historical/grant-acedrex-thumb.png",
					"released": 1394466978,
					"credits": {
						"en": "res/rules/historical/grant-acedrex-credits.html"
					},
					"gameOptions": config_model_gameOptions,
					"js": modelScripts_acedrex,
					"description": {
						"en": "res/rules/historical/grant-acedrex-description.html"
					},
					"levels": config_model_levels_15
				},
				"view": {
					"title-en": "Chessbase view",
					"visuals": {
						"600x600": [
							"res/visuals/grant-acedrex-600x600-3d.jpg",
							"res/visuals/grant-acedrex-600x600-2d.jpg"
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
								"image|/res/images/wikipedia.png",
								"smoothedfilegeo|0|/res/fairy/pawn/pawn.js",
								"image|/res/fairy/pawn/pawn-diffusemap.jpg",
								"image|/res/fairy/pawn/pawn-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/griffon/griffon.js",
 								"image|/res/fairy/griffon/griffon-diffusemap.jpg",
 								"image|/res/fairy/griffon/griffon-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/bishop/bishop.js",
								"image|/res/fairy/bishop/bishop-diffusemap.jpg",
								"image|/res/fairy/bishop/bishop-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/lion/lion.js",
								"image|/res/fairy/lion/lion-diffusemap.jpg",
								"image|/res/fairy/lion/lion-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/king/king.js",
								"image|/res/fairy/king/king-diffusemap.jpg",
								"image|/res/fairy/king/king-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/rook/rook.js",
								"image|/res/fairy/rook/rook-diffusemap.jpg",
								"image|/res/fairy/rook/rook-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/rhino/rhino.js",
								"image|/res/fairy/rhino/rhino-diffusemap.jpg",
								"image|/res/fairy/rhino/rhino-normalmap.jpg",
								"smoothedfilegeo|0|/res/fairy/giraffe/giraffe.js",
								"image|/res/fairy/giraffe/giraffe-diffuse-map.jpg",
								"image|/res/fairy/giraffe/giraffe-normal-map.jpg",
							],
							"world": config_view_skins_world,
							"camera": config_view_skins_camera
						},
						config_view_skins_9
					],
					"animateSelfMoves": false,
					"switchable": true,
					"sounds": config_view_sounds,
					"js": config_view_js_acedrex,
					"useAutoComplete": true
				}
			},
			"viewScripts": config_view_js_acedrex
		}
	  		

	]
})()
