
/*
 * Rococo, by Peter Aronson and David Howe (2002) - a game in the Ultima
 * family. https://www.chessvariants.com/other.dir/rococo.html
 *
 * 10x10 board. The inner 8x8 (files a-h, ranks 1-8) is normal ground; the 36
 * squares of the outer ring are "edge squares": a move may only pass over or
 * end on an edge square when that is necessary for a capture, and then only
 * crossing the minimal number of them. Victory is by *capturing* the enemy
 * King (there is no check or checkmate), and a player with no legal move loses.
 *
 * This file reuses the multi-victim machinery of the Ultima model but is
 * self-contained (it does not require ultima-model.js). Implemented so far:
 * King, Advancer, Withdrawer, Long Leaper, Immobilizer, Cannon Pawn, and the
 * edge-square rule. Not yet: Swapper, Chameleon, Cannon-Pawn promotion,
 * suicide of an immobilized piece - see tests/rococo/README.md.
 */

(function() {

	var W = 10, H = 10;
	var geometry = Model.Game.cbBoardGeometryGrid(W, H);

	var PAWN = 0, ADVANCER = 1, LEAPER = 2, SWAPPER = 3,
		WITHDRAWER = 4, CHAMELEON = 5, IMMOBILIZER = 6, KING = 7;

	// [dRow, dCol]; the 4 orthogonal directions first
	var DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

	function R(p) { return Math.floor(p / W); }
	function C(p) { return p % W; }
	function POS(r, c) { return r * W + c; }
	function onBoard(r, c) { return r >= 0 && r < H && c >= 0 && c < W; }
	function isEdge(p) { var r = R(p), c = C(p); return r === 0 || r === H - 1 || c === 0 || c === W - 1; }

	Model.Game.cbOnStaleMate = -1;		// unable to move loses

	// initial back rank, files a..h: Immobilizer Withdrawer Leaper King Chameleon Leaper Advancer Swapper
	var BACK = [IMMOBILIZER, WITHDRAWER, LEAPER, KING, CHAMELEON, LEAPER, ADVANCER, SWAPPER];

	function initialPieces() {
		var list = [];
		for(var c = 1; c <= 8; c++) {
			list.push({ s: 1, t: BACK[c - 1], p: POS(1, c) });
			list.push({ s: 1, t: PAWN, p: POS(2, c) });
			list.push({ s: -1, t: PAWN, p: POS(7, c) });
			list.push({ s: -1, t: BACK[c - 1], p: POS(8, c) });
		}
		return list;
	}

	Model.Game.cbDefine = function() {
		var Q = this.cbQueenGraph(geometry), K = this.cbKingGraph(geometry);
		function type(name, aspect, abbrev, value, graph) {
			return { name: name, aspect: aspect, abbrev: abbrev, fenAbbrev: abbrev, value: value, graph: graph };
		}
		var t = {
			0: type('cannon-pawn', 'rococo-pawn', 'P', 2, K),
			1: type('advancer', 'rococo-advancer', 'A', 6, Q),
			2: type('long-leaper', 'rococo-leaper', 'L', 6, Q),
			3: type('swapper', 'rococo-swapper', 'S', 6, Q),
			4: type('withdrawer', 'rococo-withdrawer', 'W', 5, Q),
			5: type('chameleon', 'rococo-chameleon', 'C', 5, Q),
			6: type('immobilizer', 'rococo-immobilizer', 'I', 8, Q),
			7: { name: 'king', aspect: 'rococo-king', abbrev: 'K', fenAbbrev: 'K', value: 0, isKing: true, graph: K },
		};
		for(var i = 0; i < 8; i++)
			t[i].initial = initialPieces().filter(function(pc) { return pc.t == i; })
				.map(function(pc) { return { s: pc.s, p: pc.p }; });
		return { geometry: geometry, pieceTypes: t, promote: function() { return []; } };
	}

	/* -------------------------------------------------------- helpers */

	Model.Board.rocFoe = function(who, p, onlyType) {
		if(p < 0 || p >= W * H)
			return -1;
		var index = this.board[p];
		if(index < 0)
			return -1;
		var piece = this.pieces[index];
		if(piece.s == who)
			return -1;
		if(onlyType !== undefined && piece.t != onlyType)
			return -1;
		return index;
	}

	Model.Board.rocFrozen = function(piece) {
		var r = R(piece.p), c = C(piece.p);
		for(var d = 0; d < 8; d++) {
			var r1 = r + DIRS[d][0], c1 = c + DIRS[d][1];
			if(!onBoard(r1, c1))
				continue;
			var index = this.board[POS(r1, c1)];
			if(index < 0)
				continue;
			var other = this.pieces[index];
			if(other.s == piece.s)
				continue;
			if(other.t == IMMOBILIZER)
				return true;
			if(piece.t == IMMOBILIZER && other.t == CHAMELEON)
				return true;
		}
		return false;
	}

	/* --------------------------------------------------- generation */

	Model.Board.rocGenerate = function(aGame, who, emit) {
		var n = this.pieces.length;
		for(var i = 0; i < n; i++) {
			var piece = this.pieces[i];
			if(piece.p < 0 || piece.s != who)
				continue;
			if(this.rocFrozen(piece))
				continue;
			if(this.rocGeneratePiece(aGame, piece, emit))
				return true;
		}
		return false;
	}

	Model.Board.rocGeneratePiece = function(aGame, piece, emit) {
		switch(piece.t) {
			case KING:        return this.rocGenKing(piece, emit);
			case ADVANCER:    return this.rocGenAdvancer(piece, emit);
			case WITHDRAWER:  return this.rocGenWithdrawer(piece, emit);
			case LEAPER:      return this.rocGenLeaper(piece, emit);
			case IMMOBILIZER: return this.rocGenSlider(piece, emit);	// no capture
			case PAWN:        return this.rocGenCannonPawn(piece, emit);
			// SWAPPER, CHAMELEON: not implemented yet
		}
		return false;
	}

	var abbrevOf;	// set lazily from the game definition

	function mk(piece, to, extra) {
		var m = { f: piece.p, t: to, c: null, a: abbrevOf[piece.t] };
		if(extra)
			for(var k in extra)
				m[k] = extra[k];
		return m;
	}

	// plain Queen slide over empty squares, no capture (Immobilizer, and the
	// non-capturing part of several pieces)
	Model.Board.rocGenSlider = function(piece, emit) {
		var r0 = R(piece.p), c0 = C(piece.p);
		for(var d = 0; d < 8; d++) {
			for(var n = 1; n < W; n++) {
				var r = r0 + n * DIRS[d][0], c = c0 + n * DIRS[d][1];
				if(!onBoard(r, c) || this.board[POS(r, c)] >= 0)
					break;
				if(emit(mk(piece, POS(r, c))))
					return true;
			}
		}
		return false;
	}

	Model.Board.rocGenKing = function(piece, emit) {
		var r0 = R(piece.p), c0 = C(piece.p);
		for(var d = 0; d < 8; d++) {
			var r = r0 + DIRS[d][0], c = c0 + DIRS[d][1];
			if(!onBoard(r, c))
				continue;
			var to = POS(r, c), index = this.board[to];
			if(index < 0) {
				if(emit(mk(piece, to)))
					return true;
			} else if(this.pieces[index].s != piece.s) {
				if(emit(mk(piece, to, { c: index })))	// capture by displacement
					return true;
			}
		}
		return false;
	}

	// Advancer: passive Queen; on stopping, captures an enemy on the square
	// one step further in the direction of travel.
	Model.Board.rocGenAdvancer = function(piece, emit) {
		var r0 = R(piece.p), c0 = C(piece.p);
		for(var d = 0; d < 8; d++) {
			var dr = DIRS[d][0], dc = DIRS[d][1];
			for(var n = 1; n < W; n++) {
				var r = r0 + n * dr, c = c0 + n * dc;
				if(!onBoard(r, c) || this.board[POS(r, c)] >= 0)
					break;
				var to = POS(r, c), kills = [];
				var victim = this.rocFoe(piece.s, POS(r + dr, c + dc));
				if(victim >= 0)
					kills.push(victim);
				if(emit(mk(piece, to, kills.length ? { kills: kills } : null)))
					return true;
			}
		}
		return false;
	}

	// Withdrawer: passive Queen; captures the adjacent enemy it moves directly
	// away from.
	Model.Board.rocGenWithdrawer = function(piece, emit) {
		var r0 = R(piece.p), c0 = C(piece.p);
		for(var d = 0; d < 8; d++) {
			var dr = DIRS[d][0], dc = DIRS[d][1];
			var victim = this.rocFoe(piece.s, POS(r0 - dr, c0 - dc));	// piece behind
			for(var n = 1; n < W; n++) {
				var r = r0 + n * dr, c = c0 + n * dc;
				if(!onBoard(r, c) || this.board[POS(r, c)] >= 0)
					break;
				if(emit(mk(piece, POS(r, c), victim >= 0 ? { kills: [victim] } : null)))
					return true;
			}
		}
		return false;
	}

	// Long Leaper: passive Queen, plus capture by overtaking (chain of leaps
	// along one line, each victim needing a free square behind it).
	Model.Board.rocGenLeaper = function(piece, emit) {
		if(this.rocGenSlider(piece, emit))	// non-capturing slides
			return true;
		var r0 = R(piece.p), c0 = C(piece.p);
		for(var d = 0; d < 8; d++) {
			var dr = DIRS[d][0], dc = DIRS[d][1];
			var r = r0, c = c0, kills = [];
			for(;;) {
				r += dr; c += dc;
				if(!onBoard(r, c))
					break;
				var index = this.board[POS(r, c)];
				if(index < 0) {
					if(kills.length && emit(mk(piece, POS(r, c), { kills: kills.slice() })))
						return true;
					continue;
				}
				if(this.pieces[index].s == piece.s)
					break;						// never leap a friend
				var r1 = r + dr, c1 = c + dc;
				if(!onBoard(r1, c1) || this.board[POS(r1, c1)] >= 0)
					break;						// no empty square behind the victim
				kills.push(index);
				r = r1; c = c1;
				if(emit(mk(piece, POS(r, c), { kills: kills.slice() })))
					return true;
			}
		}
		return false;
	}

	// Cannon Pawn: single step in any direction; or hop over an adjacent piece
	// (either side) to the empty square beyond (non-capturing); or that same
	// hop landing on an enemy just beyond (capture by displacement).
	Model.Board.rocGenCannonPawn = function(piece, emit) {
		var r0 = R(piece.p), c0 = C(piece.p);
		for(var d = 0; d < 8; d++) {
			var dr = DIRS[d][0], dc = DIRS[d][1];
			var r1 = r0 + dr, c1 = c0 + dc;
			if(!onBoard(r1, c1))
				continue;
			var mount = this.board[POS(r1, c1)];
			if(mount < 0) {
				if(emit(mk(piece, POS(r1, c1))))	// plain single step
					return true;
				continue;
			}
			var r2 = r0 + 2 * dr, c2 = c0 + 2 * dc;	// square beyond the mount
			if(!onBoard(r2, c2))
				continue;
			var beyond = this.board[POS(r2, c2)];
			if(beyond < 0) {
				if(emit(mk(piece, POS(r2, c2))))	// hop to empty
					return true;
			} else if(this.pieces[beyond].s != piece.s) {
				if(emit(mk(piece, POS(r2, c2), { c: beyond })))	// hop-capture
					return true;
			}
		}
		return false;
	}

	/* --------------------------------------------- edge-square rule */

	// squares the piece travels through, destination included, origin excluded
	function pathSquares(from, to) {
		if(from == to)
			return [];
		var dr = Math.sign(R(to) - R(from)), dc = Math.sign(C(to) - C(from));
		var squares = [], r = R(from), c = C(from);
		for(var guard = 0; guard < W; guard++) {
			r += dr; c += dc;
			squares.push(POS(r, c));
			if(POS(r, c) == to)
				break;
		}
		return squares;
	}

	function edgeCount(move) {
		var n = 0, sq = pathSquares(move.f, move.t);
		for(var i = 0; i < sq.length; i++)
			if(isEdge(sq[i]))
				n++;
		return n;
	}

	function captureKey(move) {
		var caps = [];
		if(move.c != null)
			caps.push(move.c);
		if(move.kills)
			caps.push.apply(caps, move.kills);
		return caps.sort(function(a, b) { return a - b; }).join(',');
	}

	function chebyshev(from, to) {
		return Math.max(Math.abs(R(to) - R(from)), Math.abs(C(to) - C(from)));
	}

	/*
	 * Keep a move that never touches an edge square. A move that does touch one
	 * is legal only if it captures, only if the same capture cannot be made
	 * without touching an edge square, and then only by the move(s) crossing
	 * the fewest edge squares (nearest landing among those).
	 *
	 * Rule 4 of the source - that such a move must be *unique* - is relaxed: on
	 * a genuine tie we keep the tied moves rather than forbidding the capture.
	 */
	Model.Board.rocFilterEdge = function(moves) {
		var groups = {};
		for(var i = 0; i < moves.length; i++) {
			var m = moves[i];
			m._edge = edgeCount(m);
			m._key = m.f + '#' + captureKey(m);
			(groups[m._key] || (groups[m._key] = [])).push(m);
		}
		var result = [];
		for(var j = 0; j < moves.length; j++) {
			var mv = moves[j];
			if(mv._edge == 0) {
				result.push(mv);
				continue;
			}
			if(captureKey(mv) == '')			// edge move must capture
				continue;
			var grp = groups[mv._key], minEdge = Infinity;
			for(var k = 0; k < grp.length; k++)
				if(grp[k]._edge < minEdge)
					minEdge = grp[k]._edge;
			if(minEdge == 0 || mv._edge != minEdge)
				continue;						// an inner (or shallower) alternative exists
			var minDist = Infinity;
			for(var l = 0; l < grp.length; l++)
				if(grp[l]._edge == minEdge)
					minDist = Math.min(minDist, chebyshev(grp[l].f, grp[l].t));
			if(chebyshev(mv.f, mv.t) == minDist)
				result.push(mv);
		}
		for(var z = 0; z < result.length; z++) {
			delete result[z]._edge;
			delete result[z]._key;
		}
		return result;
	}

	Model.Board.cbGeneratePseudoLegalMoves = function(aGame) {
		if(!abbrevOf) {
			abbrevOf = {};
			for(var t in aGame.g.pTypes)
				abbrevOf[t] = aGame.g.pTypes[t].abbrev;
		}
		this.specials = [];
		var moves = [];
		this.rocGenerate(aGame, this.mWho, function(m) { moves.push(m); return false; });
		return this.rocFilterEdge(moves);
	}

	// A living King of `who`?
	Model.Board.rocHasKing = function(who) {
		for(var i = 0; i < this.pieces.length; i++) {
			var p = this.pieces[i];
			if(p.p >= 0 && p.s == who && p.t == KING)
				return true;
		}
		return false;
	}

	/*
	 * No self-check filtering: pseudo-legal moves are legal (the King may move
	 * into danger, since the game is won by actually capturing it). A side with
	 * no move, or whose King has just been taken, loses.
	 */
	Model.Board.GenerateMoves = function(aGame) {
		this.mMoves = [];
		if(!this.rocHasKing(this.mWho)) {
			this.mFinished = true;
			this.mWinner = -this.mWho;
			return;
		}
		this.mMoves = this.cbGeneratePseudoLegalMoves(aGame);
		if(this.mMoves.length == 0) {
			this.mFinished = true;
			this.mWinner = -this.mWho;
		}
	}

	/* ---------------------------------------- multi-victim apply/undo */

	var OriginalApplyMove = Model.Board.ApplyMove;
	Model.Board.ApplyMove = function(aGame, move) {
		if(move.kills)
			for(var i = 0; i < move.kills.length; i++) {
				var victim = this.pieces[move.kills[i]];
				if(victim.p < 0)
					continue;
				this.zSign ^= aGame.bKey(victim);
				this.board[victim.p] = -1;
				victim.p = -1;
				victim.m = true;
			}
		OriginalApplyMove.apply(this, arguments);
		if(move.kills && move.kills.length)
			this.noCaptCount = 0;
	}

	var OriginalQuickApply = Model.Board.cbQuickApply;
	Model.Board.cbQuickApply = function(aGame, move) {
		var undo = OriginalQuickApply.apply(this, arguments);
		if(move.kills)
			for(var i = 0; i < move.kills.length; i++) {
				var victim = this.pieces[move.kills[i]];
				if(victim.p < 0)
					continue;
				undo.push({ i: move.kills[i], f: -1, t: victim.p });
				this.board[victim.p] = -1;
				victim.p = -1;
			}
		return undo;
	}

	var OriginalToString = Model.Move.ToString;
	Model.Move.ToString = function(format) {
		var str = OriginalToString.apply(this, arguments);
		if(this.kills && this.kills.length)
			str += '*' + this.kills.length;
		return str;
	}

})();
