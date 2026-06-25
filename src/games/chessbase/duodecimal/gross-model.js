/*
 * Copyright(c) 2013-2014 - jocly.com
 *
 * You are allowed to use and modify this source code as long as it is exclusively for use in the Jocly API. 
 *
 * Original authors: Jocly team
 *
 */
 


(function() {
	
	var geometry = Model.Game.cbBoardGeometryGrid(12,12);
	
	Model.Game.cbDefine=function(){
        p = this.cbPiecesFromFEN(geometry, "mavwx2xwvam/1ronbqkbnor1/pppppppppppp/12/12/12/12/12/12/PPPPPPPPPPPP/1RONBQKBNOR1/MAVWX2XWVAM");
        p.setValues({P:0.95, N:3, B:3.8, R:5, Q:10, M:8.9, A:7.5, W:4.5, O:4.8, X:3.6, V:2.3});
        p.setProperty("vao","aspect","fr-bow");
        p.setProperty("cannon","aspect","fr-cannon2");      
        
		return {
			
			geometry: geometry,
			
			pieceTypes: p.pieceTypes,
			
			/*castle: p.castle,*/

			castle: {
				"18/13": {k:[17],r:[13,14,15,16,17,18],n:"O-O-O",extra:-3},
				"18/22": {k:[19],r:[22,21,20,19,18],n:"O-O",extra:-2},
				"126/121": {k:[125],r:[121,122,123,124,125,126],n:"O-O-O",extra:-3},
				"126/130": {k:[127],r:[130,129,128,127,126],n:"O-O",extra:-2},
			},
			promote: function(aGame,piece,move) {

				var r=geometry.R(move.t);
				if((piece.t==0 && r<9) || (piece.t==1 &&  r>2)) {
					return [];
				}
				var considerTypes;
				if((piece.t==0 && r==9 ) || (piece.t==1 && r==2)) {
					//T_bishop,T_knight,T_vao,T_wizard : 3,5,9,10
					considerTypes={ 5:4, 3:4,9:2,10:2};

				}else if((piece.t==0 && r==10 ) || (piece.t==1 && r==1)){
					//T_cannon,T_champion,T_rook : 11,6,8
					considerTypes={ 5:4, 3:4,9:2,10:2,11:2,8:4,6:2};

				}else if((piece.t==0 && r==11 ) || (piece.t==1 && r==0)){
					 //T_marshall,T_archbishop,T_queen : 4,2,7
					considerTypes={ 5:4, 3:4,9:2,10:2,11:2,8:4,6:2,4:2, 2:2, 7:2};
				}
	            if((piece.t==0 && r<=11 && r>=9) || (piece.t==1 && r>=0 && r<=2)) {   
					for(var i=0;i<this.pieces.length;i++) {
						var piece1=this.pieces[i];
						
						if(piece1.s==piece.s // piece from our side 
								&& piece1.p>=0 // in play
								&& (piece1.t in considerTypes)) // promotable piece type
	                        considerTypes[piece1.t]--;
					}
					var promo=[];
					
					for(var t in considerTypes) // create an array of types from our types map
	                    if(considerTypes[t]>0)
	                        promo.push(t);
					if(r!=0 && r!=11)
						promo.unshift(piece.t);
					/*else if(promo.length==0)
						return null;*/ // last line but no captured piece to promote to: move is not possible
					return promo;
				}
				return [];
			},

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
				
				// check 64 moves without capture
				if(this.noCaptCount>=128) {
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
