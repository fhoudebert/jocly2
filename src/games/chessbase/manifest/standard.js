/*
 * Variants played on the ordinary 8x8 board, where only the rules or the
 * pieces change: Losing chess, Knightmate, Demi, Romanchenko and Sweet16.
 * Model and view scripts live in standard/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_model_gameOptions_levelOptions,
	config_model_levels_5,
	config_model_levels_knightmate_expert, config_model_levels_antichess_expert,
	config_model_levels_threecheck_expert, config_model_levels_horde_expert,
	config_model_levels_demi_expert, config_view_css, config_view_defaultOptions,
	config_view_skins_world, config_view_skins_camera, config_view_skins,
	config_view_skins_camera_2, config_view_skins_preload_2, config_view_sounds, config_view_js,
	config_model_gameOptions_2, config_view_skins_3, config_model_credits,
	config_view_skins_preload_4, config_view_skins_4
} = require("./shared.js");

// declarations only this family uses, lifted out of shared.js
var config_model_levels_5_knightmate_expert = config_model_levels_5.concat([config_model_levels_knightmate_expert]);

var config_model_levels_5_antichess_expert = config_model_levels_5.concat([config_model_levels_antichess_expert]);

var config_model_levels_5_threecheck_expert = config_model_levels_5.concat([config_model_levels_threecheck_expert]);

var config_model_levels_5_horde_expert = config_model_levels_5.concat([config_model_levels_horde_expert]);

var config_model_levels_5_demi_expert = config_model_levels_5.concat([config_model_levels_demi_expert]);

var modelScripts_knightmate = [
	"base-model.js",
	"grid-geo-model.js",
	"standard/knightmate-model.js"
]

var modelScripts_horde = [
	"base-model.js",
	"grid-geo-model.js",
	"standard/horde-model.js"
]

var modelScripts_threecheck = [
	"base-model.js",
	"grid-geo-model.js",
	"standard/threecheck-model.js"
]

var config_model_rules = {
	"en": "famous/rules.html"
}

// The view of a variant that plays on the ordinary board with the ordinary
// Staunton set - it says nothing about the rules, so Losing Chess and
// Three-check share it verbatim. Lifted out of the "losing-chess" entry
// below, where it used to be inlined.
var config_view_classic_board = {
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

// Three-check plays on the same board with the same set, so its view is the
// classic one plus the check-pip overlay and the stylesheet that draws it.
var config_view_js_threecheck = config_view_js.concat(["standard/threecheck-view.js"]);

var config_view_threecheck = Object.assign({}, config_view_classic_board, {
	"css": config_view_css.concat(["threecheck.css"]),
	"js": config_view_js_threecheck
})

// The horde's size is a term of its own: 36 Pawns against a full army is
// roughly level on material, three Pawns against it is lost, and the plain
// piece-value sum says the same thing about both. See the "hordeSize" entry
// standard/horde-model.js builds in its evaluate() hook.
var config_model_gameOptions_horde = Object.assign({}, config_model_gameOptions, {
	"levelOptions": Object.assign({}, config_model_gameOptions_levelOptions, {
		"hordeSizeFactor": 0.35
	})
})

// Three-check adds one term to the evaluation - how far each side is along
// its three checks (see the "threeCheck" entry built by the model's
// evaluate() hook). Without a factor for it the native levels would count
// the checks correctly for the verdict but never play towards them.
var config_model_gameOptions_threecheck = Object.assign({}, config_model_gameOptions, {
	"levelOptions": Object.assign({}, config_model_gameOptions_levelOptions, {
		"threeCheckFactor": 0.6
	})
})

var config_view_js_15 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"famous/basic-view.js"
]

var modelScripts_39 = [
	"base-model.js",
	"grid-geo-model.js",
	"standard/demi-model.js"
]

var config_view_js_35 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"standard/demi-view.js"
]

var modelScripts_40 = [
	"base-model.js",
	"grid-geo-model.js",
	"standard/romanchenko-model.js"
]

var config_view_js_36 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"standard/romanchenko-view.js"
]

var modelScripts_49 = [
	"base-model.js",
	"grid-geo-model.js",
	"standard/sweet16-model.js"
]

var config_view_js_44 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"standard/sweet16-view.js"
]

exports.games = {

	"losing-chess": {
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
			"view": config_view_classic_board
		},
		"viewScripts": config_view_js
	},

	"three-check-chess": {
		"name": "three-check-chess",
		"modelScripts": modelScripts_threecheck,
		"config": {
			"status": true,
			"model": {
				"title-en": "3 check",
				"summary": {
					"en": "Orthodox chess, but checking three times also wins",
					"fr": "Mettre trois fois échec donne la victoire"
				},
				"thumbnail": "res/rules/standard/3check-thumbnail.png",
				"module": "chessbase",
				"plazza": "true",
				"released": 1757203200,
				"rules": {
					"en": "res/rules/standard/threecheck-rules.html",
					"fr": "res/rules/standard/threecheck-rules_fr.html",
				},
				"credits": config_model_credits,
				"gameOptions": config_model_gameOptions_threecheck,
				"js": modelScripts_threecheck,
				"levels": config_model_levels_5_threecheck_expert
			},
			"view": config_view_threecheck
		},
		"viewScripts": config_view_js_threecheck
	},

	"horde-chess": {
		"name": "horde-chess",
		"modelScripts": modelScripts_horde,
		"config": {
			"status": true,
			"model": {
				"title-en": "Horde",
				"summary": {
					"en": "An army against 36 Pawns and no King",
					"fr": "Une armée contre 36 pions et aucun roi"
				},
				"thumbnail": "res/rules/standard/horde-thumbnail.png",
				"module": "chessbase",
				"plazza": "true",
				"released": 1757203200,
				"rules": {
					"en": "res/rules/standard/horde-rules.html",
					"fr": "res/rules/standard/horde-rules_fr.html",
				},
				"credits": config_model_credits,
				"gameOptions": config_model_gameOptions_horde,
				"js": modelScripts_horde,
				"levels": config_model_levels_5_horde_expert
			},
			"view": config_view_classic_board
		},
		"viewScripts": config_view_js
	},

	"knightmate-chess": {
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
                    "fr": "res/rules/standard/knightmate_fr.html",
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

	"demi-chess": {
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

	"romanchenko-chess": {
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

	"sweet16-chess": {
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

};
