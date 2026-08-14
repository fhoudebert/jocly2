/*
 * Building blocks shared by the game entries of this module: script lists,
 * level sets, game options, view skins, cameras and worlds.
 *
 * Lifted verbatim out of index.js, where they sat as 2784 lines of preamble in
 * front of the games array. Declaration order and cross-references are
 * unchanged - several are built from the ones above them - so the values are
 * identical, object identity included.
 *
 * Some are used by a single game and will follow it into its family file; that
 * pruning waits until every family has moved out and each name has an obvious
 * home.
 */

var modelScripts = [
	"base-model.js",
	"grid-geo-model.js",
	"famous/classic-model.js",
	"famous/classic-db.min.js"
]
var config_model_gameOptions_levelOptions = {
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
	"distPawnPromo3Factor": 0.05
}
var config_model_gameOptions = {
	"preventRepeat": true,
	"uctTransposition": "state",
	"uctIgnoreLoop": false,
	"levelOptions": config_model_gameOptions_levelOptions
}
var config_model_levels = {
	"name": "easy",
	"label": "Easy",
	"ai": "uct",
	"playoutDepth": 0,
	"minVisitsExpand": 1,
	"c": 0.6,
	"ignoreLeaf": false,
	"uncertaintyFactor": 3,
	"maxNodes": 1000
}
var config_model_levels_2 = {
	"name": "fast",
	"label": "Fast [1sec]",
	"ai": "uct",
	"playoutDepth": 0,
	"minVisitsExpand": 1,
	"c": 0.6,
	"ignoreLeaf": false,
	"uncertaintyFactor": 3,
	"maxDuration": 1,
	"isDefault": true
}
var config_model_levels_3 = {
	"name": "medium",
	"label": "Medium",
	"ai": "uct",
	"playoutDepth": 0,
	"minVisitsExpand": 1,
	"c": 0.6,
	"ignoreLeaf": false,
	"uncertaintyFactor": 3,
	"maxNodes": 10000,
	"maxDuration": 10
}
var config_model_levels_4 = {
	"name": "strong",
	"label": "Strong",
	"ai": "uct",
	"playoutDepth": 0,
	"minVisitsExpand": 1,
	"c": 0.6,
	"ignoreLeaf": false,
	"uncertaintyFactor": 3,
	"maxNodes": 20000,
	"maxDuration": 15
}
var config_model_levels_5 = [
	config_model_levels,
	config_model_levels_2,
	config_model_levels_3,
	config_model_levels_4
]
// "Expert" level: delegates the search to the Fairy-Stockfish engine
// (see src/core/jocly.fairy.js) instead of Jocly's native UCT/alpha-beta
// AI. Only declared for games that are both:
//  - exactly supported as a Fairy-Stockfish "variant" (UCI_Variant) or
//    expressible via a customVariantIni, and
//  - able to export a standard FEN via mBoard.ExportBoardState()
// (classic-chess itself uses the plain "chess" variant below; see the
// many other config_model_levels_*_expert blocks throughout this file
// for every other game this has since been extended to).
var config_model_levels_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "chess",
	"skillLevel": 20,
	"moveTimeMs": 1000
}
var config_model_levels_5_expert = config_model_levels_5.concat([config_model_levels_expert]);

// --- Additional "Expert" (Fairy-Stockfish) levels, pass 1 ---
// Each entry below was verified by comparing Jocly's own
// mBoard.ExportBoardState() output for that game's starting position
// against the official Fairy-Stockfish startFen for the matching
// UCI_Variant (see src/core/variant.cpp upstream). Where both sides
// implement identical rules but use a different single-letter
// abbreviation for one piece type, "pieceMap" (Jocly letter -> Fairy-
// Stockfish letter, uppercase only) bridges the difference - see the
// pieceMap documentation in src/core/jocly.fairy.js for exactly how and
// where it is applied, and what it must NOT be used for.

// Amazon: FEN matches exactly, no pieceMap needed.
var config_model_levels_amazon_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "amazon",
	"skillLevel": 20,
	"moveTimeMs": 1000
}
var config_model_levels_5_amazon_expert = config_model_levels_5.concat([config_model_levels_amazon_expert]);

// Shako: FEN matches exactly, no pieceMap needed. Uses
// config_model_levels_15 (not _5) as its base level list. The actual
// concatenated list (config_model_levels_15_shako_expert) is defined
// further below, right after config_model_levels_15 itself is declared
// (var hoisting means the value isn't assigned yet at this point in the
// file - only the level object itself is needed here).
var config_model_levels_shako_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "shako",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"evalFile": "nnue/shako.nnue"
}

// Pemba: 10x10 board with several fairy pieces that have no native
// Fairy-Stockfish equivalent (elephant, camel, machine, giraffe, bow),
// but ARE representable with the engine's supported Betza atom subset
// (W, F, N, A, Z, D and their slider/hopper/lame-leaper variants - see
// https://github.com/fairy-stockfish/Fairy-Stockfish/blob/master/src/variants.ini
// for the documented list, and customPiece1..N for the syntax). Each
// piece's Betza notation below was derived directly from this game's
// own movement definition (cazaux/pemba-model.js's cbShortRangeGraph/
// cbLongRangeGraph offset lists, not guessed from the piece's English
// name) and verified against the real engine:
//   elephant (FA): 1-or-2-square diagonal jump, unblockable - Fers+Alfil
//   camel (L): the classic (1,3) leaper - note the engine only supports
//     this under the legacy letter "L", not "C" (reserved/ambiguous)
//     nor the (1,3) coordinate form (verified neither works)
//   machine (WD): 1-or-2-square orthogonal jump - Wazir+Dabbaba
//   giraffe (Z): turns out to be the same (2,3) leap as the standard
//     "zebra" atom Z, not the (1,4) leap some general fairy-piece
//     references call "giraffe" - verified directly against
//     cazaux/pemba-model.js's own offset list, not assumed
//   bow (mBcpB): unlimited diagonal slide, capture-only after jumping
//     over exactly one piece - a diagonal Cannon, same construction as
//     the documented orthogonal cannon (mRcpR)
// Jocly's own piece letters (E/J/D/Z/W/C, all confirmed via this game's
// abbrev fields) happen to already match what's used below, so no
// pieceMap is needed - only the custom variant config itself.
// Castling: a real castling table exists (cazaux/pemba-model.js's
// "castle" object) with the king/rooks on rank 2 (not 1) - inherited
// from "grand", which has castling disabled by default, so it must be
// explicitly re-enabled here (castling=true) together with
// castlingRank=2 (see variants.ini's documented castlingRank option,
// itself verified against a known-working official example,
// [blackletter:chess], which uses the same rank-2 castling setup).
// Verified directly: with this config, perft on a cleared rank-2 test
// position produces exactly the expected castling moves, in "king
// takes own rook" notation (since destination columns h/e don't follow
// the engine's standard g/c castling file convention) - hence
// "chess960": true below, exactly like Chess960's own level, so
// jocly.fairy.js requests the matching "engine960" move format.
var config_model_levels_pemba_expert_ini = [
	"[pembachess:grand]",
	"archbishop = -",
	"chancellor = -",
	"cannon = c",
	"customPiece1 = e:FA",
	"customPiece2 = j:L",
	"customPiece3 = d:WD",
	"customPiece4 = z:Z",
	"customPiece5 = w:mBcpB",
	"castling = true",
	"castlingKingsideFile = h",
	"castlingQueensideFile = e",
	"castlingRank = 2",
	"startFen = cjwzddzwjc/ernbqkbnre/pppppppppp/10/10/10/10/PPPPPPPPPP/ERNBQKBNRE/CJWZDDZWJC w KQkq - 0 1",
	""
].join("\n");
var config_model_levels_pemba_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "pembachess",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"chess960": true,
	"customVariantIni": config_model_levels_pemba_expert_ini
}

// Chancellor: FEN matches exactly, no pieceMap needed.
var config_model_levels_chancellor_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "chancellor",
	"skillLevel": 20,
	"moveTimeMs": 1000
}
var config_model_levels_5_chancellor_expert = config_model_levels_5.concat([config_model_levels_chancellor_expert]);

// Xiangqi: same rules/position, different piece letters
// (Jocly H(orse)/E(lephant) vs Fairy-Stockfish's N(knight)/B(ishop)).
var config_model_levels_xiangqi_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "xiangqi",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"pieceMap": { "H": "N", "E": "B" },
	"evalFile": "nnue/xiangqi.nnue"
}
var config_model_levels_5_xiangqi_expert = config_model_levels_5.concat([config_model_levels_xiangqi_expert]);

// Shatranj: same rules/position, different piece letters
// (Jocly E(lephant)/G(eneral) vs Fairy-Stockfish's B(ishop)/Q(ueen)).
var config_model_levels_shatranj_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "shatranj",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"pieceMap": { "E": "B", "G": "Q" }
}
var config_model_levels_5_shatranj_expert = config_model_levels_5.concat([config_model_levels_shatranj_expert]);

// Knightmate: same rules/position, the royal piece (moves like a
// knight) is "K" in Jocly vs "M" in Fairy-Stockfish, while the regular
// knight-replacement commoner piece is "N" in Jocly vs "K" in
// Fairy-Stockfish - i.e. a 3-way letter rotation. pieceMap below covers
// it: K->M and N->K together correctly avoid double-substitution
// (BuildPieceMaps()/TranslitFen() apply both within a single
// character-by-character pass, not sequential global replacements).
var config_model_levels_knightmate_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "knightmate",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"pieceMap": { "K": "M", "N": "K" }
}
var config_model_levels_5_knightmate_expert = config_model_levels_5.concat([config_model_levels_knightmate_expert]);

// Grand: same rules/position (Jocly does not actually implement
// castling for this game either, despite the default "KQkq" in its FEN
// export - see grand-model.js), different piece letter for the
// chancellor (Jocly "M" vs Fairy-Stockfish "C").
var config_model_levels_grand_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "grand",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"pieceMap": { "M": "C" }
}
var config_model_levels_5_grand_expert = config_model_levels_5.concat([config_model_levels_grand_expert]);

