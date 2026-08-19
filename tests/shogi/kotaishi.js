// Tests jocly natifs pour Kōtaishi Shogi (éléphant ivre + prince, drops).
// On emprunte le VRAI chemin de l'app : position initiale (tableaux `initial`)
// + coups joués (applyMove). Les tests par FEN utilisent l'éléphant NOIR, seul
// correctement désambiguïsé par l'import FEN partagé (limite préexistante du
// dépôt, sans effet sur le jeu réel ni le save/load PJN).
const Jocly = require("../../dist/node/jocly.core.js");
let PASS=0, FAIL=0;
function ok(c,msg){ if(c){PASS++; console.log('  \u2713',msg);} else {FAIL++; console.log('  \u2717 ECHEC:',msg);} }
async function strMoves(m){ const M=await m.getPossibleMoves(); const o=[]; for(const mv of M) o.push({mv,s:await m.getMoveString(mv)}); return o; }
async function play(m,str){ const L=await strMoves(m); const f=L.find(x=>x.s===str); if(!f) throw new Error('coup introuvable: '+str+' | dispo: '+L.map(x=>x.s).join(' ')); await m.applyMove(f.mv); }
function dests(list,piecePrefix,fromsq){ return list.filter(x=>x.s.replace(/^[A-Z+]*/,'').startsWith(fromsq)).map(x=>x.s.split('-')[1]); }

/*
 * Kotaishi opens with a prelude asking whether to play with drops (Kotaishi)
 * or without (Sho Shogi), so a match has to answer that before it has a
 * position. Choice 0 is Kotaishi, which is what these suites are about.
 */
async function newMatch(choice) {
  const m = await Jocly.createMatch('kotaishi-shogi');
  // the prelude has two stages: the choice, then a pass so that White still
  // moves first. A prelude move has no 'f' field.
  for (;;) {
    const moves = await m.getPossibleMoves();
    if (!moves.length || moves[0].f !== undefined) return m;
    await m.applyMove(moves[moves.length > 1 ? (choice || 0) : 0]);
  }
}

