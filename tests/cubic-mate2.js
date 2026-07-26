const H=require("./cubic-harness.js");
const sb=H.loadModel(["base-model.js","cubic-geo-model.js","cubic-model.js"]);
const game=H.newGame(sb); const geo=game.cbVar.geometry, PB=s=>geo.PosByName(s), nm=p=>geo.PosName(p);
const DRAW=sb.JocGame.DRAW;
function attackers(board,pos,side){ return board.cbGetAttackers(game,pos,side,100); }
// A) rook check along a face column
let b=H.setup(sb,game,[{s:1,type:8,pos:PB("2A1")},{s:1,type:6,pos:PB("3B2")},{s:-1,type:8,pos:PB("3D2")}],-1);
console.log("A) attackers on black king 3D2:",attackers(b,b.kings[-1],-1).length,"(expect >=1: rook on col2)");
b.GenerateMoves(game);
// every legal reply must clear the check
let allClear=b.mMoves.every(m=>{const u=b.cbQuickApply(game,m);const inchk=attackers(b,b.kings[-1],-1).length>0;b.cbQuickUnapply(game,u);return !inchk;});
console.log("   legal replies:",b.mMoves.length,"| all resolve check:",allClear);

// D) castling with unmoved king & rook (m:false)
let c=H.setup(sb,game,[{s:1,type:8,pos:PB("1C2"),m:false},{s:1,type:6,pos:PB("1C4"),m:false},{s:-1,type:8,pos:PB("6B2"),m:false}],1);
c.GenerateMoves(game);
const cm=c.mMoves.filter(m=>m.cg!=null).map(m=>nm(m.f)+"->"+nm(m.t&0xffff)+" (rook "+nm(m.cg)+")");
console.log("D) white O-O:",cm.length?cm.join(","):"NONE");
// black castling
let c2=H.setup(sb,game,[{s:-1,type:8,pos:PB("6B2"),m:false},{s:-1,type:6,pos:PB("6B4"),m:false},{s:1,type:8,pos:PB("1C2"),m:false}],-1);
c2.GenerateMoves(game);
const cm2=c2.mMoves.filter(m=>m.cg!=null).map(m=>nm(m.f)+"->"+nm(m.t&0xffff)+" (rook "+nm(m.cg)+")");
console.log("   black O-O:",cm2.length?cm2.join(","):"NONE");
// D2) castling blocked when bishop still between (initial full setup): expect NONE
let full=H.newBoard(sb,game); full.GenerateMoves(game);
console.log("   castling from full initial position (blocked by bishop):",full.mMoves.filter(m=>m.cg!=null).length===0?"correctly NONE":"UNEXPECTEDLY AVAILABLE");

// F) construct an actual checkmate and confirm engine flags it
// White queen + king vs lone black king boxed in a face corner.
// Put black king at 1A1 (pos0). Its king-neighbours:
let king0=PB("1A1");
b=H.setup(sb,game,[{s:-1,type:8,pos:king0}],-1);
const kg=game.cbVar.pieceTypes[8].graph[king0].map(l=>l[0]&0xffff);
console.log("F) black king @1A1 neighbours:",kg.map(nm).join(" "));
