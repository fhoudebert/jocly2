
/*
 * Shared engine for the Ultima cousins played with these pieces: King,
 * Advancer, Withdrawer, Leaper, Swapper, Chameleon, Immobilizer and Cannon
 * Pawn. Rococo and Rocaille are the same rules on different dials, so both are
 * defined from here: the game's own model file calls
 *
 *     Model.Game.baroqueDefineVariant({ ... })
 *
 * and must be listed after this one in the manifest's modelScripts. The dials:
 *
 *   width, height   board size; a position is row * width + column
 *   back, front     the two starting ranks, one type per file; null = empty
 *   file0           file of the first back-rank piece (1 when a ring is on)
 *   backRow/pawnRow rows of White's two ranks; Black mirrors them
 *   aspect          sprite aspect prefix: "rococo" -> "rococo-king"
 *   leaperName      name of the Leaper: "long-leaper" or "short-leaper"
 *   leapMax         victims one leaping move may take: Infinity, or 1
 *   edgeRing        the outer ring is edge ground, entered only to capture
 *   promoRow        row from which White's Cannon Pawn may promote
 *   protectKing     a King may not be traded away by a Swapper
 *   ghost           define the Ghost: a Queen that blocks but never captures
 *   extra           pieces off the two ranks: [{ row, col, t }], mirrored
 *   bindingCheck    a move leaving one's own King capturable is illegal
 *
 * Reuses the multi-victim machinery of the Ultima model but is self-contained
 * (it does not require ultima-model.js).
 */

// piece types, shared with the variant files so a back rank reads as names
Model.Game.baroqueTypes = {
	PAWN: 0, ADVANCER: 1, LEAPER: 2, SWAPPER: 3,
	WITHDRAWER: 4, CHAMELEON: 5, IMMOBILIZER: 6, KING: 7,
	GHOST: 8,			// only defined in variants that ask for it
};

