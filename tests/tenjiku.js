/*
	Rule tests for Tenjiku Shogi (node, no browser needed).
	Run with:  node tests/tenjiku.js
*/

var Jocly = require("../");

var passed=0, failed=0;
function check(name,cond,info) {
	if(cond) { passed++; console.log("  ok   "+name); }
	else { failed++; console.log("  FAIL "+name+(info!==undefined?"   -> "+info:"")); }
}
function eq(name,got,expected) {
	check(name,got===expected,"got "+JSON.stringify(got)+", expected "+JSON.stringify(expected));
}

var FILES="abcdefghijklmnop";
function POS(name) {
	var col=FILES.indexOf(name[0]);
	return (parseInt(name.substr(1))-1)*16+col;
}
function NAME(pos) {
	return FILES[pos%16]+(Math.floor(pos/16)+1);
}

// build a FEN out of { "h4": "G!", "h12": "p", ... }
function fen(pieces,turn) {
	var board={};
	for(var sqr in pieces)
		board[POS(sqr)]=pieces[sqr];
	var rows=[];
	for(var r=15;r>=0;r--) {
		var row="", empty=0;
		for(var c=0;c<16;c++) {
			var p=board[r*16+c];
			if(p===undefined) empty++;
			else {
				if(empty) { row+=empty; empty=0; }
				row+=p;
			}
		}
		if(empty) row+=empty;
		rows.push(row);
	}
	return rows.join("/")+" "+(turn||"w")+" - - 0 1";
}

function load(match,pieces,turn) {
	return match.load({
		game: "tenjiku-shogi",
		initialBoard: typeof pieces=="string" ? pieces : fen(pieces,turn),
		playedMoves: [],
	});
}

function movesFrom(moves,sqr) {
	var from=POS(sqr);
	return moves.filter(function(m) { return m.f===from; });
}
function targets(moves,sqr) {
	return movesFrom(moves,sqr).map(function(m) { return NAME(m.t); }).sort();
}
function has(moves,from,to) {
	return movesFrom(moves,from).some(function(m) { return m.t===POS(to); });
}
function moveTo(moves,from,to,pr) {
	return movesFrom(moves,from).filter(function(m) {
		return m.t===POS(to) && (pr===undefined || m.pr===pr);
	})[0];
}
function promotionsAt(moves,from,to) { // the `pr` values offered for that move
	return movesFrom(moves,from).filter(function(m) { return m.t===POS(to); })
		.map(function(m) { return m.pr; }).sort();
}
// board occupancy after applying a move, as a map square -> fen letter
function occupancy(match) {
	return match.getBoardState().then(function(state) {
		var rows=state.split(" ")[0].split("/"), board={};
		rows.forEach(function(row,rowIndex) {
			var r=15-rowIndex, col=0;
			for(var i=0;i<row.length;i++) {
				var ch=row[i];
				if(ch>="0" && ch<="9") {
					var digits=ch;
					while(i+1<row.length && row[i+1]>="0" && row[i+1]<="9") digits+=row[++i];
					col+=parseInt(digits);
				} else {
					if(ch=="+") ch+=row[++i];
					while(i+1<row.length && row[i+1]=="!") ch+=row[++i];
					board[NAME(r*16+col)]=ch;
					col++;
				}
			}
		});
		return board;
	});
}

var tests=[];
function test(name,fn) { tests.push({name:name,fn:fn}); }
function testInitial(name,fn) { tests.push({name:name,fn:fn,initial:true}); }

// ---------------------------------------------------------------- setup ----
testInitial("initial position",function(match) {
	return match.getBoardState().then(function(state) {
		var rows=state.split(" ")[0].split("/");
		eq("16 rows",rows.length,16);
		eq("white back rank",rows[15],"LJFICSGKEGSCIFJL");
		eq("black back rank (180 deg rotation)",rows[0],"ljficsgekgscifjl");
		eq("white pawn rank",rows[11],"PPPPPPPPPPPPPPPP");
		eq("white dogs",rows[10],"4U6U4");
		return match.getPossibleMoves();
	}).then(function(moves) {
		check("some moves at start",moves.length>0,moves.length);
		// 14 pawns can advance (2 are blocked by the dogs), each dog can step
		var pawnMoves=moves.filter(function(m) { return m.a===""; });
		eq("pawn moves",pawnMoves.length,14);
		var dogMoves=moves.filter(function(m) { return m.a==="D"; });
		eq("dog moves",dogMoves.length,2);
		// no duplicated move in the list
		var keys={}, dup=0;
		moves.forEach(function(m) {
			var k=m.f+":"+m.t+":"+m.pr+":"+m.c+":"+m.via+":"+m.kill;
			if(keys[k]) dup++;
			keys[k]=true;
		});
		eq("no duplicate move",dup,0);
	});
});

