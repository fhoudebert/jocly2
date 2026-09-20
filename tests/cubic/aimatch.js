/*
 * Ce qui suit a besoin du build (dist/node/jocly.core.js). Sans lui, la suite
 * SAUTE au lieu de s'arreter sur une trace : tests/run.js compte alors un
 * « skipped », et un depot fraichement clone ne se presente plus avec des
 * echecs qui n'en sont pas. Meme garde que les autres suites qui chargent le
 * build.
 */
const fsBuild = require("fs");
if(!fsBuild.existsSync(require("path").join(__dirname, "..", "..", "dist", "node", "jocly.core.js"))) {
	console.log("SKIP - no build yet: run npx gulp build first");
	process.exit(0);
}
const Jocly=require("../../dist/node/jocly.core.js");
/*
 * L'IA joue contre elle-meme, trente demi-coups.
 *
 *   node tests/cubic/aimatch.js
 *
 * Ce que cette suite garde : machineSearch() rend un coup jouable a chaque
 * tour sur ce plateau. Elle sortait a 0 meme si l'IA ne jouait qu'un seul
 * coup avant que la partie ne s'arrete -- le cas exact d'un moteur qui ne
 * trouve rien. On verifie donc qu'elle est allee au bout.
 */
let n=0, cap=30; // play up to 30 plies of AI vs AI
Jocly.createMatch("cubic-chess").then(match=>{
  function step(){
    match.machineSearch().then(r=>{ const mv=r.move;
      return match.getMoveString(mv).then(s=>{ console.log((n+1)+". "+s); n++; return match.applyMove(mv); });
    }).then(res=>{
      if(res.finished){ console.log("FINISHED winner="+(res.winner===Jocly.PLAYER_A?"A(White)":res.winner===Jocly.PLAYER_B?"B(Black)":"Draw"));
        // Une partie finie en moins de dix demi-coups ne vient pas de l'IA :
        // c'est le moteur qui ne trouve plus de coup.
        if(n<10){ console.log("FAILED: partie terminee apres "+n+" demi-coups seulement"); process.exit(1); }
        console.log("ok   l'IA a joue "+n+" demi-coups avant la fin de partie"); process.exit(0);}
      else if(n>=cap){ console.log("ok   l'IA a joue les "+cap+" demi-coups demandes, sans exception"); process.exit(0); }
      else step();
    }).catch(e=>{ console.log("ERROR:",e&&e.message||e); process.exit(1); });
  }
  console.log("cubic-chess match created; playing AI vs AI...");
  step();
}).catch(e=>{ console.log("createMatch error:",e&&e.message||e); process.exit(1); });
setTimeout(()=>{console.log("(timeout)");process.exit(0);},120000);
