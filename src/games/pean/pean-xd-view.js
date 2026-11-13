/*
 * Péan - vue 2D (xd-view), plateau hexagonal.
 *
 * Gadgets :
 *   board    canvas : fond, hexagones et terrains, cotes (rivieres, gues),
 *            frise de grecques, coordonnees
 *   units    canvas : les pions (boucliers), au-dessus du plateau
 *   marks    canvas : objectifs, selection, destinations, chemin survole,
 *            cibles et rapports de force, dernier tour
 *   input    calque transparent qui recoit clics et survol
 *   panel    panneau a droite : trait, ordres, combat en preparation,
 *            information sur l'hexagone survole, boutons
 *
 * Quatre skins : « tuiles » (tuiles de terrain de Wesnoth, pions a embleme
 * de 0 A.D. et arme du type sur le bord du bouclier), « wargame » (memes
 * tuiles, pions carres), « insignes » (pictogrammes de terrain de Wesnoth sur
 * fonds de couleur, pions a embleme) et « carte » (tout dessine, papier
 * clair). La palette « attique » sert de base aux trois premieres.
 *
 * La vue ne connait aucune regle : la saisie d'un tour passe par
 * PeanRules.Turn (aGame.g.rules), le meme objet que le validateur.
 */
(function () {

	var SQ3 = Math.sqrt(3);
	// la scene : x de -6000 a 6000, panneau a droite
	var PANEL_W = 2400, PANEL_X = 6000 - PANEL_W / 2 - 20;
	var BOX_X0 = -6000 + 40, BOX_X1 = 6000 - PANEL_W - 80;      // zone du plateau
	var BOX_H = 8000;
	var MARGIN = 260;                                              // frise + coordonnees
	var BAND = 110;                                                // largeur de la frise

	var PALETTES = {
		attique: {
			paper: "#e8c49a", frame: "#2a1a12", key: "#c8763f", ink: "#2a1a12", grid: "rgba(60,30,15,0.38)",
			plaine: "#e7bf8f", route: "#dcae78", colline: "#d29a62", foret: "#9c8a4c", marais: "#a9a27a",
			ville: "#efd8b8", camp: "#e9cfa6", mine: "#b9935f", montagne: "#6d3f25", mer: "#27455d", other: "#e0b585",
			river: "#2f5f86", ford: "#7fa7c4", wall: "#3b2416",
			sideA: { body: "#1d1410", figure: "#d9824a", rim: "#a3271f", text: "#f3d2ae" },   // figures rouges
			sideB: { body: "#d9824a", figure: "#1d1410", rim: "#1f3f73", text: "#1d1410" },   // figures noires
			reach: "rgba(255,236,170,0.55)", path: "rgba(40,20,10,0.85)", select: "#fff1c9",
			target: "#a3271f", attackers: "#1d6b3a", panel: "#f1dcc0", panelInk: "#2a1a12"
		},
		carte: {
			paper: "#f1ead6", frame: "#5d4a2d", key: "#a68a5b", ink: "#3b3122", grid: "rgba(80,70,50,0.35)",
			plaine: "#eee6cd", route: "#e2d3a8", colline: "#d8c79a", foret: "#a9bf8a", marais: "#bfcdb5",
			ville: "#e9dcc0", camp: "#e6d6b1", mine: "#cdbb98", montagne: "#8c7a63", mer: "#8fb2c9", other: "#e8dfc4",
			river: "#3d74a8", ford: "#9cc0dc", wall: "#5d4a2d",
			sideA: { body: "#9e2a22", figure: "#fbeee0", rim: "#5e140f", text: "#fbeee0" },
			sideB: { body: "#24497e", figure: "#f1f4fa", rim: "#0f2546", text: "#f1f4fa" },
			reach: "rgba(255,214,90,0.45)", path: "rgba(60,40,10,0.85)", select: "#ffffff",
			target: "#b3261e", attackers: "#1b6e3a", panel: "#f1ead6", panelInk: "#3b3122"
		}
	};

	// « insignes » : la palette attique, avec les emblemes de 0 A.D. pour boucliers et
	// les pictogrammes blancs de Wesnoth pour les terrains : fonds plus soutenus
	PALETTES.insignes = Object.assign({}, PALETTES.attique, {
		foret: "#6f7a3a", marais: "#7d8a63", montagne: "#6d3f25", mer: "#2b5674",
		colline: "#b07a45", ville: "#8a6446", camp: "#7a5638", mine: "#5e4a36"
	});

	// « tuiles » : tuiles de terrain de Wesnoth, memes pions que « insignes »
	PALETTES.tuiles = PALETTES.insignes;
	PALETTES.wargame = PALETTES.insignes;

	/*
	 * Tuiles de Wesnoth (res/images/tuiles/), 72 x 72 : leur hexagone a sommet
	 * plat a les sommets aux memes proportions que le notre, une mise a
	 * l'echelle suffit. Une tuile de sol est posee sous chaque case (les forets
	 * et les herbes du marais sont des surimpressions transparentes) ; les
	 * variantes sont tirees d'apres le numero de case, pour casser la repetition.
	 */
	var TILES = {
		plaine: ["plaine1", "plaine2", "plaine3"], sec: ["plaine4", "plaine5"], route: ["route"],
		colline: ["colline1", "colline2", "colline3"], foret: ["foret1", "foret2", "foret3"],
		marais: ["marais1", "marais1", "marais2"], montagne: ["montagne1", "montagne1", "montagne2"],
		mer: ["mer"], ville: ["ville"], camp: ["camp"], mine: ["mine"]
	};

	function variant(list, h, salt) {
		return list[(Math.imul(h + 1, 2654435761) >>> (salt || 7)) % list.length];
	}

	// herbe seche par grandes plaques (bruit lisse), pas case par case
	function groundOf(rc, h) {
		var c = h % rc.cols, r = Math.floor(h / rc.cols);
		var n = 0.5 + 0.28 * Math.sin(c * 0.42 + r * 0.23 + 1.3) + 0.22 * Math.sin(r * 0.57 - c * 0.17 + 4.1);
		return variant(n > 0.62 ? TILES.sec : TILES.plaine, h, 9);
	}

	// pictogrammes de terrain de la skin « insignes » (res/images/terrain/)
	var TERRAIN_ICONS = { foret: "foret", marais: "marais", montagne: "montagne", mer: "mer",
		colline: "colline", ville: "ville", camp: "camp", mine: "mine" };

	var TEXT = {
		fr: {
			toPlay: "au trait", deploy: "déploiement", turn: "Tour", of: "sur",
			orders: "Ordres", combats: "Combats", points: "Points", losses: "Pertes",
			deployHint: "Choisissez un type d’unité, puis un hexagone de votre zone (en clair). Un clic sur une unité posée la reprend. Un général au moins.",
			budget: "Budget", auto: "Placement automatique", clear: "Tout retirer", endDeploy: "Fin du déploiement",
			moveHint: "Cliquez une unité, puis sa destination. Un ordre active une unité ou un groupe contigu de même type. Cliquez une cible ennemie pour préparer un combat : les mouvements sont alors terminés.",
			groupOn: "Groupe : oui", groupOff: "Groupe : non", line: "Toute la ligne",
			facing: "Orientation à l’arrivée", auto2: "auto", pivot: "Pivoter sur place",
			combatHint: "Cliquez vos unités pour les ajouter ou les retirer de l’attaque.",
			fight: "Livrer le combat", cancel: "Annuler la sélection", advanceOn: "Avancer : oui", advanceOff: "Avancer : non",
			undo: "Annuler le dernier", endTurn: "Fin du tour",
			att: "Attaque", def: "Défense", ratio: "Rapport", tooWeak: "attaque impossible (moins de 1:1)",
			result: {
				neant: "sans effet", echange: "échange (un pas de chaque côté)", recul: "recul",
				"perte-recul": "perte d’un pas et recul", elimination: "élimination"
			},
			resultShort: { neant: "=", echange: "⇄", recul: "↩", "perte-recul": "−↩", elimination: "✕" },
			steps: "pas", force: "force", move: "mvt", value: "valeur", facingOf: "face",
			reinforcements: "Renforts arrivés", engaged: "engagée",
			traits: { phalange: "phalange", leger: "léger", tir: "tir", monte: "monté", desengage: "se désengage", charge: "charge", general: "général" },
			terrain: { plaine: "plaine", route: "route", colline: "colline", foret: "forêt", marais: "marais", ville: "ville", camp: "camp", mine: "mine", montagne: "montagne", mer: "mer" },
			side: { riviere: "rivière", gue: "gué", mur: "mur" },
			objective: "Objectif", held: "tenu par", nobody: "personne",
			why: {
				"combat-started": "Les combats ont commencé : plus de mouvement.",
				"no-order-left": "Plus d’ordre disponible ce tour.",
				"already-ordered": "Cette unité a déjà reçu un ordre.",
				"in-zoc": "Unité engagée dans une zone de contrôle ennemie : elle ne bouge pas.",
				"group-in-zoc": "Un groupe ne peut pas partir d’une zone de contrôle ennemie.",
				"mixed-group": "Un groupe réunit des unités du même type.",
				"not-contiguous": "Les unités d’un groupe doivent se toucher."
			},
			waiting: "L’adversaire joue…", last: "Dernier tour",
			win: "Victoire", draw: "Partie nulle",
			reason: {
				annihilated: "l’armée adverse est anéantie", broken: "l’armée adverse a perdu la moitié de sa valeur",
				objective: "objectif décisif tenu", points: "aux points", repeat: "répétition de position"
			},
			dirs: ["N", "NE", "SE", "S", "SO", "NO"]
		},
		en: {
			toPlay: "to move", deploy: "deployment", turn: "Turn", of: "of",
			orders: "Orders", combats: "Combats", points: "Points", losses: "Losses",
			deployHint: "Pick a unit type, then a hex of your zone (highlighted). Click a placed unit to take it back. At least one general.",
			budget: "Budget", auto: "Automatic deployment", clear: "Remove all", endDeploy: "Deployment done",
			moveHint: "Click a unit, then its destination. An order activates one unit or a contiguous group of the same type. Click an enemy target to prepare a combat: movement is then over.",
			groupOn: "Group: on", groupOff: "Group: off", line: "Whole line",
			facing: "Facing on arrival", auto2: "auto", pivot: "Pivot in place",
			combatHint: "Click your units to add them to the attack or remove them.",
			fight: "Resolve combat", cancel: "Clear selection", advanceOn: "Advance: yes", advanceOff: "Advance: no",
			undo: "Undo last", endTurn: "End turn",
			att: "Attack", def: "Defence", ratio: "Odds", tooWeak: "attack not allowed (below 1:1)",
			result: {
				neant: "no effect", echange: "exchange (one step each)", recul: "retreat",
				"perte-recul": "step loss and retreat", elimination: "eliminated"
			},
			resultShort: { neant: "=", echange: "⇄", recul: "↩", "perte-recul": "−↩", elimination: "✕" },
			steps: "steps", force: "strength", move: "move", value: "value", facingOf: "facing",
			reinforcements: "Reinforcements arrived", engaged: "engaged",
			traits: { phalange: "phalanx", leger: "light", tir: "missile", monte: "mounted", desengage: "disengages", charge: "charge", general: "general" },
			terrain: { plaine: "plain", route: "road", colline: "hill", foret: "forest", marais: "marsh", ville: "town", camp: "camp", mine: "mine", montagne: "mountain", mer: "sea" },
			side: { riviere: "river", gue: "ford", mur: "wall" },
			objective: "Objective", held: "held by", nobody: "nobody",
			why: {
				"combat-started": "Combat has begun: no more movement.",
				"no-order-left": "No order left this turn.",
				"already-ordered": "This unit has already been ordered.",
				"in-zoc": "Unit engaged in an enemy zone of control: it cannot move.",
				"group-in-zoc": "A group cannot leave an enemy zone of control.",
				"mixed-group": "A group gathers units of the same type.",
				"not-contiguous": "The units of a group must touch."
			},
			waiting: "Opponent is playing…", last: "Last turn",
			win: "Victory", draw: "Draw",
			reason: {
				annihilated: "the enemy army is wiped out", broken: "the enemy army has lost half its value",
				objective: "decisive objective held", points: "on points", repeat: "position repeated"
			},
			dirs: ["N", "NE", "SE", "S", "SW", "NW"]
		}
	};

	var ui = null;   // etat de la vue, refait par xdInit

	function lang() {
		var l = "";
		function of(win) {
			try {
				return new URLSearchParams(win.location.search).get("lang") || win.document.documentElement.lang || "";
			} catch (e) {
				return "";
			}
		}
		try {
			l = (of(window.parent !== window ? window.parent : window) || of(window) || navigator.language || "").toLowerCase();
		} catch (e) { }
		return l.indexOf("fr") === 0 ? TEXT.fr : TEXT.en;
	}

	function isFr() { return lang() === TEXT.fr; }

	function loc(obj) {
		if (!obj) return "";
		if (typeof obj === "string") return obj;
		return (isFr() ? obj.fr : obj.en) || obj.fr || obj.en || "";
	}

	function esc(text) {
		return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}

	function pal() { return PALETTES[ui && ui.game && PALETTES[ui.game.mSkin] ? ui.game.mSkin : "attique"]; }

	/* ---------- images (skin « insignes ») ---------- */

	function imageUrl(kind, name) {
		return ui.fullPath + "/res/images/" + kind + "/" + name + ".png";
	}

	// une image de la skin, chargee une fois ; le dessin est relance a l'arrivee
	function withImage(avatar, url, draw, gadgets) {
		var image = ui.images[url];
		if (image) {
			draw(image);
			return true;
		}
		if (ui.images[url] === undefined && avatar && avatar.getResource) {
			ui.images[url] = null;
			avatar.getResource("image|" + url, function (loaded) {
				ui.images[url] = loaded;
				setTimeout(function () { redraw(gadgets || ["units"]); }, 0);
			});
		}
		return false;
	}

	// pions a embleme et bannieres : skins « insignes » et « tuiles »
	function insignia() { return ["insignes", "tuiles", "wargame"].indexOf(ui.game.mSkin) >= 0; }

	// les skins a tuiles de terrain
	function tiled() { return ["tuiles", "wargame"].indexOf(ui.game.mSkin) >= 0; }

	// une tuile, decoupee a l'hexagone ; false tant qu'elle n'est pas chargee
	function drawTile(ctx, avatar, name, x, y, R) {
		return withImage(avatar, imageUrl("tuiles", name), function (image) {
			ctx.save();
			hexPath(ctx, x, y, R);
			ctx.clip();
			ctx.drawImage(image, x - R, y - R * SQ3 / 2, 2 * R, R * SQ3);
			ctx.restore();
		}, ["board"]);
	}

	function emblemOf(u) {
		var rc = ui.game.g.ctx;
		return (rc.unitEmblems && rc.unitEmblems[u.i]) || rc.camps[u.s].emblem;
	}

	function emptyOverlay() {
		return { sel: [], dests: null, path: null, targets: [], target: -1, attackers: [], eligible: [],
			arrows: [], hits: [], ghost: null, zone: null, ordered: [] };
	}

	/* ---------- geometrie ---------- */

	function layout(rc) {
		var w = BOX_X1 - BOX_X0 - 2 * MARGIN, h = BOX_H - 2 * MARGIN;
		var R = Math.min(w / (1.5 * rc.cols + 0.5), h / ((rc.rows + 0.5) * SQ3));
		var bw = R * (1.5 * rc.cols + 0.5), bh = R * SQ3 * (rc.rows + 0.5);
		var cx = (BOX_X0 + BOX_X1) / 2;
		return { R: R, bw: bw, bh: bh, x0: cx - bw / 2, y0: -bh / 2, cx: cx, cy: 0,
			cw: bw + 2 * MARGIN, ch: bh + 2 * MARGIN };
	}

	// le bord du camp vu en bas de l'ecran : on retourne le plateau si ce camp vient du nord
	function flipped() {
		var rc = ui.game.g.ctx, side = ui.game.mViewAs === -1 ? -1 : 1;
		return rc.home[side] === "nord";
	}

	function hexXY(h) {
		var rc = ui.game.g.ctx, L = ui.L;
		var c = h % rc.cols, r = Math.floor(h / rc.cols);
		var x = L.x0 + L.R * (1 + 1.5 * c), y = L.y0 + L.R * SQ3 * (0.5 + r + 0.5 * (c & 1));
		if (flipped()) {
			x = 2 * L.cx - x;
			y = 2 * L.cy - y;
		}
		return [x, y];
	}

	// direction d'un hexagone telle qu'on la voit (le plateau peut etre retourne)
	function screenDir(d) { return flipped() ? (d + 3) % 6 : d; }

	function hexAtPoint(x, y) {
		var rc = ui.game.g.ctx, L = ui.L;
		if (flipped()) {
			x = 2 * L.cx - x;
			y = 2 * L.cy - y;
		}
		var px = x - (L.x0 + L.R), py = y - (L.y0 + L.R * SQ3 / 2);
		var q = (2 / 3 * px) / L.R, r = (-1 / 3 * px + SQ3 / 3 * py) / L.R;
		var s = -q - r;
		var rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
		var dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
		if (dq > dr && dq > ds) rq = -rr - rs;
		else if (dr > ds) rr = -rq - rs;
		return ui.game.g.rules.hexAt(rc, rq, rr);
	}

	function hexPath(ctx, x, y, R) {
		ctx.beginPath();
		for (var i = 0; i < 6; i++) {
			var a = Math.PI / 3 * i;
			var px = x + R * Math.cos(a), py = y + R * Math.sin(a);
			if (i === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.closePath();
	}

	// milieu du cote d'un hexagone dans la direction d (0 = N)
	function sideSegment(x, y, R, d) {
		// sommets du cote : direction d a l'ecran -> angles des deux sommets
		var angle = -Math.PI / 2 + d * Math.PI / 3;           // vers le voisin
		var a1 = angle - Math.PI / 6, a2 = angle + Math.PI / 6;
		var r = R;
		return [x + r * Math.cos(a1), y + r * Math.sin(a1), x + r * Math.cos(a2), y + r * Math.sin(a2)];
	}

	/* ---------- canvas du plateau ---------- */

	// frise de grecques le long d'un segment horizontal (repere local)
	function meanderBand(ctx, length, s) {
		var n = Math.floor(length / (4 * s));
		var off = (length - n * 4 * s) / 2;
		ctx.beginPath();
		for (var i = 0; i < n; i++) {
			var x = off + i * 4 * s;
			var pts = [[0, 3], [0, 0], [3, 0], [3, 2], [1, 2], [1, 1], [2, 1]];
			for (var k = 0; k < pts.length; k++) {
				var px = x + pts[k][0] * s, py = pts[k][1] * s;
				if (k === 0) ctx.moveTo(px, py + 0.5 * s);
				else ctx.lineTo(px, py + 0.5 * s);
			}
			ctx.moveTo(x, 3.5 * s);
			ctx.lineTo(x + 4 * s, 3.5 * s);
		}
		ctx.stroke();
	}

	function drawFrame(ctx, L, P) {
		var x = L.x0 - MARGIN, y = L.y0 - MARGIN, w = L.cw, h = L.ch;
		ctx.fillStyle = P.frame;
		ctx.fillRect(x, y, w, h);
		var s = (BAND - 20) / 4;
		ctx.strokeStyle = P.key;
		ctx.lineWidth = s * 0.42;
		ctx.lineJoin = "miter";
		[[x + 12, y + 12, w - 24, 0], [x + w - 12, y + 12, h - 24, Math.PI / 2],
			[x + w - 12, y + h - 12, w - 24, Math.PI], [x + 12, y + h - 12, h - 24, -Math.PI / 2]].forEach(function (side) {
			ctx.save();
			ctx.translate(side[0], side[1]);
			ctx.rotate(side[3]);
			meanderBand(ctx, side[2], s);
			ctx.restore();
		});
		ctx.fillStyle = P.paper;
		ctx.fillRect(x + BAND, y + BAND, w - 2 * BAND, h - 2 * BAND);
	}

	// petits motifs de terrain, au trait ; pictogrammes de Wesnoth en skin « insignes »
	function terrainGlyph(ctx, name, x, y, R, P, seed, avatar) {
		if (tiled() && TILES[name])
			return;   // la tuile dit deja tout
		if (avatar && insignia() && TERRAIN_ICONS[name] &&
				withImage(avatar, imageUrl("terrain", TERRAIN_ICONS[name]), function (image) {
					ctx.save();
					ctx.imageSmoothingEnabled = false;
					ctx.globalAlpha = 0.9;
					var size = R * 1.1;
					ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
					ctx.restore();
				}, ["board"]))
			return;
		ctx.save();
		ctx.strokeStyle = P.ink;
		ctx.fillStyle = P.ink;
		ctx.globalAlpha = 0.55;
		ctx.lineWidth = R * 0.05;
		var k;
		switch (name) {
			case "colline":
				ctx.beginPath();
				ctx.arc(x, y + R * 0.35, R * 0.55, Math.PI * 1.15, Math.PI * 1.85);
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(x, y + R * 0.55, R * 0.32, Math.PI * 1.15, Math.PI * 1.85);
				ctx.stroke();
				break;
			case "foret":
				for (k = 0; k < 3; k++) {
					var tx = x + R * [-0.35, 0.3, 0][k], ty = y + R * [0.1, 0.2, -0.3][k];
					ctx.beginPath();
					ctx.arc(tx, ty - R * 0.12, R * 0.17, 0, Math.PI * 2);
					ctx.fill();
					ctx.fillRect(tx - R * 0.025, ty, R * 0.05, R * 0.18);
				}
				break;
			case "marais":
				for (k = -1; k <= 1; k++) {
					ctx.beginPath();
					ctx.moveTo(x + k * R * 0.32 - R * 0.15, y + R * 0.2 + (k & 1) * R * 0.2);
					ctx.lineTo(x + k * R * 0.32 + R * 0.15, y + R * 0.2 + (k & 1) * R * 0.2);
					ctx.moveTo(x + k * R * 0.32, y + R * 0.2 + (k & 1) * R * 0.2);
					ctx.lineTo(x + k * R * 0.32, y - R * 0.12 + (k & 1) * R * 0.2);
					ctx.stroke();
				}
				break;
			case "montagne":
				ctx.globalAlpha = 0.7;
				ctx.strokeStyle = "#f2dcc0";
				ctx.beginPath();
				ctx.moveTo(x - R * 0.55, y + R * 0.35);
				ctx.lineTo(x - R * 0.15, y - R * 0.3);
				ctx.lineTo(x + R * 0.1, y + R * 0.05);
				ctx.lineTo(x + R * 0.3, y - R * 0.15);
				ctx.lineTo(x + R * 0.6, y + R * 0.35);
				ctx.stroke();
				break;
			case "mer":
				ctx.globalAlpha = 0.5;
				ctx.strokeStyle = "#d8e6ee";
				for (k = -1; k <= 1; k += 2) {
					ctx.beginPath();
					var wy = y + k * R * 0.22 + ((seed % 3) - 1) * R * 0.05;
					ctx.moveTo(x - R * 0.45, wy);
					ctx.quadraticCurveTo(x - R * 0.22, wy - R * 0.14, x, wy);
					ctx.quadraticCurveTo(x + R * 0.22, wy + R * 0.14, x + R * 0.45, wy);
					ctx.stroke();
				}
				break;
			case "ville":
				// fronton de temple
				ctx.globalAlpha = 0.75;
				ctx.beginPath();
				ctx.moveTo(x - R * 0.45, y - R * 0.15);
				ctx.lineTo(x, y - R * 0.45);
				ctx.lineTo(x + R * 0.45, y - R * 0.15);
				ctx.closePath();
				ctx.stroke();
				for (k = -2; k <= 2; k++)
					ctx.fillRect(x + k * R * 0.17 - R * 0.03, y - R * 0.12, R * 0.06, R * 0.42);
				ctx.fillRect(x - R * 0.5, y + R * 0.3, R, R * 0.06);
				break;
			case "mine":
				// puits, deblais et pic
				ctx.globalAlpha = 0.75;
				ctx.beginPath();
				ctx.ellipse(x, y + R * 0.1, R * 0.3, R * 0.18, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.beginPath();
				ctx.moveTo(x - R * 0.5, y + R * 0.4);
				ctx.quadraticCurveTo(x - R * 0.35, y + R * 0.15, x - R * 0.15, y + R * 0.4);
				ctx.moveTo(x + R * 0.15, y + R * 0.42);
				ctx.quadraticCurveTo(x + R * 0.35, y + R * 0.2, x + R * 0.52, y + R * 0.42);
				ctx.moveTo(x - R * 0.25, y - R * 0.5);
				ctx.lineTo(x + R * 0.2, y - R * 0.12);
				ctx.moveTo(x - R * 0.4, y - R * 0.28);
				ctx.quadraticCurveTo(x - R * 0.12, y - R * 0.48, x + R * 0.05, y - R * 0.55);
				ctx.stroke();
				break;
			case "camp":
				ctx.globalAlpha = 0.75;
				for (k = -1; k <= 1; k += 2) {
					ctx.beginPath();
					ctx.moveTo(x + k * R * 0.25 - R * 0.22, y + R * 0.25);
					ctx.lineTo(x + k * R * 0.25, y - R * 0.2);
					ctx.lineTo(x + k * R * 0.25 + R * 0.22, y + R * 0.25);
					ctx.closePath();
					ctx.stroke();
				}
				break;
		}
		ctx.restore();
	}

	function drawBoard(ctx) {
		if (!ui) return;
		var avatar = this, game = ui.game, rc = game.g.ctx, L = ui.L, P = pal();
		ctx.save();
		ctx.translate(-L.cx, -L.cy);
		drawFrame(ctx, L, P);
		var h, xy, R = L.R;
		// hexagones
		for (h = 0; h < rc.N; h++) {
			xy = hexXY(h);
			var name = rc.terrainNames[rc.terr[h]];
			hexPath(ctx, xy[0], xy[1], R);
			ctx.fillStyle = P[name] || P.other;
			ctx.fill();
			if (tiled() && TILES[name]) {
				drawTile(ctx, avatar, groundOf(rc, h), xy[0], xy[1], R);
				if (name !== "plaine")
					drawTile(ctx, avatar, variant(TILES[name], h), xy[0], xy[1], R);
			}
		}
		// routes : du centre vers les voisins routiers
		ctx.strokeStyle = "rgba(90,60,30,0.45)";
		ctx.lineWidth = R * 0.14;
		ctx.lineCap = "round";
		ctx.beginPath();
		for (h = 0; h < rc.N; h++) {
			if (!rc.terrains[rc.terr[h]].road) continue;
			xy = hexXY(h);
			for (var d = 0; d < 3; d++) {
				var n = rc.nb[h * 6 + d];
				if (n >= 0 && (rc.terrains[rc.terr[n]].road || rc.objAt[n])) {
					var b = hexXY(n);
					ctx.moveTo(xy[0], xy[1]);
					ctx.lineTo(b[0], b[1]);
				}
			}
		}
		ctx.stroke();
		for (h = 0; h < rc.N; h++) {
			xy = hexXY(h);
			terrainGlyph(ctx, rc.terrainNames[rc.terr[h]], xy[0], xy[1], R, P, h, avatar);
		}
		// quadrillage
		ctx.strokeStyle = P.grid;
		ctx.lineWidth = R * 0.035;
		for (h = 0; h < rc.N; h++) {
			xy = hexXY(h);
			hexPath(ctx, xy[0], xy[1], R);
			ctx.stroke();
		}
		// cotes d'hexagone : rivieres, gues, murs
		ctx.lineCap = "round";
		for (h = 0; h < rc.N; h++)
			for (var dd = 0; dd < 3; dd++) {
				var e = rc.edge[h * 6 + dd];
				if (!e) continue;
				var kind = rc.sideNames[e - 1];
				xy = hexXY(h);
				var seg = sideSegment(xy[0], xy[1], R, screenDir(dd));
				ctx.strokeStyle = kind === "gue" ? P.ford : kind === "mur" ? P.wall : P.river;
				ctx.lineWidth = R * (kind === "riviere" ? 0.2 : 0.16);
				ctx.setLineDash(kind === "gue" ? [R * 0.12, R * 0.1] : []);
				ctx.beginPath();
				ctx.moveTo(seg[0], seg[1]);
				ctx.lineTo(seg[2], seg[3]);
				ctx.stroke();
			}
		ctx.setLineDash([]);
		// coordonnees
		if (game.mNotation) {
			var R2 = game.g.rules;
			ctx.fillStyle = P.ink;
			ctx.font = "bold " + Math.round(R * 0.4) + "px Georgia, serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			for (var c = 0; c < rc.cols; c++) {
				var top = hexXY(c), bottom = hexXY((rc.rows - 1) * rc.cols + c);
				var upper = top[1] < bottom[1] ? top : bottom;
				var lower = top[1] < bottom[1] ? bottom : top;
				var lab = (MARGIN - BAND) / 2;
				ctx.fillText(R2.colName(c), upper[0], L.y0 - lab);
				ctx.fillText(R2.colName(c), lower[0], L.y0 + L.bh + lab);
			}
			for (var r = 0; r < rc.rows; r++) {
				var left = hexXY(r * rc.cols), right = hexXY(r * rc.cols + rc.cols - 1);
				var a = left[0] < right[0] ? left : right, bb = left[0] < right[0] ? right : left;
				ctx.fillText(r + 1, L.x0 - (MARGIN - BAND) / 2, a[1]);
				ctx.fillText(r + 1, L.x0 + L.bw + (MARGIN - BAND) / 2, bb[1]);
			}
		}
		ctx.restore();
	}

	/* ---------- pions ---------- */

	/*
	 * Icones des types, dans un repere de 100 unites centre. Un type les tire
	 * de ses traits, ou du scenario (cle « icone » d'un type) : c'est ce qui
	 * distingue, par exemple, Immortels (lance) et sparabara (pavois).
	 */
	function iconName(t) {
		if (t.icon && GLYPHS[t.icon]) return t.icon;
		if (t.general) return "casque";
		if (t.fire && t.mounted) return "cheval-arc";
		if (t.fire && t.light) return "fronde";
		if (t.fire) return "arc";
		if (t.mounted && t.charge) return "cheval-lance";
		if (t.mounted) return "cheval";
		if (t.phalanx) return "aspis";
		if (t.light) return "javelots";
		return "lance";
	}

	// tete de cheval, a la facon du cavalier des echecs
	function horseHead(ctx) {
		ctx.beginPath();
		ctx.moveTo(-24, 36);
		ctx.lineTo(-22, 12);
		ctx.lineTo(-30, 0);
		ctx.lineTo(-30, -12);
		ctx.lineTo(-16, -28);
		ctx.lineTo(-8, -42);
		ctx.lineTo(-2, -32);
		ctx.lineTo(12, -24);
		ctx.lineTo(28, -6);
		ctx.lineTo(26, 4);
		ctx.lineTo(16, 4);
		ctx.lineTo(4, -4);
		ctx.lineTo(8, 14);
		ctx.lineTo(18, 36);
		ctx.closePath();
		ctx.fill();
	}

	function spear(ctx, x1, y1, x2, y2, w) {
		ctx.lineWidth = w || 6;
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		var a = Math.atan2(y2 - y1, x2 - x1);
		ctx.beginPath();
		ctx.moveTo(x2 + Math.cos(a) * 10, y2 + Math.sin(a) * 10);
		ctx.lineTo(x2 + Math.cos(a + 2.4) * 8, y2 + Math.sin(a + 2.4) * 8);
		ctx.lineTo(x2 + Math.cos(a - 2.4) * 8, y2 + Math.sin(a - 2.4) * 8);
		ctx.closePath();
		ctx.fill();
	}

	function bow(ctx, cx, r) {
		ctx.lineWidth = 7;
		ctx.beginPath();
		ctx.arc(cx, 0, r, -Math.PI / 2.6, Math.PI / 2.6);
		ctx.stroke();
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(cx + r * Math.cos(Math.PI / 2.6), -r * Math.sin(Math.PI / 2.6));
		ctx.lineTo(cx + r * Math.cos(Math.PI / 2.6), r * Math.sin(Math.PI / 2.6));
		ctx.stroke();
	}

	var GLYPHS = {
		casque: function (ctx) {
			ctx.beginPath();
			ctx.arc(0, 6, 22, Math.PI, 0);
			ctx.lineTo(22, 30);
			ctx.lineTo(7, 30);
			ctx.lineTo(7, 12);
			ctx.lineTo(-7, 12);
			ctx.lineTo(-7, 30);
			ctx.lineTo(-22, 30);
			ctx.closePath();
			ctx.fill();
			ctx.lineWidth = 11;
			ctx.beginPath();
			ctx.moveTo(-28, -6);
			ctx.quadraticCurveTo(0, -50, 32, -10);
			ctx.stroke();
		},
		aspis: function (ctx, fg, bg, t) {
			spear(ctx, -34, 34, 28, -28, 7);
			ctx.beginPath();
			ctx.arc(-4, 6, 24, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = bg;
			ctx.lineWidth = 4;
			ctx.beginPath();
			if (t && t.force >= 7) {   // elite : lambda
				ctx.moveTo(-14, 18);
				ctx.lineTo(-4, -8);
				ctx.lineTo(6, 18);
			} else
				ctx.arc(-4, 6, 15, 0, Math.PI * 2);
			ctx.stroke();
		},
		lance: function (ctx, fg, bg) {
			spear(ctx, -26, 40, 22, -36, 8);
			// la pomme d'or des Immortels au talon
			ctx.beginPath();
			ctx.arc(-27, 41, 8, 0, Math.PI * 2);
			ctx.fill();
			// petit bouclier en croissant
			ctx.lineWidth = 8;
			ctx.beginPath();
			ctx.arc(10, 10, 20, Math.PI * 0.55, Math.PI * 1.45);
			ctx.stroke();
		},
		pavois: function (ctx, fg, bg) {
			// grand bouclier d'osier rectangulaire, lance derriere
			spear(ctx, 26, 40, 26, -40, 6);
			ctx.fillRect(-28, -32, 42, 66);
			ctx.strokeStyle = bg;
			ctx.lineWidth = 3;
			ctx.beginPath();
			for (var y = -22; y < 34; y += 11) {
				ctx.moveTo(-24, y);
				ctx.lineTo(10, y);
			}
			ctx.stroke();
		},
		javelots: function (ctx) {
			spear(ctx, -30, 30, 26, -26, 6);
			spear(ctx, 30, 30, -26, -26, 6);
		},
		fronde: function (ctx) {
			// deux cordes, la poche et la pierre ; le tour de main
			ctx.lineWidth = 5;
			ctx.beginPath();
			ctx.moveTo(-26, -30);
			ctx.quadraticCurveTo(-30, 10, 8, 22);
			ctx.moveTo(-26, -30);
			ctx.quadraticCurveTo(10, -20, 18, 14);
			ctx.stroke();
			ctx.beginPath();
			ctx.ellipse(14, 20, 12, 8, -0.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(-26, -30, 7, 0, Math.PI * 2);
			ctx.fill();
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.arc(-4, -4, 38, Math.PI * 1.15, Math.PI * 1.75);
			ctx.stroke();
		},
		arc: function (ctx) {
			bow(ctx, -18, 36);
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.moveTo(-34, 0);
			ctx.lineTo(30, 0);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(38, 0);
			ctx.lineTo(26, -9);
			ctx.lineTo(26, 9);
			ctx.closePath();
			ctx.fill();
		},
		cheval: function (ctx) {
			horseHead(ctx);
			spear(ctx, 8, 40, 40, -34, 5);
		},
		"cheval-lance": function (ctx) {
			horseHead(ctx);
			spear(ctx, -40, 30, 40, -40, 6);
		},
		"cheval-arc": function (ctx) {
			horseHead(ctx);
			ctx.save();
			ctx.translate(20, 0);
			bow(ctx, -12, 26);
			ctx.restore();
		}
	};

	// icone d'un type ; `halo` : un liseré sombre pour la lire sur n'importe quel fond
	function drawIcon(ctx, t, color, halo) {
		var draw = GLYPHS[iconName(t)];
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		var bg = halo || "rgba(0,0,0,0.6)";
		if (halo) {
			ctx.save();
			ctx.strokeStyle = ctx.fillStyle = halo;
			for (var k = 0; k < 8; k++) {
				ctx.save();
				ctx.translate(Math.cos(k * Math.PI / 4) * 4, Math.sin(k * Math.PI / 4) * 4);
				draw(ctx, halo, halo, t);
				ctx.restore();
			}
			ctx.restore();
		}
		ctx.strokeStyle = color;
		ctx.fillStyle = color;
		draw(ctx, color, bg, t);
	}

	function drawUnit(ctx, u, xy, R, faded, avatar) {
		var game = ui.game, rc = game.g.ctx, P = pal(), t = rc.types[u.t];
		var col = u.s === 1 ? P.sideA : P.sideB, r = R * 0.74;
		var emblem = insignia() && emblemOf(u);
		if (emblem && drawEmblemUnit(ctx, u, xy, R, faded, avatar, imageUrl("emblemes", emblem)))
			return;
		ctx.save();
		ctx.translate(xy[0], xy[1]);
		if (faded) ctx.globalAlpha = 0.45;
		// ombre
		ctx.fillStyle = "rgba(0,0,0,0.25)";
		ctx.beginPath();
		ctx.arc(r * 0.06, r * 0.08, r, 0, Math.PI * 2);
		ctx.fill();
		// bouclier : jante, champ
		ctx.fillStyle = col.rim;
		ctx.beginPath();
		ctx.arc(0, 0, r, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = col.body;
		ctx.beginPath();
		ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
		ctx.fill();
		// orientation d'une phalange : un chevron sur la jante
		if (u.f >= 0) {
			var a = -Math.PI / 2 + screenDir(u.f) * Math.PI / 3;
			ctx.fillStyle = col.figure;
			ctx.beginPath();
			ctx.moveTo(Math.cos(a) * r * 1.18, Math.sin(a) * r * 1.18);
			ctx.lineTo(Math.cos(a - 0.32) * r * 0.86, Math.sin(a - 0.32) * r * 0.86);
			ctx.lineTo(Math.cos(a + 0.32) * r * 0.86, Math.sin(a + 0.32) * r * 0.86);
			ctx.closePath();
			ctx.fill();
		}
		// icone
		ctx.save();
		ctx.translate(0, -r * 0.18);
		var k = r * 0.66 / 40;
		ctx.scale(k, k);
		drawIcon(ctx, t, col.figure);
		ctx.restore();
		// force et mouvement
		ctx.fillStyle = col.text;
		ctx.font = "bold " + Math.round(r * 0.42) + "px Georgia, serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(game.g.rules.forceOf(rc, u) + "·" + t.mp / 2, 0, r * 0.55);
		// unite entamee : une bande en travers
		if (u.p < t.steps) {
			ctx.strokeStyle = col.rim;
			ctx.lineWidth = r * 0.14;
			ctx.beginPath();
			ctx.moveTo(-r * 0.6, -r * 0.6);
			ctx.lineTo(r * 0.6, r * 0.6);
			ctx.stroke();
		}
		ctx.restore();
	}

	/*
	 * Pions a embleme ; le style vient de la skin :
	 *   arme      (« tuiles », « insignes ») le bouclier entier, l'arme du type
	 *             a gauche, sur le bord du bouclier, jamais sur son centre
	 *   pion      (« wargame ») pion carre : couleur du camp, icone, embleme en coin
	 */

	function unitStyle() {
		return ui.game.mSkin === "wargame" ? "pion" : "arme";
	}

	function plaque(ctx, u, t, col, x, y, w, h, icon) {
		ctx.fillStyle = "rgba(29,20,16,0.88)";
		ctx.strokeStyle = col.rim;
		ctx.lineWidth = h * 0.1;
		ctx.beginPath();
		ctx.rect(x - w / 2, y, w, h);
		ctx.fill();
		ctx.stroke();
		var tx = x;
		if (icon) {
			ctx.save();
			ctx.translate(x - w / 2 + h * 0.55, y + h / 2);
			ctx.scale(h * 0.42 / 40, h * 0.42 / 40);
			drawIcon(ctx, t, "#f3d2ae");
			ctx.restore();
			tx = x + h * 0.45;
		}
		ctx.fillStyle = "#f3d2ae";
		ctx.font = "bold " + Math.round(h * 0.72) + "px Georgia, serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(ui.game.g.rules.forceOf(ui.game.g.ctx, u) + "·" + t.mp / 2, tx, y + h * 0.54);
	}

	// le front d'une phalange : une pointe claire cernee de la couleur du camp, hors du bouclier
	function facingMark(ctx, u, r, color) {
		if (u.f < 0) return;
		var a = -Math.PI / 2 + screenDir(u.f) * Math.PI / 3;
		ctx.beginPath();
		ctx.moveTo(Math.cos(a) * r * 1.36, Math.sin(a) * r * 1.36);
		ctx.lineTo(Math.cos(a - 0.34) * r * 0.98, Math.sin(a - 0.34) * r * 0.98);
		ctx.lineTo(Math.cos(a + 0.34) * r * 0.98, Math.sin(a + 0.34) * r * 0.98);
		ctx.closePath();
		ctx.fillStyle = "#fff4e2";
		ctx.fill();
		ctx.strokeStyle = color;
		ctx.lineWidth = r * 0.09;
		ctx.lineJoin = "round";
		ctx.stroke();
	}

	function reducedMark(ctx, u, t, r, color) {
		if (u.p >= t.steps) return;
		ctx.strokeStyle = color;
		ctx.lineWidth = r * 0.16;
		ctx.beginPath();
		ctx.moveTo(-r * 0.62, -r * 0.62);
		ctx.lineTo(r * 0.4, r * 0.4);
		ctx.stroke();
	}

	// bouclier a embleme, centre en (0,0), rayon r
	function shield(ctx, image, r, col) {
		ctx.fillStyle = "rgba(0,0,0,0.3)";
		ctx.beginPath();
		ctx.arc(r * 0.06, r * 0.08, r, 0, Math.PI * 2);
		ctx.fill();
		ctx.drawImage(image, -r * 1.04, -r * 1.04, r * 2.08, r * 2.08);
		ctx.strokeStyle = col.rim;
		ctx.lineWidth = r * 0.13;
		ctx.beginPath();
		ctx.arc(0, 0, r * 0.97, 0, Math.PI * 2);
		ctx.stroke();
	}

	/*
	 * false tant qu'une image n'est pas chargee : le pion dessine prend le
	 * relais en attendant.
	 */
	function drawEmblemUnit(ctx, u, xy, R, faded, avatar, url) {
		var rc = ui.game.g.ctx, P = pal(), t = rc.types[u.t];
		var col = u.s === 1 ? P.sideA : P.sideB, style = unitStyle();
		var emblem = ui.images[url];
		if (!emblem) {
			withImage(avatar, url, function () { });
			return false;
		}
		ctx.save();
		ctx.translate(xy[0], xy[1]);
		if (faded) ctx.globalAlpha = 0.45;
		var r;
		if (style === "arme") {
			// le bouclier entier, a peine decale a droite ; l'arme sur son bord gauche
			r = R * 0.72;
			ctx.save();
			ctx.translate(R * 0.14, -R * 0.06);
			shield(ctx, emblem, r, col);
			reducedMark(ctx, u, t, r, col.rim);
			ctx.restore();
			ctx.save();
			ctx.translate(-R * 0.58, -R * 0.12);
			var k = R * 0.33 / 40;
			ctx.scale(k, k);
			drawIcon(ctx, t, "#f6e3c8", "#1d1410");
			ctx.restore();
			// le front de la phalange, par-dessus l'arme
			ctx.save();
			ctx.translate(R * 0.14, -R * 0.06);
			facingMark(ctx, u, r, col.rim);
			ctx.restore();
			plaque(ctx, u, t, col, R * 0.14, R * 0.44, R * 1.05, R * 0.4, false);
		} else {
			// pion carre de wargame
			var w = R * 1.42, h = R * 1.22;
			ctx.fillStyle = "rgba(0,0,0,0.3)";
			ctx.fillRect(-w / 2 + R * 0.05, -h / 2 + R * 0.06, w, h);
			ctx.fillStyle = col.rim;
			ctx.fillRect(-w / 2, -h / 2, w, h);
			ctx.strokeStyle = "#1d1410";
			ctx.lineWidth = R * 0.05;
			ctx.strokeRect(-w / 2, -h / 2, w, h);
			ctx.drawImage(emblem, -w / 2 + R * 0.04, -h / 2 + R * 0.04, R * 0.42, R * 0.42);
			ctx.save();
			ctx.translate(R * 0.08, -R * 0.2);
			var kp = R * 0.38 / 40;
			ctx.scale(kp, kp);
			drawIcon(ctx, t, "#fff4e2", "rgba(0,0,0,0.55)");
			ctx.restore();
			ctx.fillStyle = "#fff4e2";
			ctx.font = "bold " + Math.round(R * 0.36) + "px Georgia, serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillStyle = "rgba(29,20,16,0.55)";
			ctx.fillRect(-w / 2, h / 2 - R * 0.36, w, R * 0.36);
			ctx.fillStyle = "#fff4e2";
			ctx.fillText(ui.game.g.rules.forceOf(rc, u) + "-" + t.mp / 2, 0, h / 2 - R * 0.17);
			if (u.f >= 0) facingMark(ctx, u, R * 0.62, "#1d1410");
			reducedMark(ctx, u, t, R * 0.62, "#1d1410");
		}
		ctx.restore();
		return true;
	}

	function drawUnits(ctx) {
		var avatar = this;
		if (!ui || !ui.state) return;
		var L = ui.L, st = ui.state, ov = ui.overlay;
		ctx.save();
		ctx.translate(-L.cx, -L.cy);
		for (var i = 0; i < st.u.length; i++) {
			var u = st.u[i];
			if (u.h < 0) continue;
			drawUnit(ctx, u, hexXY(u.h), L.R, ov.ordered.indexOf(i) >= 0 && ui.dimOrdered, avatar);
		}
		// fantome du groupe a sa destination survolee
		if (ov.ghost)
			ov.ghost.forEach(function (g) { drawUnit(ctx, g.u, hexXY(g.h), L.R, true, avatar); });
		ctx.restore();
	}

	/* ---------- marqueurs ---------- */

	function ring(ctx, h, color, width, scale) {
		var xy = hexXY(h), R = ui.L.R;
		ctx.strokeStyle = color;
		ctx.lineWidth = R * (width || 0.1);
		hexPath(ctx, xy[0], xy[1], R * (scale || 0.88));
		ctx.stroke();
	}

	function label(ctx, h, text, fg, bg, dy, dx) {
		var xy = hexXY(h), R = ui.L.R;
		xy = [xy[0] + (dx || 0) * R, xy[1]];
		ctx.font = "bold " + Math.round(R * 0.36) + "px Georgia, serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		var w = ctx.measureText(text).width + R * 0.25;
		var y = xy[1] + (dy || -0.78) * R;
		ctx.fillStyle = bg;
		ctx.fillRect(xy[0] - w / 2, y - R * 0.22, w, R * 0.44);
		ctx.fillStyle = fg;
		ctx.fillText(text, xy[0], y + R * 0.02);
	}

	function arrow(ctx, a, b, color) {
		var R = ui.L.R, angle = Math.atan2(b[1] - a[1], b[0] - a[0]), head = R * 0.35;
		ctx.strokeStyle = ctx.fillStyle = color;
		ctx.lineWidth = R * 0.1;
		ctx.beginPath();
		ctx.moveTo(a[0], a[1]);
		ctx.lineTo(b[0] - Math.cos(angle) * head * 0.6, b[1] - Math.sin(angle) * head * 0.6);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(b[0], b[1]);
		ctx.lineTo(b[0] - Math.cos(angle - 0.45) * head, b[1] - Math.sin(angle - 0.45) * head);
		ctx.lineTo(b[0] - Math.cos(angle + 0.45) * head, b[1] - Math.sin(angle + 0.45) * head);
		ctx.closePath();
		ctx.fill();
	}

	function drawMarks(ctx) {
		if (!ui || !ui.state) return;
		var game = ui.game, rc = game.g.ctx, L = ui.L, P = pal(), st = ui.state, ov = ui.overlay, R = L.R;
		var T = lang(), k;
		ctx.save();
		ctx.translate(-L.cx, -L.cy);
		// zone de deploiement
		if (ov.zone)
			ov.zone.forEach(function (h) {
				var xy = hexXY(h);
				hexPath(ctx, xy[0], xy[1], R * 0.96);
				ctx.fillStyle = "rgba(255,250,220,0.35)";
				ctx.fill();
			});
		// objectifs : couronne de laurier, couleur du camp qui le tient
		rc.objectives.forEach(function (o, i) {
			var xy = hexXY(o.hex), owner = st.ctrl[i];
			var color = owner === 1 ? P.sideA.rim : owner === -1 ? P.sideB.rim : P.ink;
			ctx.strokeStyle = color;
			ctx.fillStyle = color;
			ctx.lineWidth = R * 0.07;
			ctx.beginPath();
			ctx.arc(xy[0], xy[1], R * 0.8, Math.PI * 0.62, Math.PI * 2.38);
			ctx.stroke();
			for (var j = 0; j < 7; j++) {
				var a = Math.PI * (0.7 + j * 0.24);
				[-1, 1].forEach(function (sgn) {
					var aa = Math.PI * 1.5 + sgn * (a - Math.PI * 1.5);
					var lx = xy[0] + Math.cos(aa) * R * 0.8, ly = xy[1] + Math.sin(aa) * R * 0.8;
					ctx.beginPath();
					ctx.ellipse(lx, ly, R * 0.12, R * 0.05, aa + Math.PI / 2 + sgn * 0.6, 0, Math.PI * 2);
					ctx.fill();
				});
			}
			// en haut a droite : ne pas couvrir les chiffres d'une unite qui l'occupe
			label(ctx, o.hex, o.points, "#fff6e4", color, -0.7, 0.62);
		});
		// destinations
		if (ov.dests) {
			Object.keys(ov.dests).forEach(function (key) {
				var xy = hexXY(+key);
				hexPath(ctx, xy[0], xy[1], R * 0.92);
				ctx.fillStyle = P.reach;
				ctx.fill();
			});
		}
		// chemin survole
		if (ov.path && ov.path.length > 1) {
			ctx.strokeStyle = P.path;
			ctx.lineWidth = R * 0.12;
			ctx.setLineDash([R * 0.2, R * 0.12]);
			ctx.beginPath();
			ov.path.forEach(function (h, i) {
				var xy = hexXY(h);
				if (i === 0) ctx.moveTo(xy[0], xy[1]);
				else ctx.lineTo(xy[0], xy[1]);
			});
			ctx.stroke();
			ctx.setLineDash([]);
		}
		// dernier tour : fleches et combats
		ov.arrows.forEach(function (a) {
			arrow(ctx, hexXY(a[0]), hexXY(a[1]), a[2] === 1 ? "rgba(120,25,20,0.8)" : "rgba(20,45,95,0.8)");
		});
		ov.hits.forEach(function (hit) {
			ring(ctx, hit.at, P.target, 0.12, 0.95);
			label(ctx, hit.at, hit.ratio + " " + (T.resultShort[hit.result] || ""), "#fff", P.target, -0.82);
		});
		// cibles possibles, avec le meilleur rapport
		ov.targets.forEach(function (tg) {
			if (tg.t === ov.target) return;
			var u = st.u[tg.t];
			ring(ctx, u.h, P.target, 0.07, 0.95);
			if (game.mShowMoves && tg.s && tg.s.result)
				label(ctx, u.h, tg.s.ratio, "#fff", P.target, -0.82);
		});
		// combat en preparation
		if (ov.target >= 0) {
			var tu = st.u[ov.target];
			ring(ctx, tu.h, P.target, 0.16, 0.95);
			ov.eligible.forEach(function (id) {
				var on = ov.attackers.indexOf(id) >= 0;
				ring(ctx, st.u[id].h, on ? P.attackers : "rgba(29,107,58,0.4)", on ? 0.14 : 0.06, 0.9);
			});
			if (ov.strength)
				label(ctx, tu.h, ov.strength.result ? ov.strength.ratio : "<1:1", "#fff", P.target, -0.82);
		}
		// selection
		ov.sel.forEach(function (id) { ring(ctx, st.u[id].h, P.select, 0.14, 0.92); });
		ctx.restore();
	}

	function redraw(which) {
		if (!ui) return;
		(which || ["board", "units", "marks"]).forEach(function (id) {
			ui.xdv.updateGadget(id, { base: {} });
		});
	}

	function render(st) {
		ui.state = st;
		redraw(["units", "marks"]);
	}

	/* ---------- panneau ---------- */

	function button(act, text, enabled, extra, arg) {
		return '<div class="pean-button' + (enabled === false ? " pean-disabled" : "") + (extra ? " " + extra : "") +
			'" data-act="' + act + '"' + (arg !== undefined ? ' data-arg="' + arg + '"' : "") + ">" + esc(text) + "</div>";
	}

	function campName(side) {
		var rc = ui.game.g.ctx;
		return loc(rc.camps[side].nom);
	}

	// banniere du camp (skin « insignes »)
	function banner(side) {
		var b = ui.game.g.ctx.camps[side].banner;
		return b && insignia() ? '<img class="pean-banner" alt="" src="' + esc(imageUrl("bannieres", b)) + '">' : "";
	}

	function setPanel(html) {
		ui.panelHtml = html;
		if (ui.panelBody) ui.panelBody.html(html);
	}

	function setInfo(html) {
		ui.infoHtml = html || "";
		if (ui.panelEl) ui.panelEl.find(".pean-info").html(ui.infoHtml);
	}

	function sideClass(side) { return side === 1 ? "pean-sideA" : "pean-sideB"; }

	function header(board, st) {
		var T = lang(), rc = ui.game.g.ctx, R = ui.game.g.rules, side = board.mWho;
		var html = '<div class="pean-scenario">' + esc(loc(rc.scenario.titre)) + "</div>" +
			'<div class="pean-title ' + sideClass(side) + '">' + banner(side) + esc(campName(side)) + " " +
			esc(board.phase < 2 ? "– " + T.deploy : T.toPlay) + "</div>";
		if (board.phase >= 2) {
			html += '<div class="pean-sub">' + esc(T.turn) + " " + R.round(board) + " " + esc(T.of) + " " + rc.tours + "</div>";
			html += score(st || board);
		}
		return html;
	}

	function score(st) {
		var T = lang(), rc = ui.game.g.ctx, R = ui.game.g.rules;
		return '<div class="pean-score">' + [1, -1].map(function (s) {
			var total = R.armyValue(rc, st, s), lost = R.losses(rc, st, s);
			return '<span class="' + sideClass(s) + '">' + esc(campName(s)) + "</span> " + esc(T.points) + " <b>" +
				Math.round(R.points(rc, st, s)) + "</b> · " + esc(T.losses) + " " + Math.round(lost) + "/" + Math.round(total * rc.rupture);
		}).join("<br>") + "</div>";
	}

	function idlePanel(board, aGame) {
		var T = lang(), html;
		if (board.over || board.mFinished) {
			var winner = board.over || 2;
			html = '<div class="pean-scenario">' + esc(loc(aGame.g.ctx.scenario.titre)) + "</div>" +
				'<div class="pean-title">' + (winner === 2 ? esc(T.draw) :
				esc(T.win) + " : <span class=\"" + sideClass(winner) + "\">" + esc(campName(winner)) + "</span>") + "</div>" +
				'<div class="pean-sub">' + esc(T.reason[board.reason || "repeat"] || "") + "</div>" + score(board);
		} else
			html = header(board) + '<div class="pean-hint">' + esc(T.waiting) + "</div>";
		var played = aGame.mPlayedMoves;
		if (played && played.length) {
			var text = played[played.length - 1].ToString();
			if (text.length > 200) text = text.slice(0, 197) + "…";
			html += '<div class="pean-label">' + esc(T.last) + '</div><div class="pean-move">' + esc(text) + "</div>";
		}
		html += '<div class="pean-info"></div>';
		setPanel(html);
	}

	function unitInfo(u, st) {
		var game = ui.game, rc = game.g.ctx, R = game.g.rules, T = lang(), t = rc.types[u.t];
		var name = rc.unitNames && rc.unitNames[u.i];
		var html = '<b class="' + sideClass(u.s) + '">' + esc(loc(t.nom)) + "</b>" + (name ? " – " + esc(name) : "") +
			"<br>" + esc(T.force) + " " + R.forceOf(rc, u) + " · " + esc(T.move) + " " + t.mp / 2 +
			" · " + esc(T.steps) + " " + u.p + "/" + t.steps + " · " + esc(T.value) + " " + t.value;
		if (u.f >= 0) html += " · " + esc(T.facingOf) + " " + T.dirs[u.f];
		if (t.traits.length)
			html += "<br><i>" + t.traits.map(function (x) { return esc(T.traits[x] || x); }).join(", ") + "</i>";
		var z = R.zoc(rc, st, -u.s);
		if (z[u.h]) html += " – " + esc(T.engaged);
		return html;
	}

	function describe(h, turn) {
		var game = ui.game, rc = game.g.ctx, R = game.g.rules, T = lang(), st = ui.state;
		if (!st || h < 0) return "";
		var tname = rc.terrainNames[rc.terr[h]], terrain = rc.terrains[rc.terr[h]];
		var html = "<b>" + R.hexName(rc, h) + "</b> – " + esc(T.terrain[tname] || tname);
		if (terrain.def !== 1) html += " (×" + terrain.def + ")";
		var sides = [];
		for (var d = 0; d < 6; d++) {
			var e = rc.edge[h * 6 + d];
			if (e) sides.push((T.side[rc.sideNames[e - 1]] || rc.sideNames[e - 1]) + " " + T.dirs[d]);
		}
		if (sides.length) html += "<br>" + esc(sides.join(", "));
		var oi = rc.objAt[h] - 1;
		if (oi >= 0) {
			var o = rc.objectives[oi];
			html += "<br>" + esc(T.objective) + (o.nom ? " « " + esc(o.nom) + " »" : "") + " : " + o.points + " – " +
				esc(T.held) + " " + esc(st.ctrl[oi] ? campName(st.ctrl[oi]) : T.nobody);
		}
		var occ = R.occupancy(rc, st)[h];
		if (occ) {
			var u = st.u[occ - 1];
			html += "<br>" + unitInfo(u, st);
			if (turn && u.s !== turn.who) {
				var att = turn.attackersOf(u.i);
				if (att.length) {
					var s = turn.strength(att, u.i);
					if (s)
						html += "<br>" + strengthText(s);
				}
			}
		}
		return html;
	}

	function strengthText(s) {
		var T = lang();
		return '<span class="pean-att">' + esc(T.att) + " " + s.att + "</span> / " +
			'<span class="pean-def">' + esc(T.def) + " " + s.def + "</span>" +
			(s.defNotes.length ? " (" + esc(s.defNotes.join(", ")) + ")" : "") + " → " +
			(s.result ? "<b>" + esc(s.ratio) + "</b> : " + esc(T.result[s.result]) : esc(T.tooWeak));
	}

	function hover(h) {
		if (!ui || h === ui.hover) return;
		ui.hover = h;
		var c = ui.controller;
		if (c && c.hover) c.hover(h);
		setInfo(describe(h, c ? c.turn : null));
	}

	/* ---------- gadgets ---------- */

	View.Game.xdInit = function (xdv) {
		var game = this, rc = this.g.ctx;
		ui = {
			xdv: xdv, game: game, L: layout(rc), fullPath: this.mViewOptions.fullPath, images: {},
			state: null, board: null, overlay: emptyOverlay(), hover: -1, dimOrdered: true,
			panelEl: null, panelBody: null, panelHtml: "", infoHtml: "",
			controller: null, click: null, lastTurn: null
		};
		var L = ui.L;
		["board", "units", "marks"].forEach(function (id, z) {
			xdv.createGadget(id, {
				"2d": { type: "canvas", x: L.cx, y: L.cy, z: [0, 3, 4][z], width: L.cw, height: L.ch,
					draw: [drawBoard, drawUnits, drawMarks][z] }
			});
		});
		xdv.createGadget("input", {
			"2d": {
				type: "element", x: L.cx, y: L.cy, z: 6, width: L.cw, height: L.ch,
				initialClasses: "pean-input",
				display: function (element) {
					if (element.data("pean")) return;
					element.data("pean", true);
					function hexOf(event) {
						var rect = element[0].getBoundingClientRect();
						var x = L.cx - L.cw / 2 + (event.clientX - rect.left) / rect.width * L.cw;
						var y = L.cy - L.ch / 2 + (event.clientY - rect.top) / rect.height * L.ch;
						return hexAtPoint(x, y);
					}
					var node = element[0];
					node.addEventListener("click", function (event) {
						var h = hexOf(event);
						if (!ui || h < 0) return;
						if (ui.click) ui.click(h);
						ui.hover = -1;
						hover(h);
					});
					node.addEventListener("mousemove", function (event) { hover(hexOf(event)); });
					node.addEventListener("mouseleave", function () { hover(-1); });
				}
			}
		});
		xdv.createGadget("panel", {
			"2d": {
				type: "element", x: PANEL_X, y: 0, z: 1, width: PANEL_W, height: BOX_H,
				initialClasses: "pean-panel",
				display: function (element, width) {
					element.css("font-size", (width / 14) + "px");
					element.attr("data-skin", ui.game.mSkin);
					if (!element.data("pean")) {
						element.data("pean", true);
						element.html('<div class="pean-body"></div>');
						element.on("click", "[data-act]", function () {
							if (!ui || jQuery(this).hasClass("pean-disabled")) return;
							var act = jQuery(this).attr("data-act"), arg = jQuery(this).attr("data-arg");
							if (ui.controller && ui.controller.act)
								ui.controller.act(act, arg);
						});
					}
					ui.panelEl = element;
					ui.panelBody = element.find(".pean-body");
					ui.panelBody.html(ui.panelHtml);
					element.find(".pean-info").html(ui.infoHtml);
				}
			}
		});
	};

	View.Game.xdBuildScene = function (xdv) {
		["board", "units", "marks", "input", "panel"].forEach(function (id) {
			xdv.updateGadget(id, { base: { visible: true } });
		});
	};

	/* ---------- affichage ---------- */

	function lastTurnOverlay(board) {
		var ov = emptyOverlay();
		if (ui.lastTurn && ui.lastTurn.played === board.played && ui.lastTurn.turn === board.turn) {
			ov.arrows = ui.lastTurn.arrows;
			ov.hits = ui.lastTurn.hits;
		}
		return ov;
	}

	View.Board.xdDisplay = function (xdv, aGame) {
		if (!ui) return;
		ui.game = aGame;
		ui.board = this;
		ui.overlay = lastTurnOverlay(this);
		ui.hover = -1;
		ui.infoHtml = "";
		render(this);
		redraw(["board"]);
		idlePanel(this, aGame);
	};

	function turnTrace(move, who, results) {
		var arrows = [], hits = [];
		(move.o || []).forEach(function (o) {
			if (o.c.length > 1) arrows.push([o.c[0], o.c[o.c.length - 1], who]);
		});
		(results || []).forEach(function (r) { hits.push({ at: r.at, ratio: r.ratio, result: r.result }); });
		return { arrows: arrows, hits: hits };
	}

	/*
	 * Le tour de l'adversaire, pas a pas : `this` est le plateau apres le coup,
	 * aGame.mOldBoard celui d'avant.
	 */
	View.Board.xdPlayedMove = function (xdv, aGame, aMove) {
		if (!ui) return true;
		var R = aGame.g.rules, rc = aGame.g.ctx, board = this, old = aGame.mOldBoard;
		function shown() { if (aGame.MoveShown) aGame.MoveShown(); }
		ui.game = aGame;
		ui.overlay = emptyOverlay();
		if (!old || old.phase < 2 || aMove.p) {
			render(board);
			setTimeout(shown, 50);
			return false;
		}
		var who = old.mWho;
		var turn = new R.Turn(rc, old, who, { trusted: true });
		var trace = turnTrace(aMove, who, board.last ? board.last.results : []);
		ui.lastTurn = { played: board.played, turn: board.turn, arrows: trace.arrows, hits: trace.hits };
		var orders = aMove.o || [], combats = aMove.k || [], i = 0, j = 0;
		function next() {
			if (!ui) return;
			if (i < orders.length) {
				var o = orders[i++];
				turn.order(o.u, o.c, o.f);
				ui.overlay.arrows = trace.arrows.slice(0, i);
				render(turn.st);
				setTimeout(next, 320);
			} else if (j < combats.length) {
				var k = combats[j++];
				var target = turn.st.u[k.t];
				ui.overlay.target = k.t;
				ui.overlay.eligible = k.a.slice();
				ui.overlay.attackers = k.a.slice();
				ui.overlay.strength = turn.strength(k.a, k.t);
				render(turn.st);
				setTimeout(function () {
					turn.attack(k.a, k.t, k.v);
					ui.overlay.target = -1;
					ui.overlay.eligible = [];
					ui.overlay.attackers = [];
					ui.overlay.hits = trace.hits.slice(0, j);
					render(turn.st);
					setTimeout(next, 300);
				}, target ? 450 : 0);
			} else {
				ui.overlay = lastTurnOverlay(board);
				render(board);
				setTimeout(shown, 100);
			}
		}
		render(turn.st);
		setTimeout(next, 150);
		return false;
	};

	View.Board.xdShowEnd = function (xdv, aGame) {
		return true;
	};

	/* ---------- saisie ---------- */

	View.Board.xdBuildHTStateMachine = function (xdv, htsm, aGame) {
		var board = this, R = aGame.g.rules, AI = aGame.g.ai, rc = aGame.g.ctx, who = this.mWho;
		var controller = null;

		function send(move) {
			ui.click = null;
			ui.controller = null;
			aGame.MakeMove(move);
		}

		/* --- deploiement libre --- */
		function Deployment() {
			var T = lang(), self = this;
			var placed = [];            // [type, hex]
			var types = rc.typeKeys.slice();
			var selected = types[0];
			var zone = {};
			rc.zone[who].forEach(function (h) { zone[h] = true; });
			function spent() { return R.placementCost(rc, placed); }
			function count(k) { return placed.filter(function (p) { return p[0] === k; }).length; }
			function affordable(k) {
				var t = rc.types[k];
				return spent() + t.value <= rc.budget && !(t.max && count(k) >= t.max);
			}
			function state() {
				var st = R.copyState(board);
				placed.forEach(function (p, n) {
					var t = rc.types[p[0]];
					st.u.push({ i: st.u.length, s: who, t: p[0], h: p[1], p: t.steps,
						f: (t.phalanx && rc.options.orientation) ? rc.camps[who].facing : -1, a: 0, e: -1 });
				});
				return st;
			}
			function refresh() {
				var html = header(board) + '<div class="pean-hint">' + esc(T.deployHint) + "</div>" +
					'<div class="pean-status">' + esc(T.budget) + " : <b>" + spent() + " / " + rc.budget + "</b></div>" +
					'<div class="pean-reserve">';
				types.forEach(function (k) {
					var t = rc.types[k];
					html += '<div class="pean-unit' + (k === selected ? " pean-selected" : "") + (affordable(k) ? "" : " pean-disabled") +
						'" data-act="pick" data-arg="' + k + '"><span class="pean-name">' + esc(loc(t.nom)) +
						'</span><span class="pean-count">' + t.force + "·" + t.mp / 2 + " – " + t.value +
						(count(k) ? " ×" + count(k) : "") + "</span></div>";
				});
				html += '</div><div class="pean-info"></div><div class="pean-buttons">' +
					button("auto", T.auto, true, "pean-light") +
					button("clear", T.clear, placed.length > 0, "pean-light") +
					button("end", T.endDeploy, !R.checkPlacement(rc, board, who, placed)) + "</div>";
				ui.overlay = emptyOverlay();
				ui.overlay.zone = rc.zone[who].filter(function (h) {
					return rc.terrains[rc.terr[h]].cost && !placed.some(function (p) { return p[1] === h; });
				});
				ui.infoHtml = "";
				setPanel(html);
				self.turn = null;
				render(state());
			}
			this.click = function (h) {
				for (var n = 0; n < placed.length; n++)
					if (placed[n][1] === h) {
						selected = placed[n][0];
						placed.splice(n, 1);
						refresh();
						return;
					}
				if (!zone[h] || !rc.terrains[rc.terr[h]].cost) return;
				if (R.occupancy(rc, board)[h]) return;
				if (affordable(selected)) {
					placed.push([selected, h]);
					refresh();
				}
			};
			this.act = function (act, arg) {
				if (act === "pick") selected = arg;
				else if (act === "clear") placed = [];
				else if (act === "auto") {
					var list = AI.placements(rc, board, who, 1, function (n) { return Math.floor(Math.random() * n); });
					if (list.length) placed = list[0].p.map(function (p) { return p.slice(); });
				} else if (act === "end") {
					if (!R.checkPlacement(rc, board, who, placed))
						send({ p: placed });
					return;
				}
				refresh();
			};
			refresh();
		}

		/* --- tour de jeu --- */
		function Play() {
			var T = lang(), self = this;
			var actions = [];      // { o: [ids, path, facing] } ou { k: [ids, target, advance] }
			var sel = [], target = -1, chosen = [], groupMode = false, wantFacing = null, advance = true;
			var message = "", dests = null;
			function rebuild() {
				var turn = new R.Turn(rc, board, who);
				actions.forEach(function (a) {
					if (a.o) turn.order(a.o[0], a.o[1], a.o[2]);
					else turn.attack(a.k[0], a.k[1], a.k[2]);
				});
				self.turn = turn;
				return turn;
			}
			// le moins d'unites pour le meilleur resultat ; toutes si aucun n'est possible
			function defaultAttackers(id) {
				var best = self.turn.minimalAttackers(id);
				return best.length ? best : self.turn.attackersOf(id);
			}
			function component(id) {
				var turn = self.turn, u0 = turn.st.u[id], out = [id], stack = [u0.h], seen = {};
				seen[u0.h] = true;
				while (stack.length) {
					var h = stack.pop();
					for (var d = 0; d < 6; d++) {
						var n = rc.nb[h * 6 + d];
						if (n < 0 || seen[n]) continue;
						seen[n] = true;
						var v = turn.unitAt(n);
						if (v && v.s === who && v.t === u0.t && !turn.ordered[v.i] && !turn.zEnemy[v.h]) {
							out.push(v.i);
							stack.push(n);
						}
					}
				}
				return out;
			}
			function refresh() {
				var turn = self.turn, ov = emptyOverlay();
				ov.ordered = Object.keys(turn.ordered).map(Number);
				sel = sel.filter(function (id) { return turn.st.u[id].h >= 0 && !turn.ordered[id]; });
				dests = null;
				if (target >= 0 && (turn.st.u[target].h < 0 || turn.targeted[target])) target = -1;
				var phalanxSel = sel.length && rc.types[turn.st.u[sel[0]].t].phalanx && rc.options.orientation;
				if (target >= 0) {
					ov.target = target;
					ov.eligible = turn.attackersOf(target);
					chosen = chosen.filter(function (id) { return ov.eligible.indexOf(id) >= 0; });
					ov.attackers = chosen.slice();
					ov.strength = chosen.length ? turn.strength(chosen, target) : null;
				} else if (sel.length) {
					ov.sel = sel.slice();
					if (!turn.whyNotOrder(sel)) {
						dests = turn.reach(sel);
						ov.dests = dests;
					}
				}
				if (target < 0)
					ov.targets = turn.targets().map(function (tg) {
						return { t: tg.t, s: turn.strength(tg.a, tg.t) };
					}).filter(function (tg) { return tg.s && tg.s.result; });
				if (actions.length === 0 && ui.lastTurn && ui.lastTurn.played === board.played) {
					ov.arrows = ui.lastTurn.arrows;
					ov.hits = ui.lastTurn.hits;
				}
				if (turn.arrived.length && actions.length === 0) message = message || T.reinforcements + " : " + turn.arrived.length;
				ui.overlay = ov;
				ui.hover = -1;
				var html = header(board, turn.st) +
					'<div class="pean-status">' + esc(T.orders) + " : <b>" + turn.o.length + " / " + turn.maxOrders + "</b> · " +
					esc(T.combats) + " : <b>" + turn.k.length + "</b></div>";
				if (target >= 0) {
					html += '<div class="pean-hint">' + esc(T.combatHint) + "</div>";
					html += '<div class="pean-combat">' + (ov.strength ? strengthText(ov.strength) : esc(T.tooWeak)) + "</div>";
					html += '<div class="pean-buttons">' +
						button("fight", T.fight, !!(ov.strength && ov.strength.result), "pean-call") +
						button("advance", advance ? T.advanceOn : T.advanceOff, true, "pean-light") +
						button("cancel", T.cancel, true, "pean-light") + "</div>";
				} else if (sel.length) {
					var why = turn.whyNotOrder(sel);
					html += '<div class="pean-hint' + (why ? " pean-alert" : "") + '">' + esc(why ? (T.why[why] || why) : T.moveHint) + "</div>";
					html += '<div class="pean-buttons">' +
						button("group", groupMode ? T.groupOn : T.groupOff, true, "pean-light") +
						button("line", T.line + " (" + component(sel[0]).length + ")", component(sel[0]).length > 1, "pean-light") +
						button("cancel", T.cancel, true, "pean-light") + "</div>";
					if (phalanxSel) {
						html += '<div class="pean-label">' + esc(T.facing) + '</div><div class="pean-dirs">' +
							button("face", T.auto2, true, wantFacing === null ? "pean-selected" : "pean-light", -1);
						for (var d = 0; d < 6; d++)
							html += button("face", T.dirs[d], true, wantFacing === d ? "pean-selected" : "pean-light", d);
						html += "</div>" + '<div class="pean-buttons">' +
							button("pivot", T.pivot, wantFacing !== null && wantFacing !== turn.st.u[sel[0]].f && turn.ordersLeft() > 0 && !turn.combat, "pean-light") + "</div>";
					}
				} else
					html += '<div class="pean-hint' + (message ? " pean-alert" : "") + '">' + esc(message || T.moveHint) + "</div>";
				html += '<div class="pean-info"></div><div class="pean-buttons">' +
					button("undo", T.undo, actions.length > 0, "pean-light") +
					button("end", T.endTurn, true, turn.combat || turn.ordersLeft() === 0 ? "pean-call" : "") + "</div>";
				ui.infoHtml = "";
				setPanel(html);
				render(turn.st);
				message = "";
			}
			this.hover = function (h) {
				var ov = ui.overlay;
				ov.path = null;
				ov.ghost = null;
				if (dests && dests[h]) {
					ov.path = dests[h];
					if (sel.length > 1) {
						var lead = self.turn.st.u[sel[0]].h;
						ov.ghost = sel.map(function (id) {
							var u = self.turn.st.u[id];
							return { u: u, h: R.hexAt(rc, rc.aq[u.h] + rc.aq[h] - rc.aq[lead], rc.ar[u.h] + rc.ar[h] - rc.ar[lead]) };
						});
					}
				}
				redraw(["units", "marks"]);
			};
			this.click = function (h) {
				var turn = self.turn, u = turn.unitAt(h);
				if (target >= 0) {
					if (u && u.s === who && turn.attackersOf(target).indexOf(u.i) >= 0) {
						var k = chosen.indexOf(u.i);
						if (k >= 0) chosen.splice(k, 1);
						else chosen.push(u.i);
					} else if (u && u.s !== who && turn.attackersOf(u.i).length) {
						target = u.i;
						chosen = defaultAttackers(u.i);
					} else
						target = -1;
					refresh();
					return;
				}
				if (u && u.s === who) {
					var adjacent = sel.some(function (id) { return R.distance(rc, turn.st.u[id].h, h) === 1; });
					if (groupMode && sel.length && u.t === turn.st.u[sel[0]].t && (adjacent || sel.indexOf(u.i) >= 0)) {
						var at = sel.indexOf(u.i);
						if (at >= 0) sel.splice(at, 1);
						else sel.push(u.i);
					} else if (sel.length === 1 && sel[0] === u.i)
						sel = [];
					else {
						sel = [u.i];
						if (turn.ordered[u.i]) message = T.why["already-ordered"];
					}
					refresh();
					return;
				}
				if (sel.length && dests && dests[h]) {
					var facing = (wantFacing !== null && rc.types[turn.st.u[sel[0]].t].phalanx) ? wantFacing : undefined;
					var test = rebuild();
					if (!test.order(sel, dests[h], facing))
						facing = undefined;
					actions.push({ o: [sel.slice(), dests[h], facing] });
					sel = [];
					wantFacing = null;
					rebuild();
					refresh();
					return;
				}
				if (u && u.s !== who) {
					var eligible = turn.attackersOf(u.i);
					if (eligible.length) {
						target = u.i;
						chosen = defaultAttackers(u.i);
						sel = [];
						refresh();
						return;
					}
				}
				sel = [];
				refresh();
			};
			this.act = function (act, arg) {
				var turn = self.turn;
				if (act === "group") groupMode = !groupMode;
				else if (act === "line" && sel.length) {
					sel = component(sel[0]);
					groupMode = true;
				} else if (act === "face") {
					var d = parseInt(arg, 10);
					wantFacing = d < 0 ? null : d;
				} else if (act === "pivot" && sel.length && wantFacing !== null) {
					if (turn.order(sel, [turn.st.u[sel[0]].h], wantFacing))
						actions.push({ o: [sel.slice(), [turn.st.u[sel[0]].h], wantFacing] });
					else
						message = T.why[turn.error] || turn.error;
					sel = [];
					wantFacing = null;
					rebuild();
				} else if (act === "cancel") {
					sel = [];
					target = -1;
				} else if (act === "advance") advance = !advance;
				else if (act === "fight" && target >= 0 && chosen.length) {
					var s = turn.strength(chosen, target);
					if (s && s.result) {
						// le perdant d'un echange : le premier au contact ; celui qui avance : le plus fort
						var ids = chosen.slice().sort(function (a, b) {
							var fa = rc.types[turn.st.u[a].t].fire ? 1 : 0, fb = rc.types[turn.st.u[b].t].fire ? 1 : 0;
							return fa - fb || R.forceOf(rc, turn.st.u[a]) - R.forceOf(rc, turn.st.u[b]);
						});
						var adv;
						if (advance) {
							var melee = ids.filter(function (id) { return !rc.types[turn.st.u[id].t].fire; });
							adv = melee[melee.length - 1];
						}
						if (adv !== undefined && turn.attack(ids, target, adv))
							actions.push({ k: [ids, target, adv] });
						else if (turn.attack(ids, target))
							actions.push({ k: [ids, target] });
						target = -1;
						chosen = [];
						rebuild();
					}
				} else if (act === "undo" && actions.length) {
					actions.pop();
					sel = [];
					target = -1;
					rebuild();
				} else if (act === "end") {
					var move = turn.toMove();
					if (board.IsValidMove(aGame, move))
						send(move);
					return;
				}
				refresh();
			};
			rebuild();
			refresh();
		}

		function Init() {
			if (!ui) return;
			ui.game = aGame;
			ui.board = board;
			controller = board.phase < 2 ? new Deployment() : new Play();
			ui.controller = controller;
			ui.click = function (h) { controller.click(h); };
		}
		function Clean() {
			if (ui && ui.controller === controller) {
				ui.click = null;
				ui.controller = null;
			}
		}
		htsm.smTransition("S_INIT", "E_INIT", "S_INPUT", [Init]);
		htsm.smTransition(["S_INIT", "S_INPUT"], "E_END", "S_DONE", [Clean]);
		htsm.smTransition("S_DONE", "E_END", null, []);
	};

})();
