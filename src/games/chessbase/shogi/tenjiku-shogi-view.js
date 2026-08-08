
(function() {

	View.Game.cbDefineView = function() {

		var boardLayout=[];
		for(var row=0;row<16;row++)
			boardLayout.push(row%2 ? "#.#.#.#.#.#.#.#." : ".#.#.#.#.#.#.#.#");

		return {
			coords: {
				"2d": this.cbGridBoard.coordsFn.call(this,this.cbGridBoardClassic2DMargin),
				"3d": this.cbGridBoard.coordsFn.call(this,this.cbGridBoardClassic3DMargin),
			},
			boardLayout: boardLayout,
			board: {
				"2d": {
					draw: this.cbDrawBoardFn(this.cbGridBoardClassic2DMargin),
				},
				"3d": {
					display: this.cbDisplayBoardFn(this.cbGridBoardClassic3DMargin),
				},
			},
			clicker: {
				"2d": {
					width: 730,
					height: 730,
				},
				"3d": {
					scale: [.48,.48,.48],
				},
			},
			// Tenjiku shares Chu Shogi's piece sheets (tenjiku-set-view.js): the
			// picto sheet is the default 2D skin, the kanji mnemonic sheet is
			// wired under the "skin2dmnemonic" key, which the gadget layer merges
			// last when that skin is the active one.
			pieces: this.cbChuPieceStyle({
				"default": {
					"2d": {
						width: 640,
						height: 640,
					},
					"skin2dmnemonic": this.cbChuMnemonicPieceStyle()["default"]["2d"],
					"3d": {
						scale: [.34,.34,.34],
					},
				},
			}),
		};
	}

	/* Lift the pieces that jump rather than slide */
	View.Board.cbMoveMidZ = function(aGame,aMove,zFrom,zTo) {
		if(aMove.via!==undefined)
			return (zFrom+zTo)/2; // handled leg by leg by multi-leg-view
		var a=aMove.a;
		var dx=aMove.t%16-aMove.f%16;
		var dy=(aMove.t-aMove.f-dx)/16;
		var dist=dx*dx+dy*dy;
		if(dist<=2)
			return (zFrom+zTo)/2; // adjacent square: always a step
		var oblique=dx*dy*dy*dy-dy*dx*dx*dx;
		if(a=='LN' || a=='+KN' || a=='LH' || a=='+LN' || a=='FE' || a=='+FK' ||
		   a=='KN' || a=='+O' || a=='PH' || a=='N' || a=='+CS' || oblique ||
		   // jumping generals only leave the ground when they capture
		   (aMove.c!==null && (a=='GG' || a=='+RG' || a=='VG' || a=='+BG' ||
		                       a=='BG' || a=='+HF' || a=='RG' || a=='+SE')))
			return Math.max(zFrom,zTo)+1000+50*Math.sqrt(dist);
		return (zFrom+zTo)/2;
	}

})();