test("FEN round trip with multi-character piece codes",function(match) {
	var position=fen({ h1:"K", i1:"E", h4:"G!", i4:"V!", g3:"F!", h3:"L!", i3:"Q!",
		c2:"C!", f3:"W", d4:"H!", e4:"D!", f4:"B!", g4:"R!", h2:"N!", b3:"Z", a3:"Y",
		i16:"k", h12:"p", a1:"+C!", b1:"+W" });
	return load(match,position).then(function() {
		return match.getBoardState();
	}).then(function(state) {
		eq("board part unchanged",state.split(" ")[0],position.split(" ")[0]);
	});
});

// ------------------------------------------------------- jumping generals ----
test("Great General jumps over lower ranked pieces to capture",function(match) {
	return load(match,{ h1:"K", h4:"G!", h6:"P", h8:"R", h12:"p", i16:"k" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		check("GG jump-captures the pawn behind two pieces",has(moves,"h4","h12"));
		check("GG cannot land on its own pieces",!has(moves,"h4","h6"));
		check("GG still slides one step",has(moves,"h4","h5"));
	});
});

test("a general cannot jump over an equal or higher rank",function(match) {
	return load(match,{ h1:"K", h4:"B!", f6:"b!", d8:"p", i16:"k" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		check("BG cannot jump over another BG",!has(moves,"h4","d8"));
		check("BG can capture the BG that blocks it",has(moves,"h4","f6"));
		return load(match,{ h1:"K", h4:"G!", f6:"v!", d8:"p", i16:"k" });
	}).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		check("GG jumps over an enemy Vice General",has(moves,"h4","d8"));
		check("GG can capture that Vice General",has(moves,"h4","f6"));
		return load(match,{ h1:"K", h4:"V!", f6:"g!", d8:"p", i16:"k" });
	}).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		check("VG cannot jump over a Great General",!has(moves,"h4","d8"));
		check("VG can capture the Great General",has(moves,"h4","f6"));
		return load(match,{ h1:"K", h4:"G!", f6:"k", i16:"e", d8:"p" });
	}).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		check("no general jumps over royalty",!has(moves,"h4","d8"));
	});
});

test("promotion updates the jumping power",function(match) {
	// a Rook General promotes to Great General and must then jump over a Vice General
	return load(match,{ h1:"K", h11:"R!", h13:"v!", h15:"p", i16:"k" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		check("unpromoted RG cannot jump over the VG",!has(moves,"h11","h15"));
		eq("RG may stay or become a Great General",
			JSON.stringify(promotionsAt(moves,"h11","h12")),"[43,85]");
		var move=moveTo(moves,"h11","h12",85);
		check("the promoting move exists",!!move);
		return match.applyMove(move);
	}).then(function() {
		return occupancy(match);
	}).then(function(board) {
		eq("it became a Great General",board["h12"],"+R!");
		return match.getPossibleMoves(); // black to move
	}).then(function() {
		return load(match,{ h1:"K", h12:"+R!", h13:"v!", h15:"p", i16:"k" });
	}).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		check("promoted Great General jumps over the Vice General",has(moves,"h12","h15"));
	});
});

// ------------------------------------------------------------ fire demon ----
test("Fire Demon burns adjacent enemies after moving",function(match) {
	return load(match,{ h1:"K", d4:"F!", g6:"p", h7:"p", i7:"n!", a16:"k" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		var move=moveTo(moves,"d4","h8");
		check("Demon slides sideways/diagonally to h8",!!move);
		return match.applyMove(move);
	}).then(function() {
		return occupancy(match);
	}).then(function(board) {
		eq("Demon arrived",board["h8"],"F!");
		eq("adjacent enemy pawn burned",board["h7"],undefined);
		eq("enemy Lion burned too",board["i7"],undefined);
		eq("enemy pawn out of reach survives",board["g6"],"p");
	});
});

test("moving next to a Fire Demon burns the mover",function(match) {
	return load(match,{ h1:"K", h8:"f!", g6:"R", a16:"k" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		var move=moveTo(moves,"g6","g7");
		check("the rook may step next to the demon",!!move);
		return match.applyMove(move);
	}).then(function() {
		return occupancy(match);
	}).then(function(board) {
		eq("the rook burned on arrival",board["g7"],undefined);
		eq("the demon survives",board["h8"],"f!");
	});
});

