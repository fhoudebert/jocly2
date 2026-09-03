/*
 * Patchanka - 10x10, the board colours of the author's own interactive
 * diagram (darkShade #CF8948, lightShade #FFCC9C on the rules page).
 */

(function() {

	var WIDTH = 10;

	View.Game.cbDefineView = function() {

		var patchankaBoardDelta = {
			//notationMode: 'in',
			//notationDebug: true,
		};

		var patchankaBoardDelta3d = $.extend(true,{},patchankaBoardDelta,{
			'colorFill' : {
				"#": "rgba(207,137,72,1)",
				".": "rgba(255,204,156,1)",
			},
		});

		var patchankaBoardDelta2d = $.extend(true,{},patchankaBoardDelta,{
			'colorFill' : {
				"#": "#CF8948",
				".": "#FFCC9C",
			},
		});

		var patchankaBoard3d = $.extend(true,{},this.cbGridBoardClassic3DMargin,patchankaBoardDelta3d);
		var patchankaBoard2d = $.extend(true,{},this.cbGridBoardClassic2DNoMargin,patchankaBoardDelta2d);

		return {
			coords: {
				"2d": this.cbGridBoard.coordsFn.call(this,patchankaBoard2d),
				"3d": this.cbGridBoard.coordsFn.call(this,patchankaBoard3d),
			},
			boardLayout: [
				".#.#.#.#.#",
				"#.#.#.#.#.",
				".#.#.#.#.#",
				"#.#.#.#.#.",
				".#.#.#.#.#",
				"#.#.#.#.#.",
				".#.#.#.#.#",
				"#.#.#.#.#.",
				".#.#.#.#.#",
				"#.#.#.#.#.",
			],
			board: {
				"2d": {
					draw: this.cbDrawBoardFn(patchankaBoard2d),
				},
				"3d": {
					display: this.cbDisplayBoardFn(patchankaBoard3d),
				},
			},
			clicker: {
				"2d": {
					width: 1200,
					height: 1200,
				},
				"3d": {
					scale: [.75,.75,.75],
				},
			},
			pieces: this.cbFairyPieceStyle({
				"default": {
					"2d": {
						width: 1200,
						height: 1200,
					},
					"3d": {
						scale: [.5,.5,.5],
					},
				},
			}),
		};
	}

	/*
	 * Nearly every piece here leaps, and which of its moves is a leap depends
	 * on the move: the Badger's (2,0) is a Dabbaba jump but its (2,2) is a
	 * Bishop slide, and the Ram is the other way round. So the arc is decided
	 * on the file/rank difference rather than on the piece alone.
	 *
	 * The Medusa is left out on purpose: its Alfil and Dabbaba leaps land on
	 * squares its Queen move also reaches, so there is no telling from the
	 * move which of the two it was, and a Queen sliding two squares should
	 * not fly.
	 */
	View.Board.cbMoveMidZ = function(aGame,aMove,zFrom,zTo) {
		var dc = Math.abs(aMove.t%WIDTH - aMove.f%WIDTH);
		var dr = Math.abs(Math.floor(aMove.t/WIDTH) - Math.floor(aMove.f/WIDTH));
		var jump =
			aMove.a=='W' || aMove.a=='O' || aMove.a=='Z' ||   // Wildebeest, Okapi, Bison: always
			(aMove.a=='I' && (dc==2 || dr==2)) ||             // Kirin: the Dabbaba leap, not the Ferz step
			(aMove.a=='H' && dc==2 && dr==2) ||               // Phoenix: the Alfil leap, not the Wazir step
			(aMove.a=='B' && dc+dr==2 && dc*dr==0) ||         // Badger: the Dabbaba leap, not the Bishop ray
			(aMove.a=='R' && dc==2 && dr==2);                 // Ram: the Alfil leap, not the Rook ray
		if(jump)
			return Math.max(zFrom,zTo)+1500;
		else
			return (zFrom+zTo)/2;
	}

})();
