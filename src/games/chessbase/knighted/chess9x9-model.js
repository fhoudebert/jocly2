/*
 * Copyright(c) 2013-2014 - jocly.com
 *
 * You are allowed to use and modify this source code as long as it is exclusively for use in the Jocly API. 
 *
 * Original authors: Jocly team
 *
 */
 
/*
 * The two 9x9 variants, behind one prelude.
 *
 *   Modern      RNBMKQBNR / rnbqkmbnr   Maura, 1968. A Minister (Bishop +
 *                                       Knight), and the bishop swap.
 *   Chancellor  RNBQKCNBR / rnbqkcnbr   Foster, 1889. A Chancellor (Rook +
 *                                       Knight), and no swap.
 *
 * The riskiest of the three merges done so far, because what differs is not
 * only the array: Modern carries a RULE the other does not have. A player may
 * once per game exchange a Bishop with the piece beside it, which is how a
 * Bishop changes square colour, and it is implemented by overriding
 * GenerateMoves, ApplyMove and CopyFrom.
 *
 * A flag set when the prelude is answered would have been the obvious way to
 * switch it, and it would have been wrong: a position loaded mid-game skips
 * the prelude - see cbPreludeFromBoard - and would keep whatever the previous
 * game left, offering swap moves in a Chancellor game or withholding them in a
 * Modern one. The rule is therefore read off the position instead. Only Modern
 * has Ministers, promotion cannot create one in a Chancellor game (the choice
 * is built from the pieces a side owns), and a captured piece stays in the
 * piece list with its position set to -1 - so "this game has Ministers" is
 * true for the whole of a Modern game and false for the whole of a Chancellor
 * one, whatever route the position arrived by. It is cached on the board and
 * carried by CopyFrom, since GenerateMoves runs millions of times in a search.
 */