// Capablanca-chess module (capa10x8/capablanca-model.js): a single
// Jocly game whose "prelude" (see prelude-model.js) lets the player
// choose, at the start of each game, between several distinct chess
// variants sharing the same 10x8 board/geometry. Of its 10 prelude
// setups, 4 have a native Fairy-Stockfish variant equivalent
// (Capablanca, Gothic, Embassy, Janus - see config_model_levels_expert
// note above for the pieceMap details). The other 6 (Bird, Carrera,
// Ladorean, Grotesque, Schoolbook, Univers) have no built-in
// equivalent, but use the exact same piece set as Capablanca - just a
// different starting arrangement and, for some, different castling
// destination files - so each is declared as a Fairy-Stockfish "custom
// variant" (https://fairy-stockfish.github.io/custom-variants/, see
// jocly.fairy.js's "customVariantIni" documentation for exactly how
// this is loaded). Each one's startFen and castling destination files
// were derived directly from this file's own castling tables (janus/
// mirrored/mirror2/mirror_f/flexible above) and verified against the
// real engine (both that it accepts the config, and that perft on a
// cleared-rank-1 test position produces a king move to exactly the
// expected destination file).
// Carrera (setup 3): unlike Bird, this setup's entry in the castle
// table above is literally `undefined` (not "p.castle"), meaning
// Jocly's own cbGeneratePseudoLegalMoves never finds a valid castling
// table for it and so never generates a castle move for Carrera at all
// (same "FEN says KQkq but no castle move is ever actually generated"
// situation already seen for Grand/Courier above) - hence
// "castling = false" in its custom variant section below, rather than
// a castlingKingsideFile/castlingQueensideFile pair.
//
// Since the variant actually being played is only known once the
// prelude choice has been made (not statically, like every other level
// in this file), a single static "variant"/"pieceMap" cannot be
// declared here. Instead, jocly.fairy.js supports an array of candidate
// sub-levels under "variants": at search time it picks the one whose
// "setup" matches aGame.cbVar.prelude's recorded persistent choice, and
// reports an error (no silent fallback) if the chosen setup has no
// match - see the "variants" handling added to JoclyFairy.startMachine.
var config_model_levels_capablanca_missing_setups_ini = [
	"[joclybird:capablanca]",
	"startFen = RNBCQKABNR/pppppppppp/10/10/10/10/PPPPPPPPPP/rnbcqkabnr w KQkq - 0 1",
	"castlingKingsideFile = i",
	"castlingQueensideFile = c",
	"",
	"[joclycarrera:capablanca]",
	"startFen = RANBQKBNCR/pppppppppp/10/10/10/10/PPPPPPPPPP/ranbqkbncr w KQkq - 0 1",
	"castling = false",
	"",
	"[joclyladorean:capablanca]",
	"startFen = RBQNKANCBR/pppppppppp/10/10/10/10/PPPPPPPPPP/rbqnkancbr w KQkq - 0 1",
	"castlingKingsideFile = g",
	"castlingQueensideFile = c",
	"",
	"[joclygrotesque:capablanca]",
	"startFen = RBQNKCNABR/pppppppppp/10/10/10/10/PPPPPPPPPP/rbqnkcnabr w KQkq - 0 1",
	"castlingKingsideFile = f",
	"castlingQueensideFile = d",
	"",
	"[joclyschoolbook:capablanca]",
	"startFen = RQNBAKBNCR/pppppppppp/10/10/10/10/PPPPPPPPPP/rqnbakbncr w KQkq - 0 1",
	"castlingKingsideFile = g",
	"castlingQueensideFile = e",
	"",
	"[joclyunivers:capablanca]",
	"startFen = RBNCQKANBR/pppppppppp/10/10/10/10/PPPPPPPPPP/rbncqkanbr w KQkq - 0 1",
	"castlingKingsideFile = g",
	"castlingQueensideFile = e",
	""
].join("\n");
var config_model_levels_capablanca_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	// "evalFile" on the Capablanca-piece-set setups only: they all play
	// the exact same 10x8 board and R/N/B/Q/K + Archbishop + Chancellor
	// piece set (just shuffled starting squares), so the one optional
	// capablanca network (renamed per-variant by jocly.fairyworker.js's
	// MaybeLoadEvalFile - see that function and
	// third-party/fairy-stockfish/nnue/README.md) is dimensionally
	// valid for every one of them. Janus is deliberately left out: its
	// piece set differs (two Januses, no Chancellor), so the capablanca
	// net's feature dimensions don't match - it would only fail the
	// engine's load-time validation and add a pointless fetch.
	"variants": [
		{ "setup": 0, "variant": "capablanca", "pieceMap": { "M": "C" }, "evalFile": "nnue/capablanca-chess.nnue" },
		{ "setup": 1, "variant": "gothic", "pieceMap": { "M": "C" }, "evalFile": "nnue/capablanca-chess.nnue" },
		{ "setup": 4, "variant": "embassy", "pieceMap": { "M": "C" }, "evalFile": "nnue/capablanca-chess.nnue" },
		{ "setup": 9, "variant": "janus", "pieceMap": { "A": "J" } },
		{ "setup": 2, "variant": "joclybird", "pieceMap": { "M": "C" }, "customVariantIni": config_model_levels_capablanca_missing_setups_ini, "evalFile": "nnue/capablanca-chess.nnue" },
		{ "setup": 3, "variant": "joclycarrera", "pieceMap": { "M": "C" }, "customVariantIni": config_model_levels_capablanca_missing_setups_ini, "evalFile": "nnue/capablanca-chess.nnue" },
		{ "setup": 5, "variant": "joclyladorean", "pieceMap": { "M": "C" }, "customVariantIni": config_model_levels_capablanca_missing_setups_ini, "evalFile": "nnue/capablanca-chess.nnue" },
		{ "setup": 6, "variant": "joclygrotesque", "pieceMap": { "M": "C" }, "customVariantIni": config_model_levels_capablanca_missing_setups_ini, "evalFile": "nnue/capablanca-chess.nnue" },
		{ "setup": 7, "variant": "joclyschoolbook", "pieceMap": { "M": "C" }, "customVariantIni": config_model_levels_capablanca_missing_setups_ini, "evalFile": "nnue/capablanca-chess.nnue" },
		{ "setup": 8, "variant": "joclyunivers", "pieceMap": { "M": "C" }, "customVariantIni": config_model_levels_capablanca_missing_setups_ini, "evalFile": "nnue/capablanca-chess.nnue" }
	]
}
var config_model_levels_5_capablanca_expert = config_model_levels_5.concat([config_model_levels_capablanca_expert]);

// Antichess (Jocly's "losing-chess"): FEN matches exactly (including the
// absence of castling rights), no pieceMap needed. Jocly implements the
// same rules as Fairy-Stockfish's "antichess" specifically (mandatory
// capture, and - crucially - a player with no legal move, including
// stalemate, *wins* rather than loses; no special king-as-commoner
// piece, king lost like any other piece counts toward the "no pieces
// left" loss condition) - not "suicide" (extra stalemate-piece-count
// rule) or "giveaway"/"losers" (different win conditions), even though
// Jocly's own UI describes the game as "also known as" all of those.
var config_model_levels_antichess_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "antichess",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"evalFile": "nnue/antichess.nnue"
}
var config_model_levels_5_antichess_expert = config_model_levels_5.concat([config_model_levels_antichess_expert]);

// Chess960 (Fischer Random): same rules/position-randomization as
// Fairy-Stockfish's "fischerandom", no pieceMap needed - but, unlike
// every other level above, this one *requires* "chess960": true. Without
// it, castling moves are matched in the wrong notation: Fairy-Stockfish
// without UCI_Chess960 expects "king to its final square" (e.g. "e1g1"),
// which is wrong for a Chess960 position where the king's *current*
// square may already coincide with where it lands when castling kingside
// or queenside (collapsing to a meaningless "no-op"-looking move) - and
// engine-side, Fairy-Stockfish needs UCI_Chess960 itself to apply
// Chess960 castling rules (king may already be adjacent to/between other
// pieces in ways standard castling rules wouldn't allow). With
// "chess960": true, jocly.fairy.js requests Jocly's "engine960" move
// format ("king takes own rook", e.g. "g1h1") to match the engine's own
// Chess960-style notation - verified directly: the plain "engine" format
// version of a Chess960 castling move can match an unrelated nearby move
// more closely (in Levenshtein distance) than the real castling move.
var config_model_levels_chess960_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "fischerandom",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"chess960": true
}
var config_model_levels_5_chess960_expert = config_model_levels_5.concat([config_model_levels_chess960_expert]);

// Makruk (Thai Chess): same rules and position as Fairy-Stockfish's
// "makruk", different single-letter abbreviations for the Khon
// (bishop-like piece) and Met (queen-like piece) - verified to be a
// consistent, bijective per-character substitution (B<->S, Q<->M), and
// no real rules difference: Jocly's own evaluate() already implements
// the exact same MAKRUK_COUNTING-style move-limit rule (based on
// remaining Met/Khon/Knight count) as the official variant, neither
// side has a castling table (Jocly never generates a castle move here,
// matching the official "castling = false"), and pawn promotion -
// limited to a single piece type (Met) - only ever triggers on the
// first rank a pawn can reach with Jocly's plain (non-double-step)
// pawn movement, making the official 3-rank promotionRegion and
// Jocly's single-rank "geometry.R(move.t)==5" check equivalent in
// practice.
var config_model_levels_makruk_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "makruk",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"pieceMap": { "B": "S", "Q": "M" }
}
var config_model_levels_5_makruk_expert = config_model_levels_5.concat([config_model_levels_makruk_expert]);

// Wildebeest: 11x10 board, already declared as an official example
// variant directly in Fairy-Stockfish's own variants.ini
// (https://github.com/fairy-stockfish/Fairy-Stockfish/blob/master/src/variants.ini,
// section [wildebeest:chess]) - its customVariantIni below is that
// section's content verbatim, not something derived for this
// integration. Only one piece letter differs from Jocly's own
// (camel: official "c", Jocly "M" - wildebeest itself already matches,
// "W" both sides), verified to be a consistent bijective substitution
// against the full starting position FEN.
//
// tripleStepRegion kept (matches the official config): initially
// suspected of being a real engine/Jocly divergence (the official
// config's own comment says "Limitations: No flexible castling, no
// pawn triple steps", which reads as a Fairy-Stockfish limitation),
// and a perft check did show "a2a5" as a legal opening move with it
// enabled. But re-checking wildebeest-model.js more carefully (not
// just grepping for the word "triple") showed Jocly's actual starting
// pawns are a distinct piece type, "iipawn-w/b" (using a dedicated
// IIPawnGraph() move function, separate from the regular
// cbInitialPawnGraph()-based "ipawn" used as a placeholder/promotion
// piece) - and it does generate the exact same "a2a5"-style move.
// So this option is required to keep both sides in sync, not a
// divergence to work around.
//
// Castling: NOT enabled here (castling=false, matching the official
// config's own comment "Limitations: No flexible castling"). Verified
// directly that Jocly's wildebeest-model.js castling table requires
// "flexible" castling (the king's destination square depends on how
// far it can safely travel toward the rook, via a positive "extra"
// value letting it potentially land on the rook's own square) - the
// exact feature the official variants.ini comment says isn't
// supported. This is a real, acknowledged rules gap, not just a
// notation difference: with castling=false, the engine will never
// itself propose castling (a minor strength gap, not a correctness
// bug), but a castling move already played by a human player (or by
// Jocly's own non-Expert AI) applies to the board exactly like any
// other move and causes no problems for subsequent Expert-level moves.
var config_model_levels_wildebeest_expert_ini = [
	"[wildebeest:chess]",
	"maxRank = 10",
	"maxFile = k",
	"customPiece1 = c:C",
	"customPiece2 = w:NC",
	"doubleStepRegionWhite = *2 *3",
	"doubleStepRegionBlack = *9 *8",
	"tripleStepRegionWhite = *2",
	"tripleStepRegionBlack = *9",
	"pieceToCharTable = PNBRQ.......C....WKpnbrq.......c....wk",
	"startFen = rnccwkqbbnr/ppppppppppp/11/11/11/11/11/11/PPPPPPPPPPP/RNBBQKWCCNR w KQkq - 0 1",
	"promotionPieceTypes = qw",
	"promotionRegionWhite = *9 *10",
	"promotionRegionBlack = *2 *1",
	"mandatoryPawnPromotion = false",
	"castling = false",
	""
].join("\n");
var config_model_levels_wildebeest_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "wildebeest",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"pieceMap": { "M": "C" },
	"customVariantIni": config_model_levels_wildebeest_expert_ini
}
var config_model_levels_5_wildebeest_expert = config_model_levels_5.concat([config_model_levels_wildebeest_expert]);

