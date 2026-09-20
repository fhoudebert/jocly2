/*
 * Un mat reel, reconnu comme tel.
 *
 *   node tests/cubic/realmate.js
 *
 * La suite imprimait le verdict du moteur et sortait a 0 : une partie qui
 * aurait cesse de reconnaitre le mat serait passee inapercue, la ligne
 * « winner DRAW » ayant l'air d'un resultat comme un autre. C'est verifie.
 */
const H=require("./harness.js");
const t=require("../fairy/harness.js").runner();
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
t.ok("le roi noir est en echec", !!b.check);
t.check("et n'a aucune reponse", b.mMoves.length, 0);
t.check("la partie est terminee", b.mFinished, true);
// Le pat s'ecrirait DRAW ici : c'est la confusion que cette suite garde.
t.check("gagnee par les Blancs", b.mWinner, 1);
t.done("Cubic : un mat reconnu");
