(function() {
	
	var geometry = Model.Game.cbBoardGeometryGrid(12,12);
	
	var confine = {};

	for(var pos=0;pos<geometry.boardSize;pos++) {
		confine[pos]=1;
	}
	Model.Game.cbDefine = function() {
		
		var $this = this;
		
		/*
		 * Movement/capture graph for the Unicorn
		 */
	function UnicornGraph(side) {
		
	    var lastCol=11;	
        var lastRow=11;

		var flags = $this.cbConstants.FLAG_MOVE | $this.cbConstants.FLAG_CAPTURE;
		var graph={};
		
		for(var pos=0;pos<geometry.boardSize;pos++) {
			if(confine && !(pos in confine)){
				graph[pos]=[];
				continue;
			}
			var directions=[];
			[[1,2],[2,1],[1,-2],[2,-1],[-1,2],[-2,1],[-1,-2],[-2,-1]].forEach(function(delta) { // loop on all 8 diagonals
				var movedir = [Math.sign(delta[0]),Math.sign(delta[1])];
				var pos1=geometry.Graph(pos,delta);
				if(pos1!=null && (!confine || (pos1 in confine))) {
					var direction=[pos1 | $this.cbConstants.FLAG_MOVE | $this.cbConstants.FLAG_CAPTURE | $this.cbConstants.FLAG_STOP];
					//directions.push($this.cbTypedArray(direction));
					var nbMax = Math.max(lastRow , lastCol) - 1;
					var away=[] // hold the sliding line
					for(var n=1;n<nbMax;n++) {
						var delta2=[movedir[0]*n,movedir[1]*n];
						var pos2=geometry.Graph(pos1,delta2);
						if(pos2!=null && (!confine || (pos2 in confine))) {
							if(n==1) // possible to slide at least 1 cell, make sure the diagonal cell is not occupied, but cannot move to this cell
								away.push(pos1 | $this.cbConstants.FLAG_STOP);
							away.push(pos2 | flags | $this.cbConstants.FLAG_STOP);
						}
					}
					if(away.length>0)
						directions.push($this.cbTypedArray(away));
				}
			});
			graph[pos]=directions;
		}

		return $this.cbMergeGraphs(geometry,
		   $this.cbShortRangeGraph(geometry,[[1,2],[2,1],[1,-2],[2,-1],[-1,2],[-2,1],[-1,-2],[-2,-1]]),
		   graph
		);
	}

	
		
		/*
		 * Movement/capture graph for the eagle
		 */
		function EagleGraph() {
			var flags = $this.cbConstants.FLAG_MOVE | $this.cbConstants.FLAG_CAPTURE;
			var graph={};
			for(var pos=0;pos<geometry.boardSize;pos++) {
				graph[pos]=[];
				[[-1,-1],[-1,1],[1,-1],[1,1]].forEach(function(delta) { // loop on all 4 diagonals
					var pos1=geometry.Graph(pos,delta);
					if(pos1!=null) {
						for(var dir=0;dir<2;dir++) { // dir=0 for row, dir=1 for column
							var away=[] // hold the sliding line
							for(var n=1;n<11;n++) { // board is 12 cells long, so only consider max 11 cell displacements
								var delta2=[];
								delta2[dir]=delta[dir]*n;
								delta2[1-dir]=0; // delta2 is now only about moving orthogonally, away from the piece
								var pos2=geometry.Graph(pos1,delta2);
								if(pos2!=null) {
									if(n==1) // possible to slide at least 1 cell, make sure the diagonal cell is not occupied, but cannot move to this cell
										away.push(pos1 | $this.cbConstants.FLAG_STOP);
									away.push(pos2 | flags);
								}
							}
							if(away.length>0)
								graph[pos].push($this.cbTypedArray(away));
						}
					}					
				});
			}
			return $this.cbMergeGraphs(geometry,
			   $this.cbShortRangeGraph(geometry,[[-1,-1],[-1,1],[1,-1],[1,1]]),
			   graph
			);
		}
		
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
					epCatch: false,
				},
				
				1: {
					name: 'ipawn-w',
					aspect: 'fr-pawn',
					graph: this.cbInitialPawnGraph(geometry,1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:1,p:36},{s:1,p:37},{s:1,p:38},{s:1,p:39},{s:1,p:40},{s:1,p:41},{s:1,p:42},{s:1,p:43},{s:1,p:44},{s:1,p:45},{s:1,p:46},{s:1,p:47}],
					epTarget: true,
					epCatch: false,
				},
				
				2: {
					name: 'pawn-b',
					aspect: 'fr-pawn',
					graph: this.cbPawnGraph(geometry,-1),
					value: 0.9,
					abbrev: '',
					fenAbbrev: 'P',
					epCatch: false,

				},

				3: {
					name: 'ipawn-b',
					aspect: 'fr-pawn',
					graph: this.cbInitialPawnGraph(geometry,-1),
					value: 0.9,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:-1,p:96},{s:-1,p:97},{s:-1,p:98},{s:-1,p:99},{s:-1,p:100},{s:-1,p:101},{s:-1,p:102},{s:-1,p:103},{s:-1,p:104},{s:-1,p:105},{s:-1,p:106},{s:-1,p:107}],
					epTarget: true,
					epCatch: false,
				},
				
				4: {
	            	name: 'anqa',
	            	aspect: 'fr-griffon',
	            	graph: EagleGraph(),
	            	value: 9,
	            	abbrev: 'A',
	            	initial: [{s:1,p:5},{s:-1,p:137}],
	            },	
				5: {
					name: 'cockatrice',
					aspect: 'fr-bishop',
					graph: this.cbBishopGraph(geometry),
					value: 4,
					abbrev: 'B',
					initial: [{s:1,p:4},{s:1,p:7},{s:-1,p:136},{s:-1,p:139}],
				},

				6: {
					name: 'roque',
					aspect: 'fr-rook',
					graph: this.cbRookGraph(geometry),
					value: 5.2,
					abbrev: 'R',
					initial: [{s:1,p:0},{s:1,p:11},{s:-1,p:132},{s:-1,p:143}],
					// no castling in Grant Acedrex - the King has its own
					// privilege instead, handled in GenerateMoves below
				},
				7: {
	            	name: 'leon',
	            	aspect: 'fr-lion',
	            	graph: this.cbShortRangeGraph(geometry,[
						[-1,3],[0,3],[1,3],[3,1],[3,0],[3,-1],[-1,-3],[0,-3],
						[1,-3],[-3,-1],[-3,0],[-3,1]]),
	            	value: 4.2,
	            	abbrev: 'L',
	            	initial: [{s:1,p:1},{s:1,p:10},{s:-1,p:133},{s:-1,p:142}],
	            },	
				8: {
					name: 'rey',
					aspect: 'fr-king',
					isKing: true,
					graph: this.cbKingGraph(geometry),
					abbrev: 'K',
					initial: [{s:1,p:6},{s:-1,p:138}],
				},
				9: {
	            	name : 'zaraffa',
	            	abbrev : 'Z',
	            	aspect : 'fr-giraffe',
	            	graph : this.cbShortRangeGraph(geometry,[[-3,-2],[-3,2],[3,-2],[3,2],[2,3],[2,-3],[-2,3],[-2,-3]]),
	            	value : 2.5,
	            	initial: [{s:1,p:3},{s:1,p:8},{s:-1,p:135},{s:-1,p:140}],
	            },
				10: {
	            	name: 'unicornio',
	            	aspect: 'fr-rhino',
	            	graph: UnicornGraph(),
	            	value: 8,
	            	abbrev: 'U',
	            	initial: [{s:1,p:2},{s:1,p:9},{s:-1,p:134},{s:-1,p:141}],
	            },			

			},
			/*
			 * A Pawn reaching the far side becomes the piece belonging to the
			 * file it lands on; on the King's file (g) it becomes an Anqa, as
			 * does one landing on the Anqa's own file (f). Both armies start
			 * with the same back rank, so one table by file serves both.
			 */
			promote: function(aGame,piece,move) {

				var PROMOTION = [6,7,10,9,5,4,4,5,9,10,7,6]; // by file, a..l
				var rank = geometry.R(move.t);

				if(rank==11 && (piece.t==0 || piece.t==1))
					return [PROMOTION[geometry.C(move.t)]];
				if(rank==0 && (piece.t==2 || piece.t==3))
					return [PROMOTION[geometry.C(move.t)]];

				// Otherwise an unmoved Pawn turns into a moved one, which is
				// what takes its double step away. Without this the initial
				// type is never left behind and every Pawn keeps the double
				// step for the whole game, from any square.
				if(piece.t==1)
					return [0];
				if(piece.t==3)
					return [2];

				return [];
			},

		};
	}

	/*
	 * Model.Board.GenerateMoves:
	 *   - handle the King's privilege: on its first move it may go two squares
	 *     in any of the eight directions, leaping over the square in between
	 *     even when that one is occupied ("as does the Alfferza"). It may not
	 *     capture with that jump, may not use it to escape a check, and - the
	 *     codex being silent, the reading followed here and by the Game
	 *     Courier preset - may not pass over a square the opponent attacks.
	 *
	 * Each entry is [ destination, square passed over ]. Both squares are
	 * tested for check, the second one being the reason the intermediate must
	 * be right: with the wrong square the game asks the wrong question and
	 * both allows and forbids the jump for the wrong reasons.
	 *
	 * Only five entries per side: the Kings start on the edge rank, so the
	 * two backwards jumps and the backwards diagonals fall off the board. The
	 * knight-like jumps that the commented-out lines used to add are NOT part
	 * of the privilege - the text says the Alfferza's move, which is the
	 * second square in a straight line.
	 */
	var kingLongMoves={
		"1": {   // White's King on g1 (6)
			6: [ [4,5], [8,7], [30,18], [28,17], [32,19] ],
		},
		"-1": {  // Black's King on g12 (138)
			138: [ [140,139], [136,137], [114,126], [116,127], [112,125] ],
		},
	}
	
		var SuperModelBoardGenerateMoves=Model.Board.GenerateMoves;
	Model.Board.GenerateMoves = function(aGame) {

		SuperModelBoardGenerateMoves.apply(this,arguments); // call regular GenerateMoves method
		// now consider special 2 cases king moves
		var kPiece=this.pieces[this.board[this.kings[this.mWho]]];
		if(!kPiece.m && !this.check) {


			var lMoves=kingLongMoves[this.mWho][kPiece.p];
			for(var i=0;i<lMoves.length;i++) {
				var lMove=lMoves[i];
				if(this.board[lMove[0]]>=0)
					continue;
				var canMove=true;
				var oppInCheck=false;
				for(var j=0;j<lMove.length;j++) {
					var pos=lMove[j];
					var tmpOut=this.board[pos];
					this.board[pos]=-1; // remove possible piece to prevent problems when quick-applying/unapplying
					var undo=this.cbQuickApply(aGame,{
						f: kPiece.p,
						t: pos,
					});
					var inCheck=this.cbGetAttackers(aGame,pos,this.mWho,true).length>0;
					if(!inCheck && j==0)
						oppInCheck=this.cbGetAttackers(aGame,this.kings[-this.mWho],-this.mWho,true).length>0;
					this.cbQuickUnapply(aGame,undo);
					this.board[pos]=tmpOut;
					this.cbIntegrity(aGame);
					if(inCheck) {
						canMove=false;
						break;
					}
				}
				if(canMove)
					this.mMoves.push({
						f: kPiece.p,
						t: lMove[0],
						c: null,
						ck: oppInCheck,
						a: 'K',
					});
			}
		}
	}

	/*
	 * Model.Board.ApplyMove overriding: setup phase and king special move
	 */
	var SuperModelBoardApplyMove=Model.Board.ApplyMove;
	Model.Board.ApplyMove = function(aGame,move) {
		
			SuperModelBoardApplyMove.apply(this,arguments);
	}

	Model.Board.customGen = function(moves, move, aBoard) {



		//move.c == null
		var mid = move.f + move.t >> 1; // jumped-over square
		var victim = aBoard.board[mid];

		if(victim < 0) return; // slide did already reach move.t

		moves.push({ // reach target through jump
			f: move.f,
			t: move.t,
			c: move.c,
			a: move.a
		});

		if(aBoard.pieces[victim].s != aBoard.mWho) // jumped over foe
			moves.push({ // also try to capture it
				f: move.f,
				t: move.t,
				c: move.c,
				via: mid,
				kill: victim,
				a: move.a
			});
	}

	
})();