// Heavychess: 10x10 board with several fairy pieces, none of which has
// a native Fairy-Stockfish variant equivalent (marshall/chancellor-like,
// archbishop-like, dragon-king, centaur, "missionary" king+bishop
// compound), declared as a custom variant inheriting from "grand", same
// approach as Pemba above. Unlike Pemba though, every one of these
// pieces turned out to be representable using only the engine's basic
// W/F/N/B/R atoms (no custom-piece letters like Pemba's elephant/camel/
// giraffe/bow were needed) - derived directly from this game's own
// piece library (fairy-piece-model.js's cbCardinalGraph/cbMarshallGraph/
// cbAmazonGraph/cbSymmetricGraph offset codes, decoded as
// rook(-10)/bishop(-11)/knight(21)/wazir(10)/ferz(11) compounds) and
// verified individually against the real engine:
//   marshall   (M) = RN  (rook + knight, i.e. a standard chancellor)
//   archbishop (A) = BN  (bishop + knight, a standard archbishop)
//   dragon-king(D) = RF  (rook + 1-square diagonal step)
//   centaur    (J) = WFN (1-square orthogonal/diagonal step + knight)
//   missionary (L) = WFB (king-style step + unlimited diagonal slide)
// Jocly's own piece letters (M/A/D/J/L, all confirmed via this game's
// MakePiece() abbrev assignments in fairy-piece-model.js) already match
// what's declared below, so no pieceMap is needed.
// Castling: a real castling table is set up automatically by
// fairy-piece-model.js's cbPiecesFromFEN() (it calls setCastling()
// unconditionally once a king and rook are found), with the king on
// rank 2 (not 1, same situation as Pemba) and destination files
// computed from the rook's starting file - verified directly (perft on
// a cleared rank-2 test position) to land on h/d, matching what's
// declared here. Since h/d aren't the engine's standard g/c castling
// files, the engine encodes castling in "king takes own rook" notation,
// hence "chess960": true, exactly like Pemba and Chess960 itself.
var config_model_levels_heavychess_expert_ini = [
	"[heavychess:grand]",
	"archbishop = -",
	"chancellor = -",
	"customPiece1 = m:RN",
	"customPiece2 = a:BN",
	"customPiece3 = d:RF",
	"customPiece4 = j:WFN",
	"customPiece5 = l:WFB",
	"castling = true",
	"castlingKingsideFile = h",
	"castlingQueensideFile = d",
	"castlingRank = 2",
	"startFen = madqllqdam/jrnbtkbnrj/pppppppppp/10/10/10/10/PPPPPPPPPP/JRNBTKBNRJ/MADQLLQDAM w KQkq - 0 1",
	""
].join("\n");
var config_model_levels_heavychess_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "heavychess",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"chess960": true,
	"customVariantIni": config_model_levels_heavychess_expert_ini
}
var config_model_levels_5_heavychess_expert = config_model_levels_5.concat([config_model_levels_heavychess_expert]);

// Shogi: same rules and starting position as Fairy-Stockfish's "shogi"
// (startFen matches byte-for-byte once Jocly's own captured-pieces
// representation - extra board columns rather than a FEN "[...]"
// pocket section, see drop-model.js/cbDropGeometry() - is converted to
// the standard form). No pieceMap needed: Jocly's own piece letters
// already match (verified against the official startFen). "engine"
// format drop moves (e.g. "P@d1", confirmed directly) already match
// the USI/UCI drop notation the engine expects, so no special move
// handling is needed either - only the FEN itself needed fixing.
// "pocketGeometry": true tells jocly.fairy.js to build the FEN with
// BuildShogiStyleFen() instead of the generic ExportBoardState() (see
// that function's own documentation for exactly how/why). Verified
// directly: the resulting FEN for the starting position matches the
// official startFen exactly, and after real captures (including
// several captures of the same piece type) the "[...]" pocket section
// is built correctly - using one repeated letter per held piece
// (e.g. "[ppppp l]" with no spaces), NOT a "5P"-style count prefix,
// which was verified directly against the real engine to silently
// lose pieces if used in the FEN pocket (as opposed to engine-side
// Sfen *output*, which does use a count prefix, but that's not an
// accepted *input* form for the FEN pocket).
//
// "evalFile": the wasm build ships with no NNUE weights (see
// jocly.fairy.js's own "evalFile" doc) - shogi has, by a wide margin,
// the single largest documented NNUE-vs-classical gap of any
// Fairy-Stockfish variant (over +1000 Elo, see
// https://fairy-stockfish.github.io/nnue/), so this is where NOT
// loading a net matters the most. Like every other "evalFile" in this
// file, the network itself is OPTIONAL and not bundled - see
// third-party/fairy-stockfish/nnue/README.md for how to deploy it;
// when absent, this level simply plays on classical evaluation.
var config_model_levels_shogi_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "shogi",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"pocketGeometry": true,
	"evalFile": "nnue/shogi.nnue"
}

// Mini-shogi: same rules and starting position as Fairy-Stockfish's
// "minishogi" (startFen matches byte-for-byte once the hand columns are
// converted, same as base shogi above). No pieceMap or other
// adjustment needed - Jocly's own piece letters already match exactly.
var config_model_levels_minishogi_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "minishogi",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"pocketGeometry": true
}

// Kyoto Shogi: same starting position as Fairy-Stockfish's
// "kyotoshogi" once converted - but unlike every other shogi variant
// in this work, its source kyoto-shogi-model.js needed real changes,
// not just a level declaration, because of this variant's defining
// rule: every non-king piece must alternate between a promoted and
// unpromoted form on each move it makes (mandatoryPiecePromotion +
// pieceDemotion, both true for kyotoshogi - verified directly: a
// perft on the real engine from the official starting position shows
// every legal move suffixed with "+" or "-", never bare). Jocly's own
// promote()/type tables already implement this correctly (e.g. moving
// type 6 always yields type 16 and vice-versa), but the piece TYPES
// involved were originally named/abbreviated after their *visual*
// resemblance rather than their *engine* identity (e.g. a piece that
// moves like Gold was called "gold-w"/"G", when Fairy-Stockfish needs
// it sent as "+N" - a promoted Knight, since
// promotedPieceType[SHOGI_KNIGHT]=GOLD for this variant). Jocly's own
// existing "pieceMap" mechanism can only substitute one FEN letter for
// another (e.g. "Q"->"C"), not insert a "+" prefix - and even a
// from-scratch single-letter mapping wouldn't have worked here anyway,
// since e.g. the same Jocly letter "+P" is used by two functionally
// different pieces (a promoted Lance "+L" officially, and a promoted
// Pawn that's separately abbreviated "R" by Jocly but should be "+P"
// officially) - a real, unavoidable collision for a flat letter
// substitution. So kyoto-shogi-model.js's pieceTypes 4/5/6/7/8/9 were
// renamed to their correct functional identity (p-silver/+S,
// p-pawn/+P, p-knight-w/b/+N, p-lance-w/b/+L) instead - same move
// graphs, only the name/abbrev changed - see that file's own comments
// for the full reasoning per piece. No pieceMap is declared here as a
// result: the FEN now matches directly.
//
// "dropPromoted": true is also required, and is itself a real,
// documented rules feature of this variant (Fairy-Stockfish's own
// dropPromoted=true for kyotoshogi): captured pieces keep their
// promoted state in hand rather than being demoted on capture like in
// every other shogi variant here - verified directly that
// kyoto-shogi-model.js's own demoted-type table only flips a captured
// piece's color, never collapses it to the unpromoted form, i.e.
// Jocly's own board state already reflects "stays promoted" correctly
// - see jocly.fairy.js's BuildShogiStyleFen()/dropPromoted handling for
// the corresponding "[...]" pocket-section fix this required (without
// it, a promoted piece's "+" would have been incorrectly stripped when
// building the pocket).
var config_model_levels_kyotoshogi_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "kyotoshogi",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"pocketGeometry": true,
	"dropPromoted": true,
	// Optional NNUE (see third-party/fairy-stockfish/nnue/README.md):
	// this level uses Fairy-Stockfish's NATIVE "kyotoshogi" variant, so
	// a network trained for it matches both engine gates by
	// construction - the variant-name gate (the worker installs it as
	// /kyotoshogi.nnue) and the feature-dimension gate (same variant it
	// was trained on; measured nnueDimensions = 10530). Absent file =
	// classical evaluation, as everywhere. One caveat that matters
	// here: the deployed .nnue must be compatible with THIS wasm
	// engine build's NNUE architecture version - a present-but-
	// incompatible file is a fatal engine error upstream, which
	// jocly.fairyworker.js now detects and self-heals from (network
	// blacklisted for the session, fresh engine, classical eval).
	"evalFile": "nnue/kyotoshogi.nnue"
}

// Tori Shogi ("bird shogi"): same starting position as Fairy-Stockfish's
// "torishogi" once converted - no pieceMap needed. Jocly's own fairy
// piece letters (S/F/L/R/P/C/K for swallow/falcon/left-quail/
// right-quail/pheasant/crane/king) already match the official ones
// exactly (just case, handled automatically), and Jocly already uses
// the "+" prefix on the *source* piece's letter for both promoted
// pieces (e.g. "+S" for the promoted swallow/goose, "+F" for the
// promoted falcon/eagle) - exactly the convention Fairy-Stockfish
// itself uses (verified directly against the real engine: a FEN with
// "+s" for a promoted swallow is accepted and echoed back unchanged,
// even though the promoted piece's own distinct identity - the goose -
// has a different official letter "g" that's simply never used in FEN
// placement, only "+s" is). Unlike Kyoto Shogi, captured promoted
// pieces ARE demoted back to their base form here (verified directly:
// tori-shogi-model.js's own "demoted" entries for the promoted types
// point at the base, unpromoted type, not just a same-rank
// color-flipped promoted type) - matching Fairy-Stockfish's default
// (no "dropPromoted" declared for torishogi), so this level doesn't
// set "dropPromoted" either.
var config_model_levels_torishogi_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "torishogi",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"pocketGeometry": true
}

// Gardner MiniChess: FEN matches Fairy-Stockfish's native "gardner"
// exactly, no pieceMap needed.
var config_model_levels_gardner_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "gardner",
	"skillLevel": 20,
	"moveTimeMs": 1000
}
var config_model_levels_5_gardner_expert = config_model_levels_5.concat([config_model_levels_gardner_expert]);

// Los Alamos Chess: FEN now matches Fairy-Stockfish's native
// "losalamos" exactly, after fixing a real placement bug in
// los-alamos-model.js itself (queen/king were swapped - see that
// file's own comment for the historical sources confirming the
// correct placement is queen on c1/c6, king on d1/d6, not the other
// way around). This wasn't a notation/pieceMap issue like other games
// in this work - the actual starting position Jocly played was
// historically wrong, independent of this Fairy-Stockfish
// integration, so it was corrected directly rather than worked around
// with a custom variant config that would have preserved the bug.
var config_model_levels_losalamos_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "losalamos",
	"skillLevel": 20,
	"moveTimeMs": 1000
}
var config_model_levels_5_losalamos_expert = config_model_levels_5.concat([config_model_levels_losalamos_expert]);

// Basic Chess: exactly the same piece set, starting position and rules
// as classic-chess (base-model.js/famous/basic-model.js is identical to
// famous/classic-model.js except for the openings-book-only importGame/
// zobrist tweaks, which don't affect ExportBoardState or legal moves) -
// so it reuses classic-chess's own "chess" variant/FEN unchanged, no
// pieceMap or customVariantIni needed.
var config_model_levels_5_basic_expert = config_model_levels_5.concat([config_model_levels_expert]);

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

// Mini Chess 4x4 (mini4x4-model.js): R/Q/K + pawns only, single-square
// pawn moves only (cbPawnGraph, not cbInitialPawnGraph) and no castling
// table at all, so this is the one exception that's fine derived from
// "gardner" - its doubleStep=false/castling=false defaults already match.
// Promotion (pawn -> R/Q only, geometry.R(move.t)==3/0) needs both the
// piece-type restriction and the rank-4 region override.
var config_model_levels_mini4x4_expert_ini = [
	"[mini4x4chess:gardner]",
	"maxRank = 4",
	"maxFile = d",
	"startFen = rqkr/pppp/PPPP/RQKR w - - 0 1",
	"promotionRegionWhite = *4",
	"promotionRegionBlack = *1",
	"promotionPieceTypes = rq",
	""
].join("\n");
var config_model_levels_mini4x4_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "mini4x4chess",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"customVariantIni": config_model_levels_mini4x4_expert_ini
}
var config_model_levels_5_mini4x4_expert = config_model_levels_5.concat([config_model_levels_mini4x4_expert]);

