
(function() {

	var cbVar, gameState;

	var MASK = 0xffff;   // unreachable position
	var FLAG_MOVE = 0x10000; // move to if target pos empty
	var FLAG_CAPTURE = 0x20000; // capture if occupied by enemy
	var FLAG_STOP = 0x40000; // stop if occupied
	var FLAG_SCREEN_CAPTURE = 0x80000; // capture if occupied by and a piece has been jumped in the path (like cannon in xiangqi) 
	var FLAG_CAPTURE_KING = 0x100000; // capture if occupied by enemy king
	var FLAG_CAPTURE_NO_KING = 0x200000; // capture if not occupied by enemy king
	var FLAG_SPECIAL = 0x400000; // non-captures to go on special move stack
	var FLAG_CAPTURE_SELF = 0x800000; // special move to square occupied by friend
	var FLAG_SPECIAL_CAPTURE = 0x2000000; // special move to square occupied by foe
	var FLAG_THREAT = 0x1000000; // forces inclusion in threat graph
	Model.Game.cbConstants = {
		MASK: MASK,
		FLAG_MOVE: FLAG_MOVE,
		FLAG_CAPTURE: FLAG_CAPTURE,
		FLAG_STOP: FLAG_STOP,
		FLAG_SCREEN_CAPTURE: FLAG_SCREEN_CAPTURE,
		FLAG_CAPTURE_KING: FLAG_CAPTURE_KING,
		FLAG_CAPTURE_NO_KING: FLAG_CAPTURE_NO_KING,
		FLAG_SPECIAL: FLAG_SPECIAL,
		FLAG_CAPTURE_SELF: FLAG_CAPTURE_SELF,
		FLAG_SPECIAL_CAPTURE: FLAG_SPECIAL_CAPTURE,
		FLAG_THREAT: FLAG_THREAT,
	}
	var USE_TYPED_ARRAYS = typeof Int32Array != "undefined";
	
	Model.Game.cbUseTypedArrays = USE_TYPED_ARRAYS; 

	Model.Game.cbTypedArray = function(array) {
		if(USE_TYPED_ARRAYS) {
			var tArray=new Int32Array(array.length);
			tArray.set(array);
			return tArray;
		} else {
			var arr=[];
			var arrLength=array.length;
			for(var i=0;i<arrLength;i++)
				arr.push(array[i]);
			return arr;
		}
	}

	Model.Game.cbShortRangeGraph = function(geometry,deltas,confine,flags) {
		var $this=this;
		if(flags===undefined)
			flags = FLAG_MOVE | FLAG_CAPTURE;
		var graph={};
		for(var pos=0;pos<geometry.boardSize;pos++) {
			graph[pos]=[];
			if(confine && !(pos in confine))
				continue;
			deltas.forEach(function(delta) {
				var pos1=geometry.Graph(pos,delta);
				if(pos1!=null) {
					var f=flags;
					if(confine) {
						if(!(pos1 in confine)) return;
						if(confine[pos1] == 'b') f &= ~(FLAG_MOVE|FLAG_SPECIAL);
					}
					if(!flags || f) graph[pos].push($this.cbTypedArray([pos1 | f]));
				}
			});
		}
		return graph;
	}
	
	Model.Game.cbLongRangeGraph = function(geometry,deltas,confine,flags,maxDist) {
		var $this=this;
		if(flags===undefined || flags==null)
			flags=FLAG_MOVE | FLAG_CAPTURE;
		if(!maxDist)
			maxDist=Infinity;
		var graph={};
		for(var pos=0;pos<geometry.boardSize;pos++) {
			graph[pos]=[];
			if(confine && !(pos in confine))
				continue;
			deltas.forEach(function(delta) {
				var direction=[];
				var pos1=geometry.Graph(pos,delta);
				var dist=0;
				while(pos1!=null) {
					var brouhaha=0;
					if(confine) {
						if(!(pos1 in confine)) break;
						if(confine[pos1]=='b') brouhaha=FLAG_MOVE|FLAG_SPECIAL;
					}
					if(!flags || flags & ~brouhaha) direction.push(pos1 | flags & ~brouhaha);
					if(brouhaha || ++dist==maxDist)
						break;
					pos1=geometry.Graph(pos1,delta);
				}
				if(direction.length>0)
					graph[pos].push($this.cbTypedArray(direction));
			});
		}
		return graph;
	}
	
	Model.Game.cbNullGraph = function(geometry) {
		var graph={};
		for(var pos=0;pos<geometry.boardSize;pos++)
			graph[pos]=[];
		return graph;
	}
	
	Model.Game.cbAuthorGraph = function(geometry) {
		var graph={};
		for(var pos=0;pos<geometry.boardSize;pos++) {
			graph[pos]=[];
			for(var pos1=0;pos1<geometry.boardSize;pos1++)
				graph[pos].push([pos1|FLAG_MOVE|FLAG_CAPTURE|FLAG_CAPTURE_NO_KING])
		}
		return graph;
	}
	
	Model.Game.cbMergeGraphs = function(geometry) {
		var graph = [];
		for(var pos=0;pos<geometry.boardSize;pos++) {
			graph[pos] = [];
			for(var i=1;i<arguments.length;i++)
				graph[pos] = graph[pos].concat(arguments[i][pos]);
		}
		return graph;
	}

	Model.Game.cbGetThreatGraph = function() {
		var $this=this;
		
		this.cbUseScreenCapture=false;
		this.cbUseCaptureKing=false;
		this.cbUseCaptureNoKing=false;
		var threatGraph={
			'1': [],
			'-1': [],
		};

		var lines=[];
		for(var pos=0;pos<this.g.boardSize;pos++) {
			this.g.pTypes.forEach(function(pType,typeName) {
				pType.graph[pos].forEach(function(line1) {
					var line=[];
					for(var i=0;i<line1.length;i++) {
						var tg1=line1[i];
						// ONE item per square of the line, even when the square is
						// both a normal capture and a screen capture (which is the
						// case for the jumping generals of Tenjiku Shogi and the
						// jumpers of Minjiku Shogi, whose flags are
						// FLAG_CAPTURE|FLAG_SCREEN_CAPTURE). Emitting two items
						// used to put the square twice in the path, and to make the
						// screen-capture path start on the attacked square itself -
						// so the attacked piece counted as the first screen. For a
						// King with a ranking (Tenjiku gives royalty the highest
						// rank so that nothing jumps over it) that hid every
						// screen-capture check: a Vice General could capture a King
						// over any number of pieces without the King ever being
						// reported as attacked.
						var item={d:tg1 & MASK,a:pos}, threat=false;
						if(tg1 & FLAG_CAPTURE_KING) {
							$this.cbUseCaptureKing=true;
							item.tk=typeName;
							threat=true;
						} else if(tg1 & FLAG_CAPTURE_NO_KING) {
							$this.cbUseCaptureNoKing=true;
							item.tnk=typeName;
							threat=true;
						} else if(tg1 & (FLAG_CAPTURE | FLAG_THREAT)) {
							item.t=typeName;
							threat=true;
						} else if(tg1 & FLAG_STOP)
							threat=true;
						if(tg1 & FLAG_SCREEN_CAPTURE) {
							$this.cbUseScreenCapture=true;
							if(pType.ranking > $this.cbMaxScreenRanking)
								$this.cbMaxScreenRanking = pType.ranking;
							item.ts=typeName;
							threat=true;
						}
						if(threat)
							line.unshift(item);
					}
					if(line.length>0)
						lines.push(line);
				});
			});
		}

		var allAttackers={};

		lines.forEach(function(line) {
			line.forEach(function(lineItem,lineIndex) {
				var attackers=allAttackers[lineItem.d];
				if(attackers===undefined) {
					attackers={};
					allAttackers[lineItem.d]=attackers;
				}
				var poss=[];
				for(var i=lineIndex+1;i<line.length;i++)
					poss.push(line[i].d);
				poss.push(lineItem.a);
				var key=poss.join(",");
				var att0=attackers[key];
				if(att0===undefined) {
					att0={
						p: poss,
						t: {},
						ts: {},
						tk: {},
					}
					attackers[key]=att0;
				}
				// an item can now carry both a capture and a screen capture
				if(lineItem.t!==undefined)
					att0.t[lineItem.t]=true;
				if(lineItem.tk!==undefined)
					att0.tk[lineItem.tk]=true;
				if(lineItem.ts!==undefined)
					att0.ts[lineItem.ts]=true;
			});
		});
		
		for(var pos=0;pos<$this.g.boardSize;pos++) {
			var attackers=allAttackers[pos];
			
			function Compact(tree,base) {
				for(var i in attackers) {
					var attacker=attackers[i];
					if(attacker.p.length<base.length+1)
						continue;
					var candidate=true;
					for(var j=0;j<base.length;j++)
						if(base[j]!=attacker.p[j]) {
							candidate=false;
							break;
						}
					if(!candidate)
						continue;
					var nextPos=attacker.p[base.length];
					var nextBranch=tree[nextPos];
					if(nextBranch===undefined) {
						nextBranch={e:{}};
						tree[nextPos]=nextBranch;
					}
					if(attacker.p.length==base.length+1) {
						nextBranch.t=attacker.t;
						nextBranch.ts=attacker.ts;
						nextBranch.tk=attacker.tk;
						delete attackers[i];
					}
					//Compact(nextBranch.e,base.concat([nextPos]));
					base.push(nextPos);
					Compact(nextBranch.e,base);
					base.pop();
				}
			}
			var tree={};
			Compact(tree,[]);

			// Flag the branches that hold a screen capture, or lead to one.
			// Walking past an occupied square is only ever useful to find a
			// piece that captures through a screen, and those are a handful of
			// types: without this flag the collector walked the whole tree of
			// every piece type behind every piece, which on a large board with
			// ranked jumpers (Tenjiku Shogi) was by far the most expensive
			// thing in the search.
			function MarkScreens(branches) {
				var any=false;
				for(var pos1 in branches) {
					var branch=branches[pos1];
					branch.hs=MarkScreens(branch.e) || branch.ts!==undefined;
					if(branch.hs)
						any=true;
				}
				return any;
			}
			MarkScreens(tree);

			// Walking this tree is what the legality test spends its time in, and
			// `for(var pos1 in graph)` over an object is by far the slowest way to
			// do it. Flatten every level, once, into a plain array of
			// [square, branch, square, branch, ...]: `l` holds every child, `h`
			// only the ones that can lead to a screen capture, which is all the
			// walk needs once it is behind a piece.
			function Flatten(branches) {
				var all=[], screens=[];
				for(var pos1 in branches) {
					var branch=branches[pos1];
					Flatten(branch.e);
					all.push(pos1|0,branch);
					if(branch.hs)
						screens.push(pos1|0,branch);
				}
				branches.l=all;
				branches.h=screens;
				return all;
			}
			Flatten(tree);
			
			threatGraph[1][pos]=tree;
			threatGraph[-1][pos]=tree;
		}

		return threatGraph;
	}

	var boardKeys=[], typeKeys=[];

	function ZobristInit(t, pTypes, size) { // home-brewn hash scheme
		var mt = JocGame.LetsTwist(12345);
		for(var i=0; i<size; i++)
			boardKeys[i]=mt.genrand_int32()|1<<16;
		for(var i=0; i<pTypes.length; i++) {
			var k = pTypes[i];
			typeKeys[3*k-1]=mt.genrand_int32()|1;
			typeKeys[3*k+1]=mt.genrand_int32()|1;
		}
	}

	Model.Game.InitGame = function() {
		var $this=this;
		this.cbVar = cbVar = this.cbDefine();
		
		this.g.boardSize = this.cbVar.geometry.boardSize;

		this.g.pTypes = this.cbGetPieceTypes();
		this.g.threatGraph = this.cbGetThreatGraph();
		this.g.distGraph = this.cbVar.geometry.GetDistances();
		
		this.cbPiecesCount = 0;
		if(this.cbMaxRepeats === undefined) this.cbMaxRepeats = 3;
		if(this.cbPawnTypes === undefined) {
			var k, first; // assume Pawns are defined first
			for(k in this.g.pTypes) {
				var a = this.g.pTypes[k].abbrev;
				if(first === undefined) first = a;
				if(a != first) break;
			}
			this.cbPawnTypes=k;
		}
		// cbPawnTypes may also be given as an explicit list of types, for the
		// games where the Pawns are NOT declared first and the guess above
		// lands on whatever piece opens the list. Either form is normalised
		// here into a lookup used by the 50-move counter.
		this.cbPawnTypeSet = {};
		if(Array.isArray(this.cbPawnTypes))
			for(var pt=0;pt<this.cbPawnTypes.length;pt++)
				this.cbPawnTypeSet[this.cbPawnTypes[pt]]=true;
		else
			for(var pt=0;pt<this.cbPawnTypes;pt++)
				this.cbPawnTypeSet[pt]=true;
		this.g.castleablePiecesCount = { '1': 0, '-1': 0 };
		for(var i in cbVar.pieceTypes) {
			var pType=cbVar.pieceTypes[i];
			if(pType.castle) {
				var initial=pType.initial || [];
				initial.forEach(function(iniPiece) {
					$this.g.castleablePiecesCount[iniPiece.s]++;
				});
			}
			if(pType.initial)
				this.cbPiecesCount += pType.initial.length; 
		}

		if(typeof(this.extraInit) == 'function') this.extraInit(this.cbVar.geometry);

		var typeValues = Object.keys(cbVar.pieceTypes);

	    if(cbVar.zobrist == "old") {
		// Deprecated Zobrist initialization, kept for book probing
		var boardValues=[];
		for(var i=0;i<this.cbPiecesCount;i++) 
			boardValues.push(i);
		this.zobrist=new JocGame.Zobrist({
			board: {
				type: "array",
				size: this.cbVar.geometry.boardSize,
				values: boardValues,
			},
			who: {
				values: ["1","-1"],			
			},
			type: {
				type: "array",
				size: this.cbPiecesCount,
				values: typeValues
			}
		});

		// the following three can replace the active functions for backward compatibility
		this.bKey = function(piece) {
			return $this.zobrist.update(0,"board",piece.i,piece.p);
		}

		this.tKey = function(piece) {
			return $this.zobrist.update(0,"type",piece.t,piece.i);
		}

		this.wKey = function(h) {
			var w = $this.zobrist.update(0,"who",-1)
			if(h) w ^= $this.zobrist.update(0,"who",1);
			return w;
		}
	    } else {
		// three active update functions called by ApplyMove()
		this.bKey = function(piece) { // takes care of type and location dependence
			return typeKeys[3*piece.t+piece.s]*boardKeys[piece.p];
		}

		this.tKey= function(piece) { // dummy in new scheme
			return 0;
		}

		this.wKey= function() { // side-to-move key
			return 2;
		}

		ZobristInit(this, typeValues, this.cbVar.geometry.boardSize);
	    }

	}
	
	Model.Game.cbGetPieceTypes = function() {
		//var $this=this;
	
		var pTypes = [];
		
		var nullGraph = {};
		for(var pos=0;pos<this.cbVar.geometry.boardSize;pos++)
			nullGraph[pos]=[];

		this.cbMaxRanking = 0;
		// highest ranking among the pieces that can capture through a screen:
		// once the screens on a line beat that, no attacker can pass them, so
		// the (expensive) multi-screen walk can stop there. Royalty usually
		// carries the highest ranking of all - to forbid jumping over it - but
		// it never attacks through a screen, hence a separate maximum.
		this.cbMaxScreenRanking = 0;
		// Highest isKing "rank" in the variant. isKing:true counts as 1;
		// a variant with a second royal piece (a crown prince) uses
		// isKing:2, giving cbMaxRoyalRank 2 and turning on multi-royal
		// check/win handling in GenerateMoves. Single-king variants keep 1
		// and run the unchanged fast path.
		this.cbMaxRoyalRank = 1;

		for(var typeIndex in this.cbVar.pieceTypes) {
			var pType = this.cbVar.pieceTypes[typeIndex];
			var r = (pType.ranking ? pType.ranking : 0);
			if(r > this.cbMaxRanking) this.cbMaxRanking = r;
			if(pType.isKing) {
				var krank = (pType.isKing===true ? 1 : pType.isKing);
				if(krank > this.cbMaxRoyalRank) this.cbMaxRoyalRank = krank;
			}
			pTypes[typeIndex] = {
				graph: pType.graph || nullGraph,
				abbrev: pType.abbrev || '',
				value: pType.value || (pType.isKing ? 100 : 1),
				isKing: pType.isKing || false,
				castle: !!pType.castle,
				epTarget: !!pType.epTarget,
				epCatch: !!pType.epCatch,
				ranking: r,
				antiTrade: pType.antiTrade || 0,
			}
		}
		
		return pTypes;
	}

	Model.Board.Init = function(aGame) {
		this.zSign=0;
	}

	Model.Board.cbPlacePieces = function(aGame) {

		var $this=this;

		this.pieces.sort(function(p1,p2) {
			if(p1.s!=p2.s)
				return p2.s-p1.s;
			var v1=aGame.cbVar.pieceTypes[p1.t].value || 100;
			var v2=aGame.cbVar.pieceTypes[p2.t].value || 100;
			if(v1!=v2)
				return v1-v2;
			return p1.p-p2.p;
		});

		this.zSign=aGame.wKey(0);
		for(var pos=0;pos<aGame.g.boardSize;pos++)
			this.board[pos]=-1;
		this.pieces.forEach(function(piece,index) {
			piece.i=index;
			var pType0=aGame.g.pTypes[piece.t];
			// jumping power of the piece (see FLAG_SCREEN_CAPTURE below). Set
			// here rather than only where the initial setup is built, so that a
			// position loaded from FEN/PJN - whose pieces come from Import(),
			// which knows nothing about ranking - gets it too.
			piece.r=pType0.ranking;
			if(piece.p<0) return;
			$this.board[piece.p]=index;
			var pType=aGame.g.pTypes[piece.t];
			if(pType.isKing)
				$this.kings[piece.s*pType.isKing]=piece.p;
			$this.zSign^=aGame.bKey(piece) ^ aGame.tKey(piece);
		});
		
	}

	Model.Board.InitialPosition = function(aGame) {
		var $this=gameState=this;
		if(USE_TYPED_ARRAYS)
			this.board=new Int16Array(aGame.g.boardSize);
		else
			this.board=[];
		this.kings={};
		this.pieces=[];
		this.ending={
			'1': false,
			'-1': false,
		}
		this.lastMove={  // (invalid) dummy, to make sure it exists...
			f: -1,
			t: 0,
			c: null, // ... and is not mistaken for a capture
		};
		if(aGame.cbVar.castle)
			this.castled={
				'1': false,
				'-1': false,
			}

		this.noCaptCount = this.check = this.oppoCheck = 0;
		this.mWho = 1;

		if(aGame.mInitial) {
			this.mWho = aGame.mInitial.turn || 1;
			aGame.mInitial.pieces.forEach(function(piece) {
				var piece1={}
				for(var f in piece)
					if(piece.hasOwnProperty(f))
						piece1[f]=piece[f];
				$this.pieces.push(piece1);
			});
			if(aGame.mInitial.lastMove)
				this.lastMove={
					f: aGame.mInitial.lastMove.f,
					t: aGame.mInitial.lastMove.t,
					c: aGame.mInitial.lastMove.c,
				}
			if(aGame.mInitial.noCaptCount!==undefined)
				this.noCaptCount=aGame.mInitial.noCaptCount;
			// NOTE: this.castled[who] is a plain boolean meaning "this side
			// has already castled" (see cbApplyCastle/cbGeneratePseudoLegalMoves:
			// `!this.check && !this.castled[who]` gates castle move generation
			// entirely, with no K/Q-side granularity). It must stay false/true,
			// never an object: an object is always truthy, so setting it to
			// {k,q} here - even {k:false,q:false} - silently disabled castling
			// completely for any position loaded from FEN/PJN, regardless of
			// the FEN's castling availability field. Per-side (K/Q) castling
			// rights are already correctly derived from each king/rook's
			// "moved" flag (piece.m), itself computed by Model.Game.Import()
			// by comparing FEN piece positions against the variant's nominal
			// initial setup - so there is nothing useful to initialize here:
			// this.castled keeps its default "false" (set above in InitBoard)
			// for any position loaded from FEN, exactly like a fresh game.
		} else {
			for(var typeIndex in aGame.cbVar.pieceTypes) {
				var pType = aGame.cbVar.pieceTypes[typeIndex];
				var initial = pType.initial || [];
				for(var i=0;i<initial.length;i++) {
					var desc = initial[i];
					var piece = {
						s: desc.s,
						t: parseInt(typeIndex),
						p: desc.p,
						m: false,
						r: aGame.g.pTypes[typeIndex].ranking,
					}
					this.pieces.push(piece);
				}
			}
		}

		this.cbPlacePieces(aGame);
		
		//console.log("sign",this.zSign);
		
		if(aGame.mInitial && aGame.mInitial.enPassant) {
			var pos=cbVar.geometry.PosByName(aGame.mInitial.enPassant);
			if(pos>=0) {
				var pos2;
				// TODO does not work for all geometries
				var c=cbVar.geometry.C(pos);
				var r=cbVar.geometry.R(pos);
				if(aGame.mInitial.turn==1)
					pos2=cbVar.geometry.POS(c,r-1);
				else
					pos2=cbVar.geometry.POS(c,r+1);
				this.epTarget={
					p: pos,
					i: this.board[pos2],
				}
			}
		}
	}

	// The search copies a board for every child of every expanded node - a few
	// hundred times a second on a large board - and those copies were most of the
	// garbage it produced. Nothing keeps a copy alive after it has been evaluated,
	// so the arrays and the piece objects of the destination are reused whenever
	// they already have the right shape; a fresh board still allocates as before.
	Model.Board.CopyFrom = function(aBoard) {
		var board0=aBoard.board;
		var boardLength=board0.length;
		if(USE_TYPED_ARRAYS) {
			if(this.board===undefined || this.board.length!==boardLength)
				this.board=new Int16Array(boardLength);
			this.board.set(board0);
		} else {
			var board=this.board;
			if(board===undefined || board.length!==boardLength)
				board=this.board=new Array(boardLength);
			for(var i=0;i<boardLength;i++)
				board[i]=board0[i];
		}
		var pieces0=aBoard.pieces;
		var piecesLength=pieces0.length;
		var pieces=this.pieces;
		if(pieces===undefined || pieces.length!==piecesLength) {
			pieces=this.pieces=new Array(piecesLength);
			for(var i=0;i<piecesLength;i++)
				pieces[i]={ s:0, p:-1, t:0, i:i, m:false, r:0 };
		}
		for(var i=0;i<piecesLength;i++) {
			var piece=pieces[i], piece0=pieces0[i];
			piece.s=piece0.s;
			piece.p=piece0.p;
			piece.t=piece0.t;
			piece.i=piece0.i;
			piece.m=piece0.m;
			piece.r=piece0.r;
		}
		this.kings={};
		for(var i in aBoard.kings)
			this.kings[i] = aBoard.kings[i];
		this.check=aBoard.check;
		this.oppoCheck=aBoard.oppoCheck;
		var lastMove=this.lastMove;
		if(lastMove===undefined)
			lastMove=this.lastMove={};
		lastMove.f=aBoard.lastMove.f;
		lastMove.t=aBoard.lastMove.t;
		lastMove.c=aBoard.lastMove.c;
		var ending=this.ending;
		if(ending===undefined)
			ending=this.ending={};
		ending['1']=aBoard.ending[1];
		ending['-1']=aBoard.ending[-1];
		if(aBoard.castled!==undefined) {
			this.castled= {
				'1': aBoard.castled[1],
				'-1': aBoard.castled[-1],
			}
		}
		this.noCaptCount=aBoard.noCaptCount;
		if(aBoard.epTarget)
			this.epTarget={
				p: aBoard.epTarget.p,
				i: aBoard.epTarget.i,
			}
		else
			this.epTarget=null;
		this.mWho=aBoard.mWho;
		this.zSign=aBoard.zSign;
	}

	Model.Board.cbApplyCastle = function(aGame,move,updateSign) {
		var spec=aGame.cbVar.castle[move.f+"/"+move.cg];
		var rookTo=spec.r[spec.r.length-1] + (move.t >> 16);
		var rPiece=this.pieces[this.board[move.cg]];
		var kingTo=move.t & 0xffff;
		var kPiece=this.pieces[this.board[move.f]];
		if(updateSign) {
			this.zSign^=aGame.bKey(rPiece);
			this.zSign^=aGame.bKey(kPiece);
		}
		
		rPiece.p=rookTo;
		rPiece.m=true;
		this.board[move.cg]=-1;
		
		kPiece.p=kingTo;
		kPiece.m=true;
		this.board[move.f]=-1;
		
		if(updateSign) {
			this.zSign^=aGame.bKey(rPiece);
			this.zSign^=aGame.bKey(kPiece);
		}
		
		this.board[rookTo]=rPiece.i;
		this.board[kingTo]=kPiece.i;
		this.castled[rPiece.s]=true;
		
		this.kings[kPiece.s]=kingTo;
		
		return [{
			i: rPiece.i,
			f: rookTo,
			t: -1,
		},{
			i: kPiece.i,
			f: kingTo,
			t: move.f,
			kp: move.f,
			who: kPiece.s,
			m: false,
		},{
			i: rPiece.i,
			f: -1,
			t: move.cg,
			m: false,
			cg: false,
		}];
	}
	
	Model.Board.cbQuickApply = function(aGame,move) {
		if(move.cg!==undefined)
			return this.cbApplyCastle(aGame,move,false);
		var undo=[];
		var index=this.board[move.f];
		var piece=this.pieces[index];
		if(move.c!=null) {
			undo.unshift({
				i: move.c,
				f: -1,
				t: this.pieces[move.c].p,
			});
			var piece1=this.pieces[move.c];
			this.board[piece1.p]=-1;
			piece1.p=-1;
		}
		undo.unshift({
			i: index,
			f: move.t,
			t: move.f,
			ty: piece.t,
		});
		piece.p=move.t;
		if(move.pr!==undefined) {
			piece.t=move.pr;
			// a piece promoting into (or out of) a jumping slider changes its
			// jumping power, so piece.r has to follow piece.t
			var rank1=aGame.g.pTypes[piece.t].ranking;
			if(rank1!==piece.r) {
				undo[0].ra=piece.r;
				piece.r=rank1;
			}
		}
		var royal = aGame.g.pTypes[piece.t].isKing;
		if(royal) {
			royal *= piece.s;
			undo[0].who=royal; // only add these fields when needed
			undo[0].kp=this.kings[royal];
			this.kings[royal]=move.t;
		}
		this.board[move.f]=-1;
		this.board[move.t]=index;

		return undo;
	}

	Model.Board.cbQuickUnapply = function(aGame,undo) {
		for(var i=0;i<undo.length;i++) {
			var u=undo[i];
			var piece=this.pieces[u.i];
			if(u.f>=0) {
				piece.p=-1;
				this.board[u.f]=-1;
			}
			if(u.t>=0) {
				piece.p=u.t;
				this.board[u.t]=u.i;
			}
			if(u.m!==undefined)
				piece.m=u.m;
			if(u.kp!==undefined)
				this.kings[u.who]=u.kp;
			if(u.ty!=undefined)
				piece.t=u.ty;
			if(u.ra!==undefined)
				piece.r=u.ra;
			if(u.cg!=undefined)
				this.castled[piece.s]=u.cg;
		}
	}

	Model.Board.ApplyMove = function(aGame,move) {
		var piece=this.pieces[this.board[move.f]];
		if(move.cg!==undefined)
			this.cbApplyCastle(aGame,move,true);
		else {
			this.zSign^=aGame.bKey(piece);
			this.board[piece.p]=-1;
			if(move.pr!==undefined) {
				this.zSign^=aGame.tKey(piece);
				piece.t=move.pr;
				piece.r=aGame.g.pTypes[piece.t].ranking; // jumping power follows the type
				this.zSign^=aGame.tKey(piece);
			}
			if(move.c!=null) {
				var piece1=this.pieces[move.c];
				this.zSign^=aGame.bKey(piece1);
				this.board[piece1.p]=-1;
				piece1.p=-1;
				piece1.m=true;
				this.noCaptCount=0;
			} else if(aGame.cbPawnTypeSet[piece.t])
				this.noCaptCount = 0;
			else
				this.noCaptCount++;
			piece.p=move.t;
			piece.m=true;
			this.board[move.t]=piece.i;
			this.zSign^=aGame.bKey(piece);
			var royal = aGame.g.pTypes[piece.t].isKing;
			if(royal)
				this.kings[piece.s*royal]=move.t;
		}
		var h=this.oppoCheck;
		this.oppoCheck=this.check;
		this.check=(move.ck ? h+1 : 0);
		this.lastMove={
			f: move.f,
			t: move.t,
			c: move.c,
		}
		if(move.ko!==undefined)
			this.ending[piece.s]=move.ko;
		if(move.ept!==undefined)
			this.epTarget={
				p: move.ept,
				i: piece.i,
			}
		else
			this.epTarget=null;
		this.zSign^=aGame.wKey(1); // side-to-move key
		//this.cbIntegrity(aGame);
	}

	Model.Board.Evaluate = function(aGame) {
		var debug=arguments[3]=="debug";
		var $this=this;
		this.mEvaluation=0;
		var who=this.mWho;
		var g=aGame.g;
		var material;
		if(USE_TYPED_ARRAYS) {
			// the two counters are the same size on every call: keep them on the
			// game and blank them, rather than allocating a pair per evaluation
			var counts=aGame.cbEvalCounts;
			if(counts===undefined || counts[0].length!=g.pTypes.length)
				counts=aGame.cbEvalCounts=[new Uint8Array(g.pTypes.length),
							  new Uint8Array(g.pTypes.length)];
			counts[0].fill(0);
			counts[1].fill(0);
			material={ 
				'1': {
					count: counts[0],
					byType: {},
				},
				'-1': {
					count: counts[1], 
					byType: {},
				}
			}
		}
		else {
			material={ 
				'1': {
					count: [],
					byType: {},
				},
				'-1': {
					count: [], 
					byType: {},
				}
			}
			for(var i=0;i<g.pTypes.length;i++)
				material["1"].count[i]=material["-1"].count[i]=0;
		}
		
		if(aGame.mOptions.preventRepeat &&
			 aGame.GetRepeatOccurence(this)>=aGame.cbMaxRepeats) {
			if(typeof aGame.cbPerpEval == 'function')
				this.mWinner=aGame.cbPerpEval(this, aGame);
			else
				this.mWinner=aGame.cbOnPerpetual?who*aGame.cbOnPerpetual:JocGame.DRAW;
			this.mFinished=(this.mWinner !== undefined);
			return;
		}
		
		var pieceValue={ '1': 0, '-1': 0 };
		var distKingGraph={
			'1': g.distGraph[this.kings[-1]],
			'-1': g.distGraph[this.kings[1]],
		}
		var distKing={ '1': 0, '-1': 0 };
		var pieceCount={ '1': 0, '-1': 0 };
		var posValue={ '1': 0, '-1': 0 };
		
		var castlePiecesCount={ '1': 0, '-1': 0 };
		var kingMoved={ '1': 0, '-1': 0 }; // kludge: should become false or true
		
		// One accumulator per side, with plain numeric fields. The loop below runs
		// over every piece on every evaluation, and the {'1':..,'-1':..} objects
		// it used to fill turned each `x[s]` into a number-to-string conversion
		// and a dictionary lookup - about a thousand of them per call.
		var accW={ value:0, castle:0, count:0, dist:0, pos:0, moved:0,
			   mat:material['1'], distGraph:distKingGraph['1'] };
		var accB={ value:0, castle:0, count:0, dist:0, pos:0, moved:0,
			   mat:material['-1'], distGraph:distKingGraph['-1'] };
		var distEdge=cbVar.geometry.distEdge;
		var skipByType=aGame.cbSkipMaterialByType;
		var pTypes=g.pTypes;
		var pieces=this.pieces;
		var piecesLength=pieces.length;
		for(var i=0;i<piecesLength;i++) {
			var piece=pieces[i];
			var pos=piece.p;
			if(pos>=0) {
				var pType=pTypes[piece.t];
				var acc=piece.s>0?accW:accB;
				if(!pType.isKing)
					acc.value+=pType.value;
				else
					acc.moved=piece.m;
				if(pType.castle && !piece.m)
					acc.castle++;
				acc.count++;
				acc.dist+=acc.distGraph[pos];
				acc.pos+=distEdge[pos];
				var mat=acc.mat;
				mat.count[piece.t]++;
				// byType allocates one array per piece type present, on every
				// evaluation. A game whose evaluate() does not read it can say so
				// and save that: piece counts and values stay available.
				if(!skipByType) {
					var byType=mat.byType;
					if(byType[piece.t]===undefined)
						byType[piece.t]=[piece];
					else
						byType[piece.t].push(piece);
				}
			}
		}
		pieceValue['1']=accW.value;         pieceValue['-1']=accB.value;
		castlePiecesCount['1']=accW.castle; castlePiecesCount['-1']=accB.castle;
		pieceCount['1']=accW.count;         pieceCount['-1']=accB.count;
		distKing['1']=accW.dist;            distKing['-1']=accB.dist;
		posValue['1']=accW.pos;             posValue['-1']=accB.pos;
		kingMoved['1']=accW.moved;          kingMoved['-1']=accB.moved;

		if(kingMoved[who]===0 && this.kings[who]!==undefined) { // no King found, but had one before
			this.mWinner=-who; this.mFinished=true; // opponent wins
			return;
		}
		
		if(this.lastMove.c!==null) {
			// the destination can be empty even after a capture: a variant may
			// remove the piece that just moved (Tenjiku Shogi burns whatever
			// steps next to a Fire Demon)
			var index0=this.board[this.lastMove.t];
			if(index0>=0) {
				var piece=this.pieces[index0];
				pieceValue[-piece.s]+=this.cbStaticExchangeEval(aGame,piece.p,piece.s,{piece:piece})
			}
		}
		var kingFreedom={ '1': 0, '-1': 0 };
		var endingDistKing={ '1': 0, '-1': 0 };
		var distKingCorner={ '1': 0, '-1': 0 };
		function DistKingCorner(side) {
			var dist=Infinity;
			for(var corner in cbVar.geometry.corners) 
				dist=Math.min(dist,g.distGraph[$this.kings[side]][corner]);
			return dist-Math.sqrt(g.boardSize);
		}
		if(this.ending[1]) {
			//kingFreedom[1]=this.cbEvaluateKingFreedom(aGame,1)-g.boardSize;
			//endingDistKing[1]=g.distGraph[this.kings[-1]][this.kings[1]]-Math.sqrt(g.boardSize);
			endingDistKing[1]=(distKing['1']-Math.sqrt(g.boardSize))/pieceCount['1'];
			if(cbVar.geometry.corners)
				distKingCorner[1]=DistKingCorner(1);
		}
		if(this.ending[-1]) {
			//kingFreedom[-1]=this.cbEvaluateKingFreedom(aGame,-1)-g.boardSize;
			//endingDistKing[-1]=g.distGraph[this.kings[-1]][this.kings[1]]-Math.sqrt(g.boardSize);
			endingDistKing[-1]=(distKing['-1']-Math.sqrt(g.boardSize))/pieceCount['-1'];
			if(cbVar.geometry.corners)
				distKingCorner[1]=DistKingCorner(-1);
		}
		
		var evalValues={
			"pieceValue": pieceValue['1']-pieceValue[-1],
			"pieceValueRatio": (pieceValue['1']-pieceValue[-1])/(pieceValue['1']+pieceValue['-1']+1),
			"posValue": posValue['1']-posValue[-1],
			"averageDistKing": distKing['1']/pieceCount['1']-distKing['-1']/pieceCount[-1],
			"check": this.check?-who:0,
			"endingKingFreedom": kingFreedom[1]-kingFreedom[-1],
			"endingDistKing": endingDistKing['1']-endingDistKing['-1'],
			"distKingCorner": distKingCorner['1']-distKingCorner['-1'],
		}
		if(cbVar.castle)
			evalValues["castle"] = 
				(this.castled[1] ? 1 : (kingMoved[1]? 0 : castlePiecesCount[1] / (g.castleablePiecesCount[1]+1))) -  
				(this.castled[-1] ? 1 : (kingMoved[-1]? 0 : castlePiecesCount[-1] / (g.castleablePiecesCount[-1]+1)));
		
		if(cbVar.evaluate)
			cbVar.evaluate.call(this,aGame,evalValues,material,pieceCount,pieceValue);

		var evParams=aGame.mOptions.levelOptions;
		// the "<name>Factor" lookups are the same on every call: build the
		// name -> factor map once per set of level options
		var factors=aGame.cbEvalFactors;
		if(factors===undefined || aGame.cbEvalFactorsFor!==evParams) {
			factors=aGame.cbEvalFactors={};
			aGame.cbEvalFactorsFor=evParams;
		}
		for(var name in evalValues) {
			var value=evalValues[name];
			var factor=factors[name];
			if(factor===undefined)
				factor=factors[name]=evParams[name+'Factor'] || 0;
			var weighted=value*factor;
			if(debug)
				console.log(name,"=",value,"*",factor,"=>",weighted);
			this.mEvaluation+=weighted;
		}
		if(debug)
			console.log("Evaluation",this.mEvaluation);
	}
	
	Model.Board.cbGeneratePseudoLegalMoves = function(aGame) {
		var $this=this;
		var moves=[];
		var cbVar=aGame.cbVar;
		var who=this.mWho;
		var castlePieces=cbVar.castle && !this.check && !this.castled[who]?[]:null; // consider castle ?
		var king=-1;
		
		function PromotedMoves(piece,move) {
			var promoFnt=aGame.cbVar.promote;
			if(!promoFnt) {
				moves.push(move);
				return;
			}
			var promo=promoFnt.call($this,aGame,piece,move);
			if(promo==null)
				return;
			if(promo.length==0)
				moves.push(move);
			else if(promo.length==1) {
				move.pr=promo[0];
				moves.push(move);
			} else {
				for(var i=0;i<promo.length;i++) {
					var pr=promo[i];
					moves.push({
						f: move.f,
						t: move.t,
						c: move.c,
						pr: pr,
						ept: move.ept,
						ep: move.ep,
						a: move.a,
					});
				}
			}
		}

		var piecesLength=this.pieces.length;
		for(var i=0;i<piecesLength;i++) {
			var piece=this.pieces[i];
			if(piece.p<0 || piece.s!=who)
				continue;
			var pType=aGame.g.pTypes[piece.t];
			
			if(pType.isKing) {
				if(piece.m) // king moved, no castling
					castlePieces=null;
				else
					king=piece;
			} else if(pType.castle && !piece.m && castlePieces) // rook considered for castle
				castlePieces.push(piece);
			
			var graph, graphLength;
			graph=pType.graph[piece.p];
			graphLength=graph.length;
			for(var j=0;j<graphLength;j++) {
				var line=graph[j];
				var screen=false;
				var lineLength=line.length;
				var lastPos=piece.p;
				for(var k=0;k<lineLength;k++) {
					var tg1=line[k];
					var pos1=tg1 & MASK;
					var index1=this.board[pos1];
					var nonCapt=(index1<0);
					if(nonCapt && pType.epCatch && this.epTarget) { // destination empty, but could be e.p. capture
						var ept=this.epTarget.p;
						do {
							if(ept==pos1) { nonCapt=false; break; }
							if(cbVar.geometry.cube) break; // cube surface: the skipped square is the only e.p. target; index-arithmetic retrace doesn't apply across faces
							ept+=this.epTarget.p-this.lastMove.t;
						} while(ept!=this.lastMove.f);
					}
					if(nonCapt) {
						if((tg1 & FLAG_MOVE) && screen==false)
							PromotedMoves(piece,{
								f: piece.p,
								t: pos1,
								c: null,
								a: pType.abbrev,
								ept: lastPos==piece.p || !pType.epTarget?undefined:lastPos,
							});
						else if(tg1 & FLAG_SPECIAL)
							this.specials.push({
								f: piece.p,
								t: pos1,
								c: null,
								a: pType.abbrev,
								x: tg1 ^ lastPos
							});
					} else if(tg1 & FLAG_SCREEN_CAPTURE) {
						var piece1=this.pieces[index1];
						if(screen || tg1 & FLAG_CAPTURE) { // direct capture might also be possible
							if(piece1.s!=piece.s)
								PromotedMoves(piece,{
									f: piece.p,
									t: pos1,
									c: piece1.i,
									a: pType.abbrev,
								});
							if(!piece.r && screen) break; // normal hoppers terminate after first screen capture
						}
						if(piece.r && (piece.r|1) <= piece1.r) break; // blocking power too large
						screen=true;
					} else {
						var piece1;
						if(index1<0)
							piece1=this.pieces[this.epTarget.i];
						else
							piece1=this.pieces[index1];
						if(tg1 & FLAG_CAPTURE) {
							if(piece1.s!=piece.s && !(tg1 & (aGame.g.pTypes[piece1.t].isKing ? FLAG_CAPTURE_NO_KING : FLAG_CAPTURE_KING)))
								PromotedMoves(piece,{
									f: piece.p,
									t: pos1,
									c: piece1.i,
									a: pType.abbrev,
									ep: index1<0,
								});
						} else if(tg1 & (FLAG_CAPTURE_SELF | FLAG_SPECIAL_CAPTURE)) {
							if(tg1 & (piece1.s==piece.s ? FLAG_CAPTURE_SELF : FLAG_SPECIAL_CAPTURE))
							this.specials.push({
								f: piece.p,
								t: pos1,
								c: piece1.i,
								a: pType.abbrev,
								x: tg1 ^ lastPos
							});
						}
						break;
					}
					lastPos=pos1;
				}
			}
		}
		
		if(castlePieces) {
			for(var i=0;i<castlePieces.length;i++) {
				var rook=castlePieces[i];
				var spec=aGame.cbVar.castle[king.p+"/"+rook.p];
				if(!spec)
					continue;
				var rookOk=true;
				for(var j=0;j<spec.r.length;j++) {
					var pos=spec.r[j];
					if(this.board[pos]>=0 && pos!=king.p && pos!=rook.p) {
						rookOk=false;
						break;
					}
				}
				if(rookOk) {
					var step=(rook.p>king.p ? 1 : -1);
					var last=spec.k.length-1; // nominal King destination found here
					var extra=spec.extra || 0;
					var d=0;
					if(extra<0) extra*=-1,d=1;
					for(var j=0;j<=last+extra;j++) { // allow optional extension of King move
						var pos=(j<last ? spec.k[j] : spec.k[last]+step*(j-last));
						if((this.board[pos]>=0 && pos!=rook.p && pos!=king.p) || this.cbGetAttackers(aGame,pos,who).length>0) {
							break;
						}
						if(j>=last+d) {
							move={
								f: king.p,
								t: pos | step*(j-last)<<16,
								c: null,
								cg: rook.p,
							}
							if(j>last) move.a=pType.abbrev;
							moves.push(move);
						}
					}
				}
			}
		}
		
		return moves;
	}
	
	// Static Exchange Evaluation, as per http://chessprogramming.wikispaces.com/Static+Exchange+Evaluation
	Model.Board.cbStaticExchangeEval = function(aGame,pos,side,lastCaptured) {
		var value=0;
		var piece1=this.cbGetSmallestAttacker(aGame,pos,side);
		if(piece1) {
			var who=this.mWho;
			this.mWho=piece1.s;
			var undo=this.cbQuickApply(aGame,{
				f: piece1.p,
				t: pos,
				c: lastCaptured.piece.i,
			});
			var lastCapturedValue=aGame.g.pTypes[lastCaptured.piece.t].value;
			lastCaptured.piece=piece1;
			value=Math.max(0,lastCapturedValue-this.cbStaticExchangeEval(aGame,pos,-side,lastCaptured));
			this.cbQuickUnapply(aGame,undo);
			//this.cbIntegrity(aGame);
			this.mWho=who;
		}
		return value;		
	}
	
	Model.Board.cbGetSmallestAttacker = function(aGame,pos,side) {
		var attackers=this.cbGetAttackers(aGame,pos,side);
		if(attackers.length==0)
			return null;
		var smallestValue=Infinity;
		var smallestAttacker=null;
		var attackersLength=attackers.length;
		for(var i=0;i<attackersLength;i++) {
			var attacker=attackers[i];
			var attackerValue=aGame.g.pTypes[attacker.t].value;
			if(attackerValue<smallestValue) {
				smallestValue=attackerValue;
				smallestAttacker=attacker;
			} 
		}
		return smallestAttacker;
	}

	Model.Board.cbCollectAttackers=function(who,list,attackers,isKing) {
		for(var i=0;i<list.length;i+=2) {
			var pos1=list[i], branch=list[i+1];
			var index1=this.board[pos1];
			if(index1<0)
				this.cbCollectAttackers(who,branch.e.l,attackers,isKing);
			else {
				var piece1=this.pieces[index1];
				if(piece1.s==-who && (
						(branch.t && (piece1.t in branch.t)) ||
						(isKing && branch.tk && (piece1.t in branch.tk))))
					attackers.push(piece1);
			}
		}
	}

	var mr;

	Model.Board.cbCollectAttackersScreen=function(who,list,attackers,isKing,screen) {
		// `list` holds every branch of this level when we are still in front of
		// the first piece, and only the branches that can hold a screen capture
		// once we are behind one - see Flatten() in cbGetThreatGraph
		for(var i=0;i<list.length;i+=2) {
			var pos1=list[i], branch=list[i+1];
			var index1=this.board[pos1];
			if(index1<0)
				this.cbCollectAttackersScreen(who,screen?branch.e.h:branch.e.l,attackers,isKing,screen);
			else {
				var piece1=this.pieces[index1];
				if(!screen) {
					if(piece1.s==-who && (
						(branch.t && (piece1.t in branch.t)) ||
						(isKing && branch.tk && (piece1.t in branch.tk))))
						attackers.push(piece1); // direct attacker
					if(branch.hs)
				 		this.cbCollectAttackersScreen(who,branch.e.h,attackers,isKing,piece1.r|1024); // 1024 bit: must jump 1 screen
				} else {
					if(piece1.s==-who && branch.ts && (piece1.t in branch.ts) &&
					   (piece1.r ? (piece1.r|1) > (screen&1023) : screen&1024)) // normal hopper: 1 screen, ranked must top highest screen
						attackers.push(piece1);
					if(!mr) continue; // no flying pieces in this game
					var s=screen&1023; // we now have multiple screens
					if(piece1.r > s) s=piece1.r; // this target screens better
					if(s < (mr|1)) // but not maximally
					 	this.cbCollectAttackersScreen(who,branch.e.h,attackers,isKing,s|2048);
				}
			}
		}
	}

	Model.Board.cbGetAttackers = function(aGame,pos,who,isKing) {
		var attackers=[];
		mr = aGame.cbMaxScreenRanking;
		if(aGame.cbUseScreenCapture)
			this.cbCollectAttackersScreen(who,aGame.g.threatGraph[who][pos].l,attackers,isKing,0);
		else
			this.cbCollectAttackers(who,aGame.g.threatGraph[who][pos].l,attackers,isKing);
		return attackers;
	}

	// Multi-royal check test (crown-prince variants). A side is only in a
	// LOSING check when it has exactly one royal left and that royal is
	// attacked; while it holds two royals (king + crown prince) it can
	// afford to lose one, so it is never in check and may even leave a
	// royal en prise. Royal slots are read from `this.kings` (indexed by
	// s*isKing) but validated against the board, so a slot left stale by a
	// captured royal is correctly ignored. Only reached when
	// aGame.cbMaxRoyalRank>1; single-king variants keep the fast path below.
	Model.Board.cbInLosingCheck = function(aGame, who) {
		var maxRank=aGame.cbMaxRoyalRank, pT=aGame.g.pTypes;
		var sole=-1, count=0, prev=-1;
		for(var k=1;k<=maxRank;k++) {
			var pos=this.kings[who*k];
			if(pos===undefined || pos===prev) continue;
			var idx=this.board[pos];
			if(idx<0) continue;
			var pc=this.pieces[idx];
			if(pc.s!==who || !pT[pc.t].isKing) continue;
			prev=pos; count++; sole=pos;
		}
		if(count===0) return true;      // no royal left: lost
		if(count>=2) return false;      // two royals: cannot be checked
		return this.cbGetAttackers(aGame,sole,who,100).length>0;
	}

	// Is there at least one legal move? Same test as GenerateMoves below, but it
	// stops at the first move that holds, and it tries the moves of the royal
	// pieces first - stepping out of the way answers most checks - so the usual
	// answer costs one legality test instead of the whole move list. Only a real
	// mate pays for the full scan. The UCT search uses it to recognize a mate as
	// soon as the mating move is generated, instead of waiting until that node
	// is expanded in its turn.
	Model.Board.HasLegalMove = function(aGame) {
		var moves=this.cbGeneratePseudoLegalMoves(aGame);
		var multiRoyal=aGame.cbMaxRoyalRank>1;
		var royal=[], other=[];
		for(var i=0;i<moves.length;i++) {
			var index=this.board[moves[i].f];
			if(index>=0 && aGame.g.pTypes[this.pieces[index].t].isKing)
				royal.push(moves[i]);
			else
				other.push(moves[i]);
		}
		moves=royal.concat(other);
		for(var i=0;i<moves.length;i++) {
			var move=moves[i];
			var undo=this.cbQuickApply(aGame,move);
			var inCheck=multiRoyal
				? this.cbInLosingCheck(aGame,this.mWho)
				: this.cbGetAttackers(aGame,this.kings[this.mWho],this.mWho,100).length>0;
			this.cbQuickUnapply(aGame,undo);
			if(!inCheck)
				return true;
		}
		return false;
	}

	Model.Board.GenerateMoves = function(aGame) {
		var moves=this.cbGeneratePseudoLegalMoves(aGame);
		this.mMoves = [];
		var kingOnly=true;
		var selfKingPos=this.kings[this.mWho];
		var multiRoyal=aGame.cbMaxRoyalRank>1;
		var movesLength=moves.length;
		for(var i=0;i<movesLength;i++) {
			var move=moves[i];
			var undo=this.cbQuickApply(aGame,move);
			var inCheck=multiRoyal
				? this.cbInLosingCheck(aGame,this.mWho)
				: this.cbGetAttackers(aGame,this.kings[this.mWho],this.mWho,100).length>0;
			if(!inCheck) {
				var oppInCheck=multiRoyal
					? this.cbInLosingCheck(aGame,-this.mWho)
					: this.cbGetAttackers(aGame,this.kings[-this.mWho],-this.mWho,100).length>0;
				move.ck = oppInCheck; 
				this.mMoves.push(move);
				if(move.f!=selfKingPos)
					kingOnly=false;
			}
			this.cbQuickUnapply(aGame,undo);
		}
		if(this.mMoves.length==0) {
			this.mFinished=true;
			this.mWinner=aGame.cbOnStaleMate?aGame.cbOnStaleMate*this.mWho:JocGame.DRAW;
			if(this.check)
				this.mWinner=(aGame.cbMateEval ? aGame.cbMateEval(this) : -this.mWho);
		} else if(this.ending[this.mWho]) {
			if(!kingOnly) {
				for(var i=0;i<this.mMoves.length;i++)
					this.mMoves[i].ko=false;
			}
		} else if(!this.ending[this.mWho]) {
			if(kingOnly && !this.check) {
				for(var i=0;i<this.mMoves.length;i++)
					this.mMoves[i].ko=true;
			}
		}
	}

	Model.Board.GetSignature = function() {
		return this.zSign;
	}

	Model.Move.Init = function(args) {
		for(var f in args)
			if(args.hasOwnProperty(f))
				this[f]=args[f];
	}

	Model.Move.Equals = function(move) {
		return this.f==move.f && this.t==move.t && this.pr==move.pr;
	}
	
	Model.Move.CopyFrom=function(move) {
		this.Init(move);
	}

	Model.Move.ToString = function(format) {

		var self = this;
		format = format || "natural";

		// not sure was that was for...
		//if(this.compact)
		//	return this.compact;
		function NaturalFormat() {
			var str;
			if(self.cg!==undefined) {
				if(self.t>>16) str=self.a+cbVar.geometry.PosName(self.f)+'~'+cbVar.geometry.PosName(self.t&0xffff);
				else str=cbVar.castle[self.f+"/"+self.cg].n;
			} else {
				str=self.a || '';
				str+=cbVar.geometry.PosName(self.f);
				if(self.c==null)
					str+="-";
				else
					str+="x";
				str+=cbVar.geometry.PosName(self.t);
			}
			if(self.pr!==undefined) {
				var pType=cbVar.pieceTypes[self.pr];
				if(pType && pType.abbrev && pType.abbrev.length>0 && !pType.silentPromo)
					str+="="+pType.abbrev;
			}
			if(self.ck)
				str+="+";
			return str;
		}

		function EngineFormat() {
			var str = cbVar.geometry.PosName(self.f) + cbVar.geometry.PosName(self.t&0xffff);
			if(self.pr!=undefined) {
				var pType=cbVar.pieceTypes[self.pr];
				if(pType && pType.abbrev && pType.abbrev.length>0 && !pType.silentPromo)
					str+=pType.abbrev;				
			}
			return str;
		}

		// Like EngineFormat(), but for engines running with UCI_Chess960
		// enabled, where castling moves must use "king takes own rook"
		// notation (e.g. "g1h1") rather than the king's actual destination
		// square (e.g. "g1g1" - meaningless - or "e1g1" in the general
		// case). This is the de facto UCI standard for Chess960 castling
		// (see e.g. https://github.com/fairy-stockfish/chess-variant-standards
		// or python-chess's Board.uci(chess960=True)); it must NOT be used
		// as the default "engine" format because it would silently break
		// move-matching for every other (non-Chess960) game with castling -
		// the "king takes rook" destination is closer, in plain Levenshtein
		// distance, to unrelated short moves landing near the rook's
		// square than to the actual matching move in "engine" format. Only
		// use this format when the engine was actually told
		// "setoption name UCI_Chess960 value true" for this search (see
		// jocly.fairy.js's "chess960" level option).
		function Engine960Format() {
			if(self.cg===undefined)
				return EngineFormat();
			var str = cbVar.geometry.PosName(self.f) + cbVar.geometry.PosName(self.cg);
			if(self.pr!=undefined) {
				var pType=cbVar.pieceTypes[self.pr];
				if(pType && pType.abbrev && pType.abbrev.length>0 && !pType.silentPromo)
					str+=pType.abbrev;
			}
			return str;
		}
		
		switch(format) {
			case "natural":
				return NaturalFormat();
			case "engine":
				return EngineFormat();
			case "engine960":
				return Engine960Format();
			default:
				return "??";
		}


	}
	
	/* compact the move notation while preventing ambiguities */
	Model.Board.CompactMoveString = function(aGame,aMove,allMoves) {
		if(typeof aMove.ToString!="function") // ensure proper move object, if necessary
			aMove=aGame.CreateMove(aMove);
		var moveStr=aMove.ToString();
		var m=/^([A-Z]?)([a-z])([1-9][0-9]*)([-x])([a-z])([1-9][0-9]*)(.*?)$/.exec(moveStr);
		if(!m)
			return moveStr;
		var moveSuffix=m[7];

		if(!allMoves)
			allMoves={};
		if(!allMoves.value)
			allMoves.value=[];
		if(allMoves.value.length==0) {
			var oldMoves=this.mMoves;
			if(!this.mMoves || this.mMoves.length==0)
				this.GenerateMoves(aGame);
			for(var i=0;i<this.mMoves.length;i++) {
				var move=this.mMoves[i];
				if(typeof move.ToString!="function") // ensure proper move object, if necessary
					move=aGame.CreateMove(move);
				allMoves.value.push({
					str: move.ToString(),
					move: move,
				});
			}
			this.mMoves=oldMoves;
		}
		var matching=[];
		allMoves.value.forEach(function(mv) {
			var m2=/^([A-Z]?[a-z][1-9][0-9]*[-x][a-z][1-9][0-9]*)(.*?)$/.exec(mv.str);
			if(m2) {
				if(mv.move.t==aMove.t && (mv.move.a || '')==m[1] && m2[2]==moveSuffix) {
					matching.push(mv.move);
				}
			}			
		});

		if(matching.length==1) {
			if(m[1]=='' && m[4]=='x')
				return m[2]+'x'+m[5]+m[6]+m[7];
			else
				return m[1]+(m[4]=='x'?'x':'')+m[5]+m[6]+m[7];
		}
		if(cbVar.geometry.CompactCrit) {
			var crit="";
			for(var i=0;;i++) {
				var from2=cbVar.geometry.CompactCrit(aMove.f,i);
				if(from2==null)
					return moveStr;
				crit+=from2;
				var matching2=[];
				for(var j=0;j<matching.length;j++) {
					var move2=matching[j];
					if(cbVar.geometry.CompactCrit(move2.f,i)==from2)
						matching2.push(move2);
				}

				console.assert(matching2.length>0);
				if(matching2.length==1)
					return m[1]+crit+(m[4]=='x'?'x':'')+m[5]+m[6]+m[7];
				matching=matching2;
			}
		}
		return moveStr;
	}
	
	Model.Board.cbIntegrity = function(aGame) {
		var $this=this;
		function Assert(cond,text) {
			if(!cond) {
				console.error(text);
				debugger;
			}
		}
		for(var pos=0;pos<this.board.length;pos++) {
			var index=this.board[pos];
			if(index>=0) {
				var piece=$this.pieces[index];
				Assert(piece!==undefined,"no piece at pos");
				Assert(piece.p==pos,"piece has different pos");
			}
		}
		for(var index=0;index<this.pieces.length;index++) {
			var piece=this.pieces[index];
			if(piece.p>=0) {
				Assert($this.board[piece.p]==index,"board index mismatch");
			}
		}
	}

	// Ply count the initial position starts at, so an imported FEN keeps its
	// move number: "... 0 52" with white to move is ply 102, and after one
	// black move the export reads 52 again, then 53 - as a FEN reader expects.
	// 0 when the game starts from its own opening position (no imported FEN).
	Model.Board.cbInitialPly = function(aGame) {
		var initial=aGame.mInitial;
		if(!initial || !(initial.moveNumber>0))
			return 0;
		return (initial.moveNumber-1)*2 + (initial.turn==-1 ? 1 : 0);
	}

	Model.Board.ExportBoardState = function(aGame) {
		if(!aGame.cbVar.geometry.ExportBoardState)
			return "not supported";
		return aGame.cbVar.geometry.ExportBoardState(this,aGame.cbVar,
			this.cbInitialPly(aGame)+aGame.mPlayedMoves.length);
	}

	Model.Game.Import = function(format,data) {
		var turn, pieces=[], castle={'1':{},'-1':{}}, enPassant=null, noCaptCount=0, moveNumber=1;

		if(format=='pjn') {
			var result={
				status: false,
				error: 'parse',
			}
			var fenParts=data.split(' ');
			if(fenParts.length!=6) {
				console.warn("FEN should have 6 parts");
				return result;
			}
			var fenRows=fenParts[0].split('/');
			var fenHeight = cbVar.geometry.fenHeight || cbVar.geometry.height;
			if(fenRows.length!=fenHeight) {
				console.warn("FEN board should have",fenHeight,"rows, got",fenRows.length);
				return result;
			}
			
			var piecesMap={}

			// Which side a piece type "belongs" to, so the FEN case (UPPER =
			// white, lower = black) maps to the RIGHT type when two types
			// share a fenAbbrev - e.g. the white/black halves of a
			// directional piece (pawn-w/pawn-b, elephant-w/elephant-b, the
			// promoted +P pair, ...). Without this the last type scanned won
			// both cases, so a white 'P'/'E' loaded as the black-moving type.
			// Affinity is read from `initial` (the only side a type starts
			// on); promoted types have no `initial`, so fall back to the
			// "-w"/"-b" naming convention used throughout the shogi models.
			function sideAffinity(pType) {
				var init=pType.initial||[], s1=false, sm1=false;
				for(var j=0;j<init.length;j++)
					if(init[j].s>0) s1=true; else if(init[j].s<0) sm1=true;
				if(s1 && !sm1) return 1;
				if(sm1 && !s1) return -1;
				if(/-w$/.test(pType.name||'')) return 1;
				if(/-b$/.test(pType.name||'')) return -1;
				return 0; // symmetric: claims both cases
			}

			for(var index in cbVar.pieceTypes) {
				var pType=cbVar.pieceTypes[index];
				var abbrev=pType.fenAbbrev || pType.abbrev || 'X';
				// keys of an object are strings: a piece type must stay a number,
				// or a model comparing types strictly (switch, ===) sees none of them
				var pieceType=parseInt(index);
				var aff=sideAffinity(pType);
				var up=abbrev.toUpperCase(), lo=abbrev.toLowerCase();
				// a side-specific type (aff!=0) claims its own case and
				// overrides a symmetric type; a symmetric type fills a case
				// only if still free, so it never steals a specific type's slot
				if(aff>=0 && (aff>0 || piecesMap[up]===undefined))
					piecesMap[up]={ s: 1, t: pieceType };
				if(aff<=0 && (aff<0 || piecesMap[lo]===undefined))
					piecesMap[lo]={ s: -1, t: pieceType };
			}
			
			var FenRowPos = cbVar.geometry.FenRowPos || function(rowIndex,colIndex) {
				return (cbVar.geometry.height-1-rowIndex)*cbVar.geometry.width+colIndex;
			}
			
			// TODO row/col does not fit all geometries
			fenRows.forEach(function(row,rowIndex) {
				var colIndex=0;
				for(var i=0;i<row.length;i++) {
					var ch=row.substr(i,1);
					// a few large variants need more piece letters than the
					// alphabet has (Tenjiku Shogi has 66 piece kinds), so a type
					// may declare a multi-character fenAbbrev ("B!", "+C!"):
					// take the longest declared code that matches here
					for(var len=3;len>1;len--)
						if(i+len<=row.length && piecesMap[row.substr(i,len)]!==undefined) {
							ch=row.substr(i,len);
							i+=len-1;
							break;
						}
					// promoted pieces are written "+P", "+e", ... - read the
					// '+' together with the letter that follows it
					if(ch.length==1 && ch=='+' && i+1<row.length) { ch=row.substr(i,2); i++; }
					var pieceDescr=piecesMap[ch];
					if(pieceDescr!==undefined) {
						var pos=FenRowPos(rowIndex,colIndex);
						colIndex++;
						var piece={
							s: pieceDescr.s,
							t: pieceDescr.t,
							p: pos,
						}
						var moved=true;
						var initial1=cbVar.pieceTypes[piece.t].initial || [];
						for(var j=0;j<initial1.length;j++) {
							var desc=initial1[j];
							if(desc.s==piece.s && desc.p==pos)
								moved=false;
						}
						piece.m=moved;
						pieces.push(piece);
					} else if(!isNaN(parseInt(ch))) {
						// a run of empty squares is written as a decimal number,
						// so boards wider than 9 export "10" and the digits of
						// one number must be read together
						var digits=ch;
						while(i+1<row.length && !isNaN(parseInt(row.substr(i+1,1)))
							&& piecesMap[row.substr(i+1,1)]===undefined) {
							i++;
							digits+=row.substr(i,1);
						}
						colIndex+=parseInt(digits);
					} else {
						console.warn("FEN invalid board spec",ch);
						return result;
					}
				}
			});
			pieces.sort(function(p1,p2) {
				return p2.s-p1.s;
			});
			if(fenParts[1]=='w')
				turn=1;
			else if(fenParts[1]=='b')
				turn=-1;
			else {
				console.warn("FEN invalid turn spec",fenParts[1]);
				return result;
			}
			castle[1].k=fenParts[2].indexOf('K')>=0;
			castle[1].q=fenParts[2].indexOf('Q')>=0;
			castle[-1].k=fenParts[2].indexOf('k')>=0;
			castle[-1].q=fenParts[2].indexOf('q')>=0;
			enPassant=fenParts[3]=='-'?null:fenParts[3];
			var noCaptCount1=parseInt(fenParts[4]);
			if(!isNaN(noCaptCount1))
				noCaptCount=noCaptCount1;
			// 6th field: the full move number. It used to be dropped, so a
			// position loaded at move 52 exported back as move 1.
			var moveNumber1=parseInt(fenParts[5]);
			if(!isNaN(moveNumber1) && moveNumber1>0)
				moveNumber=moveNumber1;
			
			var initial={
				pieces: pieces,
				turn: turn,
				castle: castle,
				enPassant: enPassant,
				noCaptCount: noCaptCount,
				moveNumber: moveNumber,
			}
			var status=true;
			if(cbVar.importGame)
				cbVar.importGame.call(this,initial,format,data);
			
			return {
				status: status,
				initial: initial,
			}
		}
		return {
			status: false,
			error: 'unsupported',
		}
	}

	
})();
