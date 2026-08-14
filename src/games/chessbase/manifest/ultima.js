/*
 * Ultima and its descendants, where pieces capture by approach, withdrawal
 * or immobilisation rather than by displacement: Ultima itself, Rococo and
 * Rocaille. Model and view scripts live in ultima/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_view_css, config_view_defaultOptions,
	config_view_sounds, config_view_skins_2, config_model_levels_15
} = require("./shared.js");

// declarations only this family uses, lifted out of shared.js
var modelScripts_rococo = [
	"base-model.js",
	"grid-geo-model.js",
	"ultima/baroque-core.js",
	"ultima/rococo-model.js"
]

var config_view_js_rococo = [
	"base-view.js",
	"grid-board-view.js",
	"ultima/baroque-view.js",
	"ultima/rococo-view.js",
	"ultima/baroque-choice-view.js",
	"ultima/baroque-capture-view.js"
]

var modelScripts_rocaille = [
	"base-model.js",
	"grid-geo-model.js",
	"ultima/baroque-core.js",
	"ultima/rocaille-model.js"
]

var config_view_js_rocaille = [
	"base-view.js",
	"grid-board-view.js",
	"ultima/baroque-view.js",
	"ultima/rocaille-view.js",
	"ultima/baroque-choice-view.js",
	"ultima/baroque-capture-view.js"
]

var modelScripts_ultima = [
	"base-model.js",
	"grid-geo-model.js",
	"ultima/ultima-model.js"
]

var config_view_js_ultima = [
	"base-view.js",
	"grid-board-view.js",
	"ultima/baroque-view.js",
	"ultima/ultima-view.js",
	"ultima/baroque-choice-view.js",
	"ultima/baroque-capture-view.js"
]

exports.games = {

	"ultima": {
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

	"rococo": {
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

	"rocaille": {
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

};
