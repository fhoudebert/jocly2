/*
 *
 * 
 * 
 * authors: jerome choain
 *
 */

(function() {

    function createTexturedPatternCanvas(W,H,texture,clipW,clipH,mask,borderFact){ 
    	// borderFact is the percentage (/100) of the mask transition overlay border : ex 30% => .3
        var cv = document.createElement('canvas');
        cv.width=W;
        cv.height=H;
        var ctx=cv.getContext('2d');
        
        var maskW=mask.width;
        var maskH=mask.height;
        var textW=texture.width;
        var textH=texture.height;
        var tmp = document.createElement('canvas');
        ctx.globalCompositeOperation='or';
        
        var y=0;
        for (var i=0; y<=(H+clipH/2);i++){
            var x=0;
            for (var j=0; x<=(W+clipW/2);j++){
                tmp.width=clipW; tmp.height=clipH;
                ctxTmp=tmp.getContext('2d');
                ctxTmp.globalCompositeOperation='xor';
                ctxTmp.drawImage(texture, Math.random()*(textW-clipW),Math.random()*(textH-clipH),clipW,clipH,0,0,clipW,clipH);
                ctxTmp.drawImage(mask,0,0,clipW,clipH);
                ctx.drawImage(tmp,x-clipW/2,y-clipH/2,clipW,clipH);
                x+=clipW-borderFact*clipW;
            }
            y+=clipH-borderFact*clipH;
        }
        return cv;
    }
	
		
			
	
	// Reducing the promo frame which was overflowing the board screen
	View.Game.cbPromoSize = 1100;
	
	// extending fairy pieces with some musketeer new pieces
	View.Game.cbFairyWTamerlanePieceStyle3D = $.extend(true,{},View.Game.cbFairyPieceStyle3D,{	
				
	});
	
	View.Game.cbDefineView = function() {
        
        var wtamerlaneBoardDelta = {
			notationMode: "out",
			//notationDebug: true,
		}

		wtamerlaneBoardDelta3d = $.extend(true,{},wtamerlaneBoardDelta,
			{
				/*'colorFill' : {		 
					".": "#575b36", // "rgba(180,213,80,.3)",
					"#": "#474b36", // "black" cells
					" ": "rgba(0,0,0,0)",
				},*/
				'colorFill' : {
					"#": "rgba(204,40,0,1)", 
					".": "rgba(180,180,0,1)", 
				},
				'texturesImg' : {
					'crackles': '/res/images/crackles.jpg',
					'tiler': '/res/images/tileralpha.png',
				},
				'3D':true,
				'margins' : {x:.47,y:.47},
				'extraChannels':[
					'bump'
				],
				paintCell: function(spec,ctx,images,channel,cellType,xCenter,yCenter,cx,cy) {
		
					var tW=images['crackles'].width;
					var tH=images['crackles'].height;
					var tClipCx=200;
					var tClipCy=200;
					
						
		
					ctx.fillStyle="#000000";
					ctx.fillRect(xCenter-cx/2,yCenter-cy/2,cx,cy);
					
					if(channel=="bump"){
						return;
					}
		
					cx=.98*cx;
					cy=.98*cy;
					
					ctx.save();
		
					
					ctx.strokeStyle = "rgba(0,0,0,1)";
					ctx.lineWidth = 50;
					if (channel=='diffuse')
						ctx.fillStyle=spec.colorFill[cellType];
					else
						ctx.fillStyle=0xffffff;
					ctx.fillRect(xCenter-cx/2,yCenter-cy/2,cx,cy);
				
					ctx.globalCompositeOperation = 'multiply';
					ctx.drawImage(images['crackles'],
						Math.random()*(tW-tClipCx),Math.random()*(tH-tClipCy),tClipCx,tClipCy,
						xCenter-cx/2,yCenter-cy/2,cx,cy);
					ctx.restore();
				},
				
				paintBackground: function(spec,ctx,images,channel,bWidth,bHeight) {
				
						ctx.save();
						ctx.fillStyle="#ffffff";
						if (channel=='diffuse')
							ctx.fillStyle="#BA784A";
							//ctx.fillStyle="#cc6600";
						var cSize = this.cbCSize(spec);
						ctx.fillRect(-bWidth/2,-bHeight/2,bWidth,bHeight);
						var textureCanvas=createTexturedPatternCanvas(1200,800,images['crackles'],200,200,images['tiler'],.3);
						ctx.globalCompositeOperation='multiply';
						ctx.drawImage(textureCanvas,-bWidth/2,-bHeight/2,bWidth,bHeight);
						ctx.restore();
				},
			}
		);

		wtamerlaneBoardDelta2d = $.extend(true,{},wtamerlaneBoardDelta, 
			{
				'colorFill' : {		 
					".": "#ffffc0", // "white" cells
					"#": "#8F976D", // "black" cells
					" ": "rgba(0,0,0,0)",
				},
				'texturesImg' : {}, // to avoid default wood texture
				'margins' : {x:.47,y:.47},
				/*'colorFill' : {
					".": "rgba(224,50,0,1)", 
					"#": "rgba(220,220,0,1)", 
				},*/					
			}
		);
		
		var wtamerlaneBoard3d = $.extend(true,{},this.cbGridBoardClassic3DMargin,wtamerlaneBoardDelta3d);
		var wtamerlaneBoard2d = $.extend(true,{},this.cbGridBoardClassic2DMargin,wtamerlaneBoardDelta2d);
		
		return {
			coords: {
				"2d": this.cbGridBoard.coordsFn.call(this,wtamerlaneBoard2d),
				"3d": this.cbGridBoard.coordsFn.call(this,wtamerlaneBoard3d),
			},
			boardLayout: [
	      		".#.#.#.#.#.",
	      		"#.#.#.#.#.#",
	      		".#.#.#.#.#.",
	      		"#.#.#.#.#.#",
	      		".#.#.#.#.#.",
	      		"#.#.#.#.#.#",
	      		".#.#.#.#.#.",
	      		"#.#.#.#.#.#",
	      		".#.#.#.#.#.",
	      		"#.#.#.#.#.#",
	      		".#.#.#.#.#.",
			],
			board: {
				"2d": {
					draw: this.cbDrawBoardFn(wtamerlaneBoard2d),										
				},
				"3d": {
					display: this.cbDisplayBoardFn(wtamerlaneBoard3d),					
				},
			},
			clicker: {
				"2d": {
					width: 1018.1818181818,
					height: 1018.1818181818,
				},
				"3d": {
					scale: [0.65454545454545,0.65454545454545,0.65454545454545],
				},
			},
			pieces: this.cbFairyPieceStyle({	
				"default": {
					"2d": {
						width: 945.45454545455,
						height: 945.45454545455,	
					},			
					"3d": {
						scale: [0.43636363636364,0.43636363636364,0.43636363636364],
						display: this.cbDisplayPieceFn(this.cbFairyWTamerlanePieceStyle3D)
					},
				},
				"fr-amazon" :{
					"3d": {
						scale: [0.52363636363636,0.52363636363636,0.52363636363636],
					}
				},
			}),
		};
	}

	/*
	 * No cbMoveMidZ here on purpose.
	 *
	 * The table this view used to carry listed the Knight, the Elephant and
	 * the Camel as jumpers, plus the Cannon and a "W" this game has no piece
	 * for. What it left out was the Gryphon, whose move is a diagonal step
	 * followed by a straight ray - so it slid straight from where it stood to
	 * where it landed, cutting across squares its path never touches.
	 *
	 * grid-board-view.js reads all of that off the piece graphs: leaps jump,
	 * screen captures jump, and a path whose two legs are not in line gets a
	 * bent trajectory. Checked move by move against the old table first -
	 * Knight, Camel and the Elephant's two-square leap still jump, the
	 * Elephant's single step and the Cannon's quiet move still slide, and the
	 * Cannon jumps when it captures over a screen.
	 */
})();
