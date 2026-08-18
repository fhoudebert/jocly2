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
        p = this.cbPiecesFromFEN(geometry, "aw6wm/ronbqkbnor/pppppppppp/10/10/10/10/PPPPPPPPPP/RONBQKBNOR/AW6WM");
        p.setValues({P:0.9, N:2.9, B:3.7, R:5, Q:9.6, M:8.5, A:7, W:4.2, O:4.7});

        var ww = p.addPiece({
			name: 'leo',
			aspect: 'fr-star',
			graph: this.cbLongRangeGraph(geometry,[[0,-1],[0,1],[-1,0],[1,0],[1,1],[1,-1],[-1,-1],[-1,1]],null,this.cbConstants.FLAG_MOVE | this.cbConstants.FLAG_SCREEN_CAPTURE),
			value: 5.5,
			abbrev: 'L',
			initial: [{s:1,p:2},{s:1,p:7},{s:-1,p:92},{s:-1,p:97}],
		});


        /*
         * Piece types by name. The draw test and the evaluation terms below
         * used to address them by number, with the numbers of ORTHODOX chess
         * they were copied from - there 4, 5, 6, 7 are the Knight, Bishop,
         * Rook and Queen. In this game they are other pieces, and the ones
         * that matter most sit at numbers the test never read: a King and
         * Rook against a bare King was declared drawn the moment it appeared,
         * and so were several other winning endings.
         */
        var TYPE = {};
        for(var t in p.pieceTypes)
            TYPE[p.pieceTypes[t].name] = parseInt(t);

        // the two pieces that cannot force mate on their own
        var MINORS = [TYPE['bishop'], TYPE['knight']];
        // every other piece: having one means more than a bare King
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
			
			castle:{ 
		        "15/10": {k:[14],r:[11,12,13,14,15],n:"O-O-O",extra:-2},
		        "15/19": {k:[16],r:[18,17,16,15],n:"O-O",extra:-2},
		        "85/80": {k:[84],r:[81,82,83,84,85],n:"O-O-O",extra:-2},
		        "85/89": {k:[86],r:[88,87,86,85],n:"O-O",extra:-2},
			},

			promote: function(aGame,piece,move) {

                //Queen, Marshall, Archbishop, Rook, Champion, Leo, Knight, Bishop, or Wizard
				if(piece.t==0 && geometry.R(move.t)==9)
					return [7,4,2,8,6,11,5,3,9];
				else if(piece.t==1 && geometry.R(move.t)==0)
					return [7,4,2,8,6,11,5,3,9];
				return [];
			},

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
				
				// check 64 moves without capture
				if(this.noCaptCount>=128) {
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
				
				// motivate knights and bishops to deploy early
				// the loop used to walk types 4 and 5, which in this game are
				// not the Knight and the Bishop
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
