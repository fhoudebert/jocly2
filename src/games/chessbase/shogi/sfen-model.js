
/*
 * SFEN and USI, for the Shogi family.
 *
 * SFEN (Shogi Forsyth-Edwards Notation) is what the rest of the Shogi world
 * exchanges positions in, and USI (Universal Shogi Interface) is its move
 * notation. This file adds both to a game that already has a Jocly FEN,
 * without touching the FEN itself: `natural` notation and ExportBoardState()
 * are what Tabulon writes into its saved files, and changing them would make
 * every existing save unreadable.
 *
 * WHAT IS ALREADY RIGHT, and is the reason this file is short. Jocly's board
 * field IS the SFEN board field for Chu Shogi - same row order, same letters,
 * same two-digit runs of empty squares:
 *
 *   lfcsgekgscfl/a1b1txot1b1a/mvrhdqndhrvm/pppppppppppp/3i4i3/12/12/3I4I3/...
 *
 * Nobody arranged that; both follow the lishogi convention. So the work is
 * the FIELDS AROUND the board, and the coordinates.
 *
 * THE THREE DIFFERENCES.
 *
 * 1. The side to move. SFEN calls the side that starts "b" (sente, the one
 *    written in capitals); Jocly calls it "w". The same position is "w" in a
 *    Jocly FEN and "b" in an SFEN. A straight swap, both ways - and it happens
 *    a SECOND time between an SFEN and the [FEN] tag of a PGN, which
 *    ChuShogiLite writes from White's point of view.
 *
 * 2. The field count. A Jocly FEN has the six of orthodox chess (board, turn,
 *    castling, en passant, halfmove, fullmove); an SFEN has four (board, turn,
 *    a third field, move number). Nothing is lost in either direction for a
 *    Shogi game: castling and en passant do not exist there.
 *
 * 3. The coordinates. Jocly names squares "a1" from the bottom left; SFEN and
 *    USI number the files from the RIGHT (1..12) and letter the ranks from the
 *    TOP (a..l), so Jocly's a1 is USI's "12l".
 *
 * THE THIRD FIELD is where Chu Shogi keeps the square of the last Lion
 * capture, which its Lion-trade rule needs. Jocly enforces that rule from
 * `board.lastMove` (see locust-move-model.js), so the square can be written
 * out - but it CANNOT be read back in: the rule looks up the piece that was
 * captured, and a position loaded from a string has no such piece. The field
 * is therefore exported faithfully, parsed, and handed to the caller as
 * `initial.lionCapture` without being applied. Reading it back needs the rule
 * to take its state from the board rather than from the previous move, which
 * is a change to locust-move-model.js and is not attempted here.
 */

