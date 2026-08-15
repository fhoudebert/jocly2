/*
 * The three-dimensional boards: Raumschach, 3D chess, Space Spartan and
 * Cubic chess. Model and view scripts live in 3d/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_model_levels_5, config_view_css,
	config_view_defaultOptions, config_view_skins_preload, config_view_skins_world_lightPosition,
	config_view_skins_world_skyLightPosition, config_view_sounds, config_model_levels_10,
	config_model_levels_15, config_model_credits, config_view_skins_preload_4,
	config_view_skins_4, config_view_skins_camera_targetBounds, config_view_skins_5,
	config_view_skins_camera_target
} = require("./shared.js");

// declarations only this family uses, lifted out of shared.js
var modelScripts_16 = [
	"base-model.js",
	"multiplan-geo-model.js",
	"3d/raumschach-model.js"
]

var config_view_js_16 = [
	"base-view.js",
	"multiplan-board-view.js",
	"fairy-set-view.js",
	"3d/raumschach-view.js"
]

var modelScripts_24 = [
	"base-model.js",
	"multiplan-geo-model.js",
	"3d/3dchess-model.js"
]

var modelScripts_space_spartan = [
	"base-model.js",
	"multiplan-geo-model.js",
	"3d/space-spartan-model.js"
]

var config_view_js_space_spartan = [
	"base-view.js",
	"multiplan-board-view.js",
	"fairy-set-view.js",
	"3d/space-spartan-view.js"
]

var config_view_js_24 = [
	"base-view.js",
	"multiplan-board-view.js",
	"staunton-set-view.js",
	"3d/3dchess-view.js"
]

var modelScripts_26 = [
	"base-model.js",
	"cubic-geo-model.js",
	"3d/cubic-model.js"
]

var config_view_js_26 = [
	"base-view.js",
	"cubic-board-view.js",
	"staunton-set-view.js",
	"3d/cubic-view.js"
]

exports.games = {

	"raumschach": {
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

	"3dchess": {
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

	"space-spartan": {
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

	"cubic-chess": {
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

};
