/*
 * Go (weiqi, baduk, igo) - the model.
 *
 * Written to be driven by an external engine rather than by Jocly's own
 * search: the native AIs are not going to play 19x19, so this file's job is to
 * know the rules exactly, not to be fast in a tree. Where the two pull in
 * different directions it chooses the rules.
 *
 * Two modules here already know most of Go. margo (src/games/margo) is Go on a
 * stacked 3D board and its own rules page says so - "un groupe de boules doit
 * toujours avoir au moins une position libre adjacente... comme au Go, la règle
 * du Ko s'applique... le suicide n'est pas permis" - so groups, liberties,
 * capture, ko and the suicide ban are not new ground in this codebase, only new
 * on a flat board. reversi (src/games/reversi) supplies the other half: a pass
 * move, a passes counter, and a game that ends on two passes and is then
 * decided by counting.
 *
 * What neither supplies is the counting itself, which is where Go is genuinely
 * harder than either.
 *
 * RULES IMPLEMENTED: Chinese, area scoring, positional superko.
 *
 * That choice is not a detail. Under Japanese territory scoring the players
 * have to agree which stones are dead before the board can be counted, and
 * Jocly has no notion of agreement outside a move. Under area scoring, once
 * both sides pass, the score is a mechanical function of the position -
 * provided dead stones have actually been captured, which is what area rules
 * ask of the players and what engines do anyway. So two passes end the game and
 * the board is counted as it stands. A player who passes with dead stones still
 * on the board has resigned them, exactly as the rules say.
 */

