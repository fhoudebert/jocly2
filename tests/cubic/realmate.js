const H=require("./harness.js");
const sb=H.loadModel(["base-model.js","cubic-geo-model.js","3d/cubic-model.js"]);
const game=H.newGame(sb); const geo=game.cbVar.geometry, PB=s=>geo.PosByName(s), nm=p=>geo.PosName(p);
const DRAW=sb.JocGame.DRAW;
function apply(b,m){ b.ApplyMove(game,m); b.mWho=-b.mWho; } // match layer flips the turn
// wK@1A3, wQ@1C2, bK@1A1, white to move: Q1C2->1A2 is mate
let b=H.setup(sb,game,[{s:1,type:8,pos:PB("1A3")},{s:1,type:7,pos:PB("1C2")},{s:-1,type:8,pos:PB("1A1")}],1);
b.GenerateMoves(game);
const mate=b.mMoves.find(m=>m.f===PB("1C2")&&(m.t&0xffff)===PB("1A2"));
apply(b,mate);
b.GenerateMoves(game);
console.log("After Q->1A2 (mate): mWho",b.mWho,"check",b.check,"| black replies",b.mMoves.length,
  "| mFinished",b.mFinished,"| winner",b.mWinner===DRAW?"DRAW":(b.mWinner===1?"WHITE ✓":b.mWinner));
