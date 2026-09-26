/*
 * La prise en passant sur l'echiquier cubique.
 *
 *   node tests/cubic/ep.js
 *
 * Meme remise en etat que tests/cubic/lateral.js : la suite imprimait ses
 * constats et sortait toujours a 0, donc rien ne l'aurait fait echouer. Les
 * constats sont maintenant des verifications.
 */
const H=require("./harness.js");
const t=require("../fairy/harness.js").runner();
const sb=H.loadModel(["base-model.js","cubic-geo-model.js","3d/cubic-model.js"]);
const game=H.newGame(sb); const geo=game.cbVar.geometry, PB=s=>geo.PosByName(s), nm=p=>geo.PosName(p);
const MG=sb.Model.Game, MASK=0xffff, CAP=0x20000;
// White ipawn 1A2(pos1) double-steps: 1A2->3D2(skip 45)->3C2(land 41).
const skip=PB("3D2"), land=PB("3C2");
// find black pawn positions whose capture graph includes the skipped square 45
const bp=MG.cbCubicPawnGraph(geo,-1);
let catchers=[]; for(let p=0;p<96;p++){ if(bp[p].some(l=>(l[0]&CAP)&&(l[0]&MASK)===skip)) catchers.push(p); }
console.log("black-pawn squares that attack skipped 3D2:",catchers.map(nm).join(" "));
// pick one adjacent-ish; set up game: white ipawn@1, black pawn@catcher, both kings, WHITE to move
const bcatch = catchers[0];
function apply(b,m){ b.ApplyMove(game,m); b.mWho=-b.mWho; }
let b=H.setup(sb,game,[
  {s:1,type:1,pos:PB("1A2"),m:false},   // white INITIAL pawn (can double-step)
  {s:1,type:8,pos:PB("1B1")},
  {s:-1,type:2,pos:bcatch},             // black regular pawn (epCatch)
  {s:-1,type:8,pos:PB("6C1")},
],1);
b.GenerateMoves(game);
const dbl=b.mMoves.find(m=>m.f===PB("1A2")&&(m.t&MASK)===land);
console.log("white double-step 1A2->3C2 exists:",!!dbl);
t.ok("le pas double du pion initial existe", !!dbl);
apply(b,dbl);
console.log("after double: epTarget =", b.epTarget?nm(b.epTarget.p)+" (pawn "+nm(b.pieces[b.epTarget.i].p)+")":"none");
t.ok("il laisse une case de passage", !!b.epTarget);
b.GenerateMoves(game);
const epMove=b.mMoves.find(m=>m.f===bcatch && (m.t&MASK)===skip);
console.log("black e.p. capture "+nm(bcatch)+"x"+nm(skip)+" available:", !!epMove);
t.ok("la prise en passant est offerte au camp adverse", !!epMove);
if(epMove){ apply(b,epMove);
  const capturedGone = b.board[land]<0; // the double-stepped white pawn (on 3C2) removed
  console.log("after e.p.: black pawn now on",nm(skip),"| white pawn on 3C2 captured:",capturedGone);
  // Le pion pris n'est pas sur la case d'arrivee : c'est tout le piege de
  // l'en passant, et le seul endroit ou une prise retire une piece ailleurs.
  t.ok("et elle retire bien le pion qui a saute", capturedGone);
}
// regression: ensure no hang/crash in a normal alternating playout with e.p. enabled
function rng(s){return()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};}
let crash=0,plies=0;
for(let gi=0;gi<15;gi++){ const bd=H.newBoard(sb,game); const rnd=rng(7+gi*97); let pl=0;
  try{ while(pl<400){ bd.GenerateMoves(game); if(bd.mFinished)break; const M=bd.mMoves; const m=M[Math.floor(rnd()*M.length)]; bd.ApplyMove(game,m); bd.mWho=-bd.mWho; pl++; } }
  catch(e){ crash++; if(crash<=2)console.log("CRASH:",e.message); } plies+=pl;
}
console.log("\nregression: 15 games, plies",plies,"crashes",crash);
t.check("quinze parties au hasard, aucune exception", crash, 0);
t.done("Cubic : prise en passant");
