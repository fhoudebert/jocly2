/*
 * Copyright(c) 2013-2014 - jocly.com
 *
 * You are allowed to use and modify this source code as long as it is exclusively for use in the Jocly API. 
 *
 * Original authors: Jocly team
 *
 */
 


(function() {
	
	var geometry = Model.Game.cbBoardGeometryGrid(10,10);
	
	Model.Game.cbDefine=function(){
        p = this.cbPiecesFromFEN(geometry, "r8r/1nbqkmabn1/pppppppppp/10/10/10/10/PPPPPPPPPP/1NBQKMABN1/R8R");
        p.setValues({P:1, N:2.9, B:3.1, R:5, Q:9, M:7.8, A:6});

        /** custom promotion rules */
        p.promote=function(aGame,piece,move) {
				
			var r=geometry.R(move.t);
			

			if((piece.t==0 && r<=9 && r>=7) || (piece.t==1 && r>=0 && r<=2)) {
                // rook:7, knight:5, bishop:3, queen:6, marshall:4, archbishop:2
               /* var T_knight = p.name2nr['knight'];
                var T_bishop = p.name2nr['bishop'];
                var T_queen = p.name2nr['queen'];
                var T_rook = p.name2nr['rook'];
                var T_marshall = p.name2nr['marshall'];
                var T_archbishop = p.name2nr['archbishop'];*/

                var considerTypes={ 5:2, 3:2, 7:2, 6:1, 4:1, 2:1 };
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
				if(r!=0 && r!=9)
					promo.unshift(piece.t);
				else if(promo.length==0)
					return null; // last line but no captured piece to promote to: move is not possible
				return promo;
			}
			return [];
		}
        return p;
    }

	
})();
