/*
 * The twelve-file boards: Reformed Courier, Ley Chess Alpha, Gross chess and
 * Timurid chess. Model and view scripts live in duodecimal/.
 *
 * Entries are keyed by game name; index.js assembles them, keeping the running
 * order of the module's games.
 */

const {
	modelScripts, config_model_gameOptions, config_model_levels_5, config_view_css,
	config_view_defaultOptions, config_view_skins_world, config_view_skins_camera,
	config_view_sounds, config_model_levels_15, config_view_skins_9
} = require("./shared.js");

// declarations only this family uses, lifted out of shared.js
var modelScripts_47 = [
	"base-model.js",
	"grid-geo-model.js",
	"duodecimal/reformed-courier-model.js"
]

var config_view_js_42 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"duodecimal/reformed-courier-view.js"
]

var modelScripts_lca = [
		"base-model.js",
		"grid-geo-model.js",
		"duodecimal/leychessalpha-model.js"
	]

	var config_view_js_lca = [
		"base-view.js",
		"grid-board-view.js",
		"fairy-set-view.js",
		"duodecimal/leychessalpha-view.js"
]

var modelScripts_timurid = [
		"base-model.js",
		"grid-geo-model.js",
        "fairy-piece-model.js",
        "prelude-model.js",
		"duodecimal/timurid-model.js"
	]

var modelScripts_gross = [
		"base-model.js",
		"grid-geo-model.js",
        "fairy-piece-model.js",
		"duodecimal/gross-model.js"
	]

	var config_view_js_timurid = [
		"base-view.js",
		"grid-board-view.js",
		"fairy-set-view.js",
        "prelude-view.js",
		"duodecimal/timurid-view.js"
	]

	var config_view_js_duodecimal = [
		"base-view.js",
		"grid-board-view.js",
		"fairy-set-view.js",
		"duodecimal/duodecimal-view.js"
	]

/*
 * Timurid has no built-in Fairy-Stockfish equivalent: it is played on 12x10
 * (see duodecimal/timurid-model.js) with a piece set that includes four bent
 * riders - griffon, rhino, ship and snake - so the whole variant is declared
 * here as a custom one. The four bent riders need an engine that understands
 * the "y" Betza prefix; the wasm build shipped in third-party/fairy-stockfish
 * does.
 *
 * The eight sections are the eight prelude setups, in the order
 * timurid-model.js declares them, differing only in the three squares the
 * prelude rewrites (d2/g2/i2 and their mirrors). They all inherit from
 * timurid-xax, which carries the pieces, the promotions and the values.
 *
 * Every startFen below was checked against this game's own
 * ExportBoardState() after applying the matching prelude setup, and perft
 * agrees with Jocly to depth 3 on all eight - so no pieceMap is needed, the
 * letters are the ones Jocly already writes.
 *
 * Two points worth knowing. The piece values are seeded from Jocly's own,
 * anchored on the rook and corrected by each piece's mobility ratio between
 * 12x12 and 12x10; they are a starting point, not a tuned set. And
 * enPassantTargetTypes is what keeps the Prince capturable en passant on its
 * two-square step: Fairy-Stockfish otherwise only marks a non-pawn as an en
 * passant target on a move that its *initial* move set alone could make,
 * which never happens here since the Prince keeps that step all game.
 */
