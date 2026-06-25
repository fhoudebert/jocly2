
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

        var seireigiteraBoardDelta = {
			notationMode: "out",
			//notationDebug: true,
		}

		// this is returned via intermediate variable so it can be extended first
		var pieceSet = this.cbShogiPieceStyle({
				"default": {
                    "skin2dwestern": this.cbShogiWesternPieceStyle()["default"]["2d"],
					"3d": {		
					scale: [0.34285714285714,0.34285714285714,0.34285714285714],
					},
				},
			});

		seireigiteraBoardDelta2d = $.extend(true,{},seireigiteraBoardDelta,
			{
				'colorFill' : {
					".": "#d8c7ac", // "white" cells
					"#": "#a97b50", // "black" cells
					" ": "rgba(0,0,0,0)",
				},
				'texturesImg' : {}, 
				//'margins' : {x:.47,y:.47},
				'margins' : {x:.25,y:.25},
			}
		);

var seireigiteraBoard2d = $.extend(true,{},this.cbGridBoardClassic2DMargin,seireigiteraBoardDelta2d);

			// this drop-view.js function extends piece sets with holdings counters
			View.Game.cbAddCounters(pieceSet, View.Game.cbShogiPieceStyle3D);
		
		return {
			coords: {
				"2d": this.cbGridBoard.coordsFn.call(this,seireigiteraBoard2d),
                "3d": this.cbGridBoard.coordsFn.call(this,this.cbGridBoardClassic3DMargin),
               // "3d": this.cbGridBoard.coordsFn.call(this,this.cbGridBoardClassic3DMargin),
			},
			boardLayout: [
                "################",
	      		"##............##",
	      		"##............##",
	      		"##............##",
	      		"##............##",
	      		"##............##",
	      		"##............##",
	      		"##............##",
	      		"##............##",
	      		"##............##",
	      		"##............##",
	      		"##............##",
	      		"##............##",
	      		"################"
			],
			board: {
				"2d": {
					draw: this.cbDrawBoardFn(seireigiteraBoard2d),
				},
				"3d": {
					display: this.cbDisplayBoardFn(this.cbShogiBoard3DMargin),
				},
			},
			clicker: {
				"2d": {
					width: 700,
					height: 700,
				},
				"3d": {
                    width: 600,
					height: 600,			
					scale: [0.34285714285714,0.34285714285714,0.34285714285714], 
				},
			},
			pieces: pieceSet, // prepared above
		};
	}
	/* Make the knight jump when moving */
	View.Board.cbMoveMidZ = function(aGame,aMove,zFrom,zTo) {
		var file = aMove.f % 13;
		if(aMove.a=='N' || file < 2 || file > 10)
			return Math.max(zFrom,zTo)+1500;
		else
			return (zFrom+zTo)/2;
	}
	

})();