// Mini Chess 4x5 (mini4x5-model.js): same R/Q/K + pawns piece set as
// mini4x4, but on a 4x5 board with double-step pawns (ipawn types) and
// still no castling table - derived from "chess" so double-step is on
// by default (castling is explicitly turned back off since "chess"
// defaults to castling=true). Verified directly against the real
// engine: with the initial position's pawns only one empty rank apart,
// a double-step landing square is occupied at the start (matching
// Jocly, whose own ipawn graph is equally blocked there), but becomes
// available again once that blocking pawn moves - confirming this is
// real double-step support, not a coincidentally-identical move count.
var config_model_levels_mini4x5_expert_ini = [
	"[mini4x5chess:chess]",
	"maxRank = 5",
	"maxFile = d",
	"startFen = rqkr/pppp/4/PPPP/RQKR w - - 0 1",
	"promotionRegionWhite = *5",
	"promotionRegionBlack = *1",
	"promotionPieceTypes = rq",
	"castling = false",
	""
].join("\n");
var config_model_levels_mini4x5_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "mini4x5chess",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"customVariantIni": config_model_levels_mini4x5_expert_ini
}
var config_model_levels_5_mini4x5_expert = config_model_levels_5.concat([config_model_levels_mini4x5_expert]);

// Micro Chess (micro4x5-model.js, Glimne 1997): 4x5 board with a single
// pawn per side and one each of R/B/N/K - NOT the same starting
// position as Fairy-Stockfish's own native "microchess" (which places
// both sides' R/B/N/K in the *same* file order, king-vs-rook rather
// than king-vs-king), so it needs its own customVariantIni rather than
// reusing that native variant. Derived from "chess" for double-step.
// Castling (one king/rook pair per side, verified directly against the
// real Jocly move generator - not assumed from the castle table's
// k/r arrays, since a first pass at reading those backwards gave
// exactly-reversed king/rook destinations): White King d1/Rook a1 ->
// Kb1/Rc1 (a "queenside-shaped" castle since the rook sits below the
// king); Black King a5/Rook d5 -> Kc5/Rb5 (a "kingside-shaped" castle,
// same physical motion mirrored by the point-symmetric board). Jocly's
// own castling notation is plain "king start/king end" (e.g. "d1b1"),
// matching Fairy-Stockfish's *non*-Chess960 castling notation exactly -
// so, unlike the capablanca-family/pemba levels elsewhere in this file,
// this level deliberately does NOT set "chess960": true; doing so would
// switch both sides to "king takes own rook" notation instead and break
// the match against Jocly's own move list. Only one promotion region
// exists (rank 5/1) and only to N/B/R (no queen piece exists in this
// variant at all, verified from micro4x5-model.js's own promote()).
var config_model_levels_micro4x5_expert_ini = [
	"[micro4x5chess:chess]",
	"maxRank = 5",
	"maxFile = d",
	"startFen = knbr/p3/4/3P/RBNK w Qk - 0 1",
	"castlingKingsideFile = c",
	"castlingQueensideFile = b",
	"promotionPieceTypes = nbr",
	"promotionRegionWhite = *5",
	"promotionRegionBlack = *1",
	""
].join("\n");
var config_model_levels_micro4x5_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "micro4x5chess",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"customVariantIni": config_model_levels_micro4x5_expert_ini
}
var config_model_levels_5_micro4x5_expert = config_model_levels_5.concat([config_model_levels_micro4x5_expert]);

// Baby Chess (mini/baby-model.js, 5x5): standard R/N/B/Q/K piece set,
// mirrored back ranks (White RNBQK / Black KQBNR, kings facing kings),
// double-step pawns, one castling pair per side. NOTE: while
// implementing this level, a genuine pre-existing bug independent of
// this Fairy-Stockfish work was found and fixed directly in
// baby-model.js itself (same kind of fix, and same rationale, as the
// historical Los Alamos queen/king swap fixed earlier in this file):
// Black's castle table entry was keyed "24/20" (i.e. king at 24, rook
// at 20), but Black's actual king/rook start at 20/24 - the reverse -
// so the lookup (built from the *live* king.p+"/"+rook.p) could never
// match and Black could never castle at all, verified directly against
// the real Jocly move generator both before and after the fix (with a
// fully cleared, unattacked path and an unmoved king/rook, Black's
// castling move only appears in the legal move list after correcting
// the key to "20/24" together with the k/r target squares to their
// intended, rotationally-symmetric counterpart of White's own entry).
// Fairy-Stockfish's own castling classification (rook file vs king
// file) makes White's castle "queenside-shaped" and Black's
// "kingside-shaped", but both land the king on the same file (c) -
// exactly like Jocly's own (now-fixed) castle table.
var config_model_levels_baby_expert_ini = [
	"[babychess:chess]",
	"maxRank = 5",
	"maxFile = e",
	"startFen = kqbnr/ppppp/5/PPPPP/RNBQK w KQkq - 0 1",
	"promotionRegionWhite = *5",
	"promotionRegionBlack = *1",
	"castlingKingsideFile = c",
	"castlingQueensideFile = c",
	""
].join("\n");
var config_model_levels_baby_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "babychess",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"customVariantIni": config_model_levels_baby_expert_ini
}
var config_model_levels_5_baby_expert = config_model_levels_5.concat([config_model_levels_baby_expert]);

// Malett Chess (mini/malett-model.js, 5x5, Jeff Mallett): the genuinely
// asymmetric variant where White plays with two knights and no bishops
// while Black plays with two bishops and no knights (verified directly
// from malett-model.js's own piece placement, not assumed from the
// name) - both are ordinary Fairy-Stockfish piece types, so this needs
// only a custom starting position, no custom pieces. Both sides castle
// the *same* physical way (king c-file -> b-file, rook a-file ->
// c-file - translational, not mirrored, matching the identical R.K.Q.
// back-rank layout shared by both colors), so only
// castlingQueensideFile is set (neither side's castle is
// "kingside-shaped"). Pawns promote to any of N/B/R/Q for either side
// (malett-model.js's own promote() returns the full [4,5,6,7] set
// regardless of which flank pieces that side started with).
var config_model_levels_malett_expert_ini = [
	"[malettchess:chess]",
	"maxRank = 5",
	"maxFile = e",
	"startFen = rbkqb/ppppp/5/PPPPP/RNKQN w Qq - 0 1",
	"promotionRegionWhite = *5",
	"promotionRegionBlack = *1",
	"castlingQueensideFile = b",
	""
].join("\n");
var config_model_levels_malett_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "malettchess",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"customVariantIni": config_model_levels_malett_expert_ini
}
var config_model_levels_5_malett_expert = config_model_levels_5.concat([config_model_levels_malett_expert]);

// Chess Attack (mini/attack-model.js, 5x6): standard R/N/B/Q/K piece
// set on a 5x6 board, both back ranks in the *same* file order (kings
// face each other on the e-file), double-step pawns, one castling pair
// per side landing the king on the same file (c) for both colors, same
// as baby-chess above.
var config_model_levels_attack_expert_ini = [
	"[attackchess:chess]",
	"maxRank = 6",
	"maxFile = e",
	"startFen = rnbqk/ppppp/5/5/PPPPP/RNBQK w Qq - 0 1",
	"promotionRegionWhite = *6",
	"promotionRegionBlack = *1",
	"castlingQueensideFile = c",
	"castlingKingsideFile = c",
	""
].join("\n");
var config_model_levels_attack_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "attackchess",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"customVariantIni": config_model_levels_attack_expert_ini
}
var config_model_levels_5_attack_expert = config_model_levels_5.concat([config_model_levels_attack_expert]);

// Demi-Chess (standard/demi-model.js, 4x8, Peter Krystufek 1986): only
// K/B/N/R start on the board - no queen at all (queen only ever
// appears via promotion, verified from demi-model.js's own piece
// definition, which gives type 7 "queen" no "initial" array). Both
// back ranks share the same file order (kings face each other on the
// a-file), one castling pair per side, "kingside-shaped" for both
// colors (the only rook sits on the far side from the king on this
// narrow 4-file board).
var config_model_levels_demi_expert_ini = [
	"[demichess:chess]",
	"maxRank = 8",
	"maxFile = d",
	"startFen = kbnr/pppp/4/4/4/4/PPPP/KBNR w Kk - 0 1",
	"promotionRegionWhite = *8",
	"promotionRegionBlack = *1",
	"castlingKingsideFile = c",
	""
].join("\n");
var config_model_levels_demi_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "demichess",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"customVariantIni": config_model_levels_demi_expert_ini
}
var config_model_levels_5_demi_expert = config_model_levels_5.concat([config_model_levels_demi_expert]);

// Gustav III Chess: native Fairy-Stockfish variant "gustav3", FEN
// matches exactly (including the FEN's "*" wall-square markers -
// verified directly that Jocly's own gustav3-model.js already
// confines every piece's movement away from those columns via its own
// "confine" mechanism on rows 2-7, not just leaving them empty - so
// this is a genuine, already-correctly-implemented rules match, not
// just a coincidental FEN placement). Castling destination files (h/d)
// also verified directly to match.
var config_model_levels_gustav3_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "gustav3",
	"skillLevel": 20,
	"moveTimeMs": 1000
}
var config_model_levels_5_gustav3_expert = config_model_levels_5.concat([config_model_levels_gustav3_expert]);

// Spartan Chess: native Fairy-Stockfish variant "spartan", FEN matches
// byte-for-byte. No pieceMap needed.
var config_model_levels_spartan_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "spartan",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"evalFile": "nnue/spartan.nnue"
}

// Hectochess: 10x10 board with several fairy pieces, none with a
// native Fairy-Stockfish variant equivalent, declared as a custom
// variant inheriting from "grand" - same approach as Pemba/Heavychess.
// Pieces translate to the engine's basic atoms directly:
//   marshall (M) = RN  (rook + knight, standard chancellor)
//   champion  (O) = WDA (1-square orthogonal/diagonal-2 step + alfil)
//   wizard    (W) = FL  (1-square diagonal step + camel jump)
//   leo       (L) = mQcQ (queen-style slide, capture only past a
//                  screen piece - a generalized cannon, both
//                  orthogonal and diagonal; verified directly against
//                  the real engine, isolated, that it produces a full
//                  8-direction queen-style slide)
// archbishop (A) is already a recognized engine piece type
// (archbishop = a). Jocly's own piece letters (M/O/W/L/A, all
// confirmed via this game's MakePiece() abbrev assignments in
// fairy-piece-model.js) already match what's declared below, so no
// pieceMap is needed. Castling destination files (h/d) verified
// directly against real Jocly gameplay.
var config_model_levels_hectochess_expert_ini = [
	"[hectochess:grand]",
	"archbishop = a",
	"customPiece1 = m:RN",
	"customPiece2 = o:WDA",
	"customPiece3 = w:FL",
	"customPiece4 = l:mQcQ",
	"castling = true",
	"castlingKingsideFile = h",
	"castlingQueensideFile = d",
	"startFen = awl4lwm/ronbqkbnor/pppppppppp/10/10/10/10/PPPPPPPPPP/RONBQKBNOR/AWL4LWM w KQkq - 0 1",
	""
].join("\n");
var config_model_levels_hectochess_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "hectochess",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"customVariantIni": config_model_levels_hectochess_expert_ini
}
var config_model_levels_5_hectochess_expert = config_model_levels_5.concat([config_model_levels_hectochess_expert]);

