
/*
	Tenjiku Shogi (天竺将棋) - 16x16, derived from Chu Shogi.

	Everything Chu Shogi does (Lion double moves, Falcon/Eagle stings, optional
	promotion in the last ranks, royal Crown Prince) is done exactly like
	shogi/chu-shogi-model.js, so both games stay consistent. On top of that
	Tenjiku needs three mechanisms the plain chess base does not cover:

	  - jumping generals: BG/RG/VG/GG slide, but when capturing they may jump
	    over any number of LOWER-RANKED pieces. This is the engine's
	    `ranking` + FLAG_SCREEN_CAPTURE mechanism (see base-model.js): a piece
	    with rank r jumps over pieces of rank < r and always stops at (but may
	    capture) the first piece it cannot jump. Ranks are odd numbers because
	    base-model tests `(piece.r|1) <= piece1.r`, which with odd ranks means
	    "strictly lower rank" - i.e. generals never jump over their equals.
	    King and Crown Prince get the highest rank, so no general can jump OVER
	    royalty (it can still capture it, as any slider captures what blocks it).

	  - Fire Demon burning: active burn (all adjacent enemies die after the
	    Demon moved) uses FLAG_BURN from locust-move-model.js; passive burn (the
	    piece that moves NEXT TO a Demon dies instead, the Demon survives) is
	    implemented here in the Apply hooks.

	  - area moves: Fire Demon and Vice General may walk up to 3 King steps in
	    freely chosen directions through empty squares, stopping at their first
	    capture. Those are generated in customGen (they cannot be expressed as
	    static graph lines without an explosion of bent paths) and reported to
	    the check test by the cbGetAttackers hook at the bottom of this file.
*/

