/*
	Janggi (장기) - Korean chess, 9x10 board, pieces on the intersections.

	Same board geometry and (almost) the same initial squares as Xiangqi, so
	famous/xiangqi-model.js is the natural starting point. What differs:

	  - no river: the Elephant and the Soldier are free everywhere, and the
	    Soldier never promotes (there is no promotion at all in Janggi);
	  - the General starts in the CENTRE of the palace (e2/e9), not on the
	    back rank;
	  - the Elephant makes one orthogonal step then TWO outward diagonal
	    steps (a Zebra move), and can be blocked on either intermediate
	    point;
	  - the Cannon needs a screen to MOVE, not only to capture, and may
	    neither jump over nor capture another Cannon;
	  - the Soldier moves one step forward or sideways from the start;
	  - every piece except the Horse and the Elephant may use the diagonal
	    lines of a palace, i.e. the corner<->centre steps. Concretely:
	      General/Guard : one step, any palace line
	      Chariot       : 1 or 2 steps along a palace diagonal
	      Cannon        : corner -> opposite corner, hopping the centre
	      Soldier       : corner <-> centre, forward only
	  - the Generals facing each other on an open file ("bikjang") is legal
	    and amounts to a draw offer: if the opponent does not break it, the
	    game is drawn. See cbJanggiBikjang below - the Xiangqi treatment
	    (facing simply forbidden, the KBA tournament rule) is the other
	    setting of the same switch.
	  - a player with no legal move passes instead of being stalemated.

	Two mechanisms of base-model.js are used here and nowhere else:
	FLAG_SCREEN_MOVE (hop required to move) and `ranking` on a non-`flying`
	piece type (a hopper that can neither jump over nor capture a piece of
	its own rank - here, cannon over cannon).
*/

