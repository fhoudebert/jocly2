/*
 * Seirawan++ : les échecs orthodoxes, plus deux pièces féériques qui
 * attendent hors du plateau et entrent au premier mouvement d'une pièce de la
 * rangée arrière.
 *
 * Outre la découverte de la variante, l’intérêt est de se familiariser avec de nouvelles pièces féériques du répertoire. On joue sur un échiquier ordinaire, avec des règles ordinaires, et l'on apprend deux pièces importantes de variantes de jocly. La paire est donc une DONNÉE (voir PAIRS) et non du code : un
 * prélude la choisira, et chaque paire renvoie à la variante d'où elle vient —
 * l'éléphant et le canon du shako, le kirin et le phénix du chu shogi.
 *
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
 * ── Le roque ─────────────────────────────────────────────────────────────────
 *
 * C'est le seul coup qui libère DEUX cases, celle du roi et celle de la tour,
 * et le S-Chess laisse entrer sur l'une ou l'autre. C'est aussi le seul qui
 * offre un choix de case : d'où le champ `et`, inutile partout ailleurs où la
 * pièce se pose sur la case quittée.
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
	/*
	 * DIX COLONNES : les huit de l'échiquier, plus deux d'attente à droite.
	 *
	 * Le crazyhouse en réserve QUATRE -- deux de chaque côté -- parce qu'il a
	 * deux mains à montrer, une par joueur, et qu'elles se remplissent. Ici
	 * rien ne se parachute : deux cases par camp suffisent, et elles ne
	 * bougent jamais. Les deux colonnes de gauche n'auraient rien à contenir
	 * et poussaient l'échiquier hors du centre.
	 */
	var GRID = 10;                          // 8 colonnes de jeu + 2 d'attente
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
	/*
	 * Les colonnes d'attente sont à DROITE, après l'échiquier : rien à
	 * réserver à gauche, donc rien à décaler.
	 */
	geometry.handWidth = 0; geometry.handHeight = 0;

	// Les colonnes d'attente venant APRÈS l'échiquier, la colonne `a` est bien
	// la première : le nommage du socle convient tel quel, et la correction
	// qu'imposaient deux colonnes à gauche n'a plus lieu d'être.

	var AREA = {};
	for(var r=0;r<8;r++)
		for(var f=0;f<8;f++)
			AREA[(r*GRID + f).toString()] = 1;

	/** La case du fichier `f` (0 = a) sur la rangée `r` (0 = rangée 1). */
	function POS(f,r) { return r*GRID + f; }

	/** Une case d'attente : hors de la zone de jeu, à droite de l'échiquier. */
	function GATE(n,r) { return r*GRID + 8 + n; }

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
		/*
		 * Chaque paire renvoie à la variante d'où elle vient : reconnaître un
		 * cardinal ici doit rendre le Capablanca lisible ensuite, un rhinocéros
		 * le Fantastic XIII, un canon le Shako.
		 *
		 * `fen` est la lettre de la pièce EN ATTENTE, et c'est elle que le
		 * prélude écrit dans sa chaîne d'arrangement : une lettre par pièce,
		 * distincte des orthodoxes (P N B R Q K) et de l'autre pièce de la
		 * paire. Les graphes et les apparences sont ceux de
		 * fairy-piece-model.js et fairy-set-view.js -- on ne recrée pas une
		 * pièce qui existe déjà ailleurs dans chessbase.
		 */
		"marshall-cardinal": [
			{ name:'cardinal', fen:'C', aspect:'fr-cardinal', value:7,
			  graph: function(g,self) { return self.cbCardinalGraph(g,AREA); } },
			{ name:'marshall', fen:'M', aspect:'fr-proper-marshall', value:9,
			  graph: function(g,self) { return self.cbMarshallGraph(g,AREA); } },
		],
		// Fantastic XIII
		"rhino-griffon": [
			{ name:'rhino', fen:'U', aspect:'fr-rhino2', value:7.8,
			  graph: function(g,self) { return self.cbRhinoGraph(g,AREA); } },
			{ name:'griffon', fen:'G', aspect:'fr-griffon', value:8.3,
			  graph: function(g,self) { return self.cbGriffonGraph(g,AREA); } },
		],
		// Shako
		"elephant-cannon": [
			{ name:'elephant', fen:'E', aspect:'fr-proper-elephant', value:3.35,
			  graph: function(g,self) { return self.cbElephantGraph(g,AREA); } },
			{ name:'cannon', fen:'X', aspect:'fr-cannon', value:3,
			  graph: function(g,self) { return self.cbXQCannonGraph(g,AREA); } },
		],
		/*
		 * Timurid. Le navire prendrait « X » dans son jeu d'origine, mais
		 * cette lettre est ici celle du canon du Shako : il reçoit « V ».
		 *
		 * Les lettres n'ont de sens QUE dans cette variante -- une seule table
		 * de types les contient toutes -- et rien n'oblige à retrouver celles
		 * des jeux d'origine. Ce qui doit rester fidèle, c'est le mouvement et
		 * l'apparence : c'est par eux qu'on reconnaîtra la pièce ailleurs.
		 */
		"timurid": [
			{ name:'ship', fen:'V', aspect:'fr-ship', value:5,
			  graph: function(g,self) { return self.cbShipGraph(g,AREA); } },
			{ name:'snake', fen:'S', aspect:'fr-cobra', value:3.7,
			  graph: function(g,self) { return self.cbSnakeGraph(g,AREA); } },
		],
		/*
		 * Patchanka. Le blaireau y porte « B » et le bélier « R », pris ici
		 * par le fou et la tour : ils reçoivent « A » et « L ».
		 */
		"patchanka": [
			{ name:'badger', fen:'A', aspect:'fr-badger', value:5.3,
			  graph: function(g,self) { return self.cbSymmetricGraph(g,[-11,20],AREA); } },
			{ name:'ram', fen:'L', aspect:'fr-ram', value:6.3,
			  graph: function(g,self) { return self.cbSymmetricGraph(g,[-10,22],AREA); } },
		],
		/*
		 * Fantastic XIII. Le faucon y porte « H », pris par le phénix du chu
		 * shogi, et le mammouth « M », pris par le marshall : « F » et « W ».
		 */
		"fantastic": [
			{ name:'hawk', fen:'F', aspect:'fr-hawk', value:5.5,
			  graph: function(g,self) { return self.cbShortRangeGraph(g,[
				[-3,3],[-2,2],[0,2],[2,2],[3,3],[0,3],
				[-2,0],[-3,0],[2,0],[3,0],[0,-2],[0,-3],
				[2,-2],[3,-3],[-2,-2],[-3,-3]],AREA); } },
			{ name:'mammoth', fen:'W', aspect:'fr-mammoth', value:6.2,
			  graph: function(g,self) { return self.cbMergeGraphs(g,
				self.cbKingGraph(g,AREA),
				self.cbShortRangeGraph(g,[
					[-2,-2],[0,-2],[-2,2],[0,2],[2,2],[2,0],
					[-2,0],[2,-2]],AREA)); } },
		],
		/*
		 * Évêque couronné et marquis (Scirocco).
		 *
		 * Le calife occupait cette place, avec le mouvement du cardinal -- fou
		 * plus cavalier -- ce qui en faisait un doublon. C'était d'ailleurs une
		 * erreur : le calife combine le chameau et le fou, et le chameau saute
		 * trop loin pour un plateau de huit cases.
		 *
		 * Le marquis apporte un mouvement qu'aucune autre paire ne propose :
		 * cavalier plus ferz.
		 *
		 * Il porte « Ma » dans le Scirocco ; ici une seule lettre par pièce,
		 * l'arrangement du prélude en lisant une par case. « Z » lui revient.
		 */
		"crowned-bishop": [
			{ name:'missionnary', fen:'Y', aspect:'fr-crowned-bishop', value:6,
			  // Wazir + fou, et non roi + fou : les deux graphes offraient
			  // chacun le pas diagonal, et chaque case voisine en diagonale
			  // sortait DEUX fois de la génération. Même écriture que le
			  // dragon-horse de fairy-piece-model.js.
			  graph: function(g,self) { return self.cbSymmetricGraph(g,[-11,10],AREA); } },
			{ name:'marquis', fen:'Z', aspect:'fr-ferz-knight', value:5,
			  graph: function(g,self) { return self.cbMergeGraphs(g,
				self.cbKnightGraph(g,AREA),
				self.cbShortRangeGraph(g,[[1,1],[1,-1],[-1,1],[-1,-1]],AREA)); } },
		],
		// Chu shogi
		"chu": [
			{ name:'phoenix', fen:'H', aspect:'fr-phoenix', value:2.9,
			  graph: function(g,self) { return self.cbSymmetricGraph(g,[10,22],AREA); } },
			// Même pièce, même icône que le kirin du Minjiku shogi.
			{ name:'kirin', fen:'I', aspect:'fr-giraffe', value:3.1,
			  graph: function(g,self) { return self.cbSymmetricGraph(g,[11,20],AREA); } },
		],
		/*
		 * Spartan. Deux lettres changent par rapport au jeu d'origine : la
		 * tour couronnée y porte « G », déjà pris ici par le griffon, et la
		 * machine « W », pris par le marshall du Khan.
		 *
		 * Les lettres doivent être uniques dans CETTE variante, puisqu'une
		 * seule table de types les contient toutes : deux pièces partageant
		 * une lettre rendraient l'arrangement du prélude ambigu, et le FEN
		 * illisible.
		 */
		"spartan": [
			{ name:'crowned-rook', fen:'T', aspect:'fr-crowned-rook', value:7,
			  graph: function(g,self) { return self.cbMergeGraphs(g,
				self.cbRookGraph(g,AREA),
				self.cbShortRangeGraph(g,[[1,1],[-1,1],[1,-1],[-1,-1]],AREA)); } },
			{ name:'machine', fen:'D', aspect:'fr-machine', value:3,
			  graph: function(g,self) { return self.cbShortRangeGraph(g,
				[[-1,0],[-2,0],[1,0],[2,0],[0,1],[0,2],[0,-1],[0,-2]],AREA); } },
		],
		// Khan
		"khan": [
			{ name:'crowned-knight', fen:'J', aspect:'fr-crowned-knight', value:8,
			  graph: function(g,self) { return self.cbSymmetricGraph(g,[10,11,21],AREA); } },
			/*
			 * LE MÊME MARSHALL QUE LA PREMIÈRE PAIRE, pas un second.
			 *
			 * Une paire peut REPRENDRE une pièce déjà déclarée : `same` dit
			 * laquelle, et aucun type n'est créé. Deux marshalls auraient
			 * demandé deux lettres, deux entrées dans la table, et se
			 * seraient dessinés pareil -- un joueur qui les rencontre dans
			 * deux arrangements doit reconnaître LA MÊME pièce, c'est tout
			 * l'objet de ce jeu.
			 */
			{ same:'marshall' },
		],
	};

	// L'ordre des paires : celui du panneau, et celui des numéros d'arrangement
	// que le prélude enregistre. Il ne doit donc plus changer une fois des
	// parties sauvegardées — un arrangement est désigné par son rang.
	var PAIR_KEYS = ["marshall-cardinal", "rhino-griffon", "elephant-cannon", "khan",
		"chu", "spartan", "timurid", "patchanka", "fantastic", "crowned-bishop"];

	/*
	 * TOUTES LES PAIRES SONT DÉCLARÉES, pas seulement celle qui commence.
	 *
	 * Le prélude ne crée pas de pièces : il RETYPE celles qui attendent aux
	 * portes, en lisant une chaîne d'abréviations. Les vingt types doivent donc
	 * exister dès la définition de la variante, et seul le placement initial
	 * désigne la paire par défaut.
	 *
	 * Types 0-8 : les échecs orthodoxes. Puis, pour chaque paire, ses deux
	 * pièces de jeu suivies de leurs deux formes en attente.
	 */
	var FIRST_PAIR_TYPE = 9;
	var ENTERS = {};          // forme en attente -> forme de jeu
	var ABBREV = {};          // type -> lettre, pour la notation
	var GATE_OF = {};         // type en attente -> rang dans sa paire (0 ou 1)
	var SETUPS = [];          // chaîne d'abréviations, une par arrangement
	var TYPE_PAIR = {};       // type (jeu ou attente) -> rang de sa paire
	var PAIR_PLAY = [];       // rang de la paire -> ses deux types de jeu

	/**
	 * Les deux pièces que CETTE partie fait découvrir.
	 *
	 * Lues du plateau plutôt que d'un réglage retenu : le prélude retype les
	 * pièces en attente, et rien d'autre n'enregistre le choix. Une pièce de la
	 * paire suffit à la reconnaître, qu'elle attende encore à sa porte ou
	 * qu'elle soit déjà entrée en jeu.
	 *
	 * Faute d'en trouver une -- les quatre prises, ce qui est rare mais
	 * possible -- on rend la première paire. Un choix de promotion inhabituel
	 * vaut mieux qu'une erreur, et à ce stade plus aucune de ces pièces n'est
	 * en jeu de toute façon.
	 */
	function pairInPlay(board) {
		for(var i=0;i<board.pieces.length;i++) {
			var piece = board.pieces[i];
			if(!piece || piece.s === 0) continue;
			var rank = TYPE_PAIR[piece.t];
			if(rank !== undefined) return PAIR_PLAY[rank];
		}
		return PAIR_PLAY[0];
	}

	// La table des types, retenue à la définition : la notation du moteur en
	// a besoin pour écrire une promotion, et un coup ne connaît pas sa partie.
	var cbTypes = null;

	function pairTypes(index) {
		var base = FIRST_PAIR_TYPE + index * 4;
		return { play: [base, base+1], gate: [base+2, base+3] };
	}
	Model.Game.cbDefine = function() {
		var self = this;
		var empty = this.cbEmptyGraph(geometry);

		var variant = {
			geometry: geometry,

			pieceTypes: {
				/*
				 * TOUTES LES APPARENCES SONT PRÉFIXÉES `fr-`.
				 *
				 * fairy-set-view définit son propre jeu de pièces, orthodoxes
				 * comprises : `fr-pawn`, `fr-knight`… Les noms classiques
				 * (`pawn`, `knight`) n'y existent pas, et une pièce dont
				 * l'apparence est inconnue retombe sur son NOM — d'où des
				 * pièces dessinées n'importe comment, seules les `fr-*` étant
				 * correctes. Bigorra, qui emploie le même ensemble avec de
				 * nombreuses pièces féeriques, préfixe tout de la même façon.
				 */
				0: { name:'pawn-w', aspect:'fr-pawn', graph:this.cbPawnGraph(geometry,1,AREA),
				     value:1, abbrev:'', fenAbbrev:'P', epCatch:true },
				1: { name:'ipawn-w', aspect:'fr-pawn', graph:this.cbInitialPawnGraph(geometry,1,AREA),
				     value:1, abbrev:'', fenAbbrev:'P', epTarget:true, epCatch:true,
				     initial:[{s:1,p:POS(0,1)},{s:1,p:POS(1,1)},{s:1,p:POS(2,1)},{s:1,p:POS(3,1)},
				              {s:1,p:POS(4,1)},{s:1,p:POS(5,1)},{s:1,p:POS(6,1)},{s:1,p:POS(7,1)}] },
				2: { name:'pawn-b', aspect:'fr-pawn', graph:this.cbPawnGraph(geometry,-1,AREA),
				     value:1, abbrev:'', fenAbbrev:'P', epCatch:true },
				3: { name:'ipawn-b', aspect:'fr-pawn', graph:this.cbInitialPawnGraph(geometry,-1,AREA),
				     value:1, abbrev:'', fenAbbrev:'P', epTarget:true, epCatch:true,
				     initial:[{s:-1,p:POS(0,6)},{s:-1,p:POS(1,6)},{s:-1,p:POS(2,6)},{s:-1,p:POS(3,6)},
				              {s:-1,p:POS(4,6)},{s:-1,p:POS(5,6)},{s:-1,p:POS(6,6)},{s:-1,p:POS(7,6)}] },

				4: { name:'knight', aspect:'fr-knight', graph:this.cbKnightGraph(geometry,AREA), value:2.9, abbrev:'N',
				     initial:[{s:1,p:POS(1,WHITE_HOME)},{s:1,p:POS(6,WHITE_HOME)},
				              {s:-1,p:POS(1,BLACK_HOME)},{s:-1,p:POS(6,BLACK_HOME)}] },
				5: { name:'bishop', aspect:'fr-bishop', graph:this.cbBishopGraph(geometry,AREA), value:3.05, abbrev:'B',
				     initial:[{s:1,p:POS(2,WHITE_HOME)},{s:1,p:POS(5,WHITE_HOME)},
				              {s:-1,p:POS(2,BLACK_HOME)},{s:-1,p:POS(5,BLACK_HOME)}] },
				6: { name:'rook', aspect:'fr-rook', graph:this.cbRookGraph(geometry,AREA), value:4.95, abbrev:'R', castle:true,
				     initial:[{s:1,p:POS(0,WHITE_HOME)},{s:1,p:POS(7,WHITE_HOME)},
				              {s:-1,p:POS(0,BLACK_HOME)},{s:-1,p:POS(7,BLACK_HOME)}] },
				7: { name:'queen', aspect:'fr-queen', graph:this.cbQueenGraph(geometry,AREA), value:9.15, abbrev:'Q',
				     initial:[{s:1,p:POS(3,WHITE_HOME)},{s:-1,p:POS(3,BLACK_HOME)}] },
				8: { name:'king', aspect:'fr-king', graph:this.cbKingGraph(geometry,AREA), isKing:true, abbrev:'K',
				     initial:[{s:1,p:POS(4,WHITE_HOME)},{s:-1,p:POS(4,BLACK_HOME)}] },

			},

			// Ordinaire : le socle attend un tableau, et l'entrée ne passe plus
			// par ici (voir GenerateMoves).
			/*
			 * LA PROMOTION OFFRE LA PAIRE EN JEU, pas une paire figée.
			 *
			 * Elle nommait CARDINAL et MARSHALL, les deux types de la première
			 * paire -- écrits en dur avant que le prélude n'existe. Depuis, ces
			 * deux constantes ont disparu avec la table de types engendrée :
			 * un pion atteignant la dernière rangée levait une ReferenceError,
			 * et la partie s'arrêtait là.
			 *
			 * Un pion promu doit pouvoir devenir l'une des deux pièces que
			 * cette partie fait découvrir -- c'est tout l'objet du jeu -- et
			 * elles dépendent de l'arrangement choisi.
			 */
			promote: function(aGame,piece,move) {
				if(piece.t==1) return [0];
				if(piece.t==3) return [2];
				var last = piece.t==0 ? BLACK_HOME : piece.t==2 ? WHITE_HOME : -1;
				if(last < 0 || geometry.R(move.t) != last) return [];
				return [4,5,6,7].concat(pairInPlay(this));
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

			/*
			 * LE PRÉLUDE : quelle paire de pièces on veut découvrir.
			 *
			 * Il ne crée rien. Il RETYPE les pièces posées sur les deux cases
			 * d'attente de chaque camp, en lisant une chaîne d'abréviations --
			 * une lettre par case, dans l'ordre de `squares`. C'est pourquoi
			 * les vingt types doivent exister avant lui.
			 *
			 * `panelWidth: 2` donne deux colonnes, comme au Timurid.
			 * `persistent` garde le choix d'une partie à la suivante : on
			 * explore une paire sur plusieurs parties, pas sur un coup.
			 *
			 * L'ordre des arrangements est celui de PAIR_KEYS, et un
			 * arrangement est désigné par son RANG dans une partie
			 * sauvegardée : insérer une paire ailleurs qu'à la fin
			 * relirait les anciennes parties avec les mauvaises pièces.
			 */
			prelude: [{
				// Deux colonnes : dix arrangements y forment cinq rangées de
				// deux, une paire par ligne. Sur trois colonnes, la dernière
				// rangée restait incomplète et les paires se lisaient moins
				// bien.
				panelWidth: 2,
				// En minuscules : ce sont les formes EN ATTENTE que le prélude
				// pose aux portes, pas les pièces de jeu.
				// Rempli à la déclaration des types, une fois les reprises
				// résolues : une paire qui emprunte une pièce à une autre doit
				// écrire LA LETTRE DE CELLE-CI, pas une nouvelle.
				setups: SETUPS,
				squares: {
					1:  [GATE(0,WHITE_HOME), GATE(1,WHITE_HOME)],
					'-1':[GATE(0,BLACK_HOME), GATE(1,BLACK_HOME)],
				},
				persistent: true,
			}, 0],
		};

		/*
		 * Les vingt types des paires, engendrés ici plutôt qu'écrits à la
		 * main : quatre lignes de données par paire suffisent alors à en
		 * ajouter une, ce qui est tout l'objet du prélude.
		 *
		 * Seule la PREMIÈRE paire est posée aux portes. Le prélude retypera
		 * ces mêmes pièces selon l'arrangement choisi ; il n'en crée aucune.
		 */
		/*
		 * Les types déjà déclarés, par nom : une paire qui reprend une pièce
		 * d'une paire précédente y pointe au lieu d'en créer une seconde.
		 */
		var byName = {};

		PAIR_KEYS.forEach(function(key, index) {
			var pair = PAIRS[key], t = pairTypes(index);
			pair.forEach(function(piece, rank) {
				if(piece.same !== undefined) {
					// Reprise : les deux types existent déjà, on ne fait que
					// les désigner pour cet arrangement.
					var reused = byName[piece.same];
					t.play[rank] = reused.play;
					t.gate[rank] = reused.gate;
					return;
				}
				variant.pieceTypes[t.play[rank]] = {
					name: piece.name, aspect: piece.aspect, value: piece.value,
					abbrev: piece.fen, graph: piece.graph(geometry, self),
				};
				/*
				 * La forme en attente : même apparence, GRAPHE VIDE. Elle ne
				 * joue pas ; elle entre. Sa valeur est celle de la pièce
				 * qu'elle deviendra — l'évaluation doit voir qu'un camp qui a
				 * encore ses deux pièces en porte n'est pas en retard de
				 * matériel.
				 *
				 * Son abréviation FEN porte un « ! » pour la distinguer de la
				 * forme de jeu, qui partage sa lettre.
				 */
				/*
				 * SON ABRÉVIATION EST EN MINUSCULE, et c'est ce qui la rend
				 * désignable sans ambiguïté.
				 *
				 * Le prélude cherche le type dont `abbrev` vaut la lettre de
				 * l'arrangement, et il prend LE PREMIER pour les blancs, LE
				 * DERNIER pour les noirs -- une convention faite pour les
				 * variantes asymétriques. Forme de jeu et forme en attente
				 * partageant la même lettre, les blancs recevaient la pièce
				 * JOUANTE et les noirs celle en attente : un camp se
				 * retrouvait sans entrée possible, l'autre non.
				 *
				 * Une lettre propre lève l'ambiguïté. Elle ne sert qu'ici :
				 * une pièce en attente ne se déplace jamais, donc son
				 * abréviation n'apparaît dans aucune notation, et le FEN garde
				 * la sienne avec son « ! ».
				 */
				variant.pieceTypes[t.gate[rank]] = {
					name: 'gate-' + piece.name, aspect: piece.aspect, value: piece.value,
					abbrev: piece.fen.toLowerCase(), fenAbbrev: piece.fen + '!', graph: empty,
					initial: index === 0
						? [{s:1,p:GATE(rank,WHITE_HOME)},{s:-1,p:GATE(rank,BLACK_HOME)}]
						: [],
				};
				ENTERS[t.gate[rank]] = t.play[rank];
				ABBREV[t.play[rank]] = piece.fen;
				ABBREV[t.gate[rank]] = piece.fen;
				GATE_OF[t.gate[rank]] = rank;
				byName[piece.name] = { play: t.play[rank], gate: t.gate[rank] };
			});
			PAIR_PLAY[index] = [t.play[0], t.play[1]];
			t.play.concat(t.gate).forEach(function(type) {
				// Une pièce partagée appartient à sa paire d'ORIGINE : le
				// marshall du Khan est celui de la première paire, et c'est
				// elle qu'il désigne. Sans ce garde, la dernière paire qui
				// l'emprunte l'emporterait.
				if(TYPE_PAIR[type] === undefined) TYPE_PAIR[type] = index;
			});

			// La chaîne de l'arrangement, une fois les reprises résolues.
			SETUPS[index] = pair.map(function(piece, rank) {
				return ABBREV[t.gate[rank]].toLowerCase();
			}).join("");
		});

		cbTypes = variant.pieceTypes;
		return variant;
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
			/*
			 * AU ROQUE, DEUX CASES SE LIBÈRENT -- celle du roi et celle de la
			 * tour -- et le S-Chess laisse entrer sur l'une ou l'autre. C'est
			 * le seul coup qui offre un choix de case, d'où le champ `et` :
			 * ailleurs la pièce se pose sur la case quittée, ici il faut dire
			 * laquelle.
			 */
			var targets = move.cg !== undefined ? [move.f, move.cg] : [move.f];
			var offered = false;
			for(var k=0;k<targets.length;k++) {
				if(!this.entranceSquares[targets[k]]) continue;
				for(var g=0;g<gates.length;g++) {
					if(this.cbGatePiece(aGame,gates[g],this.mWho) < 0) continue;
					var variant = aGame.CreateMove(move);
					variant.en = gates[g];
					variant.et = targets[k];
					/*
					 * LE TYPE DE LA PIÈCE QUI ENTRE, porté par le coup.
					 *
					 * La vue a besoin de le connaître pour dessiner la case du
					 * panneau de choix, et elle le reconstruisait du manifeste
					 * -- en cherchant quelle pièce commence sur quelle case
					 * d'attente. Cette reconstruction dépendait de données qui
					 * ne lui parviennent pas toujours, et elle échouait en
					 * silence : le panneau s'ouvrait sans les deux pièces.
					 *
					 * Le modèle, lui, le sait de source sûre. Il le dit.
					 */
					var waiting = this.board[gates[g]];
					variant.ei = ENTERS[this.pieces[waiting].t];
					/*
					 * `pr` EST CE QUI REND LA CASE CLIQUABLE.
					 *
					 * Le panneau du socle est indexé par le type de promotion :
					 * il ne retient que les coups qui ont un `pr`, et la cible
					 * du clic s'appelle « promo#<pr> ». Un coup sans `pr`
					 * n'entre pas dans la table des actions -- les pièces se
					 * dessinaient, mais les clics écoutaient des cibles
					 * inexistantes.
					 *
					 * On lui en donne un, et ApplyMove le neutralise quand une
					 * entrée l'accompagne : le cavalier ne devient pas
					 * cardinal, c'est la pièce en attente qui entre. Voir la
					 * surcharge plus bas.
					 */
					variant.pr = variant.ei;
					extra.push(variant);
					offered = true;
				}
			}
			/*
			 * LE COUP SANS ENTRÉE DOIT ÊTRE CLIQUABLE LUI AUSSI -- c'est le
			 * choix « je déplace seulement ma pièce ». Il lui faut donc un
			 * `pr`, et le seul qui ne change rien est LE SIEN : ApplyMove fait
			 * `piece.t = move.pr`, ce qui est alors sans effet.
			 */
			if(offered && move.pr === undefined) {
				var mover = this.pieces[this.board[move.f]];
				if(mover) { move.pr = mover.t; move.pn = 1; }
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
	/*
	 * `pr` NE VAUT PAS PROMOTION QUAND UNE ENTRÉE L'ACCOMPAGNE.
	 *
	 * Il n'est là que pour rendre la case du panneau cliquable : le socle
	 * indexe ses actions par le type de promotion. Mais son ApplyMove ferait
	 * `piece.t = move.pr`, et le cavalier deviendrait cardinal. On le retire
	 * donc le temps de l'application, et on le remet ensuite -- le coup est
	 * conservé, rejoué, comparé avec lui.
	 */
	function withoutPromo(move, body) {
		if(move.en === undefined || move.pr === undefined) return body();
		var kept = move.pr;
		delete move.pr;
		try { return body(); }
		finally { move.pr = kept; }
	}

	var SuperQuickApply = Model.Board.cbQuickApply;
	Model.Board.cbQuickApply = function(aGame,move) {
		var $this = this, args = arguments;
		var undo = withoutPromo(move, function() { return SuperQuickApply.apply($this,args); });
		if(move.en === undefined) return undo;
		var index = this.board[move.en];
		if(index < 0) return undo;
		var into = entranceTarget(move);
		// La case doit être libre APRÈS le coup principal. Au roque, le roi et
		// la tour changent de case : si l'un d'eux retombait sur une case de
		// départ, il n'y aurait plus de place pour la pièce entrante.
		if(this.board[into] >= 0) return undo;
		var piece = this.pieces[index];
		undo.unshift({ i:index, f:into, t:move.en, ty:piece.t });
		this.board[move.en] = -1;
		piece.p = into;
		piece.t = ENTERS[piece.t];
		this.board[into] = index;
		return undo;
	}

	/** La case où la pièce entrante se pose : celle que `et` désigne au roque,
	 *  sinon celle que la pièce déplacée vient de quitter. */
	function entranceTarget(move) {
		return move.et === undefined ? move.f : move.et;
	}

	var SuperApplyMove = Model.Board.ApplyMove;
	Model.Board.ApplyMove = function(aGame,move) {
		var entering = move.en === undefined ? -1 : this.board[move.en];
		var $this = this, args = arguments;
		withoutPromo(move, function() { SuperApplyMove.apply($this,args); });

		// La case se ferme dès qu'elle est quittée, entrée ou non. Au roque
		// DEUX pièces bougent : les deux cases se ferment, sans quoi la tour
		// pourrait faire entrer une pièce longtemps après avoir roqué.
		if(this.entranceSquares[move.f])
			this.entranceSquares[move.f] = false;
		if(move.cg !== undefined && this.entranceSquares[move.cg])
			this.entranceSquares[move.cg] = false;
		/*
		 * Une pièce PRISE sur sa case de départ n'a jamais bougé, mais la case
		 * ne fait plus rien entrer : c'est la règle du S-Chess, et celle de
		 * Fairy-Stockfish. Sans cela, la pièce adverse qui l'a prise faisait
		 * entrer SA pièce en attente dans le camp adverse en repartant, et
		 * une pièce qui reprenait sur la case héritait d'un droit d'entrée.
		 */
		// Seulement sur une PRISE : les coups du prélude n'ont pas de vraie
		// case d'arrivée (t vaut 0, soit a1), et fermaient a1 à tort.
		var landed = move.t & 0xffff;
		if(move.c != null && this.entranceSquares[landed])
			this.entranceSquares[landed] = false;

		if(entering < 0) return;
		var into = entranceTarget(move);
		if(this.board[into] >= 0) return;
		var piece = this.pieces[entering];
		this.zSign ^= aGame.bKey(piece);
		this.zSign ^= aGame.tKey(piece);
		this.board[move.en] = -1;
		piece.p = into;
		piece.t = ENTERS[piece.t];
		piece.r = aGame.g.pTypes[piece.t].ranking;
		this.board[into] = entering;
		this.zSign ^= aGame.tKey(piece);
		this.zSign ^= aGame.bKey(piece);
	}

	/* ─── Le niveau Expert : la position telle que Fairy-Stockfish la lit ──── */

	/*
	 * LE FEN DU S-CHESS, pas celui d'ExportBoardState.
	 *
	 * ExportBoardState décrit la grille interne : dix colonnes, et les pièces
	 * en attente écrites « C! ». C'est ce qu'il faut pour sauvegarder une
	 * partie, pas pour la confier au moteur, qui attend la notation du
	 * S-Chess :
	 *
	 *   rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[CMcm] w KQBCDFGkqbcdfg - 0 1
	 *
	 *   - l'échiquier 8x8 seul, et les pièces en attente EN POCHE ;
	 *   - dans le champ du roque, les droits de roque PUIS les cases encore
	 *     ouvertes à l'entrée, une lettre de colonne chacune.
	 *
	 * jocly.fairy.js appelle cette méthode quand le modèle la fournit.
	 *
	 * Trois règles de ce champ, toutes vérifiées contre le moteur embarqué
	 * (tests/fairy/seirawan-perft.test.js) :
	 *
	 *   1. Les droits de roque sont RECALCULÉS depuis les pièces (roi et tour
	 *      qui n'ont pas bougé). Le champ d'ExportBoardState annonçait un
	 *      petit roque dont la tour était partie ; le moteur le jouait alors
	 *      avec la tour qu'il trouvait sur l'aile.
	 *   2. Les colonnes e, a et h ne s'écrivent pas quand un droit de roque les
	 *      couvre déjà : K dit à la fois « roque » et « entrée possible en e1
	 *      et h1 ». C'est ainsi que le moteur les écrit.
	 *   3. Un camp dont les deux pièces sont entrées n'écrit PLUS aucune case.
	 *      Le moteur lit alors une lettre de colonne restante comme un droit
	 *      de roque (notation Shredder) : un « h » après le départ du roi en
	 *      f8 lui faisait jouer f8-h8.
	 */
	var KING = 8, ROOK = 6;

	Model.Board.ExportFairyFen = function(aGame) {
		var $this = this;
		var types = aGame.cbVar.pieceTypes;

		function pieceAt(f,r) {
			var index = $this.board[POS(f,r)];
			return index < 0 ? null : $this.pieces[index];
		}
		function letter(piece, abbrev) {
			return piece.s > 0 ? abbrev.toUpperCase() : abbrev.toLowerCase();
		}

		var rows = [];
		for(var r=7; r>=0; r--) {
			var row = "", empty = 0;
			for(var f=0; f<8; f++) {
				var piece = pieceAt(f,r);
				if(!piece) { empty++; continue; }
				if(empty) { row += empty; empty = 0; }
				var type = types[piece.t];
				row += letter(piece, type.fenAbbrev || type.abbrev);
			}
			if(empty) row += empty;
			rows.push(row);
		}

		// La poche : ce qui attend encore aux portes, dans l'ordre des portes.
		var pocket = "", waiting = { 1: 0, '-1': 0 };
		[1,-1].forEach(function(who) {
			gatesOf(who).forEach(function(gate) {
				var index = $this.cbGatePiece(aGame, gate, who);
				if(index < 0) return;
				pocket += letter($this.pieces[index], ABBREV[$this.pieces[index].t]);
				waiting[who]++;
			});
		});

		function unmoved(f,r,t,who) {
			var piece = pieceAt(f,r);
			return !!piece && piece.t === t && piece.s === who && !piece.m;
		}
		function rights(who, home) {
			var up = who > 0 ? "KQ" : "kq", out = "";
			if(!unmoved(4,home,KING,who)) return out;
			if(unmoved(7,home,ROOK,who)) out += up[0];
			if(unmoved(0,home,ROOK,who)) out += up[1];
			return out;
		}
		function gates(who, home, castling) {
			var out = "";
			if(!waiting[who]) return out;                       // règle 3
			for(var f=0; f<8; f++) {
				if(!$this.entranceSquares[POS(f,home)]) continue;
				var piece = pieceAt(f,home);
				if(!piece || piece.s !== who) continue;
				// règle 2
				if(f === 4 && castling.length) continue;
				if(f === 7 && castling.indexOf(who > 0 ? "K" : "k") >= 0) continue;
				if(f === 0 && castling.indexOf(who > 0 ? "Q" : "q") >= 0) continue;
				var file = String.fromCharCode(97 + f);
				out += who > 0 ? file.toUpperCase() : file;
			}
			return out;
		}
		var white = rights(1, WHITE_HOME), black = rights(-1, BLACK_HOME);
		var field = white + gates(1, WHITE_HOME, white) + black + gates(-1, BLACK_HOME, black);

		// Prise en passant et compteurs : ceux du FEN ordinaire. Les colonnes
		// d'attente étant à DROITE, la case de passage garde son nom.
		var std = this.ExportBoardState(aGame).split(" ");
		return rows.join("/") + "[" + pocket + "] " + (this.mWho > 0 ? "w" : "b") + " "
			+ (field || "-") + " " + (std[3] || "-") + " " + (std[4] || "0") + " " + (std[5] || "1");
	}

	/* ─── Le coup se lit ────────────────────────────────────────────────────── */

	var SuperMoveToString = Model.Move.ToString;
	Model.Move.ToString = function(format) {
		if(format === "engine")
			return engineFormat(this);
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
		/*
		 * `pr` n'annonce PAS une promotion ici : il sert à rendre la case du
		 * panneau cliquable. Le socle écrit pourtant « =N » ou « =C », ce qui
		 * ferait lire « Nb1-c3=N » -- un cavalier promu en cavalier. On
		 * l'enlève, dans les deux cas : le coup simple (`pn`) et les entrées.
		 */
		if(this.pn !== undefined)
			text = text.replace(/=[A-Z]$/, "");
		if(this.en !== undefined) {
			text = text.replace(/=[A-Z]$/, "");
			// La lettre de la pièce qui entre, lue de son type : elle dépend
			// de l'arrangement choisi au prélude, donc une table figée des
			// portes ne conviendrait plus.
			text += "/" + (ABBREV[this.ei] || "?");
			// Au roque seulement, la case : « O-O » ne dit pas laquelle des
			// deux cases libérées la pièce occupe, et deux roques qui ne
			// diffèrent que par là s'écriraient pareil.
			if(this.cg !== undefined)
				text += geometry.PosName(entranceTarget(this));
		}
		return text;
	}

	/*
	 * LA NOTATION DU MOTEUR, celle de Fairy-Stockfish pour le S-Chess.
	 *
	 *   b1c3    le cavalier seul : PAS de lettre. Le `pr` que porte ce coup ne
	 *           sert qu'au panneau (voir GenerateMoves) ; le socle l'écrivait,
	 *           « b1c3N », et aucun coup du moteur ne lui correspondait.
	 *   b1c3c   le cavalier part, le cardinal entre : la lettre de la pièce
	 *           ENTRANTE, en minuscule.
	 *   e1g1c   roque, entrée sur la case du ROI ;
	 *   h1e1c   roque, entrée sur la case de la TOUR : le moteur l'écrit
	 *           depuis la tour vers le roi, seul moyen de distinguer les deux.
	 *   e7e8q   promotion : la lettre de la pièce obtenue.
	 *
	 * Tout passe par ResolveMove() de jocly.fairy.js, qui cherche d'abord une
	 * correspondance EXACTE : une notation approchée y serait rattrapée par la
	 * distance d'édition, mais au prix d'un avertissement par coup et d'un
	 * mauvais choix possible.
	 */
	function engineFormat(move) {
		var name = function(pos) { return geometry.PosName(pos); };
		var text = name(move.f) + name(move.t & 0xffff);
		if(move.en !== undefined) {
			if(move.cg !== undefined && entranceTarget(move) === move.cg)
				text = name(move.cg) + name(move.f);
			return text + (ABBREV[move.ei] || "?").toLowerCase();
		}
		if(move.pr !== undefined && move.pn === undefined) {
			var type = cbTypes && cbTypes[move.pr];
			if(type && type.abbrev) text += type.abbrev.toLowerCase();
		}
		return text;
	}

	var SuperMoveEquals = Model.Move.Equals;
	Model.Move.Equals = function(move) {
		// Deux coups identiques dont l'un fait entrer une pièce ne sont PAS le
		// même coup : sans cela, rejouer une partie choisirait le premier des
		// deux et l'entrée se perdrait.
		return SuperMoveEquals.apply(this,arguments)
			&& this.en === move.en && this.et === move.et;
	}

	var SuperMoveCopyFrom = Model.Move.CopyFrom;
	Model.Move.CopyFrom = function(move) {
		SuperMoveCopyFrom.apply(this,arguments);
		if(move.en === undefined) delete this.en;
		else this.en = move.en;
		if(move.et === undefined) delete this.et;
		else this.et = move.et;
		// `ei` accompagne `en` : c'est la vue qui le lit, et un coup recopié
		// sans lui rouvrirait un panneau incomplet.
		if(move.ei === undefined) delete this.ei;
		else this.ei = move.ei;
		if(move.pn === undefined) delete this.pn;
		else this.pn = move.pn;
	}

})();