// Tutti-Frutti Chess (Ralph Betza & Philip Cohen, 1978-79): 8x8 board
// with 3 piece compounds (amazon=QN, empress=RN, princess=BN), no
// native Fairy-Stockfish variant equivalent, declared as a custom
// variant inheriting from plain "chess" (standard board size,
// standard castling - verified directly that Jocly's own castling
// table for this game produces the plain "e1g1"-style destination,
// no chess960/customVariantIni castling options needed).
//
// Found and fixed a real, pre-existing bug in tutti-frutti-model.js
// while building this: the "princess" piece's abbrev was "Pr" - two
// characters - which silently produced an invalid FEN from the
// generic ExportBoardState()/getBoardState() (9 characters for an
// 8-column board row), independent of this Fairy-Stockfish
// integration. Changed to the single letter "C" (the game's own other
// letters - N/B/R/Q/K/A/E - were already taken, "A" being used here
// for the Amazon rather than the Archbishop/Princess as in most other
// games in this work).
var config_model_levels_tuttifrutti_expert_ini = [
	"[tuttifrutti:chess]",
	"customPiece1 = e:RN",
	"customPiece2 = a:QN",
	"customPiece3 = c:BN",
	"startFen = enbakqcr/pppppppp/8/8/8/8/PPPPPPPP/ENBAKQCR w KQkq - 0 1",
	""
].join("\n");
var config_model_levels_tuttifrutti_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "tuttifrutti",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"customVariantIni": config_model_levels_tuttifrutti_expert_ini
}
var config_model_levels_5_tuttifrutti_expert = config_model_levels_5.concat([config_model_levels_tuttifrutti_expert]);

// Courier chess: same rules and starting position as Fairy-Stockfish's
// "courier" (including the absence of castling - Jocly's courier-model.js
// does mark its rooks "castle:true" and declares a "castle" table, but
// that table is an empty object, so - exactly like grand-model.js's
// default "KQkq" FEN castling field above - no castle move is ever
// actually generated; the "KQkq" in Jocly's default FEN export is
// cosmetic, not a real rules difference), different single-letter
// abbreviations for 4 piece types (elephant/alfil, bishop, wazir,
// fers - verified to be a consistent, fully bijective per-character
// substitution). Uses config_model_levels_10 (not _5) as its base level
// list; the actual concatenated list
// (config_model_levels_10_courier_expert) is defined further below,
// right after config_model_levels_10 itself is declared.
var config_model_levels_courier_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "courier",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"pieceMap": { "B": "E", "C": "B", "S": "W", "Q": "F" }
}

