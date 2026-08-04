
(function() {
	
	var geometry = Model.Game.cbBoardGeometryMultiplan(6,8,3);
	var CT = Model.Game.cbConstants;

	// The 50-move counter is reset by Pawn moves. base-model works out which
	// types are Pawns by assuming they are declared first, and here the King
	// opens the list - so it was the KING that reset the counter and Pawn
	// moves that did not. Declared explicitly: the pawns and the hoplites,
	// each in its initial and its ordinary type.
	Model.Game.cbPawnTypes = [6,7,8,9];

	// Sparta is a DIARCHY: the Spartans have two kings, and that is what pays
	// for their lighter army. So they need TWO distinct types, isKing:1 and
	// isKing:2 - the engine files royals under kings[side*isKing], so two kings
	// of the same type share one slot, the last one to move overwrites the
	// other, and the king that is not tracked stops being royal (it can be
	// captured without the game ending).
	var KING_1 = 0, KING_2 = 4;

	// What the spare king is worth to the evaluation. A piece with isKing is
	// left out of pieceValue, so without this the AI gives its second king away
	// for nothing and sees no point in taking the other side's. Tuning knob.
	var SPARE_KING_VALUE = 4.5;

	// kings[] slots are not cleared when a royal is captured, so they are always
	// validated against the board before being used.
	function royalAt(board,aGame,who,rank) {
		var pos = board.kings[who*rank];
		if(pos===undefined || pos<0) return -1;
		var idx = board.board[pos];
		if(idx<0) return -1;
		var pc = board.pieces[idx];
		if(pc.s!==who || !aGame.g.pTypes[pc.t].isKing) return -1;
		return pos;
	}

	function liveRoyals(board,aGame,who) {
		var out = [];
		for(var k=1;k<=aGame.cbMaxRoyalRank;k++) {
			var pos = royalAt(board,aGame,who,k);
			if(pos>=0 && out.indexOf(pos)<0) out.push(pos);
		}
		return out;
	}

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
					isKing: 1,
					graph: this.cb3DKingGraph(geometry),
					abbrev: 'K',
					initial: [{s:1,p:50},{s:-1,p:92}],
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
				// second Spartan king: the same piece as type 0, but its own
				// royal rank. Its own fenAbbrev too, otherwise the two black
				// kings fight over the letter 'k' when a FEN is read back.
				4: {
					name: 'king2',
					aspect: 'fr-king',
					isKing: 2,
					graph: this.cb3DKingGraph(geometry),
					abbrev: 'K',
					fenAbbrev: 'E',
					initial: [{s:-1,p:93}],
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
				// value: in 2D Spartan Chess the Captain matches the Knight,
				// both being 8-target leapers. Three planes give the Captain
				// 4 more targets but the Knight 16, and measured over played
				// positions the homoioi keeps only about 70% of the Knight's
				// mobility - so it sits below it here, not above.
				10: {
					name: 'homoioi',//Spartiate
					aspect: 'fr-machine',
					graph: this.cbRSMachineGraph(geometry),
					value: 2.5,
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
				// value: the 2D Warlord is worth 8.75 against a 9.5 Queen, and
				// on three planes the hippagretai measures 90 to 100% of the
				// Queen's mobility - the 7 inherited from the transposition
				// put it at 78% of a 9-point Queen for no reason.
				13: {
					name: 'hippagretai',
					aspect: 'fr-proper-cardinal',
					graph: this.cbRSCardinalGraph(geometry),
					value: 8,
					abbrev: 'C',
					initial: [{s:-1,p:91}],
				},

			},
			
			// The Spartans do not castle: none of their pieces is castle:true.
			// The two black entries inherited from 3dchess could therefore
			// never fire - and one of them would have put the king on the
			// other king's square.
			castle: {
				"50/49": {k:[49],r:[50],n:"O-O"},
				"50/52": {k:[51],r:[51,50],n:"O-O-O"},
			},
			
			promote: function(aGame,piece,move) {
				if(piece.t==8)
					return [6];
				else if(piece.t==9)
					return [7];
				else if(piece.t==6 && geometry.R(move.t)==7)
					return [5,3,2,1];
				else if(piece.t==7 && geometry.R(move.t)==0) {
					var promo=[10,11,12,13];
					// a hoplite may raise a fallen king, never add a third one
					if(royalAt(this,aGame,-1,1)<0) promo.push(KING_1);
					else if(royalAt(this,aGame,-1,2)<0) promo.push(KING_2);
					return promo;
				}
				return [];
			},

			evaluate: function(aGame,evalValues,material,pieceCount,pieceValue) {
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
				
				// motivate minor pieces to deploy early. The two armies do not
				// share types: knights and bishops on one side, homoioi and
				// skiritai on the other. Counting only 3 and 5 handed White up
				// to +0.8 that Black could never earn back.
				var minorTypes={ '1': [3,5], '-1': [10,11] };
				var minorPiecesMoved=0;
				for(var s=1;s>=-1;s-=2) {
					var types=minorTypes[s];
					for(var k=0;k<types.length;k++) {
						var pieces=material[s].byType[types[k]];
						if(pieces)
							for(var i=0;i<pieces.length;i++)
								if(pieces[i].m)
									minorPiecesMoved+=s;
					}
				}
				if(minorPiecesMoved!=0) {
					evalValues['minorPiecesMoved']=minorPiecesMoved;
				}

				// castling. base-model weighs each side's castling asset against
				// the other's, but only the Persians have one: the Spartan half
				// of the term is 0 for ever, so the raw value is a standing
				// bonus for White that Black can never answer. Recentred on the
				// starting position - 0 at the start, positive once White has
				// castled, negative once it has thrown the right away.
				if(evalValues["castle"] !== undefined) {
					var castleable = aGame.g.castleablePiecesCount[1];
					evalValues["castle"] -= castleable/(castleable+1);
				}

				// the spare king, invisible to pieceValue: count it by hand as
				// long as the Spartans still have two. Start from the raw sums
				// (5th argument) rather than from the ratio already computed:
				// on exactly equal material that ratio is 0, and inverting it
				// would give 0/0 = NaN.
				if(black[KING_1] + black[KING_2] == 2) {
					evalValues["pieceValue"] -= SPARE_KING_VALUE;
					evalValues["pieceValueRatio"] = evalValues["pieceValue"] /
						(pieceValue[1] + pieceValue[-1] + SPARE_KING_VALUE + 1);
				}
			},

			
		};
	}

	// DUPLE CHECK. The native multi-royal test in base-model (crown-prince
	// variants) rules that a side holding two royals is NEVER in check. Sparta
	// is stricter: the Spartans must answer when BOTH kings are attacked at
	// once, and may not move into such a position. So the test is replaced by:
	// in check as soon as EVERY surviving royal is attacked - which gives back
	// ordinary check when a single king is left, and defeat when none is.
	Model.Board.cbInLosingCheck = function(aGame,who) {
		var royals = liveRoyals(this,aGame,who);
		if(royals.length===0) return true;					// no king left: lost
		for(var i=0;i<royals.length;i++)
			if(this.cbGetAttackers(aGame,royals[i],who,100).length===0)
				return false;								// a king in peace: no check
		return true;
	}

})();