(function() {
	
	var geometry = Model.Game.cbBoardGeometryGrid(9,9);
	
	Model.Game.cbDefine = function() {
		
		return {
			
			geometry: geometry,
			
			pieceTypes: {

				0: {
					name: 'pawn-w',
					aspect: 'fr-pawn',
					graph: this.cbPawnGraph(geometry,1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					epCatch: true,
				},
				
				1: {
					name: 'ipawn-w',
					aspect: 'fr-pawn',
					graph: this.cbInitialPawnGraph(geometry,1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:1,p:9},{s:1,p:10},{s:1,p:11},{s:1,p:12},{s:1,p:13},{s:1,p:14},{s:1,p:15},{s:1,p:16},{s:1,p:17}],
					epTarget: true,
				},
				
				2: {
					name: 'pawn-b',
					aspect: 'fr-pawn',
					graph: this.cbPawnGraph(geometry,-1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					epCatch: true,
				},

				3: {
					name: 'ipawn-b',
					aspect: 'fr-pawn',
					graph: this.cbInitialPawnGraph(geometry,-1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:-1,p:63},{s:-1,p:64},{s:-1,p:65},{s:-1,p:66},{s:-1,p:67},{s:-1,p:68},{s:-1,p:69},{s:-1,p:70},{s:-1,p:71}],
					epTarget: true,
				},
				
				4: {
					name: 'knight',
					aspect: 'fr-knight',
					graph: this.cbKnightGraph(geometry),
					value: 2.9,
					abbrev: 'N',
					initial: [{s:1,p:1},{s:1,p:7},{s:-1,p:73},{s:-1,p:79}],
				},
				
				5: {
					name: 'bishop',
					aspect: 'fr-bishop',
					graph: this.cbBishopGraph(geometry),
					value: 3.1,
					abbrev: 'B',
					initial: [{s:1,p:2},{s:1,p:6},{s:-1,p:74},{s:-1,p:78}],
				},

				6: {
					name: 'rook',
					aspect: 'fr-rook',
					graph: this.cbRookGraph(geometry),
					value: 5,
					abbrev: 'R',
					initial: [{s:1,p:0},{s:1,p:8},{s:-1,p:72},{s:-1,p:80}],
					castle: true,
				},

				7: {
					name: 'queen',
					aspect: 'fr-queen',
					graph: this.cbQueenGraph(geometry),
					value: 9,
					abbrev: 'Q',
					initial: [{s:1,p:5},{s:-1,p:75}],
				},
				
				8: {
					name: 'king',
					aspect: 'fr-king',
					isKing: true,
					graph: this.cbKingGraph(geometry),
					abbrev: 'K',
					initial: [{s:1,p:4},{s:-1,p:76}],
				},
								
	            10: {
	            	name: 'minister',
	            	aspect: 'fr-cardinal',
					graph: this.cbMergeGraphs(geometry,
            			this.cbBishopGraph(geometry),
						this.cbKnightGraph(geometry)),
	            	value: 6,
	            	abbrev: 'M',
	            	initial: [{s:1,p:3},{s:-1,p:77}],
	            },

				9: {
					name: 'chancellor',
					aspect: 'fr-marshall',
					graph: this.cbMergeGraphs(geometry,
						this.cbRookGraph(geometry),
						this.cbKnightGraph(geometry)),
					value: 7.8,
					abbrev: 'C',
					// no `initial`: a Chancellor appears through its own
					// arrangement or a promotion, never at the start of Modern
				},
			},
			
			promote: function(aGame,piece,move) {
				if(piece.t==1)
					return [0];
				else if(piece.t==3)
					return [2];
				else if(piece.t==0 && geometry.R(move.t)==8)
					return whitePromotes;
				else if(piece.t==2 && geometry.R(move.t)==0)
					return blackPromotes;
				return [];
			},

			/*
			 * Loading a recorded game must not re-open the two buttons. The
			 * arrangement is readable from a starting position, as for the
			 * other prelude games.
			 */
			cbPreludeFromBoard: true,

			prelude: [{
				panelWidth: 2,
				setups: ["RNBMKQBNR", "RNBQKCNBR"],
				labels: ["Modern", "Chancellor"],
				squares: { 1: [], '-1': [] },
				// Rook, Knight, Bishop, Queen and whichever compound the
				// arrangement owns - built from the board, so neither list is
				// written out here
				participants: whitePromotes,
				blackParticipants: blackPromotes,
				persistent: true,
				custom: function(setup, board, aGame) {
					if(setup==CHANCELLOR) {
						var back = ARRANGEMENTS[setup];
						for(var file=0; file<9; file++) {
							board.pieces[board.board[file]].t = TYPE[back.white[file]];
							board.pieces[board.board[72+file]].t = TYPE[back.black[file]];
						}
						board.cbPlacePieces(aGame);
						if(board.mWho<0)
							board.zSign ^= aGame.wKey(1);
					}
					// recomputed on the next call, now that the pieces are set
					board.cbSwapRule = undefined;
				},
			}, 0],
			castle: {
				"4/0": {k:[3,2],r:[1,2,3],n:"O-O-O"},
				"4/8": {k:[5,6],r:[7,6,5],n:"O-O"},
				"76/72": {k:[75,74],r:[73,74,75],n:"O-O-O"},
				"76/80": {k:[77,78],r:[79,78,77],n:"O-O"},
			},
			
		};
	}

	var MINISTER = 10;
	var CHANCELLOR = 1;
	var TYPE = { N:4, B:5, R:6, Q:7, K:8, C:9, M:10 };

	// each back rank read a1..i1 and a9..i9
	var ARRANGEMENTS = [
		{ white: "RNBMKQBNR", black: "RNBQKMBNR" },   // Modern, Black mirrored
		{ white: "RNBQKCNBR", black: "RNBQKCNBR" },   // Chancellor, file order
	];

	var whitePromotes = [];
	var blackPromotes = [];

	/*
	 * Whether the bishop swap is part of this game, read off the position
	 * rather than remembered from the prelude, so that a game loaded from a
	 * recorded position gets the right answer too. Cached because
	 * GenerateMoves asks on every node of the search.
	 */
	function BishopSwapRule(board) {
		if(board.cbSwapRule===undefined) {
			board.cbSwapRule=false;
			for(var i=0;i<board.pieces.length;i++)
				if(board.pieces[i].t==MINISTER) {
					board.cbSwapRule=true;
					break;
				}
		}
		return board.cbSwapRule;
	}

	var bishopPoss={ 2:[1,3], 6:[5,7], 74:[73,75], 78:[77,79] };
	
	var SuperModelBoardGenerateMoves=Model.Board.GenerateMoves;
	Model.Board.GenerateMoves = function(aGame) {
		SuperModelBoardGenerateMoves.apply(this,arguments); // call regular GenerateMoves method
		if(this.lastMove.f==-2)
			return;    // still in the prelude: the only moves are the buttons,
			           // and appending swaps to them offered four extra
			           // arrangements that do not exist
		if(!BishopSwapRule(this))
			return;                                          // Chancellor has no swap
		if(!this.bishopSwap || !this.bishopSwap[this.mWho]) { // consider bishop swap rule
			for(var pos in bishopPoss) {
				var pieceIndex=this.board[pos];
				if(pieceIndex>=0) {
					var piece=this.pieces[pieceIndex];
					if(piece.s==this.mWho && piece.m==false) { // piece of our side and not moved yet
						for(var i=0;i<bishopPoss[pos].length;i++) {
							var pos1=bishopPoss[pos][i];
							var pieceIndex1=this.board[pos1];
							if(pieceIndex1>=0) {
								var piece1=this.pieces[pieceIndex1];
								if(piece1.m==false) { // piece to swap bishop with has not moved yet
									this.board[pos1]=pieceIndex;
									this.board[pos]=pieceIndex1;
									this.pieces[pieceIndex].p=pos;
									this.pieces[pieceIndex1].p=pos1;									
									var oppInCheck=this.cbGetAttackers(aGame,this.kings[-this.mWho],-this.mWho,true).length>0;
									this.board[pos]=pieceIndex;
									this.board[pos1]=pieceIndex1;
									this.pieces[pieceIndex1].p=pos1;
									this.pieces[pieceIndex].p=pos;						
									this.mMoves.push({
										f: piece.p,
										t: piece1.p,
										c: null,
										ck: oppInCheck,
										a: 'B',
									});
								}
							}
						}
					}
				}
			}
		}
	}
	
	var SuperModelBoardCopyFrom = Model.Board.CopyFrom;
	Model.Board.CopyFrom = function(aBoard) {
		SuperModelBoardCopyFrom.apply(this,arguments);
		this.cbSwapRule = aBoard.cbSwapRule;
		if(aBoard.bishopSwap!==undefined)
			this.bishopSwap = {
				"1": aBoard.bishopSwap["1"],
				"-1": aBoard.bishopSwap["-1"],
			}
	}

	var SuperModelBoardApplyMove=Model.Board.ApplyMove;
	Model.Board.ApplyMove = function(aGame,move) {
		if(BishopSwapRule(this) && move.f in bishopPoss) {
			var piece=this.pieces[this.board[move.f]];
			if(piece.m==false) {
				var pieceIndex1=this.board[move.t];
				if(pieceIndex1>=0) {
					var piece1=this.pieces[pieceIndex1];
					if(piece1.s==this.mWho && piece1.m==false) { // this is a bishop swap: special apply handler
						this.zSign^=aGame.bKey(piece);
						this.zSign^=aGame.bKey(piece1);
						this.board[move.f]=pieceIndex1;
						piece1.p=move.f;
						this.board[move.t]=piece.i;
						piece.p=move.t;
						this.zSign^=aGame.bKey(piece);
						this.zSign^=aGame.bKey(piece1);
						this.check=!!move.ck;
						if(!this.bishopSwap)
							this.bishopSwap={};
						this.bishopSwap[this.mWho]=true; // make sure we don't swap twice
						return;
					}
				}
			}
		}
		SuperModelBoardApplyMove.apply(this,arguments);
	}
	
})();
