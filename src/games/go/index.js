exports.games = (function() {

	// prelude-model.js comes after go-model.js, whose InitGameExtra, board
	// and move methods it wraps.
	var modelScripts = [
		"go-model.js",
		"prelude-model.js"
	]

	var config_view_js = [
		"go-xd-view.js",
		// Draws the two buttons. Without it the model asks for the prelude,
		// no panel is built, and the game opens on a goban that answers no
		// click.
		"prelude-view.js"
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
	var config_model_levels_native = [
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

	/*
	 * The levels the game is actually for. They differ only in how long the
	 * engine gets to think: a KataGo network plays a reasonable move on its raw
	 * policy alone, and every visit after that is refinement, so a visit budget
	 * is a far more honest strength dial here than a search depth is for a
	 * chess engine.
	 *
	 * The net is not in the repository - see third-party/katago/README.md. When
	 * it is missing the worker says so and Jocly leaves the move alone, rather
	 * than the engine inventing one.
	 */
	function KataLevel(name, label, visits, moveTimeMs) {
		return {
			"name": name,
			"label": label,
			"ai": "kata",
			"net": "katago-nnetwork.bin.gz",
			"visits": visits,
			"moveTimeMs": moveTimeMs,
			// Gumbel-top-n root selection, which is stronger than PUCT at the
			// visit counts a browser can afford.
			"gumbel": 16
		}
	}

	var config_model_levels = config_model_levels_native.concat([
		KataLevel("kata-easy", "Easy", 8, 1000),
		KataLevel("kata-medium", "Medium", 64, 3000),
		KataLevel("kata-strong", "Strong", 400, 8000)
	])

	/*
	 * Which rule set, asked before the first stone.
	 *
	 * Two entries because two is what go-model.js implements, and they differ
	 * by one flag: multi-stone self-capture, legal under Tromp-Taylor and not
	 * under the OGS reading of Chinese rules. They agree on area scoring,
	 * positional superko and the absence of any tax.
	 *
	 * The names are KataGo's, and deliberately so: they are handed to the
	 * engine through goExportMoves, so the board and the engine play the same
	 * game. "Chinese (OGS)" rather than "Chinese" because KataGo's `chinese`
	 * preset uses the SIMPLE ko rule, which this module does not implement -
	 * see the note above RULESETS in go-model.js.
	 *
	 * `persistent: true` preselects the last choice next time. Only the labels
	 * and the option each writes live here: a manifest is serialised with
	 * JSON.stringify, so a dialog can only carry plain data, and the table
	 * that turns a name into behaviour stays in the model.
	 */
	var config_model_prelude = [
		{
			"panelWidth": 1,
			"labels": [
				"Chinese (OGS)",
				"Tromp-Taylor"
			],
			"persistent": true,
			/*
			 * Un drapeau par choix, a cote du libelle. Chemins relatifs au
			 * module, comme tout ce qui est dans res/ -- la vue les prefixe
			 * de mViewOptions.fullPath.
			 *
			 * Ce sont des MNEMONIQUES, pas des definitions. La Nouvelle-Zelande
			 * parce que ses regles autorisent le suicide comme Tromp-Taylor,
			 * qui est justement ce qui separe les deux choix ici ; la Chine
			 * pour la lecture d'OGS, qui n'est pas la pratique des tournois
			 * chinois. Le libelle reste a cote pour dire ce que le drapeau ne
			 * dit pas.
			 */
			"flags": [
				"res/flags/China.png",
				"res/flags/New_Zealand.png"
			],
			"rules": [
				{ "rules": "chinese-ogs" },
				{ "rules": "tromp-taylor" }
			]
		},
		/*
		 * Une seconde etape, vide, et elle n'est pas decorative : le moteur
		 * inverse le trait apres CHAQUE coup, y compris apres la reponse au
		 * prelude. Avec une seule etape, Noir repondait la question et Blanc
		 * posait la premiere pierre -- alors que le go commence par Noir.
		 * L'adversaire franchit celle-ci sans rien decider et le compte
		 * revient a l'endroit.
		 *
		 * C'est la convention des deux autres modules, ou elle s'ecrit de la
		 * meme facon : voir config_model_prelude_draughts8 dans
		 * checkers/index.js et le prelude de minichess5x5-model.js, dont le
		 * commentaire dit exactement la meme chose.
		 */
		0
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
					"maxLevel": 5,
					// Une vignette PAR TAILLE : les trois jeux ne different
					// que par leur goban, et une image commune les rendait
					// indiscernables dans la liste -- la seule chose que le
					// joueur y choisit est justement la taille. Le nom du
					// fichier suit la variable, donc ajouter une taille suffit
					// a lui donner sa vignette.
					"thumbnail": "go-thumbnail-" + size + ".png",
					"module": "go",
					"js": modelScripts,
					"gameOptions": {
						"preventRepeat": false,
						"size": size,
						// White's compensation for moving second. A half point
						// makes draws impossible, which is why it is the norm.
						"komi": size >= 19 ? 7.5 : (size >= 13 ? 6.5 : 5.5),
						// The rule set in force until the prelude is answered,
						// and the one a board set up outside a game plays
						// under. See prelude-model.js.
						"rules": "chinese-ogs",
						"prelude": config_model_prelude
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
					/*
					 * Two skins, both flat. They share the grid and the stones
					 * and differ only in the surface under them: a plain colour,
					 * or a tiled wood photograph (res/wood2.jpg, the one the
					 * xiangqi board uses - copied rather than referenced, since
					 * the build resolves res/** inside the game's own module).
					 */
					"skins": [
						{
							"name": "skin2dwood",
							"title": "Wood",
							"3d": false
						},
						{
							"name": "skin2d",
							"title": "Plain",
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
