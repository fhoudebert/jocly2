
(function() {

	// 4x4x4 cube. Walls close the four base edges where same-colour squares meet,
	// keeping the two pole panels (1 = White, 6 = Black) isolated from the side bases:
	//   great circle 1-3-6-4 (pawn corridor) and equator 2-3-5-4 stay open;
	//   panels 2 and 5 are the "front" side faces.
	var geometry = Model.Game.cbBoardGeometryCubic(4,4,4,["01","04","15","45"]);

	Model.Game.cbDefine = function() {

		return {

			geometry: geometry,

			pieceTypes: {

				0: {
					name: 'pawn-w', aspect: 'pawn',
					graph: this.cbCubicPawnGraph(geometry,1),
					value: 1, abbrev: '', fenAbbrev: 'P',
					epCatch: true,
				},
				1: {
					name: 'ipawn-w', aspect: 'pawn',
					graph: this.cbCubicInitialPawnGraph(geometry,1),
					value: 1, abbrev: '', fenAbbrev: 'P',
					// White home pawns: panel 1 rows A (0..3) and D (12..15)
					initial: [{s:1,p:0},{s:1,p:1},{s:1,p:2},{s:1,p:3},{s:1,p:12},{s:1,p:13},{s:1,p:14},{s:1,p:15}],
					epTarget: true,
				},
				2: {
					name: 'pawn-b', aspect: 'pawn',
					graph: this.cbCubicPawnGraph(geometry,-1),
					value: 1, abbrev: '', fenAbbrev: 'P',
					epCatch: true,
				},
				3: {
					name: 'ipawn-b', aspect: 'pawn',
					graph: this.cbCubicInitialPawnGraph(geometry,-1),
					value: 1, abbrev: '', fenAbbrev: 'P',
					// Black home pawns: panel 6 rows A (80..83) and D (92..95)
					initial: [{s:-1,p:80},{s:-1,p:81},{s:-1,p:82},{s:-1,p:83},{s:-1,p:92},{s:-1,p:93},{s:-1,p:94},{s:-1,p:95}],
					epTarget: true,
				},

				4: {
					name: 'knight',
					graph: this.cbCubicKnightGraph(geometry),
					value: 2.9, abbrev: 'N',
					// White row B col4 (7) & row C col1 (8); Black row B col1 (84) & row C col4 (91)
					initial: [{s:1,p:7},{s:1,p:8},{s:-1,p:84},{s:-1,p:91}],
				},
				5: {
					name: 'bishop',
					graph: this.cbCubicBishopGraph(geometry),
					value: 3.1, abbrev: 'B',
					// White B col3 (6) & C col3 (10); Black B col3 (86) & C col3 (90)
					initial: [{s:1,p:6},{s:1,p:10},{s:-1,p:86},{s:-1,p:90}],
				},
				6: {
					name: 'rook',
					graph: this.cbCubicRookGraph(geometry),
					value: 5, abbrev: 'R',
					// White B col1 (4) & C col4 (11); Black B col4 (87) & C col1 (88)
					initial: [{s:1,p:4},{s:1,p:11},{s:-1,p:87},{s:-1,p:88}],
					castle: true,
				},
				7: {
					name: 'queen',
					graph: this.cbCubicQueenGraph(geometry),
					value: 9, abbrev: 'Q',
					// White B col2 (5); Black C col2 (89)
					initial: [{s:1,p:5},{s:-1,p:89}],
				},
				8: {
					name: 'king',
					isKing: true,
					graph: this.cbCubicKingGraph(geometry),
					abbrev: 'K',
					// White C col2 (9) = 1C2 ; Black B col2 (85) = 6B2
					initial: [{s:1,p:9},{s:-1,p:85}],
				},

			},

			promote: function(aGame,piece,move) {
				if(piece.t==1) return [0];              // white initial pawn -> regular pawn
				if(piece.t==3) return [2];              // black initial pawn -> regular pawn
				var t = move.t & 0xffff;
				// promotion on rows B or C (R in {1,2}) of the opposing base panel
				if(piece.t==0 && geometry.P(t)==5 && (geometry.R(t)==1||geometry.R(t)==2)) return [4,5,6,7];
				if(piece.t==2 && geometry.P(t)==0 && (geometry.R(t)==1||geometry.R(t)==2)) return [4,5,6,7];
				return [];
			},

			// short-side castling only (official cube-chess rule)
			//  White: King 1C2(9) -> 1C4(11), Rook 1C4(11) -> 1C3(10)
			//  Black: King 6B2(85) -> 6B4(87), Rook 6B4(87) -> 6B3(86)
			castle: {
				"9/11":  { k:[10,11], r:[10], n:"O-O" },
				"85/87": { k:[86,87], r:[86], n:"O-O" },
			},

			evaluate: function(aGame,evalValues,material) {
				// draw by lack of mating material (king vs king)
				var white=material[1].count, black=material[-1].count;
				var wPieces=0, bPieces=0;
				for(var t=0;t<=7;t++){ wPieces+=white[t]||0; bPieces+=black[t]||0; }
				if(wPieces===0 && bPieces===0){ this.mFinished=true; this.mWinner=JocGame.DRAW; }
				// 50-move rule
				if(this.noCaptCount>=100){ this.mFinished=true; this.mWinner=JocGame.DRAW; }
				// nudge pawns forward along the meridian (light positional term)
				var dPromo=0;
				var wp=material[1].byType[0]; if(wp) for(var i=0;i<wp.length;i++) dPromo+=geometry.dNorth[wp[i].p];
				var bp=material[-1].byType[2]; if(bp) for(var j=0;j<bp.length;j++) dPromo-=geometry.dSouth[bp[j].p];
				if(dPromo!==0) evalValues['pawnAdvance']=dPromo;
			},

		};
	};

})();
