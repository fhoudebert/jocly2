/*
 * The Cazaux family: the large experimental variants of Jean-Louis Cazaux,
 * from Shako on 10x10 up to the Gigachess boards, plus Metamachy, Bigorra,
 * Pemba and Wild Tamerlane. Their model and view scripts live in cazaux/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_model_levels_5,
	config_model_levels_shako_expert, config_model_levels_pemba_expert, config_view_css,
	config_view_defaultOptions, config_view_skins_world, config_view_skins_camera,
	config_view_sounds, config_view_skins_2, config_model_levels_15, config_view_skins_7,
	config_view_skins_camera_4, config_view_skins_9
} = require("./shared.js");

// declarations only this family uses, lifted out of shared.js
var modelScripts_13 = [
	"base-model.js",
	"grid-geo-model.js",
	"cazaux/shako-model.js"
]

var config_model_levels_15_shako_expert = config_model_levels_15.concat([config_model_levels_shako_expert]);

var config_model_levels_15_pemba_expert = config_model_levels_15.concat([config_model_levels_pemba_expert]);

var config_view_js_13 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"cazaux/shako-view.js"
]

var modelScripts_27 = [
	"base-model.js",
	"grid-geo-model.js",
	"cazaux/rollerball-model.js"
]

var config_view_js_27 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"cazaux/rollerball-view.js"
]

var modelScripts_29 = [
	"base-model.js",
	"grid-geo-model.js",
	"cazaux/metamachy-model.js"
]

var config_view_js_29 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"cazaux/metamachy-view.js"
]

var modelScripts_tera = [
	"base-model.js",
	"grid-geo-model.js",
	"cazaux/terachess-model.js"
]

var config_view_js_tera = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"cazaux/terachess-view.js"
]

var modelScripts_giga = [
	"base-model.js",
	"grid-geo-model.js",
	"cazaux/gigachess-model.js"
]

var config_view_js_giga = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"cazaux/gigachess-view.js"
]

var modelScripts_wtamerlane = [
		"base-model.js",
		"grid-geo-model.js",
		"cazaux/wild-tamerlane-model.js"
	]

	var config_view_js_wtamerlane = [
		"base-view.js",
		"grid-board-view.js",
		"fairy-set-view.js",
		"cazaux/wild-tamerlane-view.js"
	]

var modelScripts_fantasticXIII = [
		"base-model.js",
		"grid-geo-model.js",
		"fairy-piece-model.js",
		"cazaux/fantasticXIII-model.js"
	]

	var config_view_js_fantasticXIII = [
		"base-view.js",
		"grid-board-view.js",
		"fairy-set-view.js",
		"cazaux/fantasticXIII-view.js"
	]

var modelScripts_bigorra = [
		"base-model.js",
		"grid-geo-model.js",
		"fairy-piece-model.js",
		"cazaux/bigorra-model.js"
	]

	var config_view_js_bigorra = [
		"base-view.js",
		"grid-board-view.js",
		"fairy-set-view.js",
		"cazaux/bigorra-view.js"
	]

var modelScripts_pemba = [
		"base-model.js",
		"grid-geo-model.js",
		"cazaux/pemba-model.js"
	]

	var config_view_js_pemba = [
		"base-view.js",
		"grid-board-view.js",
		"fairy-set-view.js",
		"cazaux/pemba-view.js"
	]

var modelScripts_gigaII = [
	"base-model.js",
	"grid-geo-model.js",
        "fairy-piece-model.js",
	"cazaux/gigachessII-model.js"
]

var config_view_js_gigaII = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"cazaux/gigachessII-view.js"
]

var modelScripts_zanzibars = [
	"base-model.js",
	"grid-geo-model.js",
	"fairy-piece-model.js",
	"cazaux/zanzibar-s-model.js"
]

var config_view_js_zanzibars = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"cazaux/zanzibar-view.js"
]

var modelScripts_patchanka = [
	"base-model.js",
	"grid-geo-model.js",
	"cazaux/patchanka-model.js"
]

var config_view_js_patchanka = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"cazaux/patchanka-view.js"
]

/*
 * Patchanka as a Fairy-Stockfish custom variant. Every piece here is a
 * compound, and the engine takes each one as its Betza notation, so the
 * definitions below read the same as the graphs in patchanka-model.js.
 *
 * No pieceMap: mBoard.ExportBoardState() already produces the startFen
 * character for character.
 *
 * Checked against the bundled engine by tests/fairy/patchanka-perft.test.js,
 * which compares move counts with the model's own to depth 4. That test is
 * what the ini needs rather than a reading of the documentation: a key the
 * engine does not recognise is skipped in silence, and several of the ones
 * below change nothing at all at depth 1.
 */