(function() {

	var geometry = Model.Game.cbBoardGeometryGrid(16,16);

	var c = Model.Game.cbConstants;

	var DIAG = [[1,1],[-1,1],[1,-1],[-1,-1]];
	var ORTH = [[1,0],[-1,0],[0,1],[0,-1]];
	var ADJ  = DIAG.concat(ORTH);
	var SIDE = [[1,0],[-1,0]];
	var VERT = [[0,1],[0,-1]];
	var JUMP2 = [[2,0],[-2,0],[0,2],[0,-2],[2,2],[2,-2],[-2,2],[-2,-2]];

	// Tenjiku has no Lion-trading restriction at all (unlike Chu Shogi), so
	// minimumBridge stays undefined and locust-move-model's anti-trade code
	// never triggers.

	Model.Game.cbOnStaleMate = -1; // stalemated side loses

	// evaluate() below only looks at the move counter, so the per-type piece
	// lists the generic evaluation builds are pure cost here - 88 piece types on
	// a board carrying 156 pieces, on every evaluated position.
	Model.Game.cbSkipMaterialByType = true;

	// ---- piece type indices -------------------------------------------------
	// Directional pieces come in -w/-b pairs (the FEN importer reads the side
	// from `initial`, or from the -w/-b suffix for promoted types).
	var PAWN_W=0, PAWN_B=1, LANCE_W=2, LANCE_B=3, KNIGHT_W=4, KNIGHT_B=5,
	    IRON_W=6, IRON_B=7, COPPER_W=8, COPPER_B=9, SILVER_W=10, SILVER_B=11,
	    GOLD_W=12, GOLD_B=13, TIGER_W=14, TIGER_B=15, ELEPHANT_W=16, ELEPHANT_B=17,
	    DOG_W=18, DOG_B=19, LEOPARD=20, KIRIN=21, PHOENIX=22, RCHARIOT=23,
	    SIDEMOVER=24, VERTMOVER=25, SIDESOLDIER_W=26, SIDESOLDIER_B=27,
	    VERTSOLDIER_W=28, VERTSOLDIER_B=29, BISHOP=30, ROOK=31, DHORSE=32,
	    DKING=33, FALCON_W=34, FALCON_B=35, EAGLE_W=36, EAGLE_B=37, LION=38,
	    FREEKING=39, CHARIOTSOLDIER=40, BUFFALO=41, BISHOPGEN=42, ROOKGEN=43,
	    VICEGEN=44, GREATGEN=45, FREEEAGLE=46, LIONHAWK=47, DEMON=48, KING=49,
	    // promoted
	    TOKIN_W=50, TOKIN_B=51, WHITEHORSE_W=52, WHITEHORSE_B=53,
	    SIDESOLDIER2_W=54, SIDESOLDIER2_B=55, VERTSOLDIER2_W=56, VERTSOLDIER2_B=57,
	    SIDEMOVER2=58, VERTMOVER2=59, ROOK2=60, STAG=61, PRINCE=62,
	    MULTIGEN_W=63, MULTIGEN_B=64, BISHOP2=65, LION2=66, FREEKING2=67,
	    WHALE_W=68, WHALE_B=69, FREEBOAR=70, FLYINGOX=71, BUFFALO2=72,
	    CHARIOTSOLDIER2=73, DHORSE2=74, DKING2=75, FALCON2_W=76, FALCON2_B=77,
	    EAGLE2_W=78, EAGLE2_B=79, LIONHAWK2=80, FREEEAGLE2=81, BISHOPGEN2=82,
	    ROOKGEN2=83, VICEGEN2=84, GREATGEN2=85, DEMON2=86, TETRARCH=87;

	// Optional promotion: source type -> promoted type. Types absent from the
	// table never promote (King, Fire Demon, both Generals of the top ranks,
	// Free Eagle, Lion Hawk and everything already promoted).
	var PROMOTION = {};
	PROMOTION[PAWN_W]=TOKIN_W;             PROMOTION[PAWN_B]=TOKIN_B;
	PROMOTION[LANCE_W]=WHITEHORSE_W;       PROMOTION[LANCE_B]=WHITEHORSE_B;
	PROMOTION[KNIGHT_W]=SIDESOLDIER2_W;    PROMOTION[KNIGHT_B]=SIDESOLDIER2_B;
	PROMOTION[IRON_W]=VERTSOLDIER2_W;      PROMOTION[IRON_B]=VERTSOLDIER2_B;
	PROMOTION[COPPER_W]=SIDEMOVER2;        PROMOTION[COPPER_B]=SIDEMOVER2;
	PROMOTION[SILVER_W]=VERTMOVER2;        PROMOTION[SILVER_B]=VERTMOVER2;
	PROMOTION[GOLD_W]=ROOK2;               PROMOTION[GOLD_B]=ROOK2;
	PROMOTION[TIGER_W]=STAG;               PROMOTION[TIGER_B]=STAG;
	PROMOTION[ELEPHANT_W]=PRINCE;          PROMOTION[ELEPHANT_B]=PRINCE;
	PROMOTION[DOG_W]=MULTIGEN_W;           PROMOTION[DOG_B]=MULTIGEN_B;
	PROMOTION[LEOPARD]=BISHOP2;
	PROMOTION[KIRIN]=LION2;
	PROMOTION[PHOENIX]=FREEKING2;
	PROMOTION[SIDEMOVER]=FREEBOAR;
	PROMOTION[VERTMOVER]=FLYINGOX;
	PROMOTION[SIDESOLDIER_W]=BUFFALO2;     PROMOTION[SIDESOLDIER_B]=BUFFALO2;
	PROMOTION[VERTSOLDIER_W]=CHARIOTSOLDIER2; PROMOTION[VERTSOLDIER_B]=CHARIOTSOLDIER2;
	PROMOTION[BISHOP]=DHORSE2;
	PROMOTION[ROOK]=DKING2;
	PROMOTION[FALCON_W]=BISHOPGEN2;        PROMOTION[FALCON_B]=BISHOPGEN2;
	PROMOTION[EAGLE_W]=ROOKGEN2;           PROMOTION[EAGLE_B]=ROOKGEN2;
	PROMOTION[LION]=LIONHAWK2;
	PROMOTION[FREEKING]=FREEEAGLE2;
	PROMOTION[CHARIOTSOLDIER]=TETRARCH;
	PROMOTION[BUFFALO]=DEMON2;
	PROMOTION[BISHOPGEN]=VICEGEN2;
	PROMOTION[ROOKGEN]=GREATGEN2;
	// side-dependent promoted types (the promoted piece is directional)
	var PROMOTION_B = {};
	PROMOTION_B[RCHARIOT]=WHALE_B;         PROMOTION[RCHARIOT]=WHALE_W;
	PROMOTION_B[DHORSE]=FALCON2_B;         PROMOTION[DHORSE]=FALCON2_W;
	PROMOTION_B[DKING]=EAGLE2_B;           PROMOTION[DKING]=EAGLE2_W;

	// Pieces that cannot move any more when they reach the far edge must
	// promote there (same idea as the Chu Shogi last-rank Pawn).
	var STUCK_LAST = {};   // white: rank 15 / black: rank 0
	STUCK_LAST[PAWN_W]=STUCK_LAST[PAWN_B]=STUCK_LAST[LANCE_W]=STUCK_LAST[LANCE_B]=
	STUCK_LAST[IRON_W]=STUCK_LAST[IRON_B]=STUCK_LAST[KNIGHT_W]=STUCK_LAST[KNIGHT_B]=true;
	var STUCK_LAST2 = {};  // white: rank 14 / black: rank 1 (Knight jumps 2 forward)
	STUCK_LAST2[KNIGHT_W]=STUCK_LAST2[KNIGHT_B]=true;

	// Fire Demons (unpromoted + promoted Water Buffalo) and the pieces that own
	// a 3-step area move. Used by the hooks below, hence file scope.
	var IS_DEMON = {}; IS_DEMON[DEMON]=true; IS_DEMON[DEMON2]=true;
	var AREA_STEPS = {};
	AREA_STEPS[DEMON]=3; AREA_STEPS[DEMON2]=3;
	AREA_STEPS[VICEGEN]=3; AREA_STEPS[VICEGEN2]=3;
	var DEMON_SLIDE = DIAG.concat(SIDE); // Fire Demon slides as a Free Boar

	Model.Game.cbDefine = function() {

		var $this = this;

		var hitrun = c.FLAG_HITRUN;                 // Lion: adjacent enemy, then a 2nd leg
		var locust = c.FLAG_CHECKER | c.FLAG_SPECIAL_CAPTURE; // Falcon/Eagle jump
		var igui   = c.FLAG_RIFLE;                  // capture without moving
		var flying = c.FLAG_MOVE | c.FLAG_CAPTURE | c.FLAG_SCREEN_CAPTURE; // jumping generals
		var burning = c.FLAG_BURN | c.FLAG_SPECIAL | c.FLAG_SPECIAL_CAPTURE | c.FLAG_THREAT;
		var areaHook = c.FLAG_CAPTURE_SELF;         // [[0,0]] candidate -> customGen

		function SR(deltas,flags) {
			return $this.cbShortRangeGraph(geometry,deltas,null,flags);
		}
		function LR(deltas,flags,maxDist) {
			return $this.cbLongRangeGraph(geometry,deltas,null,flags,maxDist);
		}
		function MG() {
			return $this.cbMergeGraphs.apply($this,
				[geometry].concat(Array.prototype.slice.call(arguments)));
		}
		// Ski slider: ignores (and is not blocked by) the first square, then
		// slides on - the Heavenly Tetrarch's move.
		function Ski(deltas,maxDist) {
			var graph={};
			for(var pos=0;pos<geometry.boardSize;pos++) {
				graph[pos]=[];
				deltas.forEach(function(delta) {
					var skipped=geometry.Graph(pos,delta);
					if(skipped==null) return;
					var line=[], pos1=geometry.Graph(skipped,delta), dist=0;
					while(pos1!=null && dist<maxDist) {
						line.push(pos1 | c.FLAG_MOVE | c.FLAG_CAPTURE);
						dist++;
						pos1=geometry.Graph(pos1,delta);
					}
					if(line.length>0)
						graph[pos].push($this.cbTypedArray(line));
				});
			}
			return graph;
		}
		function AreaHook() { // makes customGen generate the area move
			return SR([[0,0]],areaHook);
		}

		function Lion() { // Chu Shogi Lion: 5x5 jumps, igui, hit-and-run, double capture
			return MG(
				$this.cbKingGraph(geometry),
				$this.cbKnightGraph(geometry),
				SR(ADJ,hitrun),
				SR(JUMP2)
			);
		}

		return {
			geometry: geometry,

			pieceTypes: {

				0: { name:'pawn-w', aspect:'sh-pawn', abbrev:'', fenAbbrev:'P', value:0.4,
					graph: SR([[0,1]]),
					initial: [{s:1,p:64},{s:1,p:65},{s:1,p:66},{s:1,p:67},{s:1,p:68},{s:1,p:69},
						{s:1,p:70},{s:1,p:71},{s:1,p:72},{s:1,p:73},{s:1,p:74},{s:1,p:75},
						{s:1,p:76},{s:1,p:77},{s:1,p:78},{s:1,p:79}],
				},
				1: { name:'pawn-b', aspect:'sh-pawn', abbrev:'', fenAbbrev:'P', value:0.4,
					graph: SR([[0,-1]]),
					initial: [{s:-1,p:176},{s:-1,p:177},{s:-1,p:178},{s:-1,p:179},{s:-1,p:180},
						{s:-1,p:181},{s:-1,p:182},{s:-1,p:183},{s:-1,p:184},{s:-1,p:185},
						{s:-1,p:186},{s:-1,p:187},{s:-1,p:188},{s:-1,p:189},{s:-1,p:190},{s:-1,p:191}],
				},

				2: { name:'lance-w', aspect:'sh-lance', abbrev:'L', value:1,
					graph: LR([[0,1]]), initial: [{s:1,p:0},{s:1,p:15}] },
				3: { name:'lance-b', aspect:'sh-lance', abbrev:'L', value:1,
					graph: LR([[0,-1]]), initial: [{s:-1,p:240},{s:-1,p:255}] },

				4: { name:'knight-w', aspect:'sh-knight', abbrev:'N', fenAbbrev:'J', value:0.5,
					graph: SR([[1,2],[-1,2]]), initial: [{s:1,p:1},{s:1,p:14}] },
				5: { name:'knight-b', aspect:'sh-knight', abbrev:'N', fenAbbrev:'J', value:0.5,
					graph: SR([[1,-2],[-1,-2]]), initial: [{s:-1,p:241},{s:-1,p:254}] },

				6: { name:'iron-w', aspect:'sh-iron', abbrev:'I', value:0.7,
					graph: SR([[0,1],[1,1],[-1,1]]), initial: [{s:1,p:3},{s:1,p:12}] },
				7: { name:'iron-b', aspect:'sh-iron', abbrev:'I', value:0.7,
					graph: SR([[0,-1],[1,-1],[-1,-1]]), initial: [{s:-1,p:243},{s:-1,p:252}] },

				8: { name:'copper-w', aspect:'sh-copper', abbrev:'C', value:0.9,
					graph: SR([[0,1],[0,-1],[1,1],[-1,1]]), initial: [{s:1,p:4},{s:1,p:11}] },
				9: { name:'copper-b', aspect:'sh-copper', abbrev:'C', value:0.9,
					graph: SR([[0,1],[0,-1],[1,-1],[-1,-1]]), initial: [{s:-1,p:244},{s:-1,p:251}] },

				10: { name:'silver-w', aspect:'sh-silver', abbrev:'S', value:1,
					graph: SR([[0,1],[1,1],[-1,1],[1,-1],[-1,-1]]), initial: [{s:1,p:5},{s:1,p:10}] },
				11: { name:'silver-b', aspect:'sh-silver', abbrev:'S', value:1,
					graph: SR([[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]), initial: [{s:-1,p:245},{s:-1,p:250}] },

				12: { name:'gold-w', aspect:'sh-gold', abbrev:'G', value:1.1,
					graph: SR([[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1]]), initial: [{s:1,p:6},{s:1,p:9}] },
				13: { name:'gold-b', aspect:'sh-gold', abbrev:'G', value:1.1,
					graph: SR([[0,1],[0,-1],[1,0],[-1,0],[1,-1],[-1,-1]]), initial: [{s:-1,p:246},{s:-1,p:249}] },

				14: { name:'tiger-w', aspect:'sh-tiger', abbrev:'BT', fenAbbrev:'T', value:1.2,
					graph: SR([[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]),
					initial: [{s:1,p:21},{s:1,p:26}] },
				15: { name:'tiger-b', aspect:'sh-tiger', abbrev:'BT', fenAbbrev:'T', value:1.2,
					graph: SR([[0,1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]),
					initial: [{s:-1,p:229},{s:-1,p:234}] },

				16: { name:'elephant-w', aspect:'sh-elephant', abbrev:'DE', fenAbbrev:'E', value:1.5,
					graph: SR([[0,1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]),
					initial: [{s:1,p:8}] },
				17: { name:'elephant-b', aspect:'sh-elephant', abbrev:'DE', fenAbbrev:'E', value:1.5,
					graph: SR([[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]),
					initial: [{s:-1,p:247}] },

				18: { name:'dog-w', aspect:'sh-dog', abbrev:'D', fenAbbrev:'U', value:0.5,
					graph: SR([[0,1],[1,-1],[-1,-1]]), initial: [{s:1,p:84},{s:1,p:91}] },
				19: { name:'dog-b', aspect:'sh-dog', abbrev:'D', fenAbbrev:'U', value:0.5,
					graph: SR([[0,-1],[1,1],[-1,1]]), initial: [{s:-1,p:164},{s:-1,p:171}] },

				20: { name:'leopard', aspect:'sh-leopard', abbrev:'FL', fenAbbrev:'F', value:1.1,
					graph: SR([[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]),
					initial: [{s:1,p:2},{s:1,p:13},{s:-1,p:242},{s:-1,p:253}] },

				21: { name:'kirin', aspect:'sh-kirin', abbrev:'KN', fenAbbrev:'O', value:1.7,
					graph: SR(DIAG.concat([[2,0],[-2,0],[0,2],[0,-2]])),
					initial: [{s:1,p:22},{s:-1,p:233}] },

				22: { name:'phoenix', aspect:'sh-phoenix', abbrev:'PH', fenAbbrev:'X', value:1.7,
					graph: SR(ORTH.concat([[2,2],[-2,2],[2,-2],[-2,-2]])),
					initial: [{s:1,p:25},{s:-1,p:230}] },

				23: { name:'reverse-chariot', aspect:'sh-reversechariot', abbrev:'RV', fenAbbrev:'A', value:1.5,
					graph: LR(VERT),
					initial: [{s:1,p:16},{s:1,p:31},{s:-1,p:224},{s:-1,p:239}] },

				24: { name:'side-mover', aspect:'sh-sweeper', abbrev:'SM', fenAbbrev:'M', value:2.5,
					graph: MG(LR(SIDE),SR(VERT)),
					initial: [{s:1,p:48},{s:1,p:63},{s:-1,p:192},{s:-1,p:207}] },

				25: { name:'vertical-mover', aspect:'sh-climber', abbrev:'VM', fenAbbrev:'V', value:2.5,
					graph: MG(LR(VERT),SR(SIDE)),
					initial: [{s:1,p:49},{s:1,p:62},{s:-1,p:193},{s:-1,p:206}] },

				26: { name:'side-soldier-w', aspect:'sh-sidesoldier', abbrev:'SS', fenAbbrev:'Y', value:3,
					graph: MG(LR(SIDE),SR([[0,-1]]),LR([[0,1]],null,2)),
					initial: [{s:1,p:32},{s:1,p:47}] },
				27: { name:'side-soldier-b', aspect:'sh-sidesoldier', abbrev:'SS', fenAbbrev:'Y', value:3,
					graph: MG(LR(SIDE),SR([[0,1]]),LR([[0,-1]],null,2)),
					initial: [{s:-1,p:208},{s:-1,p:223}] },

				28: { name:'vertical-soldier-w', aspect:'sh-vertsoldier', abbrev:'VS', fenAbbrev:'Z', value:3,
					graph: MG(LR([[0,1]]),SR([[0,-1]]),LR(SIDE,null,2)),
					initial: [{s:1,p:33},{s:1,p:46}] },
				29: { name:'vertical-soldier-b', aspect:'sh-vertsoldier', abbrev:'VS', fenAbbrev:'Z', value:3,
					graph: MG(LR([[0,-1]]),SR([[0,1]]),LR(SIDE,null,2)),
					initial: [{s:-1,p:209},{s:-1,p:222}] },

				30: { name:'bishop', aspect:'sh-bishop', abbrev:'B', value:4,
					graph: this.cbBishopGraph(geometry),
					initial: [{s:1,p:34},{s:1,p:45},{s:-1,p:210},{s:-1,p:221}] },

				31: { name:'rook', aspect:'sh-rook', abbrev:'R', value:5,
					graph: this.cbRookGraph(geometry),
					initial: [{s:1,p:50},{s:1,p:61},{s:-1,p:194},{s:-1,p:205}] },

				32: { name:'dragon-horse', aspect:'sh-horse', abbrev:'DH', fenAbbrev:'H', value:5.5,
					graph: MG(this.cbBishopGraph(geometry),SR(ORTH)),
					initial: [{s:1,p:35},{s:1,p:44},{s:-1,p:211},{s:-1,p:220}] },

				33: { name:'dragon-king', aspect:'sh-dragon', abbrev:'DK', fenAbbrev:'D', value:7,
					graph: MG(this.cbRookGraph(geometry),SR(DIAG)),
					initial: [{s:1,p:36},{s:1,p:43},{s:-1,p:212},{s:-1,p:219}] },

				34: { name:'falcon-w', aspect:'sh-falcon', abbrev:'HF', fenAbbrev:'H!', value:8.5,
					graph: MG(SR([[0,1],[0,2]]),SR([[0,1]],igui),SR([[0,2]],locust),
						LR([[1,0],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])),
					initial: [{s:1,p:51},{s:1,p:60}] },
				35: { name:'falcon-b', aspect:'sh-falcon', abbrev:'HF', fenAbbrev:'H!', value:8.5,
					graph: MG(SR([[0,-1],[0,-2]]),SR([[0,-1]],igui),SR([[0,-2]],locust),
						LR([[1,0],[-1,0],[0,1],[1,1],[1,-1],[-1,1],[-1,-1]])),
					initial: [{s:-1,p:195},{s:-1,p:204}] },

				36: { name:'eagle-w', aspect:'sh-eagle', abbrev:'SE', fenAbbrev:'D!', value:9,
					graph: MG(SR([[1,1],[-1,1],[2,2],[-2,2]]),SR([[1,1],[-1,1]],igui),
						SR([[2,2],[-2,2]],locust),
						LR([[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,-1]])),
					initial: [{s:1,p:52},{s:1,p:59}] },
				37: { name:'eagle-b', aspect:'sh-eagle', abbrev:'SE', fenAbbrev:'D!', value:9,
					graph: MG(SR([[1,-1],[-1,-1],[2,-2],[-2,-2]]),SR([[1,-1],[-1,-1]],igui),
						SR([[2,-2],[-2,-2]],locust),
						LR([[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1]])),
					initial: [{s:-1,p:196},{s:-1,p:203}] },

				38: { name:'lion', aspect:'sh-lion', abbrev:'LN', fenAbbrev:'N!', value:12,
					graph: Lion(), initial: [{s:1,p:23},{s:-1,p:232}] },

				39: { name:'queen', aspect:'sh-queen', abbrev:'FK', fenAbbrev:'Q', value:9.5,
					graph: this.cbQueenGraph(geometry),
					initial: [{s:1,p:24},{s:-1,p:231}] },

				40: { name:'chariot-soldier', aspect:'sh-chariot', abbrev:'CS', fenAbbrev:'C!', value:7,
					graph: MG(this.cbBishopGraph(geometry),LR(VERT),LR(SIDE,null,2)),
					initial: [{s:1,p:18},{s:1,p:19},{s:1,p:28},{s:1,p:29},
						{s:-1,p:226},{s:-1,p:227},{s:-1,p:236},{s:-1,p:237}] },

				41: { name:'water-buffalo', aspect:'sh-buffalo', abbrev:'WB', fenAbbrev:'W', value:9,
					graph: MG(this.cbBishopGraph(geometry),LR(SIDE),LR(VERT,null,2)),
					initial: [{s:1,p:37},{s:1,p:42},{s:-1,p:213},{s:-1,p:218}] },

				42: { name:'bishop-general', aspect:'sh-bishopgeneral', abbrev:'BG', fenAbbrev:'B!', value:12,
					graph: LR(DIAG,flying), ranking: 1, flying: true,
					initial: [{s:1,p:53},{s:1,p:58},{s:-1,p:197},{s:-1,p:202}] },

				43: { name:'rook-general', aspect:'sh-rookgeneral', abbrev:'RG', fenAbbrev:'R!', value:14,
					graph: LR(ORTH,flying), ranking: 1, flying: true,
					initial: [{s:1,p:54},{s:1,p:57},{s:-1,p:198},{s:-1,p:201}] },

				44: { name:'vice-general', aspect:'sh-vicegeneral', abbrev:'VG', fenAbbrev:'V!', value:16,
					graph: MG(LR(DIAG,flying),AreaHook()), ranking: 3, flying: true,
					initial: [{s:1,p:56},{s:-1,p:199}] },

				45: { name:'great-general', aspect:'sh-greatgeneral', abbrev:'GG', fenAbbrev:'G!', value:20,
					graph: LR(ADJ,flying), ranking: 5, flying: true,
					initial: [{s:1,p:55},{s:-1,p:200}] },

				46: { name:'free-eagle', aspect:'sh-freeeagle', abbrev:'FE', fenAbbrev:'Q!', value:11,
					graph: MG(this.cbQueenGraph(geometry),SR(JUMP2),SR(DIAG,hitrun)),
					initial: [{s:1,p:40},{s:-1,p:215}] },

				47: { name:'lion-hawk', aspect:'sh-lionhawk', abbrev:'LH', fenAbbrev:'L!', value:14,
					graph: MG(Lion(),this.cbBishopGraph(geometry)),
					initial: [{s:1,p:39},{s:-1,p:216}] },

				48: { name:'fire-demon', aspect:'sh-demon', abbrev:'FD', fenAbbrev:'F!', value:40,
					graph: MG(LR(DEMON_SLIDE,burning),AreaHook()),
					initial: [{s:1,p:38},{s:1,p:41},{s:-1,p:214},{s:-1,p:217}] },

				49: { name:'king', aspect:'sh-king', abbrev:'K', isKing:true, ranking: 7,
					graph: this.cbKingGraph(geometry),
					initial: [{s:1,p:7},{s:-1,p:248}] },

				// ---- promoted pieces -------------------------------------------

				50: { name:'tokin-w', aspect:'sh-tokin', abbrev:'+P', value:1.1,
					graph: SR([[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1]]) },
				51: { name:'tokin-b', aspect:'sh-tokin', abbrev:'+P', value:1.1,
					graph: SR([[0,1],[0,-1],[1,0],[-1,0],[1,-1],[-1,-1]]) },

				52: { name:'white-horse-w', aspect:'sh-whitehorse', abbrev:'+L', value:5.25,
					graph: LR([[0,1],[0,-1],[1,1],[-1,1]]) },
				53: { name:'white-horse-b', aspect:'sh-whitehorse', abbrev:'+L', value:5.25,
					graph: LR([[0,1],[0,-1],[1,-1],[-1,-1]]) },

				54: { name:'side-soldier2-w', aspect:'sh-promotion-sidesol', abbrev:'+N', fenAbbrev:'+J', value:3,
					graph: MG(LR(SIDE),SR([[0,-1]]),LR([[0,1]],null,2)) },
				55: { name:'side-soldier2-b', aspect:'sh-promotion-sidesol', abbrev:'+N', fenAbbrev:'+J', value:3,
					graph: MG(LR(SIDE),SR([[0,1]]),LR([[0,-1]],null,2)) },

				56: { name:'vertical-soldier2-w', aspect:'sh-promotion-vertsol', abbrev:'+I', value:3,
					graph: MG(LR([[0,1]]),SR([[0,-1]]),LR(SIDE,null,2)) },
				57: { name:'vertical-soldier2-b', aspect:'sh-promotion-vertsol', abbrev:'+I', value:3,
					graph: MG(LR([[0,-1]]),SR([[0,1]]),LR(SIDE,null,2)) },

				58: { name:'side-mover2', aspect:'sh-promotion-sweeper', abbrev:'+C', value:2.5,
					graph: MG(LR(SIDE),SR(VERT)) },

				59: { name:'vertical-mover2', aspect:'sh-promotion-climber', abbrev:'+S', value:2.5,
					graph: MG(LR(VERT),SR(SIDE)) },

				60: { name:'rook2', aspect:'sh-promotion-rook', abbrev:'+G', value:5,
					graph: this.cbRookGraph(geometry) },

				61: { name:'flying-stag', aspect:'sh-stag', abbrev:'+BT', fenAbbrev:'+T', value:4,
					graph: MG(LR(VERT),SR([[1,0],[-1,0]].concat(DIAG))) },

				62: { name:'crown-prince', aspect:'sh-prince', abbrev:'+DE', fenAbbrev:'+E',
					// second royal piece: the game is only lost when BOTH the King
					// and the Crown Prince are gone (base-model multi-royal path),
					// exactly like Chu Shogi's crown prince.
					isKing: 2, ranking: 7, value: 100,
					graph: this.cbKingGraph(geometry) },

				63: { name:'multi-general-w', aspect:'sh-promotion-multigen', abbrev:'+D', fenAbbrev:'+U', value:4,
					graph: MG(LR([[0,1]]),LR([[1,-1],[-1,-1]])) },
				64: { name:'multi-general-b', aspect:'sh-promotion-multigen', abbrev:'+D', fenAbbrev:'+U', value:4,
					graph: MG(LR([[0,-1]]),LR([[1,1],[-1,1]])) },

				65: { name:'bishop2', aspect:'sh-promotion-bishop', abbrev:'+FL', fenAbbrev:'+F', value:4,
					graph: this.cbBishopGraph(geometry) },

				66: { name:'lion2', aspect:'sh-promotion-lion', abbrev:'+KN', fenAbbrev:'+O', value:12,
					graph: Lion() },

				67: { name:'queen2', aspect:'sh-promotion-queen', abbrev:'+PH', fenAbbrev:'+X', value:9.5,
					graph: this.cbQueenGraph(geometry) },

				68: { name:'whale-w', aspect:'sh-whale', abbrev:'+RV', fenAbbrev:'+A', value:4.5,
					graph: LR([[0,1],[0,-1],[1,-1],[-1,-1]]) },
				69: { name:'whale-b', aspect:'sh-whale', abbrev:'+RV', fenAbbrev:'+A', value:4.5,
					graph: LR([[0,1],[0,-1],[1,1],[-1,1]]) },

				70: { name:'free-boar', aspect:'sh-freeboar', abbrev:'+SM', fenAbbrev:'+M', value:7.5,
					graph: LR(DIAG.concat(SIDE)) },

				71: { name:'flying-ox', aspect:'sh-flyingox', abbrev:'+VM', fenAbbrev:'+V', value:8,
					graph: LR(DIAG.concat(VERT)) },

				72: { name:'water-buffalo2', aspect:'sh-promotion-buffalo', abbrev:'+SS', fenAbbrev:'+Y', value:9,
					graph: MG(this.cbBishopGraph(geometry),LR(SIDE),LR(VERT,null,2)) },

				73: { name:'chariot-soldier2', aspect:'sh-promotion-chariot', abbrev:'+VS', fenAbbrev:'+Z', value:7,
					graph: MG(this.cbBishopGraph(geometry),LR(VERT),LR(SIDE,null,2)) },

				74: { name:'dragon-horse2', aspect:'sh-promotion-horse', abbrev:'+B', value:5.5,
					graph: MG(this.cbBishopGraph(geometry),SR(ORTH)) },

				75: { name:'dragon-king2', aspect:'sh-promotion-dragon', abbrev:'+R', value:7,
					graph: MG(this.cbRookGraph(geometry),SR(DIAG)) },

				76: { name:'falcon2-w', aspect:'sh-promotion-falcon', abbrev:'+DH', fenAbbrev:'+H', value:8.5,
					graph: MG(SR([[0,1],[0,2]]),SR([[0,1]],igui),SR([[0,2]],locust),
						LR([[1,0],[-1,0],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])) },
				77: { name:'falcon2-b', aspect:'sh-promotion-falcon', abbrev:'+DH', fenAbbrev:'+H', value:8.5,
					graph: MG(SR([[0,-1],[0,-2]]),SR([[0,-1]],igui),SR([[0,-2]],locust),
						LR([[1,0],[-1,0],[0,1],[1,1],[1,-1],[-1,1],[-1,-1]])) },

				78: { name:'eagle2-w', aspect:'sh-promotion-eagle', abbrev:'+DK', fenAbbrev:'+D', value:9,
					graph: MG(SR([[1,1],[-1,1],[2,2],[-2,2]]),SR([[1,1],[-1,1]],igui),
						SR([[2,2],[-2,2]],locust),
						LR([[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,-1]])) },
				79: { name:'eagle2-b', aspect:'sh-promotion-eagle', abbrev:'+DK', fenAbbrev:'+D', value:9,
					graph: MG(SR([[1,-1],[-1,-1],[2,-2],[-2,-2]]),SR([[1,-1],[-1,-1]],igui),
						SR([[2,-2],[-2,-2]],locust),
						LR([[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1]])) },

				80: { name:'lion-hawk2', aspect:'sh-lionhawk', abbrev:'+LN', fenAbbrev:'+N!', value:14,
					graph: MG(Lion(),this.cbBishopGraph(geometry)) },

				81: { name:'free-eagle2', aspect:'sh-freeeagle', abbrev:'+FK', fenAbbrev:'+Q', value:11,
					graph: MG(this.cbQueenGraph(geometry),SR(JUMP2),SR(DIAG,hitrun)) },

				82: { name:'bishop-general2', aspect:'sh-promotion-bishgen', abbrev:'+HF', fenAbbrev:'+H!', value:12,
					graph: LR(DIAG,flying), ranking: 1, flying: true },

				83: { name:'rook-general2', aspect:'sh-promotion-rookgen', abbrev:'+SE', fenAbbrev:'+D!', value:14,
					graph: LR(ORTH,flying), ranking: 1, flying: true },

				84: { name:'vice-general2', aspect:'sh-promotion-vicegen', abbrev:'+BG', fenAbbrev:'+B!', value:16,
					graph: MG(LR(DIAG,flying),AreaHook()), ranking: 3, flying: true },

				85: { name:'great-general2', aspect:'sh-promotion-greatgen', abbrev:'+RG', fenAbbrev:'+R!', value:20,
					graph: LR(ADJ,flying), ranking: 5, flying: true },

				86: { name:'fire-demon2', aspect:'sh-promotion-demon', abbrev:'+WB', fenAbbrev:'+W', value:40,
					graph: MG(LR(DEMON_SLIDE,burning),AreaHook()) },

				87: { name:'tetrarch', aspect:'sh-promotion-tetrarch', abbrev:'+CS', fenAbbrev:'+C!', value:10,
					graph: MG(Ski(DIAG,Infinity),Ski(VERT,Infinity),Ski(SIDE,2),SR(ADJ,igui)) },
			},

			// Optional promotion in the last 5 ranks: when entering the zone, or
			// when starting inside it and capturing (same rule as Chu Shogi).
			promote: function(aGame,piece,move) {
				var promoted=PROMOTION[piece.t];
				if(promoted===undefined)
					return [];
				if(piece.s<0)
					promoted=PROMOTION_B[piece.t]!==undefined ? PROMOTION_B[piece.t] : promoted;
				var rankFrom=geometry.R(move.f), rankTo=geometry.R(move.t);
				if(piece.s==1) {
					if(rankTo==15 && STUCK_LAST[piece.t]) return [promoted];
					if(rankTo==14 && STUCK_LAST2[piece.t]) return [promoted];
					if(rankTo<11 && rankFrom<11) return [];   // never in the zone
					if(rankFrom>=11 && move.c==null) return []; // was already in, no capture
				} else {
					if(rankTo==0 && STUCK_LAST[piece.t]) return [promoted];
					if(rankTo==1 && STUCK_LAST2[piece.t]) return [promoted];
					if(rankTo>4 && rankFrom>4) return [];
					if(rankFrom<=4 && move.c==null) return [];
				}
				return [piece.t, promoted];
			},

			evaluate: function(aGame,evalValues,material,totalPieces) {
				// 50 moves without capture: draw (as in Chu Shogi)
				if(this.noCaptCount>=100) {
					this.mFinished=true;
					this.mWinner=JocGame.DRAW;
				}
			},
		};
	}

	// ---- area moves ---------------------------------------------------------
	// Called by locust-move-model for the [[0,0]] AreaHook candidate: walk up to
	// 3 King steps through empty squares, stopping on the first capture. Fire
	// Demon area moves burn (kill:-1) like its slides.
	Model.Board.customGen = function(moves, move, board, aGame) {
		var index=board.board[move.f];
		if(index<0)
			return;
		var piece=board.pieces[index];
		var steps=AREA_STEPS[piece.t];
		if(!steps)
			return;
		var burns=IS_DEMON[piece.t];
		var who=piece.s;
		var seen={};
		seen[move.f]=true;
		var frontier=[move.f];
		for(var step=0;step<steps;step++) {
			var next=[];
			for(var i=0;i<frontier.length;i++) {
				var nb=aGame.burnZone[frontier[i]];
				for(var j=0;j<nb.length;j++) {
					var to=nb[j][0] & 0xffff;
					if(seen[to])
						continue;
					seen[to]=true;
					var index1=board.board[to];
					if(index1<0) {
						var m={ f:move.f, t:to, c:null, a:move.a };
						if(burns) m.kill=-1;
						moves.push(m);
						next.push(to); // empty: the walk may continue
					} else if(board.pieces[index1].s!=who) {
						var m1={ f:move.f, t:to, c:index1, a:move.a, ep:false };
						if(burns) m1.kill=-1;
						moves.push(m1); // capture: the walk stops here
					}
				}
			}
			frontier=next;
		}
	}

	// ---- Fire Demon burning -------------------------------------------------

	// Fire Demons and Vice Generals are the only pieces the hooks below have to
	// look for, and there are at most a handful of them. Scanning the 156 pieces
	// on every single attacker query was by far the most expensive thing in the
	// search, so the indices are kept in a list: rebuilt once per move
	// generation (and after a board copy, which does not carry it over),
	// completed on the spot when a promotion creates a new Fire Demon, and
	// re-validated on use so that captured or burned pieces simply drop out.
	function Burners(board) {
		var list=board.cbBurners;
		if(list===undefined) {
			list=board.cbBurners=[];
			var pieces=board.pieces;
			for(var i=0;i<pieces.length;i++)
				if(pieces[i].p>=0 && (IS_DEMON[pieces[i].t] || AREA_STEPS[pieces[i].t]))
					list.push(i);
		}
		return list;
	}

	function TrackBurner(board,index) { // a promotion may create one
		var list=board.cbBurners;
		if(list!==undefined && list.indexOf(index)<0)
			list.push(index);
	}

	// Is there an enemy Fire Demon next to `pos`? `ignore` is the square of a
	// locust victim that this very move removes (it cannot burn any more).
	function BurnedOnArrival(board,aGame,pos,who,ignore) {
		var burners=Burners(board), demons=false;
		for(var i=0;i<burners.length;i++) {
			var piece0=board.pieces[burners[i]];
			if(piece0.p>=0 && piece0.s!=who && IS_DEMON[piece0.t]) {
				demons=true;
				break;
			}
		}
		if(!demons)
			return false;
		var bz=aGame.burnZone[pos];
		for(var i=0;i<bz.length;i++) {
			var sqr=bz[i][0] & 0xffff;
			if(sqr===ignore)
				continue;
			var index=board.board[sqr];
			if(index>=0) {
				var piece=board.pieces[index];
				if(piece.s!=who && IS_DEMON[piece.t])
					return true;
			}
		}
		return false;
	}

	// A move landing next to an enemy Fire Demon burns the piece that made it,
	// and this has PRIORITY over the moving piece's own burn: a Fire Demon
	// moving next to another Demon dies without burning anything. What such a
	// move captured stays captured. Returns a copy of the move without its own
	// burn request when the burn has to be suppressed.
	function SuppressOwnBurn(move) {
		var copy={};
		for(var field in move)
			if(move.hasOwnProperty(field))
				copy[field]=move[field];
		delete copy.kill;
		return copy;
	}

	var OriginalQuickApply = Model.Board.cbQuickApply;
	Model.Board.cbQuickApply = function(aGame,move) {
		var index=this.board[move.f];
		var piece=this.pieces[index];
		var burned=BurnedOnArrival(this,aGame,move.t,piece.s,
			move.kill>=0 ? move.via : -1);
		var undo=burned && move.kill===-1
			? OriginalQuickApply.call(this,aGame,SuppressOwnBurn(move))
			: OriginalQuickApply.apply(this,arguments);
		if(move.pr!==undefined && (IS_DEMON[move.pr] || AREA_STEPS[move.pr]))
			TrackBurner(this,index);
		if(burned) {
			this.board[move.t]=-1;
			piece.p=-1;
			// runs before the mover's own undo entry, which puts it back on move.f
			undo.unshift({ i:index, f:-1, t:move.t });
		}
		return undo;
	}

	var OriginalApplyMove = Model.Board.ApplyMove;
	Model.Board.ApplyMove = function(aGame,move) {
		var index=this.board[move.f];
		var piece=this.pieces[index];
		var burned=BurnedOnArrival(this,aGame,move.t,piece.s,
			move.kill>=0 ? move.via : -1);
		if(burned && move.kill===-1)
			OriginalApplyMove.call(this,aGame,SuppressOwnBurn(move));
		else
			OriginalApplyMove.apply(this,arguments);
		if(move.pr!==undefined && (IS_DEMON[move.pr] || AREA_STEPS[move.pr]))
			TrackBurner(this,index);
		if(burned) {
			this.zSign^=aGame.bKey(piece);
			this.board[piece.p]=-1;
			piece.p=-1;
			piece.m=true;
			this.noCaptCount=0;
		}
	}

	// ---- move list post-processing -----------------------------------------
	var OriginalMoveGen = Model.Board.cbGeneratePseudoLegalMoves;
	Model.Board.cbGeneratePseudoLegalMoves = function(aGame) {
		delete this.cbBurners; // rebuilt below, from the position as it is now
		Burners(this);
		var moves=OriginalMoveGen.apply(this,arguments);
		var seen={}, result=[];
		for(var i=0;i<moves.length;i++) {
			var move=moves[i];
			// a Water Buffalo promoting to Fire Demon burns immediately
			if(move.pr!==undefined && IS_DEMON[move.pr] && move.kill===undefined)
				move.kill=-1;
			// The same destination can be reached by a slide AND by an area move,
			// or by a slide AND by a 5x5 Lion/Free Eagle jump: keep one of them.
			// Almost every move is already unique on (from,to), so that cheap
			// integer key is tried first and the full comparison only happens for
			// the few moves that really share a destination.
			var key=move.f*256+move.t, same=seen[key];
			if(same===undefined)
				seen[key]=[move];
			else {
				var duplicate=false;
				for(var j=0;j<same.length;j++) {
					var move1=same[j];
					if(move1.pr===move.pr && move1.c===move.c &&
					   move1.via===move.via && move1.kill===move.kill) {
						duplicate=true;
						break;
					}
				}
				if(duplicate)
					continue;
				same.push(move);
			}
			result.push(move);
		}
		return result;
	}

	// ---- check test ---------------------------------------------------------
	// The static threat graph knows nothing about area moves, nor about the fact
	// that a Fire Demon kills everything NEXT TO the square it moves to. Both
	// matter for royal safety, so they are added here. Only done for royal
	// squares (isKing set), where correctness is required.
	function Chebyshev(pos1,pos2) {
		return Math.max(Math.abs(geometry.C(pos1)-geometry.C(pos2)),
				Math.abs(geometry.R(pos1)-geometry.R(pos2)));
	}

	// Squares an area mover standing on `from` can reach (empty squares are
	// walked through, an enemy square is a target but stops the walk).
	function AreaTargets(board,aGame,from,who,steps) {
		var seen={}, targets=[], frontier=[from];
		seen[from]=true;
		for(var step=0;step<steps;step++) {
			var next=[];
			for(var i=0;i<frontier.length;i++) {
				var nb=aGame.burnZone[frontier[i]];
				for(var j=0;j<nb.length;j++) {
					var to=nb[j][0] & 0xffff;
					if(seen[to])
						continue;
					seen[to]=true;
					var index=board.board[to];
					if(index<0) {
						targets.push(to);
						next.push(to);
					} else if(board.pieces[index].s!=who)
						targets.push(to);
				}
			}
			frontier=next;
		}
		return targets;
	}

	// The Demon burns `pos` if it can move to pos or to any square next to it,
	// either by walking (its area move) or by sliding.
	function DemonWalksTo(board,aGame,demon,pos) {
		var targets=AreaTargets(board,aGame,demon.p,demon.s,3);
		for(var i=0;i<targets.length;i++)
			if(Chebyshev(targets[i],pos)<=1)
				return true;
		return false;
	}

	// Can a slide from `from` in direction `delta` end up within one square of
	// `pos`? Cheap test on the projection of pos onto the line, so that only the
	// one or two useful directions out of six are actually walked.
	function RayComesNear(from,pos,delta) {
		var dc=geometry.C(pos)-geometry.C(from), dr=geometry.R(pos)-geometry.R(from);
		var k=Math.round((dc*delta[0]+dr*delta[1])/(delta[0]*delta[0]+delta[1]*delta[1]));
		for(var i=-1;i<=1;i++) {
			var k1=k+i;
			if(k1<0)
				continue;
			if(Math.abs(dc-k1*delta[0])<=1 && Math.abs(dr-k1*delta[1])<=1)
				return true;
		}
		return false;
	}

	function DemonSlidesTo(board,aGame,demon,pos) {
		for(var d=0;d<DEMON_SLIDE.length;d++) {
			if(!RayComesNear(demon.p,pos,DEMON_SLIDE[d]))
				continue;
			var pos1=geometry.Graph(demon.p,DEMON_SLIDE[d]);
			while(pos1!=null) {
				var index=board.board[pos1];
				if(index>=0 && board.pieces[index].s==demon.s)
					break; // blocked by a friend
				if(Chebyshev(pos1,pos)<=1)
					return true;
				if(index>=0)
					break; // capture: the slide stops here
				pos1=geometry.Graph(pos1,DEMON_SLIDE[d]);
			}
		}
		return false;
	}

	var OriginalGetAttackers = Model.Board.cbGetAttackers;
	Model.Board.cbGetAttackers = function(aGame,pos,who,isKing) {
		var attackers=OriginalGetAttackers.apply(this,arguments);
		if(!isKing)
			return attackers;
		var burners=Burners(this), dist=aGame.g.distGraph[pos];
		for(var i=0;i<burners.length;i++) {
			var piece=this.pieces[burners[i]];
			if(piece.p<0 || piece.s==who)
				continue;
			if(IS_DEMON[piece.t]) {
				// walking 3 King steps and burning one square further: past that
				// distance only a slide can bring the Demon into burning range
				if((dist[piece.p]<=4 && DemonWalksTo(this,aGame,piece,pos)) ||
				   DemonSlidesTo(this,aGame,piece,pos))
					attackers.push(piece);
			} else if(dist[piece.p]<=AREA_STEPS[piece.t]) {
				var targets=AreaTargets(this,aGame,piece.p,piece.s,AREA_STEPS[piece.t]);
				for(var j=0;j<targets.length;j++)
					if(targets[j]==pos) {
						attackers.push(piece);
						break;
					}
			}
		}
		return attackers;
	}

})();