(function() {

	var geometry = Model.Game.cbBoardGeometryGrid(9,10);
	var c = Model.Game.cbConstants;
	var TA = Model.Game.cbTypedArray;

	// ---- palace description ------------------------------------------------
	// PALACE[pos] = side owning the palace that pos belongs to (undefined
	// outside). The diagonal LINES of a palace only join its corners to its
	// centre: the middle-of-edge squares carry no diagonal at all.
	var PALACE = {};
	var CENTER = { '1': geometry.POS(4,1), '-1': geometry.POS(4,8) }; // e2 / e9
	var CORNERS = {
		'1': [geometry.POS(3,0),geometry.POS(5,0),geometry.POS(3,2),geometry.POS(5,2)],
		'-1': [geometry.POS(3,7),geometry.POS(5,7),geometry.POS(3,9),geometry.POS(5,9)],
	};
	[1,-1].forEach(function(side) {
		var r0 = side>0 ? 0 : 7;
		for(var r=r0;r<r0+3;r++)
			for(var col=3;col<=5;col++)
				PALACE[geometry.POS(col,r)] = side;
	});

	function PalaceDiagNeighbors(pos) { // squares reachable from pos by ONE palace diagonal step
		var side = PALACE[pos];
		if(side===undefined) return [];
		if(pos==CENTER[side]) return CORNERS[side];
		if(CORNERS[side].indexOf(pos)>=0) return [CENTER[side]];
		return [];
	}
	function PalaceOpposite(corner) { // other end of the diagonal running through the centre
		var side = PALACE[corner], ctr = CENTER[side];
		return geometry.POS(2*geometry.C(ctr)-geometry.C(corner),
		                    2*geometry.R(ctr)-geometry.R(corner));
	}

	// ---- piece graphs ------------------------------------------------------

	/*
		General and Guard: one step along any line of the palace, i.e. any
		orthogonal step that stays inside, plus the corner<->centre diagonals.

		`flyingGeneral` adds the Xiangqi ray: an unobstructed file to the
		other palace lets a General "capture" the enemy General, which is what
		makes facing Generals illegal. It is only built for the "forbidden"
		reading of bikjang; under the traditional rule the two Generals do not
		attack each other at all, facing is a legal draw offer, and General
		and Guard end up with exactly the same graph.
	*/
	function PalaceStepGraph(flyingGeneral) {
		var graph={};
		for(var pos=0;pos<geometry.boardSize;pos++) {
			graph[pos]=[];
			var side=PALACE[pos];
			if(side===undefined) continue;
			[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(delta) {
				var pos1=geometry.Graph(pos,delta);
				if(pos1!=null && PALACE[pos1]===side)
					graph[pos].push(TA([pos1 | c.FLAG_MOVE | c.FLAG_CAPTURE]));
			});
			PalaceDiagNeighbors(pos).forEach(function(pos1) {
				graph[pos].push(TA([pos1 | c.FLAG_MOVE | c.FLAG_CAPTURE]));
			});
			if(flyingGeneral)
				[[0,1],[0,-1]].forEach(function(delta) {
					var direction=[], pos1=geometry.Graph(pos,delta);
					while(pos1!=null) {
						direction.push(PALACE[pos1]!==undefined
							? (pos1 | c.FLAG_CAPTURE | c.FLAG_CAPTURE_KING)
							: (pos1 | c.FLAG_STOP));
						pos1=geometry.Graph(pos1,delta);
					}
					if(direction.length>0)
						graph[pos].push(TA(direction));
				});
		}
		return graph;
	}

	/*
		Chariot: Rook, plus the palace diagonals - from a corner it may go to
		the centre or, if the centre is empty, on to the opposite corner; from
		the centre it may go to any corner.
	*/
	function ChariotGraph() {
		var extra={};
		for(var pos=0;pos<geometry.boardSize;pos++) {
			extra[pos]=[];
			var side=PALACE[pos];
			if(side===undefined) continue;
			if(pos==CENTER[side])
				CORNERS[side].forEach(function(corner) {
					extra[pos].push(TA([corner | c.FLAG_MOVE | c.FLAG_CAPTURE]));
				});
			else if(CORNERS[side].indexOf(pos)>=0)
				extra[pos].push(TA([
					CENTER[side] | c.FLAG_MOVE | c.FLAG_CAPTURE,
					PalaceOpposite(pos) | c.FLAG_MOVE | c.FLAG_CAPTURE,
				]));
		}
		return Model.Game.cbMergeGraphs(geometry,Model.Game.cbRookGraph(geometry),extra);
	}

	/*
		Cannon: hops on every line of the board, screen mandatory for the move
		as well as for the capture (FLAG_SCREEN_MOVE instead of FLAG_MOVE).
		On a palace diagonal only corner -> opposite corner is possible, the
		screen then being whatever stands on the centre.
	*/
	function CannonGraph() {
		var orth=Model.Game.cbSymmetricGraph(geometry,[c.FLAG_SCREEN_MOVE | c.FLAG_SCREEN_CAPTURE,-10]);
		var extra={};
		for(var pos=0;pos<geometry.boardSize;pos++) {
			extra[pos]=[];
			var side=PALACE[pos];
			if(side===undefined || CORNERS[side].indexOf(pos)<0) continue;
			extra[pos].push(TA([
				CENTER[side] | c.FLAG_SCREEN_CAPTURE, // screen only: nothing to capture there yet
				PalaceOpposite(pos) | c.FLAG_SCREEN_MOVE | c.FLAG_SCREEN_CAPTURE,
			]));
		}
		return Model.Game.cbMergeGraphs(geometry,orth,extra);
	}

	/*
		Elephant: one orthogonal step, then two diagonal steps outward, both
		intermediate squares having to be empty. Reaches the 8 Zebra squares
		(2,3)/(3,2), anywhere on the board - no river, no confinement.
	*/
	function ElephantGraph() {
		var graph={};
		for(var pos=0;pos<geometry.boardSize;pos++) {
			graph[pos]=[];
			[[0,1],[0,-1],[1,0],[-1,0]].forEach(function(delta) {
				var pos1=geometry.Graph(pos,delta);
				if(pos1==null) return;
				var diagonals = delta[0]==0
					? [[1,delta[1]],[-1,delta[1]]]   // keep going away from the start
					: [[delta[0],1],[delta[0],-1]];
				diagonals.forEach(function(diag) {
					var pos2=geometry.Graph(pos1,diag);
					if(pos2==null) return;
					var pos3=geometry.Graph(pos2,diag);
					if(pos3==null) return;
					graph[pos].push(TA([
						pos1 | c.FLAG_STOP,
						pos2 | c.FLAG_STOP,
						pos3 | c.FLAG_MOVE | c.FLAG_CAPTURE,
					]));
				});
			});
		}
		return graph;
	}

	/*
		Soldier: one step forward or sideways (never backwards), plus the
		palace diagonals - but only those that bring it closer to the enemy
		back rank.
	*/
	function SoldierGraph(side) {
		var graph={};
		for(var pos=0;pos<geometry.boardSize;pos++) {
			graph[pos]=[];
			[[0,side],[1,0],[-1,0]].forEach(function(delta) {
				var pos1=geometry.Graph(pos,delta);
				if(pos1!=null)
					graph[pos].push(TA([pos1 | c.FLAG_MOVE | c.FLAG_CAPTURE]));
			});
			PalaceDiagNeighbors(pos).forEach(function(pos1) {
				if((geometry.R(pos1)-geometry.R(pos))*side>0)
					graph[pos].push(TA([pos1 | c.FLAG_MOVE | c.FLAG_CAPTURE]));
			});
		}
		return graph;
	}

	// ---- game parameters ---------------------------------------------------

	/*
		Bikjang (빅장), the facing Generals.

		"draw"      - the traditional rule, and the default: a General may be
		              moved onto the open file of the other. That is a draw
		              offer; if the opponent breaks the alignment - moving his
		              General away or interposing a piece - play goes on,
		              otherwise the game is drawn. This is what
		              Fairy-Stockfish calls janggitraditional (bikjangRule on,
		              no material counting).
		"forbidden" - the KBA tournament rule, and the Xiangqi treatment: the
		              Generals may never face each other. Costs nothing to run
		              (it is the flying-general ray of the General's graph)
		              but is not what any Fairy-Stockfish Janggi variant does.

		The sources differ on one point this does not model: Murray, Gollon
		and Pritchard all state that only the player who is BEHIND IN MATERIAL
		may offer bikjang. Fairy-Stockfish ignores it too. Whoever offers it,
		the offer costs the game at most half a point, so the practical
		difference is small.
	*/
	Model.Game.cbJanggiBikjang = "draw";

	function Facing(board) { // Generals on the same file, nothing in between
		var k1=board.kings[1], k2=board.kings[-1];
		if(k1===undefined || k2===undefined) return false;
		if(geometry.C(k1)!=geometry.C(k2)) return false;
		var step=(k1<k2 ? geometry.width : -geometry.width);
		for(var pos=k1+step; pos!=k2; pos+=step)
			if(board.board[pos]>=0) return false;
		return true;
	}

	// A player with no legal move is not stalemated: he passes (한수 쉼) and
	// the game goes on. Kept as a game option because the sources disagree on
	// whether one may pass at ANY time (Pritchard, Zillions) or only when
	// nothing can move (Korean Wikipedia) - the latter is implemented, as it
	// is the only one that cannot be abused by the AI.
	Model.Game.cbJanggiPass = true;
	Model.Game.cbOnStaleMate = 0; // unreachable when cbJanggiPass is on

	// Standard Janggi piece values, also used as the material count that
	// settles a drawn game (Han gets 1.5 points for moving second).
	var VALUE = { chariot:13, cannon:7, horse:5, elephant:3, guard:3, soldier:2 };

	// Setup choice (마상 배치): each player may swap his Horse and Elephant on
	// either wing before the game, Han choosing first. Needs prelude-model.js
	// and prelude-view.js in the game's script lists - leave false until the
	// view side is wired.
	var SETUP_CHOICE = false;

	Model.Game.cbPerpEval = function(board, aGame) { // perpetual check, as in Xiangqi
		var result, loop = aGame.GetRepeatOccurence(board, 1) >> 1;
		if(board.oppoCheck >= loop)
			result = (board.check >= loop ? JocGame.DRAW : -board.mWho);
		else
			result = (board.check >= loop ? board.mWho : JocGame.DRAW);
		return result;
	}

	Model.Game.cbDefine = function() {

		var cbVar = {

			geometry: geometry,

			pieceTypes: {

				// Soldiers first: base-model derives cbPawnTypes from the
				// leading run of types sharing the first abbrev.
				0: {
					name: 'soldier-w',
					aspect: 'jg-soldier',
					graph: SoldierGraph(1),
					abbrev: '',
					fenAbbrev: 'P',
					value: VALUE.soldier,
					initial: [{s:1,p:27},{s:1,p:29},{s:1,p:31},{s:1,p:33},{s:1,p:35}],
				},

				1: {
					name: 'soldier-b',
					aspect: 'jg-soldier',
					graph: SoldierGraph(-1),
					abbrev: '',
					fenAbbrev: 'P',
					value: VALUE.soldier,
					initial: [{s:-1,p:54},{s:-1,p:56},{s:-1,p:58},{s:-1,p:60},{s:-1,p:62}],
				},

				2: {
					name: 'cannon',
					aspect: 'jg-cannon',
					graph: CannonGraph(),
					abbrev: 'C',
					value: VALUE.cannon,
					// blocking power: a Cannon may neither jump over nor
					// capture a piece of rank >= its own, i.e. another Cannon.
					// NOT `flying`: it stops after its single screen.
					ranking: 1,
					initial: [{s:1,p:19},{s:1,p:25},{s:-1,p:64},{s:-1,p:70}],
				},

				3: {
					name: 'chariot',
					aspect: 'jg-chariot',
					graph: ChariotGraph(),
					abbrev: 'R',
					value: VALUE.chariot,
					initial: [{s:1,p:0},{s:1,p:8},{s:-1,p:81},{s:-1,p:89}],
				},

				4: {
					name: 'horse',
					aspect: 'jg-horse',
					graph: Model.Game.cbHorseGraph(geometry), // identical to Xiangqi
					abbrev: 'H',
					value: VALUE.horse,
					initial: [{s:1,p:1},{s:1,p:7},{s:-1,p:82},{s:-1,p:88}],
				},

				5: {
					name: 'elephant',
					aspect: 'jg-elephant',
					graph: ElephantGraph(), // same graph for both sides: no river
					abbrev: 'E',
					value: VALUE.elephant,
					initial: [{s:1,p:2},{s:1,p:6},{s:-1,p:83},{s:-1,p:87}],
				},

				6: {
					name: 'guard',
					aspect: 'jg-guard',
					graph: PalaceStepGraph(false),
					abbrev: 'A',
					value: VALUE.guard,
					initial: [{s:1,p:3},{s:1,p:5},{s:-1,p:84},{s:-1,p:86}],
				},

				7: {
					name: 'general',
					aspect: 'jg-general',
					isKing: true,
					graph: PalaceStepGraph(this.cbJanggiBikjang=="forbidden"),
					abbrev: 'K',
					initial: [{s:1,p:13},{s:-1,p:76}], // centre of the palace
				},

			},

			// no promotion in Janggi: `promote` is deliberately left out
		};

		if(SETUP_CHOICE)
			// 4 arrangements per side, Han (-1) choosing first. Stages 0 and 3
			// are empty (falsy) so that the turn machinery hands stage 1 to
			// Han and stage 2 to Cho, and still leaves the first real move to
			// Cho.
			cbVar.prelude = [
				0,
				{ panelWidth: 2, setups: ["HE/EH","HE/HE","EH/EH","EH/HE"],
				  squares: { '1':[], '-1':[82,83,87,88] } },
				{ panelWidth: 2, setups: ["HE/EH","HE/HE","EH/EH","EH/HE"],
				  squares: { '1':[1,2,6,7], '-1':[] } },
				0,
			];

		return cbVar;
	}

	/*
		Bikjang is a property of a POSITION, but the draw needs two: the one
		where the offer was made, and the one after the answer. `bikjang`
		holds the current position's state and `bikjangPrev` the one before,
		which is all the two-ply window the rule needs.

		Both have to travel with the board - CopyFrom is what the search uses
		to build every node - and both belong in the signature, or two
		positions identical on the board but one move apart in the offer
		would share a transposition entry.
	*/
	var SuperInitialPosition = Model.Board.InitialPosition;
	Model.Board.InitialPosition = function(aGame) {
		SuperInitialPosition.apply(this,arguments);
		this.bikjang = this.bikjangPrev = false;
	}

	var SuperCopyFrom = Model.Board.CopyFrom;
	Model.Board.CopyFrom = function(aBoard) {
		SuperCopyFrom.apply(this,arguments);
		this.bikjang = aBoard.bikjang;
		this.bikjangPrev = aBoard.bikjangPrev;
	}

	var SuperApplyMove = Model.Board.ApplyMove;
	Model.Board.ApplyMove = function(aGame,move) {
		var was = this.bikjang;
		SuperApplyMove.apply(this,arguments);
		this.bikjangPrev = was;
		this.bikjang = (aGame.cbJanggiBikjang=="draw") && Facing(this);
	}

	var SuperGetSignature = Model.Board.GetSignature;
	Model.Board.GetSignature = function() {
		return SuperGetSignature.apply(this,arguments)
			^ (this.bikjang ? 0x5bd1 : 0) ^ (this.bikjangPrev ? 0x2e07 : 0);
	}

	/*
		Passing. A player who cannot move is not stalemated in Janggi, he
		hands the turn over. The null move {f:p,t:p} goes through ApplyMove
		and cbQuickApply untouched: board[f] is cleared then rewritten with
		the same piece, and the two bKey() updates cancel out, so only the
		side-to-move key changes - exactly what a pass should do.
	*/
	var SuperGenerateMoves = Model.Board.GenerateMoves;
	Model.Board.GenerateMoves = function(aGame) {
		// The offer was made on the previous ply and the answer left the
		// Generals facing: drawn, whatever either side can still play.
		if(this.bikjang && this.bikjangPrev) {
			this.mMoves = [];
			this.mFinished = true;
			this.mWinner = JocGame.DRAW;
			return;
		}
		SuperGenerateMoves.apply(this,arguments);
		if(aGame.cbJanggiPass && this.mMoves.length==0) {
			// NOT this.check: that counter is fed by the previous ApplyMove and
			// is still 0 on a position loaded from FEN/PJN, which would turn a
			// mate into a pass. Ask the threat graph instead - this only runs
			// on the handful of positions that have no move at all.
			var pos=this.kings[this.mWho];
			if(this.cbGetAttackers(aGame,pos,this.mWho,100).length==0) {
				this.mMoves.push({ f:pos, t:pos, c:null, a:'K', ck:false, pass:true });
				this.mFinished=false;
				this.mWinner=null;
			}
		}
	}

	/*
		Move notation. The default base-model implementation already produces
		"Ha1-c3" / "a1c3" on geometry.PosName, which is both readable and the
		form fairy-stockfish expects for a 9x10 board, so only the pass needs
		a special case.
	*/
	var SuperMoveToString = Model.Move.ToString;
	Model.Move.ToString = function(format) {
		if(this.pass)
			return (format=="engine" || format=="engine960") ? "0000" : "--";
		return SuperMoveToString.apply(this,arguments);
	}

})();