var config_model_levels_patchanka_expert_ini = [
	"[patchanka]",
	"maxRank = 10",
	"maxFile = 10",
	"pawn = p",
	"king = k",
	// fsmWfceFfmnD - the Soldier. "nD" is the lame Dabbaba: the double step
	// needs the crossed square empty. Unlike the Pawn's it carries no "i", so
	// it is available from every rank, which is the whole point of the piece.
	"customPiece1 = s:fsmWfceFfmnD",
	"customPiece2 = h:WA",
	"customPiece3 = i:FD",
	"customPiece4 = b:BD",
	"customPiece5 = r:RA",
	"customPiece6 = z:CZ",
	"customPiece7 = o:NZ",
	"customPiece8 = w:NC",
	"customPiece9 = q:QAD",
	"startFen = 3okzw3/rhibssbihr/pppppppppp/10/10/10/10/PPPPPPPPPP/RHIBSSBIHR/3OKZW3 w - - 0 1",
	"promotionRegionWhite = *10",
	"promotionRegionBlack = *1",
	// a Pawn or a Soldier promotes to a Medusa and to nothing else
	"promotionPieceTypes = q",
	// Kirin -> Badger, Phoenix -> Ram. Leaving this out costs nothing at
	// depth 1 - the promotion is mandatory, so it is the same single move
	// either way - and the engine then plays on with unpromoted Kirins.
	"promotedPieceType = i:b h:r",
	"mandatoryPiecePromotion = true",
	// The Soldier counts as a Pawn for promotion, en passant and the n-move
	// rule. This one key stands in for promotionPawnTypes, enPassantTypes and
	// enPassantTargetTypes: each of those was tried explicitly and each turned
	// out redundant with it set. Removing it costs the Soldier its promotion,
	// which is what "a promotion race" in patchanka-perft.test.js catches.
	"pawnTypes = ps",
	// Pawns stand on the third rank here, not the second
	"doubleStepRegionWhite = *3",
	"doubleStepRegionBlack = *8",
	"castling = false",
	""
].join("\n");

var config_model_levels_patchanka_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "patchanka",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"customVariantIni": config_model_levels_patchanka_expert_ini
}

var config_model_levels_15_patchanka_expert =
	config_model_levels_15.concat([config_model_levels_patchanka_expert]);

// the eleven meshes Patchanka puts on the board, and nothing else
var config_view_skins_preload_patchanka = [
	"smoothedfilegeo|0|/res/ring-target.js",
	"image|/res/images/cancel.png",
	"image|/res/images/wikipedia.png",
	"smoothedfilegeo|0|/res/fairy/pawn/pawn.js",
	"image|/res/fairy/pawn/pawn-diffusemap.jpg",
	"image|/res/fairy/pawn/pawn-normalmap.jpg",
	"smoothedfilegeo|0|/res/fairy/corporal/corporal.js",
	"image|/res/fairy/corporal/corporal-diffusemap.jpg",
	"image|/res/fairy/corporal/corporal-normalmap.jpg",
	"smoothedfilegeo|0|/res/fairy/birds/phoenix.js",
	"image|/res/fairy/birds/phoenix-diffusemap.jpg",
	"image|/res/fairy/birds/phoenix-normalmap.jpg",
	"smoothedfilegeo|0|/res/fairy/giraffe/giraffe.js",
	"image|/res/fairy/giraffe/giraffe-diffusemap.jpg",
	"image|/res/fairy/giraffe/giraffe-normalmap.jpg",
	"smoothedfilegeo|0|/res/fairy/badger/badger.js",
	"image|/res/fairy/badger/badger-diffusemap.jpg",
	"image|/res/fairy/badger/badger-normalmap.jpg",
	"smoothedfilegeo|0|/res/fairy/farm/ram.js",
	"image|/res/fairy/farm/ram-diffusemap.jpg",
	"image|/res/fairy/farm/ram-normalmap.jpg",
	"smoothedfilegeo|0|/res/fairy/buffalo/buffalo.js",
	"image|/res/fairy/buffalo/buffalo-diffusemap.jpg",
	"image|/res/fairy/buffalo/buffalo-normalmap.jpg",
	"smoothedfilegeo|0|/res/fairy/antelope/antelope.js",
	"image|/res/fairy/antelope/antelope-diffusemap.jpg",
	"image|/res/fairy/antelope/antelope-normalmap.jpg",
	"smoothedfilegeo|0|/res/fairy/dragon/dragon.js",
	"image|/res/fairy/dragon/dragon-diffusemap.jpg",
	"image|/res/fairy/dragon/dragon-normalmap.jpg",
	"smoothedfilegeo|0|/res/fairy/lighthouse/lighthouse.js",
	"image|/res/fairy/lighthouse/lighthouse-diffusemap.jpg",
	"image|/res/fairy/lighthouse/lighthouse-normalmap.jpg",
	"smoothedfilegeo|0|/res/fairy/king/king.js",
	"image|/res/fairy/king/king-diffusemap.jpg",
	"image|/res/fairy/king/king-normalmap.jpg"
]

