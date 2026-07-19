
(function() {

	// equip board with lines, for lack of checkering
	View.Game.cbShogiBoard3DMargin = $.extend({},View.Game.cbGridBoardClassic,{
		paintLines: function(spec,ctx,images,channel) {
			ctx.strokeStyle = "rgba(0,0,0,1)";
			ctx.lineWidth = 5;
			ctx.stroke();
		},
		'margins' : {x:.67,y:.67},
		'extraChannels':[ // in addition to 'diffuse' which is default
			'bump'
		],
	});
	
	View.Game.cbDefineView = function() {

		// this is returned via intermediate variable so it can be extended first
		var pieceSet = this.cbShogiPieceStyle({
				"default": {
					"2d": {
						width: 1200,
						height: 1200,						
					},
                    "skin2dwestern": this.cbShogiWesternPieceStyle()["default"]["2d"],
                    // Same wiring as the shared shogi/shogi-view.js: the
                    // mnemonic style's ["default"]["2d"] (sheet file +
                    // viewer-relative rotate, scoped to this skin - see
                    // shogi-set-view.js's cbShogiMnemonicPieceStyle) rides
                    // under the skin-named key, which the gadget layer
                    // merges last, exactly when this skin is active. Both
                    // mini-shogi and kyoto-shogi share this cbDefineView
                    // (config_view_js_107), and both use only standard
                    // shogi aspects, all covered by the mnemonic sheet.
                    "skin2dmnemonic": this.cbShogiMnemonicPieceStyle()["default"]["2d"],
					"3d": {
						scale: [.60,.60,.60],
					},
				},
			});

			// this drop-view.js function extends piece sets with holdings counters
			View.Game.cbAddCounters(pieceSet, View.Game.cbShogiPieceStyle3D);
		
		return {
			coords: {
				"2d": this.cbGridBoard.coordsFn.call(this,this.cbGridBoardClassic2DMargin),
				"3d": this.cbGridBoard.coordsFn.call(this,this.cbGridBoardClassic3DMargin),
			},
			boardLayout: [
	      		"##.....##",
	      		"##.....##",
	      		"##.....##",
	      		"##.....##",
	      		"##.....##"
			],
			board: {
				"2d": {
					draw: this.cbDrawBoardFn(this.cbGridBoardClassic2DMargin),
				},
				"3d": {
					display: this.cbDisplayBoardFn(this.cbShogiBoard3DMargin),
				},
			},
			clicker: {
				"2d": {
					width: 1200,
					height: 1200,
				},
				"3d": {
					scale: [.85,.85,.85],
				},
			},
			pieces: pieceSet, // prepared above
		};
	}

	/* Make the knight jump when moving */
	View.Board.cbMoveMidZ = function(aGame,aMove,zFrom,zTo) {
		return (zFrom+zTo)/2; // no jumping pieces
	}

})();


