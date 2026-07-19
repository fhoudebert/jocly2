(function() {
	var CANVAS_SIZE = 512;
	var FAIRY_CANVAS_PROPERTIES = {
			cx: CANVAS_SIZE,
			cy: CANVAS_SIZE
	}
	function THREE_CONST(v) {
		if(typeof THREE!=="undefined")
			return THREE[v];
		else
			return 0;
	}

	View.Game.cbShogiPieceStyle = function(modifier) {
		return $.extend(true,{
			"1": {
				"default": {
					"2d": {
						clipy: 0,
					},
				},
			},
			"-1": {
				"default": {
					"2d": {
						clipy: 100,
					},
				},
			},
			"default": {
				"3d": {
					display: this.cbDisplayPieceFn(this.cbShogiPieceStyle3D),
				},
				"2d": {
					file: this.mViewOptions.fullPath + "/res/shogi/shogi-mnemonic-sprites.png",
					clipwidth: 100,
					clipheight: 100,
					// Shogi sprites encode ownership through their ABSOLUTE
					// orientation: row 1 of the sheet (clipy 0, player 1) is
					// drawn pointing up-screen, row 2 (clipy 100, player -1)
					// pointing down-screen - and the two rows also differ in
					// coloring, so they are NOT interchangeable by swapping
					// clipy per viewer (verified pixel-wise on both the
					// mnemonic and picto sheets). When the point of view is
					// switched to player B, the 2D board only remaps cell
					// positions (grid-board-view.js coordsFn) - unlike the 3D
					// skin, where the camera physically moves to the other
					// side and orientation follows for free - so every sprite
					// would keep its absolute orientation and appear upside
					// down relative to the viewer. Rotating every piece
					// sprite by 180 when viewing as player B restores the
					// invariant "own pieces point away from the viewer" for
					// both sides at once. This is applied through the
					// gadget's generic `rotate` option (GadgetSprite inherits
					// GadgetElement's CSS-transform rotation), and a 180
					// rotation of a square raster is pixel-exact - no
					// resampling artifacts. `this.mViewAs` is current at the
					// time this style is built because cbDefineView() (our
					// caller, via cbShogi*PieceStyle) is re-evaluated on
					// every setViewOptions({viewAs}) -> GameInitView() ->
					// xdInit()/xdBuildScene() pass.
					rotate: this.mViewAs === -1 ? 180 : 0,
				},
			},
			"sh-pawn": {
				"2d": {
					clipx: 1000,
				},
			},
			"sh-knight": {
				"2d": {
					clipx: 1100,
				},
			},
			"sh-lance": {
				"2d": {
					clipx: 1200,
				},
			},
			"sh-silver": {
				"2d": {
					clipx: 1300,
				},
			},
			"sh-gold": {
				"2d": {
					clipx: 1400,
				},
			},
			"sh-bishop": {
				"2d": {
					clipx: 1500,
				},
			},
			"sh-rook": {
				"2d": {
					clipx: 1600,
				},
			},
			"sh-tokin": {
				"2d": {
					clipx: 1700,
				},
			},
			"sh-promoted-knight": {
				"2d": {
					clipx: 1800,
				},
			},
			"sh-promoted-lance": {
				"2d": {
					clipx: 1900,
				},
			},
			"sh-promoted-silver": {
				"2d": {
					clipx: 2000,
				},
			},
			"sh-horse": {
				"2d": {
					clipx: 2100,
				},
			},
			"sh-dragon": {
				"2d": {
					clipx: 2200,
				},
			},
			"sh-king": {
				"2d": {
					clipx: 2300,
				},
			},
			"sh-jade": {
				"2d": {
					clipx: 2400,
				},
			},
			"sh-squirrel": {
				"2d": {
					clipx: 2500,
				},
			},

		},modifier);
	}

	View.Game.cbShogiPieceStyle3D = $.extend(true,{},View.Game.cbUniformPieceStyle3D,{

		"default": {
			mesh: {
				normalScale: 1,
				rotateZ: 180,
			},
			//'useUniforms' : true,
			materials:{
				mat0:{
					channels:{
						diffuse:{
							size: FAIRY_CANVAS_PROPERTIES,
						},
						normal: {
							size: FAIRY_CANVAS_PROPERTIES,
						},
					},
				},
			},
		},

		"1":{
			'default': {
				materials:{
					mat0:{
						params : {
							specular: 0x020202,
							shininess : 150 ,
						},
					},
				},
			}
		},
		"-1":{
			'default': {
				materials:{
					mat0:{
						params : {
							specular: 0x040404,
							shininess : 100 ,
						},
					},
				},
			},
		},


		"sh-pawn": {
			mesh: {
				jsFile:"/res/shogi/p-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/pawn-b.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

		"sh-tokin": {
			mesh: {
				jsFile:"/res/shogi/p-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/tokin-r.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

		"sh-knight": {
			mesh: {
				jsFile:"/res/shogi/n-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/knight-b.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

		"sh-lance": {
			mesh: {
				jsFile:"/res/shogi/n-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/lance-b.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

		"sh-promoted-knight": {
			mesh: {
				jsFile:"/res/shogi/n-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/p-knight-r.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

		"sh-promoted-lance": {
			mesh: {
				jsFile:"/res/shogi/n-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/p-lance-r.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

		"sh-silver": {
			mesh: {
				jsFile:"/res/shogi/g-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/silver-b.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

		"sh-gold": {
			mesh: {
				jsFile:"/res/shogi/g-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/gold-b.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

		"sh-promoted-silver": {
			mesh: {
				jsFile:"/res/shogi/g-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/p-silver-r.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

		"sh-bishop": {
			mesh: {
				jsFile:"/res/shogi/b-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/bishop-b.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

		"sh-rook": {
			mesh: {
				jsFile:"/res/shogi/b-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/rook-b.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

		"sh-horse": {
			mesh: {
				jsFile:"/res/shogi/b-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/horse-r.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

		"sh-dragon": {
			mesh: {
				jsFile:"/res/shogi/b-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/dragon-r.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

		"sh-king": {
			mesh: {
				jsFile:"/res/shogi/k-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/king-b.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

		"sh-jade": {
			mesh: {
				jsFile:"/res/shogi/k-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/diffusemaps/jade-b.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},
		"sh-squirrel": {
			mesh: {
				jsFile:"/res/shogi/j-tile.js"
			},
			materials: {
				mat0: {
					channels: {
						diffuse: {
							texturesImg: {
								diffImg : "/res/shogi/chu-diffusemaps/lion-b.jpg",
							}
						},
						normal: {
							texturesImg: {
								normalImg: "/res/shogi/tile-normalmap.jpg",
							}
						}
					}
				}
			},
		},

	});

	View.Game.cbShogiWesternPieceStyle = function(modifier) {
		
		return $.extend(true,this.cbShogiPieceStyle(),{
			"default": {
				"2d": {
					file: this.mViewOptions.fullPath + "/res/shogi/shogi-picto-sprites.png",
					/*clipwidth: 100,
					clipheight: 100,*/
					                              
				},
			}
		},modifier);
	};
    View.Game.cbShogiMnemonicPieceStyle = function(modifier) {
		
		return $.extend(true,this.cbShogiPieceStyle(),{
			"default": {
				"2d": {
					file: this.mViewOptions.fullPath + "/res/shogi/shogi-mnemonic-sprites.png",
					                              
				},
			}
		},modifier);
	};

})();
