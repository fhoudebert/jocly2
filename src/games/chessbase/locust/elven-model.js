
(function(){

	var geometry=Model.Game.cbBoardGeometryGrid(10,10);

	Model.Game.minimumBridge=10; // switch on anti-trading; no side catch allows it

	Model.Game.cbDefine=function(){

		/*
		 * The Warlock is the Chu Shogi Lion: a King's move, up to twice a
		 * turn, the first step optionally a hop. FLAG_HITRUN gives the second
		 * step after a CAPTURE; FLAG_SPECIAL adds it after a quiet first step,
		 * whose only useful continuation is back to where it started - "it can
		 * effectively pass a turn by moving to a neighboring empty square and
		 * back". Without it the Warlock could pass only by eating something
		 * and returning.
		 */
		var hitrun = this.cbConstants.FLAG_HITRUN | this.cbConstants.FLAG_SPECIAL;

		var p = this.cbPiecesFromFEN(geometry, 'r3k4r/ynbdqlhbny/pppppppppp/10/10/10/10/PPPPPPPPPP/YNBHLQDBNY/R4K3R');

		p.addMoves('lion',this.cbShortRangeGraph(geometry,[[1,0],[0,1],[-1,0],[0,-1], [1,1],[1,-1],[-1,1],[-1,-1]], null, hitrun));
		p.setProperty('lion','value',15);     // upgrade value of Lion, to account for hit & run capture
		p.setProperty('lion','antiTrade',-1); // trading ban, including counterstrike

		p.setValues({Y:'dwarf',H:'elf',D:'goblin',L:'warlock'},'name');
		p.setValues({H:'E',D:'G',L:'W'},'abbrev'); p.setProperty('man','abbrev','D');

		p.promoZone=3;
		p.promoChoice = [7,6,8,2]; // B(2) !D(3) !H(4) !L(5) N(6) Q(7) R(8)

		/*
		 * Piece types by name. What follows addresses them by number, and the
		 * numbers came in with the code it was copied from: there 2 is a black
		 * Pawn and 4 and 5 are the Knight and the Bishop, here they are the
		 * Bishop, the Elf and the Warlock. So the term that pushes Pawns
		 * towards promotion was counting Black's BISHOPS, and the one that
		 * rewards early development was watching the Elf and the Warlock.
		 */
		var TYPE = {};
		for(var t in p.pieceTypes)
			TYPE[p.pieceTypes[t].name] = parseInt(t);

		return{
			geometry:geometry,

			pieceTypes: p.pieceTypes,

			promote: p.promote,

			castle: p.castle,

			evaluate: function(aGame,evalValues,material,totalPieces) {
				// check lack of material to checkmate
				var white=material[1].count;
				var black=material[-1].count;
				if(totalPieces[1] == 1) { // white king single
					var n = totalPieces[-1];
					if(n<4 && (black[TYPE['knight']]==2
						|| n==2 && black[TYPE['knight']]+black[TYPE['bishop']] || n==1)) {
						this.mFinished=true;
						this.mWinner=JocGame.DRAW;
					}
				}
				if(totalPieces[-1] == 1) { // black king single
					var n = totalPieces[1];
					if(n<4 && (white[TYPE['knight']]==2
						|| n==2 && white[TYPE['knight']]+white[TYPE['bishop']] || n==1)) {
						this.mFinished=true;
						this.mWinner=JocGame.DRAW;
					}
				}
				
				// check 50 moves without capture
				if(this.noCaptCount>=100) {
					this.mFinished=true;
					this.mWinner=JocGame.DRAW;					
				}
				
				// Bishop pair (penalize single Bishop)
				if(white[TYPE['bishop']]==1) evalValues.pieceValue-=0.25;
				if(black[TYPE['bishop']]==1) evalValues.pieceValue+=0.25;
				
				// motivate pawns to reach the promotion line
				var distPromo=aGame.cbUseTypedArrays?new Int8Array(3):[0,0,0];
				var height=geometry.height;
				var pawns=material[1].byType[TYPE['pawnw']],pawnsLength;
				if(pawns) {
					pawnsLength=pawns.length;
					for(var i=0;i<pawnsLength;i++)
						switch(height-geometry.R(pawns[i].p)) {
						case 4: distPromo[0]++; break;
						case 5: distPromo[1]++; break;
						case 6: distPromo[2]++; break;
						}
				}
				// ... and Black's, which were read from the Bishop's slot
				pawns=material[-1].byType[TYPE['pawnb']];
				if(pawns) {
					pawnsLength=pawns.length;
					for(var i=0;i<pawnsLength;i++)
						switch(geometry.R(pawns[i].p)) {
						case 3: distPromo[0]--; break;
						case 4: distPromo[1]--; break;
						case 5: distPromo[2]--; break;
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
				[TYPE['knight'],TYPE['bishop']].forEach(function(type) {
					for(var s=1;s>=-1;s-=2) {
						var pieces=material[s].byType[type];
						if(pieces)
							for(var i=0;i<pieces.length;i++)
								if(pieces[i].m)
									minorPiecesMoved+=s;
					}
				});
				if(minorPiecesMoved!=0) {
					evalValues['minorPiecesMoved']=minorPiecesMoved;
				}
			},
			
		};
	}
})();
