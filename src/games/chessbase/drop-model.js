
(function(){

	var geometry, gameState;
	var promotedTypes = {}; // type index -> true when its abbrev starts with '+'

	Model.Game.cbDropGeometry = function(files, ranks, v) {
		geometry = Model.Game.cbBoardGeometryGrid(files+4, ranks+2*v);
		geometry.handWidth = 2; geometry.handHeight = v;

		geometry.BOARD_AREA = {}; // define proper board
		for(var r=0; r<ranks; r++) for(var f=0; f<files; f++) {
			var sqr = (files+4)*(r+v) + f + 2;
			geometry.BOARD_AREA[sqr.toString()] = 1;
		}

		Model.Game.cbPawnsPerFile = ranks;

		/*
		 * A hand holding more than one piece of a kind keeps the first on the
		 * holding square and the rest on the spare square beside it, chained
		 * through their index field, with a counter drawing the total. Only
		 * the first two are anywhere in board[], so a FEN written from it
		 * described a hand of five as a hand of two.
		 *
		 * What the player reads on that spare square is not "a second Pawn",
		 * it is "a Pawn, and there are five" - so that is what gets written.
		 * The counter stands in for the queue while the FEN is produced; the
		 * type of the pieces is on the holding square beside it, and the
		 * count is in the counter's own type.
		 */
		var superExport = geometry.ExportBoardState;
		geometry.ExportBoardState = function(board, cbVar, moveCount) {
			var swapped = [];
			if(Model.Game.handLayout)
				[1, -1].forEach(function(side) {
					Model.Game.handLayout[side].forEach(function(sqr) {
						var spare = sqr + side;
						if(board.board[spare] >= 0 && counters[spare] !== undefined) {
							swapped.push([spare, board.board[spare]]);
							board.board[spare] = counters[spare];
						}
					});
				});
			try {
				return superExport.apply(this, arguments);
			} finally {
				swapped.forEach(function(pair) { board.board[pair[0]] = pair[1]; });
			}
		};

		return geometry;
	}

	Model.Game.cbDropGraph = function(geometry, leapSteps, slideSteps, start, end) {
		var leaps = Model.Game.cbShortRangeGraph(geometry, leapSteps, geometry.BOARD_AREA);
		var slides = Model.Game.cbLongRangeGraph(geometry, slideSteps, geometry.BOARD_AREA);
		var s = geometry.boardSize, w = geometry.width, v = geometry.handHeight; 
		if(start === undefined) start = 0; // forbidden ranks
		if(end === undefined) end = 0;
		start = w*(start+v); end = s - w*(end+v);
		var drops = {};
		for(var r=0; r<s; r+=w) // scan board & holdings
		for(var f=0; f<w; f++) {
			drops[r+f] = [];
			if(f < 2 && f&1 || f >= w-2 && !(f-w&1) || r < v*w && !(f-w&1) || r >= s-v*w && f&1)
			for(var r1=v*w;r1<s-v*w;r1+=w) // scan proper board area
			if(r1 >= start && r1 < end)
			for(var f1=2; f1<w-2; f1++) {
				var pos = r1 + f1;
				drops[r+f].push(Model.Game.cbTypedArray([pos | Model.Game.cbConstants.FLAG_MOVE]));
			}
		}
		return Model.Game.cbMergeGraphs(geometry, drops, leaps, slides);
	}

	var counters = [];

	/*
	 * The counter of a spare square, or undefined if this board has none.
	 *
	 * counters[] holds piece INDICES and is module state, shared by every
	 * board of the game - which is sound, because CopyFrom() preserves
	 * indices, so a board and the copies a search makes of it agree. What it
	 * cannot survive is a second position being loaded while the first is
	 * still in use: cbPlacePieces() numbers the pieces of that position, the
	 * counters land elsewhere in the list, and the index kept here then points
	 * at one of the older board's men. Incrementing THAT is how a held Pawn
	 * turns into a Bishop.
	 *
	 * So the index is checked against the board it is about to be used on.
	 * The worst that a stale one now costs is a digit that fails to appear.
	 */
	function counterAt(board, spare) {
		var ctr = counters[spare], types = Model.Game.cbCounterTypes;
		if(ctr === undefined || !types) return undefined;
		var piece = board.pieces[ctr];
		return piece && piece.t >= types.first ? ctr : undefined;
	}

	Model.Game.cbAddHoldings = function(geometry, definition) {
		var w = geometry.width;
		var maxType=0;

		Model.Game.demoted = []; // tabulates how pieces transfrom on capture
		Model.Game.hand = {'-1':[], '1':[] }; // tabulates where captured pieces of a given color and type are put

		if(Model.Game.handLayout === undefined) {
			var whiteHand = w - 2; // default primary hand squares
			var blackHand = geometry.boardSize - w + 1;
			Model.Game.handLayout = { '1':[], '-1':[] };
			for(var i=0; i<geometry.height; i++) { // assign squares of extended board to hands
				Model.Game.handLayout[ 1].push(whiteHand + i*w);
				Model.Game.handLayout[-1].push(blackHand - i*w);
			}
		}

		for(var i in definition.pieceTypes) {
			var pType = definition.pieceTypes[i];
			demotedType = (pType.demoted===undefined ? i : pType.demoted); // can be 0!
			Model.Game.demoted[i] = parseInt(demotedType); // by default remains the same
			if(pType.hand !== undefined) { // assign a hand square to piece type
				Model.Game.hand[ 1][i] = Model.Game.handLayout[ 1][pType.hand];
				Model.Game.hand[-1][i] = Model.Game.handLayout[-1][pType.hand];
			}
			var n = parseInt(i);
			if(n > maxType) maxType = n;
			// remember which types are a promoted form, so the move
			// notation can mark a promotion with a trailing '+'
			promotedTypes[n] = /^\+/.test(pType.abbrev || '');
		}

		var holdings = []; // collect set of 'spare' holdings squares
		Model.Game.handLayout[ 1].forEach(function(sqr){ holdings.push({s: 1,p:sqr+1}); });
		Model.Game.handLayout[-1].forEach(function(sqr){ holdings.push({s:-1,p:sqr-1}); });

		// generate counter pseudo-pieces
		//
		// The type index carries the count: type maxType+1+j means j+2 pieces
		// of that kind in hand (the counter only appears once there is a
		// second one, so j=0 is exactly two), and the aspect draws that digit.
		// fenAbbrev lets it be written: the spare square of a hand holding
		// three Pawns is exported as the counter reading "3" rather than as a
		// second Pawn, which is what the player sees there and what the FEN
		// had no way of saying before - a third piece was silently dropped on
		// reload. See the ExportBoardState and Import wrappers below.
		//
		// The '~' keeps these letters clear of any piece abbreviated 'C'
		// (Chu Shogi's Copper General, among others) and away from the digits
		// a FEN uses for empty runs.
		var COUNT = "23456789ABC"; // 2..12, one per counter type
		for(var i=0; i<11; i++) {
			definition.pieceTypes[maxType + i + 1] = {
				name: 'counter',
				aspect: 'cnt-' + (i == 0 ? 1 : i+2),
				value: 0,
				fenAbbrev: 'C~' + COUNT.charAt(i),
				initial: (i == 0 ? holdings : []),
			};
		}

		Model.Game.cbCounterTypes = { first: maxType + 1, count: 11 };

		return definition;
	}

	Model.Game.cbSetPawnLimit = function(n) {
		Model.Game.cbPawnsPerFile = n; // specify limit
		Model.Board.cbGetAttackers = NewGetAttackers; // and enforce it
		Model.Board.cbQuickApply = NewQuickApply;
	}

	/*
	 * Read a hand back from a FEN.
	 *
	 * ExportBoardState() writes the counter on the spare square rather than
	 * the second piece of the queue, so the letter there says how many are
	 * held - but only the ONE piece a square can hold comes back from
	 * Import(). The rest are recreated here, from the counter's own type and
	 * from the kind of piece standing on the holding square beside it, before
	 * InitialPosition() ever sees the list: added afterwards they would miss
	 * the board and the Zobrist key that cbPlacePieces() builds from it.
	 *
	 * A FEN written before the counters had a letter has a plain piece on the
	 * spare square and no counter. Nothing is expanded, and it loads as the
	 * two pieces it describes - which is all it ever described.
	 */
	var OriginalImport = Model.Game.Import;
	Model.Game.Import = function(format, data) {
		var result = OriginalImport.apply(this, arguments);
		var initial = result && result.initial;
		var types = Model.Game.cbCounterTypes;
		if(!initial || !initial.pieces || !Model.Game.handLayout || !types)
			return result;

		var at = {};
		initial.pieces.forEach(function(piece) {
			if(piece.p >= 0) (at[piece.p] = at[piece.p] || []).push(piece);
		});
		var isCounter = function(piece) {
			return piece.t >= types.first && piece.t < types.first + types.count;
		};

		[1, -1].forEach(function(side) {
			Model.Game.handLayout[side].forEach(function(sqr) {
				var spare = sqr + side;
				var counter = (at[spare] || []).filter(isCounter)[0];
				var held = (at[sqr] || []).filter(function(p) { return !isCounter(p); })[0];
				if(counter && held) {
					// type first+j means j+2 in hand, one of them on the
					// holding square: j+1 more belong on the spare square
					var extra = counter.t - types.first + 1;
					for(var i=0; i<extra; i++)
						initial.pieces.push({ t: held.t, s: held.s, p: spare, m: true });
				}
				// Every spare square carries a counter in a game that was
				// played rather than loaded, and only the ones standing under
				// a piece are written. The rest are put back, so that a hand
				// which grows after the position is loaded still has one to
				// draw its digit on.
				if(!counter)
					initial.pieces.push({ t: types.first, s: side, p: spare, m: true });
			});
		});

		return result;
	}

	var OriginalInitialPosition = Model.Board.InitialPosition;	Model.Board.InitialPosition = function(aGame) {
		var $this = this, w = geometry.width, v = geometry.handHeight;
		gameState = this; // post on behalf of diverted Zobrist update
		OriginalInitialPosition.apply(this, arguments);
		// count Pawns per file (hidden in this.kings)
		for(var i=2; i<w-2; i++) this.kings[i] = this.kings[-i] = 0;
		for(var s=v*w; s<geometry.boardSize-v*w; s++) {
			var f = geometry.C(s);
			if(f>1 && f<w-2) {
				var i = this.board[s];
				if(i >= 0) {
					var piece = this.pieces[i];
					if(piece.t < 2) this.kings[f*piece.s]++;
				}
			}
		}

		/*
		 * Sort out each holding square and the spare beside it.
		 *
		 * On the spare square sit, in the piece list, the counter that draws
		 * the total and every piece of that kind past the first. board[] holds
		 * the head of that queue and each piece links to the next through its
		 * own index field (cbPlacePieces() has just reset those to the piece's
		 * own index, so they are rebuilt here); the counter is not in board[]
		 * at all.
		 *
		 * A position loaded from a FEN arrives with the pieces the Import
		 * wrapper below expanded from the counter's own letter, or - from a
		 * FEN written before counters had one - with the single second piece
		 * the old format could hold and no counter. Both are read the same way
		 * here: whatever is a counter is the counter, and everything else is
		 * the queue.
		 *
		 * Lifting the wrong one off the board is what used to put a held piece
		 * beyond reach: it stayed in the list on a square no drop is ever
		 * generated from, and the next capture into that slot incremented ITS
		 * type, turning a held Pawn into whatever follows it in the table.
		 */
		var atSpare = {};
		this.pieces.forEach(function(piece, index) {
			if(piece.p >= 0) (atSpare[piece.p] = atSpare[piece.p] || []).push(index);
		});
		function reserve(sqr, spare) {
			var counter, queue = [];
			(atSpare[spare] || []).forEach(function(index) {
				if(aGame.cbVar.pieceTypes[$this.pieces[index].t].name == 'counter')
					counter = index;
				else
					queue.push(index);
			});
			counters[spare] = counter; // undefined for a FEN written without one
			counters[sqr] = 1;         // ... the square is a hand either way
			for(var i=0; i<queue.length; i++)
				$this.pieces[queue[i]].i = (i+1 < queue.length ? queue[i+1] : -1);
			$this.board[spare] = queue.length ? queue[0] : -1;
		}
		Model.Game.handLayout[ 1].forEach(function(sqr){ reserve(sqr, sqr+1); });
		Model.Game.handLayout[-1].forEach(function(sqr){ reserve(sqr, sqr-1); });
	}

	var bad = false; // 'tunnel parameter' passed to check test

	var OriginalQuickApply = Model.Board.cbQuickApply;
	function NewQuickApply(aGame,move) {
		if(move.a == '') { // Pawn, check for illegal drop
			bad = (counters[move.f] && this.kings[this.mWho*geometry.C(move.t)] >= Model.Game.cbPawnsPerFile);
		}
		return OriginalQuickApply.apply(this, arguments);
	}

	var OriginalApplyMove = Model.Board.ApplyMove;
	Model.Board.ApplyMove = function(aGame,move) {
		var ctr;
		OriginalApplyMove.apply(this, arguments);
		if(move.pr !== undefined && move.a == '') // pawn promotes
			this.kings[this.mWho*geometry.C(move.f)]--;
		if(move.c != null) {
			var victim = this.pieces[move.c];
			if(victim.t < 2) this.kings[victim.s*geometry.C(move.t)]--; // pawn captured
			victim.t = Model.Game.demoted[victim.t]; // demote and flip orientation
			var hand = Model.Game.hand[this.mWho][victim.t];
			if(hand !== undefined) { // not all types have to go in hand!
				victim.s *= -1;
				victim.p = hand; this.zSign ^= aGame.bKey(victim);
				if(this.board[hand] >= 0) {
					hand += this.mWho; ctr = counterAt(this, hand);
					// a position loaded from a FEN has no counter here (see
					// InitialPosition): the queue still works, only the digit
					// is missing
					if(ctr !== undefined) {
						if(this.board[hand] >= 0) this.pieces[ctr].t++;
						this.zSign ^= (666666+hand)*this.pieces[ctr].t;
					}
					victim.i = this.board[hand]; // use index field to link inactive pieces in list
				}
				this.board[hand] = move.c;
				victim.p = hand;
			}
		} else {
			if(counters[move.f]) { // drop
				var spare = move.f + this.mWho;
				var second = this.board[spare];
				if(second >= 0) { // we held more of that type
					var next = this.pieces[second].i;
					this.pieces[second].i = second; // repair index field
					this.board[move.f] = second; // shift it to head of queue
					this.pieces[second].p = move.f;
					this.board[spare] = next;
					ctr = counterAt(this, spare);
					if(ctr !== undefined) {
						this.zSign ^= (666666+spare)*this.pieces[ctr].t;
						if(next >= 0) this.pieces[ctr].t--;
					}
				}
				if(move.a == '') this.kings[this.mWho*geometry.C(move.t)]++;
			}
		}
	}

	var OriginalGetAttackers = Model.Board.cbGetAttackers;
	function NewGetAttackers(aGame,pos,who,isKing) {
		if(bad) {
			bad = false;
			return [1]; // fake a king attacker when too many Pawns in a file
		}
		return OriginalGetAttackers.apply(this, arguments);
	}

	OriginalToString = Model.Move.ToString;
	Model.Move.ToString = function() {
		var v = geometry.handHeight, w = geometry.width;
		var f = geometry.C(this.f);
		var result = 'fail';
		if(f < 2 || f >= w - 2) { // drop
			f = geometry.C(this.t);
			result = (this.a == '' ? 'P' : this.a) + '@' + String.fromCharCode(95+f) + (geometry.R(this.t)+1-v);
		} else {
			var move = { f:this.f - 2 - v*w, t:this.t - 2 - v*w, c:this.c, a:this.a }; // offset coords
			result = OriginalToString.apply(move, arguments);
			// a promotion (pr resolves to a '+'-prefixed type) is marked with
			// a trailing '+', shogi-style. The base ToString is bypassed for
			// drop games and its remapped move drops `pr`, so it is added here.
			// The "stay unpromoted" twin move keeps its base type (no '+').
			if(this.pr!==undefined && promotedTypes[this.pr])
				result += '+';
		}
		return result;
	}

})();
