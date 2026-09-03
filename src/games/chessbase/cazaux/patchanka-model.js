/*
 * Patchanka, by Jean-Louis Cazaux - 10x10.
 * https://www.chessvariants.com/rules/patchanka
 *
 * Almost every piece is a compound of two simpler ones, and the model is
 * written that way: cbSymmetricGraph() takes Betza atoms directly, one entry
 * per atom (11 Ferz, 10 Wazir, 20 Dabbaba, 22 Alfil, 21 Knight, 31 Camel,
 * 32 Giraffe/Zebra; negative = the same direction ridden without limit).
 *
 *   Wildebeest  NC   knight + camel
 *   Okapi       NZ   knight + giraffe
 *   Bison       CZ   camel + giraffe
 *   Kirin       FD   ferz + dabbaba          (Chu Shogi)
 *   Phoenix     WA   wazir + alfil           (Chu Shogi)
 *   Badger      BD   bishop + dabbaba        = FFD, the grown-up Kirin
 *   Ram         RA   rook + alfil            = WWA, the grown-up Phoenix
 *   Medusa      QAD  queen + alfil + dabbaba (promotion only)
 *
 * The array is compact: two ranks of pieces plus a rank of Pawns, and only
 * d1-g1 occupied on the first rank.
 *
 *   1  . . . O K Z W . . .        rank 1  (White)
 *   2  R H I B S S B I H R        rank 2
 *   3  P P P P P P P P P P        rank 3
 *
 * No castling. The last rank promotes a Pawn or a Soldier to a Medusa, a
 * Kirin to a Badger and a Phoenix to a Ram - always compulsory, hence the
 * single-element lists returned by promote().
 *
 * Piece letters are the author's own (rules page and Game Courier diagram):
 * S Soldier, H Phoenix, I Kirin, B Badger, R Ram, Z Bison, O Okapi,
 * W Wildebeest, Q Medusa, K King. B and R are free here - the game has
 * neither Bishop nor Rook.
 */