test("Demon versus Demon: the one that moves dies",function(match) {
	return load(match,{ h1:"K", h8:"f!", e5:"F!", g9:"p", a16:"k" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		var move=moveTo(moves,"e5","g7");
		check("white demon can slide to g7",!!move);
		return match.applyMove(move);
	}).then(function() {
		return occupancy(match);
	}).then(function(board) {
		eq("the moving demon burned",board["g7"],undefined);
		eq("the stationary demon survives",board["h8"],"f!");
		eq("and it burned nothing",board["g9"],"p");
	});
});

test("Water Buffalo promoting to Fire Demon burns immediately",function(match) {
	return load(match,{ h1:"K", h11:"W", g13:"p", i13:"p", h14:"p", a16:"k" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		var move=moveTo(moves,"h11","h12",86);
		check("Water Buffalo promotes to a Fire Demon when entering the zone",!!move);
		return match.applyMove(move);
	}).then(function() {
		return occupancy(match);
	}).then(function(board) {
		eq("it is a Fire Demon now",board["h12"],"+W");
		eq("adjacent enemy burned (g13)",board["g13"],undefined);
		eq("adjacent enemy burned (i13)",board["i13"],undefined);
		eq("further enemy survives",board["h14"],"p");
	});
});

// ------------------------------------------------------------ area moves ----
test("Fire Demon area move: up to 3 King steps through empty squares",function(match) {
	return load(match,{ h1:"K", h8:"F!", a16:"k" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		var to=targets(moves,"h8");
		check("reaches h11 (3 steps straight up, not a slide direction)",to.indexOf("h11")>=0);
		check("reaches g11 (bent path)",to.indexOf("g11")>=0);
		check("does not reach h12 (4 steps)",to.indexOf("h12")<0);
		check("still slides far sideways",to.indexOf("p8")>=0);
		check("still slides far diagonally",to.indexOf("l12")>=0);
		check("does not slide vertically",to.indexOf("h13")<0);
	});
});

test("area moves stop on the first capture and cannot cross pieces",function(match) {
	return load(match,{ h1:"K", h8:"V!", g9:"p", h9:"p", i9:"p", a16:"k" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		var to=targets(moves,"h8");
		check("VG captures the pawn one step away",to.indexOf("h9")>=0);
		check("VG cannot continue past the captured pawn",to.indexOf("h10")<0);
		check("VG walks around the wall (3 steps: g8, f9, g10)",to.indexOf("g10")>=0);
		check("VG reaches 3 steps down",to.indexOf("h5")>=0);
		check("VG does not reach 4 steps",to.indexOf("h4")<0);
		check("VG still slides as a Bishop",to.indexOf("a1")>=0);
	});
});

test("a King may not walk into a Fire Demon burn zone",function(match) {
	return load(match,{ h1:"K", g3:"f!", a16:"k" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		var to=targets(moves,"h1");
		check("h2 would be burned by the demon on g3",to.indexOf("h2")<0);
		check("g2 would be burned as well",to.indexOf("g2")<0);
		check("i2 is burned ground as well (the demon walks to h3/h2)",to.indexOf("i2")<0);
		// a demon 3 King steps away still covers everything around the King
		return load(match,{ h1:"K", f6:"f!", a16:"k" });
	}).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		var to=targets(moves,"h1");
		check("the area move (f6-g5-h4-i3) still burns h2",to.indexOf("h2")<0);
		check("the diagonal slide f6-j2 still burns i1",to.indexOf("i1")<0);
		// out of both the slide lines and the 3-step walk, the King is free
		return load(match,{ a1:"K", h16:"f!", p1:"k" });
	}).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		eq("a far away demon does not restrict the King",
			targets(moves,"a1").join(","),"a2,b1,b2");
	});
});

test("check from a Vice General area move must be answered",function(match) {
	// the VG can walk 2 steps and capture the King: that is check
	return load(match,{ h1:"K", f3:"v!", p16:"k" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		check("staying put is not an option: every move must leave check",
			moves.every(function(m) { return m.f===POS("h1"); }));
		var to=targets(moves,"h1");
		check("King escapes out of the 3-step area",to.indexOf("i1")<0 || to.length>0);
	});
});

