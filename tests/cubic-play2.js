const H=require("./cubic-harness.js");
const sb=H.loadModel(["base-model.js","cubic-geo-model.js","cubic-model.js"]);
const game=H.newGame(sb); const geo=game.cbVar.geometry, DRAW=sb.JocGame.DRAW, nm=p=>geo.PosName(p);
function rng(s){return()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};}
let S={games:0,plies:0,whiteMate:0,blackMate:0,draw:0,promos:0,castles:0,captures:0,checks:0,crash:0,kingCapture:0,cap600:0};
for(let gi=0;gi<60;gi++){ const board=H.newBoard(sb,game); const rand=rng(999+gi*131);
  let ply=0;
  try{ while(ply<600){ board.GenerateMoves(game);
      if(board.mFinished){ if(board.mWinner===DRAW)S.draw++; else if(board.mWinner===1)S.whiteMate++; else if(board.mWinner===-1)S.blackMate++; break; }
      const M=board.mMoves, m=M[Math.floor(rand()*M.length)];
      if(m.ck)S.checks++; if(m.c!=null)S.captures++; if(m.cg!=null)S.castles++;
      // sanity: never allow a move that captures a king
      if(m.c!=null && board.pieces[m.c].t===8){S.kingCapture++;}
      const pc=board.pieces[board.board[m.f]], wasP=pc.t<=3;
      board.ApplyMove(game,m); board.mWho=-board.mWho;
      if(wasP){const np=board.pieces[board.board[m.t&0xffff]]; if(np&&np.t>=4&&np.t<=7)S.promos++;}
      ply++;
    } if(ply>=600)S.cap600++;
  }catch(e){S.crash++; if(S.crash<=2)console.log("CRASH g"+gi+" ply"+ply+":",e.message);}
  S.games++; S.plies+=ply;
}
console.log(JSON.stringify(S));
console.log("avg plies:",(S.plies/S.games).toFixed(0),"| decisive:",S.whiteMate+S.blackMate,"| draws:",S.draw);
