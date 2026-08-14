
(function() {

	View.Game.cbDefineView = function() {

		return {
			coords: {
				"2d": this.cbGridBoard.coordsFn.call(this,this.cbJanggiBoard2DMargin),
				"3d": this.cbGridBoard.coordsFn.call(this,this.cbJanggiBoard3DMargin),
			},
			boardLayout: [
	      		".........",
	    		".........",
	    		".........",
	    		".........",
	    		".........",
	    		".........",
	    		".........",
	    		".........",
	    		".........",
	    		".........",
			],
			board: {
				"2d": {
					draw: this.cbDrawBoardFn(this.cbJanggiBoard2DMargin),
				},
				"3d": {
					display: this.cbDisplayBoardFn(this.cbJanggiBoard3DMargin),
				},
			},
			clicker: {
				"2d": {
					width: 1100,
					height: 1100,
				},
				"3d": {
					scale: [.75,.75,.7],
				},
			},
			pieces: this.cbJanggiPieceStyle({
				'default': {
					"3d": {
						scale: [.5,.5,.5],
					},
					/*
						The one character skin that does not turn a counter
						over when its owner sits opposite the viewer. Every
						other skin follows the physical convention - see the
						note in janggi-set-view.js - which leaves one army
						upside down at all times; this keeps a board where
						all fourteen characters read the right way up, for
						players who prefer it that way.
					*/
					"skin3dwall": {
						rotate: 0,
					},
				},
			}),
		};
	}

	/*
		What hops and what slides. Unlike Xiangqi, the Cannon hops on every
		move, capture or not - it cannot move at all without a screen - so it
		is lifted whatever aMove.c holds. The Elephant is a leaper too, and a
		long one, so it gets a higher arc than the Horse.
	*/
	View.Board.cbMoveMidZ = function(aGame,aMove,zFrom,zTo) {

		if(aMove.a=='E')
			return Math.max(zFrom,zTo)+2000;
		if(aMove.a=='H' || aMove.a=='C')
			return Math.max(zFrom,zTo)+1500;

		var geometry = aGame.cbVar.geometry;
		var x0 = geometry.C(aMove.f);
		var x1 = geometry.C(aMove.t);
		var y0 = geometry.R(aMove.f);
		var y1 = geometry.R(aMove.t);

		if (x0==x1 || y0==y1)
			return (zFrom+zTo)/2;
		else
			return Math.max(zFrom,zTo)+800; // palace diagonal
	}

	/*
		A pass has f==t: there is nothing to animate, and running the normal
		animation would send the General on a trip to its own square.
	*/
	var SuperViewBoardcbAnimate = View.Board.cbAnimate;
	View.Board.cbAnimate = function(xdv,aGame,aMove,callback) {
		if(aMove.pass)
			callback();
		else
			SuperViewBoardcbAnimate.apply(this,arguments);
	}

})();
