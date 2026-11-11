/*
 * Le Jeu de la guerre (Guy Debord, Alice Becker-Ho, 1965-1987).
 *
 * Trois scripts de modele, dans cet ordre : les regles (pures), les
 * heuristiques de l'IA (pures elles aussi), puis l'habillage Jocly.
 */
exports.games = (function() {
	var modelScripts = [
		"kriegspiel-rules.js",
		"kriegspiel-ai.js",
		"kriegspiel-model.js"
	]
	var config_view_js = [
		"kriegspiel-xd-view.js"
	]
	return [
		{
			"name": "jeu-de-la-guerre",
			"modelScripts": modelScripts,
			"config": {
				"status": true,
				"model": {
					"title-en": "A Game of War (Debord)",
					"title": {
						"en": "A Game of War (Debord)",
						"fr": "Le Jeu de la guerre (Debord)"
					},
					"summary": {
						"en": "Guy Debord's Kriegspiel: cut the enemy's lines of communication, destroy its arsenals",
						"fr": "Le Kriegspiel de Guy Debord : coupez les communications adverses, détruisez ses arsenaux"
					},
					"rules": {
						"en": "rules.html",
						"fr": "rules-fr.html"
					},
					"description": {
						"en": "description.html",
						"fr": "description-fr.html"
					},
					"credits": {
						"en": "credits.html",
						"fr": "credits-fr.html"
					},
					"thumbnail": "thumbnail.png",
					"module": "kriegspiel",
					"plazza": "true",
					"js": modelScripts,
					"maxLevel": 4,
					"defaultLevel": 2,
					"gameOptions": {
						"preventRepeat": true,
						// 400 coups Jocly = 200 tours par camp ; Debord compte
						// environ 110 coups pour une partie. 0 : pas de limite
						"maxTurns": 400,
						// victoire C (RSG) : plus de transmission et toutes les
						// unites restantes isolees
						"isolationVictory": true,
						"maxMoves": 5,
						// masque le deploiement du Nord pendant celui du Sud (affichage seul)
						"blindDeployment": false,
						"placementCandidates": 10,
						// lettre de ligne (A-T) + numero de colonne (1-25)
						"map": {
							"mountains": [
								"C10", "C11", "C12", "C13", "D10", "E10", "G10", "H10", "I10",
								"N11", "N12", "N13", "N14", "N15", "N16", "P16", "Q16", "R16"
							],
							"passes": ["F10", "O16"],
							"forts": ["B8", "I13", "H21", "M3", "L15", "O23"],
							"arsenals": {
								"north": ["D8", "B15"],
								"south": ["T3", "T23"]
							}
						},
						"units": {
							"I": { "count": 9, "move": 1, "range": 2, "attack": 4, "defense": 6, "fort": 4, "pass": 2 },
							"C": { "count": 4, "move": 2, "range": 2, "attack": 4, "defense": 5, "charge": 7 },
							"A": { "count": 1, "move": 1, "range": 3, "attack": 5, "defense": 8, "fort": 4, "pass": 2 },
							"AC": { "count": 1, "move": 2, "range": 3, "attack": 5, "defense": 8, "fort": 4, "pass": 2 },
							"T": { "count": 1, "move": 1, "range": 2, "attack": 0, "defense": 1 },
							"E": { "count": 1, "move": 2, "range": 2, "attack": 0, "defense": 1 }
						},
						"levelOptions": {
							"candidates": 28,
							"targets": 5
						}
					},
					"levels": [
						{
							"label": "Rapide",
							"ai": "uct",
							"maxDuration": 1,
							"maxLoops": 40,
							"candidates": 20,
							"targets": 3,
							"playoutDepth": 0,
							"minVisitsExpand": 1,
							"c": 0.4,
							"ignoreLeaf": false,
							"useAlphaBeta": true,
							"propagation": "mixed",
							"propagateMultiVisits": false
						},
						{
							"label": "Normal",
							"isDefault": true,
							"ai": "uct",
							"maxDuration": 2.5,
							"maxLoops": 200,
							"candidates": 28,
							"targets": 5,
							"playoutDepth": 0,
							"minVisitsExpand": 1,
							"c": 0.4,
							"ignoreLeaf": false,
							"useAlphaBeta": true,
							"propagation": "mixed",
							"propagateMultiVisits": false
						},
						{
							"label": "Fort",
							"ai": "uct",
							"maxDuration": 4,
							"maxLoops": 800,
							"candidates": 40,
							"targets": 6,
							"playoutDepth": 0,
							"minVisitsExpand": 1,
							"c": 0.4,
							"ignoreLeaf": false,
							"useAlphaBeta": true,
							"propagation": "mixed",
							"propagateMultiVisits": false
						},
						{
							// Moteur externe, fourni par l'hote (Tabulon) a
							// travers jocly.kriegspielworker.js. Sans moteur,
							// le coup est joue par « Fort » et le repli est
							// annonce : voir src/core/jocly.kriegspiel.js.
							// Le nom reste modeste tant que les mesures ne le
							// placent pas au-dessus des niveaux uct.
							"label": "Moyen (moteur)",
							"ai": "kriegspiel",
							"moveTimeMs": 3000
						}
					]
				},
				"view": {
					"title-en": "A Game of War view",
					"module": "kriegspiel",
					"js": config_view_js,
					"css": [
						"kriegspiel.css"
					],
					"xdView": true,
					"preferredRatio": 1.5,
					"switchable": true,
					"animateSelfMoves": false,
					"useNotation": true,
					"useShowMoves": true,
					"defaultOptions": {
						"sounds": false,
						"notation": true,
						"moves": true
					},
					"skins": [
						{
							"name": "carte",
							"title": "Carte (2D)",
							"preload": [
								"image|/res/images/unites.png",
								"image|/res/images/terrain.png",
								"image|/res/images/marqueurs.png"
							]
						}
					]
				}
			},
			"viewScripts": config_view_js
		}
	]
})()
