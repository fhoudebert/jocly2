
/*
 * Ultima (a.k.a. Baroque Chess), by Robert Abbott (1962).
 *
 * All pieces move like a Queen (the Pincer Pawn like a Rook, the King like a
 * King) and, apart from the King, none of them captures by displacement:
 * captures are a side effect of the move, and a single move may remove
 * several enemy pieces at once.
 *
 * The chessbase base model only knows about one displacement capture per move
 * (move.c), so this model adds a `kills` array to the move object and hooks
 * ApplyMove / cbQuickApply / cbQuickUnapply accordingly. Move generation is
 * fully overridden: the piece-type graphs declared below are only used by the
 * generic machinery (views, evaluation), never to generate Ultima captures.
 */

(function() {

	var geometry = Model.Game.cbBoardGeometryGrid(8, 8);

	var PAWN = 0, COORDINATOR = 1, LEAPER = 2, WITHDRAWER = 3,
		CHAMELEON = 4, IMMOBILIZER = 5, KING = 6;

	// [dRank, dFile]; the 4 orthogonal ones come first
	var DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
	var NORTHO = 4;

	function P(r, c) { return (r << 3) + c; }
	function onBoard(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

	Model.Game.cbOnStaleMate = -1;	// being unable to move loses (stalemate = win)

	Model.Game.cbDefine = function() {
		return {
			geometry: geometry,
			pieceTypes: {
				0: {
					name: 'pincer-pawn',
					aspect: 'ultima-pawn',
					graph: this.cbRookGraph(geometry),
					value: 2,
					abbrev: 'P',
					fenAbbrev: 'P',
					initial: [
						{s:1,p:8},{s:1,p:9},{s:1,p:10},{s:1,p:11},
						{s:1,p:12},{s:1,p:13},{s:1,p:14},{s:1,p:15},
						{s:-1,p:48},{s:-1,p:49},{s:-1,p:50},{s:-1,p:51},
						{s:-1,p:52},{s:-1,p:53},{s:-1,p:54},{s:-1,p:55},
					],
				},
				1: {
					name: 'coordinator',
					aspect: 'ultima-coordinator',
					graph: this.cbQueenGraph(geometry),
					value: 6,
					abbrev: 'C',
					fenAbbrev: 'C',
					initial: [{s:1,p:7},{s:-1,p:56}],
				},
				2: {
					name: 'long-leaper',
					aspect: 'ultima-leaper',
					graph: this.cbQueenGraph(geometry),
					value: 6,
					abbrev: 'L',
					fenAbbrev: 'L',
					initial: [{s:1,p:1},{s:1,p:6},{s:-1,p:57},{s:-1,p:62}],
				},
				3: {
					name: 'withdrawer',
					aspect: 'ultima-withdrawer',
					graph: this.cbQueenGraph(geometry),
					value: 5,
					abbrev: 'W',
					fenAbbrev: 'W',
					initial: [{s:1,p:4},{s:-1,p:59}],
				},
				4: {
					name: 'chameleon',
					aspect: 'ultima-chameleon',
					graph: this.cbQueenGraph(geometry),
					value: 5,
					abbrev: 'X',
					fenAbbrev: 'X',
					initial: [{s:1,p:2},{s:1,p:5},{s:-1,p:58},{s:-1,p:61}],
				},
				5: {
					name: 'immobilizer',
					aspect: 'ultima-immobilizer',
					graph: this.cbQueenGraph(geometry),
					value: 8,
					abbrev: 'I',
					fenAbbrev: 'I',
					initial: [{s:1,p:0},{s:-1,p:63}],
				},
				6: {
					name: 'king',
					aspect: 'ultima-king',
					isKing: true,
					graph: this.cbKingGraph(geometry),
					value: 0,
					abbrev: 'K',
					fenAbbrev: 'K',
					initial: [{s:1,p:3},{s:-1,p:60}],
				},
			},
			promote: function() { return []; },
		}
	}

	/*
	 * Immobilization.
	 *
	 * A piece adjacent to an enemy Immobilizer cannot move at all. A Chameleon
	 * borrows that power, so an Immobilizer adjacent to an enemy Chameleon is
	 * frozen too - when the two touch each other, both are frozen.
	 */
	Model.Board.ultimaFrozen = function(piece) {
		var r = piece.p >> 3, c = piece.p & 7;
		for(var d = 0; d < 8; d++) {
			var r1 = r + DIRS[d][0], c1 = c + DIRS[d][1];
			if(!onBoard(r1, c1))
				continue;
			var index = this.board[P(r1, c1)];
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

	// enemy piece at (r,c), optionally restricted to one type; -1 if none
	Model.Board.ultimaFoe = function(who, r, c, onlyType) {
		if(!onBoard(r, c))
			return -1;
		var index = this.board[P(r, c)];
		if(index < 0)
			return -1;
		var piece = this.pieces[index];
		if(piece.s == who)
			return -1;
		if(onlyType !== undefined && piece.t != onlyType)
			return -1;
		return index;
	}

	// custodian capture, as performed by the Pincer Pawn on arrival
	Model.Board.ultimaPincerVictims = function(who, to, kills, onlyType) {
		var r = to >> 3, c = to & 7;
		for(var d = 0; d < NORTHO; d++) {
			var dr = DIRS[d][0], dc = DIRS[d][1];
			var victim = this.ultimaFoe(who, r + dr, c + dc, onlyType);
			if(victim < 0)
				continue;
			var r2 = r + 2 * dr, c2 = c + 2 * dc;
			if(!onBoard(r2, c2))
				continue;
			var index = this.board[P(r2, c2)];
			if(index >= 0 && this.pieces[index].s == who)
				kills.push(victim);
		}
	}

	// the Withdrawer captures the piece it moves directly away from
	Model.Board.ultimaWithdrawVictims = function(who, from, dr, dc, kills, onlyType) {
		var victim = this.ultimaFoe(who, (from >> 3) - dr, (from & 7) - dc, onlyType);
		if(victim >= 0)
			kills.push(victim);
	}

	// the Coordinator captures on the corners of the rectangle it forms with its King
	Model.Board.ultimaCoordVictims = function(who, to, kills, onlyType) {
		var kingPos = this.kings[who];
		if(kingPos === undefined || kingPos < 0)
			return;
		var kr = kingPos >> 3, kc = kingPos & 7;
		var r = to >> 3, c = to & 7;
		var victim = this.ultimaFoe(who, r, kc, onlyType);
		if(victim >= 0)
			kills.push(victim);
		victim = this.ultimaFoe(who, kr, c, onlyType);
		if(victim >= 0 && kills.indexOf(victim) < 0)
			kills.push(victim);
	}

	/*
	 * Move generation.
	 *
	 * `emit` is called for every pseudo-legal move; returning true stops the
	 * generation right away (used by the King-capture test, which only needs
	 * to know whether one such move exists).
	 */
	Model.Board.ultimaGenerate = function(aGame, who, emit) {
		var piecesLength = this.pieces.length;
		for(var i = 0; i < piecesLength; i++) {
			var piece = this.pieces[i];
			if(piece.p < 0 || piece.s != who)
				continue;
			if(this.ultimaFrozen(piece)) {
				// frozen: the one move left is to take oneself off the board,
				// as everywhere else in the family. A King never may.
				if(piece.t != KING && emit({
					f: piece.p,
					t: piece.p,
					c: null,
					a: aGame.g.pTypes[piece.t].abbrev,
					suicide: true,
				}))
					return true;
				continue;
			}
			if(this.ultimaGeneratePiece(aGame, piece, emit))
				return true;
		}
		return false;
	}

	Model.Board.ultimaGeneratePiece = function(aGame, piece, emit) {
		var abbrev = aGame.g.pTypes[piece.t].abbrev;
		var from = piece.p, r0 = from >> 3, c0 = from & 7;
		var ndirs = (piece.t == PAWN ? NORTHO : 8);
		var maxDist = (piece.t == KING ? 1 : 8);

		for(var d = 0; d < ndirs; d++) {
			var dr = DIRS[d][0], dc = DIRS[d][1];

			// long leaps are generated along the way, not from the landing square
			if(piece.t == LEAPER || piece.t == CHAMELEON) {
				if(this.ultimaGenerateLeaps(aGame, piece, dr, dc, abbrev, emit))
					return true;
			}

			for(var n = 1; n <= maxDist; n++) {
				var r = r0 + n * dr, c = c0 + n * dc;
				if(!onBoard(r, c))
					break;
				var to = P(r, c);
				var index = this.board[to];
				if(index >= 0) {
					// only the King - and the Chameleon acting as one - captures
					// by displacement, and only on an adjacent square
					var target = this.pieces[index];
					if(target.s != piece.s && n == 1 &&
						(piece.t == KING || (piece.t == CHAMELEON && target.t == KING))) {
						var away = [];
						if(piece.t == CHAMELEON)
							this.ultimaWithdrawVictims(piece.s, from, dr, dc, away, WITHDRAWER);
						if(emit({ f: from, t: to, c: index, a: abbrev,
							kills: away.length ? away : undefined }))
							return true;
					}
					break;
				}
				var kills = [];
				switch(piece.t) {
					case PAWN:
						this.ultimaPincerVictims(piece.s, to, kills);
						break;
					case COORDINATOR:
						this.ultimaCoordVictims(piece.s, to, kills);
						break;
					case WITHDRAWER:
						this.ultimaWithdrawVictims(piece.s, from, dr, dc, kills);
						break;
					case CHAMELEON:
						if(d < NORTHO)
							this.ultimaPincerVictims(piece.s, to, kills, PAWN);
						this.ultimaCoordVictims(piece.s, to, kills, COORDINATOR);
						this.ultimaWithdrawVictims(piece.s, from, dr, dc, kills, WITHDRAWER);
						break;
				}
				if(emit({
					f: from,
					t: to,
					c: null,
					a: abbrev,
					kills: kills.length ? kills : undefined,
				}))
					return true;
			}
		}
		return false;
	}

	/*
	 * Long leaps in one direction: slide over empty squares, jump an enemy
	 * piece when the square right behind it is free, and keep going. Friendly
	 * pieces and two enemies in a row both stop the leap.
	 *
	 * A Chameleon leaps the same way but may only jump over enemy Long Leapers.
	 */
	Model.Board.ultimaGenerateLeaps = function(aGame, piece, dr, dc, abbrev, emit) {
		var from = piece.p;
		var onlyType = (piece.t == CHAMELEON ? LEAPER : undefined);
		var r = from >> 3, c = from & 7;
		var kills = [];
		for(;;) {
			r += dr; c += dc;
			if(!onBoard(r, c))
				return false;
			var index = this.board[P(r, c)];
			if(index < 0) {
				// plain sliding square: only a move if we already jumped something
				if(kills.length) {
					var extra = [];
					if(piece.t == CHAMELEON) {
						if(dr == 0 || dc == 0)
							this.ultimaPincerVictims(piece.s, P(r, c), extra, PAWN);
						this.ultimaCoordVictims(piece.s, P(r, c), extra, COORDINATOR);
						// leaping is still moving away from whatever stands behind
						this.ultimaWithdrawVictims(piece.s, from, dr, dc, extra, WITHDRAWER);
					}
					if(emit({
						f: from,
						t: P(r, c),
						c: null,
						a: abbrev,
						kills: kills.concat(extra),
					}))
						return true;
				}
				continue;
			}
			var target = this.pieces[index];
			if(target.s == piece.s)
				return false;					// never leap over a friend
			if(onlyType !== undefined && target.t != onlyType)
				return false;					// Chameleon only leaps Long Leapers
			var r1 = r + dr, c1 = c + dc;
			if(!onBoard(r1, c1) || this.board[P(r1, c1)] >= 0)
				return false;					// no free square behind the victim
			kills.push(index);
			r = r1; c = c1;
			var extra2 = [];
			if(piece.t == CHAMELEON) {
				if(dr == 0 || dc == 0)
					this.ultimaPincerVictims(piece.s, P(r, c), extra2, PAWN);
				this.ultimaCoordVictims(piece.s, P(r, c), extra2, COORDINATOR);
				this.ultimaWithdrawVictims(piece.s, from, dr, dc, extra2, WITHDRAWER);
			}
			if(emit({
				f: from,
				t: P(r, c),
				c: null,
				a: abbrev,
				kills: kills.concat(extra2),
			}))
				return true;
		}
	}

	Model.Board.cbGeneratePseudoLegalMoves = function(aGame) {
		var moves = [];
		this.specials = [];
		this.ultimaGenerate(aGame, this.mWho, function(move) {
			moves.push(move);
			return false;
		});
		return moves;
	}

	// Is the King of `who` capturable by the opponent right now?
	Model.Board.ultimaKingAttacked = function(aGame, who) {
		var kingPos = this.kings[who];
		if(kingPos === undefined || kingPos < 0)
			return true;
		var $this = this;
		return this.ultimaGenerate(aGame, -who, function(move) {
			if(move.c != null && $this.pieces[move.c].p == kingPos)
				return true;
			if(move.kills)
				for(var i = 0; i < move.kills.length; i++)
					if($this.pieces[move.kills[i]].p == kingPos)
						return true;
			return false;
		});
	}

	/*
	 * In Ultima "attacking a square" has nothing to do with being able to move
	 * there, so the graph-based threat detection of the base model cannot be
	 * used for the check test: we generate the opponent's replies instead and
	 * stop at the first one that would remove the King.
	 */
	var OriginalGetAttackers = Model.Board.cbGetAttackers;
	Model.Board.cbGetAttackers = function(aGame, pos, who, isKing) {
		if(isKing)
			return this.ultimaKingAttacked(aGame, who) ? [1] : [];
		return OriginalGetAttackers.apply(this, arguments);
	}

	var OriginalApplyMove = Model.Board.ApplyMove;
	Model.Board.ApplyMove = function(aGame, move) {
		if(move.suicide) {
			var self = this.pieces[this.board[move.f]];
			this.zSign ^= aGame.bKey(self);
			this.board[self.p] = -1;
			self.p = -1;
			self.m = true;
			this.noCaptCount = 0;
			this.oppoCheck = this.check;
			this.check = 0;
			this.lastMove = { f: move.f, t: move.t, c: null };
			this.epTarget = null;
			this.zSign ^= aGame.wKey(1);				// side-to-move key
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
		var undo = OriginalQuickApply.apply(this, arguments);
		if(move.kills)
			for(var i = 0; i < move.kills.length; i++) {
				var victim = this.pieces[move.kills[i]];
				if(victim.p < 0)
					continue;
				undo.push({
					i: move.kills[i],
					f: -1,
					t: victim.p,
				});
				this.board[victim.p] = -1;
				victim.p = -1;
			}
		return undo;
	}

	var OriginalToString = Model.Move.ToString;
	Model.Move.ToString = function(format) {
		var str = OriginalToString.apply(this, arguments);
		if(this.suicide)
			return str + '(suicide)';
		if(this.kills && this.kills.length)
			str += '*' + this.kills.length;
		return str;
	}

	// a suicide has the same from and to as nothing else, but it must not be
	// confused with a null move when the interface matches what it was given
	var OriginalEquals = Model.Move.Equals;
	Model.Move.Equals = function(move) {
		return OriginalEquals.call(this, move) && !this.suicide == !move.suicide;
	}

})();
