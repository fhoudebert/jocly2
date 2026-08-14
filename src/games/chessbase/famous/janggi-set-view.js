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

	A counter reads the same way in every skin. base-view.js gives a 3D piece
	a half turn when its owner sits opposite the viewer; the 2D character skin
	is given the same one below, since the 2D view-switch only remaps cell
	positions and would otherwise leave every glyph upright. The pictogram
	skin is deliberately left alone - a silhouette is read by its shape, not
	by which way up it is. Nothing here needs the shogi rotate trick, whose
	point is to tell two identical armies apart.
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
	var CHARACTER_SKIN = "skin2d";
	var WESTERN_SKIN = "skin2dwestern";

	/*
		Which way up a counter is read.

		base-view.js turns a 3D piece by half a turn when mViewAs * side < 0,
		so that each player reads his own pieces the right way up and the
		opponent's upside down - what a physical set does, the board being
		rotated in place when the viewpoint changes (grid-board-view.js
		mirrors the rank axis for player A and the file axis for player B,
		and mirroring both is a half turn). It applies that to the "3d"
		channel only, so 2D characters stayed upright for both camps.

		The same half turn is given here to the 2D character skin, so a
		Janggi counter reads the same way whichever skin is on. mViewAs is
		current at style-build time: setViewOptions -> GameInitView ->
		cbDefineView re-evaluates the styles on every view switch, which is
		what makes the glyphs turn over when the seat changes.

		The 3D wall skin is the deliberate exception: janggi-view.js pins its
		rotate to 0, so it is the one character skin where all fourteen
		counters read the right way up at once. Nothing about that skin
		forces it - it is the flat 3D skin seen from an elevation of 89
		degrees instead of 60, so the half turn would be just as visible
		there - it is kept as an option for players who would rather not read
		half the board upside down.

		Scoped to CHARACTER_SKIN, and to the per-side blocks where the sheet
		row is already chosen, so that the pictogram skin keeps its
		silhouettes upright: there, orientation belongs to the drawing, not
		to the reading.
	*/
	function OwnerRotation(mViewAs,side) {
		return mViewAs * side < 0 ? 180 : 0;
	}

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
		style["1"]["default"][CHARACTER_SKIN] = { rotate: OwnerRotation(this.mViewAs,1) };
		style["-1"]["default"][CHARACTER_SKIN] = { rotate: OwnerRotation(this.mViewAs,-1) };
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

	/*
		3D pictograms, at no cost in new artwork.

		The silhouettes are Jocly's Xiangqi western set - the same file the 2D
		pictogram sheet was cut from - and it happens to fit here without a
		single change: seven columns in our order, 300px cells, and the alpha
		is all that is read, the colour coming from the patternFill the
		character style already sets per side.

		Its one difference is that it holds a single row, the silhouettes
		being the same for both camps where the characters are not (楚/漢,
		卒/兵). So Han's clipping, which points at the second row of the
		character sheet, is sent back to row 0 here.

		This skin does NOT pin rotate: a piece whose owner sits opposite the
		viewer turns over, as on a real board seen from the other side.
	*/
	var WESTERN_GLYPHS = "/res/xiangqi/xiangqi-pieces-sprites-western-player.png";

	View.Game.cbJanggiWesternPieceStyle3D = $.extend(true,{},View.Game.cbJanggiPieceStyle3D,{
		'default': {
			'materials': {
				'piecetop': {
					'channels': {
						'diffuse': {
							'texturesImg': {
								'faceDiffuse': WESTERN_GLYPHS,
							},
						},
						'bump': {
							'texturesImg': {
								'bumpTexturePattern': WESTERN_GLYPHS,
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
							'diffuse': {
								'clipping': { 'faceDiffuse': { y: 0 } },
							},
							'bump': {
								'clipping': { 'bumpTexturePattern': { y: 0 } },
							},
						},
					},
				},
			},
		},
	});

})();
