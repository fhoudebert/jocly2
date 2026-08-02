// Item 3 - prince ROYAL : la partie n'est gagnée qu'en réduisant l'adversaire
// à ZÉRO royal (Shō Shogi). Tant qu'un camp garde roi + prince il ne peut pas
// être maté et peut même abandonner un royal. Ces tests vérifient aussi que le
// chemin MONO-royal (échecs, shogi standard) reste inchangé.
//
// L'import FEN sait désormais charger les deux couleurs et les pièces promues
// (+e/+E), donc les positions sont montées directement. FEN 13 colonnes,
// bordure de 2 incluse ('6k6' = file e) ; rangée du haut = rang 9 (côté noir).
const Jocly = require("../dist/node/jocly.core.js");
let PASS=0, FAIL=0;
function ok(c,msg){ if(c){PASS++; console.log('  \u2713',msg);} else {FAIL++; console.log('  \u2717 ECHEC:',msg);} }
async function strMoves(m){ const M=await m.getPossibleMoves(); const o=[]; for(const mv of M) o.push({mv,s:await m.getMoveString(mv)}); return o; }
async function byStr(m,str){ const L=await strMoves(m); const f=L.find(x=>x.s===str); if(!f) throw new Error('coup introuvable: '+str+' | '+L.map(x=>x.s).join(' ')); return f.mv; }
async function byDest(m,dest){ const L=await strMoves(m); return L.find(x=>x.s.endsWith('-'+dest)||x.s.endsWith('x'+dest)); }

(async()=>{
  // Test 1 : capturer le ROI pendant que le prince vit -> la partie CONTINUE.
  // Roi noir e5 + prince noir c5 ; ors blancs b5,d5 ; roi blanc a1. Blanc joue
  // Gd5xe5 (prend le roi). Il reste un royal noir (le prince) -> non terminé.
  console.log('Test 1 - prise du roi avec prince vivant: la partie continue');
  let m=await Jocly.createMatch('kotaishi-shogi');
  await m.load({game:'kotaishi-shogi', initialBoard:'13/13/13/13/3G+eGk3p2/13/13/13/2K10 w - - 0 1', playedMoves:[]});
  let capK=await byStr(m,'Gd5xe5');
  let r1=await m.applyMove(capK);
  ok(r1 && r1.finished===false, 'non terminé après la prise du roi (le prince reste royal)');
  let resp=await m.getPossibleMoves();
  ok(resp.length>0, 'les noirs ont encore des coups (le prince répond à l\'échec)');

  // Test 2 : roi noir SEUL (dernier royal) -> il peut être MATÉ, victoire blanche.
  // Un coup avant mat : roi noir a9 ; or blanc b7 (->b8 = mat) ; or blanc c8
  // (défend b8, couvre b9/c9) ; roi blanc i1. Blanc au trait.
  console.log('Test 2 - roi seul (dernier royal) matable: gain blanc');
  m=await Jocly.createMatch('kotaishi-shogi');
  await m.load({game:'kotaishi-shogi', initialBoard:'2k10/4G8/3G9/13/13/13/13/13/10K2 w - - 0 1', playedMoves:[]});
  let mate=await byStr(m,'Gb7-b8');
  let r2=await m.applyMove(mate);
  ok(r2 && r2.finished===true, 'partie terminée (mat du roi seul)');
  ok(r2 && r2.winner===1, 'les blancs gagnent (winner=1)');

  // Test 3 : MÊME attaque de mat, mais le camp maté garde un prince ailleurs
  // -> PAS de mat (deux royaux, on peut en abandonner un). Prince noir en e5.
  console.log('Test 3 - roi \u00ab maté \u00bb mais prince en réserve: pas de gain');
  m=await Jocly.createMatch('kotaishi-shogi');
  await m.load({game:'kotaishi-shogi', initialBoard:'2k10/4G8/3G9/13/6+e6/13/13/13/10K2 w - - 0 1', playedMoves:[]});
  let sameMove=await byStr(m,'Gb7-b8');
  let r3=await m.applyMove(sameMove);
  ok(r3 && r3.finished===false, 'non terminé: le roi n\'est pas maté tant que le prince vit');
  let after=await m.getPossibleMoves();
  ok(after.length>0, 'les noirs ont des coups (prince + roi libres)');

  // Test 4 (RÉGRESSION mono-royal) : mat du fou aux échecs standard. Le chemin
  // rapide (cbMaxRoyalRank==1) doit rester identique.
  console.log('Test 4 - régression échecs: mat du fou (chemin mono-royal)');
  let c=await Jocly.createMatch('classic-chess');
  for(const s of ['f2-f3','e7-e5','g2-g4']) await c.applyMove(await byStr(c,s));
  let rc=await c.applyMove(await byStr(c,'Qd8-h4+'));
  ok(rc && rc.finished===true, 'échec et mat détecté');
  ok(rc && rc.winner===-1, 'les noirs gagnent (winner=-1)');

  // Test 5 (RÉGRESSION) : shogi standard ne se termine pas prématurément ;
  // chu-shogi (prince royal + evaluate material-draw) joue sans planter.
  console.log('Test 5 - régression shogi standard + chu-shogi');
  let s=await Jocly.createMatch('shogi');
  let early=false;
  for(let i=0;i<6;i++){ const rr=await s.machineSearch({level:1}); if(!rr||!rr.move){early=true;break;} const res=await s.applyMove(rr.move); if(res&&res.finished){early=true;break;} }
  ok(!early, 'shogi standard: 6 demi-coups sans fin prématurée');
  let ch=await Jocly.createMatch('chu-shogi'); let plies=0, crash=false;
  try{ for(let i=0;i<8;i++){ const r=await ch.machineSearch({level:1}); if(!r||!r.move)break; const res=await ch.applyMove(r.move); plies++; if(res&&res.finished)break; } }catch(e){ crash=true; }
  ok(!crash && plies>=6, 'chu-shogi: partie IA sans plantage ('+plies+' demi-coups)');

  console.log('\nRESULTAT item 3:',PASS,'OK /',FAIL,'ECHEC');
  process.exit(FAIL?1:0);
})().catch(e=>{console.error('ERREUR TEST',e);process.exit(2)});
