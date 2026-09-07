/*
 * Three-check: showing the count.
 *
 * The notation already marks every check with a "+", but a player joining a
 * game in progress has no way to see how many have been given without
 * replaying the move list. This puts the count where it is being spent: on
 * each king's own square, as one or two pips meaning "checks received". Two
 * pips is one check from losing.
 *
 * The pips follow the king by themselves - the position comes from
 * cbMakeDisplaySpec(kings[side]), the same call base-view.js uses to place a
 * piece - so nothing here has to know about board flipping (mViewAs) or which
 * skin is showing.
 *
 * A note on the 3D skins: the 2D pips are an "element" gadget, the DOM/CSS
 * primitive base-view.js already uses for cell#<pos>, which has no 3D
 * counterpart in this codebase either. The 3D skins get a coloured ring on
 * the king's square instead, built from the target mesh the clicker gadgets
 * already load - so no new asset - which shows THAT checks have been received
 * and, by its colour, how many, but does not count them as legibly as the
 * pips do.
 */

(function() {

	// Colours shared by the two representations: index = checks received.
	// Kept here rather than only in the stylesheet so the 3D ring and the 2D
	// pips cannot drift apart.
	var TC_COLORS = [0, 0xe8a33d, 0xd0342c];

	var BaseXdInit = View.Game.xdInit;
	var BaseXdDisplay = View.Board.xdDisplay;

	View.Game.xdInit = function(xdv) {
		BaseXdInit.call(this, xdv);
		var $this = this;
		[1, -1].forEach(function(side) {
			xdv.createGadget("tc-pips#" + side, {
				base: {
					visible: false,
				},
				"2d": {
					// Between cell#<pos> (101) and clicker#<pos> (103): above
					// the square's own highlight, below anything clickable.
					z: 102,
					type: "element",
					initialClasses: "cb-tc-pips",
					width: 1300,
					height: 1300,
				},
				"3d": {
					type: "meshfile",
					file: $this.g.fullPath + $this.cbTargetMesh,
					flatShading: true,
					smooth: 0,
					scale: [1, 1, 1],
					materials: {
						"square": {
							transparent: true,
							opacity: 0,
						},
						"ring": {
							color: TC_COLORS[1],
							opacity: 1,
						},
					},
				},
			});
		});
	}

	View.Board.xdDisplay = function(xdv, aGame) {
		BaseXdDisplay.call(this, xdv, aGame);
		var $this = this;
		[1, -1].forEach(function(side) {
			var name = "tc-pips#" + side;
			// tcChecks counts checks GIVEN, indexed 0 = White. What belongs on
			// a king is what it has received, so read the other side's entry.
			var received = $this.tcChecks ? $this.tcChecks[(1 + side) / 2] : 0;
			var pos = $this.kings[side];
			if(!received || pos === undefined) {
				xdv.updateGadget(name, {
					base: {
						visible: false,
					},
				});
				return;
			}
			var n = Math.min(received, TC_COLORS.length - 1);
			var spec = aGame.cbMakeDisplaySpec(pos, side);
			// cbMakeDisplaySpec fills one entry per skin declared in the view's
			// "coords" ("2d", "skin2dwood", "skin2dfull", "3d"): the classes go
			// on every 2D one, the ring colour on the 3D one.
			for(var skin in spec) {
				if(skin == "3d")
					spec[skin] = $.extend(true, spec[skin], {
						materials: {
							ring: {
								color: TC_COLORS[n],
							},
						},
					});
				else
					spec[skin] = $.extend(true, spec[skin], {
						classes: "cb-tc-pips cb-tc-" + n,
						opacity: 1,
					});
			}
			spec.base = {
				visible: true,
			};
			xdv.updateGadget(name, spec);
		});
	}

})();
