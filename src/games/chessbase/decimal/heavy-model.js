(function() {
	
	var geometry = Model.Game.cbBoardGeometryGrid(10,10);
	
	Model.Game.cbDefine=function(){
        p = this.cbPiecesFromFEN(geometry, "madq2qdam/jrnbtkbnrj/pppppppppp/10/10/10/10/PPPPPPPPPP/JRNBTKBNRJ/MADQ2QDAM");
        p.setProperty("dragon-king","aspect","fr-crowned-rook");
        p.setValues({P:0.83, N:2.7, B:3.4, R:4.6, Q:9, M:8, A:6.7, T:13, J:6.4, D:6.5});

        var ww = p.addPiece({
			name: 'missionnary',
			aspect : 'fr-crowned-bishop',
			graph : this.cbMergeGraphs(geometry,
                  this.cbKingGraph(geometry),
                  this.cbBishopGraph(geometry)),
			value: 5.3,
			abbrev: 'L',
			initial: [{s:1,p:4},{s:1,p:5},{s:-1,p:94},{s:-1,p:95}],
		});

        /*
         * Piece types by name. Everything below used to address them by
         * number, with the numbers of ORTHODOX chess - copied along with the
         * code, where 4, 5, 6, 7 are the Knight, Bishop, Rook and Queen. Here
         * they are the Dragon King, the Centaur, the Marshall and the Knight,
         * and the real Queen, Rook, Amazon and Missionary have numbers the
         * tests never looked at. The consequence was not subtle: a King and
         * Queen against a bare King was declared a draw the moment the
         * position appeared, and so were King and Rook, King and Amazon, King
         * and Missionary.
         */
        var TYPE = {};
        for(var t in p.pieceTypes)
            TYPE[p.pieceTypes[t].name] = parseInt(t);

        // the two pieces that cannot force mate on their own
        var MINORS = [TYPE['bishop'], TYPE['knight']];
        // everything else that is not a King - a piece that leaves its side
        // with more than a bare King
        var HEAVY = [];
        for(var t in p.pieceTypes) {
            var index = parseInt(t);
            if(p.pieceTypes[t].name != 'king' && MINORS.indexOf(index) < 0)
                HEAVY.push(index);
        }
        function heavyCount(count) {
            var total = 0;
            for(var i = 0; i < HEAVY.length; i++)
                total += count[HEAVY[i]] || 0;
            return total;
        }
        function minorCount(count) {
            return (count[MINORS[0]] || 0) + (count[MINORS[1]] || 0);
        }
        
		return {
			
			geometry: geometry,
			
			pieceTypes: p.pieceTypes,
			
			castle: p.castle,

			promote: p.promote,

			evaluate: function(aGame,evalValues,material) {
				// A bare King faced with a King and at most one Bishop or
				// Knight cannot be mated; anything else is still a game.
				var white=material[1].count;
				var black=material[-1].count;
				var whiteBare = heavyCount(white)==0 && minorCount(white)==0;
				var blackBare = heavyCount(black)==0 && minorCount(black)==0;
				if((whiteBare && heavyCount(black)==0 && minorCount(black)<2)
					|| (blackBare && heavyCount(white)==0 && minorCount(white)<2)) {
					this.mFinished=true;
					this.mWinner=JocGame.DRAW;
				}
				
				// check 50 moves without capture
				if(this.noCaptCount>=100) {
					this.mFinished=true;
					this.mWinner=JocGame.DRAW;					
				}
				
				// motivate pawns to reach the promotion line
				var distPromo=aGame.cbUseTypedArrays?new Int8Array(3):[0,0,0];
				var height=geometry.height;
				var pawns=material[1].byType[TYPE['pawnw']],pawnsLength;
				if(pawns) {
					pawnsLength=pawns.length;
					for(var i=0;i<pawnsLength;i++)
						switch(height-geometry.R(pawns[i].p)) {
						case 2: distPromo[0]++; break;
						case 3: distPromo[1]++; break;
						case 4: distPromo[2]++; break;
						}
				}
				// ... and Black's, which were read from the Archbishop's slot
				pawns=material[-1].byType[TYPE['pawnb']];
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
				
				// motivate knights and bishops to deploy early - the loop used
				// to walk types 4 and 5, which here are the Dragon King and the
				// Centaur
				var minorPiecesMoved=0;
				MINORS.forEach(function(type) {
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