(function() {

	var geometry; // set at InitGame, like locust-move-model.js does

	var OriginalExtraInit = Model.Game.extraInit;
	Model.Game.extraInit = function(geo) {
		geometry = geo;
		if(OriginalExtraInit)
			OriginalExtraInit.apply(this, arguments);
	}

	/*
	 * The playing area, as files and ranks. Read from BOARD_AREA when there is
	 * one: a drop game's holdings are extra COLUMNS of a wider grid
	 * (drop-model.js), and those columns are not files - SFEN describes the
	 * nine files of Shogi, not the thirteen Jocly stores them in. Only
	 * cbDropGeometry() builds that table; a plain grid (Chu Shogi) has none
	 * and every square of it is playing area.
	 */
	var cached = null;
	function area() {
		if(cached && cached.geometry === geometry) return cached;
		var files = {}, ranks = {};
		if(geometry.BOARD_AREA)
			for(var square in geometry.BOARD_AREA) {
				files[geometry.C(square)] = 1;
				ranks[geometry.R(square)] = 1;
			}
		else
			for(var c = 0; c < geometry.width; c++) {
				files[c] = 1;
				for(var r = 0; r < geometry.height; r++) ranks[r] = 1;
			}
		var order = function(set) {
			return Object.keys(set).map(Number).sort(function(a, b) { return a - b; });
		};
		cached = { geometry: geometry, files: order(files), ranks: order(ranks) };
		return cached;
	}

	/* ---- coordinates ------------------------------------------------- */

	/*
	 * USI names a square by its file NUMBER counted from the right and its
	 * rank LETTER counted from the top: the leftmost square of the top row of
	 * a Chu board is "12a", and Jocly's a1 - bottom left - is "12l".
	 */
	Model.Game.cbToUSISquare = function(pos) {
		var box = area();
		var file = box.files.indexOf(geometry.C(pos));
		var rank = box.ranks.indexOf(geometry.R(pos));
		if(file < 0 || rank < 0) return null; // not a playing square (a hand)
		return (box.files.length - file) + String.fromCharCode(97 + box.ranks.length - 1 - rank);
	}

	Model.Game.cbFromUSISquare = function(name) {
		var m = /^([0-9]{1,2})([a-z])$/.exec(name);
		if(!m) return -1;
		var box = area();
		var file = box.files.length - parseInt(m[1], 10);
		var rank = box.ranks.length - 1 - (m[2].charCodeAt(0) - 97);
		if(file < 0 || file >= box.files.length || rank < 0 || rank >= box.ranks.length)
			return -1;
		return geometry.POS(box.files[file], box.ranks[rank]);
	}

	/* ---- position ---------------------------------------------------- */

	/*
	 * The board field. Built here rather than taken from the Jocly FEN so that
	 * a drop game's holding columns are skipped - the same walk of BOARD_AREA
	 * that BuildShogiStyleFen() does in jocly.fairy.js. For a game without
	 * holdings (Chu Shogi) the result is the Jocly field, character for
	 * character; there is a test that says so.
	 */
	function boardField(board, cbVar) {
		var box = area(), rows = [];
		for(var r = box.ranks.length - 1; r >= 0; r--) {
			var row = "", empty = 0;
			for(var f = 0; f < box.files.length; f++) {
				var pos = geometry.POS(box.files[f], box.ranks[r]);
				var index = board.board[pos];
				if(index < 0) { empty++; continue; }
				if(empty > 0) { row += empty; empty = 0; }
				var pType = cbVar.pieceTypes[board.pieces[index].t];
				var letter = pType.fenAbbrev || pType.abbrev || "?";
				row += board.pieces[index].s > 0 ? letter.toUpperCase() : letter.toLowerCase();
			}
			if(empty > 0) row += empty;
			rows.push(row);
		}
		return rows.join("/");
	}

	/*
	 * The square of the last Lion capture, or "-". A Lion is a type whose
	 * antiTrade is odd (locust-move-model.js tests `at & 1`); the captured
	 * piece is still in the piece list, off the board, which is what makes
	 * this readable after the fact.
	 */
	function lionCaptureField(board, aGame) {
		var last = board.lastMove;
		if(!last || last.c === null || last.c === undefined || !aGame.minimumBridge)
			return "-";
		var victim = board.pieces[last.c];
		if(!victim) return "-";
		var pType = aGame.g ? aGame.g.pTypes[victim.t] : null;
		if(!pType || !(pType.antiTrade & 1)) return "-";
		return Model.Game.cbToUSISquare(last.t & 0xffff) || "-";
	}

	/*
	 * A game whose pieces go in hand writes its holdings in the third field
	 * ("2Pl", or "-" when both hands are empty), where a Chu Shogi SFEN keeps
	 * the last Lion capture. Nothing here reads or writes that yet, and a
	 * silently dropped hand is exactly the kind of loss the FEN of the drop
	 * games has already cost once - so this says no instead.
	 */
	function hasHoldings() {
		return !!Model.Game.handLayout;
	}

	Model.Board.ExportSFEN = function(aGame) {
		if(hasHoldings())
			throw new Error("SFEN: holdings are not written yet (the third field would be a hand)");
		var moveNumber = this.cbInitialPly(aGame) + aGame.mPlayedMoves.length + 1;
		return boardField(this, aGame.cbVar)
			+ " " + (this.mWho > 0 ? "b" : "w")   // Jocly's "w" is SFEN's "b"
			+ " " + lionCaptureField(this, aGame)
			+ " " + moveNumber;
	}

	/*
	 * Reading. The Jocly importer is reused rather than rewritten: it already
	 * resolves a letter to the right type for the right side (the piecesMap
	 * and its side affinity), which is the part that is easy to get subtly
	 * wrong. What is done here is the translation of the fields around the
	 * board, and the refusal of anything that is not an SFEN for THIS game.
	 *
	 * The refusal matters. Handed a genuine 9x9 Shogi SFEN, the six-field
	 * importer accepts it and lays it two files to the left, because a Shogi
	 * board in Jocly is thirteen columns wide and the first two are Black's
	 * hand: the lances end up IN HAND and nothing is reported. Better to say
	 * no.
	 */
	Model.Game.ImportSFEN = function(data) {
		var bad = function(why) {
			console.warn("SFEN:", why);
			return { status: false, error: 'parse' };
		};
		if(hasHoldings())
			return bad("holdings are not read yet (the third field would be a hand)");
		var parts = String(data || "").trim().split(/\s+/);
		if(parts.length < 2)
			return bad("needs at least a board and a side to move");
		if(parts[1] != 'b' && parts[1] != 'w')
			return bad("side to move should be b or w, got " + parts[1]);

		var box = area();
		var rows = parts[0].split("/");
		if(rows.length != box.ranks.length)
			return bad("board should have " + box.ranks.length + " ranks, got " + rows.length);
		for(var i = 0; i < rows.length; i++) {
			var wide = 0, row = rows[i];
			for(var j = 0; j < row.length; j++) {
				var ch = row.charAt(j);
				if(ch == '+') continue;                 // promotion mark, not a square
				if(ch >= '0' && ch <= '9') {
					var digits = ch;
					while(j + 1 < row.length && row.charAt(j+1) >= '0' && row.charAt(j+1) <= '9')
						digits += row.charAt(++j);
					wide += parseInt(digits, 10);
				} else
					wide++;
			}
			if(wide != box.files.length)
				return bad("rank " + (i+1) + " covers " + wide + " files, expected "
					+ box.files.length);
		}

		// ... and now the six-field form the Jocly importer speaks. The board
		// field is passed through untouched: it is the same string.
		var result = this.Import('pjn', parts[0]
			+ " " + (parts[1] == 'b' ? 'w' : 'b')
			+ " - - 0 " + (parseInt(parts[3], 10) > 0 ? parseInt(parts[3], 10) : 1));
		if(result.status !== false)
			// carried, not applied: see the header
			result.initial.lionCapture = (parts[2] && parts[2] != '-') ? parts[2] : null;
		return result;
	}

	/* ---- moves -------------------------------------------------------- */

	/*
	 * USI. A move is its two squares, with the promotion mark suffixed; the
	 * two-leg moves of the Lion, the Horned Falcon and the Soaring Eagle are
	 * THREE squares, start, midpoint, end - which Jocly already carries, in
	 * `via`, so nothing has to be reconstructed.
	 *
	 * Added as a format of its own. `natural` is left exactly as it was: it is
	 * what Tabulon writes into a saved game, and a game saved yesterday has to
	 * still load tomorrow.
	 */
	var OriginalToString = Model.Move.ToString;
	Model.Move.ToString = function(format) {
		if(format != "usi")
			return OriginalToString.apply(this, arguments);
		var name = Model.Game.cbToUSISquare;
		var usi = name(this.f);
		if(this.via !== undefined)
			usi += name(this.via);
		usi += name(this.t & 0xffff);
		if(this.pr !== undefined)
			usi += "+";
		return usi;
	}

	/*
	 * The move a USI string names, or null.
	 *
	 * EXACT, and that is the point. GetBestMatchingMove() - what pickMove()
	 * uses - picks the nearest string by edit distance and never fails: given
	 * "7g7f" it would answer with whatever move happens to print closest to
	 * it, and play that. Fine for forgiving a "+" at the end of a hand-written
	 * PGN, wrong for translating between two coordinate systems. Anything that
	 * reads a file must be told when it has read something it does not
	 * understand.
	 */
	Model.Game.MoveFromUSI = function(board, usi) {
		var wanted = String(usi || "").trim();
		if(!wanted) return null;
		if(!board.mMoves || board.mMoves.length == 0) {
			// a game method: GenerateMoves() needs the game, not the prototype
			if(!this.cbVar)
				throw new Error("MoveFromUSI: call it on the game, not on Model.Game");
			board.GenerateMoves(this);
		}
		var found = null;
		for(var i = 0; i < board.mMoves.length; i++) {
			var move = board.mMoves[i];
			// called with the move as `this` rather than through CreateMove():
			// the generated moves are plain objects, and this works whether
			// MoveFromUSI is reached from a game or from Model.Game itself
			var str = Model.Move.ToString.call(move, "usi");
			if(str == wanted) {
				if(found) return null; // ambiguous: say so rather than choose
				found = move;
			}
		}
		return found;
	}

})();
