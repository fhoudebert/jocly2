/*
	Janggi board: the Xiangqi board minus the river.

	Every file therefore runs unbroken from rank 1 to rank 10, which is the
	one structural difference with famous/xiangqi-board-view.js - that one
	draws the columns in two blocks of four ranks, leaving the river gap in
	the middle. The palace diagonals are drawn exactly the same way, and the
	Xiangqi cross decorations (they mark the Cannon and Soldier points, which
	Janggi does not have) are gone.

	Note that a real Janggi board is wider than a Xiangqi one - its files are
	further apart than its ranks - while cells here are square, as
	View.Game.cbCSize gives one cell size for both axes.
*/

(function() {

	View.Game.cbJanggiBoard = $.extend({},View.Game.cbGridBoardClassic,{
		'colorFill' : {
			".": "rgba(0,0,0,0)",
		},

		'texturesImg' : {
			'boardBG' : '/res/xiangqi/wood2.jpg',
		},

		paintCell: function(spec,ctx,images,channel,cellType,xCenter,yCenter,cx,cy) {
		},

		paintBackground: function(spec,ctx,images,channel,bWidth,bHeight) {
			if (channel=='diffuse')
				ctx.drawImage(images['boardBG'],-bWidth/2,-bHeight/2,bWidth,bHeight);
		},

		paintLines: function(spec,ctx,images,channel) {

			var $this=this;

			var NBROWS=10, NBCOLS=9;

			var cSize = this.cbCSize(spec);
			var getCoords=spec.coordsFn(spec);

			ctx.strokeStyle = "rgba(0,0,0,1)";
			ctx.lineWidth = 15;

			function Pos(col,row) {
				return $this.mViewAs==1 ?
						col+row*NBCOLS :
						NBCOLS*NBROWS-(1+col+row*NBCOLS);
			}

			function JoinPoints(start,end){
				var p0=getCoords.call($this,Pos(start.col,start.row));
				var p1=getCoords.call($this,Pos(end.col,end.row));
				ctx.beginPath();
				ctx.moveTo(p0.x,p0.y);
				ctx.lineTo(p1.x,p1.y);
				ctx.stroke();
			}

			// outer border
			var topleft=getCoords.call($this,Pos(0,NBROWS-1));
			ctx.save();
			ctx.lineWidth = 60;
			ctx.fillStyle="rgba(231,208,167,0.0)";
			ctx.rect(topleft.x,topleft.y,
				(NBCOLS-1)*cSize.cx,
				(NBROWS-1)*cSize.cy);
			ctx.fill();
			ctx.stroke();
			ctx.restore();

			// ranks
			for(var row=1;row<NBROWS;row++){
				var coords=getCoords.call($this,Pos(0,row));
				ctx.strokeRect(coords.x, coords.y, (NBCOLS-1)*cSize.cx, cSize.cy);
			}
			// files: one unbroken line each, no river
			for(var col=0;col<NBCOLS-1;col++){
				var coords=getCoords.call($this,Pos(col,NBROWS-1));
				ctx.strokeRect(coords.x, coords.y, cSize.cx, (NBROWS-1)*cSize.cy);
			}

			// palace diagonals
			JoinPoints({col:3,row:0},{col:5,row:2});
			JoinPoints({col:5,row:0},{col:3,row:2});
			JoinPoints({col:3,row:9},{col:5,row:7});
			JoinPoints({col:5,row:9},{col:3,row:7});
		},
	});

	View.Game.cbJanggiBoard3DMargin = $.extend({},View.Game.cbJanggiBoard,{
		'3D':true,
		'margins' : {x:.35,y:.35},
		'extraChannels':[
			'bump'
		],
	});

	View.Game.cbJanggiBoard2DMargin = $.extend({},View.Game.cbJanggiBoard,{
		'margins' : {x:.35,y:.35},
	});

	View.Game.cbJanggiBoard2DNoMargin = $.extend({},View.Game.cbJanggiBoard,{
		'margins' : {x:0.0,y:0.0},
	});

})();