var config_view_css = [
	"chessbase.css"
]
var config_view_defaultOptions = {
	"sounds": true,
	"moves": true,
	"notation": false,
	"autocomplete": false
}
var config_view_skins_preload = [
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
	"image|/res/staunton/king/king-normalmap.jpg"
]
var config_view_skins_world_lightPosition = {
	"x": -9,
	"y": 9,
	"z": 9
}
var config_view_skins_world_skyLightPosition = {
	"x": 9,
	"y": 9,
	"z": 9
}
var config_view_skins_world = {
	"lightIntensity": 1.3,
	"skyLightIntensity": 1.2,
	"lightCastShadow": true,
	"fog": false,
	"color": 4686804,
	"lightPosition": config_view_skins_world_lightPosition,
	"skyLightPosition": config_view_skins_world_skyLightPosition,
	"lightShadowDarkness": 0.55,
	"ambientLightColor": 2236962
}
var config_view_skins_camera = {
	"fov": 45,
	"distMax": 50,
	"radius": 18,
	"elevationAngle": 60,
	"elevationMin": 0
}
var config_view_skins = {
	"name": "skin3d",
	"title": "3D Classic",
	"3d": true,
	"preload": config_view_skins_preload,
	"world": config_view_skins_world,
	"camera": config_view_skins_camera
}
var config_view_skins_camera_2 = {
	"fov": 45,
	"distMax": 50,
	"radius": 18,
	"elevationAngle": 89,
	"elevationMin": 0
}
var config_view_skins_preload_2 = [
	"image|/res/images/cancel.png",
	"image|/res/images/whitebg.png",
	"image|/res/images/wikipedia.png"
]
var config_view_sounds = {
	"move1": "alq_move1",
	"move2": "alq_move2",
	"move3": "alq_move3",
	"move4": "alq_move2",
	"tac1": "alq_tac1",
	"tac2": "alq_tac2",
	"tac3": "alq_tac1",
	"promo": "promo",
	"usermove": null
}
var config_view_js = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"extruded-set-view.js",
	"famous/classic-view.js"
]
var modelScripts_2 = [
	"base-model.js",
	"grid-geo-model.js",
	"famous/xiangqi-model.js",
	"famous/xiangqi-db.min.js"
]
var config_model_gameOptions_levelOptions_2 = {
	"pieceValueFactor": 1,
	"pieceValueRatioFactor": 1,
	"posValueFactor": 0.1,
	"averageDistKingFactor": -0.01,
	"castleFactor": 0.1,
	"minorPiecesMovedFactor": 0.1,
	"checkFactor": 0.2,
	"endingKingFreedomFactor": 0.01,
	"endingDistKingFactor": 0.05,
	"distKingCornerFactor": 0.1
}
var config_model_gameOptions_2 = {
	"preventRepeat": true,
	"uctTransposition": "state",
	"uctIgnoreLoop": false,
	"levelOptions": config_model_gameOptions_levelOptions_2
}
var config_view_skins_world_lightPosition_2 = {
	"x": 10,
	"y": 10,
	"z": 10
}
var config_view_skins_world_2 = {
	"lightIntensity": 0.8,
	"skyLightIntensity": 0.5,
	"lightCastShadow": true,
	"fog": false,
	"color": 4686804,
	"lightPosition": config_view_skins_world_lightPosition_2,
	"skyLightPosition": config_view_skins_world_skyLightPosition,
	"lightShadowDarkness": 0.75,
	"ambientLightColor": 4473924
}
var config_view_skins_preload_3 = [
	"smoothedfilegeo|0|/res/ring-target.js",
	"image|/res/images/cancel.png",
	"smoothedfilegeo|0|/res/xiangqi/token.js",
	"image|/res/xiangqi/wood3.jpg",
	"image|/res/xiangqi/clearwoodtexture.jpg",
	"image|/res/xiangqi/decoration-cross.png",
	"image|/res/xiangqi/whitebg.png",
	"image|/res/xiangqi/xiangqi-pieces-sprites-western-player.png",
	"image|/res/xiangqi/piecebump.jpg"
]
var config_view_js_2 = [
	"base-view.js",
	"grid-board-view.js",
	"famous/xiangqi-board-view.js",
	"famous/xiangqi-set-view.js",
	"famous/xiangqi-view.js"
]
var modelScripts_janggi = [
	"base-model.js",
	"grid-geo-model.js",
	"famous/janggi-model.js"
]
var config_view_js_janggi = [
	"base-view.js",
	"grid-board-view.js",
	"famous/janggi-board-view.js",
	"famous/janggi-set-view.js",
	"famous/janggi-view.js"
]
/*
Janggi + Fairy-Stockfish: ON HOLD, hence commented out rather than
deleted. The engine has the variant built in, and "janggitraditional" is
the one that matches this model - bikjangRule on, no material counting -
while Jocly's H(orse)/E(lephant) are its N/B exactly as for Xiangqi.

What is left to reconcile is the pass: Fairy-Stockfish sets
pass[WHITE] = pass[BLACK] = true, i.e. a player may pass on ANY turn,
while this model only passes when nothing else can move. The engine can
therefore answer with a null move that has no counterpart in the move
list, and jocly.fairy.js's ResolveMove would either throw or fall back on
the nearest legal move by edit distance - silently wrong. Enable this
level once the two agree on when a pass is available.

var config_model_levels_janggi_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "janggitraditional",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"pieceMap": { "H": "N", "E": "B" }
}
var config_model_levels_5_janggi_expert = config_model_levels_5.concat([config_model_levels_janggi_expert]);
*/
var modelScripts_3 = [
	"base-model.js",
	"grid-geo-model.js",
	"mini/gardner-model.js"
]
var config_view_skins_2 = {
	"name": "skin2d",
	"title": "2D Classic",
	"3d": false,
	"preload": config_view_skins_preload_2
}
var config_view_skins_3 = [
	config_view_skins,
	config_view_skins_2
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
var modelScripts_11 = [
	"base-model.js",
	"grid-geo-model.js",
	"historical/courier-model.js"
]
var config_model_levels_6 = {
	"name": "easy",
	"label": "Easy",
	"ai": "uct",
	"playoutDepth": 0,
	"minVisitsExpand": 1,
	"c": 0.6,
	"ignoreLeaf": false,
	"uncertaintyFactor": 3,
	"maxNodes": 4000
}
var config_model_levels_7 = {
	"name": "fast",
	"label": "Fast [2sec]",
	"ai": "uct",
	"playoutDepth": 0,
	"minVisitsExpand": 1,
	"c": 0.6,
	"ignoreLeaf": false,
	"uncertaintyFactor": 3,
	"maxDuration": 2,
	"isDefault": true
}
var config_model_levels_8 = {
	"name": "medium",
	"label": "Medium",
	"ai": "uct",
	"playoutDepth": 0,
	"minVisitsExpand": 1,
	"c": 0.6,
	"ignoreLeaf": false,
	"uncertaintyFactor": 3,
	"maxNodes": 20000,
	"maxDuration": 20
}
var config_model_levels_9 = {
	"name": "strong",
	"label": "Strong",
	"ai": "uct",
	"playoutDepth": 0,
	"minVisitsExpand": 1,
	"c": 0.6,
	"ignoreLeaf": false,
	"uncertaintyFactor": 3,
	"maxNodes": 40000,
	"maxDuration": 30
}
var config_model_levels_10 = [
	config_model_levels_6,
	config_model_levels_7,
	config_model_levels_8,
	config_model_levels_9
]
var config_model_levels_10_courier_expert = config_model_levels_10.concat([config_model_levels_courier_expert]);
var config_view_js_11 = [
	"base-view.js",
	"grid-board-view.js",
	"historical/courier-board-view.js",
	"historical/courierchess-set-view.js",
	"historical/courier-view.js"
]
var modelScripts_12 = [
	"base-model.js",
	"grid-geo-model.js",
	"famous/makruk-model.js"
]
var config_view_skins_world_lightPosition_3 = {
	"x": -10,
	"y": 5,
	"z": 0
}
var config_view_skins_world_3 = {
	"lightIntensity": 0.8,
	"skyLightIntensity": 0.4,
	"lightCastShadow": false,
	"fog": false,
	"color": 4686804,
	"lightPosition": config_view_skins_world_lightPosition_3,
	"skyLightPosition": config_view_skins_world_skyLightPosition,
	"lightShadowDarkness": 0.85,
	"ambientLightColor": 1118481
}
var config_view_js_12 = [
	"base-view.js",
	"grid-board-view.js",
	"makruk-board-view.js",
	"makruk-set-view.js",
	"famous/makruk-view.js"
]
var modelScripts_13 = [
	"base-model.js",
	"grid-geo-model.js",
	"cazaux/shako-model.js"
]
var modelScripts_100 = [
	"base-model.js",
	"grid-geo-model.js",
	"team-mate-model.js"
]
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
var modelScripts_101 = [
	"base-model.js",
	"grid-geo-model.js",
	"fairy-piece-model.js",
	"locust-move-model.js",
	"locust/werewolf-model.js"
]
var modelScripts_102 = [
	"base-model.js",
	"grid-geo-model.js",
	"fairy-piece-model.js",
	"locust-move-model.js",
	"locust/elven-model.js"
]
var modelScripts_103 = [
	"base-model.js",
	"grid-geo-model.js",
	"famous/spartan-model.js"
]
var modelScripts_104 = [
	"base-model.js",
	"grid-geo-model.js",
	"decimal/scirocco-model.js"
]
var modelScripts_seireigi = [
	"base-model.js",
	"grid-geo-model.js",
	"drop-model.js",
	"shogi/seireigi-shogi-model.js"
]
var modelScripts_chu_seireigi = [
	"base-model.js",
	"grid-geo-model.js",
	"drop-model.js",
        "fairy-piece-model.js",
	"shogi/chu-seireigi-model.js"
]
var modelScripts_105 = [
	"base-model.js",
	"grid-geo-model.js",
	"drop-model.js",
	"shogi/shogi-model.js"
]
var modelScripts_106 = [
	"base-model.js",
	"grid-geo-model.js",
	"drop-model.js",
	"shogi/tori-shogi-model.js"
]
var modelScripts_107 = [
	"base-model.js",
	"grid-geo-model.js",
	"drop-model.js",
	"shogi/mini-shogi-model.js"
]
var modelScripts_108 = [
	"base-model.js",
	"grid-geo-model.js",
	"locust-move-model.js",
	"shogi/chu-shogi-model.js"
]
// Tenjiku Shogi needs its own evaluation weights and search budgets: the
// board is 16x16 with 78 pieces a side, positions have 70+ legal moves, and
// above all a check by a jumping general cannot be answered by interposing
// anything - it is very often mate. With the shared weight (checkFactor
// 0.2) the search treated "my opponent can check me next move" as noise and
// walked into 1. j5-j6 <any> 2. VGi4-o10#.
var config_model_gameOptions_levelOptions_tenjiku = {
	"pieceValueFactor": 1,
	"pieceValueRatioFactor": 1,
	"posValueFactor": 0.1,
	"averageDistKingFactor": -0.01,
	"checkFactor": 5,
	"endingKingFreedomFactor": 0.01,
	"endingDistKingFactor": 0.05,
	"distKingCornerFactor": 0.1
}
var config_model_gameOptions_tenjiku = {
	"preventRepeat": true,
	"uctTransposition": "state",
	"uctIgnoreLoop": false,
	"levelOptions": config_model_gameOptions_levelOptions_tenjiku
}
// Follow a check a couple of moves further when its replies are forced: the
// combinations that decide a game of Tenjiku start with a capture the static
// evaluation calls bad (a general for a lesser piece), so the plain search
// never looks at them, and the mate lands two plies later.
var config_model_levels_mateSearch_tenjiku = {
	"depth": 2,
	"maxReplies": 4,
	"maxDepth": 6
}
var config_model_levels_tenjiku = [
	{
		"name": "easy",
		"label": "Easy",
		"ai": "uct",
		"playoutDepth": 0,
		"minVisitsExpand": 1,
		"c": 0.6,
		"ignoreLeaf": false,
		"uncertaintyFactor": 3,
		"maxNodes": 20000
	},
	{
		"name": "fast",
		"label": "Fast [5sec]",
		"ai": "uct",
		"playoutDepth": 0,
		"minVisitsExpand": 1,
		"c": 0.6,
		"ignoreLeaf": false,
		"uncertaintyFactor": 3,
		"mateSearch": config_model_levels_mateSearch_tenjiku,
		"maxDuration": 5,
		"isDefault": true
	},
	{
		"name": "medium",
		"label": "Medium",
		"ai": "uct",
		"playoutDepth": 0,
		"minVisitsExpand": 1,
		"c": 0.6,
		"ignoreLeaf": false,
		"uncertaintyFactor": 3,
		"mateSearch": config_model_levels_mateSearch_tenjiku,
		"maxNodes": 150000,
		"maxDuration": 40
	},
	{
		"name": "strong",
		"label": "Strong",
		"ai": "uct",
		"playoutDepth": 0,
		"minVisitsExpand": 1,
		"c": 0.6,
		"ignoreLeaf": false,
		"uncertaintyFactor": 3,
		"mateSearch": config_model_levels_mateSearch_tenjiku,
		"maxNodes": 500000,
		"maxDuration": 120
	},
	{
		"name": "hyper",
		"label": "10 min",
		"ai": "uct",
		"playoutDepth": 0,
		"minVisitsExpand": 1,
		"c": 0.6,
		"ignoreLeaf": false,
		"uncertaintyFactor": 3,
		"mateSearch": config_model_levels_mateSearch_tenjiku,
		"maxNodes": 2500000,
		"maxDuration": 600
	},
	{
		"name": "correspondence",
		"label": "20 min",
		"ai": "uct",
		"playoutDepth": 0,
		"minVisitsExpand": 1,
		"c": 0.6,
		"ignoreLeaf": false,
		"uncertaintyFactor": 3,
		"mateSearch": config_model_levels_mateSearch_tenjiku,
		"maxNodes": 5000000,
		"maxDuration": 1200
	}
]
var modelScripts_tenjiku = [
	"base-model.js",
	"grid-geo-model.js",
	"locust-move-model.js",
	"shogi/tenjiku-shogi-model.js"
]
var modelScripts_109 = [
	"base-model.js",
	"grid-geo-model.js",
	"fairy-piece-model.js",
	"locust-move-model.js",
	"locust/makromachy-model.js"
]
var modelScripts_110 = [
	"base-model.js",
	"grid-geo-model.js",
	"fairy-piece-model.js",
	"locust-move-model.js",
	"locust/minjiku-shogi-model.js"
]
var modelScripts_kyoto = [
	"base-model.js",
	"grid-geo-model.js",
	"drop-model.js",
	"shogi/kyoto-shogi-model.js"
]
var modelScripts_kotaishi = [
	"base-model.js",
	"grid-geo-model.js",
	"drop-model.js",
	"shogi/kotaishi-shogi-model.js"
]
var config_model_levels_11 = {
	"name": "easy",
	"label": "Easy",
	"ai": "uct",
	"playoutDepth": 0,
	"minVisitsExpand": 1,
	"c": 0.6,
	"ignoreLeaf": false,
	"uncertaintyFactor": 3,
	"maxNodes": 6000
}
var config_model_levels_12 = {
	"name": "fast",
	"label": "Fast [3sec]",
	"ai": "uct",
	"playoutDepth": 0,
	"minVisitsExpand": 1,
	"c": 0.6,
	"ignoreLeaf": false,
	"uncertaintyFactor": 3,
	"maxDuration": 3,
	"isDefault": true
}
var config_model_levels_13 = {
	"name": "medium",
	"label": "Medium",
	"ai": "uct",
	"playoutDepth": 0,
	"minVisitsExpand": 1,
	"c": 0.6,
	"ignoreLeaf": false,
	"uncertaintyFactor": 3,
	"maxNodes": 30000,
	"maxDuration": 30
}
var config_model_levels_14 = {
	"name": "strong",
	"label": "Strong",
	"ai": "uct",
	"playoutDepth": 0,
	"minVisitsExpand": 1,
	"c": 0.6,
	"ignoreLeaf": false,
	"uncertaintyFactor": 3,
	"maxNodes": 60000,
	"maxDuration": 45
}
var config_model_levels_15 = [
	config_model_levels_11,
	config_model_levels_12,
	config_model_levels_13,
	config_model_levels_14
]
var config_model_levels_15_shako_expert = config_model_levels_15.concat([config_model_levels_shako_expert]);
var config_model_levels_15_shogi_expert = config_model_levels_15.concat([config_model_levels_shogi_expert]);

// Kotaishi Shogi (shogi + drunk elephant, promoting to crown prince):
// needs its OWN expert level - sharing shogi's verbatim is silently
// corrupt, because Fairy-Stockfish parsing this game's FEN under variant
// "shogi" would not reject the unknown elephant/prince letters, it would
// SKIP them, shifting the rest of the rank and making the engine search
// a wrong position every move. The custom variant below defines the
// pieces so parsing stays aligned.
//
// Drunk Elephant (e) = FfsW in Betza (one step in every direction but
// straight back); it promotes to the Crown Prince (p), a non-royal
// commoner (K = one step any direction), matching the jocly model.
// NB: unlike the previous squirrel definition, this .ini has NOT been
// validated move-by-move against a real Fairy-Stockfish binary yet -
// only the jocly-native levels (1-15) are exercised by the test suite.
// It should be checked against the engine before relying on Expert.
//
// Deliberately NO "evalFile" here: the shogi NNUE network CANNOT apply
// to this variant, under any name. Fairy-Stockfish's NNUE input
// dimensions are derived from the variant's piece-type count
// (variant.cpp: nnuePieceIndices ~ bitset(pieceTypes).count()), and the
// squirrel adds one type - measured on the real engine:
// nnueDimensions = 150903 for shogi vs 166941 for this variant -
// so loading shogi's net under this variant fails read_parameters (the
// file holds fewer weights than the variant expects) and the engine
// silently stays on classical evaluation. (In fairyground the same
// limits apply - its stronger play there came from searching the
// CORRECT position, which the old shared-with-shogi level here never
// did, not from NNUE.) Declaring the evalFile anyway would only add a
// misleading "NNUE network loaded" worker log for a net the engine
// then rejects; the only way to get NNUE for this variant is training
// a dedicated net for it with Fairy-Stockfish's variant NNUE pipeline.
var config_model_levels_kotaishi_expert_ini = [
	"[kotaishishogi:shogi]",
	"customPiece1 = e:FfsW", // Drunk Elephant: steps in every direction but straight back
	// Crown Prince (promoted Drunk Elephant, moves as a King). Internal
	// letter 'c' - NOT 'p', which is already Shogi's pawn: reusing 'p' here
	// would silently turn every pawn into a King-mover. In FEN the prince is
	// still written "+E"/"+e" (Shogi-style promoted-elephant notation), which
	// is exactly what Jocly exports, so no pieceMap is needed.
	"customPiece2 = c:K",
	"promotedPieceType = e:c",
	"promotionRegionWhite = *7 *8 *9",
	"promotionRegionBlack = *1 *2 *3",
	// Prince is a SECOND ROYAL (Shō Shogi rule): the side is lost only when
	// BOTH the king AND the prince are gone, and cannot be mated while it
	// still holds both. Fairy-Stockfish expresses co-royalty with
	// pseudo-royal extinction - the same mechanism its built-in chushogi and
	// the "chak" variant use for a king plus a promoted royal piece.
	"extinctionValue = loss",
	"extinctionPieceTypes = kc",
	"extinctionPseudoRoyal = true",
	"startFen = lnsgkgsnl/1r2e2b1/ppppppppp/9/9/9/PPPPPPPPP/1B2E2R1/LNSGKGSNL",
	""
].join("\n");
var config_model_levels_kotaishi_expert = {
	"name": "expert",
	"label": "Expert",
	"ai": "fairy-stockfish",
	"variant": "kotaishishogi",
	"skillLevel": 20,
	"moveTimeMs": 1000,
	"pocketGeometry": true,
	"customVariantIni": config_model_levels_kotaishi_expert_ini
}
var config_model_levels_15_kotaishi_expert = config_model_levels_15.concat([config_model_levels_kotaishi_expert]);
var config_model_levels_15_minishogi_expert = config_model_levels_15.concat([config_model_levels_minishogi_expert]);
var config_model_levels_15_kyotoshogi_expert = config_model_levels_15.concat([config_model_levels_kyotoshogi_expert]);
var config_model_levels_15_torishogi_expert = config_model_levels_15.concat([config_model_levels_torishogi_expert]);
var config_model_levels_15_spartan_expert = config_model_levels_15.concat([config_model_levels_spartan_expert]);
var config_model_levels_15_pemba_expert = config_model_levels_15.concat([config_model_levels_pemba_expert]);
var config_view_js_13 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"cazaux/shako-view.js"
]
var config_view_js_100 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"team-mate-view.js"
]
var config_view_js_101 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"multi-leg-view.js",
	"locust/werewolf-view.js"
]
var config_view_js_102 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"multi-leg-view.js",
	"locust/elven-view.js"
]
var config_view_js_103 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"famous/spartan-view.js"
]
var config_view_js_104 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"multi-leg-view.js",
	"decimal/scirocco-view.js"
]
var config_view_js_chu_seireigi = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/chu-seireigi-set-view.js",
	"drop-view.js",
	"shogi/chu-seireigi-view.js"
]
	var config_view_js_seireigi = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/seireigi-shogi-set-view.js",
	"drop-view.js",
	"shogi/seireigi-shogi-view.js"
]
	var config_view_js_kotaishi = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/kotaishi-shogi-set-view.js",
	"drop-view.js",
	"shogi/shogi-view.js"
]
var config_view_js_105 = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/shogi-set-view.js",
	"drop-view.js",
	"shogi/shogi-view.js"
]
var config_view_js_106 = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/tori-set-view.js",
	"drop-view.js",
	"shogi/tori-shogi-view.js"
]
var config_view_js_107 = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/shogi-set-view.js",
	"drop-view.js",
	"shogi/mini-shogi-view.js"
]
var config_view_js_108 = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/tenjiku-set-view.js",
	"multi-leg-view.js",
	"shogi/chu-shogi-view.js"
]
var config_view_js_tenjiku = [
	"base-view.js",
	"grid-board-view.js",
	"shogi/tenjiku-set-view.js",
	"multi-leg-view.js",
	"shogi/tenjiku-shogi-view.js"
]
var config_view_js_109 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"multi-leg-view.js",
	"locust/makromachy-view.js"
]
var config_view_js_110 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"multi-leg-view.js",
	"locust/minjiku-shogi-view.js"
]
var modelScripts_14 = [
	"base-model.js",
	"grid-geo-model.js",
	"famous/shatranj-model.js"
]
var config_model_gameOptions_levelOptions_3 = {
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
	"distPawnPromo1Factor": 0.15,
	"distPawnPromo2Factor": 0.05,
	"distPawnPromo3Factor": 0.025
}
var config_model_gameOptions_3 = {
	"preventRepeat": true,
	"uctTransposition": "state",
	"uctIgnoreLoop": false,
	"levelOptions": config_model_gameOptions_levelOptions_3
}
var config_view_js_14 = [
	"base-view.js",
	"grid-board-view.js",
	"shatranj-board-view.js",
	"nishapur-set-view.js",
	"famous/shatranj-view.js"
]
var modelScripts_15 = [
	"base-model.js",
	"grid-geo-model.js",
	"famous/basic-model.js"
]
var modelScripts_knightmate = [
	"base-model.js",
	"grid-geo-model.js",
	"standard/knightmate-model.js"
]
var config_model_rules = {
	"en": "famous/rules.html"
}
var config_model_credits = {
	"en": "famous/credits.html"
}
var config_view_js_15 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"famous/basic-view.js"
]
var config_view_skins_preload_4 = [
]
var config_view_skins_4 = {
	"name": "skin2d",
	"title": "2D Classic",
	"3d": false,
	"preload": config_view_skins_preload_4
}
var modelScripts_16 = [
	"base-model.js",
	"multiplan-geo-model.js",
	"3d/raumschach-model.js"
]
var config_view_skins_camera_targetBounds = [
	3000,
	3000,
	6000
]
var config_view_skins_preload_5 = [
	"image|/res/images/wikipedia.png",
	"image|/res/images/cancel.png",
	"image|/res/images/whitebg.png"
]
var config_view_skins_5 = {
	"name": "skin2d",
	"title": "2D Classic",
	"3d": false,
	"preload": config_view_skins_preload_5
}
var config_view_js_16 = [
	"base-view.js",
	"multiplan-board-view.js",
	"fairy-set-view.js",
	"3d/raumschach-view.js"
]
var modelScripts_17 = [
	"base-model.js",
	"hex-geo-model.js",
	"hex/glinski-model.js"
]
var config_view_css_2 = [
	"chessbase.css",
	"hex.css"
]
var config_view_skins_preload_6 = [
	"smoothedfilegeo|0|/res/ring-target-hexagon.js",
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
	"image|/res/staunton/king/king-normalmap.jpg"
]
var config_view_skins_camera_3 = {
	"fov": 45,
	"distMax": 50,
	"radius": 13.5,
	"elevationAngle": 45,
	"elevationMin": 0,
	"distMin": 0
}
var config_view_skins_6 = {
	"name": "skin3d",
	"title": "3D Classic",
	"3d": true,
	"preload": config_view_skins_preload_6,
	"world": config_view_skins_world,
	"camera": config_view_skins_camera_3
}
var config_view_skins_preload_7 = [
	"image|/res/images/wikipedia.png",
	"image|/res/images/whitebg.png",
	"image|/res/images/cancel.png"
]
var config_view_skins_7 = {
	"name": "skin2d",
	"title": "2D Classic",
	"3d": false,
	"preload": config_view_skins_preload_7
}
var config_view_skins_8 = [
	config_view_skins_6,
	config_view_skins_7
]
var config_view_js_17 = [
	"base-view.js",
	"hex-board-view.js",
	"staunton-set-view.js",
	"hex/glinski-view.js"
]
var modelScripts_18 = [
	"base-model.js",
	"hex-geo-model.js",
	"hex/brusky-model.js"
]
var config_view_js_18 = [
	"base-view.js",
	"hex-board-view.js",
	"staunton-set-view.js",
	"hex/brusky-view.js"
]
var modelScripts_19 = [
	"base-model.js",
	"hex-geo-model.js",
	"hex/devasa-model.js"
]
var config_view_js_19 = [
	"base-view.js",
	"hex-board-view.js",
	"staunton-set-view.js",
	"hex/devasa-view.js"
]
var modelScripts_20 = [
	"base-model.js",
	"hex-geo-model.js",
	"hex/mccooey-model.js"
]
var config_view_js_20 = [
	"base-view.js",
	"hex-board-view.js",
	"staunton-set-view.js",
	"hex/mccooey-view.js"
]
var modelScripts_21 = [
	"base-model.js",
	"hex-geo-model.js",
	"hex/shafran-model.js"
]
var config_view_skins_preload_8 = [
	"smoothedfilegeo|0|/res/ring-target-cylinder-v3.js",
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
	"image|/res/staunton/king/king-normalmap.jpg"
]
var config_view_js_21 = [
	"base-view.js",
	"hex-board-view.js",
	"staunton-set-view.js",
	"hex/shafran-view.js"
]
var modelScripts_22 = [
	"base-model.js",
	"cylinder-geo-model.js",
	"circular/circular-model.js"
]
var config_view_css_3 = [
	"chessbase.css",
	"circular.css"
]
var config_view_skins_camera_4 = {
	"fov": 45,
	"distMax": 50,
	"radius": 14.5,
	"elevationAngle": 45,
	"elevationMin": 0,
	"distMin": 0
}
var config_view_js_22 = [
	"base-view.js",
	"circular-board-view.js",
	"staunton-set-view.js",
	"circular/circular-view.js"
]
var modelScripts_23 = [
	"base-model.js",
	"cylinder-geo-model.js",
	"circular/byzantine-model.js"
]
var config_view_js_23 = [
	"base-view.js",
	"circular-board-view.js",
	"nishapur-set-view.js",
	"circular/byzantine-view.js"
]
var modelScripts_24 = [
	"base-model.js",
	"multiplan-geo-model.js",
	"3d/3dchess-model.js"
]
var modelScripts_space_spartan = [
	"base-model.js",
	"multiplan-geo-model.js",
	"3d/space-spartan-model.js"
]
var config_view_js_space_spartan = [
	"base-view.js",
	"multiplan-board-view.js",
	"fairy-set-view.js",
	"3d/space-spartan-view.js"
]
var config_view_js_24 = [
	"base-view.js",
	"multiplan-board-view.js",
	"staunton-set-view.js",
	"3d/3dchess-view.js"
]
var modelScripts_25 = [
	"base-model.js",
	"cylinder-geo-model.js",
	"circular/cylinder-model.js"
]
var config_view_skins_camera_target = [
	0,
	0,
	0
]
var config_view_js_25 = [
	"base-view.js",
	"grid-board-view.js",
	"cylinder-board-view.js",
	"staunton-set-view.js",
	"circular/cylinder-view.js"
]
var modelScripts_26 = [
	"base-model.js",
	"cubic-geo-model.js",
	"3d/cubic-model.js"
]
var config_view_js_26 = [
	"base-view.js",
	"cubic-board-view.js",
	"staunton-set-view.js",
	"3d/cubic-view.js"
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
var modelScripts_28 = [
	"base-model.js",
	"grid-geo-model.js",
	"famous/chess960-model.js"
]
var config_view_js_28 = [
	"base-view.js",
	"grid-board-view.js",
	"staunton-set-view.js",
	"famous/chess960-view.js"
]
var modelScripts_29 = [
	"base-model.js",
	"grid-geo-model.js",
	"cazaux/metamachy-model.js"
]
var config_view_skins_preload_9 = [
	"image|/res/images/cancel.png",
	"image|/res/images/whitebg.png",
	"image|/res/fairy/wikipedia-fairy-sprites.png"
]
var config_view_skins_9 = {
	"name": "skin2d",
	"title": "2D Classic",
	"3d": false,
	"preload": config_view_skins_preload_9
}
var config_view_js_29 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"cazaux/metamachy-view.js"
]
var modelScripts_capablanca = [

	"base-model.js",
	"grid-geo-model.js",
	"fairy-piece-model.js",
	"prelude-model.js",
	"capa10x8/capablanca-model.js"
]
var config_view_skins_preload_10 = [
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
	"smoothedfilegeo|0|/res/fairy/cardinal/cardinal.js",
	"image|/res/fairy/cardinal/cardinal-diffusemap.jpg",
	"image|/res/fairy/cardinal/cardinal-normalmap.jpg",
	"smoothedfilegeo|0|/res/fairy/marshall/marshall.js",
	"image|/res/fairy/marshall/marshall-diffusemap.jpg",
	"image|/res/fairy/marshall/marshall-normalmap.jpg"
]
var config_view_skins_10 = {
	"name": "skin3d",
	"title": "3D Classic",
	"3d": true,
	"preload": config_view_skins_preload_10,
	"world": config_view_skins_world,
	"camera": config_view_skins_camera
}
var config_view_skins_11 = [
	config_view_skins_10,
	config_view_skins_9
]
var config_view_js_30 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"capa10x8/capablanca-view.js"
]
var config_view_js_capablanca = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"prelude-view.js",
	"capa10x8/capablanca-view.js"
]
var config_view_skins_preload_11 = [
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
	"smoothedfilegeo|0|/res/fairy/cardinal/cardinal.js",
	"image|/res/fairy/cardinal/cardinal-diffusemap.jpg",
	"image|/res/fairy/cardinal/cardinal-normalmap.jpg"
]
var config_view_skins_12 = {
	"name": "skin3d",
	"title": "3D Classic",
	"3d": true,
	"preload": config_view_skins_preload_11,
	"world": config_view_skins_world,
	"camera": config_view_skins_camera
}
var config_view_skins_13 = [
	config_view_skins_12,
	config_view_skins_9
]
var modelScripts_34 = [
	"base-model.js",
	"grid-geo-model.js",
	"fairy-piece-model.js",
	"decimal/grand-model.js"
]
var modelScripts_hectochess = [
	"base-model.js",
	"grid-geo-model.js",
	"fairy-piece-model.js",
	"decimal/hectochess-model.js"
]
var modelScripts_heavychess = [
	"base-model.js",
	"grid-geo-model.js",
	"fairy-piece-model.js",
	"decimal/heavy-model.js"

]
var config_view_js_31 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"decimal/grand-view.js"
]
var modelScripts_35 = [
	"base-model.js",
	"grid-geo-model.js",
	"knighted/modern-model.js"
]
var config_view_js_32 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"knighted/modern-view.js"
]
var modelScripts_36 = [
	"base-model.js",
	"grid-geo-model.js",
	"knighted/chancellor-model.js"
]
var modelScripts_37 = [
	"base-model.js",
	"grid-geo-model.js",
	"decimal/wildebeest-model.js"
]
var config_view_js_33 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"decimal/wildebeest-view.js"
]
var modelScripts_38 = [
	"base-model.js",
	"smess-geo-model.js",
	"smess-model.js"
]
var config_view_js_34 = [
	"base-view.js",
	"grid-board-view.js",
	"smess-set-view.js",
	"smess-view.js"
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
var modelScripts_41 = [
	"base-model.js",
	"grid-geo-model.js",
	"amazon/amazon-model.js"
]
var config_view_js_37 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"amazon/amazon-view.js"
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
var modelScripts_43 = [
	"base-model.js",
	"grid-geo-model.js",
	"amazon/gustav3-model.js"
]
var config_view_js_39 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"amazon/gustav3-view.js"
]
var modelScripts_44 = [
	"base-model.js",
	"grid-geo-model.js",
	"decimal/hyderabad-model.js"
]
var config_view_js_40 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"decimal/hyderabad-view.js"
]
var modelScripts_45 = [
	"base-model.js",
	"grid-geo-model.js",
	"tressau/kaisergame-model.js"
]
var modelScripts_46 = [
	"base-model.js",
	"grid-geo-model.js",
	"tressau/sultangame-model.js"
]
var config_view_js_41 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"tressau/sultangame-view.js"
]
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
var modelScripts_48 = [
	"base-model.js",
	"grid-geo-model.js",
	"amazon/tutti-frutti-model.js"
]
var config_view_js_43 = [
	"base-view.js",
	"grid-board-view.js",
	"fairy-set-view.js",
	"amazon/tutti-frutti-view.js"
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

module.exports = {
	modelScripts, config_model_gameOptions_levelOptions, config_model_gameOptions,
	config_model_levels, config_model_levels_2, config_model_levels_3, config_model_levels_4,
	config_model_levels_5, config_model_levels_expert, config_model_levels_5_expert,
	config_model_levels_amazon_expert, config_model_levels_5_amazon_expert,
	config_model_levels_shako_expert, config_model_levels_pemba_expert_ini,
	config_model_levels_pemba_expert, config_model_levels_chancellor_expert,
	config_model_levels_5_chancellor_expert, config_model_levels_xiangqi_expert,
	config_model_levels_5_xiangqi_expert, config_model_levels_shatranj_expert,
	config_model_levels_5_shatranj_expert, config_model_levels_knightmate_expert,
	config_model_levels_5_knightmate_expert, config_model_levels_grand_expert,
	config_model_levels_5_grand_expert, config_model_levels_capablanca_missing_setups_ini,
	config_model_levels_capablanca_expert, config_model_levels_5_capablanca_expert,
	config_model_levels_antichess_expert, config_model_levels_5_antichess_expert,
	config_model_levels_chess960_expert, config_model_levels_5_chess960_expert,
	config_model_levels_makruk_expert, config_model_levels_5_makruk_expert,
	config_model_levels_wildebeest_expert_ini, config_model_levels_wildebeest_expert,
	config_model_levels_5_wildebeest_expert, config_model_levels_heavychess_expert_ini,
	config_model_levels_heavychess_expert, config_model_levels_5_heavychess_expert,
	config_model_levels_shogi_expert, config_model_levels_minishogi_expert,
	config_model_levels_kyotoshogi_expert, config_model_levels_torishogi_expert,
	config_model_levels_gardner_expert, config_model_levels_5_gardner_expert,
	config_model_levels_losalamos_expert, config_model_levels_5_losalamos_expert,
	config_model_levels_5_basic_expert, config_model_levels_mini4x4_expert_ini,
	config_model_levels_mini4x4_expert, config_model_levels_5_mini4x4_expert,
	config_model_levels_mini4x5_expert_ini, config_model_levels_mini4x5_expert,
	config_model_levels_5_mini4x5_expert, config_model_levels_micro4x5_expert_ini,
	config_model_levels_micro4x5_expert, config_model_levels_5_micro4x5_expert,
	config_model_levels_baby_expert_ini, config_model_levels_baby_expert,
	config_model_levels_5_baby_expert, config_model_levels_malett_expert_ini,
	config_model_levels_malett_expert, config_model_levels_5_malett_expert,
	config_model_levels_attack_expert_ini, config_model_levels_attack_expert,
	config_model_levels_5_attack_expert, config_model_levels_demi_expert_ini,
	config_model_levels_demi_expert, config_model_levels_5_demi_expert,
	config_model_levels_gustav3_expert, config_model_levels_5_gustav3_expert,
	config_model_levels_spartan_expert, config_model_levels_hectochess_expert_ini,
	config_model_levels_hectochess_expert, config_model_levels_5_hectochess_expert,
	config_model_levels_tuttifrutti_expert_ini, config_model_levels_tuttifrutti_expert,
	config_model_levels_5_tuttifrutti_expert, config_model_levels_courier_expert, config_view_css,
	config_view_defaultOptions, config_view_skins_preload, config_view_skins_world_lightPosition,
	config_view_skins_world_skyLightPosition, config_view_skins_world, config_view_skins_camera,
	config_view_skins, config_view_skins_camera_2, config_view_skins_preload_2,
	config_view_sounds, config_view_js, modelScripts_2, config_model_gameOptions_levelOptions_2,
	config_model_gameOptions_2, config_view_skins_world_lightPosition_2,
	config_view_skins_world_2, config_view_skins_preload_3, config_view_js_2, modelScripts_janggi,
	config_view_js_janggi, modelScripts_3, config_view_skins_2, config_view_skins_3,
	config_view_js_3, modelScripts_4, config_view_js_4, modelScripts_5, config_view_js_5,
	modelScripts_6, config_view_js_6, modelScripts_7, config_view_js_7, modelScripts_8,
	config_view_js_8, modelScripts_9, config_view_js_9, modelScripts_10, config_view_js_10,
	modelScripts_11, config_model_levels_6, config_model_levels_7, config_model_levels_8,
	config_model_levels_9, config_model_levels_10, config_model_levels_10_courier_expert,
	config_view_js_11, modelScripts_12, config_view_skins_world_lightPosition_3,
	config_view_skins_world_3, config_view_js_12, modelScripts_13, modelScripts_100,
	modelScripts_rococo, config_view_js_rococo, modelScripts_rocaille, config_view_js_rocaille,
	modelScripts_ultima, config_view_js_ultima, modelScripts_101, modelScripts_102,
	modelScripts_103, modelScripts_104, modelScripts_seireigi, modelScripts_chu_seireigi,
	modelScripts_105, modelScripts_106, modelScripts_107, modelScripts_108,
	config_model_gameOptions_levelOptions_tenjiku, config_model_gameOptions_tenjiku,
	config_model_levels_mateSearch_tenjiku, config_model_levels_tenjiku, modelScripts_tenjiku,
	modelScripts_109, modelScripts_110, modelScripts_kyoto, modelScripts_kotaishi,
	config_model_levels_11, config_model_levels_12, config_model_levels_13,
	config_model_levels_14, config_model_levels_15, config_model_levels_15_shako_expert,
	config_model_levels_15_shogi_expert, config_model_levels_kotaishi_expert_ini,
	config_model_levels_kotaishi_expert, config_model_levels_15_kotaishi_expert,
	config_model_levels_15_minishogi_expert, config_model_levels_15_kyotoshogi_expert,
	config_model_levels_15_torishogi_expert, config_model_levels_15_spartan_expert,
	config_model_levels_15_pemba_expert, config_view_js_13, config_view_js_100,
	config_view_js_101, config_view_js_102, config_view_js_103, config_view_js_104,
	config_view_js_chu_seireigi, config_view_js_seireigi, config_view_js_kotaishi,
	config_view_js_105, config_view_js_106, config_view_js_107, config_view_js_108,
	config_view_js_tenjiku, config_view_js_109, config_view_js_110, modelScripts_14,
	config_model_gameOptions_levelOptions_3, config_model_gameOptions_3, config_view_js_14,
	modelScripts_15, modelScripts_knightmate, config_model_rules, config_model_credits,
	config_view_js_15, config_view_skins_preload_4, config_view_skins_4, modelScripts_16,
	config_view_skins_camera_targetBounds, config_view_skins_preload_5, config_view_skins_5,
	config_view_js_16, modelScripts_17, config_view_css_2, config_view_skins_preload_6,
	config_view_skins_camera_3, config_view_skins_6, config_view_skins_preload_7,
	config_view_skins_7, config_view_skins_8, config_view_js_17, modelScripts_18,
	config_view_js_18, modelScripts_19, config_view_js_19, modelScripts_20, config_view_js_20,
	modelScripts_21, config_view_skins_preload_8, config_view_js_21, modelScripts_22,
	config_view_css_3, config_view_skins_camera_4, config_view_js_22, modelScripts_23,
	config_view_js_23, modelScripts_24, modelScripts_space_spartan, config_view_js_space_spartan,
	config_view_js_24, modelScripts_25, config_view_skins_camera_target, config_view_js_25,
	modelScripts_26, config_view_js_26, modelScripts_27, config_view_js_27, modelScripts_28,
	config_view_js_28, modelScripts_29, config_view_skins_preload_9, config_view_skins_9,
	config_view_js_29, modelScripts_capablanca, config_view_skins_preload_10,
	config_view_skins_10, config_view_skins_11, config_view_js_30, config_view_js_capablanca,
	config_view_skins_preload_11, config_view_skins_12, config_view_skins_13, modelScripts_34,
	modelScripts_hectochess, modelScripts_heavychess, config_view_js_31, modelScripts_35,
	config_view_js_32, modelScripts_36, modelScripts_37, config_view_js_33, modelScripts_38,
	config_view_js_34, modelScripts_39, config_view_js_35, modelScripts_40, config_view_js_36,
	modelScripts_41, config_view_js_37, modelScripts_42, config_view_js_38, modelScripts_43,
	config_view_js_39, modelScripts_44, config_view_js_40, modelScripts_45, modelScripts_46,
	config_view_js_41, modelScripts_47, config_view_js_42, modelScripts_48, config_view_js_43,
	modelScripts_49, config_view_js_44, modelScripts_tera, config_view_js_tera, modelScripts_giga,
	config_view_js_giga, modelScripts_lca, config_view_js_lca, modelScripts_wtamerlane,
	config_view_js_wtamerlane, modelScripts_fantasticXIII, config_view_js_fantasticXIII,
	modelScripts_bigorra, config_view_js_bigorra, modelScripts_pemba, config_view_js_pemba,
	modelScripts_gigaII, config_view_js_gigaII, modelScripts_timurid, modelScripts_gross,
	config_view_js_timurid, config_view_js_duodecimal, modelScripts_zanzibars,
	config_view_js_zanzibars, modelScripts_acedrex, config_view_js_acedrex
};
