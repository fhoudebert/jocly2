/*
 * Boards that wrap around: Circular chess, Byzantine chess and Cylinder
 * chess. Model and view scripts live in circular/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_model_levels_5, config_view_css,
	config_view_defaultOptions, config_view_skins_world_skyLightPosition, config_view_skins_world,
	config_view_sounds, config_view_skins_world_3, config_model_gameOptions_3,
	config_view_skins_preload_4, config_view_skins_camera_targetBounds, config_view_skins_5,
	config_view_skins_7, config_view_skins_preload_8, modelScripts_22, config_view_css_3,
	config_view_skins_camera_4, config_view_js_22, modelScripts_23, config_view_js_23,
	modelScripts_25, config_view_skins_camera_target, config_view_js_25
} = require("./shared.js");

exports.games = {

	"circular-chess": {
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

	"byzantine-chess": {
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

	"cylinder-chess": {
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

};
