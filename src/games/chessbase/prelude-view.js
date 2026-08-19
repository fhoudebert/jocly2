/*
 * Copyright(c) 2013-2014 - jocly.com
 *
 * You are allowed to use and modify this source code as long as it is exclusively for use in the Jocly API. 
 *
 * Original authors: Jocly team
 *
 */
 

(function() {

	/*
	 * A setup string is a row of piece abbrevs, rows separated by '/'. It used
	 * to be read one character per icon, which is fine for a game whose pieces
	 * are all called "K", "Q", "R" - and hopeless for a Shogi set, where half
	 * of them are "+P", "+DE" and the like. So the row is tokenised instead,
	 * longest abbrev first, the way a FEN is read. A space is an empty cell.
	 */
	function Tokens(aGame,row) {
		var abbrevs=[], types=aGame.cbVar.pieceTypes;
		for(var t in types) {
			var abbrev=types[t].abbrev || types[t].fenAbbrev;
			if(abbrev && abbrevs.indexOf(abbrev)<0)
				abbrevs.push(abbrev);
		}
		abbrevs.sort(function(a,b) { return b.length-a.length; }); // longest first
		var out=[];
		for(var i=0; i<row.length; ) {
			if(row.charAt(i)==' ') { out.push(' '); i++; continue; }
			var found=null;
			for(var j=0; j<abbrevs.length; j++)
				if(row.substr(i,abbrevs[j].length)==abbrevs[j]) { found=abbrevs[j]; break; }
			if(!found) { out.push(row.charAt(i)); i++; }   // unknown: one character
			else { out.push(found); i+=found.length; }
		}
		return out;
	}

	function ButtonSize(aGame,miniFEN) {
		var rows=miniFEN.split('/');
		var w=0;
		rows.forEach(function(row) { w=Math.max(w,Tokens(aGame,row).length); });
		return {w:w, h:rows.length, s:rows.length*w};
	}

	/*
	 * The sprite for one piece of a setup button, taken from the game's own
	 * piece set rather than from a fixed sheet. cbPromoSpec resolves the same
	 * layered 2D spec the board uses - the sheet from the "default" entry, the
	 * column from the piece's aspect, the row from the side, and any override
	 * carried by the selected skin - so a game whose pieces are not on
	 * wikipedia-fairy-sprites.png, a Shogi set for instance, gets its own.
	 *
	 * The id is a piece abbrev, optionally prefixed by "b" to ask for the
	 * black one: "K" is a white King, "bK" a black one.
	 */
	function PieceSprite(aGame,xdv,id) {
		var who=1;
		if(id.charAt(0)=='b' && id.length>1)
			who=-1, id=id.substr(1);
		var types=aGame.cbVar.pieceTypes;
		for(var t in types) {
			var abbrev = types[t].abbrev || types[t].fenAbbrev;
			if(abbrev==id) {
				var aspect = types[t].aspect || types[t].name;
				var spec = aGame.cbPromoSpec(aGame,xdv,aspect,who);
				return {
					file: spec.file,
					x: spec.clipx || 0,
					y: spec.clipy || 0,
					w: spec.clipwidth || 100,
					h: spec.clipheight || 100,
				};
			}
		}
	}
	
	/*
	 * View.Game.xdInit overriding to create initial setup gadgets 
	 */
	var SuperViewGameXdInit = View.Game.xdInit;
	View.Game.xdInit = function(xdv) {
		var $this=this;
		SuperViewGameXdInit.apply(this,arguments);
		var dialogs=this.cbVar.prelude;
		for(var i=0; i<dialogs.length; i++) if(dialogs[i]) CreateDialog($this,xdv,i,dialogs[i]);
	}

	function CreateDialog(aGame,xdv,n,dialog) {
		var size=600;
		var setups=dialog.setups;
		if(!setups) return; // should not happen
		var buttonDim=ButtonSize(aGame,setups[0]);  // assume all buttons equally large
		var bg=dialog.panelBackground;
		var width = dialog.panelWidth || Math.ceil(Math.sqrt((buttonDim.h+1)*setups.length/(buttonDim.w+1)));
		var w=size*width*(buttonDim.w+1);
		var h=size*Math.ceil(setups.length/width)*(buttonDim.h+1);
		var panelDef={ // selection panel
			base: {
				type: (bg ? "image" : "element"),
				x: 0,
				y: 0,
				width: w,
				height: h,
				z: 108,
			},
		};
		if(bg) {
			panelDef.base.file = aGame.g.fullPath+bg;
		} else panelDef.base.css={"background-color": "White"};
		xdv.createGadget("setup"+n+"-board",panelDef);
		for(var setup in setups) {
			(function(setup) {
				var w=width, h=Math.ceil(setups.length/w);
				var x=((setup%w)-(w-1)/2)*(buttonDim.w+1)*size; // setups layed out in 4x3 pattern of blocks of 3x3 icons
				var y=(Math.floor(setup/w)-h/2+0.5)*(buttonDim.h+1)*size;
				xdv.createGadget("setup"+n+"#"+setup,{	// this creates a clickable block of icons
					base: {
						type: "canvas",
						x: x,
						y: y,
						width: buttonDim.w*size,
						height: buttonDim.h*size,
						z: 109,
						draw: function(ctx) {
							ctx.fillStyle="#c0c0c0";
							ctx.rect(-size*buttonDim.w/2,-size*buttonDim.h/2,size*buttonDim.w,size*buttonDim.h);
							ctx.fill();
							ctx.save();
							var $gadget=this;
							var rows=setups[setup].split('/').map(function(row) { return Tokens(aGame,row); });
							for(var i=0;i<buttonDim.s;i++) { // layout icons for this setup as a block
								var x=i%buttonDim.w, y=Math.floor(i/buttonDim.w);
								var p=(rows[y]||[])[x];
								if(!p || p==' ')
									continue;
								var sprite=PieceSprite(aGame,xdv,p);
								if(!sprite || !sprite.file)
									continue;
								(function(sprite,x,y) {
									$gadget.getResource("image|"+sprite.file,function(image) {
										ctx.drawImage(image,sprite.x,sprite.y,sprite.w,sprite.h,
												(x-buttonDim.w/2)*size,(y-buttonDim.h/2)*size,size,size);
									});
								})(sprite,x,y);
							}
							ctx.restore();
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
		if(this.lastMove.f==-2) { // in prelude
			var stage=this.lastMove.t;
			var dialog=aGame.cbVar.prelude[stage];
			if(!dialog || dialog.persistent && dialog.persistent!==true)
				return {
					initial: {},
					getActions: function(moves,currentInput) { return null; },
				}
			return {
				initial: {
					setupDone: false,
				},
				getActions: function(moves,currentInput) { 
					var actions={};
					if(!currentInput.setupDone) {
						moves.forEach(function(move) {
							actions[move.setup]={
								view: ["setup"+stage+"#"+move.setup],
								click: ["setup"+stage+"#"+move.setup],
								moves: [move],
								validate: { setupDone: true },
							}
						});
					}
					return actions;
				},
				furnitures: ["setup"+stage+"-board"],
			}
		} else
			return SuperViewBoardxdInput.apply(this,arguments);
	}
	
	/*
	 * View.Board.cbAnimate overriding to prevent animation on setup
	 */
	var SuperViewBoardcbAnimate = View.Board.cbAnimate;
	View.Board.cbAnimate = function(xdv,aGame,aMove,callback) {
		if(this.lastMove.f===-2)
			callback();
		else
			SuperViewBoardcbAnimate.apply(this,arguments);
	}
	
})();

