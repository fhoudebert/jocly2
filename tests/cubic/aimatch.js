const Jocly=require("../../dist/node/jocly.core.js");
let n=0, cap=30; // play up to 30 plies of AI vs AI
Jocly.createMatch("cubic-chess").then(match=>{
  function step(){
    match.machineSearch().then(r=>{ const mv=r.move;
      return match.getMoveString(mv).then(s=>{ console.log((n+1)+". "+s); n++; return match.applyMove(mv); });
    }).then(res=>{
      if(res.finished){ console.log("FINISHED winner="+(res.winner===Jocly.PLAYER_A?"A(White)":res.winner===Jocly.PLAYER_B?"B(Black)":"Draw")); process.exit(0);}
      else if(n>=cap){ console.log("(reached ply cap "+cap+", no crash)"); process.exit(0); }
      else step();
    }).catch(e=>{ console.log("ERROR:",e&&e.message||e); process.exit(1); });
  }
  console.log("cubic-chess match created; playing AI vs AI...");
  step();
}).catch(e=>{ console.log("createMatch error:",e&&e.message||e); process.exit(1); });
setTimeout(()=>{console.log("(timeout)");process.exit(0);},120000);
