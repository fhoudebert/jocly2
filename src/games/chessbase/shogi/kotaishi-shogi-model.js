
(function(){
	var geometry = Model.Game.cbDropGeometry(9,9,0);
	
	Model.Game.cbOnStaleMate = -1; // stalemate = last player wins
	Model.Game.cbMaxRepeats = 4;
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
		
		var definition = {
			
			geometry: geometry,
			
			pieceTypes: {

				0: {
					name: 'pawn-w',
					aspect: 'sh-pawn',
					graph: this.cbDropGraph(geometry, [[0,1]],[],0,1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:1,p:28},{s:1,p:29},{s:1,p:30},{s:1,p:31},{s:1,p:32},{s:1,p:33},{s:1,p:34},{s:1,p:35},{s:1,p:36}],
					demoted: 1,
					hand: 0,
				},
				
				1: {
					name: 'pawn-b',
					aspect: 'sh-pawn',
					graph: this.cbDropGraph(geometry, [[0,-1]],[],1,0),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:-1,p:80},{s:-1,p:81},{s:-1,p:82},{s:-1,p:83},{s:-1,p:84},{s:-1,p:85},{s:-1,p:86},{s:-1,p:87},{s:-1,p:88},],
					demoted: 0,
					hand: 0,
				},

				2: {
					name: 'lance-w',
					aspect: 'sh-lance',
					graph: this.cbDropGraph(geometry, [],[[0,1]],0,1),
					value: 4.3,
					abbrev: 'L',
					initial: [{s:1,p:2},{s:1,p:10}],
					demoted: 3,
					hand: 1,
				},
				
				3: {
					name: 'lance-b',
					aspect: 'sh-lance',
					graph: this.cbDropGraph(geometry, [],[[0,-1]],1,0),
					value: 4.3,
					abbrev: 'L',
					initial: [{s:-1,p:106},{s:-1,p:114}],
					demoted: 2,
					hand: 1,
				},
				
				4: {
					name: 'knight-w',
					aspect: 'sh-knight',
					graph: this.cbDropGraph(geometry, [[1,2],[-1,2]],[],0,2),
					value: 4.5,
					abbrev: 'N',
					initial: [{s:1,p:3},{s:1,p:9}],
					demoted: 5,
					hand: 2,
				},
				
				5: {
					name: 'knight-b',
					aspect: 'sh-knight',
					graph: this.cbDropGraph(geometry, [[1,-2],[-1,-2]],[],2,0),
					value: 4.5,
					abbrev: 'N',
					initial: [{s:-1,p:107},{s:-1,p:113}],
					demoted: 4,
					hand: 2,
				},
				
				6: {
					name: 'silver-w',
					aspect: 'sh-silver',
					graph: this.cbDropGraph(geometry, [[0,1],[1,1],[1,-1],[-1,1],[-1,-1]],[]),
					value: 6.4,
					abbrev: 'S',
					initial: [{s:1,p:4},{s:1,p:8}],
					demoted: 7,
					hand: 3,
				},
				
				7: {
					name: 'silver-b',
					aspect: 'sh-silver',
					graph: this.cbDropGraph(geometry, [[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],[]),
					value: 6.4,
					abbrev: 'S',
					initial: [{s:-1,p:108},{s:-1,p:112}],
					demoted: 6,
					hand: 3,
				},
				
				8: {
					name: 'bishop',
					aspect: 'sh-bishop',
					graph: this.cbDropGraph(geometry, [],[[1,1],[1,-1],[-1,1],[-1,-1]]),
					value: 8.9,
					abbrev: 'B',
					initial: [{s:1,p:16},{s:-1,p:100}],
					hand: 5,
				},

				9: {
					name: 'rook',
					aspect: 'sh-rook',
					graph: this.cbDropGraph(geometry, [], [[0,1],[1,0],[-1,0],[0,-1]]),
					value: 10.4,
					abbrev: 'R',
					initial: [{s:1,p:22},{s:-1,p:94}],
					castle: true,
					hand: 6,
				},

				10: {
					name: 'gold-w',
					aspect: 'sh-gold',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1]],[]),
					value: 6.9,
					abbrev: 'G',
					initial: [{s:1,p:5},{s:1,p:7}],
					demoted: 11,
					hand: 4,
				},
				
				11: {
					name: 'gold-b',
					aspect: 'sh-gold',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,-1],[-1,-1]],[]),
					value: 6.9,
					abbrev: 'G',
					initial: [{s:-1,p:109},{s:-1,p:111}],
					demoted: 10,
					hand: 4,
				},
				
				12: {
					name: 'king',
					aspect: 'sh-king',
					isKing: true,
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]],[]),
					abbrev: 'K',
					initial: [{s:1,p:6}],
				},
				
				13: {
					name: 'p-pawn-w',
					aspect: 'sh-tokin',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1]],[]),
					value: 4.2,
					abbrev: '+P',
					demoted: 1,
				},
				
				14: {
					name: 'p-pawn-b',
					aspect: 'sh-tokin',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,-1],[-1,-1]],[]),
					value: 4.2,
					abbrev: '+P',
					demoted: 0,
				},
				
				15: {
					name: 'p-lance-w',
					aspect: 'sh-promoted-lance',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1]],[]),
					value: 6.3,
					abbrev: '+L',
					demoted: 3,
				},
				
				16: {
					name: 'p-lance-b',
					aspect: 'sh-promoted-lance',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,-1],[-1,-1]],[]),
					value: 6.3,
					abbrev: '+L',
					demoted: 2,
				},
				
				17: {
					name: 'p-knight-w',
					aspect: 'sh-promoted-knight',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1]],[]),
					value: 6.4,
					abbrev: '+N',
					demoted: 5,
				},
				
				18: {
					name: 'p-knight-b',
					aspect: 'sh-promoted-knight',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,-1],[-1,-1]],[]),
					value: 6.4,
					abbrev: '+N',
					demoted: 4,
				},
				
				19: {
					name: 'p-silver-w',
					aspect: 'sh-promoted-silver',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1]],[]),
					value: 6.7,
					abbrev: '+S',
					demoted: 7,
				},
				
				20: {
					name: 'p-silver-b',
					aspect: 'sh-promoted-silver',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,-1],[-1,-1]],[]),
					value: 6.7,
					abbrev: '+S',
					demoted: 6,
				},
				
				21: {
					name: 'horse',
					aspect: 'sh-horse',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1]],[[1,1],[1,-1],[-1,1],[-1,-1]]),
					value: 11.5,
					abbrev: '+B',
					demoted: 8,
				},
				
				22: {
					name: 'dragon',
					aspect: 'sh-dragon',
					graph: this.cbDropGraph(geometry, [[1,1],[1,-1],[-1,1],[-1,-1]], [[0,1],[1,0],[-1,0],[0,-1]]),
					value: 13.0,
					abbrev: '+R',
					demoted: 9,
				},

				23: {
					name: 'king',
					aspect: 'sh-jade',
					isKing: true,
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]],[]),
					abbrev: 'K',
					initial: [{s:-1,p:110}],
				},
				// Drunk Elephant (Sho Shogi): one step in every direction but
				// straight backward. Promotes to Crown Prince. Directional, so it
				// is split white/black like the pawns and golds (this also gives
				// each color the right `demoted` target when captured into hand).
				24: {
					name: 'elephant-w',
					aspect: 'sh-elephant',
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]],[],0,1),
					value: 5,
					abbrev: 'DE',
					fenAbbrev: 'E',
					initial: [{s:1,p:19}],
					demoted: 25,
					hand: 7,
				},

				25: {
					name: 'elephant-b',
					aspect: 'sh-elephant',
					graph: this.cbDropGraph(geometry, [[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]],[],1,0),
					value: 5,
					abbrev: 'DE',
					fenAbbrev: 'E',
					initial: [{s:-1,p:97}],
					demoted: 24,
					hand: 7,
				},

				// Crown Prince (Kōtaishi, 太子): promoted Drunk Elephant, moves as a
				// King. ROYAL (isKing:2) - a genuine second king: while a side
				// holds both king and prince it cannot be checkmated, and it is
				// defeated only when BOTH royals are gone (Shō Shogi rule). The
				// engine's multi-royal path (base-model.js cbInLosingCheck, keyed
				// on isKing:2) handles this; the loss test already fires on "no
				// royal left". Split white/black so a captured Prince demotes to
				// the capturer's Elephant in hand. value:100 like a king, so the
				// AI never trades it off as if it were an ordinary piece.
				26: {
					name: 'prince-w',
					aspect: 'sh-prince',
					isKing: 2,
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]],[]),
					value: 100,
					abbrev: '+DE',
					fenAbbrev: '+E',
					demoted: 25,
				},

				27: {
					name: 'prince-b',
					aspect: 'sh-prince',
					isKing: 2,
					graph: this.cbDropGraph(geometry, [[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]],[]),
					value: 100,
					abbrev: '+DE',
					fenAbbrev: '+E',
					demoted: 24,
				},
				
			},
			
			promote: function(aGame,piece,move) {
				var c = geometry.C(move.f);
				if(c < 2 || c > 10) return []; // drop: never promotes
				// Drunk Elephant -> Crown Prince, optional, on entering /
				// moving within / leaving the promotion zone (the 3 ranks
				// furthest from the mover). [current,promoted] = optional.
				if(piece.t == 24) // elephant-w
					return (geometry.R(move.t) > 5 || geometry.R(move.f) > 5) ? [24,26] : [];
				if(piece.t == 25) // elephant-b
					return (geometry.R(move.t) < 3 || geometry.R(move.f) < 3) ? [25,27] : [];
				if(piece.t >= 10)
					return [];
				var f = geometry.C(move.f);
				if(f < 2 || f > 10) return []; // drop
				var f = geometry.R(move.f);
				var t = geometry.R(move.t);
				if(piece.s == 1) {
					if(t > 5 || f > 5)
						return	piece.t < 6 && t > 7 - (piece.t > 3)
						?	[piece.t+13]
						:	[piece.t, piece.t+13];
				} else {
					if(t < 3 || f < 3)
						return	piece.t < 6 && t < 1 + (piece.t > 3)
						?	[piece.t+13]
						:	[piece.t, piece.t+13];
				}
				return [];
			},

			evaluate: function(aGame,evalValues,material) {

			},

			/*
			 * Sho Shogi is this same game without drops: same board, same
			 * pieces, but a captured piece leaves play instead of joining the
			 * hand of its captor - drops were a later invention. The choice is
			 * offered once, before the first move.
			 *
			 * Nothing is rebuilt for it. A drop here is an ordinary graph move
			 * from a holding square, so a hand that never receives anything
			 * produces no drops at all; and Model.Game.hand, the table saying
			 * which square each captured type goes to, is already consulted
			 * with "not all types have to go in hand". Emptying it is the
			 * whole of Sho Shogi.
			 *
			 * The setups rewrite no piece - squares are empty on both sides -
			 * so only the custom hook runs.
			 */
			prelude: [{
				panelWidth: 2,
				/*
				 * The two buttons, named underneath because a rule cannot be
				 * drawn. Both show the King and the Crown Prince the two games
				 * share; Kōtaishi adds an elephant, for the captured piece that
				 * comes back to be dropped.
				 */
				setups: ["K+DE", "K+DEDE"],
				labels: ["Shō shogi", "Kōtaishi"],
				squares: { 1: [], '-1': [] },
				persistent: true,      // keep the choice for the next game too
				custom: function(setup, board, aGame) {
					if(setup == 0) // Shō shogi: a captured piece leaves play
						Model.Game.hand = { '-1': [], '1': [] };
					else           // Kōtaishi: it joins the hand of its captor
						Model.Game.hand = Model.Game.kotaishiHand;
				},
			}, 0],   // second, empty stage: Black passes, so White still moves first

		};

		var built = this.cbAddHoldings(geometry, definition);
		// keep the hand table cbAddHoldings just built, so the prelude can put
		// it back when Kotaishi is chosen after a game of Sho Shogi
		Model.Game.kotaishiHand = Model.Game.hand;
		return built;
	}

})();