var config_model_levels_timurid_ini = [
	"[timurid-xax]",
	"maxRank = 10",
	"maxFile = 12",
	"pawn = p",
	"rook = r",
	"knight = n",
	"bishop = b",
	"queen = q",
	"king = k",
	"fersAlfil = e",
	"cannon = z",
	"bers = a",
	"customPiece1 = i:KmfR2",
	"customPiece2 = j:C",
	"customPiece3 = d:WD",
	"customPiece4 = c:yD",
	"customPiece5 = y:NAD",
	"customPiece6 = l:KNAD",
	"customPiece7 = h:yF",
	"customPiece8 = u:yW",
	"customPiece9 = x:yvF",
	"customPiece10 = s:vyW",
	"startFen = e1j1z2z1j1e/rnbxikaixbnr/pppppppppppp/12/12/12/12/PPPPPPPPPPPP/RNBXIKAIXBNR/E1J1Z2Z1J1E w - - 0 1",
	"castling = false",
	"doubleStepRegionWhite = *1 *2 *3 *4 *5 *6 *7 *8 *9 *10",
	"doubleStepRegionBlack = *1 *2 *3 *4 *5 *6 *7 *8 *9 *10",
	"promotionRegionWhite = *10",
	"promotionRegionBlack = *1",
	"promotionPieceTypes = q",
	"promotedPieceType = i:q x:h s:u d:c y:l a:q",
	"mandatoryPiecePromotion = true",
	"enPassantTargetTypes = i",
	"pieceValueMg = r:1276 b:960 n:760 q:2481 a:1836 h:2097 u:1804 x:1082 s:820 c:1830 d:900 y:1651 l:1767 e:761 j:672 z:859 i:917",
	"pieceValueEg = r:1380 b:1038 n:822 q:2683 a:1985 h:2268 u:1951 x:1170 s:887 c:1979 d:973 y:1786 l:1911 e:823 j:727 z:929 i:992",
	"[timurid-hqh:timurid-xax]",
	"startFen = e1j1z2z1j1e/rnbhikqihbnr/pppppppppppp/12/12/12/12/PPPPPPPPPPPP/RNBHIKQIHBNR/E1J1Z2Z1J1E w - - 0 1",
	"[timurid-xyx:timurid-xax]",
	"startFen = e1j1z2z1j1e/rnbxikyixbnr/pppppppppppp/12/12/12/12/PPPPPPPPPPPP/RNBXIKYIXBNR/E1J1Z2Z1J1E w - - 0 1",
	"[timurid-hlh:timurid-xax]",
	"startFen = e1j1z2z1j1e/rnbhiklihbnr/pppppppppppp/12/12/12/12/PPPPPPPPPPPP/RNBHIKLIHBNR/E1J1Z2Z1J1E w - - 0 1",
	"[timurid-xsx:timurid-xax]",
	"startFen = e1j1z2z1j1e/rnbxiksixbnr/pppppppppppp/12/12/12/12/PPPPPPPPPPPP/RNBXIKSIXBNR/E1J1Z2Z1J1E w - - 0 1",
	"[timurid-huh:timurid-xax]",
	"startFen = e1j1z2z1j1e/rnbhikuihbnr/pppppppppppp/12/12/12/12/PPPPPPPPPPPP/RNBHIKUIHBNR/E1J1Z2Z1J1E w - - 0 1",
	"[timurid-xdx:timurid-xax]",
	"startFen = e1j1z2z1j1e/rnbxikdixbnr/pppppppppppp/12/12/12/12/PPPPPPPPPPPP/RNBXIKDIXBNR/E1J1Z2Z1J1E w - - 0 1",
	"[timurid-hch:timurid-xax]",
	"startFen = e1j1z2z1j1e/rnbhikcihbnr/pppppppppppp/12/12/12/12/PPPPPPPPPPPP/RNBHIKCIHBNR/E1J1Z2Z1J1E w - - 0 1"
].join("\n");

var config_model_levels_timurid_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"customVariantIni": config_model_levels_timurid_ini,
	// The variant is only known once the prelude choice has been made, so the
	// level lists one entry per setup and jocly.fairy.js picks the one matching
	// aGame.cbVar.prelude[0].persistent at search time.
	"variants": [
		{ "setup": 0, "variant": "timurid-xax" },   // XAX: ship, admiral, ship
		{ "setup": 1, "variant": "timurid-hqh" },   // HQH: griffon, queen, griffon
		{ "setup": 2, "variant": "timurid-xyx" },   // XYX: ship, squirrel, ship
		{ "setup": 3, "variant": "timurid-hlh" },   // HLH: griffon, lion, griffon
		{ "setup": 4, "variant": "timurid-xsx" },   // XSX: ship, snake, ship
		{ "setup": 5, "variant": "timurid-huh" },   // HUH: griffon, rhino, griffon
		{ "setup": 6, "variant": "timurid-xdx" },   // XDX: ship, machine, ship
		{ "setup": 7, "variant": "timurid-hch" }    // HCH: griffon, emir (osprey), griffon
	]
}

var config_model_levels_15_timurid_expert = config_model_levels_15.concat([config_model_levels_timurid_expert]);

