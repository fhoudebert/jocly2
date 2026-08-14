/*
 * Reconstructions of historical games: Courier chess, the Duke of Rutland's
 * chess and Acedrex. Model and view scripts live in historical/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_model_levels_5,
	config_model_levels_courier_expert, config_view_css, config_view_defaultOptions,
	config_view_skins_world, config_view_skins_camera, config_view_sounds,
	config_model_gameOptions_2, config_model_levels_10, config_model_levels_15, config_view_skins_9
} = require("./shared.js");

// declarations only this family uses, lifted out of shared.js
var modelScripts_11 = [
	"base-model.js",
	"grid-geo-model.js",
	"historical/courier-model.js"
]

var config_model_levels_10_courier_expert = config_model_levels_10.concat([config_model_levels_courier_expert]);

var config_view_js_11 = [
	"base-view.js",
	"grid-board-view.js",
	"historical/courier-board-view.js",
	"historical/courierchess-set-view.js",
	"historical/courier-view.js"
]

var modelScripts_42 = [
	"base-model.js",
	"grid-geo-model.js",
	"historical/dukerutland-model.js"
]

var config_view_js_38 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"historical/dukerutland-view.js"
]

var modelScripts_acedrex = [
	"base-model.js",
	"grid-geo-model.js",
	"historical/grant-acedrex-model.js"
]

var config_view_js_acedrex = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"historical/grant-acedrex-view.js"
]

exports.games = {

	"courier-chess": {
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

	"dukerutland-chess": {
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

	"acedrex-chess": {
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
	},

};
