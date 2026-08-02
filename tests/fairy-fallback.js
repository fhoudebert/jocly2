// Repli fairy-stockfish -> IA native rendu visible via result.fairyFallback.
// Sous Node (pas de Worker) le repli est systematique -> test deterministe.
const Jocly = require("../dist/node/jocly.core.js");
let PASS=0, FAIL=0;
function ok(c,msg){ if(c){PASS++; console.log('  \u2713',msg);} else {FAIL++; console.log('  \u2717 ECHEC:',msg);} }
const CANDIDATES = ['shako-chess','shogi','chess','xiangqi'];
(async()=>{
  let game=null, expert=null, native=null;
  for(const g of CANDIDATES){
    try{ let m=await Jocly.createMatch(g); let lv=(m.game.config.model.levels)||[];
      let e=lv.find(l=>l&&l.ai==='fairy-stockfish');
      if(e){ game=g; expert=e; native=lv.find(l=>l&&l.ai!=='fairy-stockfish'); break; }
    }catch(e){}
  }
  ok(!!game, 'un jeu a niveau fairy-stockfish existe ('+game+')');
  if(!game){ console.log('\nRESULTAT fairy-fallback:',PASS,'OK /',FAIL,'ECHEC'); process.exit(FAIL?1:0); }
  let m=await Jocly.createMatch(game);
  console.log('Jeu:',game,'| Expert:',expert.name||expert.label,'| repli attendu');
  let r=await m.machineSearch({level:expert});
  ok(r&&r.move, 'un coup est renvoye (repli sur IA native)');
  ok(r&&r.fairyFallback, 'result.fairyFallback renseigne (repli signale)');
  ok(r&&r.fairyFallback&&r.fairyFallback.engine==='fairy-stockfish', 'fairyFallback.engine = fairy-stockfish');
  ok(r&&r.fairyFallback&&typeof r.fairyFallback.level==='string'&&r.fairyFallback.level, 'fairyFallback.level nomme le niveau natif ("'+((r.fairyFallback||{}).level)+'")');
  ok(r&&r.fairyFallback&&typeof r.fairyFallback.reason==='string', 'fairyFallback.reason decrit la cause');
  ok(m.game.mFairyFallback===undefined, 'marqueur purge du jeu apres le coup');
  let cloned=(typeof structuredClone==='function')?structuredClone(r):JSON.parse(JSON.stringify(r));
  ok(cloned.fairyFallback&&cloned.fairyFallback.engine==='fairy-stockfish'&&cloned.fairyFallback.level===r.fairyFallback.level,
     'fairyFallback survit au structured-clone (frontiere embed)');
  if(native){
    let r2=await m.machineSearch({level:native});
    ok(r2&&r2.move, 'niveau natif renvoie un coup');
    ok(!r2.fairyFallback, 'result.fairyFallback null pour un niveau natif');
  }
  console.log('\nRESULTAT fairy-fallback:',PASS,'OK /',FAIL,'ECHEC');
  process.exit(FAIL?1:0);
})().catch(e=>{console.error('ERREUR TEST',e);process.exit(2)});