exports.games = {

	"reformed-courier-chess": {
		"name": "reformed-courier-chess",
		"modelScripts": modelScripts_47,
		"config": {
			"status": true,
			"model": {
				"title-en": "Reformed Courierspiel",
				"summary": {
					"en": "Clément Bégnis, 2011",
					"fr": "Clément Bégnis, 2011"
				},
				"rules": {
					"en": "res/rules/reformed-courier/reformed-courier-rules.html",
                        "fr": "res/rules/reformed-courier/reformed-courier-rules_fr.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/reformed-courier/reformed-courier-thumb.png",
				"released": 1405068613,
				"credits": {
					"en": "res/rules/reformed-courier/reformed-courier-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_47,
				"description": {
					"en": "res/rules/reformed-courier/reformed-courier-description.html"
				},
				"levels": config_model_levels_5
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/reformed-courier-600x600-3d.jpg",
						"res/visuals/reformed-courier-600x600-2d.jpg"
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
							"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
							"image|/res/fairy/elephant/elephant-diffusemap.jpg",
							"image|/res/fairy/elephant/elephant-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/lighthouse/lighthouse.js",
							"image|/res/fairy/lighthouse/lighthouse-diffusemap.jpg",
							"image|/res/fairy/lighthouse/lighthouse-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/unicorn/unicorn.js",
							"image|/res/fairy/unicorn/unicorn-diffusemap.jpg",
							"image|/res/fairy/unicorn/unicorn-normalmap.jpg"
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera
					},
					config_view_skins_9
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_42,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_42
	},

	"leychessalpha-chess": {
		"name": "leychessalpha-chess",
		"modelScripts": modelScripts_lca,
		"config": {
			"status": true,
			"model": {
				"title-en": "LeyChessAlpha",
				"summary": {
					"en": "Chess on 12x12 with fairy pieces",
					"fr": "Échecs en 12x12 avec des pièces féeriques"
				},
				"rules": {
					"en": "res/rules/duodecimal/leychessalpha-rules.html"
				},
				"module": "chessbase",
				"plazza": "true",
				"thumbnail": "res/rules/duodecimal/leychessalpha-thumb.png",
				"released": 1402412178,
				"credits": {
					"en": "res/rules/duodecimal/leychessalpha-credits.html"
				},
				"gameOptions": config_model_gameOptions,
				"obsolete": false,
				"js": modelScripts_lca,
				"description": {
					"en": "res/rules/duodecimal/leychessalpha-description.html"
				},
				"levels": config_model_levels_15
			},
			"view": {
				"title-en": "Chessbase view",
				"visuals": {
					"600x600": [
						"res/visuals/leychessalpha-600x600-3d.jpg",
						"res/visuals/leychessalpha-600x600-2d.jpg"
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
							"image|/res/fairy/eagle/eagle-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/unicorn/unicorn.js",
							"image|/res/fairy/unicorn/unicorn-diffusemap.jpg",
							"image|/res/fairy/unicorn/unicorn-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/lighthouse/lighthouse.js",
							"image|/res/fairy/lighthouse/lighthouse-diffusemap.jpg",
							"image|/res/fairy/lighthouse/lighthouse-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/amazon/amazon.js",
							"image|/res/fairy/amazon/amazon-diffusemap.jpg",
							"image|/res/fairy/amazon/amazon-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/cardinal/cardinal.js",
							"image|/res/fairy/cardinal/cardinal-diffusemap.jpg",
							"image|/res/fairy/cardinal/cardinal-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/marshall/marshall.js",
							"image|/res/fairy/marshall/marshall-diffusemap.jpg",
							"image|/res/fairy/marshall/marshall-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/dragon/dragon.js",
							"image|/res/fairy/dragon/dragon-diffusemap.jpg",
							"image|/res/fairy/dragon/dragon-normalmap.jpg",
							"smoothedfilegeo|0|/res/fairy/crowned-rook/crowned-rook.js",
							"image|/res/fairy/crowned-rook/crowned-rook-diffusemap.jpg",
							"image|/res/fairy/crowned-rook/crowned-rook-normalmap.jpg",
						],
						"world": config_view_skins_world,
						"camera": config_view_skins_camera
					},
					config_view_skins_9
				],
				"animateSelfMoves": false,
				"switchable": true,
				"sounds": config_view_sounds,
				"js": config_view_js_lca,
				"useAutoComplete": true
			}
		},
		"viewScripts": config_view_js_lca
	},

	"gross-chess": {
 			"name": "gross-chess",
 			"modelScripts": modelScripts_gross,
 			"config": {
 				"status": true,
 				"model": {
 					"title-en": "Gross Chess",

 					"summary": {
 						"en": "Omega/Gothic/Cambaluc Chess on 12x12",
 						"fr": "Échecs Omega/Gothic/Cambaluc en 12x12"
 					},
 					"rules": {
 						"en": "res/rules/duodecimal/gross-rules.html",
					"fr": "res/rules/duodecimal/gross-rules_fr.html"
 					},
 					"module": "chessbase",
 					"plazza": "true",
 					"thumbnail": "res/rules/duodecimal/gross-thumb.png",
 					"released": 1497874349,

 					"credits": {
 						"en": "res/rules/duodecimal/gross-credits.html"
 					},
 					"gameOptions": config_model_gameOptions,
 					"obsolete": false,
 					"js": modelScripts_gross,

 					"description": {
 						"en": "res/rules/duodecimal/gross-description.html"
 					},
 					"levels": config_model_levels_15
 				},
 				"view": {
 					"title-en": "Gross view",
 					"visuals": {
 						"600x600": [
 							"res/visuals/gross-600x600-3d.jpg",
 							"res/visuals/gross-600x600-2d.jpg"
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
							"smoothedfilegeo|0|/res/fairy/prince/prince.js",
							"image|/res/fairy/prince/prince-diffusemap.jpg",
							"image|/res/fairy/prince/prince-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
 								"image|/res/fairy/elephant/elephant-diffusemap.jpg",

 								"image|/res/fairy/elephant/elephant-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
 								"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
 								"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/griffon/griffon.js",
 								"image|/res/fairy/griffon/griffon-diffusemap.jpg",

 								"image|/res/fairy/griffon/griffon-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/lion/lion.js",
							"image|/res/fairy/lion/lion-diffusemap.jpg",
							"image|/res/fairy/lion/lion-normalmap.jpg",
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
 					"js": config_view_js_duodecimal,

 					"useAutoComplete": true
 				}
 			},
 			"viewScripts": config_view_js_duodecimal
	},

	"timurid-chess": {
 			"name": "timurid-chess",
 			"modelScripts": modelScripts_timurid,
 			"config": {
 				"status": true,
 				"model": {
 					"title-en": "Timurid",

 					"summary": {
 						"en": "Tamerlan II on 12x10 with fairy pieces",
 						"fr": "Tamerlan II en 12x10 avec des pièces féeriques"
 					},
 					"rules": {
 						"en": "res/rules/duodecimal/timurid-rules.html",
					"fr": "res/rules/duodecimal/timurid-rules_fr.html"
 					},
 					"module": "chessbase",
 					"plazza": "true",
 					"thumbnail": "res/rules/duodecimal/timurid-thumb.png",
 					"released": 1497874349,

 					"credits": {
 						"en": "res/rules/duodecimal/timurid-credits.html"
 					},
 					"gameOptions": config_model_gameOptions,
 					"obsolete": false,
 					"js": modelScripts_timurid,
 					"description": {
 						"en": "res/rules/duodecimal/timurid-description.html"
 					},
 					"levels": config_model_levels_15_timurid_expert
 				},
 				"view": {
 					"title-en": "Timurid view",
 					"visuals": {
 						"600x600": [
 							"res/visuals/wild-babur-600x600-3d.jpg",
 							"res/visuals/wild-mirza-600x600-2d.jpg"
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
							"smoothedfilegeo|0|/res/fairy/prince/prince.js",
							"image|/res/fairy/prince/prince-diffusemap.jpg",
							"image|/res/fairy/prince/prince-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/elephant/elephant.js",
 								"image|/res/fairy/elephant/elephant-diffusemap.jpg",
 								"image|/res/fairy/elephant/elephant-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/cannon2/cannon2.js",
 								"image|/res/fairy/cannon2/cannon2-diffusemap.jpg",
 								"image|/res/fairy/cannon2/cannon2-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/griffon/griffon.js",
 								"image|/res/fairy/griffon/griffon-diffusemap.jpg",
 								"image|/res/fairy/griffon/griffon-normalmap.jpg",
 								"smoothedfilegeo|0|/res/fairy/lion/lion.js",
							"image|/res/fairy/lion/lion-diffusemap.jpg",
							"image|/res/fairy/lion/lion-normalmap.jpg",
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
 					"js": config_view_js_timurid,
 					"useAutoComplete": true
 				}
 			},
 			"viewScripts": config_view_js_timurid
	},

};
