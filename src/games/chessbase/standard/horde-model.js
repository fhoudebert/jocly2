/*
 * Horde Chess.
 *
 * Black has an ordinary army. White has 36 Pawns, no King, and nothing else.
 * Black wins by capturing every last Pawn; White wins by checkmating, exactly
 * as in ordinary chess. Stalemate is a draw either way.
 *
 * Three things make this more than a starting position:
 *
 * 1. A side with no royal piece. base-model.js's fast path reads
 *    this.kings[who] and hands it to cbGetAttackers(), which for White would
 *    index the threat graph by undefined and throw on the first move
 *    generated. Model.Game.cbKingless (below) sends a royal-less side down the
 *    multi-royal path instead, which already counts royals and answers "not in
 *    check" for a count of zero. See cbRoyalOptional() in base-model.js.
 *
 * 2. Pawns on the first rank move two squares - but that double step gives no
 *    en passant. Fairy-Stockfish spells the same rule as
 *    "enPassantRegion[BLACK] = Rank3BB" in its horde_variant(): Black may only
 *    capture en passant on the third rank, never on the second. Rather than
 *    special-case the move generator, the first-rank Pawn is its own piece
 *    type - the initial-Pawn graph without "epTarget" - and promote() moves a
 *    Pawn between the three types as it advances.
 *
 * 3. Losing every piece is a loss. base-model.js has no such rule, so it is
 *    read where Annexation reads its own counters (reversi-model.js): as a
 *    terminal test at the top of Evaluate, with a matching guard in
 *    GenerateMoves so a decided position yields no moves - the shape
 *    standard/threecheck-model.js already uses here.
 */

