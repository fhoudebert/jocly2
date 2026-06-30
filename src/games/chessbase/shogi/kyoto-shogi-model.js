
(function(){
	var geometry = Model.Game.cbDropGeometry(5,5,0);
	
	Model.Game.cbOnStaleMate = -1; // stalemate = last player wins
	Model.Game.cbMaxRepeats = 4;
	Model.Game.cbSetPawnLimit(2);

  Model.Game.cbPerpEval = function(board, aGame) {
		var loop = aGame.GetRepeatOccurence(board, 1) >> 1;
		if(board.oppoCheck >= loop) return -board.mWho;
		if(board.check >= loop) return board.mWho;
		return JocGame.DRAW; // draw if neither is perpetually checking
  }

	Model.Game.cbMateEval = function(board) { // detect Pawn-drop mate
		/*var m = board.lastMove;
		var piece = board.pieces[board.board[m.t]];
		if(piece.t < 2) { // Pawn
		  var f = geometry.C(m.f);
		  if(f==1 || f==geometry.width-2) return board.mWho; // dropped: flip result
		}
		return -board.mWho;*/
return board.mWho;
  }

	Model.Game.cbDefine = function() {
		
		var $this = this;
		
		var definition = {
			
			geometry: geometry,
			
			pieceTypes: {

				0: {
					name: 'pawn-w',
					aspect: 'sh-pawn',
					graph: this.cbDropGraph(geometry, [[0,1]],[]),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:1,p:6}],
					demoted: 1,
					hand: 0,
				},
				1: {
					name: 'pawn-b',
					aspect: 'sh-pawn',
					graph: this.cbDropGraph(geometry, [[0,-1]],[]),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:-1,p:38}],
					demoted: 0,
					hand: 0,
				},
				2: {
					name: 'silver-w',
					aspect: 'sh-silver',
					graph: this.cbDropGraph(geometry, [[0,1],[1,1],[1,-1],[-1,1],[-1,-1]],[]),
					value: 6.4,
					abbrev: 'S',
					initial: [{s:1,p:3}],
					demoted: 3,
					hand: 1,
				},
				3: {
					name: 'silver-b',
					aspect: 'sh-silver',
					graph: this.cbDropGraph(geometry, [[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],[]),
					value: 6.4,
					abbrev: 'S',
					initial: [{s:-1,p:41}],
					demoted: 2,
					hand: 1,
				},
				4: {
					// Functionally this is a promoted Silver (it moves like
					// a Bishop, matching Fairy-Stockfish's own
					// promotedPieceType[SILVER]=BISHOP for kyotoshogi) -
					// renamed/re-abbreviated from the original "bishop"/"B"
					// to align with the official engine's own piece
					// letters, so this game's FEN can be sent to
					// Fairy-Stockfish directly. The move graph itself is
					// unchanged - only the name/abbrev (cosmetic/notation)
					// are different from the original Jocly authoring.
					name: 'p-silver',
					aspect: 'sh-bishop',
					graph: this.cbDropGraph(geometry, [],[[1,1],[1,-1],[-1,1],[-1,-1]]),
					value: 8.9,
					abbrev: '+S',
					demoted: 4,
					hand: 1,
					
				},
				5: {
					// Functionally a promoted Pawn (moves like a Rook,
					// matching Fairy-Stockfish's promotedPieceType[SHOGI_PAWN]=ROOK
					// for kyotoshogi) - see the note on type 4 above for why
					// this is renamed/re-abbreviated from the original
					// "rook"/"R".
					name: 'p-pawn',
					aspect: 'sh-rook',
					graph: this.cbDropGraph(geometry, [], [[0,1],[1,0],[-1,0],[0,-1]]),
					value: 10.4,
					abbrev: '+P',
					castle: false,
					demoted: 5,
					hand: 0,
				},
				6: {
					// Functionally a promoted Knight (moves like Gold,
					// matching Fairy-Stockfish's
					// promotedPieceType[SHOGI_KNIGHT]=GOLD for kyotoshogi) -
					// see the note on type 4 above for why this is
					// renamed/re-abbreviated from the original "gold-w"/"G".
					name: 'p-knight-w',
					aspect: 'sh-gold',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1]],[]),
					value: 6.9,
					abbrev: '+N',
					initial: [{s:1,p:5}],
					demoted: 7,
					hand: 2,
				},
				7: {
					name: 'p-knight-b',
					aspect: 'sh-gold',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,-1],[-1,-1]],[]),
					value: 6.9,
					abbrev: '+N',
					initial: [{s:-1,p:39}],
					demoted: 6,
					hand: 2,
				},
				8: {
					// Functionally a promoted Lance (moves like Gold,
					// matching Fairy-Stockfish's
					// promotedPieceType[LANCE]=GOLD for kyotoshogi) - see
					// the note on type 4 above for why this is
					// renamed/re-abbreviated from the original
					// "p-pawn-w"/"+P" (there is no "real" promoted pawn in
					// Kyoto Shogi distinct from this one - see type 5 above,
					// which is the actual promoted-pawn piece, using "+P").
					name: 'p-lance-w',
					aspect: 'sh-tokin',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1]],[]),
					value: 4.2,
					abbrev: '+L',
					initial: [{s:1,p:2}],
					demoted: 9,
					hand: 3,
				},
				9: {
					name: 'p-lance-b',
					aspect: 'sh-tokin',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,-1],[-1,-1]],[]),
					value: 4.2,
					abbrev: '+L',
					initial: [{s:-1,p:42}],
					demoted: 8,
					hand: 3,
				},
				10: {
					name: 'lance-w',
					aspect: 'sh-lance',
					graph: this.cbDropGraph(geometry, [],[[0,1]]),
					value: 4.3,
					abbrev: 'L',
					demoted: 11,
					hand: 3,
				},
				11: {
					name: 'lance-b',
					aspect: 'sh-lance',
					graph: this.cbDropGraph(geometry, [],[[0,-1]]),
					value: 4.3,
					abbrev: 'L',
					demoted: 10,
					hand: 3,
				},
				
				12: {
					name: 'horse',
					aspect: 'sh-horse',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1]],[[1,1],[1,-1],[-1,1],[-1,-1]]),
					value: 11.5,
					abbrev: '+B',
					//demoted: 4,
				},
				14: {
					name: 'king',
					aspect: 'sh-jade',
					isKing: true,
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]],[]),
					abbrev: 'K',
					initial: [{s:1,p:4}],
				},
				15: {
					name: 'king',
					aspect: 'sh-king',
					isKing: true,
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]],[]),
					abbrev: 'K',
					initial: [{s:-1,p:40}],
				},
				16: {
					name: 'knight-w',
					aspect: 'sh-knight',
					graph: this.cbDropGraph(geometry, [[1,2],[-1,2]],[]),
					value: 4.5,
					abbrev: 'N',
					initial: [],
					demoted: 17,
					hand: 2,
					
				},
				
				17: {
					name: 'knight-b',
					aspect: 'sh-knight',
					graph: this.cbDropGraph(geometry, [[1,-2],[-1,-2]],[]),
					value: 4.5,
					abbrev: 'N',
					initial: [],
					demoted: 16,
					hand: 2,
					
				},
				
			},
			
			promote: function(aGame,piece,move) {

				var column = geometry.C(move.f);
				
                var promos = [];
                if( piece.t===0 || piece.t===1) {
                    promos.push(5);
				}

                if(piece.s == 1) {
	                if( piece.t===6 ) {
						promos.push(16);
					}
					if( piece.t===2 ) {
						promos.push(4);
					}
					if( piece.t===16 ) {
						promos.push(6);
					}
					if( piece.t===8) {
	                    promos.push(10);
					}
					if( piece.t===10) {
						promos.push(8);
					}
					if( piece.t===4 ) {
						promos.push(2);
					}
					if( piece.t===5) {
						promos.push(0);
					}
				}
				else{

	                if( piece.t===7 ) {
						promos.push(17);
					}
					
					if( piece.t===3 ) {
						promos.push(4);
					}
					
	                if( piece.t===17 ) {
						promos.push(7);
					}
					
					if( piece.t===9 ) {
						promos.push(11);
					}
					
					if( piece.t===11 ) {
						promos.push(9);
					}
					
					if( piece.t===4) {
						promos.push(3);
					}
					
					if( piece.t===5 ) {
	        
						promos.push(1);
					}
				}
                if(column < 2 || column > 6){
                    promos.push(piece.t);
                }
				return promos;
			},

			evaluate: function(aGame,evalValues,material) {

			},

		};

		return this.cbAddHoldings(geometry, definition);
	}

})();
