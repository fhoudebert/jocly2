/*
 * The two 4x5 minichess variants, behind one prelude.
 *
 *   Mini 4x5   RQKR / rqkr, four Pawns a side
 *   Micro 4x5  RBNK / knbr, ONE Pawn a side (White d2, Black a4)
 *
 * Harder to merge than the 5x5 trio, because the two do not hold the same
 * pieces NOR the same number of them: Mini has two Rooks and a Queen and no
 * minor pieces, Micro a Rook, a Bishop, a Knight and no Queen, and six of the
 * eight Pawns are simply absent from it.
 *
 * The declarative half of a prelude only re-types pieces already standing on
 * a fixed list of squares - it cannot add or remove any - so the whole setup
 * goes through the `custom` hook. The board starts as Mini, the arrangement
 * with the most men, and choosing Micro re-types the two back ranks and parks
 * six Pawns off the board by setting their position to -1, which is how
 * base-model represents a captured piece: cbPlacePieces skips them and
 * Evaluate does not count them.
 *
 * The promotion choice differs too - Rook or Queen against Knight, Bishop or
 * Rook - and that one is free: the prelude builds the list from the pieces
 * the chosen side actually owns, which is exactly right for both.
 */

(function() {
	
	var geometry = Model.Game.cbBoardGeometryGrid(4,5);

	var MICRO = 1;
	var TYPE = { N:4, B:5, R:6, Q:7, K:8 };

	// each back rank read a1..d1 and a5..d5
	var ARRANGEMENTS = [
		{ white: "RQKR", black: "RQKR" },   // Mini, the two ranks in file order
		{ white: "RBNK", black: "KNBR" },   // Micro, Black's rank mirrored
	];

	// the six Pawns Micro does not have: White keeps d2, Black keeps a4
	var GONE = [4,5,6,13,14,15];

	// Mini has no castling at all, and an empty table is how that is said to
	// a piece type that carries the flag: the generator looks the move up and
	// finds nothing.
	var miniCastle = {};
	var microCastle = {
		"3/0": {k:[2,1],r:[1,2],n:"O-O"},
		"16/19": {k:[17,18],r:[18,17],n:"O-O"},
	};

	// Rook and Queen under Mini, Knight, Bishop and Rook under Micro. The
	// prelude rebuilds both from the pieces each side owns once the
	// arrangement is chosen, so nothing here needs to know which is which.
	var whitePromotes = [];
	var blackPromotes = [];
	
	Model.Game.cbDefine = function() {
		
		return {
			
			geometry: geometry,
			
			pieceTypes: {

				0: {
					name: 'pawn-w',
					aspect: 'pawn',
					graph: this.cbPawnGraph(geometry,1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					epCatch: true,
				},
				
				1: {
					name: 'ipawn-w',
					aspect: 'pawn',
					graph: this.cbInitialPawnGraph(geometry,1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:1,p:4},{s:1,p:5},{s:1,p:6},{s:1,p:7}],
					epCatch: true,
					epTarget: true,
				},
				
				2: {
					name: 'pawn-b',
					aspect: 'pawn',
					graph: this.cbPawnGraph(geometry,-1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					epCatch: true,
				},

				3: {
					name: 'ipawn-b',
					aspect: 'pawn',
					graph: this.cbInitialPawnGraph(geometry,-1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:-1,p:12},{s:-1,p:13},{s:-1,p:14},{s:-1,p:15}],
					epCatch: true,
					epTarget: true,
				},

				4: {
					name: 'knight',
					graph: this.cbKnightGraph(geometry),
					value: 2.9,
					abbrev: 'N',
					// no `initial`: a Knight only ever appears through the
					// Micro arrangement or a promotion
				},

				5: {
					name: 'bishop',
					graph: this.cbBishopGraph(geometry),
					value: 3.1,
					abbrev: 'B',
				},

				6: {
					name: 'rook',
					graph: this.cbRookGraph(geometry),
					value: 5,
					abbrev: 'R',
					initial: [{s:1,p:0},{s:1,p:3},{s:-1,p:16},{s:-1,p:19}],
					// Only Micro castles, but a piece type cannot carry a flag
					// per arrangement. Mini keeps an empty castling table, so
					// no castling is ever generated for it - see `castle`
					// below. The flag does leave Mini a castling term in the
					// evaluation that it had not before; it is symmetric
					// between the two sides and worth a tenth of a Pawn.
					castle: true,
				},

				7: {
					name: 'queen',
					graph: this.cbQueenGraph(geometry),
					value: 9,
					abbrev: 'Q',
					initial: [{s:1,p:1},{s:-1,p:17}],
				},
				
				8: {
					name: 'king',
					isKing: true,
					graph: this.cbKingGraph(geometry),
					abbrev: 'K',
					initial: [{s:1,p:2},{s:-1,p:18}],
				},
				
			},
			
			promote: function(aGame,piece,move) {
				if(piece.t==1)
					return [0];
				else if(piece.t==3)
					return [2];
				else if(piece.t==0 && geometry.R(move.t)==4)
					return whitePromotes;
				else if(piece.t==2 && geometry.R(move.t)==0)
					return blackPromotes;
				return [];
			},

			castle: miniCastle,

			/*
			 * Loading a recorded game must not re-open the two buttons. The
			 * arrangement is readable from a starting position, so the flag
			 * holds here as it does for Capablanca and MiniChess 5x5.
			 */
			cbPreludeFromBoard: true,

			prelude: [{
				panelWidth: 2,
				setups: ["RQKR", "RBNK"],
				labels: ["Mini", "Micro"],
				squares: { 1: [], '-1': [] },
				castle: [miniCastle, microCastle],
				// filled from the board once the arrangement is set, which is
				// what gives each one its own promotion choice
				participants: whitePromotes,
				blackParticipants: blackPromotes,
				persistent: true,
				custom: function(setup, board, aGame) {
					if(setup!=MICRO)
						return;
					var back = ARRANGEMENTS[setup];
					for(var file=0; file<4; file++) {
						board.pieces[board.board[file]].t = TYPE[back.white[file]];
						board.pieces[board.board[16+file]].t = TYPE[back.black[file]];
					}
					// Micro keeps one Pawn a side; the other six leave the
					// board the way a captured piece does
					GONE.forEach(function(pos) {
						board.pieces[board.board[pos]].p = -1;
					});
					board.cbPlacePieces(aGame);
					if(board.mWho<0)
						board.zSign ^= aGame.wKey(1);
				},
			}, 0],
			
			evaluate: function(aGame,evalValues,material) {
				// check lack of material to checkmate
				var white=material[1].count;
				var black=material[-1].count;
				if(!white[0] && !white[1] && !white[4] && !white[5] && !white[6] && !white[7]) { // white king single
					if(!black[2] && !black[3] && !black[6] && !black[7] && (black[4]+black[5]<2 || black[5]<2)) {
						this.mFinished=true;
						this.mWinner=JocGame.DRAW;
					}
				}
				if(!black[2] && !black[3] && !black[4] && !black[5] && !black[6] && !black[7]) { // black king single
					if(!white[0] && !white[1] && !white[6] && !white[7] && (white[4]+white[5]<2 || white[5]<2)) {
						this.mFinished=true;
						this.mWinner=JocGame.DRAW;
					}
				}
				
				// check 50 moves without capture
				if(this.noCaptCount>=100) {
					this.mFinished=true;
					this.mWinner=JocGame.DRAW;					
				}
				
				// motivate pawns to reach the promotion line
				var distPromo=aGame.cbUseTypedArrays?new Int8Array(3):[0,0,0];
				var height=geometry.height;
				var pawns=material[1].byType[0],pawnsLength;
				if(pawns) {
					pawnsLength=pawns.length;
					for(var i=0;i<pawnsLength;i++)
						switch(height-geometry.R(pawns[i].p)) {
						case 2: distPromo[0]++; break;
						case 3: distPromo[1]++; break;
						case 4: distPromo[2]++; break;
						}
				}
				pawns=material[-1].byType[2],pawnsLength;
				if(pawns) {
					pawnsLength=pawns.length;
					for(var i=0;i<pawnsLength;i++)
						switch(geometry.R(pawns[i].p)) {
						case 1: distPromo[0]--; break;
						case 2: distPromo[1]--; break;
						case 3: distPromo[2]--; break;
						}
				}
				if(distPromo[0]!=0)
					evalValues['distPawnPromo1']=distPromo[0];
				if(distPromo[1]!=0)
					evalValues['distPawnPromo2']=distPromo[1];
				if(distPromo[2]!=0)
					evalValues['distPawnPromo3']=distPromo[2];
				
				// motivate knights and bishops to deploy early
				var minorPiecesMoved=0;
				for(var t=4;t<=5;t++)
					for(var s=1;s>=-1;s-=2) {
						var pieces=material[s].byType[t];
						if(pieces)
							for(var i=0;i<pieces.length;i++)
								if(pieces[i].m)
									minorPiecesMoved+=s;
					}
				if(minorPiecesMoved!=0) {
					evalValues['minorPiecesMoved']=minorPiecesMoved;
				}
			},
			
		};
	}
	
})();