(function() {

	var geometry = Model.Game.cbBoardGeometryGrid(8,8);

	// White's opening army, by rank. Fairy-Stockfish writes the same thing as
	//   rnbqkbnr/pppppppp/8/1PP2PP1/PPPPPPPP/PPPPPPPP/PPPPPPPP/PPPPPPPP w kq - 0 1
	// which ExportBoardState() below reproduces byte for byte.
	var HORDE_RANK1 = [];   // two squares, no en passant behind them
	var HORDE_RANK2 = [];   // two squares, en passant as usual
	var HORDE_PLAIN = [];   // ranks 3 and 4 in full, plus b5 c5 f5 g5
	for(var c=0;c<8;c++) {
		HORDE_RANK1.push({s:1,p:c});
		HORDE_RANK2.push({s:1,p:8+c});
		HORDE_PLAIN.push({s:1,p:16+c});
		HORDE_PLAIN.push({s:1,p:24+c});
	}
	[1,2,5,6].forEach(function(c) {
		HORDE_PLAIN.push({s:1,p:32+c});
	});

	var BaseGenerateMoves = Model.Board.GenerateMoves;
	var BaseEvaluate = Model.Board.Evaluate;
	var BaseExportBoardState = Model.Board.ExportBoardState;

	// White is royal-less by construction, not by accident: see
	// cbRoyalOptional() in base-model.js.
	Model.Game.cbKingless = true;

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
					initial: HORDE_PLAIN,
					epCatch: true,
				},

				1: {
					name: 'ipawn-w',
					aspect: 'pawn',
					graph: this.cbInitialPawnGraph(geometry,1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					initial: HORDE_RANK2,
					epTarget: true,
					epCatch: true,
				},

				// The first-rank Pawn. Same graph as the second-rank one, but
				// no "epTarget": stepping over the second rank leaves nothing
				// for Black to capture in passing.
				9: {
					name: 'hpawn-w',
					aspect: 'pawn',
					graph: this.cbInitialPawnGraph(geometry,1),
					value: 1,
					abbrev: '',
					fenAbbrev: 'P',
					initial: HORDE_RANK1,
					epCatch: true,
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
					initial: [{s:-1,p:48},{s:-1,p:49},{s:-1,p:50},{s:-1,p:51},{s:-1,p:52},{s:-1,p:53},{s:-1,p:54},{s:-1,p:55}],
					epTarget: true,
				},

				/*
				 * The officers come in two sets, one per side, where ordinary
				 * Chess needs only one.
				 *
				 * base-model.js decides which side a FEN letter belongs to
				 * from the type's `initial` squares, falling back to a "-w" /
				 * "-b" name. Here every officer's initial squares are Black's,
				 * so a single set would claim the lowercase letters and leave
				 * "N", "B", "R", "Q" unmapped - and White reaches all four by
				 * promotion. A position with a promoted white Queen exported
				 * fine and came back rejected: "FEN invalid board spec Q".
				 *
				 * So White's officers are declared separately, with no initial
				 * squares and a "-w" name for the affinity to read. They carry
				 * `aspect` because the view resolves a piece's appearance from
				 * `aspect || name` and knows nothing of the suffix.
				 */
				4: {
					name: 'knight-b',
					aspect: 'knight',
					graph: this.cbKnightGraph(geometry),
					value: 2.9,
					abbrev: 'N',
					initial: [{s:-1,p:57},{s:-1,p:62}],
				},

				5: {
					name: 'bishop-b',
					aspect: 'bishop',
					graph: this.cbBishopGraph(geometry),
					value: 3.1,
					abbrev: 'B',
					initial: [{s:-1,p:58},{s:-1,p:61}],
				},

				6: {
					name: 'rook-b',
					aspect: 'rook',
					graph: this.cbRookGraph(geometry),
					value: 5,
					abbrev: 'R',
					initial: [{s:-1,p:56},{s:-1,p:63}],
					castle: true,
				},

				7: {
					name: 'queen-b',
					aspect: 'queen',
					graph: this.cbQueenGraph(geometry),
					value: 9,
					abbrev: 'Q',
					initial: [{s:-1,p:59}],
				},

				10: {
					name: 'knight-w',
					aspect: 'knight',
					graph: this.cbKnightGraph(geometry),
					value: 2.9,
					abbrev: 'N',
				},

				11: {
					name: 'bishop-w',
					aspect: 'bishop',
					graph: this.cbBishopGraph(geometry),
					value: 3.1,
					abbrev: 'B',
				},

				12: {
					name: 'rook-w',
					aspect: 'rook',
					graph: this.cbRookGraph(geometry),
					value: 5,
					abbrev: 'R',
				},

				13: {
					name: 'queen-w',
					aspect: 'queen',
					graph: this.cbQueenGraph(geometry),
					value: 9,
					abbrev: 'Q',
				},

				8: {
					name: 'king',
					isKing: true,
					graph: this.cbKingGraph(geometry),
					abbrev: 'K',
					initial: [{s:-1,p:60}],
				},

			},

			/*
			 * A White Pawn changes type as it leaves a rank, because in this
			 * game "may I step two squares" is a property of where it stands,
			 * not of whether it has moved:
			 *
			 *   rank 1 -> rank 2   still two squares, and now with en passant
			 *   rank 1 -> rank 3   done, an ordinary Pawn
			 *   rank 2 -> anywhere done, an ordinary Pawn
			 *
			 * The first line is the one worth stating: a Pawn that walks from
			 * the first rank to the second has not spent its double step, it
			 * has arrived on the rank that normally grants one.
			 */
			promote: function(aGame,piece,move) {
				if(piece.t==9)
					return [geometry.R(move.t)==1 ? 1 : 0];
				if(piece.t==1)
					return [0];
				if(piece.t==3)
					return [2];
				if((piece.t==0 || piece.t==1 || piece.t==9) && geometry.R(move.t)==7)
					return [10,11,12,13];
				if(piece.t==2 && geometry.R(move.t)==0)
					return [4,5,6,7];
				return [];
			},

			// Black's castling only: White has neither King nor Rook, and the
			// white entries of the ordinary table would name squares that hold
			// Pawns.
			castle: {
				"60/56": {k:[59,58],r:[57,58,59],n:"O-O-O"},
				"60/63": {k:[61,62],r:[62,61],n:"O-O"},
			},

			/*
			 * Re-type the Pawns after reading a FEN.
			 *
			 * A FEN writes every Pawn as "P", and base-model.js maps a letter
			 * to a single piece type, so all of one side's Pawns come back as
			 * one type - whichever is declared last - and either gain a double
			 * step they should not have or lose one they should. Here the rank
			 * says which type it is, with no ambiguity to resolve.
			 *
			 * Black needs this as much as White does, and not only for
			 * symmetry: without it a black Pawn read from a FEN on the third
			 * rank comes back as an initial Pawn and steps two squares to the
			 * first. (The same flattening affects ordinary Chess, where a Pawn
			 * read on the fourth rank can step two more. That is a base-model
			 * issue, not one this game can fix from here.)
			 */
			importGame: function(initial,format,data) {
				initial.pieces.forEach(function(piece) {
					var rank=geometry.R(piece.p);
					if(piece.s==1) {
						if(piece.t!=0 && piece.t!=1 && piece.t!=9) return;
						piece.t = rank==0 ? 9 : (rank==1 ? 1 : 0);
						piece.m = rank>1;
					} else {
						if(piece.t!=2 && piece.t!=3) return;
						piece.t = rank==6 ? 3 : 2;
						piece.m = rank!=6;
					}
				});
			},

			evaluate: function(aGame,evalValues,material) {

				// 50 moves without a capture. The insufficient-material draw
				// of ordinary Chess is deliberately absent: White has no King
				// to be bare with, and a single Pawn against a bare King is a
				// game, not a dead position.
				if(this.noCaptCount>=100) {
					this.mFinished=true;
					this.mWinner=JocGame.DRAW;
				}

				// Promotion is White's entire plan, so the usual
				// distance-to-promotion terms carry more here than in Chess.
				var distPromo=aGame.cbUseTypedArrays?new Int8Array(3):[0,0,0];
				var height=geometry.height;
				[0,1,9].forEach(function(t) {
					var pawns=material[1].byType[t];
					if(!pawns) return;
					for(var i=0;i<pawns.length;i++)
						switch(height-geometry.R(pawns[i].p)) {
						case 2: distPromo[0]++; break;
						case 3: distPromo[1]++; break;
						case 4: distPromo[2]++; break;
						}
				});
				var pawns=material[-1].byType[2];
				if(pawns)
					for(var i=0;i<pawns.length;i++)
						switch(geometry.R(pawns[i].p)) {
						case 1: distPromo[0]--; break;
						case 2: distPromo[1]--; break;
						case 3: distPromo[2]--; break;
						}
				if(distPromo[0]!=0) evalValues['distPawnPromo1']=distPromo[0];
				if(distPromo[1]!=0) evalValues['distPawnPromo2']=distPromo[1];
				if(distPromo[2]!=0) evalValues['distPawnPromo3']=distPromo[2];

				// Every Pawn traded off is a step towards White's loss, and
				// the plain material term does not say that: 36 Pawns against
				// a full army is roughly level on points, yet three Pawns
				// against it is not. Counting what is left of the horde makes
				// the search defend it.
				evalValues['hordeSize']=material[1].byType[0]?0:0;
				var horde=0;
				[0,1,9].forEach(function(t) {
					var group=material[1].byType[t];
					if(group) horde+=group.length;
				});
				evalValues['hordeSize']=horde;

				var minorPiecesMoved=0;
				for(var t=4;t<=5;t++) {
					var pieces=material[-1].byType[t];
					if(pieces)
						for(var i=0;i<pieces.length;i++)
							if(pieces[i].m)
								minorPiecesMoved-=1;
				}
				if(minorPiecesMoved!=0)
					evalValues['minorPiecesMoved']=minorPiecesMoved;
			},

		};
	}

	// Has the horde been wiped out? Returns the winner, or undefined while the
	// game is still on. Independent of mWho on purpose: Evaluate() is reached
	// with mWho meaning "side to move" from EvaluateBoard() but "side that just
	// moved" from the search, which evaluates a child before flipping it.
	Model.Board.hordeWinner = function(aGame) {
		var pieces=this.pieces;
		for(var i=0;i<pieces.length;i++) {
			var piece=pieces[i];
			if(piece.s==1 && piece.p>=0)
				return undefined;
		}
		return JocGame.PLAYER_B;
	}

	// Without this, a White turn with nothing left to move reaches the base
	// "no legal move" verdict and is called stalemate - a draw - instead of the
	// loss it is. EvaluateBoard() generates moves before it evaluates and only
	// evaluates if that left mFinished false, so the test has to be here too.
	Model.Board.GenerateMoves = function(aGame) {
		var winner=this.hordeWinner(aGame);
		if(winner!==undefined) {
			this.mMoves=[];
			this.mFinished=true;
			this.mWinner=winner;
			return;
		}
		return BaseGenerateMoves.call(this,aGame);
	}

	Model.Board.Evaluate = function(aGame) {
		var winner=this.hordeWinner(aGame);
		if(winner!==undefined) {
			this.mEvaluation=0;
			this.mFinished=true;
			this.mWinner=winner;
			return;
		}
		return BaseEvaluate.apply(this,arguments);
	}

	/*
	 * White has no King and no Rook, so it has no castling rights to write.
	 * base-model.js derives the field from "has this side castled yet", which
	 * is false for White and would emit "KQkq" - a FEN claiming rights for
	 * pieces that are not on the board. Fairy-Stockfish's own horde startFen
	 * says "kq", and jocly.fairy.js sends this string to the engine verbatim.
	 */
	Model.Board.ExportBoardState = function(aGame) {
		var fen=BaseExportBoardState.call(this,aGame);
		var parts=fen.split(" ");
		if(parts.length!=6)
			return fen;
		parts[2]=parts[2].replace(/[KQA-H]/g,"");
		if(parts[2]=="")
			parts[2]="-";
		return parts.join(" ");
	}

})();
