
/*
 * Rocaille view - 2D, and 3D with the fairy set. A 10x8 field inside a
 * 12x10 board, ring included.
 *
 * Sand and clay rather than Rococo's greens: same board, same ring, but the two
 * games are told apart at a glance in the game list. The ring keeps the relation
 * Rococo uses between its own board and its ring - same hue, a little over half
 * the lightness - so it reads as ground one may not simply walk on.
 *
 * Pieces come from res/ultima/baroque-picto-sprites.png, the family sheet. Its
 * first eleven columns are those of the older ultima sheet, plus a twelfth for
 * the Ghost. The frog of column 10 is the Short Leaper, which the engine still
 * knows but this variant does not use; its Leaper is Rococo's, the kangaroo.
 *
 * Everything else is in baroque-view.js, shared with Rococo and Ultima, which
 * must be listed before this file in viewScripts.
 */

View.Game.baroqueDefineView({
	sheet: "/res/ultima/baroque-picto-sprites.png",
	columns: {
		"rocaille-pawn": 7,						// Cannon Pawn
		"rocaille-advancer": 9,
		"rocaille-leaper": 10,					// Long Leaper - the kangaroo
		"rocaille-swapper": 8,
		"rocaille-withdrawer": 3,
		"rocaille-chameleon": 4,
		"rocaille-immobilizer": 5,
		"rocaille-king": 6,
		"rocaille-ghost": 11,					// no game fields one yet
	},
	pieces3d: {								// fairy-set-view.js
		"rocaille-pawn": "fr-pawn",				// Cannon Pawn: no model yet
		"rocaille-advancer": "fr-advancer",
		"rocaille-leaper": "fr-frog",				// Long Leaper
		"rocaille-swapper": "fr-owl",				// placeholder
		"rocaille-withdrawer": "fr-withdrawer",
		"rocaille-chameleon": "fr-chameleon",
		"rocaille-immobilizer": "fr-wizard",
		"rocaille-king": "fr-king",
		"rocaille-ghost": "fr-pawn",			// placeholder: no game fields one yet
	},
	width: 12,
	height: 10,
	ring: true,
	colors: {
		light: "#FECA66",						// sand
		dark: "#C89264",						// clay
		edge: "#6E5037",						// tobacco: the ring, off-limits
	},
});