(function() {

	var EMPTY = 0;
	var BLACK = 1;    // JocGame.PLAYER_A - Black moves first, as in Go
	var WHITE = -1;   // JocGame.PLAYER_B

	// Column letters skip I, the universal Go convention.
	var COLUMNS = "ABCDEFGHJKLMNOPQRSTUVWXYZ";

	/*
	 * The board size, kept here and set by InitGame.
	 *
	 * Notation cannot go through the game object, because the thing that most
	 * needs it has no reference to one: a Move. Jocly asks a Move for its own
	 * ToString - from getMoveString, on the core side of the iframe - and a
	 * Move carries only its own fields. The first version reached for
	 * Model.Game and read this.g.Coord off it, which is the bare prototype
	 * with no g at all: every move played threw "Cannot read properties of
	 * undefined (reading 'Coord')" and the turn was aborted.
	 *
	 * So the two conversions are plain functions over a module variable - the
	 * shape checkersbase-model.js uses for its own PosToString and
	 * invertNotation. One consequence, stated because nothing else says it:
	 * one loaded model serves one board size, which is how Jocly loads them
	 * (one script bundle per game).
	 */
	var SIZE = 0;

	function PosToString(pos) {
		if(pos < 0)
			return "pass";
		if(!SIZE)
			return "?";
		return COLUMNS[pos % SIZE] + (SIZE - Math.floor(pos / SIZE));
	}

	function StringToPos(text) {
		if(!text || /^pass$/i.test(text))
			return -1;
		var m = /^([A-Za-z])\s*(\d+)$/.exec(String(text).trim());
		if(!m || !SIZE) return null;
		var col = COLUMNS.indexOf(m[1].toUpperCase());
		var row = SIZE - parseInt(m[2]);
		if(col < 0 || col >= SIZE || row < 0 || row >= SIZE)
			return null;
		return row * SIZE + col;
	}

	Model.Game.InitGame = function() {
		var size = this.mOptions.size;
		var coord = [];   // coord[pos] = [row, col], row 0 = top
		var g = [];       // g[pos][dir] = neighbour pos, or null off the board
		for(var r = 0; r < size; r++)
			for(var c = 0; c < size; c++) {
				var pos = r * size + c;
				coord[pos] = [r, c];
				g[pos] = [
					c > 0 ? pos - 1 : null,
					c < size - 1 ? pos + 1 : null,
					r > 0 ? pos - size : null,
					r < size - 1 ? pos + size : null,
				];
			}
		this.g.Graph = g;
		this.g.Coord = coord;
		this.g.size = size;
		SIZE = size;
		this.g.points = size * size;
		// White's compensation for moving second, counted in the area score.
		// A half point makes draws impossible, which is why it is the norm.
		this.g.komi = this.mOptions.komi === undefined ? 7.5 : this.mOptions.komi;

		/*
		 * Zobrist keys for the position hash. Positional superko compares whole
		 * board positions, so the hash has to be over the stones alone - not
		 * the side to move, which is what situational superko would use.
		 */
		var mt = JocGame.LetsTwist(0x60);
		this.g.zobrist = [[], []];
		for(var pos = 0; pos < this.g.points; pos++) {
			this.g.zobrist[0][pos] = mt.genrand_int32();
			this.g.zobrist[1][pos] = mt.genrand_int32();
		}

		this.InitGameExtra();
	}

	Model.Game.InitGameExtra = function() {
	}

	// Both kept as game methods for callers that have a game to hand - the
	// view, the tests, an engine bridge - but neither needs one.
	Model.Game.CoordToString = function(pos) {
		return PosToString(pos);
	}

	Model.Game.StringToCoord = function(text) {
		return StringToPos(text);
	}

	/* ------------------------------------------------------------- moves */

	Model.Move.Init = function(args) {
		this.p = args.p === undefined ? -1 : args.p;   // -1 is a pass
		if(args.c !== undefined)
			this.c = args.c;                           // captured points, if any
	}

	Model.Move.CopyFrom = function(aMove) {
		this.p = aMove.p;
		if(aMove.c !== undefined)
			this.c = aMove.c.slice();
		else
			delete this.c;
	}

	Model.Move.Equals = function(move) {
		return this.p === move.p;
	}

	Model.Move.ToString = function() {
		return PosToString(this.p);
	}

	/* ------------------------------------------------------------- board */

	Model.Board.InitialPosition = function(aGame) {
		var points = aGame.g.points;
		this.board = new Array(points);
		for(var pos = 0; pos < points; pos++)
			this.board[pos] = EMPTY;
		this.passes = 0;                  // consecutive passes; two end the game
		this.prisoners = [0, 0];          // [black's captures, white's], index by SIDE01
		this.koPos = -1;                  // point forbidden by the simple ko rule
		this.hash = 0;                    // Zobrist hash of the stones
		/*
		 * Every position the game has been in, for positional superko. Shared by
		 * reference between boards and never mutated in place - ApplyMove
		 * replaces it with a longer one - so copying a board costs nothing here
		 * and no board can corrupt another's history.
		 */
		this.hist = [0];
		this.moveCount = 0;
		// The point last played, or -1. A Go board changes by one stone a turn
		// and the view marks it so the change is visible at a glance.
		this.lastPlayed = -1;
	}

	function SIDE01(side) {
		return (1 - side) / 2;             // 1 -> 0, -1 -> 1, as reversi indexes
	}

	Model.Board.CopyFrom = function(aBoard) {
		this.board = aBoard.board.slice();
		this.passes = aBoard.passes;
		this.prisoners = [aBoard.prisoners[0], aBoard.prisoners[1]];
		this.koPos = aBoard.koPos;
		this.hash = aBoard.hash;
		this.hist = aBoard.hist;           // shared: see InitialPosition
		this.moveCount = aBoard.moveCount;
		this.lastPlayed = aBoard.lastPlayed;
		this.mWho = aBoard.mWho;
	}

	// The stones alone, which is what positional superko compares. Overriding
	// this also keeps JocBoard's default off the hot path: it is
	// md5(JSON.stringify(board)), and stringifying a 361-point board on every
	// node would dominate everything else this file does.
	Model.Board.GetSignature = function() {
		return this.hash;
	}

	/*
	 * Walk the group at pos, collecting its stones and counting its liberties.
	 * Returns {stones, liberties}. The seen array is caller-supplied so a scan
	 * over the whole board can visit each stone once.
	 */
	function Group(aGame, board, pos, seen) {
		var graph = aGame.g.Graph;
		var side = board[pos];
		var stones = [pos], liberties = 0;
		var libSeen = {};
		seen[pos] = true;
		for(var i = 0; i < stones.length; i++) {
			var links = graph[stones[i]];
			for(var d = 0; d < 4; d++) {
				var n = links[d];
				if(n === null) continue;
				var at = board[n];
				if(at === EMPTY) {
					if(!libSeen[n]) { libSeen[n] = true; liberties++; }
				} else if(at === side && !seen[n]) {
					seen[n] = true;
					stones.push(n);
				}
			}
		}
		return { stones: stones, liberties: liberties };
	}

	/*
	 * One pass over the board yielding, for every stone, the id of its group and
	 * for every group its liberty count. Move legality then costs four lookups
	 * per empty point instead of a flood fill each - the difference between
	 * O(n) and O(n^2) per generation, which on 361 points is the difference
	 * between usable and not.
	 */
	function Scan(aGame, board) {
		var points = aGame.g.points;
		var groupOf = new Array(points), libs = [], stones = [];
		var seen = {};
		for(var pos = 0; pos < points; pos++)
			groupOf[pos] = -1;
		for(var pos = 0; pos < points; pos++) {
			if(board[pos] === EMPTY || seen[pos]) continue;
			var group = Group(aGame, board, pos, seen);
			var id = libs.length;
			libs.push(group.liberties);
			stones.push(group.stones);
			for(var i = 0; i < group.stones.length; i++)
				groupOf[group.stones[i]] = id;
		}
		return { groupOf: groupOf, libs: libs, stones: stones };
	}

	Model.Board.goScan = function(aGame) {
		return Scan(aGame, this.board);
	}

	/*
	 * Which stones a move at pos by side would capture, and whether the move is
	 * suicide. Called only for the few candidates that need it.
	 */
	function Resolve(aGame, board, scan, pos, side) {
		var graph = aGame.g.Graph;
		var links = graph[pos];
		var captured = [], capturedGroups = {};
		var ownLiberty = false, joinsLiving = false;
		for(var d = 0; d < 4; d++) {
			var n = links[d];
			if(n === null) continue;
			var at = board[n];
			if(at === EMPTY) { ownLiberty = true; continue; }
			var gid = scan.groupOf[n];
			if(at === -side) {
				if(scan.libs[gid] === 1 && !capturedGroups[gid]) {
					capturedGroups[gid] = true;
					captured = captured.concat(scan.stones[gid]);
				}
			} else if(scan.libs[gid] > 1)
				joinsLiving = true;
		}
		// The stone lives if it has a liberty of its own, joins a group that has
		// one to spare, or takes something off the board first.
		var suicide = !ownLiberty && !joinsLiving && captured.length === 0;
		return { captured: captured, suicide: suicide };
	}

	Model.Board.GenerateMoves = function(aGame) {
		this.mMoves = [];
		if(this.passes >= 2)
			return;                        // the game is over; Evaluate says who won

		var board = this.board, side = this.mWho;
		var scan = Scan(aGame, board);
		var points = aGame.g.points;

		for(var pos = 0; pos < points; pos++) {
			if(board[pos] !== EMPTY || pos === this.koPos)
				continue;
			var r = Resolve(aGame, board, scan, pos, side);
			if(r.suicide)
				continue;
			/*
			 * Positional superko, checked only where it can possibly apply.
			 *
			 * A move that captures nothing leaves strictly more stones on the
			 * board than before, so the position it makes cannot equal any
			 * earlier one - no check needed, and that is almost every move. Only
			 * capturing moves can return to a previous position, and there are
			 * rarely more than a handful in a position, so the exact rule costs
			 * almost nothing.
			 */
			if(r.captured.length > 0) {
				var h = this.hash ^ aGame.g.zobrist[SIDE01(side)][pos];
				for(var i = 0; i < r.captured.length; i++)
					h ^= aGame.g.zobrist[SIDE01(-side)][r.captured[i]];
				if(this.hist.indexOf(h) >= 0)
					continue;
			}
			this.mMoves.push(r.captured.length ? { p: pos, c: r.captured } : { p: pos });
		}
		// Passing is always legal, and is the only move once the board is full.
		this.mMoves.push({ p: -1 });
	}

	Model.Board.ApplyMove = function(aGame, move) {
		var side = this.mWho;
		this.moveCount++;
		this.lastPlayed = move.p;
		if(move.p < 0) {
			this.passes++;
			this.koPos = -1;
			// A pass changes no stone, so the position - and its hash - is
			// unchanged and nothing is appended to the history.
			return;
		}
		this.passes = 0;

		var captured = move.c;
		if(captured === undefined) {
			// A move replayed from a saved game or handed over by an engine
			// carries no capture list; work it out.
			captured = Resolve(aGame, this.board, Scan(aGame, this.board), move.p, side).captured;
		}

		this.board[move.p] = side;
		this.hash ^= aGame.g.zobrist[SIDE01(side)][move.p];
		for(var i = 0; i < captured.length; i++) {
			this.board[captured[i]] = EMPTY;
			this.hash ^= aGame.g.zobrist[SIDE01(-side)][captured[i]];
		}
		this.prisoners[SIDE01(side)] += captured.length;

		/*
		 * The simple ko point: only a move that captures exactly one stone and
		 * is itself a lone stone with one liberty can be immediately recaptured
		 * into the same position. Superko above would catch it anyway; naming it
		 * here is what lets the UI grey the point out rather than silently
		 * omitting the move.
		 */
		this.koPos = -1;
		if(captured.length === 1) {
			var group = Group(aGame, this.board, move.p, {});
			if(group.stones.length === 1 && group.liberties === 1)
				this.koPos = captured[0];
		}

		this.hist = this.hist.concat([this.hash]);
	}

	/* ----------------------------------------------------------- scoring */

	/*
	 * Chinese area score: a player's stones on the board, plus the empty points
	 * that only they reach. An empty region touching both colours is neutral
	 * (dame) and counts for nobody.
	 *
	 * Returns { black, white } with komi already added to white.
	 */
	Model.Board.goScore = function(aGame) {
		var board = this.board, graph = aGame.g.Graph, points = aGame.g.points;
		var area = [0, 0];
		var seen = {};
		for(var pos = 0; pos < points; pos++) {
			if(board[pos] !== EMPTY) {
				area[SIDE01(board[pos])]++;
				continue;
			}
			if(seen[pos]) continue;
			// flood the empty region, noting which colours border it
			var region = [pos], touchesBlack = false, touchesWhite = false;
			seen[pos] = true;
			for(var i = 0; i < region.length; i++) {
				var links = graph[region[i]];
				for(var d = 0; d < 4; d++) {
					var n = links[d];
					if(n === null) continue;
					var at = board[n];
					if(at === EMPTY) {
						if(!seen[n]) { seen[n] = true; region.push(n); }
					} else if(at === BLACK) touchesBlack = true;
					else touchesWhite = true;
				}
			}
			if(touchesBlack && !touchesWhite) area[SIDE01(BLACK)] += region.length;
			else if(touchesWhite && !touchesBlack) area[SIDE01(WHITE)] += region.length;
			// bordered by both, or by neither on an empty board: neutral
		}
		return {
			black: area[SIDE01(BLACK)],
			white: area[SIDE01(WHITE)] + aGame.g.komi,
		};
	}

	Model.Board.Evaluate = function(aGame, aFinishOnly, aTopLevel) {
		if(this.passes >= 2) {
			var score = this.goScore(aGame);
			this.mFinished = true;
			if(score.black > score.white) this.mWinner = JocGame.PLAYER_A;
			else if(score.white > score.black) this.mWinner = JocGame.PLAYER_B;
			else this.mWinner = JocGame.DRAW;   // only reachable with integer komi
			this.mEvaluation = 0;
			return;
		}
		/*
		 * A running score for the native AIs. It is area counting on a position
		 * nobody has resolved yet, so it is a poor estimate mid-game - live
		 * groups with two eyes are indistinguishable from dead ones here. Good
		 * enough to prefer capturing to not, and no more; the engine levels are
		 * what this game is for.
		 */
		var score = this.goScore(aGame);
		this.mEvaluation = score.black - score.white;
	}

	/*
	 * The position, as the sequence of moves that made it, for an engine.
	 *
	 * This is the contract jocly.kata.js asks of a game module. kataeval takes
	 * a position as its move list and replays it itself, which is also how it
	 * sees the captures, the ko and the network's recent-move inputs - so
	 * unlike Fairy-Stockfish or Scan there is no board notation to export and
	 * none to get wrong.
	 *
	 * loc is the point index and col is 1 black / 2 white. Whether KataGo
	 * counts rows from the top or the bottom is not settled here and does not
	 * need to be: the two conventions differ by a reflection of the board, the
	 * same reflection applies to the position going in and to the move coming
	 * back, and a reflection is a symmetry of Go. It would matter for an
	 * ownership map or a board read back out of kgeEvalSeq; neither is used.
	 */
	Model.Board.goExportMoves = function(aGame) {
		var moves = [];
		(aGame.mPlayedMoves || []).forEach(function(played, i) {
			// mPlayedMoves alternates from Black, who moves first in Go as in
			// Jocly - PLAYER_A. A pass is -1 on both sides.
			moves.push({
				loc: played.p === undefined ? -1 : played.p,
				col: (i % 2) === 0 ? 1 : 2,
			});
		});
		return {
			moves: moves,
			toPlay: this.mWho === BLACK ? 1 : 2,
			komi: aGame.g.komi,
			boardSize: aGame.g.size,
		};
	}

	// Passing when the board still has moves in it is legal but rarely meant, so
	// the native AI is not allowed to end the game by accident - it may pass
	// only when it has nothing else.
	Model.Board.StaticGenerateMoves = function(aGame) {
		return null;
	}

})();