exports.games = {

	"shako-chess": {
		"name": "shako-chess",
		"modelScripts": modelScripts_13,
		"config": {
			"status": true,
			"model": {
				"title-en": "Shako",
				"summary": {
					"en": "10x10 Chess",
					"fr": "Échecs en 10x10"
				},
				"rules": {
					"en": "res/rules/shako/shako-rules.html",
					"fr": "res/rules/shako/shako-rules-fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/shako/shako-thumb.png",
				"released": 1396536978,
				"credits": {
					"en": "res/rules/shako/shako-credits.html",
					"fr": "res/rules/shako/shako-credits-fr.html"
				},
				"gameOptions": config_model_gameOptions,
				"js": modelScripts_13,
				"description": {
					"en": "res/rules/shako/shako-description.html",
					"fr": "res/rules/shako/shako-description-fr.html"
				},
				"levels": config_model_levels_15_shako_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/shako-600x600-3d.jpg",
						"res/visuals/shako-600x600-2d.jpg"
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
				"js": config_view_js_13,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_13
	},

	"rollerball-chess": {
		"name": "rollerball-chess",
		"modelScripts": modelScripts_27,
		"config": {
			"status": true,
			"model": {
				"title-en": "Rollerball Chess",
				"summary": {
					"en": "Chess variant on an unusual board",
					"fr": "Variante d’échecs sur un tablier inhabituel"
				},
				"rules": {
					"en": "res/rules/rollerball/rollerball-rules.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/rollerball/rollerball-thumb.png",
				"released": 1397141778,
				"credits": {
					"en": "res/rules/rollerball/rollerball-credits.html"
				},
				"gameOptions": {
					"preventRepeat": true,
					"uctTransposition": "state",
					"uctIgnoreLoop": false,
					"levelOptions": {
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
						"distPawnPromoFactor": -0.05,
						"distKingThroneFactor": -0.1
					}
				},
				"obsolete": false,
				"js": modelScripts_27,
				"description": {
					"en": "res/rules/rollerball/rollerball-description.html"
				},
				"levels": config_model_levels_5
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/rollerball-600x600-3d.jpg",
						"res/visuals/rollerball-600x600-2d.jpg"
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
							"smoothedfilegeo|0|/res/staunton/pawn/pawn-classic.js",
							"image|/res/staunton/pawn/pawn-diffusemap.jpg",
							"image|/res/staunton/pawn/pawn-normalmap.jpg",
							"smoothedfilegeo|0|/res/staunton/knight/knight.js",
							"image|/res/staunton/knight/knight-diffusemap.jpg",
							"image|/res/staunton/knight/knight-normalmap.jpg",
							"smoothedfilegeo|0|/res/staunton/bishop/bishop.js",
							"image|/res/staunton/bishop/bishop-diffusemap.jpg",
							"image|/res/staunton/bishop/bishop-normalmap.jpg",
							"smoothedfilegeo|0|/res/staunton/rook/rook.js",
							"image|/res/staunton/rook/rook-diffusemap.jpg",
							"image|/res/staunton/rook/rook-normalmap.jpg",
							"smoothedfilegeo|0|/res/staunton/queen/queen.js",
							"image|/res/staunton/queen/queen-diffusemap.jpg",
							"image|/res/staunton/queen/queen-normalmap.jpg",
							"smoothedfilegeo|0|/res/staunton/king/king.js",
							"image|/res/staunton/king/king-diffusemap.jpg",
							"image|/res/staunton/king/king-normalmap.jpg",
							"image|/res/images/wood.jpg"
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera_4
					},
					config_view_skins_7
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_27,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_27
	},

	"metamachy-chess": {
		"name": "metamachy-chess",
		"modelScripts": modelScripts_29,
		"config": {
			"status": true,
			"model": {
				"title-en": "Metamachy",
				"summary": {
					"en": "Chess on 12x12 with fairy pieces",
					"fr": "Échecs en 12x12 avec des pièces féeriques"
				},
				"rules": {
					"en": "res/rules/metamachy/metamachy-rules.html",
                        "fr": "res/rules/metamachy/metamachy-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/metamachy/metamachy-thumb.png",
				"released": 1402412178,
				"credits": {
					"en": "res/rules/metamachy/metamachy-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_29,
				"description": {
					"en": "res/rules/metamachy/metamachy-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/metamachy-600x600-3d.jpg",
						"res/visuals/metamachy-600x600-2d.jpg"
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
							"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
							"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
							"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
							"image|/res/fairy/elephant/elephant-diffusemap.jpg",
							"image|/res/fairy/elephant/elephant-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/admiral/admiral.js",
							"image|/res/fairy/admiral/admiral-diffusemap.jpg",
							"image|/res/fairy/admiral/admiral-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/camel/camel.js",
							"image|/res/fairy/camel/camel-diffusemap.jpg",
							"image|/res/fairy/camel/camel-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/lion/lion.js",
							"image|/res/fairy/lion/lion-diffusemap.jpg",
							"image|/res/fairy/lion/lion-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/eagle/eagle.js",
							"image|/res/fairy/eagle/eagle-diffusemap.jpg",
							"image|/res/fairy/eagle/eagle-normalmap.jpg"
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera
					},
					config_view_skins_9
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_29,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_29
	},

	"tera-chess": {
		"name": "tera-chess",
		"modelScripts": modelScripts_tera,
		"config": {
			"status": true,
			"model": {
				"title-en": "Terachess",
				"summary": {
					"en": "Chess on 16x16 with fairy pieces",
					"fr": "Échecs en 16x16 avec des pièces féeriques"
				},
				"rules": {
					"en": "res/rules/terachess/terachess-rules.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/terachess/terachess-thumb.png",
				"released": 1497442763,
				"credits": {
					"en": "res/rules/terachess/terachess-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_tera,
				"description": {
					"en": "res/rules/terachess/terachess-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/terachess-600x600-3d.jpg",
						"res/visuals/terachess-600x600-2d.jpg"
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
							"smoothedfilegeo|0|/res/fairy/corporal/corporal.js",
							"image|/res/fairy/corporal/corporal-diffusemap.jpg",
							"image|/res/fairy/corporal/corporal-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/prince/prince.js",
							"image|/res/fairy/prince/prince-diffusemap.jpg",
							"image|/res/fairy/prince/prince-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/rook/rook.js",
							"image|/res/fairy/rook/rook-diffusemap.jpg",
							"image|/res/fairy/rook/rook-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/bishop/bishop.js",
							"image|/res/fairy/bishop/bishop-diffusemap.jpg",
							"image|/res/fairy/bishop/bishop-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/knight/knight.js",
							"image|/res/fairy/knight/knight-diffusemap.jpg",
							"image|/res/fairy/knight/knight-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/queen/queen.js",
							"image|/res/fairy/queen/queen-diffusemap.jpg",
							"image|/res/fairy/queen/queen-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/king/king.js",
							"image|/res/fairy/king/king-diffusemap.jpg",
							"image|/res/fairy/king/king-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/star/star.js",
							"image|/res/fairy/star/star-diffusemap.jpg",
							"image|/res/fairy/star/star-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/bow/bow.js",
							"image|/res/fairy/bow/bow-diffusemap.jpg",
							"image|/res/fairy/bow/bow-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/rhino/rhino.js",
							"image|/res/fairy/rhino/rhino-diffusemap.jpg",
							"image|/res/fairy/rhino/rhino-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/bull/bull.js",
							"image|/res/fairy/bull/bull-diffusemap.jpg",
							"image|/res/fairy/bull/bull-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/antelope/antelope.js",
							"image|/res/fairy/antelope/antelope-diffusemap.jpg",
							"image|/res/fairy/antelope/antelope-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/lion/lion.js",
							"image|/res/fairy/lion/lion-diffusemap.jpg",
							"image|/res/fairy/lion/lion-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
							"image|/res/fairy/elephant/elephant-diffusemap.jpg",
							"image|/res/fairy/elephant/elephant-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
							"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
							"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/machine/machine.js",
							"image|/res/fairy/machine/machine-diffusemap.jpg",
							"image|/res/fairy/machine/machine-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/buffalo/buffalo.js",
							"image|/res/fairy/buffalo/buffalo-diffusemap.jpg",
							"image|/res/fairy/buffalo/buffalo-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/ship/ship.js",
							"image|/res/fairy/ship/ship-diffusemap.jpg",
							"image|/res/fairy/ship/ship-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/eagle/eagle.js",
							"image|/res/fairy/eagle/eagle-diffusemap.jpg",
							"image|/res/fairy/eagle/eagle-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/camel/camel.js",
							"image|/res/fairy/camel/camel-diffusemap.jpg",
							"image|/res/fairy/camel/camel-normalmap.jpg",
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
				"js": config_view_js_tera,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_tera
	},

	"giga-chess": {
		"name": "giga-chess",
		"modelScripts": modelScripts_giga,
		"config": {
			"status": true,
			"model": {
				"title-en": "Gigachess",
				"summary": {
					"en": "Chess on 14x14 with fairy pieces",
					"fr": "Échecs en 14x14 avec des pièces féeriques"
				},
				"rules": {
					"en": "res/rules/gigachess/gigachess-rules.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/gigachess/gigachess-thumb.png",
				"released": 1497771910,
				"credits": {
					"en": "res/rules/gigachess/gigachess-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_giga,
				"description": {
					"en": "res/rules/gigachess/gigachess-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/gigachess-600x600-3d.jpg",
						"res/visuals/gigachess-600x600-2d.jpg"
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
							"smoothedfilegeo|0|/res/fairy/corporal/corporal.js",
							"image|/res/fairy/corporal/corporal-diffusemap.jpg",
							"image|/res/fairy/corporal/corporal-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/prince/prince.js",
							"image|/res/fairy/prince/prince-diffusemap.jpg",
							"image|/res/fairy/prince/prince-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/rook/rook.js",
							"image|/res/fairy/rook/rook-diffusemap.jpg",
							"image|/res/fairy/rook/rook-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/bishop/bishop.js",
							"image|/res/fairy/bishop/bishop-diffusemap.jpg",
							"image|/res/fairy/bishop/bishop-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/knight/knight.js",
							"image|/res/fairy/knight/knight-diffusemap.jpg",
							"image|/res/fairy/knight/knight-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/queen/queen.js",
							"image|/res/fairy/queen/queen-diffusemap.jpg",
							"image|/res/fairy/queen/queen-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/king/king.js",
							"image|/res/fairy/king/king-diffusemap.jpg",
							"image|/res/fairy/king/king-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/bow/bow.js",
							"image|/res/fairy/bow/bow-diffusemap.jpg",
							"image|/res/fairy/bow/bow-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/lion/lion.js",
							"image|/res/fairy/lion/lion-diffusemap.jpg",
							"image|/res/fairy/lion/lion-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
							"image|/res/fairy/elephant/elephant-diffusemap.jpg",
							"image|/res/fairy/elephant/elephant-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
							"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
							"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/machine/machine.js",
							"image|/res/fairy/machine/machine-diffusemap.jpg",
							"image|/res/fairy/machine/machine-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/buffalo/buffalo.js",
							"image|/res/fairy/buffalo/buffalo-diffusemap.jpg",
							"image|/res/fairy/buffalo/buffalo-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/ship/ship.js",
							"image|/res/fairy/ship/ship-diffusemap.jpg",
							"image|/res/fairy/ship/ship-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/eagle/eagle.js",
							"image|/res/fairy/eagle/eagle-diffusemap.jpg",
							"image|/res/fairy/eagle/eagle-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/camel/camel.js",
							"image|/res/fairy/camel/camel-diffusemap.jpg",
							"image|/res/fairy/camel/camel-normalmap.jpg",
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
				"js": config_view_js_giga,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_giga
	},

	"fantasticXIII-chess": {
		"name": "fantasticXIII-chess",
		"modelScripts": modelScripts_fantasticXIII,
		"config": {
			"status": true,
			"model": {
				"title-en": "Fantastic XIII",
				"summary": {
					"en": "Chess on 13x13 with fairy pieces",
					"fr": "Échecs en 13x13 avec des pièces féeriques"
				},
				"rules": {
					"en": "res/rules/fantasticXIII/fantasticXIII-rules.html",
					"fr": "res/rules/fantasticXIII/fantasticXIII-rules-fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/fantasticXIII/fantasticXIII-thumb.png",
				"released": 1497771910,
				"credits": {
					"en": "res/rules/fantasticXIII/fantasticXIII-credits.html"
				},
				"gameOptions": config_model_gameOptions,

				"obsolete": false,
				"js": modelScripts_fantasticXIII,
				"description": {
					"en": "res/rules/fantasticXIII/fantasticXIII-description.html",
					"fr": "res/rules/fantasticXIII/fantasticXIII-description-fr.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/fantasticXIII-600x600-3d.jpg",
						"res/visuals/fantasticXIII-600x600-2d.jpg"
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
							"smoothedfilegeo|0|/res/fairy/king/king.js",
							"image|/res/fairy/king/king-diffusemap.jpg",
							"image|/res/fairy/king/king-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/mamoth/mamoth.js",
 								"image|/res/fairy/mamoth/mamoth-diffusemap.jpg",
 								"image|/res/fairy/mamoth/mamoth-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/squirrel/squirrel.js",
 								"image|/res/fairy/squirrel/squirrel-diffusemap.jpg",
 								"image|/res/fairy/squirrel/squirrel-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/griffon/griffon.js",
 								"image|/res/fairy/griffon/griffon-diffusemap.jpg",
 								"image|/res/fairy/griffon/griffon-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/axe/axe.js",
 								"image|/res/fairy/axe/axe-diffusemap.jpg",
 								"image|/res/fairy/axe/axe-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/hawk/hawk.js",
 								"image|/res/fairy/hawk/hawk-diffusemap.jpg",
 								"image|/res/fairy/hawk/hawk-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/ship/ship.js",
 								"image|/res/fairy/ship/ship-diffusemap.jpg",
 								"image|/res/fairy/ship/ship-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/dragon/dragon.js",
 								"image|/res/fairy/dragon/dragon-diffusemap.jpg",
 								"image|/res/fairy/dragon/dragon-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/leopard/leopard.js",
 								"image|/res/fairy/leopard/leopard-diffusemap.jpg",
 								"image|/res/fairy/leopard/leopard-normalmap.jpg"	
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera
					},
					config_view_skins_9
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_fantasticXIII,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_fantasticXIII
	},

	"bigorra-chess": {
		"name": "bigorra-chess",
		"modelScripts": modelScripts_bigorra,
		"config": {
			"status": true,
			"model": {
				"title-en": "Bigorra",

				"summary": {
					"en": "FantasticXIII + Gigachess II - 16x16",
					"fr": "FantasticXIII + Gigachess II - 16x16"
				},
				"rules": {
					"en": "res/rules/fantasticXIII/bigorra-rules.html",
                        			"fr": "res/rules/fantasticXIII/bigorra-rules-fr.html"
				},
				"module": "chessbase",
				"plazza": "true",

				"thumbnail": "res/rules/fantasticXIII/bigorra-thumb.png",
				"released": 1497771910,
				"credits": {
					"en": "res/rules/fantasticXIII/fantasticXIII-credits.html"
				},

				"gameOptions": config_model_gameOptions,

				"obsolete": false,
				"js": modelScripts_bigorra,
				"description": {
					"en": "res/rules/fantasticXIII/bigorra-description.html",
					"fr": "res/rules/fantasticXIII/bigorra-description-fr.html"

				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {

					"600x600": [
						"res/visuals/bigorra-600x600-3d.jpg",
						"res/visuals/bigorra-600x600-2d.jpg"
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
							"smoothedfilegeo|0|/res/fairy/king/king.js",
							"image|/res/fairy/king/king-diffusemap.jpg",
							"image|/res/fairy/king/king-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/prince/prince.js",
							"image|/res/fairy/prince/prince-diffusemap.jpg",
							"image|/res/fairy/prince/prince-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/mamoth/elephant.js",
 								"image|/res/fairy/mamoth/mamoth-diffusemap.jpg",
 								"image|/res/fairy/mamoth/mamoth-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/squirrel/squirrel.js",
 								"image|/res/fairy/squirrel/squirrel-diffusemap.jpg",
 								"image|/res/fairy/squirrel/squirrel-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/griffon/griffon.js",
 								"image|/res/fairy/griffon/griffon-diffusemap.jpg",
 								"image|/res/fairy/griffon/griffon-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/axe/axe.js",
 								"image|/res/fairy/axe/axe-diffusemap.jpg",
 								"image|/res/fairy/axe/axe-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/hawk/hawk.js",
 								"image|/res/fairy/hawk/hawk-diffusemap.jpg",
 								"image|/res/fairy/hawk/hawk-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/knight/knight.js",
							"image|/res/fairy/knight/knight-diffusemap.jpg",
							"image|/res/fairy/knight/knight-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/bishop/bishop.js",
							"image|/res/fairy/bishop/bishop-diffusemap.jpg",
							"image|/res/fairy/bishop/bishop-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/queen/queen.js",
							"image|/res/fairy/queen/queen-diffusemap.jpg",
							"image|/res/fairy/queen/queen-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/rook/rook.js",
							"image|/res/fairy/rook/rook-diffusemap.jpg",
							"image|/res/fairy/rook/rook-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
							"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
							"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
							"image|/res/fairy/elephant/elephant-diffusemap.jpg",
							"image|/res/fairy/elephant/elephant-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/prince/prince.js",
							"image|/res/fairy/prince/prince-diffusemap.jpg",
							"image|/res/fairy/prince/prince-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/camel/camel.js",
							"image|/res/fairy/camel/camel-diffusemap.jpg",
							"image|/res/fairy/camel/camel-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/lion/lion.js",
							"image|/res/fairy/lion/lion-diffusemap.jpg",
							"image|/res/fairy/lion/lion-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/bow/bow.js",
							"image|/res/fairy/bow/bow-diffusemap.jpg",
							"image|/res/fairy/bow/bow-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/machine/machine.js",
							"image|/res/fairy/machine/machine-diffusemap.jpg",
							"image|/res/fairy/machine/machine-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/buffalo/buffalo.js",
							"image|/res/fairy/buffalo/buffalo-diffusemap.jpg",
							"image|/res/fairy/buffalo/buffalo-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/rhino/rhino.js",
							"image|/res/fairy/rhino/rhino-diffusemap.jpg",
							"image|/res/fairy/rhino/rhino-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/giraffe/giraffe.js",
							"image|/res/fairy/giraffe/giraffe-diffuse-map.jpg",
							"image|/res/fairy/giraffe/giraffe-normal-map.jpg",
							"smoothedfilegeo|0|/res/fairy/ship/ship.js",
 								"image|/res/fairy/ship/ship-diffusemap.jpg",
 								"image|/res/fairy/ship/ship-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/dragon/dragon.js",
 								"image|/res/fairy/dragon/dragon-diffusemap.jpg",
 								"image|/res/fairy/dragon/dragon-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/leopard/leopard.js",
 								"image|/res/fairy/leopard/leopard-diffusemap.jpg",
 								"image|/res/fairy/leopard/leopard-normalmap.jpg"	
						],
						"world": config_view_skins_world,

						"camera": config_view_skins_camera
					},
					config_view_skins_9
				],
				"animateSelfMoves": false,
				"switchable": true,

				"sounds": config_view_sounds,
				"js": config_view_js_bigorra,
				"useAutoComplete": true
			}
		},

		"viewScripts": config_view_js_bigorra
	},

	"wild-tamerlane-chess": {
 			"name": "wild-tamerlane-chess",
 			"modelScripts": modelScripts_wtamerlane,
 			"config": {
 				"status": true,
 				"model": {
 					"title-en": "Wild Tamerlane",
 					"summary": {
 						"en": "Chess on 11x11 with fairy pieces",
 						"fr": "Échecs en 11x11 avec des pièces féeriques"
 					},
 					"rules": {
 						"en": "res/rules/wildtamerlane/wild-tamerlane-rules.html"
 					},
 					"module": "chessbase",
 					"plazza": "true",
 					"thumbnail": "res/rules/wildtamerlane/wild-tamerlane-thumb.png",
 					"released": 1497874349,
 					"credits": {
 						"en": "res/rules/wildtamerlane/wild-tamerlane-credits.html"
 					},
 					"gameOptions": config_model_gameOptions,
 					"obsolete": false,
 					"js": modelScripts_wtamerlane,
 					"description": {
 						"en": "res/rules/wildtamerlane/wild-tamerlane-description.html"
 					},
 					"levels": config_model_levels_15
 				},
 				"view": {
 					"title-en": "Wild Tamerlane view",
 					"visuals": {
 						"600x600": [
 							"res/visuals/wild-tamerlane-600x600-3d.jpg",
 							"res/visuals/wild-tamerlane-600x600-2d.jpg"
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
 								"smoothedfilegeo|0|/res/fairy/rook/rook.js",
 								"image|/res/fairy/rook/rook-diffusemap.jpg",
 								"image|/res/fairy/rook/rook-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/bishop/bishop.js",
 								"image|/res/fairy/bishop/bishop-diffusemap.jpg",
 								"image|/res/fairy/bishop/bishop-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/knight/knight.js",
 								"image|/res/fairy/knight/knight-diffusemap.jpg",
 								"image|/res/fairy/knight/knight-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/queen/queen.js",
 								"image|/res/fairy/queen/queen-diffusemap.jpg",
 								"image|/res/fairy/queen/queen-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/king/king.js",
 								"image|/res/fairy/king/king-diffusemap.jpg",
 								"image|/res/fairy/king/king-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
 								"image|/res/fairy/elephant/elephant-diffusemap.jpg",
 								"image|/res/fairy/elephant/elephant-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
 								"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
 								"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/eagle/eagle.js",
 								"image|/res/fairy/eagle/eagle-diffusemap.jpg",
 								"image|/res/fairy/eagle/eagle-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/camel/camel.js",
 								"image|/res/fairy/camel/camel-diffusemap.jpg",
 								"image|/res/fairy/camel/camel-normalmap.jpg"							      
 							],
 							"world": config_view_skins_world,
 							"camera": config_view_skins_camera
 						},
 						config_view_skins_9
 					],
 					"animateSelfMoves": false,
 					"switchable": true,
 					"sounds": config_view_sounds,
 					"js": config_view_js_wtamerlane,
 					"useAutoComplete": true
 				}
 			},
 			"viewScripts": config_view_js_wtamerlane
	},

	"pemba-chess": {
 			"name": "pemba-chess",
 			"modelScripts": modelScripts_pemba,
 			"config": {
 				"status": true,
 				"model": {
 					"title-en": "Pemba",
 					"summary": {
 						"en": "Extended Shako on 10x10 with fairy pieces",
 						"fr": "Shako étendu en 10x10 avec des pièces féeriques"
 					},
 					"rules": {
 						"en": "res/rules/shako/pemba-rules.html",
					"fr": "res/rules/shako/pemba-rules-fr.html"
 					},
 					"module": "chessbase",
 					"plazza": "true",
 					"thumbnail": "res/rules/shako/pemba-thumb.png",
 					"released": 1497874349,
 					"credits": {
 						"en": "res/rules/shako/pemba-credits.html"
 					},
 					"gameOptions": config_model_gameOptions,
 					"obsolete": false,
 					"js": modelScripts_pemba,
 					"description": {
 						"en": "res/rules/shako/pemba-description.html",
					"fr": "res/rules/shako/pemba-description-fr.html"
 					},
 					"levels": config_model_levels_15_pemba_expert
 				},
 				"view": {
 					"title-en": "pemba view",
 					"visuals": {
 						"600x600": [
 							"res/visuals/pemba-600x600-3d.jpg",
 							"res/visuals/pemba-600x600-2d.jpg"
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
 								"smoothedfilegeo|0|/res/fairy/rook/rook.js",
 								"image|/res/fairy/rook/rook-diffusemap.jpg",
 								"image|/res/fairy/rook/rook-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/bishop/bishop.js",
 								"image|/res/fairy/bishop/bishop-diffusemap.jpg",
 								"image|/res/fairy/bishop/bishop-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/knight/knight.js",
 								"image|/res/fairy/knight/knight-diffusemap.jpg",
 								"image|/res/fairy/knight/knight-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/queen/queen.js",
 								"image|/res/fairy/queen/queen-diffusemap.jpg",
 								"image|/res/fairy/queen/queen-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/king/king.js",
 								"image|/res/fairy/king/king-diffusemap.jpg",
 								"image|/res/fairy/king/king-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
 								"image|/res/fairy/elephant/elephant-diffusemap.jpg",
 								"image|/res/fairy/elephant/elephant-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
 								"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
 								"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/bow/bow.js",
							"image|/res/fairy/bow/bow-diffusemap.jpg",
							"image|/res/fairy/bow/bow-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/camel/camel.js",
 								"image|/res/fairy/camel/camel-diffusemap.jpg",
 								"image|/res/fairy/camel/camel-normalmap.jpg",
                                "smoothedfilegeo|0|/res/fairy/giraffe/giraffe.js",
 								"image|/res/fairy/giraffe/giraffe-diffuse-map.jpg",
 								"image|/res/fairy/giraffe/giraffe-normal-map.jpg"							      
 							],
 							"world": config_view_skins_world,
 							"camera": config_view_skins_camera
 						},
 						config_view_skins_9
 					],
 					"animateSelfMoves": false,
 					"switchable": true,
 					"sounds": config_view_sounds,
 					"js": config_view_js_pemba,
 					"useAutoComplete": true
 				}
 			},
 			"viewScripts": config_view_js_pemba
	},

	"giga-chessII": {
		"name": "giga-chessII",
		"modelScripts": modelScripts_gigaII,
		"config": {
			"status": true,
			"model": {
				"title-en": "Gigachess II",
				"summary": {
					"en": "Chess on 14x14 with fairy pieces",
					"fr": "Échecs en 14x14 avec des pièces féeriques"
				},
				"rules": {
					"en": "res/rules/gigachess/gigachessII-rules.html",
                        			"fr": "res/rules/gigachess/gigachessII-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/gigachess/gigachessII-thumb.png",
				"released": 1497771910,
				"credits": {
					"en": "res/rules/gigachess/gigachessII-credits.html"
				},
				"gameOptions": config_model_gameOptions,

				"obsolete": false,
				"js": modelScripts_gigaII,
				"description": {
					"en": "res/rules/gigachess/gigachessII-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/gigachessII-600x600-3d.jpg",
						"res/visuals/gigachessII-600x600-2d.jpg"
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
							"smoothedfilegeo|0|/res/fairy/prince/prince.js",
							"image|/res/fairy/prince/prince-diffusemap.jpg",
							"image|/res/fairy/prince/prince-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/rook/rook.js",
							"image|/res/fairy/rook/rook-diffusemap.jpg",
							"image|/res/fairy/rook/rook-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/bishop/bishop.js",
							"image|/res/fairy/bishop/bishop-diffusemap.jpg",
							"image|/res/fairy/bishop/bishop-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/knight/knight.js",
							"image|/res/fairy/knight/knight-diffusemap.jpg",
							"image|/res/fairy/knight/knight-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/queen/queen.js",
							"image|/res/fairy/queen/queen-diffusemap.jpg",
							"image|/res/fairy/queen/queen-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/king/king.js",
							"image|/res/fairy/king/king-diffusemap.jpg",
							"image|/res/fairy/king/king-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/bow/bow.js",
							"image|/res/fairy/bow/bow-diffusemap.jpg",
							"image|/res/fairy/bow/bow-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/lion/lion.js",
							"image|/res/fairy/lion/lion-diffusemap.jpg",
							"image|/res/fairy/lion/lion-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
							"image|/res/fairy/elephant/elephant-diffusemap.jpg",
							"image|/res/fairy/elephant/elephant-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
							"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
							"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/machine/machine.js",
							"image|/res/fairy/machine/machine-diffusemap.jpg",
							"image|/res/fairy/machine/machine-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/buffalo/buffalo.js",
							"image|/res/fairy/buffalo/buffalo-diffusemap.jpg",
							"image|/res/fairy/buffalo/buffalo-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/eagle/eagle.js",
							"image|/res/fairy/eagle/eagle-diffusemap.jpg",
							"image|/res/fairy/eagle/eagle-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/camel/camel.js",
							"image|/res/fairy/camel/camel-diffusemap.jpg",
							"image|/res/fairy/camel/camel-normalmap.jpg",
                            "smoothedfilegeo|0|/res/fairy/star/star.js",
							"image|/res/fairy/star/star-diffusemap.jpg",
							"image|/res/fairy/star/star-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/rhino/rhino.js",
							"image|/res/fairy/rhino/rhino-diffusemap.jpg",
							"image|/res/fairy/rhino/rhino-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/giraffe/giraffe.js",
							"image|/res/fairy/giraffe/giraffe-diffuse-map.jpg",
							"image|/res/fairy/giraffe/giraffe-normal-map.jpg",
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
				"js": config_view_js_gigaII,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_gigaII
	},

	"zanzibar-s-chess": {
		"name": "zanzibar-s-chess",
		"modelScripts": modelScripts_zanzibars,
		"config": {
			"status": true,
			"model": {
				"title-en": "Zanzibar S",
				"summary": {
					"en": "Extended Metamachy - 12x12",
					"fr": "Metamachie étendu - 12x12"
				},
				"rules": {
					"en": "res/rules/metamachy/zanzibar-s-rules.html",
					"fr": "res/rules/metamachy/zanzibar-s-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/metamachy/zanzibar-s-thumb.png",
				"released": 1402412178,
				"credits": {
					"en": "res/rules/metamachy/zanzibar-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_zanzibars,
				"description": {
					"en": "res/rules/metamachy/zanzibar-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/zanzibar-600x600-3d.jpg",
						"res/visuals/zanzibar-600x600-2d.jpg"
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
							"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
							"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
							"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
							"image|/res/fairy/elephant/elephant-diffusemap.jpg",
							"image|/res/fairy/elephant/elephant-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/prince/prince.js",
							"image|/res/fairy/prince/prince-diffusemap.jpg",
							"image|/res/fairy/prince/prince-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/camel/camel.js",
							"image|/res/fairy/camel/camel-diffusemap.jpg",
							"image|/res/fairy/camel/camel-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/lion/lion.js",
							"image|/res/fairy/lion/lion-diffusemap.jpg",
							"image|/res/fairy/lion/lion-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/bow/bow.js",
							"image|/res/fairy/bow/bow-diffusemap.jpg",
							"image|/res/fairy/bow/bow-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/machine/machine.js",
							"image|/res/fairy/machine/machine-diffusemap.jpg",
							"image|/res/fairy/machine/machine-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/buffalo/buffalo.js",
							"image|/res/fairy/buffalo/buffalo-diffusemap.jpg",
							"image|/res/fairy/buffalo/buffalo-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/rhino/rhino.js",
							"image|/res/fairy/rhino/rhino-diffusemap.jpg",
							"image|/res/fairy/rhino/rhino-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/giraffe/giraffe.js",
							"image|/res/fairy/giraffe/giraffe-diffuse-map.jpg",
							"image|/res/fairy/giraffe/giraffe-normal-map.jpg",
							"smoothedfilegeo|0|/res/fairy/eagle/eagle.js",
							"image|/res/fairy/eagle/eagle-diffusemap.jpg",
							"image|/res/fairy/eagle/eagle-normalmap.jpg"
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera
					},
					config_view_skins_9
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_zanzibars,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_zanzibars
	},

	"patchanka-chess": {
		"name": "patchanka-chess",
		"modelScripts": modelScripts_patchanka,
		"config": {
			"status": true,
			"model": {
				"title-en": "Patchanka",
				"summary": {
					"en": "10x10 chess of compound pieces",
					"fr": "Échecs en 10x10 aux pièces composées"
				},
				"rules": {
					"en": "res/rules/patchanka/patchanka-rules.html",
					"fr": "res/rules/patchanka/patchanka-rules-fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/patchanka/patchanka-thumb.png",
				"released": 1788393600,
				"credits": {
					"en": "res/rules/patchanka/patchanka-credits.html",
					"fr": "res/rules/patchanka/patchanka-credits-fr.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_patchanka,
				"description": {
					"en": "res/rules/patchanka/patchanka-description.html",
					"fr": "res/rules/patchanka/patchanka-description-fr.html"
				},
				"levels": config_model_levels_15_patchanka_expert
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/patchanka-600x600-2d.jpg"
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
						"preload": config_view_skins_preload_patchanka,
						"world": config_view_skins_world,
						"camera": config_view_skins_camera
					},
					config_view_skins_9
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_patchanka,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_patchanka
	},

};
