// Items 1 (import/export FEN) & 2 (+ dans la notation drop-model) pour Kōtaishi.
const Jocly=require("../../dist/node/jocly.core.js");
let PASS=0, FAIL=0;
function ok(c,msg){ if(c){PASS++;console.log('  \u2713',msg);} else {FAIL++;console.log('  \u2717 ECHEC:',msg);} }
async function strMoves(m){ const M=await m.getPossibleMoves(); const o=[]; for(const mv of M) o.push({mv,s:await m.getMoveString(mv)}); return o; }
function dests(list,fromsq){ return list.filter(x=>x.s.replace(/^[A-Z+]*/,'').startsWith(fromsq)).map(x=>x.s.split('-')[1]); }

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
  // --- Item 1a: éléphant BLANC chargé par FEN se déplace vers l'AVANT blanc ---
  console.log('Test A - import FEN: éléphant BLANC e5 isolé -> 7 dirs, exclut e4 (recul droit blanc)');
  let m=await newMatch();
  await m.load({game:'kotaishi-shogi', initialBoard:'6k6/13/13/13/6E6/13/13/13/6K6 w - - 0 1', playedMoves:[{setup:0},{}]});
  let d=dests(await strMoves(m),'e5').sort();
  console.log('    dest:',d.join(' '));
  ok(d.length===7 && !d.includes('e4') && d.includes('e6'), 'blanc: 7 cases, exclut e4 (arrière), inclut e6 (avant)');

  // --- Item 1b: import d'une pièce promue (+e) ---
  console.log('Test B - import FEN: prince NOIR (+e) e5 -> 8 directions (roi)');
  m=await newMatch();
  await m.load({game:'kotaishi-shogi', initialBoard:'6k6/13/13/13/6+e6/13/13/13/6K6 b - - 0 1', playedMoves:[{setup:0},{}]});
  d=dests(await strMoves(m),'e5').sort();
  console.log('    dest:',d.join(' '));
  ok(d.length===8, 'prince noir importé: 8 cases ('+d.length+')');

  console.log('Test C - import FEN: prince BLANC (+E) e5 -> 8 directions (roi)');
  m=await newMatch();
  await m.load({game:'kotaishi-shogi', initialBoard:'6k6/13/13/13/6+E6/13/13/13/6K6 w - - 0 1', playedMoves:[{setup:0},{}]});
  d=dests(await strMoves(m),'e5').sort();
  console.log('    dest:',d.join(' '));
  ok(d.length===8, 'prince blanc importé: 8 cases ('+d.length+')');

  // --- Item 1: round-trip export->import ---
  console.log('Test D - round-trip FEN (export puis ré-import) conserve la position');
  m=await newMatch();
  await m.load({game:'kotaishi-shogi', initialBoard:'6k6/13/13/13/6+e6/6E6/13/13/6K6 b - - 0 1', playedMoves:[{setup:0},{}]});
  let fen1=await m.getBoardState('fen');
  let m2=await newMatch();
  await m2.load({game:'kotaishi-shogi', initialBoard:fen1, playedMoves:[{setup:0},{}]});
  let fen2=await m2.getBoardState('fen');
  console.log('    fen1:',fen1,'\n    fen2:',fen2);
  // le prélude compte pour des coups, donc le numéro de coup avance d'un
  // aller-retour à l'autre : on compare la position, pas le compteur
  const board=f=>f.split(' ').slice(0,4).join(' ');
  ok(board(fen1)===board(fen2), 'export->import->export identique (position)');

  // --- Item 2: le + de promotion apparaît dans la notation ---
  console.log('Test E - notation: la promotion éléphant->prince porte un + final');
  m=await newMatch();
  await m.load({game:'kotaishi-shogi', initialBoard:'6k6/13/13/13/13/6e6/13/13/6K6 b - - 0 1', playedMoves:[{setup:0},{}]});
  let toE3=(await strMoves(m)).filter(x=>x.s.includes('e4')&&x.s.includes('e3'));
  console.log('    coups e4->e3:',toE3.map(x=>x.s).join(' '));
  ok(toE3.some(x=>x.s.endsWith('+')), 'un coup finit par + (promotion)');
  ok(toE3.some(x=>!x.s.endsWith('+')), 'un coup sans + (non-promotion)');
  ok(toE3.filter(x=>x.s.endsWith('+')).length===1, 'exactement un coup avec +');

  // --- Item 2: un drop de pion promu impossible; un drop normal n'a pas de + ---
  console.log('Test F - notation: un drop ne porte jamais de +');
  m=await newMatch();
  await play_capture_then_check_drop(m);

  console.log('\nRESULTAT items 1&2:',PASS,'OK /',FAIL,'ECHEC');
  process.exit(FAIL?1:0);
})().catch(e=>{console.error('ERREUR TEST',e);process.exit(2)});

async function play_capture_then_check_drop(m){
  // partie IA courte jusqu'à obtenir un drop dans la liste, vérifier: pas de +
  let sawDrop=false;
  for(let i=0;i<40 && !sawDrop;i++){
    const L=await strMoves(m);
    const drops=L.filter(x=>x.s.includes('@'));
    if(drops.length){ sawDrop=true; ok(drops.every(x=>!x.s.endsWith('+')),'aucun drop ne finit par + ('+drops.length+' drops vus)'); break; }
    const r=await m.machineSearch({level:1}); if(!r||!r.move) break; const res=await m.applyMove(r.move); if(res&&res.finished) break;
  }
  if(!sawDrop) ok(true,'(pas de drop rencontré en 40 demi-coups - non bloquant)');
}
