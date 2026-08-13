/*
	Janggi pieces: octagonal counters, Cho (green) at the bottom, Han (red)
	on the other side, in the three traditional sizes.

	Three sheets, all 7 columns x 2 rows of 300px cells, row 0 for side 1 and
	row 1 for side -1:

	  janggi-pieces-sprites.png          2D, the counters as they are played
	  janggi-pieces-sprites-western.png  2D, same counters with pictograms
	  janggi-pieces-sprites-glyphs.png   3D, the bare characters

	Shogi gets away with ONE row per sheet because there its two armies are
	identical and ownership is shown by orientation, so shogi-set-view.js can
	re-use a single row and rotate it (see the note in its mnemonic style).
	That does not transfer here: Cho and Han differ by COLOUR, which a 2D
	sprite cannot be given at draw time, and on two of the seven pieces by the
	character itself (楚/漢 and 卒/兵). Hence two rows on the 2D sheets.

	The 3D sheet is a different matter. base-view.js paints a patternFill
	channel by flooding the canvas with a colour and masking it with the image
	(destination-in), so it reads nothing but the alpha: the old playera and
	playerb sheets carried a green and a red copy of glyphs that were then
	repainted anyway, and five of their seven columns were identical. They are
	now one sheet, the row picked by the per-side clipping below and the
	colour supplied by the style.

	Orientation holds in every skin when the viewer switches side. In 2D the
	view-switch only remaps cell positions and no rotation is ever applied, so
	characters stay upright for whoever is reading. In 3D the camera moves,
	and base-view.js already turns each piece by 180 degrees when
	mViewAs * side < 0, which is the physical convention: each player reads
	his own pieces the right way up, as across a real board. The wall skin
	pins rotate to 0 in janggi-view.js, a vertical board being read from one
	side only. Nothing here needs the shogi rotate trick.
*/

(function() {

	var FLAT_CANVAS_WIDTH = 1024 ;
	var FLAT_CANVAS_HEIGHT = 1024 ;

	var GLYPH_SHEET = "/res/janggi/janggi-pieces-sprites-glyphs.png";

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

	/*
		The pictogram skin is the same sheet layout with the characters
		replaced by silhouettes, so it only needs to point `file` elsewhere.
		A skin override is merged over the "2d" spec of the very same piece
		(jocly.xd-view.js: base, then "2d"/"3d", then options[skinName]),
		which is why the clipx entries below carry no skin variant: the
		columns are shared by both sheets.
	*/
	var WESTERN_SKIN = "skin2dwestern";

	View.Game.cbJanggiPieceStyle = function(modifier) {
		var westernSheet = this.mViewOptions.fullPath + "/res/janggi/janggi-pieces-sprites-western.png";
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
		style["default"][WESTERN_SKIN] = { file: westernSheet };
		for(var aspect in CLIPX)
			style[aspect] = { "2d": { clipx: CLIPX[aspect] } };
		return $.extend(true,style,modifier);
	}

	var style3D = {

		/*
			Only the clipping row and the fill colour change from one side to
			the other. base-view.js paints a patternFill texture by flooding
			the canvas with the colour and masking it with the image
			(destination-in), so the sheet is read as a pure alpha mask and
			one file serves both camps - the green and the red live here, in
			the style, not in the pixels.
		*/
		'1': {
			'default': {
				'materials': {
					'piecetop': {
						'channels': {
							'diffuse': {
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
							'bump': {
								'clipping': {
									'bumpTexturePattern': { y: 300 },
								},
							},
							'diffuse': {
								'clipping': {
									'faceDiffuse': { y: 300 },      // second row: Han
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
								'bumpTexturePattern': GLYPH_SHEET,
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
							// painted in this order: the ivory ground first,
							// the character on top of it
							texturesImg: {
								'mainDiffuse': "/res/xiangqi/whitebg.png",
								'faceDiffuse': GLYPH_SHEET,
							},
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
