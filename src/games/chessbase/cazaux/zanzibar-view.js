/*
 * Copyright(c) 2013-2014 - jocly.com
 *
 * You are allowed to use and modify this source code as long as it is exclusively for use in the Jocly API. 
 *
 * Original authors: Jocly team
 *
 */
 

(function() {
	
	View.Game.cbDefineView = function() {

		var metamachyBoardDelta = {
			//notationMode: 'in',
			//notationDebug: true,
		};		
		var metamachyBoard3d = $.extend(true,{},this.cbGridBoardClassic3DMargin,metamachyBoardDelta);
		var metamachyBoard2d = $.extend(true,{},this.cbGridBoardClassic2DNoMargin,metamachyBoardDelta);
		
		return {
			coords: {
				"2d": this.cbGridBoard.coordsFn.call(this,metamachyBoard2d),
				"3d": this.cbGridBoard.coordsFn.call(this,metamachyBoard3d),
			},
			boardLayout: [
	      	".#.#.#.#.#.#",
	     		"#.#.#.#.#.#.",
	      	".#.#.#.#.#.#",
	     		"#.#.#.#.#.#.",
	      	".#.#.#.#.#.#",
	     		"#.#.#.#.#.#.",
	      	".#.#.#.#.#.#",
	     		"#.#.#.#.#.#.",
	      	".#.#.#.#.#.#",
	     		"#.#.#.#.#.#.",
			".#.#.#.#.#.#",
	     		"#.#.#.#.#.#.",
			],
			board: {
				"2d": {
					draw: this.cbDrawBoardFn(metamachyBoard2d),										
				},
				"3d": {
					display: this.cbDisplayBoardFn(metamachyBoard3d),					
				},
			},
			clicker: {
				"2d": {
					width: 1000,
					height: 1000,
				},
				"3d": {
					scale: [.6,.6,.6],
				},
			},
			pieces: this.cbFairyPieceStyle({
				"default": {
					"3d": {
						scale: [.4,.4,.4],
					},
					"2d": {
						width: 900,
						height: 900,
					},
				},
			}),
		};
	}

	/*
	 * No cbMoveMidZ here on purpose.
	 *
	 * This view used to override it with a table of piece letters: jump when
	 * the distance is more than one, jump when the move is oblique, jump when
	 * a screen piece captures, slide otherwise. grid-board-view.js now derives
	 * all of that from the piece graphs themselves, and derives more: a
	 * destination reached as the first step of a path is a leap and jumps,
	 * a screen capture jumps, and a path whose legs are not in line - the
	 * Eagle's diagonal step then straight ray, the Rhinoceros' straight step
	 * then diagonal ray, the Ship, the Snake - gets a BENT trajectory that
	 * follows the two legs instead of cutting the corner.
	 *
	 * The hand-written version cannot express that bend: it only ever answered
	 * "jump" or "slide straight". Keeping it made those pieces either glide
	 * through squares they never visit or hop over the whole move.
	 */

	/*
	 * View.Game.xdInit overriding to create initial setup gadgets 
	 */
	var SuperViewGameXdInit = View.Game.xdInit;
	View.Game.xdInit = function(xdv) {
		var $this=this;
		SuperViewGameXdInit.apply(this,arguments);
		var size=600;
		xdv.createGadget("setup-board",{
			base: {
				type: "element",
				x: 0,
				y: 0,
				width: size*12,
				height: size*9,
				z: 108,
				css: {
					"background-color": "White",
				},
			},
		});
		var setups={
			0: "KQELF",1: "KQLEF",2: "KEQLF",3: "KLQEF",4: "KELQF",5: "KLEQF",6: "QEKLF",7: "QLKEF",8: "EQKLF",9: "LQKEF",10: "ELKQF",11: "LEKQF",
            12: "KQELU",13: "KQLEU",14: "KEQLU",15: "KLQEU",16: "KELQU",17: "KLEQU",18: "QEKLU",19: "QLKEU",20: "EQKLU",21: "LQKEU",22: "ELKQU",23: "LEKQU",
		}
		var imageOffsets={
			K: 500, Q: 400, E: 1100, L: 1200,
		}
		for(var setup in setups) {
			(function(setup) {
				var x=((setup%4)-1.5)*3*size;
				var y=(Math.floor(setup/4)-1)*3*size;


				xdv.createGadget("setup#"+setup,{
					base: {
						type: "canvas",
						x: x,
						y: y,
						width: 2*size,
						height: 2*size,
						z: 109,
						draw: function(ctx) {
							ctx.fillStyle="#c0c0c0";
							ctx.rect(-size,-size,size*2,size*2);
							ctx.fill();
							ctx.save();
							this.getResource("image|"+$this.g.fullPath+"/res/fairy/wikipedia-fairy-sprites.png",function(image) {
								for(var i=0;i<4;i++) {
									var x=i%2, y=Math.floor(i/2), p=setups[setup].charAt(i);
									ctx.drawImage(image,imageOffsets[p],0,100,100,(x-1)*size,(y-1)*size,size,size);
								}
								ctx.restore();
							});
						}
					},
				});				
			})(setup);

		}
	}
	
	/*
	 * View.Board.xdInput overriding to handle setup phase
	 */
	var SuperViewBoardxdInput = View.Board.xdInput;
	View.Board.xdInput = function(xdv, aGame) {

		if(this.setupState===undefined) {
			return {
				initial: {},
				getActions: function(moves,currentInput) { return null; },
			}
		} else if(this.setupState=="setup") {
			return {
				initial: {
					setupDone: false,
				},
				getActions: function(moves,currentInput) { 
					var actions={};
					if(!currentInput.setupDone) {
						moves.forEach(function(move) {
							actions[move.setup]={
								view: ["setup#"+move.setup],
								click: ["setup#"+move.setup],
								moves: [move],
								validate: { setupDone: true },
							}
						});
					}
					return actions;
				},
				furnitures: ["setup-board"],
			}
		} else
			return SuperViewBoardxdInput.apply(this,arguments);
	}
	
	/*
	 * View.Board.cbAnimate overriding to prevent animation on setup
	 */
	var SuperViewBoardcbAnimate = View.Board.cbAnimate;
	View.Board.cbAnimate = function(xdv,aGame,aMove,callback) {
		if(this.setupState===undefined || this.setupState=="setup"){

			callback();
        }else
			SuperViewBoardcbAnimate.apply(this,arguments);
	}
	
	/*
	 * View.Board.xdDisplay overriding to prevent displaying KQELFU before setup
	 */
	var SuperViewBoardxdDisplay = View.Board.xdDisplay;
	View.Board.xdDisplay = function(xdv, aGame) {

		if(this.setupState===undefined || this.setupState=="setup") {
			var $this=this;
			var hidden={};
			[4,5,6,7,17,18,125,126,136,137,138,139].forEach(function(pos) {
				var pIndex=$this.board[pos];
				hidden[pos]=pIndex;
				$this.pieces[pIndex].p=-1;
			});
			SuperViewBoardxdDisplay.apply(this,arguments);
			for(var pos in hidden)
				this.pieces[hidden[pos]].p=parseInt(pos);			
		} else
			SuperViewBoardxdDisplay.apply(this,arguments);
	}
	


})();

