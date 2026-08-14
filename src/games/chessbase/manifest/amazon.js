/*
 * Variants featuring the Amazon, the piece combining Queen and Knight:
 * Amazon chess, Gustav III and Tutti Frutti. Model and view scripts live in
 * amazon/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_model_levels_5_amazon_expert,
	config_model_levels_5_gustav3_expert, config_model_levels_5_tuttifrutti_expert,
	config_view_css, config_view_defaultOptions, config_view_skins_world,
	config_view_skins_camera, config_view_sounds, config_view_skins_9, modelScripts_41,
	config_view_js_37, modelScripts_43, config_view_js_39, modelScripts_48, config_view_js_43
} = require("./shared.js");

exports.games = {

	"amazon-chess": {
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

	"gustav3-chess": {
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

	"tutti-frutti-chess": {
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

};
