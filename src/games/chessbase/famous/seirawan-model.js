/*
 * Seirawan++ : les échecs orthodoxes, plus deux pièces peu courantes qui
 * attendent hors du plateau et entrent au premier mouvement d'une pièce de la
 * rangée arrière.
 *
 * LE BUT DU JEU N'EST PAS LA VARIANTE, C'EST LA DÉCOUVERTE. On joue sur un
 * échiquier ordinaire, avec des règles ordinaires, et l'on apprend deux pièces
 * de plus. La paire est donc une DONNÉE (voir PAIRS) et non du code : un
 * prélude la choisira, et chaque paire renvoie à la variante d'où elle vient —
 * l'éléphant et le canon du shako, le kirin et le phénix du chu shogi.
 *
 * ── Ce qui a changé depuis la version 1 ──────────────────────────────────────
 *
 * Ce fichier ré-exprime un modèle écrit pour le jocly v1, où le mécanisme
 * d'entrée n'était PAS dans le jeu mais dans le socle partagé. Trois écarts, et
 * aucun ne se voyait à la lecture du bloc de règles :
 *
 *  1. `entranceSquares` — la mémoire de « cette case peut-elle encore faire
 *     entrer une pièce ? » — était initialisée, consommée et restaurée dans
 *     base-model.js. Elle vit ici.
 *
 *  2. `promote()` y rendait un objet `{promos, entrance}`. Le socle actuel
 *     attend un TABLEAU de types : `promo.length` y décide de tout. Ce retour
 *     n'aurait déclenché aucune branche — pas d'erreur, simplement plus aucun
 *     coup de promotion. L'entrée passe donc par GenerateMoves, et promote()
 *     retrouve son rôle ordinaire.
 *
 *  3. L'entrée y était encodée dans un entier (`entrance > 999`, `> 1999`)
 *     mêlant la case et le cas du roque. Ici un champ `en` porte la case de la
 *     porte, et rien d'autre.
 *
 * ── Le point qui ne se voit pas à l'œil ──────────────────────────────────────
 *
 * La pièce qui entre se pose sur la case que la pièce déplacée vient de
 * QUITTER. Un coup avec entrée laisse donc cette case occupée, là où un coup
 * ordinaire la laisse vide — et cela change la légalité : un coup qui
 * découvrirait un échec peut devenir légal parce que la pièce entrante bouche
 * la ligne.
 *
 * C'est pourquoi cbQuickApply est surchargé. Sans cela la légalité serait
 * calculée sur un échiquier qui n'est pas celui du coup : des coups légaux
 * écartés, et des coups illégaux acceptés. Rien ne le signalerait.
 *
 * ── Ce qui n'est pas fait ────────────────────────────────────────────────────
 *
 * L'entrée AU ROQUE. Deux cases s'y libèrent, celle du roi et celle de la
 * tour ; le S-Chess l'autorise. Le socle traite le roque par un chemin séparé
 * (cbApplyCastle), et l'y greffer demande de savoir lequel des deux départs
 * l'entrée occupe. Laissé de côté plutôt qu'à moitié posé.
 */

