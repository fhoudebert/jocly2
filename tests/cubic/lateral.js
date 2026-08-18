const H=require("./harness.js");
const sb=H.loadModel(["base-model.js","cubic-geo-model.js","3d/cubic-model.js"]);
const game=H.newGame(sb); const geo=game.cbVar.geometry, nm=p=>geo.PosName(p), P=p=>geo.P(p);
const MG=sb.Model.Game, MASK=0xffff, MOVE=0x10000, CAP=0x20000;
// side faces should be 1 and 4
let sides=[]; for(let f=0;f<6;f++) if(geo.isSideFace(f)) sides.push(f+1);
console.log("side panels (view numbering):", sides.join(",") , "(expect 2,5 = faces 1,4)");
// lateral moves for white pawns on side faces
const wp=MG.cbCubicPawnGraph(geo,1);
console.log("\nWhite pawn lateral moves from side panels:");
let anyLat=0;
for(let p=0;p<96;p++){ if(!geo.isSideFace(P(p))) continue;
  const lat=geo.pawnLateral(p,1); if(lat.length){ anyLat++; if(anyLat<=6) console.log("  "+nm(p)+" -> "+lat.map(nm).join(" ")); }
}
console.log("  ("+anyLat+" side cells have a lateral move)");
// corridor pawns must NOT have lateral moves
let spurious=0; for(let p=0;p<96;p++){ if(geo.isSideFace(P(p))) continue; if(geo.pawnLateral(p,1).length) spurious++; }
console.log("corridor cells with spurious lateral moves (must be 0):",spurious);
// end-to-end: place a white pawn on a side face, verify a lateral move is generated & playable, then it can advance
const sideCell = (function(){ for(let p=0;p<96;p++){ if(geo.isSideFace(P(p)) && geo.pawnLateral(p,1).length) return p; } })();
let b=H.setup(sb,game,[{s:1,type:0,pos:sideCell},{s:1,type:8,pos:geo.PosByName("1B1")},{s:-1,type:8,pos:geo.PosByName("6C1")}],1);
b.GenerateMoves(game);
const lat=geo.pawnLateral(sideCell,1);
const latMove=b.mMoves.find(m=>m.f===sideCell && lat.includes(m.t&MASK) && m.c==null);
console.log("\nwhite pawn on side "+nm(sideCell)+": lateral move generated:",!!latMove, latMove?("to "+nm(latMove.t&MASK)):"");
if(latMove){ b.ApplyMove(game,latMove); b.mWho=-b.mWho;
  const now=latMove.t&MASK; const fw=geo.pawnForward(now,1);
  console.log("  after lateral, pawn on "+nm(now)+" can advance forward to:", fw?nm(fw.nx.pos):"(none)");
}
// regression with lateral + ep: alternating playouts
function rng(s){return()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};}
let crash=0,plies=0,lateralPlayed=0;
for(let gi=0;gi<20;gi++){ const bd=H.newBoard(sb,game); const rnd=rng(3+gi*61); let pl=0;
  try{ while(pl<400){ bd.GenerateMoves(game); if(bd.mFinished)break; const M=bd.mMoves; const m=M[Math.floor(rnd()*M.length)];
    const pc=bd.pieces[bd.board[m.f]]; if(pc && (pc.t===0||pc.t===2) && m.c==null && geo.isSideFace(P(m.f)) && !geo.isSideFace(P(m.t&MASK))) lateralPlayed++;
    bd.ApplyMove(game,m); bd.mWho=-bd.mWho; pl++; } }
  catch(e){ crash++; if(crash<=2)console.log("CRASH:",e.message);} plies+=pl;
}
console.log("\nregression: 20 games, plies",plies,"crashes",crash,"| lateral-type moves played:",lateralPlayed);
