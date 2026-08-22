/*
 * Crazyhouse: orthodox chess in which a captured piece changes sides and may
 * later be dropped back on the board as a move.
 *
 * The two halves already existed here: drop-model.js implements holdings (it
 * serves seven Shogi games) and famous/classic-model.js is orthodox chess.
 * This file marries them, and is deliberately thin - nothing in the five drop
 * rules needed a new mechanism.
 *
 * WHAT IS NOT AS IN classic-model.js, and why:
 *
 * - ONE Pawn type per side, not two. Orthodox chess splits the Pawn into
 *   `ipawn` (may still step twice) and `pawn` (may not), and promote()
 *   converts the first into the second on its first move. That encoding says
 *   "the double step belongs to a Pawn that has not moved", which is the wrong
 *   rule here: a Pawn DROPPED on the second rank may advance two squares, and
 *   a Pawn dropped on the fifth may not - and both have the same history.
 *   Crazyhouse ties the double step to the RANK, so the graph does too (see
 *   PawnGraph below), and the type split disappears with it. On the board the
 *   two rules coincide, since a Pawn can never return to its second rank.
 *   Dropping the split also drops the FEN letter collision it would have cost
 *   (the trap that hit Gigachess II and Minjiku).
 *
 * - Promoted pieces are their OWN types (7..14), because a promoted piece
 *   captured must return to the hand as a Pawn. That is exactly what
 *   drop-model.js's `demoted` table does, and the only way to express it: a
 *   promoted Queen has to be distinguishable from a real one. They carry the
 *   same `aspect`, so they are indistinguishable on screen, as they should be.
 *
 * - Their FEN letter is the base letter plus '~' ("Q~"). The module's own
 *   convention for two types sharing a letter is a trailing '!', but '~' is
 *   what Fairy-Stockfish writes for a promoted piece in Crazyhouse, and the
 *   engine reads back the FEN this model exports (see the Expert level).
 *   Choosing '!' here would have meant translating the FEN for the engine.
 *
 * - No insufficient-material draw. classic-model.js declares one, addressing
 *   piece types by number; the numbers here are different, and the rule itself
 *   is wrong for Crazyhouse, where a lone King with a Pawn in hand is not
 *   drawn. The 50-move rule is kept.
 *
 * - Piece values are not the orthodox ones. See VALUES below.
 */