(function() {

	/*
	 * UN ÉCHIQUIER DE 8x8, PLUS DES CASES HORS JEU.
	 *
	 * cbDropGeometry construit une grille plus large et déclare la zone de jeu
	 * réelle : les cases hors zone existent pour le moteur mais AUCUN
	 * coulissant n'y entre. C'est ce qu'emploie le crazyhouse pour sa réserve,
	 * et c'est exactement le contrat dont les portes ont besoin.
	 *
	 * Ce n'était pas le cas d'une grille ordinaire étendue en hauteur : les
	 * portes y étaient des cases comme les autres, et la tour descendait
	 * dessus dès qu'une pièce en était sortie (Ra2-a1, Ke2-d1…). Le défaut
	 * était masqué au départ, les portes étant occupées, et apparaissait à la
	 * première entrée.
	 *
	 * Bénéfice second, et il compte autant : les rangées gardent leur
	 * numérotation. Sur la grille étendue, le pion e4 s'écrivait « e5 » et
	 * chaque notation de ce jeu était illisible pour qui connaît les échecs.
	 *
	 * Les pièces en attente sont sur le plateau au sens du moteur — elles ont
	 * une case, elles comptent dans le matériel — mais leur graphe est vide :
	 * elles ne se déplacent jamais d'elles-mêmes. C'est un coup d'une pièce de
	 * la rangée arrière qui les fait entrer.
	 */
	var GRID = 12;                          // 8 colonnes de jeu + 4 hors jeu
	var geometry = Model.Game.cbBoardGeometryGrid(GRID,8);

	/*
	 * LA ZONE DE JEU, passée en `confine` à chaque graphe de pièce.
	 *
	 * C'est le mécanisme que drop-model.js emploie pour sa réserve : les cases
	 * hors zone existent pour le moteur, mais aucun graphe n'y mène. On le
	 * reprend sans charger drop-model, qui apporterait toute la machinerie du
	 * parachutage -- son InitialPosition exige un handLayout que ce jeu n'a
	 * pas, et le charger pour une géométrie ferait échouer la création de la
	 * partie.
	 */
	geometry.handWidth = 2; geometry.handHeight = 0;

	/*
	 * LE NOM DES CASES, décalé de deux colonnes.
	 *
	 * La grille fait douze colonnes, mais l'échiquier commence à la troisième :
	 * sans correction, le pion `a` s'appelle « c2 » et chaque notation de ce
	 * jeu est illisible pour qui connaît les échecs.
	 *
	 * Le crazyhouse, sur la même grille, fait la même correction -- mais dans
	 * sa propre réécriture de Move.ToString, avec un `Name()` qui calcule
	 * `95 + C(pos)`. Il ne pouvait pas faire autrement : il avait de toute
	 * façon à réécrire la notation pour les parachutages, la promotion et le
	 * roque.
	 *
	 * Ici il n'y a rien à réécrire : la notation des échecs du socle convient,
	 * avec sa désambiguïsation et ses roques. On corrige donc à la SOURCE, sur
	 * la géométrie, et tout ce qui nomme une case en profite -- la notation,
	 * l'export FEN de la case en passant, la lecture d'un coup écrit.
	 */
	var rawPosName = geometry.PosName, rawPosByName = geometry.PosByName;
	geometry.PosName = function(pos) {
		return String.fromCharCode(95 + geometry.C(pos)) + (geometry.R(pos) + 1);
	};
	geometry.PosByName = function(str) {
		var m = /^([a-z])([0-9]+)$/.exec(str);
		if(!m) return -1;
		return POS(m[1].charCodeAt(0) - 97, parseInt(m[2],10) - 1);
	};

	var AREA = {};
	for(var r=0;r<8;r++)
		for(var f=0;f<8;f++)
			AREA[(r*GRID + f + 2).toString()] = 1;

	/** La case du fichier `f` (0 = a) sur la rangée `r` (0 = rangée 1). */
	function POS(f,r) { return r*GRID + f + 2; }

	/** Une case d'attente : hors de la zone de jeu, à droite de l'échiquier. */
	function GATE(n,r) { return r*GRID + 10 + n; }

	var WHITE_HOME = 0, BLACK_HOME = 7;     // rangées arrière

	/*
	 * LES PAIRES DE PIÈCES, en donnée.
	 *
	 * Une seule sert aujourd'hui ; le prélude choisira parmi les autres. Chaque
	 * entrée dit d'où la pièce vient, parce que c'est tout l'objet du jeu :
	 * reconnaître un cardinal ici rend le Capablanca lisible ensuite.
	 *
	 * `fen` doit rester distinct des lettres orthodoxes (P N B R Q K) ET des
	 * deux lettres de la paire entre elles ; c'est la seule contrainte qu'une
	 * nouvelle entrée doit respecter.
	 */
	var PAIRS = {
		"marshall-cardinal": [
			{ name:'cardinal', fen:'C', aspect:'fr-cardinal', value:7,
			  graph: function(g,self) { return self.cbMergeGraphs(g,self.cbBishopGraph(g,AREA),self.cbKnightGraph(g,AREA)); } },
			{ name:'marshall', fen:'M', aspect:'fr-marshall', value:9,
			  graph: function(g,self) { return self.cbMergeGraphs(g,self.cbRookGraph(g,AREA),self.cbKnightGraph(g,AREA)); } },
		],
	};

	var PAIR = PAIRS["marshall-cardinal"];

	// Types : 0-8 comme aux échecs orthodoxes, puis les deux pièces de la paire
	// et leurs formes en attente.
	var CARDINAL = 9, MARSHALL = 10, GATE_CARDINAL = 11, GATE_MARSHALL = 12;

	// Quelle piece attend sur quelle porte : fixe par le placement initial, et
	// c'est ce qui permet a la notation de la nommer sans consulter le plateau.
	var GATE_LETTER = {};
	GATE_LETTER[GATE(0,WHITE_HOME)] = PAIR[0].fen;
	GATE_LETTER[GATE(1,WHITE_HOME)] = PAIR[1].fen;
	GATE_LETTER[GATE(0,BLACK_HOME)] = PAIR[0].fen;
	GATE_LETTER[GATE(1,BLACK_HOME)] = PAIR[1].fen;
	var ENTERS = {};
	ENTERS[GATE_CARDINAL] = CARDINAL;
	ENTERS[GATE_MARSHALL] = MARSHALL;

	Model.Game.cbDefine = function() {
		var self = this;
		var empty = this.cbEmptyGraph(geometry);

		return {
			geometry: geometry,

			pieceTypes: {
				0: { name:'pawn-w', aspect:'pawn', graph:this.cbPawnGraph(geometry,1,AREA),
				     value:1, abbrev:'', fenAbbrev:'P', epCatch:true },
				1: { name:'ipawn-w', aspect:'pawn', graph:this.cbInitialPawnGraph(geometry,1,AREA),
				     value:1, abbrev:'', fenAbbrev:'P', epTarget:true, epCatch:true,
				     initial:[{s:1,p:POS(0,1)},{s:1,p:POS(1,1)},{s:1,p:POS(2,1)},{s:1,p:POS(3,1)},
				              {s:1,p:POS(4,1)},{s:1,p:POS(5,1)},{s:1,p:POS(6,1)},{s:1,p:POS(7,1)}] },
				2: { name:'pawn-b', aspect:'pawn', graph:this.cbPawnGraph(geometry,-1,AREA),
				     value:1, abbrev:'', fenAbbrev:'P', epCatch:true },
				3: { name:'ipawn-b', aspect:'pawn', graph:this.cbInitialPawnGraph(geometry,-1,AREA),
				     value:1, abbrev:'', fenAbbrev:'P', epTarget:true, epCatch:true,
				     initial:[{s:-1,p:POS(0,6)},{s:-1,p:POS(1,6)},{s:-1,p:POS(2,6)},{s:-1,p:POS(3,6)},
				              {s:-1,p:POS(4,6)},{s:-1,p:POS(5,6)},{s:-1,p:POS(6,6)},{s:-1,p:POS(7,6)}] },

				4: { name:'knight', graph:this.cbKnightGraph(geometry,AREA), value:2.9, abbrev:'N',
				     initial:[{s:1,p:POS(1,WHITE_HOME)},{s:1,p:POS(6,WHITE_HOME)},
				              {s:-1,p:POS(1,BLACK_HOME)},{s:-1,p:POS(6,BLACK_HOME)}] },
				5: { name:'bishop', graph:this.cbBishopGraph(geometry,AREA), value:3.05, abbrev:'B',
				     initial:[{s:1,p:POS(2,WHITE_HOME)},{s:1,p:POS(5,WHITE_HOME)},
				              {s:-1,p:POS(2,BLACK_HOME)},{s:-1,p:POS(5,BLACK_HOME)}] },
				6: { name:'rook', graph:this.cbRookGraph(geometry,AREA), value:4.95, abbrev:'R', castle:true,
				     initial:[{s:1,p:POS(0,WHITE_HOME)},{s:1,p:POS(7,WHITE_HOME)},
				              {s:-1,p:POS(0,BLACK_HOME)},{s:-1,p:POS(7,BLACK_HOME)}] },
				7: { name:'queen', graph:this.cbQueenGraph(geometry,AREA), value:9.15, abbrev:'Q',
				     initial:[{s:1,p:POS(3,WHITE_HOME)},{s:-1,p:POS(3,BLACK_HOME)}] },
				8: { name:'king', graph:this.cbKingGraph(geometry,AREA), isKing:true, abbrev:'K',
				     initial:[{s:1,p:POS(4,WHITE_HOME)},{s:-1,p:POS(4,BLACK_HOME)}] },

				9:  { name:PAIR[0].name, aspect:PAIR[0].aspect, graph:PAIR[0].graph(geometry,self),
				      value:PAIR[0].value, abbrev:PAIR[0].fen },
				10: { name:PAIR[1].name, aspect:PAIR[1].aspect, graph:PAIR[1].graph(geometry,self),
				      value:PAIR[1].value, abbrev:PAIR[1].fen },

				/*
				 * Les formes en attente : même apparence, GRAPHE VIDE. Elles ne
				 * jouent pas ; elles entrent. Leur valeur est celle de la pièce
				 * qu'elles deviendront — l'évaluation doit voir qu'un camp qui
				 * a encore ses deux pièces en porte n'est pas en retard de
				 * matériel.
				 */
				11: { name:'gate-'+PAIR[0].name, aspect:PAIR[0].aspect, graph:empty,
				      value:PAIR[0].value, abbrev:PAIR[0].fen, fenAbbrev:PAIR[0].fen+'!',
				      initial:[{s:1,p:GATE(0,WHITE_HOME)},{s:-1,p:GATE(0,BLACK_HOME)}] },
				12: { name:'gate-'+PAIR[1].name, aspect:PAIR[1].aspect, graph:empty,
				      value:PAIR[1].value, abbrev:PAIR[1].fen, fenAbbrev:PAIR[1].fen+'!',
				      initial:[{s:1,p:GATE(1,WHITE_HOME)},{s:-1,p:GATE(1,BLACK_HOME)}] },
			},

			// Ordinaire : le socle attend un tableau, et l'entrée ne passe plus
			// par ici (voir GenerateMoves).
			promote: function(aGame,piece,move) {
				if(piece.t==1) return [0];
				if(piece.t==3) return [2];
				if(piece.t==0 && geometry.R(move.t)==BLACK_HOME) return [4,5,6,7,CARDINAL,MARSHALL];
				if(piece.t==2 && geometry.R(move.t)==WHITE_HOME) return [4,5,6,7,CARDINAL,MARSHALL];
				return [];
			},

			castle: (function() {
				var c = {};
				c[POS(4,WHITE_HOME)+"/"+POS(0,WHITE_HOME)] =
					{k:[POS(3,WHITE_HOME),POS(2,WHITE_HOME)],
					 r:[POS(1,WHITE_HOME),POS(2,WHITE_HOME),POS(3,WHITE_HOME)], n:"O-O-O"};
				c[POS(4,WHITE_HOME)+"/"+POS(7,WHITE_HOME)] =
					{k:[POS(5,WHITE_HOME),POS(6,WHITE_HOME)],
					 r:[POS(6,WHITE_HOME),POS(5,WHITE_HOME)], n:"O-O"};
				c[POS(4,BLACK_HOME)+"/"+POS(0,BLACK_HOME)] =
					{k:[POS(3,BLACK_HOME),POS(2,BLACK_HOME)],
					 r:[POS(1,BLACK_HOME),POS(2,BLACK_HOME),POS(3,BLACK_HOME)], n:"O-O-O"};
				c[POS(4,BLACK_HOME)+"/"+POS(7,BLACK_HOME)] =
					{k:[POS(5,BLACK_HOME),POS(6,BLACK_HOME)],
					 r:[POS(6,BLACK_HOME),POS(5,BLACK_HOME)], n:"O-O"};
				return c;
			})(),
		};
	}

	/** Un graphe qui ne mène nulle part : les pièces en attente ne jouent pas. */
	Model.Game.cbEmptyGraph = function(geometry) {
		var graph = {};
		for(var pos=0;pos<geometry.boardSize;pos++)
			graph[pos] = [];
		return graph;
	}

	/* ─── L'état propre au jeu : quelles cases peuvent encore faire entrer ──── */

	var SuperInitialPosition = Model.Board.InitialPosition;
	Model.Board.InitialPosition = function(aGame) {
		SuperInitialPosition.apply(this,arguments);
		// Les seize cases des deux rangées arrière, ouvertes. Une case se ferme
		// dès que la pièce qui l'occupait l'a quittée, qu'une pièce soit entrée
		// ou non : c'est le premier mouvement qui compte, pas l'entrée.
		this.entranceSquares = {};
		for(var f=0;f<8;f++) {
			this.entranceSquares[POS(f,WHITE_HOME)] = true;
			this.entranceSquares[POS(f,BLACK_HOME)] = true;
		}
	}

	var SuperCopyFrom = Model.Board.CopyFrom;
	Model.Board.CopyFrom = function(aBoard) {
		SuperCopyFrom.apply(this,arguments);
		/*
		 * La recherche ne défait pas les coups : elle COPIE les plateaux
		 * (nextBoard.CopyFrom puis ApplyMove). Cette recopie est donc tout ce
		 * qui porte l'état d'une position à la suivante — l'oublier rouvrirait
		 * toutes les portes à chaque nœud exploré.
		 */
		this.entranceSquares = {};
		for(var pos in aBoard.entranceSquares)
			this.entranceSquares[pos] = aBoard.entranceSquares[pos];
	}

	/** La pièce en attente de ce camp sur cette porte, ou -1. */
	Model.Board.cbGatePiece = function(aGame,pos,who) {
		var index = this.board[pos];
		if(index < 0) return -1;
		var piece = this.pieces[index];
		if(piece.s !== who) return -1;
		return ENTERS[piece.t] === undefined ? -1 : index;
	}

	/** Les portes de ce camp, dans l'ordre où elles seront proposées. */
	function gatesOf(who) {
		var r = who > 0 ? WHITE_HOME : BLACK_HOME;
		return [GATE(0,r),GATE(1,r)];
	}

	/* ─── L'entrée, produite à la génération ────────────────────────────────── */

	var SuperGenerateMoves = Model.Board.GenerateMoves;
	Model.Board.GenerateMoves = function(aGame) {
		SuperGenerateMoves.apply(this,arguments);

		/*
		 * Pour chaque coup qui QUITTE une case encore ouverte de la rangée
		 * arrière, une variante par pièce en attente. Le coup d'origine reste :
		 * ne pas faire entrer de pièce est un choix, et souvent le bon — une
		 * pièce entrée n'est plus disponible plus tard.
		 *
		 * Ajoutées APRÈS le socle, donc après le filtre de légalité : c'est
		 * cbQuickApply qui doit connaître `en`, sans quoi ces variantes
		 * seraient jugées sur un échiquier qui n'est pas le leur.
		 */
		var gates = gatesOf(this.mWho);
		var extra = [];
		var movesLength = this.mMoves.length;
		for(var i=0;i<movesLength;i++) {
			var move = this.mMoves[i];
			if(move.cg !== undefined) continue;           // roque : voir l'en-tête
			if(!this.entranceSquares[move.f]) continue;
			for(var g=0;g<gates.length;g++) {
				if(this.cbGatePiece(aGame,gates[g],this.mWho) < 0) continue;
				var variant = aGame.CreateMove(move);
				variant.en = gates[g];
				extra.push(variant);
			}
		}
		for(var k=0;k<extra.length;k++)
			this.mMoves.push(extra[k]);
	}

	/*
	 * LA LÉGALITÉ SE CALCULE SUR L'ÉCHIQUIER DU COUP.
	 *
	 * La pièce entrante occupe la case que la pièce déplacée vient de quitter :
	 * un coup qui découvrirait un échec peut donc être légal parce qu'elle
	 * bouche la ligne. Sans cette surcharge, ces coups seraient écartés à tort
	 * -- et, symétriquement, une entrée ne pourrait jamais parer un échec par
	 * interposition.
	 *
	 * L'annulation n'a rien à surcharger : cbQuickUnapply rejoue le journal
	 * sans savoir ce qu'il contient, donc une entrée de plus se défait comme
	 * les autres.
	 */
	var SuperQuickApply = Model.Board.cbQuickApply;
	Model.Board.cbQuickApply = function(aGame,move) {
		var undo = SuperQuickApply.apply(this,arguments);
		if(move.en === undefined) return undo;
		var index = this.board[move.en];
		if(index < 0) return undo;
		var piece = this.pieces[index];
		undo.unshift({ i:index, f:move.f, t:move.en, ty:piece.t });
		this.board[move.en] = -1;
		piece.p = move.f;
		piece.t = ENTERS[piece.t];
		this.board[move.f] = index;
		return undo;
	}

	var SuperApplyMove = Model.Board.ApplyMove;
	Model.Board.ApplyMove = function(aGame,move) {
		var entering = move.en === undefined ? -1 : this.board[move.en];
		SuperApplyMove.apply(this,arguments);

		// La case se ferme dès qu'elle est quittée, entrée ou non.
		if(this.entranceSquares[move.f])
			this.entranceSquares[move.f] = false;

		if(entering < 0) return;
		var piece = this.pieces[entering];
		this.zSign ^= aGame.bKey(piece);
		this.zSign ^= aGame.tKey(piece);
		this.board[move.en] = -1;
		piece.p = move.f;
		piece.t = ENTERS[piece.t];
		piece.r = aGame.g.pTypes[piece.t].ranking;
		this.board[move.f] = entering;
		this.zSign ^= aGame.tKey(piece);
		this.zSign ^= aGame.bKey(piece);
	}

	/* ─── Le coup se lit ────────────────────────────────────────────────────── */

	var SuperMoveToString = Model.Move.ToString;
	Model.Move.ToString = function(format) {
		var text = SuperMoveToString.apply(this,arguments);
		/*
		 * Notation du S-Chess : la LETTRE de la piece entrante suit le coup
		 * apres une barre -- « Nb2-c4/C », le cavalier part et le cardinal
		 * prend sa place.
		 *
		 * La lettre, et non la case : la case d'entree est toujours celle que
		 * la piece vient de quitter, donc elle ne distingue rien. Ecrite ainsi,
		 * les deux variantes d'un meme coup -- l'une faisant entrer le
		 * cardinal, l'autre le marshall -- s'ecrivaient a l'identique, et une
		 * partie relue aurait pris la premiere des deux. C'est exactement le
		 * piege que le commentaire d'Equals decrit pour le roque.
		 */
		if(this.en !== undefined)
			text += "/" + GATE_LETTER[this.en];
		return text;
	}

	var SuperMoveEquals = Model.Move.Equals;
	Model.Move.Equals = function(move) {
		// Deux coups identiques dont l'un fait entrer une pièce ne sont PAS le
		// même coup : sans cela, rejouer une partie choisirait le premier des
		// deux et l'entrée se perdrait.
		return SuperMoveEquals.apply(this,arguments) && this.en === move.en;
	}

	var SuperMoveCopyFrom = Model.Move.CopyFrom;
	Model.Move.CopyFrom = function(move) {
		SuperMoveCopyFrom.apply(this,arguments);
		if(move.en === undefined) delete this.en;
		else this.en = move.en;
	}

})();
