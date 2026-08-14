/*
 * The two games that share no family: Smess, played on its own arrowed board,
 * and Team-Mate chess. Their model and view scripts sit at the root of the
 * module rather than in a sub-directory of their own.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_model_levels_5, config_view_css,
	config_view_defaultOptions, config_view_skins_world, config_view_skins_camera,
	config_view_sounds, config_view_skins_2, modelScripts_100, config_model_levels_15,
	config_view_js_100, modelScripts_38, config_view_js_34
} = require("./shared.js");

exports.games = {

	"smess": {
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

	"team-mate-chess": {
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

};
