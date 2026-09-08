exports.games = (function() {

	var modelScripts = [
		"go-model.js"
	]

	var config_view_js = [
		"go-xd-view.js"
	]

	var config_view_css = [
		"go.css"
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
				 * 2D only, deliberately: a goban is a flat diagram, and a 3D
				 * board would mean up to 361 stone meshes on one scene. See the
				 * head of go-xd-view.js.
				 *
				 * useShowMoves is off because on a Go board almost every point
				 * is a legal move - highlighting them all says nothing.
				 */
				"view": {
					"title-en": "Go View",
					"module": "go",
					"xdView": true,
					"preferredRatio": 1,
					"switchable": true,
					"useShowMoves": false,
					"useNotation": true,
					"animateSelfMoves": false,
					"js": config_view_js,
					"css": config_view_css,
					"skins": [
						{
							"name": "skin2d",
							"title": "2D",
							"3d": false
						}
					]
				}
			},
			"viewScripts": config_view_js
		}
	}

	return [
		Go("go9", 9, "Go 9x9"),
		Go("go13", 13, "Go 13x13"),
		Go("go19", 19, "Go 19x19")
	]

})();
