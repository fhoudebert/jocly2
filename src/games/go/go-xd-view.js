/*
 * The goban.
 *
 * 2D only, and that is a decision rather than a first step. A goban is a flat
 * diagram: the lines, the stones and the last-move mark are the whole picture,
 * and reading it is easier from directly above than from any angle. A 3D board
 * would also mean up to 361 stone meshes on one scene, which is a different
 * project with different risks - mills builds its 24 pieces as custom THREE
 * meshes, and that does not scale to a full board.
 *
 * ONE GADGET PER INTERSECTION. Not one for the point and another for the stone:
 * a point is empty, black or white, so a single element whose CSS class says
 * which covers all three, carries the click, and halves the count. 19x19 is 361
 * of them plus the board - the same order as reversi10's 200, but this is the
 * biggest board in Jocly by some way and the number is the thing to watch if
 * anything here turns out slow.
 *
 * The lines, the star points and the coordinates are drawn once into a single
 * canvas the size of the board, rather than as gadgets per line: a 19x19 board
 * is 38 lines and 9 star points that never change.
 *
 * Everything is measured in the cell pitch, published by xdInit as
 * this.goSize, the way mills-xd-view.js publishes millsSize.
 */

(function() {

/*
 * The board width and the cell pitch live here, set by xdInit, the same shape
 * mills-xd-view.js uses. One view instance therefore serves one game: opening a
 * second size replaces the first one's geometry. That is how Jocly builds
 * views, but it is worth stating, because nothing in the code says so.
 */
var WIDTH, SIZE, MARGIN;

// How many times the wood photograph repeats across the board. Few enough that
// the grain still reads at 19x19, many enough that it is not one blurred
// stretch at 9x9.
var WOOD_TILES = 4;

	// Star points (hoshi): the handicap intersections, marked on a real board.
	function StarPoints(size) {
		if(size < 7) return [];
		var edge = size >= 13 ? 3 : 2;
		var mid = (size - 1) / 2;
		var lo = edge, hi = size - 1 - edge;
		var xs = size % 2 ? [lo, mid, hi] : [lo, hi];
		var out = [];
		xs.forEach(function(r) {
			xs.forEach(function(c) {
				// on 9x9 only the four corners and the centre are marked
				if(size === 9 && r === mid !== (c === mid)) return;
				out.push(r * size + c);
			});
		});
		return out;
	}

	View.Game.xdInit = function(xdv) {
		var $this = this;
		var fullPath = this.mViewOptions.fullPath;
		WIDTH = this.mOptions.size;
		// One extra cell of margin all round, for the coordinates and so the
		// edge stones are not cut in half by the board's border.
		SIZE = Math.floor(12000 / (WIDTH + 1));
		MARGIN = SIZE / 2;
		this.goSize = SIZE;
		this.goStars = StarPoints(WIDTH);

		var boardWidth = WIDTH * SIZE;
		var stars = this.goStars, size = WIDTH;

		/*
		 * The lines, the star points and the surface, drawn once. Two skins
		 * share the grid and differ only in what is under it: a flat colour,
		 * or a tiled wood photograph.
		 *
		 * jocly.xd-view.js merges a gadget's options as base, then "2d" or
		 * "3d", then a key named after the current skin - so "skin2dwood"
		 * below overrides nothing but the draw, and the size and type stay
		 * declared once.
		 */
		function DrawGrid(ctx) {
			var half = boardWidth / 2;
			var first = -half + MARGIN;
			ctx.strokeStyle = "#2b1d0e";
			ctx.lineWidth = Math.max(1, SIZE * 0.03);
			ctx.beginPath();
			for(var i = 0; i < size; i++) {
				var at = first + i * SIZE;
				ctx.moveTo(first, at); ctx.lineTo(first + (size - 1) * SIZE, at);
				ctx.moveTo(at, first); ctx.lineTo(at, first + (size - 1) * SIZE);
			}
			ctx.stroke();
			ctx.fillStyle = "#2b1d0e";
			stars.forEach(function(pos) {
				var r = Math.floor(pos / size), c = pos % size;
				ctx.beginPath();
				ctx.arc(first + c * SIZE, first + r * SIZE, SIZE * 0.09, 0, 2 * Math.PI);
				ctx.fill();
			});
		}

		xdv.createGadget("board", {
			base: {
				x: 0,
				y: 0,
				z: 0,
			},
			"2d": {
				type: "canvas",
				width: boardWidth,
				height: boardWidth,
				draw: function(ctx) {
					ctx.fillStyle = "#e3b96b";
					ctx.fillRect(-boardWidth / 2, -boardWidth / 2, boardWidth, boardWidth);
					DrawGrid(ctx);
				},
			},
			skin2dwood: {
				/*
				 * The texture arrives asynchronously, and the gadget has
				 * already been asked to draw by then - so the callback paints
				 * into the same context, which is what reversi-xd-view.js does
				 * with its own board texture. The board is briefly blank rather
				 * than briefly wrong.
				 *
				 * The photograph is tiled rather than stretched: stretching one
				 * image across 12000 units turns its grain into smears, and the
				 * grain is the whole point of using a photograph.
				 */
				draw: function(ctx) {
					var half = boardWidth / 2;
					this.getResource("image|" + fullPath + "/res/wood2.jpg", function(img) {
						var tile = boardWidth / WOOD_TILES;
						for(var x = -half; x < half; x += tile)
							for(var y = -half; y < half; y += tile)
								ctx.drawImage(img, x, y, tile, tile);
						// The grain is louder than a flat colour, so the lines
						// are laid over a slight wash to keep the board legible.
						ctx.fillStyle = "rgba(227, 185, 107, 0.18)";
						ctx.fillRect(-half, -half, boardWidth, boardWidth);
						DrawGrid(ctx);
					});
				},
			},
		});

		for(var pos = 0; pos < WIDTH * WIDTH; pos++)
			xdv.createGadget("point#" + pos, {
				base: {
					visible: true,
					z: 2,
				},
				// type, size, classes and opacity go under the skin key, the way
				// mills-xd-view.js declares its cells and pieces: base carries
				// what every skin shares (where it is, whether it shows), the
				// skin key what only that skin understands.
				"2d": {
					type: "element",
					width: SIZE * 0.94,
					height: SIZE * 0.94,
					initialClasses: "go-point",
					opacity: 1,
				},
			});

		// The last stone played, so a board that changes by one stone a turn
		// still reads at a glance.
		xdv.createGadget("last-move", {
			base: {
				visible: false,
				z: 3,
			},
			"2d": {
				type: "element",
				width: SIZE * 0.34,
				height: SIZE * 0.34,
				initialClasses: "go-last",
			},
		});

		/*
		 * Passing has no square to click, so it needs a button of its own -
		 * and on a board where every point is a legal move, it is the one move
		 * a player cannot express by pointing at something.
		 */
		xdv.createGadget("pass-button", {
			base: {
				visible: false,
				x: 0,
				y: 12000 / 2 - MARGIN * 0.6,
				z: 4,
			},
			"2d": {
				type: "canvas",
				width: SIZE * 3.2,
				height: SIZE * 0.9,
				draw: function(ctx) {
					var w = SIZE * 3.2, h = SIZE * 0.9;
					ctx.fillStyle = "#c0c0c0";
					ctx.fillRect(-w / 2, -h / 2, w, h);
					ctx.fillStyle = "#202020";
					ctx.font = "bold " + Math.round(h * 0.5) + "px sans-serif";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillText("Pass", 0, 0);
				},
			},
		});
	}

	/*
	 * Called by jocly.xd-view.js once the skin is built, to settle what shows.
	 * Its absence is not a soft failure: InitView calls it unconditionally, so
	 * a view without one dies with "this.xdBuildScene is not a function" before
	 * anything is drawn at all.
	 *
	 * There is little to settle here. Every intersection is shown - an empty
	 * one draws nothing but is what the player clicks - and the two pieces of
	 * furniture stay hidden until there is a reason for them: the pass button
	 * when it is someone's turn, the mark when a stone has been played.
	 */
	View.Game.xdBuildScene = function(xdv) {
		xdv.updateGadget("board", { base: { visible: true } });
		for(var pos = 0; pos < WIDTH * WIDTH; pos++)
			xdv.updateGadget("point#" + pos, { base: { visible: true } });
		xdv.updateGadget("pass-button", { base: { visible: false } });
		xdv.updateGadget("last-move", { base: { visible: false } });
	}

	// Board coordinates of an intersection, honouring the flip.
	View.Game.goCoord = function(pos) {
		var rc = this.g.Coord[pos];
		var r = rc[0], c = rc[1];
		if(this.mViewAs == JocGame.PLAYER_B) {
			r = WIDTH - 1 - r;
			c = WIDTH - 1 - c;
		}
		var first = -(WIDTH * SIZE) / 2 + MARGIN;
		return [first + c * SIZE, first + r * SIZE, 0];
	}

	View.Board.xdDisplay = function(xdv, aGame) {
		var points = aGame.g.points;
		for(var pos = 0; pos < points; pos++) {
			var at = this.board[pos];
			var coord = aGame.goCoord(pos);
			xdv.updateGadget("point#" + pos, {
				base: {
					visible: true,
					x: coord[0],
					y: coord[1],
				},
				"2d": {
					// opacity is restored as well as set: a point faded out by a
					// capture is reused as soon as someone plays there again, and
					// would otherwise stay invisible with a stone on it.
					opacity: 1,
					classes: at === 0 ? "go-point"
						: (at === JocGame.PLAYER_A ? "go-point go-black" : "go-point go-white"),
				},
			});
		}
		var last = this.lastPlayed;
		if(last === undefined || last < 0)
			xdv.updateGadget("last-move", { base: { visible: false } });
		else {
			var coord = aGame.goCoord(last);
			xdv.updateGadget("last-move", {
				base: { visible: true, x: coord[0], y: coord[1] },
			});
		}
	}

	View.Board.xdInput = function(xdv, aGame) {
		var $this = this;
		return {
			initial: {
				p: null,
			},
			getActions: function(moves, currentInput) {
				if(currentInput.p !== null)
					return null;             // a point is chosen: the move is complete
				var actions = {};
				var canPass = false;
				moves.forEach(function(move) {
					if(move.p < 0) { canPass = true; return; }
					actions["p" + move.p] = {
						view: ["point#" + move.p],
						click: ["point#" + move.p],
						moves: [move],
						validate: { p: move.p },
					};
				});
				if(canPass)
					actions["pass"] = {
						view: ["pass-button"],
						click: ["pass-button"],
						moves: moves.filter(function(m) { return m.p < 0; }),
						validate: { p: -1 },
					};
				return actions;
			},
			furnitures: ["pass-button"],
		};
	}

	/*
	 * A stone appears and, if it captured, several others vanish. There is no
	 * travel to animate - nothing moves across the board in Go - so this fades
	 * the captures out and lets xdDisplay draw the rest.
	 *
	 * A pass moves nothing at all and must not reach the capture path, which
	 * would look up point#-1.
	 */
	View.Board.xdPlayedMove = function(xdv, aGame, aMove) {
		if(!aMove || aMove.p < 0 || !aMove.c || aMove.c.length === 0) {
			aGame.MoveShown();
			return false;
		}
		var pending = aMove.c.length;
		aGame.PlaySound("capture");
		aMove.c.forEach(function(pos) {
			// updateGadget(id, options, delay, callback): the third argument is
			// the animation duration, not a spec field.
			xdv.updateGadget("point#" + pos, {
				"2d": {
					opacity: 0,
				},
			}, 300, function() {
				if(--pending === 0)
					aGame.MoveShown();
			});
		});
	}

})();