Model.Game.baroqueDefineVariant = function(V) {

	var W = V.width, H = V.height;
	var geometry = Model.Game.cbBoardGeometryGrid(W, H);

	var T = Model.Game.baroqueTypes;
	var PAWN = T.PAWN, ADVANCER = T.ADVANCER, LEAPER = T.LEAPER, SWAPPER = T.SWAPPER,
		WITHDRAWER = T.WITHDRAWER, CHAMELEON = T.CHAMELEON, IMMOBILIZER = T.IMMOBILIZER,
		KING = T.KING, GHOST = T.GHOST;

	// [dRow, dCol]; the 4 orthogonal directions first
	var DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

	function R(p) { return Math.floor(p / W); }
	function C(p) { return p % W; }
	function POS(r, c) { return r * W + c; }
	function onBoard(r, c) { return r >= 0 && r < H && c >= 0 && c < W; }
	function isEdge(p) { var r = R(p), c = C(p); return r === 0 || r === H - 1 || c === 0 || c === W - 1; }

	Model.Game.cbOnStaleMate = -1;		// unable to move loses
	// three-fold repetition loses for the repeater (activated by the match's
	// preventRepeat option, set in the manifest). Same mechanism as scirocco.
	Model.Game.cbOnPerpetual = 1;
	Model.Game.cbMaxRepeats = 3;

	// initial back rank, files a..h: Immobilizer Withdrawer Leaper King Chameleon Leaper Advancer Swapper
	var BACK = V.back;

	// The two ranks a side starts with, one entry per file; null leaves the
	// square empty, which is how a Withdrawer is given room to recoil into.
	var FRONT = V.front || BACK.map(function() { return PAWN; });

	function initialPieces() {
		var list = [], backRow = H - 1 - V.backRow, frontRow = H - 1 - V.pawnRow;
		for(var i = 0; i < BACK.length; i++) {
			var c = V.file0 + i;
			if(BACK[i] != null) {
				list.push({ s: 1, t: BACK[i], p: POS(V.backRow, c) });
				list.push({ s: -1, t: BACK[i], p: POS(backRow, c) });
			}
			if(FRONT[i] != null) {
				list.push({ s: 1, t: FRONT[i], p: POS(V.pawnRow, c) });
				list.push({ s: -1, t: FRONT[i], p: POS(frontRow, c) });
			}
		}
		// extras: pieces placed off the two ranks, as { row: , col: , t: }, with
		// the row counted from White's side and mirrored for Black. This is how
		// a variant garrisons a wing or drops a piece onto the ring.
		(V.extra || []).forEach(function(e) {
			list.push({ s: 1, t: e.t, p: POS(e.row, e.col) });
			list.push({ s: -1, t: e.t, p: POS(H - 1 - e.row, e.col) });
		});
		return list;
	}

	Model.Game.cbDefine = function() {
		var Q = this.cbQueenGraph(geometry), K = this.cbKingGraph(geometry);
		function type(name, aspect, abbrev, value, graph) {
			return { name: name, aspect: aspect, abbrev: abbrev, fenAbbrev: abbrev, value: value, graph: graph };
		}
		var t = {
			0: type('cannon-pawn', V.aspect + '-pawn', 'P', 2, K),
			1: type('advancer', V.aspect + '-advancer', 'A', 6, Q),
			2: type(V.leaperName, V.aspect + '-leaper', 'L', 6, Q),
			3: type('swapper', V.aspect + '-swapper', 'S', 6, Q),
			4: type('withdrawer', V.aspect + '-withdrawer', 'W', 5, Q),
			5: type('chameleon', V.aspect + '-chameleon', 'C', 5, Q),
			6: type('immobilizer', V.aspect + '-immobilizer', 'I', 8, Q),
			7: { name: 'king', aspect: V.aspect + '-king', abbrev: 'K', fenAbbrev: 'K', value: 0, isKing: true, graph: K },
		};
		// A Ghost moves as a Queen, blocks the square it stands on, and has no
		// capture of its own. It can be taken like anything else - but not by a
		// Chameleon, which captures by copying its victim's method and finds
		// none to copy. Only variants that ask for one get the type at all, so
		// the others keep an eight-piece table.
		if(V.ghost)
			t[GHOST] = type('ghost', V.aspect + '-ghost', 'G', 2, Q);
		for(var i in t)
			t[i].initial = initialPieces().filter(function(pc) { return pc.t == i; })
				.map(function(pc) { return { s: pc.s, p: pc.p }; });
		return { geometry: geometry, pieceTypes: t, promote: function() { return []; } };
	}

	/* -------------------------------------------------------- helpers */

	Model.Board.baroqueFoe = function(who, p, onlyType) {
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

	Model.Board.baroqueFrozen = function(piece) {
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

	Model.Board.baroqueGenerate = function(aGame, who, emit) {
		var n = this.pieces.length;
		for(var i = 0; i < n; i++) {
			var piece = this.pieces[i];
			if(piece.p < 0 || piece.s != who)
				continue;
			if(this.baroqueFrozen(piece)) {
				// an immobilized piece other than a King may remove itself
				if(piece.t != KING && emit(mk(piece, piece.p, { suicide: true })))
					return true;
				continue;
			}
			if(this.baroqueGeneratePiece(aGame, piece, emit))
				return true;
		}
		return false;
	}

	Model.Board.baroqueGeneratePiece = function(aGame, piece, emit) {
		switch(piece.t) {
			case KING:        return this.baroqueGenKing(piece, emit);
			case ADVANCER:    return this.baroqueGenAdvancer(piece, emit);
			case WITHDRAWER:  return this.baroqueGenWithdrawer(piece, emit);
			case LEAPER:      return this.baroqueGenLeaper(piece, emit);
			case IMMOBILIZER: return this.baroqueGenSlider(piece, emit);	// no capture
			case GHOST:       return this.baroqueGenSlider(piece, emit);	// no capture
			case PAWN:        return this.baroqueGenCannonPawn(piece, emit);
			case SWAPPER:     return this.baroqueGenSwapper(piece, emit);
			case CHAMELEON:   return this.baroqueGenChameleon(piece, emit);
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
	Model.Board.baroqueGenSlider = function(piece, emit) {
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

	Model.Board.baroqueGenKing = function(piece, emit) {
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
	Model.Board.baroqueGenAdvancer = function(piece, emit) {
		var r0 = R(piece.p), c0 = C(piece.p);
		for(var d = 0; d < 8; d++) {
			var dr = DIRS[d][0], dc = DIRS[d][1];
			for(var n = 1; n < W; n++) {
				var r = r0 + n * dr, c = c0 + n * dc;
				if(!onBoard(r, c) || this.board[POS(r, c)] >= 0)
					break;
				var to = POS(r, c), kills = [];
				var victim = this.baroqueFoe(piece.s, POS(r + dr, c + dc));
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
	Model.Board.baroqueGenWithdrawer = function(piece, emit) {
		var r0 = R(piece.p), c0 = C(piece.p);
		for(var d = 0; d < 8; d++) {
			var dr = DIRS[d][0], dc = DIRS[d][1];
			var victim = this.baroqueFoe(piece.s, POS(r0 - dr, c0 - dc));	// piece behind
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
	Model.Board.baroqueGenLeaper = function(piece, emit) {
		if(this.baroqueGenSlider(piece, emit))	// non-capturing slides
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
				if(kills.length >= V.leapMax)
					break;						// a Short Leaper takes one piece only
			}
		}
		return false;
	}

	// Cannon Pawn: single step in any direction; or hop over an adjacent piece
	// (either side) to the empty square beyond (non-capturing); or that same
	// hop landing on an enemy just beyond (capture by displacement). A self-move
	// that reaches the far rank may promote (see baroqueEmitPawn).
	Model.Board.baroqueGenCannonPawn = function(piece, emit) {
		var r0 = R(piece.p), c0 = C(piece.p);
		for(var d = 0; d < 8; d++) {
			var dr = DIRS[d][0], dc = DIRS[d][1];
			var r1 = r0 + dr, c1 = c0 + dc;
			if(!onBoard(r1, c1))
				continue;
			var mount = this.board[POS(r1, c1)];
			if(mount < 0) {
				if(this.baroqueEmitPawn(piece, POS(r1, c1), null, emit))	// plain single step
					return true;
				continue;
			}
			var r2 = r0 + 2 * dr, c2 = c0 + 2 * dc;	// square beyond the mount
			if(!onBoard(r2, c2))
				continue;
			var beyond = this.board[POS(r2, c2)];
			if(beyond < 0) {
				if(this.baroqueEmitPawn(piece, POS(r2, c2), null, emit))	// hop to empty
					return true;
			} else if(this.pieces[beyond].s != piece.s) {
				if(this.baroqueEmitPawn(piece, POS(r2, c2), { c: beyond }, emit))	// hop-capture
					return true;
			}
		}
		return false;
	}

	// how many pieces of each type a side starts with (King excluded: it can
	// never be off the board while the game is running)
	var INITIAL_COUNT = (function() {
		var count = {};
		BACK.concat(FRONT).forEach(function(t) {
			if(t != null)
				count[t] = (count[t] || 0) + 1;
		});
		return count;
	})();

	/*
	 * Types this side may promote a Cannon Pawn to: one of its own pieces that
	 * has been captured and is still off the board.
	 *
	 * Availability is measured as "fewer of this type on the board than the
	 * side started with", so a promotion consumes the captured piece it copies:
	 * promoting the only captured Withdrawer puts a Withdrawer back on the
	 * board and closes the option, while a side that lost both Long Leapers may
	 * promote twice.
	 */
	Model.Board.baroqueReserveTypes = function(who) {
		var onBoard = {}, types = [];
		for(var i = 0; i < this.pieces.length; i++) {
			var p = this.pieces[i];
			if(p.p >= 0 && p.s == who)
				onBoard[p.t] = (onBoard[p.t] || 0) + 1;
		}
		for(var t in INITIAL_COUNT) {
			t = +t;
			if(t != PAWN && t != KING && (onBoard[t] || 0) < INITIAL_COUNT[t])
				types.push(t);
		}
		return types;
	}

	/*
	 * Emit a Cannon Pawn move, adding a promotion variant per reserve type when
	 * it lands on the far rank (the opposing King's start rank, or the edge rank
	 * past it).
	 *
	 * Promotion is optional, so a "stay a Cannon Pawn" move is emitted too. When
	 * there is a choice it carries pr = PAWN rather than no pr at all: the view
	 * builds its promotion panel from the pr of every move reaching the square,
	 * so a move without one would have no icon to offer - and the piece type it
	 * names is the one the Pawn already is, which makes it a no-op on the board
	 * and the natural "do not promote" entry in the panel.
	 */
	Model.Board.baroqueEmitPawn = function(piece, to, extra, emit) {
		var row = R(to), promo = (piece.s > 0 ? row >= V.promoRow : row <= H - 1 - V.promoRow);
		if(promo) {
			var reserve = this.baroqueReserveTypes(piece.s);
			for(var i = 0; i < reserve.length; i++) {
				var m = mk(piece, to, extra);
				m.pr = reserve[i];
				if(emit(m))
					return true;
			}
			if(reserve.length) {
				var stay = mk(piece, to, extra);
				stay.pr = PAWN;
				return emit(stay);
			}
		}
		return emit(mk(piece, to, extra));
	}

	/*
	 * Swapper: passive Queen (non-capturing slides), plus two special moves.
	 *
	 *  - swap: exchange places with the nearest piece (of either side) along
	 *    any Queen line. Carried by move.swap = that piece's index. A swap
	 *    counts as a capture for the edge rule.
	 *  - mutual destruction: remove itself together with an adjacent enemy.
	 *    Carried by move.mutual = true, with move.c = that enemy and move.t its
	 *    square (so the move reads as a distance-1 capture for the edge rule).
	 *
	 * Not yet: the "no immediate swap-back" rule against an enemy Swapper or
	 * Chameleon (needs one-ply history), and mutual destruction is offered
	 * against any adjacent enemy.
	 */
	Model.Board.baroqueGenSwapper = function(piece, emit) {
		if(this.baroqueGenSlider(piece, emit))		// non-capturing slides
			return true;
		var r0 = R(piece.p), c0 = C(piece.p);
		for(var d = 0; d < 8; d++) {
			var dr = DIRS[d][0], dc = DIRS[d][1];
			// swap with the nearest piece in this direction
			for(var n = 1; n < W; n++) {
				var r = r0 + n * dr, c = c0 + n * dc;
				if(!onBoard(r, c))
					break;
				var index = this.board[POS(r, c)];
				if(index >= 0) {
					if(!this.baroqueSwapBlocked(piece, index)
						&& emit(mk(piece, POS(r, c), { swap: index })))
						return true;
					break;						// blocked beyond the first piece
				}
			}
			// mutual destruction with an adjacent enemy. It names that enemy's
			// square, like the swap with the same neighbour does: clicking the
			// neighbour then raises the panel that tells the two apart.
			var foe = this.baroqueFoe(piece.s, POS(r0 + dr, c0 + dc));
			if(foe >= 0 && emit(mk(piece, POS(r0 + dr, c0 + dc), { c: foe, mutual: true })))
				return true;
		}
		return false;
	}

	/*
	 * Chameleon: passive Queen; to capture, it mimics its victim's own method.
	 * It leaps over enemy Long Leapers, withdraws from enemy Withdrawers,
	 * approaches enemy Advancers, hops a mount onto an enemy Cannon Pawn, takes
	 * an adjacent enemy King by displacement, and swaps with (or mutually
	 * destroys) an enemy Swapper. A single sliding or leaping move may combine
	 * withdrawal, approach and overtaking; swaps and the King/Cannon hops are
	 * their own moves. It freezes Immobilizers (handled by baroqueFrozen) but never
	 * captures one, and cannot capture another Chameleon.
	 */
	Model.Board.baroqueGenChameleon = function(piece, emit) {
		var who = piece.s, from = piece.p, r0 = R(from), c0 = C(from);
		for(var d = 0; d < 8; d++) {
			var dr = DIRS[d][0], dc = DIRS[d][1];
			var wv = this.baroqueFoe(who, POS(r0 - dr, c0 - dc), WITHDRAWER);	// withdraw from an enemy Withdrawer

			// Walk this line: slide over empty squares, leap over enemy Long
			// Leapers, and stop on an enemy Swapper by trading places with it.
			// Every landing folds in the same withdrawal and approach victims,
			// so one move can combine all four mimicked powers.
			var r = r0, c = c0, leapKills = [];
			for(;;) {
				r += dr; c += dc;
				if(!onBoard(r, c))
					break;
				var index = this.board[POS(r, c)];
				if(index < 0) {
					if(this.baroqueChameleonEmit(piece, POS(r, c), dr, dc, wv, leapKills, emit))
						return true;
					continue;
				}
				var target = this.pieces[index];
				if(target.s == who)
					break;						// never leap or swap with a friend
				if(target.t == SWAPPER) {
					// mimic a Swapper: the swap is what lets the move end on
					// an occupied square, and it carries along whatever the
					// travel captured on the way (leaps, withdrawal, approach)
					if(!this.baroqueSwapBlocked(piece, index)
						&& this.baroqueChameleonEmit(piece, POS(r, c), dr, dc, wv, leapKills, emit, index))
						return true;
					break;						// the swap ends the move
				}
				if(target.t != LEAPER)
					break;						// only an enemy Long Leaper can be leapt
				var r1 = r + dr, c1 = c + dc;
				if(!onBoard(r1, c1) || this.board[POS(r1, c1)] >= 0)
					break;						// no empty square behind it
				leapKills.push(index);
				r = r1; c = c1;
				if(this.baroqueChameleonEmit(piece, POS(r, c), dr, dc, wv, leapKills, emit))
					return true;
				if(leapKills.length >= V.leapMax)
					break;						// mimicking a Short Leaper: one victim
			}

			// take an adjacent enemy King by displacement
			var king = this.baroqueFoe(who, POS(r0 + dr, c0 + dc), KING);
			if(king >= 0 && emit(mk(piece, POS(r0 + dr, c0 + dc), { c: king })))
				return true;

			// mimic a Cannon Pawn: hop an adjacent mount onto an enemy Cannon Pawn
			if(onBoard(r0 + dr, c0 + dc) && this.board[POS(r0 + dr, c0 + dc)] >= 0
				&& onBoard(r0 + 2 * dr, c0 + 2 * dc)) {
				var beyond = this.baroqueFoe(who, POS(r0 + 2 * dr, c0 + 2 * dc), PAWN);
				if(beyond >= 0 && emit(mk(piece, POS(r0 + 2 * dr, c0 + 2 * dc), { c: beyond })))
					return true;
			}

			// mutual destruction with an adjacent enemy Swapper
			var sw = this.baroqueFoe(who, POS(r0 + dr, c0 + dc), SWAPPER);
			if(sw >= 0 && emit(mk(piece, POS(r0 + dr, c0 + dc), { c: sw, mutual: true })))
				return true;
		}
		return false;
	}

	// emit one Chameleon landing, folding in the leap victims, the withdrawal
	// victim behind the origin, and an approach victim one step further on.
	// swap, when given, is the enemy Swapper standing on the landing square.
	Model.Board.baroqueChameleonEmit = function(piece, to, dr, dc, wv, leapKills, emit, swap) {
		var kills = leapKills.slice();
		if(wv >= 0)
			kills.push(wv);
		var av = this.baroqueFoe(piece.s, POS(R(to) + dr, C(to) + dc), ADVANCER);
		if(av >= 0)
			kills.push(av);
		var extra = kills.length ? { kills: kills } : null;
		if(swap != null) {
			extra = extra || {};
			extra.swap = swap;
		}
		return emit(mk(piece, to, extra));
	}

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
		if(move.swap != null)			// a swap counts as a capture for the edge rule
			caps.push(move.swap);
		return caps.sort(function(a, b) { return a - b; }).join(',');
	}

	function chebyshev(from, to) {
		return Math.max(Math.abs(R(to) - R(from)), Math.abs(C(to) - C(from)));
	}

	/*
	 * Keep a move that never touches an edge square. A move that does touch one
	 * is legal only if it captures, only if the same capture cannot be made
	 * without touching an edge square, only among the moves crossing the fewest
	 * edge squares, and - rule 4 of the source - only if it is then the single
	 * shortest such move: when two moves would make exactly the same capture at
	 * the same cost, neither is legal.
	 *
	 * Moves are grouped by (moving piece, set of captured pieces), which is the
	 * "capturing move c" the source's rules 3 and 4 are stated over.
	 */
	Model.Board.baroqueFilterEdge = function(moves) {
		if(!V.edgeRing)
			return moves;
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
			var minDist = Infinity, shortest = 0;
			for(var l = 0; l < grp.length; l++)
				if(grp[l]._edge == minEdge) {
					var d = chebyshev(grp[l].f, grp[l].t);
					if(d < minDist) { minDist = d; shortest = 1; }
					else if(d == minDist) shortest++;
				}
			if(shortest == 1 && chebyshev(mv.f, mv.t) == minDist)
				result.push(mv);				// the single shortest way to make this capture
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
		this.baroqueGenerate(aGame, this.mWho, function(m) { moves.push(m); return false; });
		return this.baroqueFilterEdge(moves);
	}

	// A living King of `who`?
	Model.Board.baroqueHasKing = function(who) {
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
	// Is this move one that carries off `who`'s King? Every capture of the
	// family lands in move.c or move.kills, so both are enough; a swap is not
	// a capture, and where check binds a King cannot be swapped anyway.
	Model.Board.baroqueTakesKingOf = function(move, who) {
		if(move.c != null && this.pieces[move.c].s == who && this.pieces[move.c].t == KING)
			return true;
		if(move.kills)
			for(var i = 0; i < move.kills.length; i++) {
				var victim = this.pieces[move.kills[i]];
				if(victim.s == who && victim.t == KING)
					return true;
			}
		return false;
	}

	// Could the opponent take `who`'s King right now? baroqueGenerate stops at the
	// first move the callback accepts, so this is far cheaper than generating
	// the whole reply list.
	Model.Board.baroqueKingAttacked = function(aGame, who) {
		var self = this;
		return this.baroqueGenerate(aGame, -who, function(m) { return self.baroqueTakesKingOf(m, who); });
	}

	// Where check binds: a move is legal only if it does not leave one's own
	// King capturable. Costs one (early-exit) reply generation per candidate.
	Model.Board.baroqueFilterLegal = function(aGame, moves) {
		var legal = [], who = this.mWho;
		for(var i = 0; i < moves.length; i++) {
			var undo = this.cbQuickApply(aGame, moves[i]);
			var exposed = this.baroqueKingAttacked(aGame, who);
			this.cbQuickUnapply(aGame, undo);
			if(!exposed)
				legal.push(moves[i]);
		}
		return legal;
	}

	Model.Board.GenerateMoves = function(aGame) {
		this.mMoves = [];
		if(!this.baroqueHasKing(this.mWho)) {
			this.mFinished = true;
			this.mWinner = -this.mWho;
			return;
		}
		var moves = this.cbGeneratePseudoLegalMoves(aGame);
		if(V.bindingCheck) {
			// announced to the view, and to whoever reads the board state
			this.baroqueCheck = this.baroqueKingAttacked(aGame, this.mWho);
			moves = this.baroqueFilterLegal(aGame, moves);
		}
		this.mMoves = moves;
		if(this.mMoves.length == 0) {
			// checkmate, or a side with no move at all: both lose, as in Rococo
			this.mFinished = true;
			this.mWinner = -this.mWho;
		}
	}

	/* ---------------------------------------- multi-victim apply/undo */

	var OriginalApplyMove = Model.Board.ApplyMove;
	Model.Board.ApplyMove = function(aGame, move) {
		if(move.suicide) {
			var self = this.pieces[this.board[move.f]];
			this.zSign ^= aGame.bKey(self);
			this.board[self.p] = -1;
			self.p = -1;
			self.m = true;
			this.noCaptCount = 0;
			var hh = this.oppoCheck;
			this.oppoCheck = this.check;
			this.check = 0;
			this.lastMove = { f: move.f, t: move.t, c: null };
			this.epTarget = null;
			this.zSign ^= aGame.wKey(1);		// side-to-move key
			return;
		}
		if(move.swap != null) {
			// exchange the mover and the swapped piece; reuse the base move by
			// lifting the swapped piece off first so the base sees an empty
			// destination, then dropping it on the vacated origin. A Chameleon
			// may combine the swap with its own captures, carried in move.kills.
			var other = this.pieces[move.swap], from = move.f, to = move.t;
			if(move.kills)
				for(var s = 0; s < move.kills.length; s++) {
					var prey = this.pieces[move.kills[s]];
					if(prey.p < 0)
						continue;
					this.zSign ^= aGame.bKey(prey);
					this.board[prey.p] = -1;
					prey.p = -1;
					prey.m = true;
				}
			this.zSign ^= aGame.bKey(other);
			this.board[to] = -1;
			OriginalApplyMove.call(this, aGame, { f: from, t: to, c: null, a: move.a });
			other.p = from;
			other.m = true;
			this.board[from] = other.i;
			this.zSign ^= aGame.bKey(other);
			var oroyal = aGame.g.pTypes[other.t].isKing;
			if(oroyal)
				this.kings[other.s * oroyal] = from;
			if(move.kills && move.kills.length)
				this.noCaptCount = 0;
			return;
		}
		if(move.mutual) {
			// base captures the adjacent enemy (move.c) and walks the Swapper
			// onto its square; then the Swapper removes itself too.
			var swapper = this.pieces[this.board[move.f]];
			OriginalApplyMove.call(this, aGame, move);
			this.zSign ^= aGame.bKey(swapper);
			this.board[swapper.p] = -1;
			swapper.p = -1;
			swapper.m = true;
			// both pieces are gone, so there is no capturer left on move.t; clear
			// lastMove.c so Evaluate does not dereference the now-empty square
			this.lastMove.c = null;
			return;
		}
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
		if(move.suicide) {
			var self = this.pieces[this.board[move.f]];
			var undo = [{ i: self.i, f: -1, t: move.f, ty: self.t }];
			this.board[self.p] = -1;
			self.p = -1;
			return undo;
		}
		if(move.swap != null) {
			// fully manual: restore both pieces by position only (f: -1) so
			// unapply never clears a square the other piece was put back on.
			var mover = this.pieces[this.board[move.f]], other = this.pieces[move.swap];
			var from = move.f, to = move.t;
			var undo = [{ i: mover.i, f: -1, t: from, ty: mover.t }, { i: other.i, f: -1, t: to }];
			var mroyal = aGame.g.pTypes[mover.t].isKing, oroyal = aGame.g.pTypes[other.t].isKing;
			if(mroyal) { undo[0].who = mover.s * mroyal; undo[0].kp = this.kings[mover.s * mroyal]; }
			if(oroyal) { undo[1].who = other.s * oroyal; undo[1].kp = this.kings[other.s * oroyal]; }
			this.board[to] = mover.i; mover.p = to;
			this.board[from] = other.i; other.p = from;
			if(mroyal) this.kings[mover.s * mroyal] = to;
			if(oroyal) this.kings[other.s * oroyal] = from;
			if(move.kills)					// a Chameleon's swap may capture as well
				for(var s = 0; s < move.kills.length; s++) {
					var prey = this.pieces[move.kills[s]];
					if(prey.p < 0)
						continue;
					undo.push({ i: move.kills[s], f: -1, t: prey.p });
					this.board[prey.p] = -1;
					prey.p = -1;
				}
			return undo;
		}
		if(move.mutual) {
			var swapper = this.pieces[this.board[move.f]], enemy = this.pieces[move.c];
			var undo2 = [{ i: swapper.i, f: -1, t: move.f, ty: swapper.t }, { i: enemy.i, f: -1, t: enemy.p }];
			var eroyal = aGame.g.pTypes[enemy.t].isKing;
			if(eroyal) { undo2[1].who = enemy.s * eroyal; undo2[1].kp = this.kings[enemy.s * eroyal]; }
			this.board[swapper.p] = -1; swapper.p = -1;
			this.board[enemy.p] = -1; enemy.p = -1;
			return undo2;
		}
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

	/* ------------------------------------- no immediate swap-back (1 ply) */

	/*
	 * When a Swapper or Chameleon swaps with an opposing Swapper or Chameleon,
	 * those two pieces may not swap straight back on the following turn; any
	 * other move clears the ban. That needs exactly one ply of history, kept in
	 * board.baroqueLastSwap as the pair of piece indices (or null).
	 *
	 * The pair is not part of the Zobrist signature, so two positions differing
	 * only by a pending ban hash alike - the same trade-off the base model makes
	 * for other one-ply state.
	 */
	function swapPair(board, move) {
		if(move.swap == null)
			return null;
		var mover = board.pieces[board.board[move.f]], other = board.pieces[move.swap];
		if(!mover || !other || mover.s == other.s)
			return null;
		var a = mover.t, b = other.t;
		if((a != SWAPPER && a != CHAMELEON) || (b != SWAPPER && b != CHAMELEON))
			return null;
		return mover.i < other.i ? [mover.i, other.i] : [other.i, mover.i];
	}

	Model.Board.baroqueSwapBlocked = function(piece, otherIndex) {
		if(V.protectKing && this.pieces[otherIndex].t == KING)
			return true;					// a King is never traded out of its shelter
		var last = this.baroqueLastSwap;
		if(!last)
			return false;
		var lo = piece.i < otherIndex ? piece.i : otherIndex;
		var hi = piece.i < otherIndex ? otherIndex : piece.i;
		return last[0] == lo && last[1] == hi;
	}

	var OriginalInitialPosition = Model.Board.InitialPosition;
	Model.Board.InitialPosition = function(aGame) {
		OriginalInitialPosition.apply(this, arguments);
		this.baroqueLastSwap = null;
	}

	// the search clones boards, so the pending ban has to travel with them
	var OriginalCopyFrom = Model.Board.CopyFrom;
	Model.Board.CopyFrom = function(aBoard) {
		OriginalCopyFrom.apply(this, arguments);
		this.baroqueLastSwap = aBoard.baroqueLastSwap || null;
	}

	var RococoApplyMove = Model.Board.ApplyMove;
	Model.Board.ApplyMove = function(aGame, move) {
		var pair = swapPair(this, move);
		RococoApplyMove.apply(this, arguments);
		this.baroqueLastSwap = pair;
	}

	// the undo list is an array, so the previous value rides along as a
	// property on it: the base unapply loop only walks the numeric indices
	var RococoQuickApply = Model.Board.cbQuickApply;
	Model.Board.cbQuickApply = function(aGame, move) {
		var previous = this.baroqueLastSwap || null;
		var pair = swapPair(this, move);
		var undo = RococoQuickApply.apply(this, arguments);
		undo.baroqueLastSwap = previous;
		this.baroqueLastSwap = pair;
		return undo;
	}

	var OriginalQuickUnapply = Model.Board.cbQuickUnapply;
	Model.Board.cbQuickUnapply = function(aGame, undo) {
		OriginalQuickUnapply.apply(this, arguments);
		if(undo && undo.baroqueLastSwap !== undefined)
			this.baroqueLastSwap = undo.baroqueLastSwap;
	}

	var OriginalToString = Model.Move.ToString;
	Model.Move.ToString = function(format) {
		var str = OriginalToString.apply(this, arguments);
		if(this.pr === PAWN)			// "stay a Cannon Pawn" is not a promotion
			str = str.replace(/=[^=]*$/, '');
		if(this.suicide)
			str += '(suicide)';
		else if(this.swap != null) {
			str += '<>';
			if(this.kills && this.kills.length)		// a Chameleon's swap may capture as well
				str += '*' + this.kills.length;
		}
		else if(this.mutual)
			str += '!!';
		else if(this.kills && this.kills.length)
			str += '*' + this.kills.length;
		return str;
	}

	// a swap and a mutual-destruction can share from/to squares (both target an
	// adjacent piece), so the discriminators must be part of move identity
	var OriginalEquals = Model.Move.Equals;
	Model.Move.Equals = function(move) {
		return OriginalEquals.call(this, move)
			&& (this.swap === move.swap || (this.swap == null && move.swap == null))
			&& !this.mutual == !move.mutual
			&& !this.suicide == !move.suicide;
	}

};
