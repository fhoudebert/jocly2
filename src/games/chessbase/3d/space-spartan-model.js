
(function() {
	
	var geometry = Model.Game.cbBoardGeometryMultiplan(6,8,3);
	var CT = Model.Game.cbConstants;
    Model.Game.cb3DHoplitGraphi = function(geometry,side) {
		var moveGraph = this.cbShortRangeGraph(geometry,[[side,side,0],[-side,side,0],[side*2,side*2,0],[-side*2,side*2,0]],0,CT.FLAG_MOVE);
		var captGraph = this.cbLongRangeGraph(geometry,[[0,side,0],[side,side,1],[-side,side,1],[side,side,-1],[-side,side,-1]],null,CT.FLAG_CAPTURE,1);
		return this.cbMergeGraphs(geometry,moveGraph,captGraph);
	}

    Model.Game.cb3DHoplitGraph = function(geometry,side) {
		var moveGraph = this.cbShortRangeGraph(geometry,[[side,side,0],[-side,side,0]],0,CT.FLAG_MOVE);
		var captGraph = this.cbLongRangeGraph(geometry,[[0,side,0],[side,side,1],[-side,side,1],[side,side,-1],[-side,side,-1]],null,CT.FLAG_CAPTURE,1);
		return this.cbMergeGraphs(geometry,moveGraph,captGraph);
	}

    Model.Game.cbRSMachineGraph = function(geometry) {
		return this.cbShortRangeGraph(geometry,[[0,-1,0],[0,1,0],[1,0,0],[-1,0,0],[-2,0,0],[0,2,0],[0,-2,0],[2,0,0],[0,0,1],[0,0,-1],[0,0,2],[0,0,-2]]);
	}

    Model.Game.cbRSLieutenantGraph = function(geometry,side,range) {
		var moveGraph = this.cbShortRangeGraph(geometry, [[-1,0,0],[1,0,0]], 0, this.cbConstants.FLAG_MOVE) ;
		var captGraph = this.cbShortRangeGraph(geometry,[[-1,-1,0],[-1,1,0],[1,-1,0],[1,1,0],[-2,-2,0],[-2,2,0],[2,-2,0],[2,2,0],
[1,1,1],[-1,-1,1],[1,-1,1],[-1,1,1],[1,1,-1],[-1,-1,-1],[1,-1,-1],[-1,1,-1],
[2,2,2],[-2,-2,2],[2,-2,2],[-2,2,2],[2,2,-2],[-2,-2,-2],[2,-2,-2],[-2,2,-2],
]);
		return this.cbMergeGraphs(geometry,moveGraph,captGraph);
	}

	Model.Game.cbDefine = function() {
		
		return {
			
			geometry: geometry,
			
			pieceTypes: {

				0: {
					name: 'king',
					aspect: 'fr-king',
					isKing: true,
					graph: this.cb3DKingGraph(geometry),
					abbrev: 'K',
					initial: [{s:1,p:50},{s:-1,p:92},{s:-1,p:93}],
				},

				1: {
					name: 'queen',
					aspect: 'fr-queen',
					graph: this.cbRSQueenGraph(geometry),
					abbrev: 'Q',
					initial: [{s:1,p:51}],
					value: 9,
				},

				2: {
					name: 'rook',
					aspect: 'fr-rook',
					graph: this.cbRSRookGraph(geometry),
					value: 5,
					abbrev: 'R',
					initial: [{s:1,p:49},{s:1,p:52}],
					castle: true,
				},

				3: {
					name: 'bishop',
					aspect: 'fr-bishop',
					graph: this.cbRSBishopGraph(geometry),
					value: 3.1,
					abbrev: 'B',
					initial: [{s:1,p:2},{s:1,p:3},{s:1,p:98},{s:1,p:99}],
				},
				5: {
					name: 'knight',
					aspect: 'fr-knight',
					graph: this.cbRSKnightGraph(geometry),
					value: 2.9,
					abbrev: 'N',
					initial: [{s:1,p:1},{s:1,p:4},{s:1,p:97},{s:1,p:100}],
				},
				6: {
					name: 'pawn-w',
					aspect: 'fr-pawn',
					graph: this.cb3DPawnGraph(geometry,1,1),
					value: 1,
					abbrev: 'P',
					epCatch: true,
				},
				7: {
					name: 'pawn-b',
					aspect: 'fr-hoplit',
					graph: this.cb3DHoplitGraph(geometry,-1),
					value: 1,
					abbrev: 'H',
					epCatch: true,
				},
				8: {
					name: 'ipawn-w',
					aspect: 'fr-pawn',
					graph: this.cb3DPawnGraph(geometry,1,2),
					value: 1,
					abbrev: 'P',
					initial: [{s:1,p:0},{s:1,p:7},{s:1,p:8},{s:1,p:9},{s:1,p:10},{s:1,p:5},
					          {s:1,p:48},{s:1,p:55},{s:1,p:56},{s:1,p:57},{s:1,p:58},{s:1,p:53},
					          {s:1,p:96},{s:1,p:103},{s:1,p:104},{s:1,p:105},{s:1,p:106},{s:1,p:101}],
					epTarget: true,
				},
				9: {
					name: 'ipawn-b',
					aspect: 'fr-hoplit',
					graph: this.cb3DHoplitGraphi(geometry,-1),
					value: 1,
					abbrev: 'H',
					initial: [{s:-1,p:47},{s:-1,p:40},{s:-1,p:39},{s:-1,p:38},{s:-1,p:37},{s:-1,p:42},
					          {s:-1,p:95},{s:-1,p:88},{s:-1,p:87},{s:-1,p:86},{s:-1,p:85},{s:-1,p:90},
					          {s:-1,p:143},{s:-1,p:136},{s:-1,p:135},{s:-1,p:134},{s:-1,p:133},{s:-1,p:138}],
					epTarget: true,
				},
				10: {
					name: 'homoioi',//Spartiate
					aspect: 'fr-machine',
					graph: this.cbRSMachineGraph(geometry),
					value: 3.1,
					abbrev: 'M',
					initial: [{s:-1,p:45},{s:-1,p:44},{s:-1,p:141},{s:-1,p:140}],
				},
				11: {
					name: 'skiritai',
					aspect: 'fr-admiral',
					graph: this.cbRSLieutenantGraph(geometry),
					value: 4,
					abbrev: 'S',
					initial: [{s:-1,p:46},{s:-1,p:43},{s:-1,p:142},{s:-1,p:139}],
				},
				12: {
					name: 'polemarchoi',
					aspect: 'fr-proper-crowned-rook',
					graph: this.cbRSCrownedRookGraph(geometry),
					value: 7,
					abbrev: 'O',
					initial: [{s:-1,p:94}],
				},
				13: {
					name: 'hippagretai',
					aspect: 'fr-proper-cardinal',
					graph: this.cbRSCardinalGraph(geometry),
					value: 7,
					abbrev: 'C',
					initial: [{s:-1,p:91}],
				},

			},
			
			castle: {
				"50/49": {k:[49],r:[50],n:"O-O"},
				"50/52": {k:[51],r:[51,50],n:"O-O-O"},
				"92/91": {k:[91],r:[92],n:"O-O"},
				"92/94": {k:[93],r:[93,92],n:"O-O-O"},
			},
			
			promote: function(aGame,piece,move) {
				if(piece.t==8)
					return [6];
				else if(piece.t==9)
					return [7];
				else if(piece.t==6 && geometry.R(move.t)==7)
					return [5,3,2,1];
				else if(piece.t==7 && geometry.R(move.t)==0)
					return [10,11,12,13];
				return [];
			},

			evaluate: function(aGame,evalValues,material) {
				// check lack of material to checkmate
				var white=material[1].count;
				var black=material[-1].count;
				// TODO detect minimum material condition to draw
				
				// check 50 moves without capture
				if(this.noCaptCount>=100) {
					this.mFinished=true;
					this.mWinner=JocGame.DRAW;					
				}
				
				// motivate pawns to reach the promotion line
				var distPromo=aGame.cbUseTypedArrays?new Int8Array(3):[0,0,0];
				var height=geometry.height;
				var pawns=material[1].byType[6],pawnsLength;
				if(pawns) {
					pawnsLength=pawns.length;
					for(var i=0;i<pawnsLength;i++)
						switch(height-geometry.R(pawns[i].p)) {
						case 2: distPromo[0]++; break;
						case 3: distPromo[1]++; break;
						case 4: distPromo[2]++; break;
						}
				}
				pawns=material[-1].byType[7],pawnsLength;
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
				for(var t=3;t<=5;t+=2)
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