(function() {

	var c = Model.Game.cbConstants;

	// 8x8 plus two holding columns each side; no holding ROWS (v=0), five
	// piece kinds needing at most five of the eight slots the height gives.
	// The playing area is squares 12r+f+2 - files a..h are columns 2..9 of a
	// 12-wide grid, which is why every square below is written POS(file,rank)
	// and never as a bare number.
	var geometry = Model.Game.cbDropGeometry(8, 8, 0);
	var area = geometry.BOARD_AREA;

	function POS(file, rank) { return geometry.POS(file + 2, rank); }

	function Rank(rank, side) {
		var list = [];
		for(var f = 0; f < 8; f++) list.push({ s: side, p: POS(f, rank) });
		return list;
	}

	function Back(side) { // the given files of that side's own back rank
		var list = [];
		for(var i = 1; i < arguments.length; i++)
			list.push({ s: side, p: POS(arguments[i], side > 0 ? 0 : 7) });
		return list;
	}

	/*
	 * The Pawn's own moves (the drops are merged in below). The double step is
	 * offered from `homeRank` and from nowhere else, so a Pawn dropped on the
	 * second rank has it and one dropped on the fifth does not - the rule
	 * cbInitialPawnGraph() cannot express, since it grants the long step from
	 * every square and leaves the restriction to the type conversion.
	 *
	 * Confined to BOARD_AREA throughout: without that, a Pawn waiting in hand
	 * would read the holding column as a file and "advance" up it.
	 */
	function PawnGraph(side, homeRank) {
		var graph = {};
		for(var pos = 0; pos < geometry.boardSize; pos++) {
			graph[pos] = [];
			if(!(pos in area)) continue;
			var one = geometry.Graph(pos, [0, side]);
			if(one != null && (one in area)) {
				var line = [one | c.FLAG_MOVE];
				if(geometry.R(pos) == homeRank) {
					var two = geometry.Graph(one, [0, side]);
					// one line, not two: the generator walks it and stops at
					// the first occupied square, which is what makes the long
					// step blockable - and leaves `ept` set on the far one
					if(two != null && (two in area)) line.push(two | c.FLAG_MOVE);
				}
				graph[pos].push(Model.Game.cbTypedArray(line));
			}
			[-1, 1].forEach(function(df) {
				var cap = geometry.Graph(pos, [df, side]);
				if(cap != null && (cap in area))
					graph[pos].push(Model.Game.cbTypedArray([cap | c.FLAG_CAPTURE]));
			});
		}
		return graph;
	}

	var KING = [[0,1],[1,0],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
	var KNIGHT = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
	var ROOK = [[0,1],[1,0],[-1,0],[0,-1]];
	var BISHOP = [[1,1],[1,-1],[-1,1],[-1,-1]];

	/*
	 * VALUES. A drop game's pieces are not worth what they are worth in chess:
	 * a Pawn is a tempo and a mating net rather than a distant Queen, and the
	 * long-range pieces lose by having no empty board to work on. Pawns and
	 * Knights gain, Rooks, Bishops and Queens lose.
	 *
	 * A promoted piece is worth less than its true counterpart, because taking
	 * it hands back a Pawn and not a Queen - the difference is what it costs
	 * the owner, not what it does on the board.
	 */
	var variant;   // the definition below, once built: the notation reads it

	var VALUES = {
		pawn: 1.5, knight: 3.3, bishop: 3.1, rook: 4.5, queen: 7,
		pKnight: 3.1, pBishop: 2.9, pRook: 4.2, pQueen: 6.4,
	};

	Model.Game.cbDefine = function() {

		var $this = this;

		// every non-Pawn drops on all eight ranks; the Pawn does not (§ below)
		function Drops(leaps, slides, start, end) {
			return $this.cbDropGraph(geometry, leaps, slides, start, end);
		}

		var definition = {

			geometry: geometry,

			/*
			 * Pawns first and sharing an abbrev, so base-model.js's guess at
			 * cbPawnTypes lands on 2 - and so drop-model.js's own `t < 2`
			 * Pawn test (it counts Pawns per file) means what it says.
			 */
			pieceTypes: {

				0: {
					name: 'pawn-w',
					aspect: 'pawn',
					// no drop on the first or last rank: the last two
					// arguments of cbDropGraph are forbidden ranks
					graph: Model.Game.cbMergeGraphs(geometry,
						PawnGraph(1, 1), $this.cbDropGraph(geometry, [], [], 1, 1)),
					value: VALUES.pawn,
					abbrev: '',
					fenAbbrev: 'P',
					initial: Rank(1, 1),
					demoted: 1,     // captured, it becomes the captor's Pawn
					hand: 0,
					epTarget: true,
					epCatch: true,
				},

				1: {
					name: 'pawn-b',
					aspect: 'pawn',
					graph: Model.Game.cbMergeGraphs(geometry,
						PawnGraph(-1, 6), $this.cbDropGraph(geometry, [], [], 1, 1)),
					value: VALUES.pawn,
					abbrev: '',
					fenAbbrev: 'P',
					initial: Rank(6, -1),
					demoted: 0,
					hand: 0,
					epTarget: true,
					epCatch: true,
				},

				2: {
					name: 'knight',
					graph: Drops(KNIGHT, []),
					value: VALUES.knight,
					abbrev: 'N',
					initial: Back(1, 1, 6).concat(Back(-1, 1, 6)),
					hand: 1,
				},

				3: {
					name: 'bishop',
					graph: Drops([], BISHOP),
					value: VALUES.bishop,
					abbrev: 'B',
					initial: Back(1, 2, 5).concat(Back(-1, 2, 5)),
					hand: 2,
				},

				4: {
					name: 'rook',
					graph: Drops([], ROOK),
					value: VALUES.rook,
					abbrev: 'R',
					initial: Back(1, 0, 7).concat(Back(-1, 0, 7)),
					castle: true,
					hand: 3,
				},

				5: {
					name: 'queen',
					graph: Drops([], ROOK.concat(BISHOP)),
					value: VALUES.queen,
					abbrev: 'Q',
					initial: Back(1, 3).concat(Back(-1, 3)),
					hand: 4,
				},

				6: {
					name: 'king',
					isKing: true,
					graph: Drops(KING, []),
					abbrev: 'K',
					initial: Back(1, 4).concat(Back(-1, 4)),
				},

				/*
				 * The promoted pieces. Same graph, same aspect, same abbrev -
				 * they differ from the true article in one respect only, which
				 * is where they go when captured: back to a hand as a Pawn.
				 * `demoted` names the captor's Pawn, so each needs its own
				 * type per side, exactly as the Shogi models do.
				 */

				7: {
					name: 'p-knight-w', aspect: 'knight',
					graph: Drops(KNIGHT, []),
					value: VALUES.pKnight, abbrev: 'N', fenAbbrev: 'N~', demoted: 1,
				},
				8: {
					name: 'p-knight-b', aspect: 'knight',
					graph: Drops(KNIGHT, []),
					value: VALUES.pKnight, abbrev: 'N', fenAbbrev: 'N~', demoted: 0,
				},
				9: {
					name: 'p-bishop-w', aspect: 'bishop',
					graph: Drops([], BISHOP),
					value: VALUES.pBishop, abbrev: 'B', fenAbbrev: 'B~', demoted: 1,
				},
				10: {
					name: 'p-bishop-b', aspect: 'bishop',
					graph: Drops([], BISHOP),
					value: VALUES.pBishop, abbrev: 'B', fenAbbrev: 'B~', demoted: 0,
				},
				11: {
					name: 'p-rook-w', aspect: 'rook',
					graph: Drops([], ROOK),
					value: VALUES.pRook, abbrev: 'R', fenAbbrev: 'R~', demoted: 1,
					// NO `castle`: a promoted Rook is not a castling Rook, and
					// in any case it arrives on the eighth rank
				},
				12: {
					name: 'p-rook-b', aspect: 'rook',
					graph: Drops([], ROOK),
					value: VALUES.pRook, abbrev: 'R', fenAbbrev: 'R~', demoted: 0,
				},
				13: {
					name: 'p-queen-w', aspect: 'queen',
					graph: Drops([], ROOK.concat(BISHOP)),
					value: VALUES.pQueen, abbrev: 'Q', fenAbbrev: 'Q~', demoted: 1,
				},
				14: {
					name: 'p-queen-b', aspect: 'queen',
					graph: Drops([], ROOK.concat(BISHOP)),
					value: VALUES.pQueen, abbrev: 'Q', fenAbbrev: 'Q~', demoted: 0,
				},

			},

			promote: function(aGame, piece, move) {
				if(!(move.f in area)) return []; // a drop is not a Pawn move
				if(piece.t == 0 && geometry.R(move.t) == 7) return [7, 9, 11, 13];
				if(piece.t == 1 && geometry.R(move.t) == 0) return [8, 10, 12, 14];
				return [];
			},

			castle: (function() {
				var table = {};
				[1, -1].forEach(function(side) {
					var rank = side > 0 ? 0 : 7;
					var king = POS(4, rank);
					table[king + "/" + POS(0, rank)] = {
						k: [POS(3, rank), POS(2, rank)],
						r: [POS(1, rank), POS(2, rank), POS(3, rank)],
						n: "O-O-O",
					};
					table[king + "/" + POS(7, rank)] = {
						k: [POS(5, rank), POS(6, rank)],
						r: [POS(6, rank), POS(5, rank)],
						n: "O-O",
					};
				});
				return table;
			})(),

			/*
			 * Deliberately almost empty. classic-model.js's evaluate() opens
			 * with an insufficient-material draw addressed by piece type
			 * NUMBER; copied here it would both read the wrong types and state
			 * a rule Crazyhouse does not have - material is never dead while
			 * anything remains in hand. What is kept is the 50-move draw, the
			 * only thing standing between two shuffling Kings and an endless
			 * game. Repetition is handled by cbMaxRepeats (three, the default).
			 */
			evaluate: function(aGame, evalValues, material) {
				if(this.noCaptCount >= 100) {
					this.mFinished = true;
					this.mWinner = JocGame.DRAW;
				}
			},

		};

		variant = this.cbAddHoldings(geometry, definition);
		return variant;
	}

	/*
	 * NOTATION. drop-model.js already overrides Model.Move.ToString, and prints
	 * a drop correctly ("P@e4", which is also what UCI speaks). What it does
	 * with a board move is to hand the base implementation a copy in board
	 * coordinates - and that copy is built from four fields only:
	 *
	 *     { f: this.f - 2 - v*w, t: ..., c: this.c, a: this.a }
	 *
	 * `pr` and `cg` are not among them, which is right for the games it was
	 * written for: no Shogi variant castles, and a Shogi promotion is marked
	 * with a trailing '+' that drop-model.js adds back itself. Here both are
	 * lost, and neither loss is cosmetic:
	 *
	 * - all four promotions of a Pawn print as the same string ("e7e8"), so
	 *   when Fairy-Stockfish answers "e7e8q" the nearest-string match in
	 *   jocly.fairy.js/ResolveMove() picks whichever of the four comes first
	 *   in the move list - the Knight. The engine asks for a Queen and gets a
	 *   Knight, without an error anywhere. This is the §6 trap of the notes,
	 *   and the Pemba bug in another guise.
	 * - castling prints as a King move to its own square instead of "O-O".
	 *
	 * The drop is printed here too, rather than left to drop-model.js, for a
	 * third reason: that function ignores the format it is passed and the
	 * move's own `ck`, so a drop that gives check reads "P@g7" where the rest
	 * of the notation would write "P@g7+". UCI wants exactly "P@g7", so the
	 * two really are different strings and the format has to be honoured.
	 *
	 * Coordinates: file letter 'a' is column 2 of the wide grid, hence
	 * 95 + C(pos) (97 - 2), the same arithmetic drop-model.js uses.
	 */

	function Name(pos) {
		return String.fromCharCode(95 + geometry.C(pos)) + (geometry.R(pos) + 1);
	}
	function Abbrev(type) {
		var pType = variant.pieceTypes[type];
		return pType && pType.abbrev ? pType.abbrev : "";
	}

	Model.Move.ToString = function(format) {
		format = format || "natural";
		var check = (format == "natural" && this.ck) ? "+" : "";
		var file = geometry.C(this.f);

		if(file < 2 || file >= geometry.width - 2) // a drop, out of either hand
			return (this.a === "" ? "P" : this.a) + "@" + Name(this.t) + check;

		var promo = this.pr === undefined ? "" : Abbrev(this.pr);
		var to = this.t & 0xffff;

		if(format == "engine")            // UCI: e2e4, e7e8Q, e1g1 for castling
			return Name(this.f) + Name(to) + promo;
		if(format == "engine960")         // UCI_Chess960: castling is King takes Rook
			return Name(this.f) + Name(this.cg !== undefined ? this.cg : to) + promo;

		if(this.cg !== undefined)
			return variant.castle[this.f + "/" + this.cg].n + check;
		return (this.a || "") + Name(this.f) + (this.c == null ? "-" : "x") + Name(to)
			+ (promo ? "=" + promo : "") + check;
	}

})();
