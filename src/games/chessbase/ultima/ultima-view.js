
/*
 * Ultima view - 2D only. A plain 8x8 board, the module's own colours, and no
 * edge ring: Ultima is the game the family grew out of.
 *
 * Pieces are drawn from res/ultima/ultima-picto-sprites.png, shared with
 * Rococo. Note the Pawn is the Pincer Pawn of column 0, not the Cannon Pawn
 * its cousins field, and that Ultima alone has a Coordinator.
 *
 * Everything else is in baroque-view.js, shared with Rococo and Rocaille,
 * which must be listed before this file in viewScripts.
 */

View.Game.baroqueDefineView({
	sheet: "/res/ultima/ultima-picto-sprites.png",
	columns: {
		"ultima-pawn": 0,						// Pincer Pawn
		"ultima-coordinator": 1,
		"ultima-leaper": 2,						// Long Leaper
		"ultima-withdrawer": 3,
		"ultima-chameleon": 4,
		"ultima-immobilizer": 5,
		"ultima-king": 6,
	},
	width: 8,
	height: 8,
	ring: false,
	clicker: 1300,
});
