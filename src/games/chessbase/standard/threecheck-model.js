/*
 * Three-check chess (3-check).
 *
 * Ordinary chess in every respect - same pieces, same moves, same castling,
 * same promotion, same checkmate - with one added way to win: deliver check
 * three times. Nothing here touches move generation or legality; the whole
 * variant is a pair of counters plus the verdict that reads them.
 *
 * The counters follow the same five-step life cycle as the piece/pass
 * counters of Annexation (src/games/reversi/reversi-model.js): declared in
 * InitialPosition, copied in CopyFrom, updated incrementally in ApplyMove,
 * read as a terminal test at the top of Evaluate, and fed to the heuristic
 * as one more evalValues entry.
 *
 * They differ from Annexation's `counts` on one point, and it matters: the
 * number of checks already delivered cannot be recomputed from the position.
 * Two boards with identical pieces but 0-0 and 2-2 on the counters are
 * genuinely different states, so - unlike reversi's `passes` - the counters
 * are mixed into GetSignature(). Left out, the transposition table and the
 * repetition detector would treat "one check from losing" and "nothing
 * happened yet" as the same node.
 */

(function() {

	var geometry = Model.Game.cbBoardGeometryGrid(8,8);

	// Checks needed to win. Fairy-Stockfish's "5check" is this exact
	// variant with the constant at 5 (see fivecheck_variant() in its
	// variant.cpp), so keeping it named makes that a one-line derivative.
	var TC_MAX = 3;

	// Heuristic worth of having delivered n checks, indexed 0..TC_MAX-1
	// (TC_MAX itself is terminal and never evaluated). Convex on purpose:
	// the second check is worth much more than the first, because it puts
	// the opponent one tempo from losing.
	var TC_WEIGHT = [0, 1, 4];

	// Side -> counter index, the convention Annexation uses: 0 = White (+1),
	// 1 = Black (-1). tcChecks[i] counts checks DELIVERED BY that side.
	function TC_IDX(side) {
		return (1-side)/2;
	}

	// One key per reachable (white,black) counter pair, XORed into the board
	// signature. Built from the same PRNG base-model.js uses for its own
	// Zobrist tables, so no new dependency.
	var TC_KEYS = (function() {
		var mt = JocGame.LetsTwist(0x33ec);
		var keys = [];
		for(var i=0;i<(TC_MAX+1)*(TC_MAX+1);i++)
			keys.push(mt.genrand_int32());
		keys[0]=0; // 0-0 must not perturb the signature of a fresh position
		return keys;
	})();

	// Base implementations, captured before we shadow them. base-model.js is
	// listed before this file in the game's modelScripts (see
	// manifest/standard.js), so these are its versions.
	var BaseInit = Model.Board.Init;
	var BaseInitialPosition = Model.Board.InitialPosition;
	var BaseCopyFrom = Model.Board.CopyFrom;
	var BaseApplyMove = Model.Board.ApplyMove;
	var BaseGenerateMoves = Model.Board.GenerateMoves;
	var BaseEvaluate = Model.Board.Evaluate;
	var BaseGetSignature = Model.Board.GetSignature;
	var BaseExportBoardState = Model.Board.ExportBoardState;
	var BaseImport = Model.Game.Import;

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
					initial: [{s:1,p:8},{s:1,p:9},{s:1,p:10},{s:1,p:11},{s:1,p:12},{s:1,p:13},{s:1,p:14},{s:1,p:15}],
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
					initial: [{s:-1,p:48},{s:-1,p:49},{s:-1,p:50},{s:-1,p:51},{s:-1,p:52},{s:-1,p:53},{s:-1,p:54},{s:-1,p:55}],
					epTarget: true,
				},

				4: {
					name: 'knight',
					graph: this.cbKnightGraph(geometry),
					value: 2.9,
					abbrev: 'N',
					initial: [{s:1,p:1},{s:1,p:6},{s:-1,p:57},{s:-1,p:62}],
				},

				5: {
					name: 'bishop',
					graph: this.cbBishopGraph(geometry),
					value: 3.1,
					abbrev: 'B',
					initial: [{s:1,p:2},{s:1,p:5},{s:-1,p:58},{s:-1,p:61}],
				},

				6: {
					name: 'rook',
					graph: this.cbRookGraph(geometry),
					value: 5,
					abbrev: 'R',
					initial: [{s:1,p:0},{s:1,p:7},{s:-1,p:56},{s:-1,p:63}],
					castle: true,
				},

				7: {
					name: 'queen',
					graph: this.cbQueenGraph(geometry),
					value: 9,
					abbrev: 'Q',
					initial: [{s:1,p:3},{s:-1,p:59}],
				},

				8: {
					name: 'king',
					isKing: true,
					graph: this.cbKingGraph(geometry),
					abbrev: 'K',
					initial: [{s:1,p:4},{s:-1,p:60}],
				},

			},

			promote: function(aGame,piece,move) {
				if(piece.t==1)
					return [0];
				else if(piece.t==3)
					return [2];
				else if(piece.t==0 && geometry.R(move.t)==7)
					return [4,5,6,7];
				else if(piece.t==2 && geometry.R(move.t)==0)
					return [4,5,6,7];
				return [];
			},

			castle: {
				"4/0": {k:[3,2],r:[1,2,3],n:"O-O-O"},
				"4/7": {k:[5,6],r:[6,5],n:"O-O"},
				"60/56": {k:[59,58],r:[57,58,59],n:"O-O-O"},
				"60/63": {k:[61,62],r:[62,61],n:"O-O"},
			},

			evaluate: function(aGame,evalValues,material) {

				// Insufficient material is NOT a draw here the way it is in
				// ordinary chess: a lone King still checks, and three checks
				// win with no mate in sight. K vs K is dead, everything else
				// is left alone - so the basic-model draw test is not
				// reproduced.
				var white=material[1].count;
				var black=material[-1].count;
				var whiteBare=!white[0] && !white[1] && !white[4] && !white[5] && !white[6] && !white[7];
				var blackBare=!black[2] && !black[3] && !black[4] && !black[5] && !black[6] && !black[7];
				if(whiteBare && blackBare) {
					this.mFinished=true;
					this.mWinner=JocGame.DRAW;
				}

				// 50 moves without capture, unchanged.
				if(this.noCaptCount>=100) {
					this.mFinished=true;
					this.mWinner=JocGame.DRAW;
				}

				// The check counters, as one more weighted term. Annexation
				// does the same with `evalValues.count` - a counter that
				// decides the game is also the counter the search should be
				// steering by.
				var tc=this.tcChecks;
				evalValues["threeCheck"]=TC_WEIGHT[tc[0]]-TC_WEIGHT[tc[1]];

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
				pawns=material[-1].byType[2];
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

	// --- the counters ---------------------------------------------------

	Model.Board.Init = function(aGame) {
		BaseInit.call(this,aGame);
		this.tcChecks=[0,0];
	}

	Model.Board.InitialPosition = function(aGame) {
		BaseInitialPosition.call(this,aGame);
		var tc=this.tcChecks;
		if(tc===undefined)
			tc=this.tcChecks=[0,0];
		tc[0]=tc[1]=0;
		// A position loaded from a FEN carrying the check field: Import()
		// below parks the delivered counts on mInitial, the same way
		// base-model.js parks the halfmove clock as mInitial.noCaptCount.
		if(aGame.mInitial && aGame.mInitial.tcChecks) {
			tc[0]=aGame.mInitial.tcChecks[0];
			tc[1]=aGame.mInitial.tcChecks[1];
		}
	}

	// CopyFrom runs once per child of every expanded node. base-model.js
	// goes out of its way to reuse the destination's arrays rather than
	// allocate; a fresh [a,b] here on every copy would put that allocation
	// straight back, so the pair is reused too.
	Model.Board.CopyFrom = function(aBoard) {
		BaseCopyFrom.call(this,aBoard);
		var tc=this.tcChecks;
		if(tc===undefined)
			tc=this.tcChecks=[0,0];
		tc[0]=aBoard.tcChecks[0];
		tc[1]=aBoard.tcChecks[1];
	}

	Model.Board.ApplyMove = function(aGame,move) {
		// mWho is still the side that is moving: base-model.js's own
		// ApplyMove relies on that too, and it is the caller that flips it
		// afterwards (JocGame.ApplyMove, JocBoard.MakeAndApply).
		var who=this.mWho;
		BaseApplyMove.call(this,aGame,move);
		// move.ck is set by GenerateMoves() for every legal move it emits,
		// and base ApplyMove already depends on it for this.check - a move
		// reaching here without it would break check detection long before
		// it broke the counters, so there is nothing extra to guard.
		if(move.ck)
			this.tcChecks[TC_IDX(who)]++;
	}

	// Winner decided by the counters alone, or undefined if the game is
	// still on. Deliberately independent of mWho: Evaluate() is reached
	// with mWho meaning "side to move" from EvaluateBoard() but "side that
	// just moved" from the search (JocGame.Engine evaluates the child
	// before flipping it), and a verdict must not depend on which.
	Model.Board.tcWinner = function() {
		if(this.tcChecks[0]>=TC_MAX)
			return JocGame.PLAYER_A;
		if(this.tcChecks[1]>=TC_MAX)
			return JocGame.PLAYER_B;
		return undefined;
	}

	// A decided position has no continuations. Without this, EvaluateBoard()
	// would hand the UI a legal move list for a game that is already over
	// (it calls GenerateMoves first and only evaluates if that left
	// mFinished false), and getPossibleMoves() would answer likewise.
	Model.Board.GenerateMoves = function(aGame) {
		var winner=this.tcWinner();
		if(winner!==undefined) {
			this.mMoves=[];
			this.mFinished=true;
			this.mWinner=winner;
			return;
		}
		return BaseGenerateMoves.call(this,aGame);
	}

	// The terminal test goes first, exactly as in Annexation's Evaluate:
	// before the material walk, and before base-model.js's repetition test,
	// so that a third check delivered into a repetition still wins rather
	// than being called a draw.
	Model.Board.Evaluate = function(aGame) {
		var winner=this.tcWinner();
		if(winner!==undefined) {
			this.mEvaluation=0;
			this.mFinished=true;
			this.mWinner=winner;
			return;
		}
		return BaseEvaluate.apply(this,arguments);
	}

	Model.Board.GetSignature = function() {
		return BaseGetSignature.apply(this,arguments)
			^ TC_KEYS[this.tcChecks[0]*(TC_MAX+1)+this.tcChecks[1]];
	}

	// --- FEN ------------------------------------------------------------

	// Fairy-Stockfish's 3check FEN carries the checks REMAINING (not
	// delivered), White first, as a seventh field inserted after the
	// en-passant square:
	//   rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 3+3 0 1
	// (its threecheck_variant() startFen). jocly.fairy.js sends
	// ExportBoardState()'s output to the engine verbatim, so without this
	// the engine would analyse every position as if no check had ever been
	// given.
	Model.Board.ExportBoardState = function(aGame) {
		var fen=BaseExportBoardState.call(this,aGame);
		var parts=fen.split(" ");
		if(parts.length!=6)
			return fen; // "not supported", or a geometry that exports otherwise
		parts.splice(4,0,(TC_MAX-this.tcChecks[0])+"+"+(TC_MAX-this.tcChecks[1]));
		return parts.join(" ");
	}

	// base-model.js's FEN reader rejects anything that is not exactly six
	// fields, so the check field is peeled off here before delegating, and
	// converted from "remaining" to the "delivered" form the board keeps.
	// The Lichess spelling - the same two numbers as a trailing "+w+b" in
	// delivered form - is accepted too, since that is what a position
	// pasted from a game there looks like.
	Model.Game.Import = function(format,data) {
		var delivered=null;
		if(format=='pjn' && typeof data=='string') {
			var parts=data.trim().split(/\s+/);
			var m;
			if(parts.length==7 && (m=/^(\d+)\+(\d+)$/.exec(parts[4]))) {
				delivered=[TC_MAX-parseInt(m[1]),TC_MAX-parseInt(m[2])];
				parts.splice(4,1);
				data=parts.join(" ");
			} else if(parts.length==7 && (m=/^\+(\d+)\+(\d+)$/.exec(parts[6]))) {
				delivered=[parseInt(m[1]),parseInt(m[2])];
				parts.pop();
				data=parts.join(" ");
			}
			if(delivered)
				for(var i=0;i<2;i++)
					delivered[i]=Math.max(0,Math.min(TC_MAX,delivered[i]||0));
		}
		var result=BaseImport.call(this,format,data);
		if(delivered && result && result.status && result.initial)
			result.initial.tcChecks=delivered;
		return result;
	}

})();
