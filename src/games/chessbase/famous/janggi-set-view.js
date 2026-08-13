/*
	Janggi pieces: octagonal counters, Cho (green) at the bottom, Han (red)
	on the other side, in the three traditional sizes.

	Sprite sheets come from res/janggi/make-sprites.py and follow the Xiangqi
	layout: seven 300x300 cells, row 0 for side 1 and row 1 for side -1 in
	the 2D sheet, one row of bare glyphs per side for the 3D face texture.
	The token mesh, its bump map and the plain background are shared with
	Xiangqi rather than duplicated.
*/

(function() {

	var FLAT_CANVAS_WIDTH = 1024 ;
	var FLAT_CANVAS_HEIGHT = 1024 ;

	var TOKEN_BGCOLOR = "rgb(243,226,191)"; // ivory, as the counters are

	var TOKEN_MAT_PROPS = {
			shininess : 600,
			bumpScale: 0.05,
			specular: {r:0.1,g:0.1,b:0.1},
		};

	// clipx of each aspect in the sheets
	var CLIPX = {
		'jg-general':   0,
		'jg-guard':   300,
		'jg-horse':   600,
		'jg-elephant':900,
		'jg-chariot':1200,
		'jg-cannon': 1500,
		'jg-soldier':1800,
	};

	View.Game.cbJanggiPieceStyle = function(modifier) {
		var style = {
			"1": {
				"default": {
					"2d": {
						clipy: 0,      // Cho (green), plays first
					},
				},
			},
			"-1": {
				"default": {
					"2d": {
						clipy: 300,    // Han (red)
					},
				},
			},
			"default": {
				"3d": {
					display: this.cbDisplayPieceFn(this.cbJanggiPieceStyle3D),
				},
				"2d": {
					file: this.mViewOptions.fullPath + "/res/janggi/janggi-pieces-sprites.png",
					clipwidth: 300,
					clipheight: 300,
				},
			},
		};
		for(var aspect in CLIPX)
			style[aspect] = { "2d": { clipx: CLIPX[aspect] } };
		return $.extend(true,style,modifier);
	}

	var style3D = {

		'1': {
			'default': {
				'materials': {
					'piecetop': {
						'channels': {
							'bump':{
								'texturesImg': {
									'bumpTexturePattern': "/res/janggi/janggi-pieces-sprites-playera.png",
								}
							},
							'diffuse': {
								'texturesImg': {
									'mainDiffuse': "/res/xiangqi/whitebg.png",
									'faceDiffuse': "/res/janggi/janggi-pieces-sprites-playera.png",
								},
								'patternFill': {
									'faceDiffuse': "rgba(11,102,58,1)",  // Cho green
								},
							},
						},
					},
				},
			},
		},
		'-1': {
			'default': {
				'materials': {
					'piecetop': {
						'channels': {
							'bump':{
								'texturesImg': {
									'bumpTexturePattern': "/res/janggi/janggi-pieces-sprites-playerb.png",
								}
							},
							'diffuse': {
								'texturesImg': {
									'mainDiffuse': "/res/xiangqi/whitebg.png",
									'faceDiffuse': "/res/janggi/janggi-pieces-sprites-playerb.png",
								},
								'patternFill': {
									'faceDiffuse': "rgba(176,32,39,1)",  // Han red
								},
							},
						},
					},
				},
			},
		},

		'default': {

			'mesh': {
				jsFile:"/res/xiangqi/token.js",
			},

			'materials':{
				'pieceborders':{
					'params': TOKEN_MAT_PROPS ,
					'channels':{
						'diffuse':{
							size: { cx: FLAT_CANVAS_WIDTH, cy: FLAT_CANVAS_WIDTH },
							texturesImg: {
								'mainDiffuse': "/res/xiangqi/whitebg.png",
							},
							'patternFill': {
								'mainDiffuse': TOKEN_BGCOLOR,
							},
						},
					},
				},
				'piecetop':{
					'params': TOKEN_MAT_PROPS ,
					'channels':{
						'bump':{
							size: { cx: 512, cy: 512 },
							texturesImg: {
								'bumpTexture': "/res/xiangqi/piecebump.jpg",
							},
							'clipping': {
								'bumpTexturePattern': {
									y:0,
									cx: 300,
									cy: 300,
								}
							},
							'patternFill': {
								'bumpTexturePattern': "rgba(0,0,0,0.2)",
							},
						},
						'diffuse':{
							size: { cx: FLAT_CANVAS_WIDTH, cy: FLAT_CANVAS_HEIGHT },
							'clipping': {
								'faceDiffuse': {
									y:0,
									cx: 300,
									cy: 300,
								}
							},
							'patternFill': {
								'mainDiffuse': TOKEN_BGCOLOR,
							},
						},
					},
				},
			},
		},
	};

	// one entry per aspect, clipping both the face texture and the bump
	// pattern out of the sheet at that piece's column
	for(var aspect in CLIPX)
		style3D[aspect] = {
			'materials': {
				'piecetop': {
					'channels': {
						'diffuse': { 'clipping': { 'faceDiffuse': { x: CLIPX[aspect] } } },
						'bump': { 'clipping': { 'bumpTexturePattern': { x: CLIPX[aspect] } } },
					},
				},
			},
		};

	View.Game.cbJanggiPieceStyle3D = $.extend(true,{},View.Game.cbTokenPieceStyle3D,style3D);

})();