(async()=>{
  // Test 1 (chemin réel): éléphant blanc e2 à l'ouverture -> exactement d2,f2
  console.log('Test 1 - ouverture: éléphant blanc e2 -> {d2,f2}');
  let m=await newMatch();
  let d=dests(await strMoves(m),'DE','e2').sort();
  console.log('    dest:',d.join(' '));
  ok(d.length===2 && d.includes('d2') && d.includes('f2'), 'seulement d2,f2 (avant/diag bloqués par pions, arrière par généraux)');

  // Test 2 (chemin réel): après avoir dégagé e3, l'éléphant peut avancer en e3
  console.log('Test 2 - avance vers l’avant une fois e3 dégagé');
  m=await newMatch();
  await play(m,'e3-e4');            // pion blanc avance
  await play(m,'e7-e6');            // coup noir quelconque
  d=dests(await strMoves(m),'DE','e2').sort();
  console.log('    dest éléphant e2:',d.join(' '));
  ok(d.includes('e3'), 'e3 (avant) désormais accessible');

  // Test 3 (FEN, éléphant NOIR correct): 7 directions sauf droit derrière (e6)
  console.log('Test 3 - éléphant noir e5 isolé: 7 dirs, exclut e6 (recul droit)');
  m=await newMatch();
  await m.load({game:'kotaishi-shogi', initialBoard:'6k6/13/13/13/6e6/13/13/13/6K6 b - - 0 1', playedMoves:[{setup:0},{}]});
  d=dests(await strMoves(m),'DE','e5').sort();
  console.log('    dest:',d.join(' '));
  ok(d.length===7, '7 cases ('+d.length+')');
  ok(!d.includes('e6') && d.includes('e4'), 'exclut e6 (recul droit), autorise e4 (avant noir)');
  ok(['d4','d5','d6','e4','f4','f5','f6'].every(x=>d.includes(x)), 'les 7 bonnes cases');

  // Test 4 (FEN noir): promotion optionnelle en zone (rangs 1-3 pour noir).
  // NB: la notation « naturelle » de ce moteur n'expose PAS le suffixe de
  // promotion pour les jeux à parachutage (drop-model.js reconstruit le coup
  // sans le champ `pr`) - vrai pour TOUTES les variantes shogi du dépôt. On
  // distingue donc promotion / non-promotion via le champ `mv.pr` (25=éléphant
  // noir, 27=prince noir), pas via la chaîne.
  console.log('Test 4 - éléphant noir e4 -> e3 (entrée zone noire): promotion optionnelle');
  m=await newMatch();
  await m.load({game:'kotaishi-shogi', initialBoard:'6k6/13/13/13/13/6e6/13/13/6K6 b - - 0 1', playedMoves:[{setup:0},{}]});
  let toE3=(await strMoves(m)).filter(x=>x.s.includes('e3'));
  console.log('    coups e4->e3:',toE3.map(x=>x.s+'(pr='+x.mv.pr+')').join(' '));
  ok(toE3.some(x=>x.mv.pr===27), 'un coup de promotion (pr=27 prince noir)');
  ok(toE3.some(x=>x.mv.pr===25), 'un coup sans promotion (pr=25, optionnelle)');
  // exécuter la promotion et vérifier le prince
  let promo=toE3.find(x=>x.mv.pr===27);
  await m.applyMove(promo.mv);
  let fen=await m.getBoardState('fen');
  console.log('    FEN après promo:',fen);
  ok(/\+e/i.test(fen),'prince (+E/+e) présent après promotion');

  // Test 5: le prince bouge comme un roi (8 directions). Deux limites
  // préexistantes du dépôt guident le montage: (a) l'import FEN ne charge pas
  // les pièces promues (préfixe « + » rejeté) et (b) il ne désambiguïse que
  // l'éléphant NOIR. On FABRIQUE donc un prince NOIR par promotion (e4->e3),
  // on joue un coup d'attente blanc, puis on compte les cases du prince noir
  // isolé en e3 (rangée 3, ses 8 voisines sont sur le damier).
  console.log('Test 5 - prince noir e3 isolé (obtenu par promotion): 8 directions');
  m=await newMatch();
  await m.load({game:'kotaishi-shogi', initialBoard:'6k6/13/13/13/13/6e6/13/13/6K6 b - - 0 1', playedMoves:[{setup:0},{}]});
  let promo5=(await strMoves(m)).find(x=>x.s.includes('e4')&&x.s.includes('e3')&&x.mv.pr===27);
  ok(!!promo5, 'promotion e4->e3 dispo (prince noir, pr=27)');
  await m.applyMove(promo5.mv);                  // noir promeut -> prince en e3
  const wwait=await m.getPossibleMoves();        // au tour des blancs: coup d'attente
  await m.applyMove(wwait[0]);
  let pl=await strMoves(m);
  d=dests(pl,'+DE','e3').sort();
  console.log('    dest prince e3:',d.join(' '));
  ok(d.length===8, '8 cases ('+d.length+')');
  ok(['d2','d3','d4','e2','e4','f2','f3','f4'].every(x=>d.includes(x)),'les 8 cases du roi');

  // Test 6 (chemin réel): partie IA courte, aucun plantage
  console.log('Test 6 - partie IA (niveau bas) ~24 demi-coups, sans plantage');
  m=await newMatch();
  let plies=0, crashed=false;
  try{
    for(let i=0;i<24;i++){
      const r=await m.machineSearch({level:1});
      if(!r || !r.move){ break; }
      const res=await m.applyMove(r.move);
      plies++;
      if(res && res.finished){ console.log('    partie terminée au demi-coup',plies); break; }
    }
  }catch(e){ crashed=true; console.log('    plantage:',e && e.message); }
  ok(!crashed && plies>=10, 'au moins 10 demi-coups joués sans erreur ('+plies+')');

  console.log('\nRESULTAT:',PASS,'OK /',FAIL,'ECHEC');
  process.exit(FAIL?1:0);
})().catch(e=>{console.error('ERREUR TEST',e);process.exit(2)});
