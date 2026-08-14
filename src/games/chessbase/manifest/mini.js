/*
 * The small boards: Gardner and Baby chess, the 4x4, 4x5 and Micro variants,
 * Malett, Los Alamos and Attack chess. Model and view scripts live in mini/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_levels_5, config_model_levels_gardner_expert,
	config_model_levels_losalamos_expert, config_model_levels_mini4x4_expert,
	config_model_levels_mini4x5_expert, config_model_levels_micro4x5_expert,
	config_model_levels_baby_expert, config_model_levels_malett_expert,
	config_model_levels_attack_expert, config_view_css, config_view_defaultOptions,
	config_view_sounds, config_model_gameOptions_2, config_view_skins_3
} = require("./shared.js");

// declarations only this family uses, lifted out of shared.js
// --- Mini-chess family (mini/*.js): none of these boards/setups match
// a native Fairy-Stockfish variant, so each gets a customVariantIni.
// Derived from "chess" (not "gardner", whose gardner_variant() hardcodes
// doubleStep=false/castling=false) whenever the Jocly model actually
// uses cbInitialPawnGraph (double-step) and/or a "castle" table, so the
// inherited defaults already match; maxRank/maxFile/promotionRegion are
// still overridden explicitly since Variant::conclude() bakes them in
// relative to the *base* variant's own board size, not the derived one
// (verified directly: omitting promotionRegionWhite/Black here reproduces
// gardner's own Rank5BB default unchanged, which falls outside a 4-rank
// board and silently disables promotion altogether).
var config_model_levels_5_gardner_expert = config_model_levels_5.concat([config_model_levels_gardner_expert]);

var config_model_levels_5_losalamos_expert = config_model_levels_5.concat([config_model_levels_losalamos_expert]);

var config_model_levels_5_mini4x4_expert = config_model_levels_5.concat([config_model_levels_mini4x4_expert]);

var config_model_levels_5_mini4x5_expert = config_model_levels_5.concat([config_model_levels_mini4x5_expert]);

var config_model_levels_5_micro4x5_expert = config_model_levels_5.concat([config_model_levels_micro4x5_expert]);

var config_model_levels_5_baby_expert = config_model_levels_5.concat([config_model_levels_baby_expert]);

var config_model_levels_5_malett_expert = config_model_levels_5.concat([config_model_levels_malett_expert]);

var config_model_levels_5_attack_expert = config_model_levels_5.concat([config_model_levels_attack_expert]);

var modelScripts_3 = [
	"base-model.js",
	"grid-geo-model.js",
	"mini/gardner-model.js"
]

var config_view_js_3 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"mini/gardner-view.js"
]

var modelScripts_4 = [
	"base-model.js",
	"grid-geo-model.js",
	"mini/mini4x4-model.js"
]

var config_view_js_4 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"mini/mini4x4-view.js"
]

var modelScripts_5 = [
	"base-model.js",
	"grid-geo-model.js",
	"mini/mini4x5-model.js"
]

var config_view_js_5 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"mini/mini4x5-view.js"
]

var modelScripts_6 = [
	"base-model.js",
	"grid-geo-model.js",
	"mini/micro4x5-model.js"
]

var config_view_js_6 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"mini/micro4x5-view.js"
]

var modelScripts_7 = [
	"base-model.js",
	"grid-geo-model.js",
	"mini/baby-model.js"
]

var config_view_js_7 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"mini/baby-view.js"
]

var modelScripts_8 = [
	"base-model.js",
	"grid-geo-model.js",
	"mini/malett-model.js"
]

var config_view_js_8 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"mini/malett-view.js"
]

var modelScripts_9 = [
	"base-model.js",
	"grid-geo-model.js",
	"mini/los-alamos-model.js"
]

var config_view_js_9 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"mini/los-alamos-view.js"
]

var modelScripts_10 = [
	"base-model.js",
	"grid-geo-model.js",
	"mini/attack-model.js"
]

var config_view_js_10 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"mini/attack-view.js"
]

exports.games = {

	"gardner-chess": {
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

	"mini4x4-chess": {
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

	"mini4x5-chess": {
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

	"micro4x5-chess": {
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

	"baby-chess": {
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

	"malett-chess": {
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

	"los-alamos-chess": {
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

	"attack-chess": {
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

};