(function() {

	var firstRow = 0;
	var lastRow = 9;

	var geometry = Model.Game.cbBoardGeometryGrid(10,10);

	Model.Game.cbDefine = function() {

		return {

			geometry: geometry,

			pieceTypes: {

				/*
				 * The Pawn keeps its double step for one move only (Betza
				 * "i"), so it comes in the usual two types: ipawn-* carries
				 * `initial` and the double step, and turns into pawn-* the
				 * moment it moves. The Soldier does NOT - its double step is
				 * available from anywhere on the board - so it stays one type.
				 */
				0: {
					name: 'pawn-w',
					aspect: 'fr-pawn',
					graph: this.cbPawnGraph(geometry,1),
					value: .8,
					abbrev: '',
					fenAbbrev: 'P',
					epCatch: true,
				},

				1: {
					name: 'pawn-b',
					aspect: 'fr-pawn',
					graph: this.cbPawnGraph(geometry,-1),
					value: .8,
					abbrev: '',
					fenAbbrev: 'P',
					epCatch: true,
				},

				2: {
					name: 'ipawn-w',
					aspect: 'fr-pawn',
					graph: this.cbInitialPawnGraph(geometry,1),
					value: .8,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:1,p:20},{s:1,p:21},{s:1,p:22},{s:1,p:23},{s:1,p:24},
					          {s:1,p:25},{s:1,p:26},{s:1,p:27},{s:1,p:28},{s:1,p:29}],
					epTarget: true,
					// a Pawn that has not moved yet can still be the one
					// catching en passant: a Soldier may take its double step
					// from any rank, so an enemy Pawn can cross rank 4 while
					// the white Pawns still stand on rank 3
					epCatch: true,
				},

				3: {
					name: 'ipawn-b',
					aspect: 'fr-pawn',
					graph: this.cbInitialPawnGraph(geometry,-1),
					value: .8,
					abbrev: '',
					fenAbbrev: 'P',
					initial: [{s:-1,p:70},{s:-1,p:71},{s:-1,p:72},{s:-1,p:73},{s:-1,p:74},
					          {s:-1,p:75},{s:-1,p:76},{s:-1,p:77},{s:-1,p:78},{s:-1,p:79}],
					epTarget: true,
					epCatch: true,
				},

				/*
				 * Soldier - fsmWfceFfmnnD. An augmented Pawn: it captures
				 * diagonally forward like a Pawn, moves without capturing one
				 * square forward or sideways, and may step two empty squares
				 * forward from ANY position (hence cbInitialPawnGraph, which
				 * gives the forward 1-or-2 line on every square, and no
				 * demotion in promote()). Same piece as in Zanzibar-Maasai
				 * Chess and Bigorra.
				 */
				4: {
					name: 'soldier-w',
					aspect: 'fr-corporal',
					graph: this.cbMergeGraphs(geometry,
						this.cbInitialPawnGraph(geometry,1),
						// sideways: move only, never a capture
						this.cbShortRangeGraph(geometry,[[-1,0],[1,0]],null,this.cbConstants.FLAG_MOVE)),
					value: 1,
					abbrev: 'S',
					initial: [{s:1,p:14},{s:1,p:15}],
					epTarget: true,
					epCatch: true,
				},

				5: {
					name: 'soldier-b',
					aspect: 'fr-corporal',
					graph: this.cbMergeGraphs(geometry,
						this.cbInitialPawnGraph(geometry,-1),
						this.cbShortRangeGraph(geometry,[[-1,0],[1,0]],null,this.cbConstants.FLAG_MOVE)),
					value: 1,
					abbrev: 'S',
					initial: [{s:-1,p:84},{s:-1,p:85}],
					epTarget: true,
					epCatch: true,
				},

				/* Phoenix - WA, wazir + alfil. Promotes to Ram. */
				6: {
					name: 'phoenix',
					aspect: 'fr-phoenix',
					graph: this.cbSymmetricGraph(geometry,[10,22]),
					value: 2.9,
					abbrev: 'H',
					initial: [{s:1,p:11},{s:1,p:18},{s:-1,p:81},{s:-1,p:88}],
				},

				/* Kirin - FD, ferz + dabbaba. Promotes to Badger. */
				7: {
					name: 'kirin',
					// same piece, same icon as the Kirin of Minjiku Shogi
					aspect: 'fr-giraffe',
					graph: this.cbSymmetricGraph(geometry,[11,20]),
					value: 3.1,
					abbrev: 'I',
					initial: [{s:1,p:12},{s:1,p:17},{s:-1,p:82},{s:-1,p:87}],
				},

				/* Badger - BD, bishop ride + dabbaba leap. */
				8: {
					name: 'badger',
					aspect: 'fr-badger',
					graph: this.cbSymmetricGraph(geometry,[-11,20]),
					value: 5.3,
					abbrev: 'B',
					initial: [{s:1,p:13},{s:1,p:16},{s:-1,p:83},{s:-1,p:86}],
				},

				/* Ram - RA, rook ride + alfil leap. */
				9: {
					name: 'ram',
					aspect: 'fr-ram',
					graph: this.cbSymmetricGraph(geometry,[-10,22]),
					value: 6.3,
					abbrev: 'R',
					initial: [{s:1,p:10},{s:1,p:19},{s:-1,p:80},{s:-1,p:89}],
				},

				/* Bison - CZ, camel + giraffe. */
				10: {
					name: 'bison',
					aspect: 'fr-buffalo',
					graph: this.cbSymmetricGraph(geometry,[31,32]),
					value: 5,
					abbrev: 'Z',
					initial: [{s:1,p:5},{s:-1,p:95}],
				},

				/* Okapi - NZ, knight + giraffe. */
				11: {
					name: 'okapi',
					aspect: 'fr-antelope',
					graph: this.cbSymmetricGraph(geometry,[21,32]),
					value: 5.3,
					abbrev: 'O',
					initial: [{s:1,p:3},{s:-1,p:93}],
				},

				/* Wildebeest - NC, knight + camel. */
				12: {
					name: 'wildebeest',
					aspect: 'fr-dragon',
					graph: this.cbSymmetricGraph(geometry,[21,31]),
					value: 5.5,
					abbrev: 'W',
					initial: [{s:1,p:6},{s:-1,p:96}],
				},

				/*
				 * Medusa - QAD, queen + alfil + dabbaba, i.e. Badger + Ram.
				 * Not on the initial array: it only ever appears through the
				 * promotion of a Pawn or a Soldier.
				 */
				13: {
					name: 'medusa',
					aspect: 'fr-lighthouse',
					graph: this.cbSymmetricGraph(geometry,[-10,-11,20,22]),
					value: 10.2,
					abbrev: 'Q',
				},

				/* King - no castling in Patchanka. */
				14: {
					name: 'king',
					aspect: 'fr-king',
					isKing: true,
					graph: this.cbKingGraph(geometry),
					abbrev: 'K',
					initial: [{s:1,p:4},{s:-1,p:94}],
				},

			},

			/*
			 * "Promotion is immediate, compulsory and cannot be refused" -
			 * every list below holds exactly one type, which is what makes
			 * base-model.js apply it without offering a choice.
			 */
			promote: function(aGame,piece,move) {
				var row = geometry.R(move.t);
				var last = (piece.s>0 ? row==lastRow : row==firstRow);
				switch(piece.t) {
					case 2: // a Pawn that moves loses its double step - unless
					        // it is promoting, which it cannot do from rank 3
						return row==lastRow ? [13] : [0];
					case 3:
						return row==firstRow ? [13] : [1];
					case 0:
						return row==lastRow ? [13] : [];
					case 1:
						return row==firstRow ? [13] : [];
					case 4: // Soldier: same promotion, and it keeps its own
					        // graph until then (no ipawn/pawn split)
						return row==lastRow ? [13] : [];
					case 5:
						return row==firstRow ? [13] : [];
					case 6: // Phoenix WA -> Ram WWA
						return last ? [9] : [];
					case 7: // Kirin FD -> Badger FFD
						return last ? [8] : [];
				}
				return [];
			},

		};
	}

	/*
	 * The Medusa is the only piece here whose ride and whose leap can land on
	 * the same square: e5-c7 is both a Bishop slide and an Alfil leap, and the
	 * merged graph offers each of them, so the move is generated twice on an
	 * open board. Harmless in the interface - the two are identical - but it
	 * doubles those branches in the search, and it makes every move count
	 * disagree with Fairy-Stockfish, which is what the Expert level is checked
	 * against.
	 *
	 * It cannot be fixed in the graph: the leap that duplicates a ride on an
	 * open board is exactly the one needed when the ride is blocked. So the
	 * duplicates are dropped after generation, and only for the Medusa - no
	 * other piece can produce one.
	 */
	var MEDUSA = 13;
	var cbGeneratePseudoLegalMoves = Model.Board.cbGeneratePseudoLegalMoves;
	Model.Board.cbGeneratePseudoLegalMoves = function(aGame) {
		var moves = cbGeneratePseudoLegalMoves.call(this,aGame);
		var seen = null, kept = null;
		for(var i=0;i<moves.length;i++) {
			var index = this.board[moves[i].f];
			if(index<0 || this.pieces[index].t!=MEDUSA) {
				if(kept) kept.push(moves[i]);
				continue;
			}
			if(!seen) { // first Medusa move: everything so far was unique
				seen = {};
				kept = moves.slice(0,i);
			}
			var key = moves[i].f+"-"+moves[i].t;
			if(seen[key])
				continue;
			seen[key] = true;
			kept.push(moves[i]);
		}
		return kept || moves;
	}

})();
