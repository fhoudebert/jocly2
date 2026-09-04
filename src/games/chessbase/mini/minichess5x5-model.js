/*
 * The three 5x5 minichess variants, behind one prelude.
 *
 *   Gardner  RNBQK / rnbqk   the 1969 original, both back ranks in the same
 *                            file order, kings facing on the e-file
 *   Baby     RNBQK / kqbnr   the mirrored arrangement
 *   Malett   RNKQN / rbkqb   asymmetric: White has two Knights and no Bishop,
 *                            Black two Bishops and no Knight
 *
 * They were three copies of this file differing by five lines - four `initial`
 * lists and the castling table - so they are one file now, and the choice is
 * a prelude, the way Capablanca picks among its ten arrangements.
 *
 * The setup is applied through the `custom` hook rather than the declarative
 * `setups` strings, and that is forced rather than preferred. ApplyMove in
 * prelude-model.js walks `dialog.squares[who]` for each side but restarts the
 * setup string from its first character every time, so both colours must read
 * the same letters in the order their own square list gives them. That fixes
 * one white/black convention for the whole dialog: with the square lists in
 * file order Gardner comes out right and Baby cannot, with Black's list
 * reversed Baby comes out right and Gardner cannot, and Malett - whose two
 * armies hold different pieces - is out of reach either way. The hook is the
 * same escape Kotaishi Shogi uses, and `labels` names the buttons, since a
 * back rank drawn as icons would not tell Gardner from Baby: their White
 * halves are identical.
 *
 * Castling does go through the declarative path: `dialog.castle` replaces the
 * table per setup, which is exactly what the three files disagreed on.
 */

(function() {
	
	var geometry = Model.Game.cbBoardGeometryGrid(5,5);

	// piece type indices, as declared in pieceTypes below
	var TYPE = { N:4, B:5, R:6, Q:7, K:8 };

	// each back rank read a1..e1 and a5..e5
	var ARRANGEMENTS = [
		{ white: "RNBQK", black: "RNBQK" },   // Gardner
		{ white: "RNBQK", black: "KQBNR" },   // Baby
		{ white: "RNKQN", black: "RBKQB" },   // Malett
	];

	// Gardner and Baby castle towards the King's own corner and land it on the
	// c-file; Malett, whose King starts on c, has only the one castling and
	// lands on b. Both of Malett's colours castle the same physical way - the
	// two back ranks share the R.K.Q. layout - so the square lists are not
	// mirrored between them.
	var gardnerCastle = {
		"4/0": {k:[3,2],r:[1,2,3],n:"O-O"},
		"24/20": {k:[23,22],r:[21,22,23],n:"O-O"},
	};
	var babyCastle = {
		"4/0": {k:[3,2],r:[1,2,3],n:"O-O"},
		"20/24": {k:[21,22],r:[23,22,21],n:"O-O"},
	};
	var malettCastle = {
		"2/0": {k:[1],r:[1,2],n:"O-O"},
		"22/20": {k:[21],r:[21,22],n:"O-O"},
	};
	
	Model.Game.cbDefine = function() {
		
		return {
			
			geometry: geometry,
			
			pieceTypes: {

				0: {
					name: 'pawn-w',
					aspect: 'pawn',
					graph: this.cbPawnGraph(geometry,1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					epCatch: true,
				},
				
				1: {
					name: 'ipawn-w',
					aspect: 'pawn',
					graph: this.cbInitialPawnGraph(geometry,1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:1,p:5},{s:1,p:6},{s:1,p:7},{s:1,p:8},{s:1,p:9}],
					epCatch: true,
					epTarget: true,
				},
				
				2: {
					name: 'pawn-b',
					aspect: 'pawn',
					graph: this.cbPawnGraph(geometry,-1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					epCatch: true,
				},

				3: {
					name: 'ipawn-b',
					aspect: 'pawn',
					graph: this.cbInitialPawnGraph(geometry,-1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:-1,p:15},{s:-1,p:16},{s:-1,p:17},{s:-1,p:18},{s:-1,p:19}],
					epCatch: true,
					epTarget: true,
				},
				
				4: {
					name: 'knight',
					graph: this.cbKnightGraph(geometry),
					value: 2.9,
					abbrev: 'N',
					initial: [{s:1,p:1},{s:-1,p:21}],
				},
				
				5: {
					name: 'bishop',
					graph: this.cbBishopGraph(geometry),
					value: 3.1,
					abbrev: 'B',
					initial: [{s:1,p:2},{s:-1,p:22}],
				},

				6: {
					name: 'rook',
					graph: this.cbRookGraph(geometry),
					value: 5,
					abbrev: 'R',
					initial: [{s:1,p:0},{s:-1,p:20}],
					castle: true,
				},

				7: {
					name: 'queen',
					graph: this.cbQueenGraph(geometry),
					value: 9,
					abbrev: 'Q',
					initial: [{s:1,p:3},{s:-1,p:23}],
				},
				
				8: {
					name: 'king',
					isKing: true,
					graph: this.cbKingGraph(geometry),
					abbrev: 'K',
					initial: [{s:1,p:4},{s:-1,p:24}],
				},
				
			},
			
			promote: function(aGame,piece,move) {
				if(piece.t==1)
					return [0];
				else if(piece.t==3)
					return [2];
				else if(piece.t==0 && geometry.R(move.t)==4)
					return [4,5,6,7];
				else if(piece.t==2 && geometry.R(move.t)==0)
					return [4,5,6,7];
				return [];
			},

			// the arrangement White and Black start from, before the prelude
			// speaks: Gardner's, so setup 0 has nothing to rewrite
			castle: gardnerCastle,

			/*
			 * Loading a recorded game must not re-open the three buttons -
			 * see prelude-model.js. The arrangement is readable from a
			 * starting position, so the flag holds here as it does for
			 * Capablanca. It carries Capablanca's wrinkle too: a position
			 * loaded mid-game keeps whichever castling table the last choice
			 * left behind, since nothing in the position says which of the
			 * three it came from.
			 */
			cbPreludeFromBoard: true,

			prelude: [{
				panelWidth: 3,
				// unused for placement - `squares` is empty and `custom` does
				// the work - but its length is what draws three buttons
				setups: ["RNBQK","RNBQK","RNKQN"],
				labels: ["Gardner", "Baby", "Malett"],
				squares: { 1: [], '-1': [] },
				castle: [gardnerCastle, babyCastle, malettCastle],
				persistent: true,      // keep the choice for the next game too
				custom: function(setup, board, aGame) {
					var arrangement = ARRANGEMENTS[setup];
					// read every square before touching anything: cbPlacePieces
					// sorts the piece list, so board.board is only valid until
					// the first call
					for(var file=0; file<5; file++) {
						board.pieces[board.board[file]].t = TYPE[arrangement.white[file]];
						board.pieces[board.board[20+file]].t = TYPE[arrangement.black[file]];
					}
					// rebuilds board, kings - Baby and Malett move the King off
					// the square Gardner puts it on - and the Zobrist signature
					board.cbPlacePieces(aGame);
					// which throws away the side-to-move flip ApplyMove applied
					// just before calling us
					if(board.mWho<0)
						board.zSign ^= aGame.wKey(1);
				},
			}, 0],   // second, empty stage: Black passes, so White still moves first
			
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
				
				// check 50 moves without capture
				if(this.noCaptCount>=100) {
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