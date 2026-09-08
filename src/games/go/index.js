exports.games = (function() {

	var modelScripts = [
		"go-model.js"
	]

	/*
	 * Native levels only, for now, and they are weak: Jocly's own search is not
	 * going to play Go on 361 points, and Evaluate() says so - it counts area on
	 * an unresolved position, which cannot tell a live group from a dead one.
	 * They are here so the game is playable and testable at all. The point of
	 * this module is an engine level (see the analysis: kataeval's kgeSearch in
	 * a worker, the same shape as jocly.scan.js), which is the next piece.
	 */
	var config_model_levels = [
		{
			"name": "beginner",
			"label": "Beginner",
			"maxDepth": 1
		},
		{
			"name": "novice",
			"label": "Novice",
			"maxDepth": 2
		}
	]

	function Go(name, size, title) {
		return {
			"name": name,
			"modelScripts": modelScripts,
			"config": {
				"status": true,
				"model": {
					"title-en": title,
					"summary": {
						"en": "The ancient game of territory, on a " + size + "x" + size + " board",
						"fr": "Le jeu de go, sur un goban " + size + "x" + size
					},
					"rules": {
						"en": "rules.html",
						"fr": "rules-fr.html"
					},
					"maxLevel": 2,
					"module": "go",
					"js": modelScripts,
					"gameOptions": {
						"preventRepeat": false,
						"size": size,
						// White's compensation for moving second. A half point
						// makes draws impossible, which is why it is the norm.
						"komi": size >= 19 ? 7.5 : (size >= 13 ? 6.5 : 5.5)
					},
					"levels": config_model_levels
				},
				/*
				 * A view stub, not a view. There is no view script yet - this
				 * module is the rules and nothing else so far - but JocGame.Init
				 * reads mViewOptions.skins[0].name while building the game, so a
				 * game with no view section at all cannot even be constructed in
				 * a test. Enough to build one, not enough to draw one; the board
				 * comes next.
				 */
				"view": {
					"title-en": "Go View",
					"module": "go",
					"xdView": true,
					"preferredRatio": 1,
					"switchable": true,
					"useShowMoves": false,
					"skins": [
						{
							"name": "skin2d",
							"title": "2D",
							"3d": false
						}
					]
				}
			}
		}
	}

	return [
		Go("go9", 9, "Go 9x9"),
		Go("go13", 13, "Go 13x13"),
		Go("go19", 19, "Go 19x19")
	]

})();
