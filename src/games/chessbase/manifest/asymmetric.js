/*
 * The asymmetric family: the two armies are not the same army. Spartan Chess
 * sets an unorthodox Spartan force against the FIDE one; Khan's Chess sets an
 * all-cavalry Mongol horde against it. Both need their own evaluation and
 * their own piece set rather than a shared one, and neither is "famous" in the
 * sense that file means - hence their own module. Model and view scripts live
 * in asymmetric/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	config_model_gameOptions, config_model_levels_15, config_model_levels_spartan_expert,
	config_view_css, config_view_defaultOptions, config_view_skins_world,
	config_view_skins_camera, config_view_skins_2, config_view_sounds
} = require("./shared.js");

var modelScripts_103 = [
	"base-model.js",
	"grid-geo-model.js",
	"asymmetric/spartan-model.js"
]

var config_model_levels_15_spartan_expert = config_model_levels_15.concat([config_model_levels_spartan_expert]);

var config_view_js_103 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"asymmetric/spartan-view.js"
]

/*
 * Khan's Chess (https://www.pychess.org/variants/khans). Own game options
 * rather than the shared config_model_gameOptions: the model exposes one extra
 * evaluation term, "kingCamp" - how far each king has walked towards the
 * opposite edge rank - which is what makes the native AI play the campmate
 * race instead of stumbling into it at the search horizon. An unweighted term
 * is silently worth 0 (base-model.js reads <name>Factor), so the factor has to
 * be declared here.
 */
var config_model_gameOptions_khans_levelOptions = {
	"checkFactor": 0.2,
	"pieceValueFactor": 1,
	"posValueFactor": 0.1,
	"averageDistKingFactor": -0.01,
	"castleFactor": 0.1,
	"minorPiecesMovedFactor": 0.1,
	"pieceValueRatioFactor": 1,
	"endingKingFreedomFactor": 0.01,
	"endingDistKingFactor": 0.05,
	"distKingCornerFactor": 0.1,
	"distPawnPromo1Factor": 0.3,
	"distPawnPromo2Factor": 0.1,
	"distPawnPromo3Factor": 0.05,
	"kingCampFactor": 0.15
}
var config_model_gameOptions_khans = {
	"preventRepeat": true,
	"uctTransposition": "state",
	"uctIgnoreLoop": false,
	"levelOptions": config_model_gameOptions_khans_levelOptions
}

var modelScripts_khans = [
	"base-model.js",
	"grid-geo-model.js",
	"asymmetric/khans-model.js"
]

var config_view_js_khans = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"asymmetric/khans-view.js"
]

/*
 * Fairy-Stockfish has no built-in "khans" variant in the wasm build shipped
 * here, but its upstream variants.ini does define one, and the engine accepts
 * it as a custom variant as-is: the definition below is that one, verbatim
 * (https://github.com/fairy-stockfish/Fairy-Stockfish, src/variants.ini).
 * Verified directly against the bundled binary: it loads, plays from the start
 * position, and a lone scout's perft matches this model's own move list (the 4
 * forward knight jumps, no diagonal capture).
 *
 * The letters are the same on both sides (P N B R Q K / l s a t h k), which is
 * why the model above uses them too - no pieceMap needed. Jocly's own FEN
 * export writes a generic "KQkq" castling field; the engine drops the "kq"
 * itself, the Horde having no rook to castle with.
 *
 * No "evalFile": Fairy-Stockfish publishes a khans NNUE network, but it is not
 * bundled here (see third-party/fairy-stockfish/nnue/README.md). Dropping
 * khans.nnue in that directory and adding "evalFile": "nnue/khans.nnue" is all
 * it takes.
 */
var config_model_levels_khans_expert_ini = [
	"[khans:chess]",
	"pieceToCharTable = -",
	"centaur = h",
	"knibis = a",
	"kniroo = l",
	"customPiece1 = t:mNcK",
	"customPiece2 = s:mfhNcfW",
	"promotionPawnTypesBlack = s",
	"promotionPieceTypesBlack = t",
	"stalemateValue = loss",
	"nMoveRuleTypesBlack = s",
	"flagPiece = k",
	"flagRegionWhite = *8",
	"flagRegionBlack = *1",
	"startFen = lhatkahl/ssssssss/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1",
	""
].join("\n");
var config_model_levels_khans_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "khans",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"customVariantIni": config_model_levels_khans_expert_ini
}

var config_model_levels_15_khans_expert = config_model_levels_15.concat([config_model_levels_khans_expert]);

exports.games = {

	"spartan-chess": {
		"name": "spartan-chess",
		"modelScripts": modelScripts_103,
		"config": {
			"status": true,
			"model": {
				"title-en": "Spartan Chess",
				"summary": {
					"en":"An unorthodox Spartan army combats FIDE",
					"fr": "L’armée spartiate combat la FIDE"
				},
				"rules": {
					"en": "res/rules/spartan/spartan-rules.html",
					"fr": "res/rules/spartan/spartan-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/spartan/spartan-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/spartan/spartan-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"js": modelScripts_103,
				"levels": config_model_levels_15_spartan_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/spartan-600x600-3d.jpg",
						"res/visuals/spartan-600x600-2d.jpg"
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
				"js": config_view_js_103,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_103
	},

	"khans-chess": {
		"name": "khans-chess",
		"modelScripts": modelScripts_khans,
		"config": {
			"status": true,
			"model": {
				"title-en": "Khan's Chess",
				"summary": {
					"en": "A Mongol horde of knight-movers against the FIDE army",
					"fr": "Une horde mongole de cavaliers contre l’armée FIDE"
				},
				"rules": {
					"en": "res/rules/khans/khans-rules.html",
					"fr": "res/rules/khans/khans-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/khans/khans-thumb.png",
				"released": 1755129600,
				"gameOptions": config_model_gameOptions_khans,
				"js": modelScripts_khans,
				"levels": config_model_levels_15_khans_expert
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
				"js": config_view_js_khans,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_khans
	},

};
