/*
 * Capablanca chess, whose prelude lets the player pick between the
 * Capablanca, Gothic, Embassy and Janus setups on the same 10x8 board. Model
 * and view scripts live in capa10x8/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_model_levels_5_capablanca_expert,
	config_view_css, config_view_defaultOptions, config_view_sounds, modelScripts_capablanca,
	config_view_skins_11, config_view_js_capablanca
} = require("./shared.js");

exports.games = {

	"capablanca-chess": {
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

};
