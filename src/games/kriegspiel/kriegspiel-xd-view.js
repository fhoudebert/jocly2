/*
 * Le Jeu de la guerre - vue 2D (xd-view).
 *
 * Gadgets :
 *   board    canvas : fond, quadrillage, terrain, frontiere, coordonnees et
 *            lignes de communication (sous les unites)
 *   u#...    un sprite par unite (planche unites.png de la skin)
 *   marks    canvas au-dessus des unites : marqueurs (deja deplacee, isolee,
 *            retraite), surlignages (selection, destinations, cibles),
 *            dernier coup, detail du rapport de force
 *   input    calque transparent qui recoit clics et survol du plateau
 *   panel    panneau a droite : trait, reserve du placement, boutons
 *
 * La vue ne connait aucune regle : la saisie d'un tour passe par
 * KriegspielRules.Turn (aGame.g.rules), le meme objet que le validateur du
 * modele. Elle n'identifie pas les unites : a chaque affichage, les sprites
 * sont reaffectes aux cases occupees, au plus pres, ce qui anime les
 * deplacements sans que le modele ait a porter d'identifiants.
 */
(function () {

	var COLS = 25, ROWS = 20;
	var CS = 384;                       // cote d'une case, en unites virtuelles
	var BOARD_W = COLS * CS, BOARD_H = ROWS * CS;
	var MARGIN = 200;                   // marge des coordonnees
	var X0 = -6300 + 75 + MARGIN;       // coin haut-gauche de la case A1
	var Y0 = -BOARD_H / 2;
	var CANVAS_W = BOARD_W + 2 * MARGIN, CANVAS_H = BOARD_H + 2 * MARGIN;
	var CANVAS_X = X0 + BOARD_W / 2, CANVAS_Y = 0;
	var PANEL_W = 2400;
	var PANEL_X = X0 + BOARD_W + MARGIN + 50 + PANEL_W / 2;
	var SPRITE = 200;                   // cote d'une case sur les planches

	var COLOR = {
		paper: "#ece5d3", north: "#e4dabd", south: "#ddd0ac", grid: "#b3a78a",
		border: "#6b3d12", ink: "#3d372e",
		lineNorth: "rgba(43,91,153,0.30)", lineSouth: "rgba(170,84,14,0.30)",
		sideNorth: "#2b5b99", sideSouth: "#9a4f14"
	};

	var MARK = { moved: 0, isolated: 1, retreat: 2, destroy: 3, retreatTarget: 4, selection: 5, destOn: 6, destOff: 7 };

	var TEXT = {
		fr: {
			north: "Nord", south: "Sud",
			units: ["", "Infanterie", "Cavalerie", "Artillerie", "Artillerie à cheval", "Transmission", "Estafette"],
			placement: "Déploiement", toPlay: "au trait", turn: "Coup",
			placeHint: "Choisissez un type d’unité, puis une case de votre territoire. Un clic sur une unité posée la reprend.",
			auto: "Placement automatique", clear: "Tout retirer", endPlacement: "Fin du placement",
			blindOn: "À l’aveugle : oui", blindOff: "À l’aveugle : non",
			blindNote: "À l’aveugle : ce déploiement sera masqué pendant que le Sud placera ses unités.",
			moves: "Déplacements", attack: "Attaque", none: "aucune", done: "faite",
			undo: "Annuler le dernier", endTurn: "Fin du tour",
			lines: ["Lignes : toutes", "Lignes : Nord", "Lignes : Sud", "Lignes : masquées"],
			retreatDue: "Retraite obligatoire : déplacez d’abord l’unité marquée.",
			arsenalDone: "Arsenal détruit : plus d’attaque ce tour.",
			attackDone: "Attaque faite : elle clôt les déplacements. Cliquez « Fin du tour », ou « Annuler le dernier » pour la reprendre.",
			att: "Attaque", def: "Défense", destroy: "destruction", retreat: "retraite forcée", noEffect: "sans effet",
			threat: "Menace adverse", inComm: "en communication", isolated: "isolée",
			move: "mvt", range: "portée",
			terrain: ["Plaine", "Montagne", "Col", "Forteresse"], arsenal: "Arsenal", destroyed: "détruit",
			why: {
				"attack-done": "L’attaque est faite : terminez le tour ou annulez.",
				"retreat-first": "Retraite obligatoire d’abord.",
				"already-moved": "Cette unité a déjà bougé.",
				"too-many-moves": "Cinq déplacements au plus par tour.",
				"isolated": "Unité isolée : elle ne peut pas bouger."
			},
			waiting: "L’adversaire joue…", last: "Dernier coup",
			commTitle: "En communication", noSignal: "sans transmission",
			win: "Victoire", draw: "Partie nulle",
			reason: {
				arsenals: "les deux arsenaux adverses sont détruits",
				annihilated: "l’adversaire n’a plus d’unité combattante",
				isolated: "l’adversaire, sans transmission, est entièrement isolé",
				"max-turns": "limite de coups atteinte", repeat: "répétition de position"
			},
			hidden: "Le déploiement du Nord est masqué."
		},
		en: {
			north: "North", south: "South",
			units: ["", "Infantry", "Cavalry", "Foot artillery", "Mounted artillery", "Communications unit", "Mounted communications"],
			placement: "Deployment", toPlay: "to move", turn: "Move",
			placeHint: "Pick a unit type, then a square of your territory. Click a placed unit to take it back.",
			auto: "Automatic placement", clear: "Remove all", endPlacement: "Deployment done",
			blindOn: "Blind: yes", blindOff: "Blind: no",
			blindNote: "Blind: this deployment will be hidden while South places its units.",
			moves: "Moves", attack: "Attack", none: "none", done: "done",
			undo: "Undo last", endTurn: "End turn",
			lines: ["Lines: all", "Lines: North", "Lines: South", "Lines: hidden"],
			retreatDue: "Forced retreat: move the marked unit first.",
			arsenalDone: "Arsenal destroyed: no attack this turn.",
			attackDone: "Attack made: it closes the moves. Click “End turn”, or “Undo last” to take it back.",
			att: "Attack", def: "Defence", destroy: "destroyed", retreat: "forced retreat", noEffect: "no effect",
			threat: "Enemy threat", inComm: "in communication", isolated: "isolated",
			move: "move", range: "range",
			terrain: ["Plain", "Mountain", "Mountain pass", "Fort"], arsenal: "Arsenal", destroyed: "destroyed",
			why: {
				"attack-done": "The attack is done: end the turn or undo.",
				"retreat-first": "Forced retreat first.",
				"already-moved": "This unit has already moved.",
				"too-many-moves": "Five moves at most per turn.",
				"isolated": "Isolated unit: it cannot move."
			},
			waiting: "Opponent is playing…", last: "Last move",
			commTitle: "In communication", noSignal: "no communications unit",
			win: "Victory", draw: "Draw",
			reason: {
				arsenals: "both enemy arsenals are destroyed",
				annihilated: "the enemy has no combat unit left",
				isolated: "the enemy, with no communications unit, is entirely cut off",
				"max-turns": "move limit reached", repeat: "position repeated"
			},
			hidden: "North's deployment is hidden."
		}
	};

	var ui = null;   // etat de la vue, refait par xdInit

	function lang() {
		// la langue de la page hote - la vue peut vivre dans une iframe
		// (jocly.embed.html) : parametre ?lang=, attribut lang, puis navigateur
		var l = "";
		function of(win) {
			try {
				return new URLSearchParams(win.location.search).get("lang") || win.document.documentElement.lang || "";
			} catch (e) {
				return "";   // page hote d'une autre origine
			}
		}
		try {
			l = (of(window.parent !== window ? window.parent : window) || of(window) || navigator.language || "").toLowerCase();
		} catch (e) { }
		return l.indexOf("fr") === 0 ? TEXT.fr : TEXT.en;
	}

	function esc(text) {
		return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}

	function emptyOverlay() {
		return { selection: -1, dests: [], targets: [], moved: [], chosen: null, arrows: [], detail: null };
	}

	/* ---------- geometrie ---------- */

	function flipped() { return ui.game.mViewAs === -1; }

	function cellXY(pos) {
		var row = Math.floor(pos / COLS), col = pos % COLS;
		if (flipped()) {
			row = ROWS - 1 - row;
			col = COLS - 1 - col;
		}
		return [X0 + (col + 0.5) * CS, Y0 + (row + 0.5) * CS];
	}

	/* ---------- images des planches ---------- */

	/*
	 * Dossier des planches de la skin courante. Une skin peut fournir ses
	 * propres unites.png et terrain.png (cle "images" du manifeste) ; les
	 * marqueurs sont communs a toutes les skins.
	 */
	function skinImages(game) {
		var skins = game.mViewOptions.skins || [];
		for (var i = 0; i < skins.length; i++)
			if (skins[i].name === game.mSkin && skins[i].images)
				return skins[i].images;
		return "/res/images/";
	}

	function imagePath(name) {
		return ui.fullPath + (name === "marqueurs" ? "/res/images/" : ui.imageDir) + name + ".png";
	}

	function withImage(avatar, name, draw) {
		var image = ui.images[name];
		if (image) {
			draw(image);
			return;
		}
		if (ui.images[name] === null)
			return;   // en cours de chargement
		ui.images[name] = null;
		avatar.getResource("image|" + imagePath(name), function (loaded) {
			ui.images[name] = loaded;
			setTimeout(redrawCanvases, 0);
		});
	}

	function redrawCanvases() {
		if (!ui)
			return;
		ui.xdv.updateGadget("board", { base: {} });
		ui.xdv.updateGadget("marks", { base: {} });
	}

	function tile(ctx, image, column, pos, scale) {
		var xy = cellXY(pos), size = CS * (scale || 1);
		ctx.drawImage(image, column * SPRITE, 0, SPRITE, SPRITE, xy[0] - size / 2, xy[1] - size / 2, size, size);
	}

	/* ---------- canvas du plateau ---------- */

	function drawBoard(ctx) {
		var avatar = this, game = ui.game, R = game.g.rules, rc = game.g.ctx;
		ctx.save();
		ctx.translate(-CANVAS_X, -CANVAS_Y);
		ctx.fillStyle = COLOR.paper;
		ctx.fillRect(X0 - MARGIN, Y0 - MARGIN, CANVAS_W, CANVAS_H);
		var northOnTop = !flipped();
		ctx.fillStyle = northOnTop ? COLOR.north : COLOR.south;
		ctx.fillRect(X0, Y0, BOARD_W, BOARD_H / 2);
		ctx.fillStyle = northOnTop ? COLOR.south : COLOR.north;
		ctx.fillRect(X0, Y0 + BOARD_H / 2, BOARD_W, BOARD_H / 2);
		// quadrillage
		ctx.strokeStyle = COLOR.grid;
		ctx.lineWidth = 10;
		ctx.beginPath();
		var i;
		for (i = 0; i <= COLS; i++) {
			ctx.moveTo(X0 + i * CS, Y0);
			ctx.lineTo(X0 + i * CS, Y0 + BOARD_H);
		}
		for (i = 0; i <= ROWS; i++) {
			ctx.moveTo(X0, Y0 + i * CS);
			ctx.lineTo(X0 + BOARD_W, Y0 + i * CS);
		}
		ctx.stroke();
		// terrain
		withImage(avatar, "terrain", function (image) {
			for (var pos = 0; pos < R.N; pos++) {
				var t = rc.terr[pos];
				if (t === R.MOUNTAIN) tile(ctx, image, 0, pos);
				else if (t === R.PASS) tile(ctx, image, 1, pos);
				else if (t === R.FORT) tile(ctx, image, 2, pos);
			}
			var ars = ui.state ? ui.state.ars : [1, 1, 1, 1];
			for (var a = 0; a < rc.arsPos.length; a++)
				tile(ctx, image, ars[a] ? (rc.arsSide[a] === 1 ? 3 : 4) : 5, rc.arsPos[a]);
		});
		// frontiere
		ctx.strokeStyle = COLOR.border;
		ctx.lineWidth = 36;
		ctx.beginPath();
		ctx.moveTo(X0, Y0 + BOARD_H / 2);
		ctx.lineTo(X0 + BOARD_W, Y0 + BOARD_H / 2);
		ctx.stroke();
		ctx.lineWidth = 16;
		ctx.strokeRect(X0, Y0, BOARD_W, BOARD_H);
		// lignes de communication, en segments de la source a la derniere case
		if (ui.lines) {
			ctx.lineCap = "round";
			[1, -1].forEach(function (side) {
				var segs = ui.lines[side];
				if (!segs || ui.showLines === 3 || (ui.showLines === 1 && side !== 1) || (ui.showLines === 2 && side !== -1))
					return;
				// leger decalage pour que les lignes des deux camps restent lisibles
				var shift = side * CS * 0.07;
				ctx.strokeStyle = side === 1 ? COLOR.lineNorth : COLOR.lineSouth;
				ctx.lineWidth = CS * 0.11;
				ctx.beginPath();
				for (var k = 0; k < segs.length; k++) {
					var a = cellXY(segs[k][0]), b = cellXY(segs[k][1]);
					ctx.moveTo(a[0] + shift, a[1] + shift);
					ctx.lineTo(b[0] + shift, b[1] + shift);
				}
				ctx.stroke();
			});
		}
		// coordonnees : lettre de ligne, numero de colonne
		if (game.mNotation) {
			ctx.fillStyle = COLOR.ink;
			ctx.font = "150px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			for (i = 0; i < COLS; i++) {
				var col = flipped() ? COLS - i : i + 1;
				ctx.fillText(col, X0 + (i + 0.5) * CS, Y0 - MARGIN / 2);
				ctx.fillText(col, X0 + (i + 0.5) * CS, Y0 + BOARD_H + MARGIN / 2);
			}
			for (i = 0; i < ROWS; i++) {
				var letter = String.fromCharCode(65 + (flipped() ? ROWS - 1 - i : i));
				ctx.fillText(letter, X0 - MARGIN / 2, Y0 + (i + 0.5) * CS);
				ctx.fillText(letter, X0 + BOARD_W + MARGIN / 2, Y0 + (i + 0.5) * CS);
			}
		}
		ctx.restore();
	}

	/* ---------- canvas des marqueurs ---------- */

	function drawMarks(ctx) {
		var avatar = this, game = ui.game, R = game.g.rules, rc = game.g.ctx;
		var st = ui.state, ov = ui.overlay;
		if (!st)
			return;
		ctx.save();
		ctx.translate(-CANVAS_X, -CANVAS_Y);
		var pos, xy, k;
		// forteresses occupees : un liseré, l'unite masquant la forteresse
		for (pos = 0; pos < R.N; pos++)
			if (rc.terr[pos] === R.FORT && st.grid[pos] !== 0 && !isHidden(st.grid[pos])) {
				xy = cellXY(pos);
				ctx.strokeStyle = "#4d463c";
				ctx.lineWidth = 34;
				ctx.strokeRect(xy[0] - CS / 2 + 26, xy[1] - CS / 2 + 26, CS - 52, CS - 52);
				ctx.strokeStyle = "#d9d3c8";
				ctx.lineWidth = 12;
				ctx.strokeRect(xy[0] - CS / 2 + 26, xy[1] - CS / 2 + 26, CS - 52, CS - 52);
			}
		// dernier coup : fleches
		for (k = 0; k < ov.arrows.length; k++) {
			var a = cellXY(ov.arrows[k][0]), b = cellXY(ov.arrows[k][1]);
			var angle = Math.atan2(b[1] - a[1], b[0] - a[0]), head = CS * 0.22;
			ctx.strokeStyle = ctx.fillStyle = ov.arrows[k][2] === 1 ? "rgba(23,52,92,0.75)" : "rgba(122,60,10,0.75)";
			ctx.lineWidth = CS * 0.06;
			ctx.beginPath();
			ctx.moveTo(a[0], a[1]);
			ctx.lineTo(b[0] - Math.cos(angle) * head * 0.6, b[1] - Math.sin(angle) * head * 0.6);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(b[0] - Math.cos(angle) * CS * 0.32, b[1] - Math.sin(angle) * CS * 0.32);
			ctx.lineTo(b[0] - Math.cos(angle - 0.45) * (CS * 0.32 + head), b[1] - Math.sin(angle - 0.45) * (CS * 0.32 + head));
			ctx.lineTo(b[0] - Math.cos(angle + 0.45) * (CS * 0.32 + head), b[1] - Math.sin(angle + 0.45) * (CS * 0.32 + head));
			ctx.closePath();
			ctx.fill();
		}
		withImage(avatar, "marqueurs", function (image) {
			// isolee : toutes les unites hors communication
			if (ui.on)
				for (pos = 0; pos < R.N; pos++) {
					var v = st.grid[pos];
					if (v !== 0 && !isHidden(v) && !ui.on[v > 0 ? 1 : -1][pos])
						tile(ctx, image, MARK.isolated, pos);
				}
			for (k = 0; k < ov.moved.length; k++)
				tile(ctx, image, MARK.moved, ov.moved[k]);
			if (st.retreat >= 0 && st.grid[st.retreat] !== 0)
				tile(ctx, image, MARK.retreat, st.retreat);
			if (game.mShowMoves) {
				for (k = 0; k < ov.dests.length; k++)
					tile(ctx, image, ov.dests[k].on ? MARK.destOn : MARK.destOff, ov.dests[k].pos);
				for (k = 0; k < ov.targets.length; k++)
					tile(ctx, image, ov.targets[k].outcome === "destroy" ? MARK.destroy : MARK.retreatTarget, ov.targets[k].pos);
			}
			if (ov.chosen)
				tile(ctx, image, ov.chosen.outcome === "destroy" ? MARK.destroy : MARK.retreatTarget, ov.chosen.target);
			if (ov.selection >= 0)
				tile(ctx, image, MARK.selection, ov.selection);
		});
		// detail du rapport de force sur la case survolee
		if (ov.detail) {
			ctx.font = "bold 150px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			[[ov.detail.attackers, "#b3261e"], [ov.detail.defenders, "#1b6e3a"]].forEach(function (group) {
				for (var j = 0; j < group[0].length; j++) {
					var c = cellXY(group[0][j][0]);
					ctx.fillStyle = "rgba(255,255,255,0.9)";
					ctx.beginPath();
					ctx.arc(c[0] + CS * 0.28, c[1] - CS * 0.28, CS * 0.2, 0, Math.PI * 2);
					ctx.fill();
					ctx.fillStyle = group[1];
					ctx.fillText(group[0][j][1], c[0] + CS * 0.28, c[1] - CS * 0.27);
				}
			});
		}
		ctx.restore();
	}

	/* ---------- unites ---------- */

	function isHidden(v) {
		return ui.hideSide !== 0 && (v > 0 ? 1 : -1) === ui.hideSide;
	}

	// reaffecte les sprites aux cases occupees ; les sprites qui changent de
	// case glissent en `delay` ms
	function placeUnits(st, delay) {
		var R = ui.game.g.rules, rc = ui.game.g.ctx, xdv = ui.xdv;
		[1, -1].forEach(function (side) {
			for (var type = 1; type <= 6; type++) {
				var wanted = [], pos, i;
				if (side !== ui.hideSide)
					for (pos = 0; pos < R.N; pos++)
						if (st.grid[pos] === side * type)
							wanted.push(pos);
				var ids = [];
				for (i = 0; i < rc.count[type]; i++)
					ids.push("u#" + side + "#" + type + "#" + i);
				var target = {};   // id -> case
				var freeIds = [];
				ids.forEach(function (id) {
					var at = ui.assign[id];
					var k = at === undefined ? -1 : wanted.indexOf(at);
					if (k >= 0) {
						target[id] = at;
						wanted.splice(k, 1);
					} else
						freeIds.push(id);
				});
				// les cases restantes prennent le sprite libre le plus proche
				wanted.forEach(function (to) {
					var best = -1, bestDist = 1e9;
					for (var j = 0; j < freeIds.length; j++) {
						var from = ui.assign[freeIds[j]];
						var dist = from === undefined ? 1e6 : R.distance(from, to);
						if (dist < bestDist) {
							bestDist = dist;
							best = j;
						}
					}
					if (best >= 0)
						target[freeIds.splice(best, 1)[0]] = to;
				});
				ids.forEach(function (id) {
					var to = target[id], from = ui.assign[id];
					if (to === undefined) {
						if (from !== undefined || ui.shown[id] !== false)
							xdv.updateGadget(id, { base: { visible: false } });
						ui.shown[id] = false;
						delete ui.assign[id];
						return;
					}
					var xy = cellXY(to);
					var animate = delay && from !== undefined && from !== to && ui.shown[id];
					xdv.updateGadget(id, { base: { visible: true, x: xy[0], y: xy[1] } }, animate ? delay : 0);
					ui.shown[id] = true;
					ui.assign[id] = to;
				});
			}
		});
	}

	/*
	 * Affiche un etat (le plateau, ou l'etat de travail d'un tour en cours).
	 */
	function render(st, delay) {
		var R = ui.game.g.rules, rc = ui.game.g.ctx;
		ui.state = st;
		ui.lines = {};
		ui.on = {};
		[1, -1].forEach(function (side) {
			var comm = R.communications(rc, st, side, true);
			ui.on[side] = comm.on;
			ui.lines[side] = (st.phase >= 2 && side !== ui.hideSide) ? comm.segs : [];
		});
		placeUnits(st, delay || 0);
		redrawCanvases();
	}

	/* ---------- panneau ---------- */

	function button(act, label, enabled, extra) {
		return '<div class="kriegspiel-button' + (enabled === false ? " kriegspiel-disabled" : "") + (extra ? " " + extra : "") +
			'" data-act="' + act + '">' + esc(label) + "</div>";
	}

	function sideName(side) { return side === 1 ? lang().north : lang().south; }

	function setPanel(html) {
		if (ui.panelBody)
			ui.panelBody.html(html);
		ui.panelHtml = html;
	}

	function setInfo(html) {
		ui.infoHtml = html || "";
		if (ui.panelEl)
			ui.panelEl.find(".kriegspiel-info").html(ui.infoHtml);
	}

	function header(board) {
		var L = lang(), side = board.mWho;
		return '<div class="kriegspiel-title kriegspiel-side' + (side === 1 ? "N" : "S") + '">' + esc(sideName(side)) +
			" " + esc(board.phase < 2 ? "– " + L.placement.toLowerCase() : L.toPlay) + "</div>" +
			'<div class="kriegspiel-sub">' + esc(L.turn) + " " + (board.turn + 1) + "</div>";
	}

	/*
	 * Unites en communication de chaque camp. La perte des deux unites de
	 * transmission ne termine pas la partie a elle seule : il faut en plus que
	 * toutes les unites restantes soient isolees. Ce decompte montre ou l'on
	 * en est, et pourquoi la partie continue.
	 */
	function commSummary(st) {
		var game = ui.game, R = game.g.rules, rc = game.g.ctx, L = lang();
		if (!st || st.phase < 2)
			return "";
		var parts = [1, -1].map(function (side) {
			if (side === ui.hideSide)
				return "";
			var comm = R.communications(rc, st, side, false), signals = 0;
			for (var pos = 0; pos < R.N; pos++)
				if (st.grid[pos] * side >= R.SIGNAL)
					signals++;
			return '<span class="kriegspiel-side' + (side === 1 ? "N" : "S") + '">' + esc(sideName(side)) + " " +
				comm.count + " / " + comm.total + (signals === 0 ? " (" + esc(L.noSignal) + ")" : "") + "</span>";
		}).filter(Boolean);
		return '<div class="kriegspiel-comm">' + esc(L.commTitle) + " : " + parts.join(" · ") + "</div>";
	}

	function linesButton() {
		return button("lines", lang().lines[ui.showLines], true, "kriegspiel-light");
	}

	// panneau hors saisie : trait, dernier coup, resultat
	function idlePanel(board, aGame) {
		var L = lang(), html;
		if (board.over || board.mFinished) {
			var winner = board.over || (board.mFinished ? 2 : 0);
			html = '<div class="kriegspiel-title">' + (winner === 2 ? esc(L.draw) :
				esc(L.win) + " : " + esc(sideName(winner))) + "</div>" +
				'<div class="kriegspiel-sub">' + esc(L.reason[board.reason || "repeat"] || "") + "</div>";
		} else
			html = header(board);
		var played = aGame.mPlayedMoves;
		if (played && played.length) {
			var text = played[played.length - 1].ToString();
			if (text.length > 160)
				text = text.slice(0, 157) + "…";
			html += '<div class="kriegspiel-label">' + esc(L.last) + '</div><div class="kriegspiel-move">' + esc(text) + "</div>";
			if (board.last)
				html += '<div class="kriegspiel-move">' + esc(L.att) + " " + board.last.att + " / " + esc(L.def) + " " +
					board.last.def + " : " + esc(board.last.outcome === "destroy" ? L.destroy : L.retreat) + "</div>";
		}
		html += commSummary(board);
		if (ui.hideSide)
			html += '<div class="kriegspiel-hint">' + esc(L.hidden) + "</div>";
		html += '<div class="kriegspiel-info"></div><div class="kriegspiel-buttons">' + linesButton() + "</div>";
		setPanel(html);
	}

	// texte d'information sur une case : terrain, unite, rapport de force
	function describe(pos, turn) {
		var game = ui.game, R = game.g.rules, rc = game.g.ctx, L = lang(), st = ui.state;
		if (!st || pos < 0)
			return "";
		var html = "<b>" + R.posName(pos) + "</b> – ";
		var ai = rc.arsAt[pos] - 1;
		if (ai >= 0)
			html += esc(L.arsenal + " " + sideName(rc.arsSide[ai])) + (st.ars[ai] ? "" : " (" + esc(L.destroyed) + ")");
		else
			html += esc(L.terrain[rc.terr[pos]]);
		var v = st.grid[pos];
		if (v !== 0 && !isHidden(v)) {
			var side = v > 0 ? 1 : -1, type = Math.abs(v);
			html += "<br><b>" + esc(L.units[type]) + "</b> (" + esc(sideName(side)) + ")<br>" +
				esc(L.move) + " " + rc.move[type] + ", " + esc(L.range) + " " + rc.range[type] +
				(type < R.SIGNAL ? ", " + esc(L.att.toLowerCase()) + " " + rc.attack[type] +
					(type === R.CAVALRY ? " (" + rc.charge + ")" : "") : "") +
				", " + esc(L.def.toLowerCase()) + " " + R.defenseAt(rc, st, pos) +
				"<br>" + esc(ui.on[side][pos] ? L.inComm : L.isolated);
			if (st.phase >= 2) {
				// rapport de force : par le camp au trait sur une unite adverse,
				// par l'adversaire sur une unite du camp au trait
				var who = turn ? turn.who : ui.board.mWho;
				var probe = turn || new R.Turn(rc, st, who);
				var s = probe.strength(pos, -side);
				var outcome = s.delta >= 1 ? (side !== who ? probe.outcomeOf(pos, s.delta) : (s.delta >= 2 ? "destroy" : "retreat")) : null;
				html += "<br>" + (side === who ? esc(L.threat) + " : " : "") +
					'<span class="kriegspiel-att">' + esc(L.att) + " " + s.att + "</span> / " +
					'<span class="kriegspiel-def">' + esc(L.def) + " " + s.def + "</span><br>→ " +
					esc(outcome === "destroy" ? L.destroy : outcome === "retreat" ? L.retreat : L.noEffect);
				ui.overlay.detail = { attackers: s.attackers, defenders: s.defenders };
			}
		}
		return html;
	}

	function hover(pos) {
		if (!ui || pos === ui.hover)
			return;
		ui.hover = pos;
		ui.overlay.detail = null;
		setInfo(describe(pos, ui.controller ? ui.controller.turn : null));
		ui.xdv.updateGadget("marks", { base: {} });
	}

	/* ---------- gadgets ---------- */

	View.Game.xdInit = function (xdv) {
		var game = this, rc = this.g.ctx;
		ui = {
			xdv: xdv, game: game, fullPath: this.mViewOptions.fullPath, imageDir: skinImages(this),
			images: {}, assign: {}, shown: {}, state: null, board: null, lines: null, on: null,
			overlay: emptyOverlay(), hideSide: 0, hover: -1,
			showLines: 0, blind: !!this.mOptions.blindDeployment,
			panelEl: null, panelBody: null, panelHtml: "", infoHtml: "",
			controller: null, click: null
		};

		xdv.createGadget("board", {
			"2d": { type: "canvas", x: CANVAS_X, y: CANVAS_Y, z: 0, width: CANVAS_W, height: CANVAS_H, draw: drawBoard }
		});
		xdv.createGadget("marks", {
			"2d": { type: "canvas", x: CANVAS_X, y: CANVAS_Y, z: 4, width: CANVAS_W, height: CANVAS_H, draw: drawMarks }
		});
		for (var side = 1; side >= -1; side -= 2)
			for (var type = 1; type <= 6; type++)
				for (var i = 0; i < rc.count[type]; i++)
					xdv.createGadget("u#" + side + "#" + type + "#" + i, {
						"2d": {
							type: "sprite",
							file: imagePath("unites"),
							clipx: (type - 1) * SPRITE, clipy: side === 1 ? 0 : SPRITE,
							clipwidth: SPRITE, clipheight: SPRITE,
							width: CS, height: CS, z: 3
						}
					});
		// un seul calque pour les clics et le survol du plateau
		xdv.createGadget("input", {
			"2d": {
				type: "element", x: X0 + BOARD_W / 2, y: 0, z: 6, width: BOARD_W, height: BOARD_H,
				initialClasses: "kriegspiel-input",
				display: function (element) {
					if (element.data("kriegspiel"))
						return;
					element.data("kriegspiel", true);
					function cellOf(event) {
						var rect = element[0].getBoundingClientRect();
						var col = Math.floor((event.clientX - rect.left) / rect.width * COLS);
						var row = Math.floor((event.clientY - rect.top) / rect.height * ROWS);
						if (col < 0 || col >= COLS || row < 0 || row >= ROWS)
							return -1;
						if (flipped()) {
							col = COLS - 1 - col;
							row = ROWS - 1 - row;
						}
						return row * COLS + col;
					}
					// ecouteurs natifs : l'avatar du gadget retire les ecouteurs
					// jQuery (mousemove, mouseup...) a son premier affichage
					var node = element[0];
					node.addEventListener("click", function (event) {
						var pos = cellOf(event);
						if (!ui || pos < 0)
							return;
						if (ui.click)
							ui.click(pos);
						ui.hover = -1;
						hover(pos);
					});
					node.addEventListener("mousemove", function (event) { hover(cellOf(event)); });
					node.addEventListener("mouseleave", function () { hover(-1); });
				}
			}
		});
		xdv.createGadget("panel", {
			"2d": {
				type: "element", x: PANEL_X, y: 0, z: 1, width: PANEL_W, height: CANVAS_H,
				initialClasses: "kriegspiel-panel kriegspiel-skin-" + game.mSkin,
				display: function (element, width) {
					element.css("font-size", (width / 14) + "px");
					if (!element.data("kriegspiel")) {
						element.data("kriegspiel", true);
						element.html('<div class="kriegspiel-body"></div>');
						element.on("click", "[data-act]", function () {
							if (!ui || jQuery(this).hasClass("kriegspiel-disabled"))
								return;
							var act = jQuery(this).attr("data-act"), arg = jQuery(this).attr("data-arg");
							if (act === "lines") {
								ui.showLines = (ui.showLines + 1) % 4;
								jQuery(this).text(lang().lines[ui.showLines]);
								redrawCanvases();
							} else if (ui.controller && ui.controller.act)
								ui.controller.act(act, arg);
						});
					}
					ui.panelEl = element;
					ui.panelBody = element.find(".kriegspiel-body");
					ui.panelBody.html(ui.panelHtml);
					element.find(".kriegspiel-info").html(ui.infoHtml);
				}
			}
		});
	};

	View.Game.xdBuildScene = function (xdv) {
		["board", "marks", "input", "panel"].forEach(function (id) {
			xdv.updateGadget(id, { base: { visible: true } });
		});
		// les cases changent avec le camp depuis lequel on regarde
		if (ui) {
			ui.assign = {};
			ui.shown = {};
		}
	};

	/* ---------- affichage ---------- */

	View.Board.xdDisplay = function (xdv, aGame) {
		if (!ui)
			return;
		ui.game = aGame;
		ui.board = this;
		ui.overlay = emptyOverlay();
		ui.hover = -1;
		// deploiement a l'aveugle : le Nord est masque pendant que le Sud place
		ui.hideSide = (ui.blind && this.phase === 1) ? 1 : 0;
		if (ui.lastArrows && ui.lastArrows.turn === this.turn)
			ui.overlay.arrows = ui.lastArrows.list;
		render(this, 0);
		ui.infoHtml = "";
		idlePanel(this, aGame);
	};

	/*
	 * Le coup de l'adversaire, pas a pas : `this` est le plateau apres le coup,
	 * aGame.mOldBoard celui d'avant.
	 */
	View.Board.xdPlayedMove = function (xdv, aGame, aMove) {
		if (!ui)
			return true;
		var R = aGame.g.rules, rc = aGame.g.ctx, board = this, old = aGame.mOldBoard;
		function shown() {
			if (aGame.MoveShown)
				aGame.MoveShown();
		}
		ui.game = aGame;
		ui.overlay = emptyOverlay();
		if (!old || old.phase < 2 || aMove.p) {
			ui.hideSide = 0;
			render(board, 0);
			setTimeout(shown, 50);
			return false;
		}
		var who = old.mWho;
		var turn = new R.Turn(rc, old, who, { trusted: true });
		var steps = [];
		if (aMove.r) steps.push(aMove.r);
		(aMove.m || []).forEach(function (s) { steps.push(s); });
		var arrows = steps.map(function (s) { return [s[0], s[1], who]; });
		ui.lastArrows = { turn: board.turn, list: arrows };
		var index = 0;
		function next() {
			if (index < steps.length) {
				var s = steps[index++];
				turn.move(s[0], s[1]);
				ui.overlay.arrows = arrows.slice(0, index);
				ui.overlay.moved = Object.keys(turn.moved).map(Number);
				render(turn.st, 280);
				setTimeout(next, 330);
			} else if (aMove.a !== undefined && board.last) {
				ui.overlay.chosen = { target: aMove.a, outcome: board.last.outcome };
				ui.xdv.updateGadget("marks", { base: {} });
				setTimeout(function () {
					render(board, 0);
					setTimeout(shown, 250);
				}, 600);
			} else {
				render(board, 0);
				setTimeout(shown, 100);
			}
		}
		render(turn.st, 0);
		next();
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

		/* --- placement --- */
		function Placement() {
			var L = lang();
			var placed = { I: [], C: [], A: [], AC: [], T: [], E: [] };
			var selected = 1;
			function remaining(type) { return rc.count[type] - placed[R.CODES[type]].length; }
			function total() {
				var n = 0;
				for (var t = 1; t <= 6; t++) n += placed[R.CODES[t]].length;
				return n;
			}
			function state() {
				var st = R.copyState(board);
				for (var t = 1; t <= 6; t++)
					placed[R.CODES[t]].forEach(function (pos) { st.grid[pos] = who * t; });
				return st;
			}
			function refresh() {
				if (remaining(selected) === 0)
					for (var t = 1; t <= 6; t++)
						if (remaining(t) > 0) { selected = t; break; }
				var html = header(board) + '<div class="kriegspiel-hint">' + esc(L.placeHint) +
					(ui.hideSide ? " " + esc(L.hidden) : "") +
					(who === 1 && ui.blind ? " " + esc(L.blindNote) : "") + "</div>" +
					'<div class="kriegspiel-reserve">';
				for (var type = 1; type <= 6; type++)
					html += '<div class="kriegspiel-unit' + (type === selected && remaining(type) > 0 ? " kriegspiel-selected" : "") +
						(remaining(type) === 0 ? " kriegspiel-disabled" : "") + '" data-act="pick" data-arg="' + type + '">' +
						'<span class="kriegspiel-icon" style="background-position:' + ((type - 1) * 20) + "% " + (who === 1 ? 0 : 100) + '%"></span>' +
						'<span class="kriegspiel-name">' + esc(L.units[type]) + '</span><span class="kriegspiel-count">' + remaining(type) + "</span></div>";
				html += '</div><div class="kriegspiel-info"></div><div class="kriegspiel-buttons">' +
					button("auto", L.auto, true, "kriegspiel-light") +
					button("clear", L.clear, total() > 0, "kriegspiel-light") +
					(who === 1 ? button("blind", ui.blind ? L.blindOn : L.blindOff, true, "kriegspiel-light") : "") +
					button("end", L.endPlacement, total() === 17) + "</div>";
				ui.overlay = emptyOverlay();
				ui.infoHtml = "";
				setPanel(html);
				render(state(), 0);
			}
			this.turn = null;
			this.click = function (pos) {
				if (R.territory(pos) !== who || rc.terr[pos] === R.MOUNTAIN || board.grid[pos] !== 0)
					return;
				for (var t = 1; t <= 6; t++) {
					var k = placed[R.CODES[t]].indexOf(pos);
					if (k >= 0) {
						placed[R.CODES[t]].splice(k, 1);
						selected = t;
						refresh();
						return;
					}
				}
				if (remaining(selected) > 0) {
					placed[R.CODES[selected]].push(pos);
					refresh();
				}
			};
			this.act = function (act, arg) {
				if (act === "pick")
					selected = parseInt(arg, 10);
				else if (act === "clear")
					placed = { I: [], C: [], A: [], AC: [], T: [], E: [] };
				else if (act === "auto") {
					var list = AI.placements(rc, who, 1, function (n) { return Math.floor(Math.random() * n); });
					if (list.length)
						placed = JSON.parse(JSON.stringify(list[0].p));
				} else if (act === "blind")
					ui.blind = !ui.blind;
				else if (act === "end") {
					if (total() === 17 && !R.checkPlacement(rc, board, who, placed))
						send({ p: placed });
					return;
				}
				refresh();
			};
			refresh();
		}

		/* --- tour de jeu --- */
		function Play() {
			var L = lang(), self = this;
			var actions = [];   // [de, vers] ou { a: cible }
			var selection = -1, message = "";
			function rebuild() {
				var turn = new R.Turn(rc, board, who);
				actions.forEach(function (action) {
					if (Array.isArray(action)) turn.move(action[0], action[1]);
					else turn.attack(action.a);
				});
				self.turn = turn;
				return turn;
			}
			function refresh(delay) {
				var turn = self.turn, ov = emptyOverlay();
				if (turn.needRetreat)
					selection = turn.st.retreat;
				if (selection >= 0 && turn.whyNotMove(selection))
					selection = -1;
				ov.selection = selection;
				ov.moved = Object.keys(turn.moved).map(Number);
				if (selection >= 0)
					ov.dests = turn.dests(selection).map(function (dest) {
						// la case d'arrivee serait-elle en communication ?
						var trial = R.copyState(turn.st);
						trial.grid[dest] = trial.grid[selection];
						trial.grid[selection] = 0;
						return { pos: dest, on: R.communications(rc, trial, who, false).on[dest] === 1 };
					});
				ov.targets = turn.attacks().map(function (a) {
					return { pos: a.target, outcome: turn.outcomeOf(a.target, a.delta) };
				});
				if (turn.result)
					ov.chosen = turn.result;
				// le coup de l'adversaire reste trace tant qu'on n'a rien joue
				if (actions.length === 0 && ui.lastArrows && ui.lastArrows.turn === board.turn)
					ov.arrows = ui.lastArrows.list;
				ui.overlay = ov;
				ui.hover = -1;
				// Une attaque choisie ferme le tour : plus aucun deplacement n'est
				// possible (l'ordre est deplacements, puis attaque). Sans message
				// permanent, le plateau semble fige ; on le dit donc tout de
				// suite, et le bouton « Fin du tour » est mis en avant.
				var closed = turn.a !== undefined;
				var hint = closed ? L.attackDone :
					(message || (turn.needRetreat ? L.retreatDue : (turn.d !== undefined ? L.arsenalDone : "")));
				var html = header(board) +
					'<div class="kriegspiel-status">' + esc(L.moves) + " : <b>" + turn.n + " / " + rc.maxMoves + "</b><br>" +
					esc(L.attack) + " : <b>" + (turn.result ? R.posName(turn.result.target) + " (" + turn.result.att + " / " + turn.result.def + ", " +
						esc(turn.result.outcome === "destroy" ? L.destroy : L.retreat) + ")" :
						(turn.d !== undefined ? R.posName(turn.d) + "!" : esc(L.none))) + "</b></div>" +
					commSummary(turn.st) +
					'<div class="kriegspiel-hint' + (closed || turn.needRetreat ? " kriegspiel-alert" : "") + '">' + esc(hint) + "</div>" +
					'<div class="kriegspiel-info"></div><div class="kriegspiel-buttons">' +
					linesButton() +
					button("undo", L.undo, actions.length > 0, "kriegspiel-light") +
					button("end", L.endTurn, !turn.needRetreat, closed ? "kriegspiel-call" : "") + "</div>";
				ui.infoHtml = "";
				setPanel(html);
				render(turn.st, delay || 0);
				message = "";
			}
			this.click = function (pos) {
				var turn = self.turn, v = turn.st.grid[pos];
				if (v !== 0 && R.sideOf(v) === who) {
					if (pos === selection && !turn.needRetreat)
						selection = -1;
					else {
						var why = turn.whyNotMove(pos);
						if (why)
							message = L.why[why] || "";
						else
							selection = pos;
					}
					refresh();
					return;
				}
				if (selection >= 0 && v === 0 && turn.dests(selection).indexOf(pos) >= 0) {
					actions.push([selection, pos]);
					selection = -1;
					rebuild();
					refresh(220);
					return;
				}
				if (v !== 0 && turn.attacks().some(function (a) { return a.target === pos; })) {
					actions.push({ a: pos });
					selection = -1;
					rebuild();
					refresh();
					return;
				}
				if (turn.a !== undefined && v === 0)
					message = L.why["attack-done"];
				if (!turn.needRetreat)
					selection = -1;
				refresh();
			};
			this.act = function (act) {
				if (act === "undo" && actions.length) {
					actions.pop();
					selection = -1;
					rebuild();
					refresh(220);
				} else if (act === "end" && !self.turn.needRetreat) {
					var move = self.turn.toMove();
					if (board.IsValidMove(aGame, move))
						send(move);
				}
			};
			rebuild();
			refresh();
		}

		function Init() {
			if (!ui)
				return;
			ui.game = aGame;
			ui.board = board;
			ui.hideSide = (ui.blind && board.phase === 1) ? 1 : 0;
			controller = board.phase < 2 ? new Placement() : new Play();
			ui.controller = controller;
			ui.click = function (pos) { controller.click(pos); };
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
