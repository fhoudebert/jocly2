/*
 * The 8x10 boards carrying a knighted piece: Modern chess and Chancellor
 * chess. Model and view scripts live in knighted/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_model_levels_5,
	config_model_levels_5_chancellor_expert, config_view_css, config_view_defaultOptions,
	config_view_skins_world, config_view_skins_camera, config_view_sounds, config_view_skins_9,
	config_view_skins_13, modelScripts_35, config_view_js_32, modelScripts_36
} = require("./shared.js");

exports.games = {

	"modern-chess": {
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

	"chancellor-chess": {
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

};
