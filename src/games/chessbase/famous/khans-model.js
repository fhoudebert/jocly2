/*
 * Khan's Chess (Couch Tomato, 2023-2024), as described on
 * https://www.pychess.org/variants/khans - a rebalanced successor to Orda
 * Chess. Two asymmetric armies on a plain 8x8 board:
 *
 *  - the Kingdom (White) is the standard FIDE army, unchanged;
 *  - the Horde (Black, "Gold") is entirely horse-based. Every one of its
 *    pieces MOVES as a knight (or knight+king for the kheshig), but most of
 *    them CAPTURE differently - they are "divergent" pieces, like the pawn:
 *
 *      Horde piece    counterpart   move          capture/check
 *      -----------    -----------   ----          -------------
 *      Scout    (S)   pawn          4 fwd knight  1 square straight fwd
 *      Khatun   (T)   queen         knight        king
 *      Archer   (A)   bishop        knight        bishop
 *      Kheshig  (H)   knight        knight+king   knight+king
 *      Lancer   (L)   rook          knight        rook
 *
 *    The Horde's king is called the khan; it is a plain king (the different
 *    name and symbol are purely thematic) and keeps the "K" abbreviation.
 *
 * Rules that differ from chess, and how they are obtained here:
 *  - the Horde cannot castle: it simply owns no piece with "castle: true",
 *    and the castle table below only lists the Kingdom's two entries;
 *  - stalemate is a LOSS for the side to move: cbOnStaleMate = -1;
 *  - campmate: moving one's own king to the opposite edge rank (without
 *    moving into check) wins the game. This is the only rule with no
 *    ready-made mechanism in base-model.js - see evaluate() below;
 *  - pawns promote as in chess, but scouts promote to a khatun only;
 *  - no en passant is reachable (the Horde has no double-stepping piece and
 *    scouts cannot capture sideways), so the pawns are declared without
 *    epTarget/epCatch rather than relying on the capture never coming up.
 *
 * The piece letters below (P N B R Q K / s l a t h k) are those of
 * Fairy-Stockfish's own "khans" variant definition, so that
 * ExportBoardState() produces a FEN the engine accepts as-is, with no
 * pieceMap needed on the "fairy-stockfish" level.
 *
 * Start position:
 *   lhatkahl/ssssssss/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 0 1
 */

