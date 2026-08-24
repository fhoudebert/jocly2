
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

	// Both set at InitGame, the hook locust-move-model.js uses for the same
	// reason: Move.ToString() and Game.ImportSFEN() may be reached from
	// Model.Game itself rather than from a game, and get no reference either
	// way. extraInit() runs after cbDefine(), so cbVar is already there.
	var geometry, variant;

	var OriginalExtraInit = Model.Game.extraInit;
	Model.Game.extraInit = function(geo) {
		geometry = geo;
		variant = this.cbVar;
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
	/*
	 * A rank of the board, widened to a rank of the grid. The padding is
	 * MERGED into a leading or trailing digit rather than written beside it:
	 * "2" before "9" would read as the single number 29, and the rank would
	 * swallow the board.
	 */
	function padRanks(field) {
		var box = area();
		var left = box.files[0];
		var right = geometry.width - 1 - box.files[box.files.length - 1];
		if(!left && !right) return field;
		return field.split("/").map(function(row) {
			var head = /^([0-9]+)/.exec(row);
			if(left) row = head ? (left + parseInt(head[1], 10)) + row.slice(head[1].length)
				: left + row;
			var tail = /([0-9]+)$/.exec(row);
			if(right) row = tail ? row.slice(0, -tail[1].length) + (right + parseInt(tail[1], 10))
				: row + right;
			return row;
		}).join("/");
	}

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
		/*
		 * One source now, and it is the board: locust-move-model.js records
		 * every Lion capture in `board.lionCapture` and seeds it from an
		 * imported position. Deducing the square from `lastMove` here as
		 * well would give two answers that could disagree - and the one
		 * from lastMove would be the wrong one after a load, which is
		 * precisely the case this whole field exists for.
		 */
		if(!aGame.minimumBridge || !board.lionCapture) return "-";
		return Model.Game.cbToUSISquare(board.lionCapture.at) || "-";
	}

	/*
	 * THE THIRD FIELD says two different things depending on the game.
	 *
	 * In a game whose pieces go in hand - Shogi itself - it is the holdings:
	 * the letters of the held pieces, a count in front of any letter held more
	 * than once, capitals for the side SFEN calls "b", and "-" when both hands
	 * are empty ("2Pl", "RBGSNLPrbgsnlp", "-"). In Chu Shogi, which has no
	 * drops, it is the square of the last Lion capture instead.
	 *
	 * Jocly keeps a hand as extra COLUMNS of a wider grid (drop-model.js), so
	 * neither the reading nor the writing is a matter of copying a field
	 * across: the pieces have to be counted off the board on the way out, and
	 * put back on their holding squares on the way in.
	 */
	function hasHoldings() {
		return !!Model.Game.handLayout;
	}

	// which side a held type belongs to: the two Pawns of a Shogi model are
	// pawn-w and pawn-b, and only one of them is ever in White's hand
	function affinity(pType) {
		var name = pType.name || "";
		if(/-w$/.test(name)) return 1;
		if(/-b$/.test(name)) return -1;
		return 0; // Bishop, Rook: one type serves both hands
	}

	// hand slot -> the type each side holds there, and the SFEN letter
	function holdings(cbVar) {
		var slots = {};
		for(var t in cbVar.pieceTypes) {
			var pType = cbVar.pieceTypes[t];
			if(pType.hand === undefined) continue;
			var slot = slots[pType.hand] = slots[pType.hand] || {};
			slot.letter = (pType.fenAbbrev || pType.abbrev || "?").toUpperCase();
			var aff = affinity(pType);
			if(aff >= 0) slot[1] = parseInt(t, 10);
			if(aff <= 0) slot[-1] = parseInt(t, 10);
		}
		return slots;
	}

	function handField(board, cbVar) {
		var slots = holdings(cbVar), counts = {};
		for(var i = 0; i < board.pieces.length; i++) {
			var piece = board.pieces[i];
			if(piece.p < 0 || (geometry.BOARD_AREA && piece.p in geometry.BOARD_AREA))
				continue;
			var pType = cbVar.pieceTypes[piece.t];
			if(!pType || pType.hand === undefined) continue; // drop-model's counters
			var key = piece.s + ":" + pType.hand;
			counts[key] = (counts[key] || 0) + 1;
		}
		// SFEN lists the strong pieces first - R B G S N L P for Shogi, which
		// is the slot order reversed - and one side's hand before the other's
		var order = Object.keys(slots).map(Number).sort(function(a, b) { return b - a; });
		var out = "";
		[1, -1].forEach(function(side) {
			order.forEach(function(slot) {
				var n = counts[side + ":" + slot];
				if(!n) return;
				var letter = slots[slot].letter;
				out += (n > 1 ? n : "") + (side > 0 ? letter : letter.toLowerCase());
			});
		});
		return out || "-";
	}

	/*
	 * Put the held pieces back. They are appended to the piece list Import()
	 * built from the board field, before InitialPosition() ever sees it: the
	 * first of a kind on the holding square, the rest on the spare square
	 * beside it, which is exactly the shape drop-model.js expects and chains
	 * up. The counter that draws the digit was already created there by
	 * drop-model.js's own Import wrapper; its TYPE carries the total, so a
	 * hand of three or more has to move it along.
	 */
	function placeHand(initial, field, cbVar) {
		if(field == "-" || !field) return true;
		var slots = holdings(cbVar), byLetter = {};
		for(var slot in slots) byLetter[slots[slot].letter] = parseInt(slot, 10);
		var counters = Model.Game.cbCounterTypes;

		var re = /([0-9]*)([A-Za-z])/g, m;
		var seen = 0;
		while((m = re.exec(field)) !== null) {
			seen += m[0].length;
			var count = m[1] ? parseInt(m[1], 10) : 1;
			var letter = m[2].toUpperCase();
			var side = (m[2] == letter) ? 1 : -1;
			var slot = byLetter[letter];
			if(slot === undefined) return false;
			var type = slots[slot][side];
			if(type === undefined) return false;
			var square = Model.Game.hand[side][type];
			if(square === undefined) return false;
			var spare = square + side;
			initial.pieces.push({ t: type, s: side, p: square, m: true });
			for(var i = 1; i < count; i++)
				initial.pieces.push({ t: type, s: side, p: spare, m: true });
			if(count >= 3 && counters) {
				var counter = initial.pieces.filter(function(piece) {
					return piece.p === spare && piece.t >= counters.first
						&& piece.t < counters.first + counters.count;
				})[0];
				if(counter) counter.t = counters.first + (count - 2);
			}
		}
		return seen == field.length; // anything left over was not a hand
	}

	/*
	 * SFEN counts MOVES - plies - and names the one about to be played, so
	 * "1" is the opening position. Jocly's sixth FEN field is the chess FULL
	 * move number, two plies to the unit, which cbInitialPly() then unwinds:
	 * ply = (number-1)*2, plus one when it is Black's turn. Feeding an SFEN
	 * number straight in doubled it - a game at move 42 came back at 84.
	 */
	function fullMove(sfenNumber, side) {
		var plies = (sfenNumber > 0 ? sfenNumber : 1) - 1;
		return Math.floor((plies - (side == 'w' ? 1 : 0)) / 2) + 1;
	}

	/*
	 * SFEN out, through the format argument that was already plumbed all the
	 * way down and then ignored.
	 *
	 * GameProxy.getBoardState(format) has always passed its argument to
	 * ExportBoardState(aGame), whose signature stops at aGame - so
	 * getBoardState("sfen") quietly returned a Jocly FEN. Honouring it here
	 * costs four lines and breaks nothing: every existing caller passes no
	 * format at all and keeps the six-field FEN it has always received.
	 *
	 * This is what lets a front end offer the position in the notation the
	 * rest of the Shogi world uses, without a translation table of its own and
	 * without changing what any other game exports.
	 */
	var OriginalExportBoardState = Model.Board.ExportBoardState;
	Model.Board.ExportBoardState = function(aGame, format) {
		if(format == "sfen")
			return this.ExportSFEN(aGame);
		return OriginalExportBoardState.apply(this, arguments);
	}

	Model.Board.ExportSFEN = function(aGame) {
		/*
		 * The number read from the SFEN is kept and counted on from, rather
		 * than recovered through cbInitialPly(): that encoding takes the
		 * parity of the ply from the side to move, so "16 moves played, and
		 * it is Black's turn" - a normal thing for a tsume position to say -
		 * cannot be written in it, and came back as 17.
		 */
		var start = (aGame.mInitial && aGame.mInitial.sfenMoveNumber > 0)
			? aGame.mInitial.sfenMoveNumber
			: this.cbInitialPly(aGame) + 1;
		var moveNumber = start + aGame.mPlayedMoves.length;
		return boardField(this, aGame.cbVar)
			+ " " + (this.mWho > 0 ? "b" : "w")   // Jocly's "w" is SFEN's "b"
			+ " " + (hasHoldings() ? handField(this, aGame.cbVar)
				: lionCaptureField(this, aGame))
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

		/*
		 * ... and now the six-field form the Jocly importer speaks.
		 *
		 * The board field is passed through untouched for a game without
		 * holdings, because it IS the same string. For a game with them it is
		 * not: Jocly's grid is four columns wider than the board, and the
		 * importer fills it from column zero - which is how a genuine 9x9
		 * Shogi SFEN used to land two files to the left with its lances in
		 * hand. The empty holding columns are added to each rank first.
		 */
		var result = this.Import('pjn', padRanks(parts[0])
			+ " " + (parts[1] == 'b' ? 'w' : 'b')
			+ " - - 0 " + fullMove(parseInt(parts[3], 10), parts[1]));
		if(result.status === false)
			return result;
		result.initial.sfenMoveNumber = parseInt(parts[3], 10) > 0 ? parseInt(parts[3], 10) : 1;
		if(hasHoldings()) {
			if(!placeHand(result.initial, parts[2], variant))
				return bad("third field is not a hand: " + parts[2]);
		} else
			// carried, not applied: see the header
			/*
			 * The third field, now ACTUALLY applied. locust-move-model.js
			 * keeps the anti-trade state on the board (`board.lionCapture`)
			 * instead of digging it out of the previous move, so a position
			 * arriving as a string can seed it - which is what makes the
			 * field readable back and not merely writable.
			 *
			 * The group is the one the rule compares against: Chu Shogi's
			 * Lion is the only anti-trade piece, and its `antiTrade` is -1
			 * (see chu-shogi-model.js). A variant with several groups would
			 * need the SFEN to carry the group too, which it does not.
			 */
			var square = (parts[2] && parts[2] != '-') ? parts[2] : null;
			var at = square !== null ? Model.Game.cbFromUSISquare(square) : -1;
			result.initial.lionCapture = at >= 0 ? { at: at, group: -1 } : null;
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
	/*
	 * Whether a promotion actually promotes. Shogi makes promotion OPTIONAL,
	 * so both versions of the move are generated and the one that DECLINES
	 * carries `pr` set to the piece's own, unpromoted type - marking that one
	 * with a "+" would name the wrong move. Promoted types are the ones whose
	 * abbreviation starts with "+", which is the module's own convention.
	 */
	function promoted(type) {
		var pType = variant && variant.pieceTypes[type];
		return !!(pType && /^\+/.test(pType.abbrev || ""));
	}

	var OriginalToString = Model.Move.ToString;
	Model.Move.ToString = function(format) {
		if(format != "usi")
			return OriginalToString.apply(this, arguments);
		var name = Model.Game.cbToUSISquare;
		var to = name(this.t & 0xffff);

		// A drop comes from a holding square, which is not a square USI can
		// name: it writes the piece's own letter, a star, and the destination
		// ("P*5e"). The empty abbrev is the Pawn's, as in drop-model.js.
		if(name(this.f) === null)
			return (this.a === "" ? "P" : this.a).toUpperCase() + "*" + to;

		var usi = name(this.f);
		if(this.via !== undefined)
			usi += name(this.via);
		usi += to;
		if(this.pr !== undefined && promoted(this.pr))
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

	/*
	 * Reading an SFEN wherever a position is expected.
	 *
	 * Jocly passes a saved position around as a string and hands it to
	 * Import("pjn", …) - Tabulon's `initialBoard`, the [FEN] tag of a PGN, the
	 * "Load board state" box all end up there. Rather than teach each of those
	 * about SFEN, the importer recognises one: a Jocly FEN always has six
	 * fields and an SFEN has four (or three, the move number being optional),
	 * so there is nothing to disambiguate.
	 *
	 * This is what lets a position copied out of ChuShogiLite be pasted into
	 * Tabulon with no change on either side.
	 */
	var OriginalImport = Model.Game.Import;
	Model.Game.Import = function(format, data) {
		if(format == 'pjn' && typeof data == 'string') {
			var fields = data.trim().split(/\s+/);
			if(fields.length == 3 || fields.length == 4)
				return this.ImportSFEN(data);
		}
		return OriginalImport.apply(this, arguments);
	}

	/*
	 * A whole game on one line: the SFEN of the starting position, then the
	 * moves in USI, separated by spaces - what ChuShogiLite's Game Export and
	 * Game Import boxes exchange, and what its `startGame` setting takes.
	 *
	 * Returned rather than applied: a game is the caller's to run, and the
	 * caller is the one that knows whether to play the moves out or to keep
	 * them as a solution to be found.
	 */
	Model.Game.ImportGameString = function(text) {
		var tokens = String(text || "").trim().split(/\s+/);
		if(tokens.length < 3)
			return { status: false, error: 'parse' };
		// the SFEN is the first three or four tokens: the fourth is the move
		// number, which a move never looks like
		var fields = /^[0-9]+$/.test(tokens[3] || "") ? 4 : 3;
		var result = this.ImportSFEN(tokens.slice(0, fields).join(" "));
		if(result.status === false)
			return result;
		result.moves = tokens.slice(fields);
		return result;
	}

	/*
	 * ... and the same line, written: the position the game STARTED from,
	 * then its moves in USI.
	 *
	 * A fresh board is built and exported rather than the one in play, the
	 * way ExportInitialBoardState() in jocly.game.js does it - and the played
	 * moves are put aside while it happens, because ExportSFEN() counts them
	 * and would otherwise number the opening position at the current move.
	 */
	Model.Game.ExportGameString = function() {
		// Object.create rather than GetBoardClass(): the latter belongs to the
		// jocly.game.js wrapper and is not there when a model is driven
		// directly, which the tests do
		var board = Object.create(Model.Board);
		if(board.Init) board.Init(this);
		board.InitialPosition(this);
		var played = this.mPlayedMoves || [];
		this.mPlayedMoves = [];
		var start;
		try { start = board.ExportSFEN(this); }
		finally { this.mPlayedMoves = played; }
		return [start].concat(played.map(function(move) {
			return Model.Move.ToString.call(move, "usi");
		})).join(" ");
	}

})();
