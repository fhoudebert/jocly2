
/*
 * Rococo view - 2D only. A 10x10 board whose inner 8x8 is the playing area; the
 * 36 squares of the outer ring are "edge squares", which a move may only enter
 * to capture, and are shaded distinctly so players can see it.
 *
 * Pieces are drawn from res/ultima/ultima-picto-sprites.png, shared with Ultima.
 *
 * Everything else is in baroque-view.js, shared with Rocaille and Ultima, which
 * must be listed before this file in viewScripts. The panel that separates a
 * swap from a mutual destruction, and that carries the suicide of a frozen
 * piece, is in baroque-choice-view.js.
 */

View.Game.baroqueDefineView({
	sheet: "/res/ultima/baroque-picto-sprites.png",
	columns: {
		"rococo-pawn": 7,						// Cannon Pawn
		"rococo-advancer": 9,
		"rococo-leaper": 2,						// Long Leaper
		"rococo-swapper": 8,
		"rococo-withdrawer": 3,
		"rococo-chameleon": 4,
		"rococo-immobilizer": 5,
		"rococo-king": 6,
	},
	width: 10,
	height: 10,
	ring: true,
	colors: {
		light: "#DDDDD0",
		dark: "#559933",
		edge: "#2f5320",						// darker green: the ring, off-limits
	},
});