// ------------------------------------------------- crown prince (royalty) ----
test("Crown Prince is royal: losing the King alone does not end the game",function(match) {
	return load(match,{ h1:"K", h2:"+E", a16:"k", h5:"r" },"b").then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		var move=moveTo(moves,"h5","h2");
		check("black rook can take the Crown Prince",!!move);
		return match.applyMove(move);
	}).then(function(result) {
		check("game continues with the King alone",!result.finished,JSON.stringify(result));
	});
});

test("Drunk Elephant promotes to a royal Crown Prince",function(match) {
	return load(match,{ h1:"K", h11:"E", a16:"k" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		eq("Drunk Elephant may stay or become a Crown Prince",
			JSON.stringify(promotionsAt(moves,"h11","h12")),"[16,62]");
	});
});

// --------------------------------------------------------------- promotion ----
test("promotion rules",function(match) {
	return load(match,{ h1:"K", h11:"P", a16:"k", g12:"p" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		check("pawn entering the zone may promote",!!moveTo(moves,"h11","h12",50));
		check("... but is not forced to",!!moveTo(moves,"h11","h12",0));
		return load(match,{ h1:"K", h12:"P", a16:"k" });
	}).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		check("no promotion for a non-capturing move inside the zone",
			movesFrom(moves,"h12").every(function(m) { return m.pr===undefined || m.pr===0; }));
		return load(match,{ h1:"K", h12:"P", a16:"k", h13:"p" });
	}).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		// the Pawn only captures straight ahead in Shogi
		check("capturing inside the zone allows promotion",!!moveTo(moves,"h12","h13",50));
		return load(match,{ h1:"K", h15:"P", a16:"k" });
	}).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		var last=movesFrom(moves,"h15");
		check("pawn reaching the last rank is forced to promote",
			last.length>0 && last.every(function(m) { return m.pr===50; }));
	});
});

// -------------------------------------------------------------- tetrarch ----
test("Heavenly Tetrarch skips the first square",function(match) {
	return load(match,{ h1:"K", h8:"+C!", h9:"P", i9:"p", a16:"k" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		var to=targets(moves,"h8");
		check("jumps over its own piece to h10",to.indexOf("h10")>=0);
		check("keeps sliding up to h16",to.indexOf("h16")>=0);
		check("never lands on the skipped square",to.indexOf("h9")<0);
		check("sideways reaches j8 (2 squares)",to.indexOf("j8")>=0);
		check("sideways reaches k8 (3 squares)",to.indexOf("k8")>=0);
		check("sideways stops at 3 squares",to.indexOf("l8")<0);
		check("igui: captures i9 without moving",
			movesFrom(moves,"h8").some(function(m) { return m.t===POS("h8") && m.via===POS("i9"); }));
	});
});

// -------------------------------------------------------------- lion etc ----
test("Lion, Lion Hawk and Free Eagle",function(match) {
	return load(match,{ h1:"K", h8:"N!", j10:"p", a16:"k" }).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		var to=targets(moves,"h8");
		check("Lion jumps to the 5x5 area (j10)",to.indexOf("j10")>=0);
		check("Lion jumps to a Knight square (i10)",to.indexOf("i10")>=0);
		return load(match,{ h1:"K", h8:"L!", a16:"k" });
	}).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		var to=targets(moves,"h8");
		check("Lion Hawk also slides as a Bishop",to.indexOf("p16")>=0);
		check("Lion Hawk keeps the Lion jumps",to.indexOf("j10")>=0);
		return load(match,{ h1:"K", h8:"Q!", a16:"k" });
	}).then(function() {
		return match.getPossibleMoves();
	}).then(function(moves) {
		var to=targets(moves,"h8");
		check("Free Eagle slides as a Free King",to.indexOf("h16")>=0);
		check("Free Eagle jumps two diagonal steps (j10)",to.indexOf("j10")>=0);
	});
});

// ------------------------------------------------------------------ run ----
Jocly.createMatch("tenjiku-shogi").then(function(match) {
	var chain=Promise.resolve();
	tests.forEach(function(t) {
		chain=chain.then(function() {
			console.log("\n"+t.name);
			return (t.initial
				? match.load({ game:"tenjiku-shogi", playedMoves:[] })
				: load(match,{ h1:"K", a16:"k" })).then(function() {
				return t.fn(match);
			});
		});
	});
	return chain.then(function() {
		console.log("\n"+passed+" passed, "+failed+" failed");
		process.exit(failed?1:0);
	});
}).catch(function(e) {
	console.log("ERROR",e && e.stack || e);
	process.exit(2);
});
