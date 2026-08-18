(function(){

	View.Board.xdInput = function(xdv, aGame) {

		function HidePromo() {
			xdv.updateGadget("promo-board",{
				base: {
					visible: false,
				}
			});
			xdv.updateGadget("promo-cancel",{
				base: {
					visible: false,
				}
			});
		}
		
		return {
			initial: {
				f: null,
				t: null,
				pr: null,
				via: null,
			},
			getActions: function(moves,currentInput) {
				var animSpeed = 600;
				var actions={};
				if(currentInput.f==null) {
					moves.forEach(function(move) {
						if(actions[move.f]===undefined)
							actions[move.f]={
								f: move.f,
								moves: [],
								click: ["piece#"+this.board[move.f],"clicker#"+move.f],
								view: ["clicker#"+move.f],
								highlight: function(mode) {
									xdv.updateGadget("cell#"+move.f,{
										"2d": {
											classes: mode=="select"?"cb-cell-select":"cb-cell-cancel",
											opacity: aGame.mShowMoves || mode=="cancel"?1:0,
										}
									});
									xdv.updateGadget("clicker#"+move.f,{
										"3d": {
											materials: {
												ring: {
													color: mode=="select"?aGame.cbTargetSelectColor:aGame.cbTargetCancelColor,
													opacity: aGame.mShowMoves || mode=="cancel"?1:0,
													transparent: aGame.mShowMoves || mode=="cancel"?false:true,
												},
											},
											castShadow: aGame.mShowMoves || mode=="cancel",
										},
									});
								},
								unhighlight: function() {
									xdv.updateGadget("cell#"+move.f,{
										"2d": {
											classes: "",
										}
									});
								},
								validate: {
									f: move.f,
								},
							}
						actions[move.f].moves.push(move);
					},this);
				} else if(currentInput.t==null) {
					var ambigu = [];
					if(currentInput.via == null) {
						moves.forEach(function(move) {
							/*
							 * A move that ends where it started is a pass: the
							 * Lion stepping out and back, the Falcon and the
							 * Eagle doing the same on their ray. It is offered
							 * on its own gadget, not by clicking a square, and
							 * must not weigh on the square it steps through -
							 * counting it there made every one-square Lion
							 * move ambiguous, so a plain step needed a second
							 * click to confirm.
							 */
							if(move.t === move.f) return;
							var weight = 1, target = move.cg===undefined?move.t:move.cg;
							if(move.via !== undefined) target = move.via, weight = 64;
							if(ambigu[target] === undefined) ambigu[target] = 0;
							ambigu[target] += weight;
						})
					}
					moves.forEach(function(move) {
						var target = move.t;
						if(move.cg!==undefined) {
							var k=aGame.cbVar.castle[move.f+'/'+move.cg].k;
							if(k[k.length-1]==move.t) target=move.cg;
						}
						/*
						 * A pass - a move that ends where it began - keeps its
						 * own square as target rather than the one it steps
						 * through. Keyed under the square stepped through it
						 * would compete with the ordinary move to that square;
						 * keyed here it lands on the piece's own square, which
						 * is the gadget jocly binds to "cancel". So it is
						 * generated and playable by the engine, and out of the
						 * player's reach - see the note in chu-shogi-model.js.
						 */
						if(currentInput.via == null && move.via !== undefined && move.t !== move.f)
							target = move.via;
						if(actions[target]===undefined) {
							actions[target]={
								t: move.t,
								moves: [],
								click: ["piece#"+this.board[target],"clicker#"+target],
								view: ["clicker#"+target],
								highlight: function(mode) {
									xdv.updateGadget("cell#"+target,{
										"2d": {
											classes: mode=="select"?"cb-cell-select":"cb-cell-cancel",					
											opacity: aGame.mShowMoves || mode=="cancel"?1:0,
										},
									});
									xdv.updateGadget("clicker#"+target,{
										"3d": {
											materials: {
												ring: {
													color: mode=="select"?aGame.cbTargetSelectColor:aGame.cbTargetCancelColor,
													opacity: aGame.mShowMoves || mode=="cancel"?1:0,
													transparent: aGame.mShowMoves || mode=="cancel"?false:true,
												},
											},
											castShadow: aGame.mShowMoves || mode=="cancel",
										},
									});
								},
								unhighlight: function(mode) {
									xdv.updateGadget("cell#"+target,{
										"2d": {
											classes: "",
										}
									});
								},
								validate: {
									via: target,
								},
							}
							if(ambigu[target] > 64) // ambiguous click on locust square
								actions[target]['noAutoCancel'] = true; // no 'execute' before 3rd click resolves it
							else { // add fields for pure to-square (or third) clicks
								actions[target]['validate'] = { t: move.t };
								actions[target]['execute'] = (function(callback) {
									var $this=this;
									this.cbAnimate(xdv,aGame,move,function() {
										var promoMoves=actions[target].moves;
										if(promoMoves.length>1)
											// laid out by base-view: one copy of the grid, one place to fix
											aGame.cbShowPromo(xdv,aGame,promoMoves,$this.mWho);
										callback();
									});
								});
								actions[target]['unexecute'] = (function() {
									if(move.c!=null) {
										var piece1=this.pieces[move.c];
										var displaySpec1=aGame.cbMakeDisplaySpecForPiece(aGame,piece1.p,piece1);
										displaySpec1=$.extend(true,{
											base: {
												visible: true,
											},
											"2d": {
												opacity: 1,
											},
											"3d": {
												positionEasingUpdate: null,
											},
										},displaySpec1);
										xdv.updateGadget("piece#"+move.c,displaySpec1);
									}
									var piece=this.pieces[this.board[move.f]];
									var displaySpec=aGame.cbMakeDisplaySpecForPiece(aGame,piece.p,piece);
									xdv.updateGadget("piece#"+piece.i,displaySpec);
									HidePromo();
								});
							}
						}
						if(move.cg!==undefined) {
							actions[target].validate.cg=move.cg;
							actions[target].execute=function(callback) {
								this.cbAnimate(xdv,aGame,move,function() {
									callback();
								}, animSpeed);
							};
						}
						actions[target].moves.push(move);
					},this);
				} else if(currentInput.pr==null) {
					var promos=[];
					moves.forEach(function(move) {
						if(move.pr!==undefined) {
							if(actions[move.pr]===undefined) {
								actions[move.pr]={
									pr: move.pr,
									moves: [],
									click: ["promo#"+move.pr],
									//view: ["promo#"+move.pr],
									validate: {
										pr: move.pr,
									},
									cancel: ["promo-cancel"],
									post: HidePromo,
									skipable: true,
								}
								promos.push(move.pr);
							}
							actions[move.pr].moves.push(move);
						}
					},this);

					if(promos.length>1) // avoid loading the avatar if forced promotion (only 1 choice)
						promos.forEach(function(pr) {
							actions[pr].view=["promo#"+pr];
						});
				}
				return actions;
			},
		}
	}

  OriginalAnimate = View.Board.cbAnimate;
  View.Board.cbAnimate = function(xdv,aGame,aMove,callback){
    if(aMove.via !== undefined) {
			var $this = this;
			var firstLeg = {f: aMove.f, t: aMove.via, c: aMove.kill};
			var secondLeg = {f: aMove.via, t: aMove.t, c: aMove.c};
			OriginalAnimate.call(this,xdv,aGame,firstLeg,function(){
				$this.board[aMove.via] = $this.board[aMove.f];
				OriginalAnimate.call($this,xdv,aGame,secondLeg,callback,300);
				$this.board[aMove.via] = aMove.kill;
			},300);
		} else OriginalAnimate.apply(this, arguments);
  }
})();
