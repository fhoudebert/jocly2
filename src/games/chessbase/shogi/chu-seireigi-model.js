
(function(){
	var geometry = Model.Game.cbDropGeometry(12,12,1);
	Model.Game.cbOnStaleMate = -1; // stalemate = last player wins
	Model.Game.cbMaxRepeats = 4;
    Model.Game.handLayout = { '1':[2,4,6,8,10,12,14,30,46,62,78,94,110,126,142,158,174,190,206,0], '-1':[221,219,217,215,213,211,209,193,177,161,145,129,113,97,81,65,49,33,17,223] };


	Model.Game.cbSetPawnLimit(1);

  Model.Game.cbPerpEval = function(board, aGame) {
		var loop = aGame.GetRepeatOccurence(board, 1) >> 1;
		if(board.oppoCheck >= loop) return -board.mWho;
		if(board.check >= loop) return board.mWho;
		return JocGame.DRAW; // draw if neither is perpetually checking
  }

	Model.Game.cbMateEval = function(board) { // detect Pawn-drop mate
		var m = board.lastMove;
		var piece = board.pieces[board.board[m.t]];
		if(piece.t < 2) { // Pawn
		  var f = geometry.C(m.f);
		  if(f==1 || f==geometry.width-2) return board.mWho; // dropped: flip result
		}
		return -board.mWho;
  }

	Model.Game.cbDefine = function() {
		
		var $this = this;
	
        var adjacent=[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[0,1],[0,-1],[1,0]];
		var definition = {
			
			geometry: geometry,
			
			pieceTypes: {

				0: {
					name: 'pawn-w',
					aspect: 'sh-pawn',
					graph: this.cbDropGraph(geometry, [[0,1]],[],0,1),
					value: 0.8,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:1,p:66},{s:1,p:67},{s:1,p:68},{s:1,p:69},{s:1,p:70},{s:1,p:71},{s:1,p:72},{s:1,p:73},{s:1,p:74},{s:1,p:75},{s:1,p:76},{s:1,p:77}],
					demoted: 1,
					hand: 0,
				},
				
				1: {
					name: 'pawn-b',
					aspect: 'sh-pawn',
					graph: this.cbDropGraph(geometry, [[0,-1]],[],1,0),
					value: 0.8,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:-1,p:146},{s:-1,p:147},{s:-1,p:148},{s:-1,p:149},{s:-1,p:150},{s:-1,p:151},{s:-1,p:152},{s:-1,p:153},{s:-1,p:154},{s:-1,p:155},{s:-1,p:156},{s:-1,p:157}],
					demoted: 0,
					hand: 0,
				},

				2: {
					name: 'lance-w',
					aspect: 'sh-lance',
					graph: this.cbDropGraph(geometry, [],[[0,1]],0,1),
					value: 2,
					abbrev: 'L',
					initial: [{s:1,p:18},{s:1,p:29}],
					demoted: 3,
					hand: 1,
				},
				
				3: {
					name: 'lance-b',
					aspect: 'sh-lance',
					graph: this.cbDropGraph(geometry, [],[[0,-1]],1,0),
					value: 2,
					abbrev: 'L',
					initial: [{s:-1,p:194},{s:-1,p:205}],
					demoted: 2,
					hand: 1,
				},
				4: {
					name: 'rabbit-w',
					aspect: 'sh-rabbit',
					graph: this.cbDropGraph(geometry, [],[[0,1],[1,1],[-1,1]],0,1),
					value: 1.1,
					abbrev: 'RU',
					initial: [{s:1,p:37},{s:1,p:42}],
					demoted: 5,
					hand: 3,
				},
				
				5: {
					name: 'rabbit-b',
					aspect: 'sh-rabbit',
					graph: this.cbDropGraph(geometry, [],[[0,-1],[1,-1],[-1,-1]],1,0),
					value: 1.1,
					abbrev: 'RU',
					initial: [{s:-1,p:181},{s:-1,p:186}],
					demoted: 4,
					hand: 3,
				},
				6: {
					name: 'ram-w',
					aspect: 'sh-ram',
					graph: this.cbDropGraph(geometry, [],[[1,1],[-1,1]],0,1),
					value: 3.1,
					hand: 8,
					abbrev: 'RS',
					demoted: 7,
					initial: [{s:1,p:19},{s:1,p:28}],
					
				},
				7: {
					name: 'ram-b',
					aspect: 'sh-ram',
					graph: this.cbDropGraph(geometry, [],[[1,-1],[-1,-1]],1,0),
					value: 3.1,
					hand: 8,
					abbrev: 'RS',
					demoted: 6,
					initial: [{s:-1,p:195},{s:-1,p:204}],
				},
				8: {
					name: 'swallow-w',
					aspect: 'sh-swallow',
					graph: this.cbDropGraph(geometry, [[-2,2],[0,2],[2,2]],[],0,2),
					value: 1.8,
					abbrev: 'FS',
                    demoted: 9,
					initial: [{s:1,p:50},{s:1,p:61}],
					hand: 11,
				},
				9: {
					name: 'swallow-b',
					aspect: 'sh-swallow',
					graph: this.cbDropGraph(geometry, [[-2,-2],[0,-2],[2,-2]],[],2,0),
					value: 1.8,
					abbrev: 'FS',
                    demoted: 8,
					initial: [{s:-1,p:162},{s:-1,p:173}],
					hand: 11,
				},
				10: {
					name: 'knight-w',
					aspect: 'sh-knight',
					graph: this.cbDropGraph(geometry, [[1,2],[-1,2]],[],0,2),
					value: 1.3,
					abbrev: 'N',
					initial: [{s:1,p:35},{s:1,p:44}],
					demoted: 11,
					hand: 2,
				},
				
				11: {
					name: 'knight-b',
					aspect: 'sh-knight',
					graph: this.cbDropGraph(geometry, [[1,-2],[-1,-2]],[],2,0),
					value: 1.3,
					abbrev: 'N',
					initial: [{s:-1,p:179},{s:-1,p:188}],
					demoted: 10,
					hand: 2,
				},
				12: {
					name: 'elephant-w',
					aspect: 'sh-elephant',
					value: 4,
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[1,-1],[-1,-1],[1,1],[-1,1]],[[1,1],[-1,1]],[]),
					abbrev: 'E',
					demoted: 13,
					hand: 5,
					initial: [{s:1,p:24}],
				},

				
				13: {
					name: 'elephant-b',
					aspect: 'sh-elephant',
					graph: this.cbDropGraph(geometry, [[-1,1],[1,1],[1,0],[-1,0],[0,-1],[1,-1],[-1,-1]],[[1,-1],[-1,-1]],[]),
					value: 4,
					abbrev: 'E',
					demoted: 12,
					hand: 5,
					initial: [{s:-1,p:199}],
				},

				14: {
					name: 'copper-w',
					aspect: 'sh-copper',
					graph: this.cbDropGraph(geometry,[[0,1],[0,-1],[-1,1],[1,1]],[]),
					value: 2.3,
					abbrev: 'C',
					hand: 6,
					demoted: 15,
					initial: [{s:1,p:20},{s:1,p:27}],
				},

				15: {
					name: 'copper-b',
					aspect: 'sh-copper',
					graph: this.cbDropGraph(geometry,[[0,1],[0,-1],[-1,-1],[1,-1]],[]),
					value: 2.3,
					abbrev: 'C',
					hand: 6,
					demoted: 14,
					initial: [{s:-1,p:196},{s:-1,p:203}],
				},
				16: {
					name: 'wolf-w',
					aspect: 'sh-wolf',
					graph: this.cbDropGraph(geometry, [[1,1],[1,0],[-1,0],[-1,1]],[[0,1],[0,-1]]),
					value: 5.4,
					abbrev: 'W',
					hand: 7,
					demoted: 17,
					initial: [{s:1,p:59}],
				},

				17: {
					name: 'wolf-b',
					aspect: 'sh-wolf',
					graph: this.cbDropGraph(geometry, [[-1,-1],[1,0],[-1,0],[1,-1]],[[0,1],[0,-1]]),
					value: 5.4,
					abbrev: 'W',
					hand: 7,
					demoted: 16,
					initial: [{s:-1,p:164}],
				},
				18: {
					name: 'gold-w',
					aspect: 'sh-gold',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1]],[]),
					value: 2.8,
					abbrev: 'G',
					initial: [{s:1,p:22},{s:1,p:25}],
					demoted: 19,
					hand: 4,
				},
				
				19: {
					name: 'gold-b',
					aspect: 'sh-gold',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,-1],[-1,-1]],[]),
					value: 2.8,
					abbrev: 'G',
					initial: [{s:-1,p:198},{s:-1,p:201}],
					demoted: 18,
					hand: 4,
				},
				20: {
					name: 'bear-w',
					aspect: 'sh-bear',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]],[]),
					value: 4.4,
					hand: 9,
					abbrev: 'SB',
					demoted: 21,
					
					initial: [{s:1,p:38},{s:1,p:41}],
					
				},
				21: {
					name: 'bear-b',
					aspect: 'sh-bear',
					graph: this.cbDropGraph(geometry, [[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]] ,[]),
					
					value: 4.4,
					hand: 9,
					abbrev: 'SB',
					demoted: 20,
					initial: [{s:-1,p:182},{s:-1,p:185}],

				},
				22: {
					name: 'leopard-w',
					aspect: 'sh-leopard',
					graph: this.cbDropGraph(geometry, [[-1,1],[1,1],[0,-1]],[[-1,0],[1,0]]),
					value: 4.9,
					hand: 10,
					abbrev: 'GL',
					demoted: 23,
					initial: [{s:1,p:52}],
					
				},
				23: {
					name: 'leopard-b',
					aspect: 'sh-leopard',
					graph: this.cbDropGraph(geometry, [[-1,-1],[1,-1],[0,1]],[[-1,0],[1,0]]),
					
					value: 4.9,
					hand: 10,
					abbrev: 'GL',
					demoted: 22,
					initial: [{s:-1,p:171}],

				},
				24: {
					name: 'bishop',
					aspect: 'sh-bishop',
					graph: this.cbDropGraph(geometry, [],[[1,1],[1,-1],[-1,1],[-1,-1]]),
					value: 4.3,
					hand: 14,
					abbrev: 'B',
                    demoted: 24,
					initial: [{s:1,p:54},{s:-1,p:169}],
					
				},
				25: {
					name: 'rook',
					aspect: 'sh-rook',
					graph: this.cbDropGraph(geometry, [], [[0,1],[1,0],[-1,0],[0,-1]]),
					value: 4.9,
                    demoted: 25,
					abbrev: 'R',
					initial: [{s:1,p:57},{s:-1,p:166}],
					hand: 15,
				},
				26: {
					name: 'silver-w',
					aspect: 'sh-silver',
					value: 2.4,
					graph: this.cbDropGraph(geometry, [[0,1],[1,1],[1,-1],[-1,1],[-1,-1]],[]),
					abbrev: 'S',
					demoted: 27,
					hand: 12,
					//initial: [{s:1,p:69},{s:1,p:74}],
                    initial: [{s:1,p:21},{s:1,p:26}],
				},
				27: {
					name: 'silver-b',
					aspect: 'sh-silver',
					graph: this.cbDropGraph(geometry, [[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],[]),
					value: 2.4,
					abbrev: 'S',
					demoted: 26,
					hand: 12,
					initial: [{s:-1,p:197},{s:-1,p:202}],
				},
				28: {
					name: 'phoenix-w',
					aspect: 'sh-phoenix',
					graph: this.cbDropGraph(geometry,[[0,1],[0,-1],[1,0],[-1,0],[-2,2],[2,2],[2,-2],[-2,-2]],[]),
					value: 3.4,
					hand: 13,
					abbrev: 'OL',
					demoted: 29,
					initial: [{s:1,p:40}],
				},

				29: {
					name: 'phoenix-b',
					aspect: 'sh-phoenix',
					graph: this.cbDropGraph(geometry,[[0,1],[0,-1],[1,0],[-1,0],[-2,2],[2,2],[2,-2],[-2,-2]],[]),
					value: 3.4,
					demoted: 28,
					hand: 13,
					abbrev: 'OL',
					initial: [{s:-1,p:183}],	
				},
				30: {
					name: 'kirin-w',
					aspect: 'sh-kirin',
					graph: this.cbDropGraph(geometry,[[0,2],[0,-2],[2,0],[-2,0],[-1,1],[1,1],[1,-1],[-1,-1]],[]),
					value: 5.2,
					demoted: 31,
					hand: 16,
					abbrev: 'CR',
					
					initial: [{s:1,p:39}],
					
				},
				31: {
					name: 'kirin-b',
					aspect: 'sh-kirin',
					graph: this.cbDropGraph(geometry,[[0,2],[0,-2],[2,0],[-2,0],[-1,1],[1,1],[1,-1],[-1,-1]],[]),
					value: 3,
					demoted: 30,
					abbrev: 'CR',
                    hand: 16,
					initial: [{s:-1,p:184}],
				},

				32: {
					name: 'p-pawn-w',
					aspect: 'sh-tokin',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1]],[]),
					value: 2.6,
					abbrev: '+P',
					demoted: 1,
				},
				
				33: {
					name: 'p-pawn-b',
					aspect: 'sh-tokin',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,-1],[-1,-1]],[]),
					value: 2.6,
					abbrev: '+P',
					demoted: 0,
				},
				
				34: {
					name: 'p-lance-w',
					aspect: 'sh-promoted-lance',
					graph: this.cbDropGraph(geometry, [[2,1],[2,-1],[-2,1],[-2,-1],[0,1],[0,-1]],[[1,0],[-1,0]]),
					value: 4.5,
					abbrev: '+L',
					demoted: 3,
				},
				
				35: {
					name: 'p-lance-b',
					aspect: 'sh-promoted-lance',
					graph: this.cbDropGraph(geometry, [[2,1],[2,-1],[-2,1],[-2,-1],[0,1],[0,-1]],[[1,0],[-1,0]]),
					value: 4.5,
					abbrev: '+L',
					demoted: 2,
				},
				36: {
					name: 'p-rabbit-w',
					aspect: 'sh-promoted-rabbit',
					
                    graph: this.cbDropGraph(geometry, [[0,1],[0,-1]],[[1,0],[-1,0],[1,1],[-1,1]]),
					value: 3,
					abbrev: '+RU',
					demoted: 5,
				},
				37: {
					name: 'p-rabbit-b',
					aspect: 'sh-promoted-rabbit',
                    graph: this.cbDropGraph(geometry, [[0,1],[0,-1]],[[1,0],[-1,0],[1,-1],[-1,-1]]),
					value: 3,
					abbrev: '+RU',
					demoted: 4,
				},
				38: {
					name: 'p-ram-w',
					aspect: 'sh-fox',
					graph: this.cbDropGraph(geometry, [[1,0],[-1,0],[1,2],[-1,2],[1,-2],[-1,-2]],[[0,1],[0,-1]]),
					value: 5.6,
					abbrev: '+RS',
					demoted: 7,
				},
				39: {
					name: 'p-ram-b',
					aspect: 'sh-fox',
					graph: this.cbDropGraph(geometry, [[1,0],[-1,0],[1,2],[-1,2],[1,-2],[-1,-2]],[[0,1],[0,-1]]),
					value: 5.6,
					abbrev: '+RS',
					demoted: 6,
				},
				40: {
					name: 'p-swallow-w',
					aspect: 'sh-bird',
					graph: this.cbDropGraph(geometry, [[-2,0],[2,0],[-1,2],[1,2],[-2,1],[-1,1],[0,1],[1,1], [2,1],[0,-1],[0,-2],[2,-2],[0,-2],[-2,-2]],[]),
					value: 5.5,
					abbrev: '+FS',
					demoted: 9,
				},
				41: {
					name: 'p-swallow-b',
					aspect: 'sh-bird',
					graph: this.cbDropGraph(geometry, [[-2,2],[0,2],[2,2],[2,0],[-2,0],[-1,-2],[-1,-1],[0,1],[0,-1],[1,-1],[2,-1],[1,-2],[-2,-1]],[]),
					value: 5.5,
					abbrev: '+FS',
					demoted: 8,
				},
				42: {
					name: 'p-knight-w',
					aspect: 'sh-promoted-knight',
					graph: this.cbDropGraph(geometry, [[-2,2],[2,2],[0,2],[1,-2],[-1,-2],[0,1],[1,1],[1,-1],[-1,1],[-1,-1]],[]),
					value: 3.7,
					abbrev: '+N',
					demoted: 11,
				},
				43: {
					name: 'p-knight-b',
					aspect: 'sh-promoted-knight',
					graph: this.cbDropGraph(geometry, [[-2,-2],[2,-2],[0,-2],[1,2],[-1,2],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],[]),
					value: 3.7,
					abbrev: '+N',
					demoted: 10,
				},
				44: {
					name: 'p-elephant-w',
					aspect: 'sh-teacher',
					graph: this.cbDropGraph(geometry, [[1,0],[-1,0],[-1,-1],[1,-1]],[[1,1],[0,1],[0,-1],[-1,1]]),
					value: 7,
					abbrev: '+E',
					demoted: 13,
				},
				45: {
					name: 'p-elephant-b',
					aspect: 'sh-teacher',
					graph: this.cbDropGraph(geometry, [[-1,1],[1,1],[-1,0],[1,0]],[[1,-1],[0,1],[0,-1],[-1,-1]]),
					value: 7,
					abbrev: '+E',
					demoted: 12,
				},
				46: {
					name: 'p-copper-w',
					aspect: 'sh-promoted-copper',
					graph: this.cbDropGraph(geometry, [[-1,1],[1,1],[0,-1]],[[-1,0],[1,0]]),
					value: 4,
					abbrev: '+C',
					demoted: 15,
				},
				47: {
					name: 'p-copper-b',
					aspect: 'sh-promoted-copper',
					graph: this.cbDropGraph(geometry, [[-1,-1],[1,-1],[0,1]],[[-1,0],[1,0]]),
					value: 4,
					abbrev: '+C',
					demoted: 14,
				},
				48: {
					name: 'p-wolf-w',
					aspect: 'sh-promoted-wolf',
					graph: this.cbDropGraph(geometry, [],[[1,0],[-1,0],[1,1],[-1,-1],[-1,1],[1,-1]]),
					value: 7.2,
					abbrev: '+W',
					demoted: 17,
				},
				49: {
					name: 'p-wolf-b',
					aspect: 'sh-promoted-wolf',
					graph: this.cbDropGraph(geometry, [],[[1,0],[-1,0],[1,1],[-1,-1],[-1,1],[1,-1]]),
					value: 7.2,
					abbrev: '+W',
					demoted: 16,
				},
				50: {
					name: 'p-gold-w',
					aspect: 'sh-promoted-gold',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[1,-1],[-1,-1],[1,1],[-1,1]],[[1,1],[-1,1]]),
					value: 4,
					abbrev: '+G',
					demoted: 19,
				},
				51: {
					name: 'p-gold-b',
					aspect: 'sh-promoted-gold',
					graph: this.cbDropGraph(geometry, [[-1,1],[1,1],[1,0],[-1,0],[0,-1],[1,-1],[-1,-1]],[[1,-1],[-1,-1]]),
					value: 4,
					abbrev: '+G',
					demoted: 18,
				},

		
				52: {
					name: 'p-bear-w',
					aspect: 'sh-whale',
					graph: this.cbDropGraph(geometry, [[2,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[0,-1],[0,1]],[[0,-1],[1,1],[-1,1]]),
                    
					value: 6,
					abbrev: '+SB',
					demoted: 21,
				},
				53: {
					name: 'p-bear-b',
					aspect: 'sh-whale',
					graph: this.cbDropGraph(geometry, [[1,1],[-1,1],[2,1],[-2,1],[0,1],[0,1],[-1,-1],[1,-1],[0,-1]],[[0,1],[-1,-1],[1,-1]]),
					value: 6,
					abbrev: '+SB',
					demoted: 20,
				},

				54: {
					name: 'p-leopard-w',
					aspect: 'sh-ox',
					graph: this.cbDropGraph(geometry, [],[[-1,-1],[0,-1],[1,-1],[0,1],[1,1],[-1,1]]),
					value: 7,
					abbrev: '+GL',
					demoted: 23,
				},
				55: {
					name: 'p-leopard-b',
					aspect: 'sh-ox',
					graph: this.cbDropGraph(geometry, [] ,[[-1,1],[0,1],[1,1],[0,-1],[-1,-1],[1,-1]]),
					value: 7,
					abbrev: '+GL',
					demoted: 22,
				},
				56: {
					name: 'horse',
					aspect: 'sh-horse',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1]],[[1,1],[1,-1],[-1,1],[-1,-1]]),
					value: 5.4,
					abbrev: '+B',
					demoted: 24,
				},
				57: {
					name: 'dragon',
					aspect: 'sh-dragon',
					graph: this.cbDropGraph(geometry, [[1,1],[1,-1],[-1,1],[-1,-1]], [[0,1],[1,0],[-1,0],[0,-1]]),
					value: 6.3,
					abbrev: '+R',
					demoted: 25,
				},
				58: {
					name: 'p-silver-w',
					aspect: 'sh-promoted-silver',
					value: 4.9,
					graph: this.cbDropGraph(geometry, [[1,1],[1,0],[-1,0],[-1,1]],[[0,1],[0,-1]]),
					abbrev: '+S',
					demoted: 27,
					
				},
				59: {
					name: 'p-silver-b',
					aspect: 'sh-promoted-silver',
					graph: this.cbDropGraph(geometry, [[-1,-1],[1,0],[-1,0],[1,-1]],[[0,1],[0,-1]]),
					value: 4.9,
					abbrev: '+S',
					demoted: 26,
					
				},

				60: {
					name: 'p-phoenix-w',
					aspect: 'sh-promoted-phoenix',
					graph: this.cbDropGraph(geometry, [], [[0,1],[1,0],[-1,0],[0,-1]]),
					value: 4.9,
					abbrev: '+PH',
					demoted: 29,
				},
				61: {
					name: 'p-phoenix-b',
					aspect: 'sh-promoted-phoenix',
					graph: this.cbDropGraph(geometry, [], [[0,1],[1,0],[-1,0],[0,-1]]),
					value: 4.9,
					abbrev: '+PH',
					demoted: 28,
				},
				62: {
					name: 'p-kirin-w',
					aspect: 'sh-promoted-kirin',
					value: 3.9,
					graph: this.cbDropGraph(geometry, [],[[1,1],[1,-1],[-1,1],[-1,-1]]),
					abbrev: '+KN',
					demoted: 31,
					
				},
				63: {
					name: 'p-kirin-b',
					aspect: 'sh-promoted-kirin',
					graph: this.cbDropGraph(geometry, [],[[1,1],[1,-1],[-1,1],[-1,-1]]),
					value: 3.9,
					abbrev: '+KN',
					demoted: 30,
					
				},

                64: {
					name: 'queen-w',
					aspect: 'sh-queen',
                    isKing: false,
					graph: this.cbDropGraph(geometry,[],[[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]),
					value: 11,
					abbrev: 'FK',
					initial: [{s:1,p:56}],
                    demoted: 65,
                    hand: 17,
				},
                65: {
					name: 'queen-b',
					aspect: 'sh-queen',
					graph: this.cbDropGraph(geometry,[],[[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]),
					value: 11,
					abbrev: 'FK',
					initial: [{s:-1,p:167}],
                    demoted: 64,
                    hand: 17,
				},
				66: {
					name: 'lion-hawk-w',
					aspect: 'sh-lionhawk',
                    graph: this.cbDropGraph(geometry, [[-2,0],[-2,-1],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[2,-1],[2,0],[2,1],[2,2],[1,2],[0,2],[-1,2],[-2,2],[-2,1]],[[1,1],[1,-1],[-1,1],[-1,-1]]),
					value: 11,
					abbrev: 'LN',
					fenAbbrev: 'N',
					initial: [{s:1,p:55}],
					demoted: 67,
					hand: 18,
				},
				67: {
					name: 'lion-hawk-b',
					aspect: 'sh-lionhawk',
                    graph: this.cbDropGraph(geometry, [[-2,0],[-2,-1],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[2,-1],[2,0],[2,1],[2,2],[1,2],[0,2],[-1,2],[-2,2],[-2,1]],[[1,1],[1,-1],[-1,1],[-1,-1]]),
					value: 11,
					abbrev: 'LN',
					initial: [{s:-1,p:168}],
					demoted: 66,
					hand: 18,
				},
				68: {
					name: 'king',
					aspect: 'sh-jade',
					isKing: true,
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]],[]),
					abbrev: 'K',

					initial: [{s:-1,p:200}],
				},
				69: {
					name: 'king',
					aspect: 'sh-king',

					isKing: true,
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]],[]),
					abbrev: 'K',
					initial: [{s:1,p:23}],
				},
			},
			
			promote: function(aGame,piece,move) {




				var start_promo_type = 32;
                // piece promotable
				if(piece.t >= start_promo_type && piece.t < 68)
					return [];
				var f = geometry.C(move.f);
                var rank=geometry.R(move.f);
				if(f < 2 || f > 13 || rank > 12 || rank < 1) return []; // no promotion on drops
				//var f = geometry.R(move.f);
				var rank_next_move = geometry.R(move.t);

				if(piece.s == 1) {

					if(rank_next_move > 8 || rank > 8){
                        return	piece.t < 12 && rank_next_move > 11 - (piece.t > 7)
						?	[piece.t+start_promo_type]
						:	[piece.t, piece.t+start_promo_type];
                    }
				} else {
					if(rank_next_move < 5 || rank < 5){
						return	piece.t < 12 && rank_next_move < 2 + (piece.t > 7)
						?	[piece.t+start_promo_type]
						:	[piece.t, piece.t+start_promo_type];
                    }
				}
				return [];
			},

			evaluate: function(aGame,evalValues,material) {

			},

		};

		return this.cbAddHoldings(geometry, definition);
	}

})();