(function() {

	var geometry = Model.Game.cbBoardGeometryGrid(8,8);

	var c = Model.Game.cbConstants;
	var MOVE = c.FLAG_MOVE, CAPTURE = c.FLAG_CAPTURE;

	var KNIGHT_STEPS = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
	var KING_STEPS = [[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]];
	var ORTHO_STEPS = [[0,1],[1,0],[0,-1],[-1,0]];
	var DIAG_STEPS = [[1,1],[1,-1],[-1,-1],[-1,1]];

	// The Horde plays downwards (side -1), so "forward" is -1 on the rank
	// axis. Only the Horde owns directional pieces, hence a single direction
	// is enough here (unlike the pawn-w/pawn-b pairs of a symmetric game).
	var SCOUT_MOVE_STEPS = [[1,-2],[-1,-2],[2,-1],[-2,-1]]; // the 4 forward knight jumps
	var SCOUT_CAPTURE_STEPS = [[0,-1]];                     // one square straight ahead

	Model.Game.cbOnStaleMate = -1; // being unable to move loses

	// The 50-move counter is reset by captures and by "pawn" moves, and the
	// Horde has no pawns: its scouts play that role, exactly as the engine is
	// told with "nMoveRuleTypesBlack = s". The list has to be explicit - left
	// to itself base-model.js guesses the leading run of types sharing the
	// first abbrev, which here stops after the Kingdom's two pawn types and
	// would leave scout moves counting towards a draw the engine would not
	// award.
	Model.Game.cbPawnTypes = [0,1,7];

	Model.Game.cbDefine = function() {

		var $this = this;

		// move as one piece, capture as another
		function Divergent(moveGraph, captureGraph) {
			return $this.cbMergeGraphs(geometry, moveGraph, captureGraph);
		}

		function KnightMoveGraph() {
			return $this.cbShortRangeGraph(geometry, KNIGHT_STEPS, 0, MOVE);
		}

		return {

			geometry: geometry,

			pieceTypes: {

				/* ---------------- Kingdom (White) ---------------- */

				0: {
					name: 'pawn',
					aspect: 'fr-pawn',
					graph: this.cbPawnGraph(geometry,1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					epCatch: false,
				},

				1: {
					name: 'ipawn',
					aspect: 'fr-pawn',
					graph: this.cbInitialPawnGraph(geometry,1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:1,p:8},{s:1,p:9},{s:1,p:10},{s:1,p:11},
						  {s:1,p:12},{s:1,p:13},{s:1,p:14},{s:1,p:15}],
					epTarget: false,
				},

				2: {
					name: 'knight',
					aspect: 'fr-knight',
					graph: this.cbKnightGraph(geometry),
					value: 2.9,
					abbrev: 'N',
					initial: [{s:1,p:1},{s:1,p:6}],
				},

				3: {
					name: 'bishop',
					aspect: 'fr-bishop',
					graph: this.cbBishopGraph(geometry),
					value: 3.1,
					abbrev: 'B',
					initial: [{s:1,p:2},{s:1,p:5}],
				},

				4: {
					name: 'rook',
					aspect: 'fr-rook',
					graph: this.cbRookGraph(geometry),
					value: 5,
					abbrev: 'R',
					initial: [{s:1,p:0},{s:1,p:7}],
					castle: true,
				},

				5: {
					name: 'queen',
					aspect: 'fr-queen',
					graph: this.cbQueenGraph(geometry),
					value: 9,
					abbrev: 'Q',
					initial: [{s:1,p:3}],
				},

				6: {
					name: 'king',
					aspect: 'fr-king',
					isKing: true,
					graph: this.cbKingGraph(geometry),
					abbrev: 'K',
					initial: [{s:1,p:4}],
				},

				/* ---------------- Horde (Gold) ---------------- */

				7: {
					name: 'scout',
					aspect: 'fr-scout',
					graph: Divergent(
						this.cbShortRangeGraph(geometry, SCOUT_MOVE_STEPS, 0, MOVE),
						this.cbShortRangeGraph(geometry, SCOUT_CAPTURE_STEPS, 0, CAPTURE)),
					value: 1,
					abbrev: 'S',
					fenAbbrev: 'S',
					initial: [{s:-1,p:48},{s:-1,p:49},{s:-1,p:50},{s:-1,p:51},
						  {s:-1,p:52},{s:-1,p:53},{s:-1,p:54},{s:-1,p:55}],
					epCatch: false,
					epTarget: false,
				},

				8: {
					name: 'lancer',
					aspect: 'fr-marshall',
					graph: Divergent(
						KnightMoveGraph(),
						this.cbLongRangeGraph(geometry, ORTHO_STEPS, 0, CAPTURE)),
					value: 4.5,
					abbrev: 'L',
					initial: [{s:-1,p:56},{s:-1,p:63}],
				},

				9: {
					name: 'archer',
					aspect: 'fr-bow',
					graph: Divergent(
						KnightMoveGraph(),
						this.cbLongRangeGraph(geometry, DIAG_STEPS, 0, CAPTURE)),
					value: 4,
					abbrev: 'A',
					initial: [{s:-1,p:58},{s:-1,p:61}],
				},

				10: {
					name: 'kheshig',
					aspect: 'fr-crowned-knight',
					graph: this.cbMergeGraphs(geometry,
						this.cbKnightGraph(geometry),
						this.cbKingGraph(geometry)),
					value: 6.5,
					abbrev: 'H',
					initial: [{s:-1,p:57},{s:-1,p:62}],
				},

				11: {
					name: 'khatun',
					aspect: 'fr-duchess',
					graph: Divergent(
						KnightMoveGraph(),
						this.cbShortRangeGraph(geometry, KING_STEPS, 0, CAPTURE)),
					value: 2.5,
					abbrev: 'T',
					initial: [{s:-1,p:59}],
				},

				12: {
					name: 'khan',
					// A crown without the cross of the Kingdom's king: royal at
					// a glance, but not the same piece. The 2D sprite of
					// fr-emperor is the king's own, which would leave the two
					// armies' royals identical on the flat board.
					aspect: 'fr-prince',
					isKing: true,
					graph: this.cbKingGraph(geometry),
					abbrev: 'K',
					initial: [{s:-1,p:60}],
				},

			},

			promote: function(aGame,piece,move) {
				if(piece.t==1)                                  // pawn left its start square
					return [0];
				if(piece.t==0 && geometry.R(move.t)==7)         // pawn promotes as in chess
					return [2,3,4,5];
				if(piece.t==7 && geometry.R(move.t)==0)         // scout promotes to khatun only
					return [11];
				return [];
			},

			// Kingdom only: the Horde has no rook-like piece flagged "castle"
			// and no entry here, so no castle move can ever be generated for it.
			castle: {
				"4/0": {k:[3,2],r:[1,2,3],n:"O-O-O"},
				"4/7": {k:[5,6],r:[6,5],n:"O-O"},
			},

			evaluate: function(aGame,evalValues,material,totalPieces) {

				var height=geometry.height;         // 8
				var lastRank=height-1;              // 7

				// --- campmate: a king reaching the far edge rank wins ---
				// GenerateMoves() has already discarded any king move into
				// check, so a king standing there did reach it legally.
				var whiteKingRank=geometry.R(this.kings[1]);
				var blackKingRank=geometry.R(this.kings[-1]);
				if(whiteKingRank==lastRank) {
					this.mFinished=true;
					this.mWinner=1;
					return;
				}
				if(blackKingRank==0) {
					this.mFinished=true;
					this.mWinner=-1;
					return;
				}

				// check 50 moves without capture
				if(this.noCaptCount>=100) {
					this.mFinished=true;
					this.mWinner=JocGame.DRAW;
					return;
				}

				// --- the race to the enemy camp ---
				// Without this term campmate is only seen once it falls inside
				// the search horizon, and the AI walks into a lost race.
				evalValues['kingCamp']=whiteKingRank-(lastRank-blackKingRank);

				// Bishop pair (penalize single Bishop)
				if(material[1].count[3]==1)
					evalValues.pieceValue-=0.25;

				// motivate pawns and scouts to reach the promotion line
				var distPromo=aGame.cbUseTypedArrays?new Int8Array(3):[0,0,0];
				var pawns=material[1].byType[0];
				if(pawns)
					for(var i=0;i<pawns.length;i++)
						switch(height-geometry.R(pawns[i].p)) {
						case 2: distPromo[0]++; break;
						case 3: distPromo[1]++; break;
						case 4: distPromo[2]++; break;
						}
				var scouts=material[-1].byType[7];
				if(scouts)
					for(var i=0;i<scouts.length;i++)
						switch(geometry.R(scouts[i].p)) {
						case 1: distPromo[0]--; break;
						case 2: distPromo[1]--; break;
						case 3: distPromo[2]--; break;
						}
				if(distPromo[0]!=0)
					evalValues['distPawnPromo1']=distPromo[0];
				if(distPromo[1]!=0)
					evalValues['distPawnPromo2']=distPromo[1];
				if(distPromo[2]!=0)
					evalValues['distPawnPromo3']=distPromo[2];

				// motivate minor pieces to deploy early: knights and bishops
				// for the Kingdom (types 2 and 3), lancers and archers for the
				// Horde (types 8 and 9). The kheshigs (10) are deliberately
				// left out - the Horde wants them home until the endgame - and
				// so is the khatun (11), which defends better than it attacks.
				var minorPiecesMoved=0;
				[[1,2],[1,3],[-1,8],[-1,9]].forEach(function(spec) {
					var pieces=material[spec[0]].byType[spec[1]];
					if(pieces)
						for(var i=0;i<pieces.length;i++)
							if(pieces[i].m)
								minorPiecesMoved+=spec[0];
				});
				if(minorPiecesMoved!=0)
					evalValues['minorPiecesMoved']=minorPiecesMoved;
			},

		};
	}

})();
