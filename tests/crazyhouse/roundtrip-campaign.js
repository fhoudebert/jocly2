const H = require("../fairy/harness.js");
function check(name, SCRIPTS, plies, trials, seed0){
  const cz = H.context(SCRIPTS);
  const {sandbox, game, geo, types} = cz;
  const moves = b => { b.mMoves=[]; b.GenerateMoves(game); return b.mMoves; };
  const onBoard = p => !!geo.BOARD_AREA[p];
  const men = b => b.pieces.filter(p=>p.p>=0 && types[p.t].name!=="counter")
      .map(p=>p.p+":"+types[p.t].name+":"+p.s).sort().join(" ");
  const cnt = b => b.pieces.filter(p=>p.p>=0 && types[p.t].name==="counter")
      .map(p=>p.p+":"+p.t).sort().join(" ");
  let seed=seed0, bad=0, deep=0, checked=0;
  const rnd=()=> (seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
  for(let trial=0; trial<trials; trial++){
    const b=H.newBoard(sandbox,game); game.mPlayedMoves=[];
    const shots=[];
    for(let i=0;i<plies;i++){
      const ms=moves(b); if(!ms.length) break;
      const caps=ms.filter(m=>m.c!=null);
      const pool = caps.length && rnd()<0.6 ? caps : ms;
      b.ApplyMove(game,pool[Math.floor(rnd()*pool.length)]); b.mWho=-b.mWho;
      if(i%5===0){ const c={}; b.pieces.forEach(p=>{if(p.p>=0&&!onBoard(p.p)&&types[p.t].name!=="counter")c[p.p]=(c[p.p]||0)+1;});
        shots.push({fen:b.ExportBoardState(game), men:men(b), cnt:cnt(b), who:b.mWho,
          moves:moves(b).map(x=>cz.engine(x)).sort().join(" "),
          depth:Math.max(0,...Object.values(c))}); }
    }
    for(const shot of shots){
      deep=Math.max(deep,shot.depth); checked++;
      const back=sandbox.Model.Game.Import("pjn",shot.fen);
      game.mInitial=back.initial;
      const b2=H.newBoard(sandbox,game); delete game.mInitial;
      b2.mWho=shot.who;
      if(men(b2)!==shot.men){ bad++; if(bad<3){console.log("  MEN, depth",shot.depth,"\n   was:",shot.men,"\n   got:",men(b2));} continue; }
      if(cnt(b2)!==shot.cnt){ bad++; if(bad<3) console.log("  COUNTERS, depth",shot.depth,"\n   was:",shot.cnt,"\n   got:",cnt(b2)); continue; }
      if(moves(b2).map(x=>cz.engine(x)).sort().join(" ")!==shot.moves){ bad++; if(bad<3) console.log("  MOVES, depth",shot.depth); }
    }
  }
  console.log(name+": "+checked+" positions, deepest hand "+deep+", mismatches "+bad);
  return bad;
}
/*
 * CETTE SUITE NE FAISAIT RIEN.
 *
 * Les trois campagnes etaient conditionnees a un argument de ligne de
 * commande, que tests/run.js ne passe pas : lancee par la suite complete,
 * elle n'imprimait rien, ne verifiait rien, et comptait parmi les suites qui
 * passent. Sans argument, elle les joue donc toutes les trois -- c'est ce
 * qu'elle est faite pour faire -- et un argument n'en garde qu'une, pour
 * boucler vite sur une famille pendant une mise au point.
 *
 * Et une discordance ECHOUE : elle signifie qu'une position ne se relit pas
 * comme elle s'est ecrite, main comprise. C'est exactement ce que cette
 * campagne cherche, et elle le comptait sans en tirer de verdict.
 */
const FAMILIES = {
	cz:    ["crazyhouse", ["base-model.js","grid-geo-model.js","drop-model.js","famous/crazyhouse-model.js"], 90, 5, 12345],
	shogi: ["shogi",      ["base-model.js","grid-geo-model.js","drop-model.js","shogi/shogi-model.js"], 120, 6, 777],
	mini:  ["mini-shogi", ["base-model.js","grid-geo-model.js","drop-model.js","shogi/mini-shogi-model.js"], 120, 5, 4242],
};
const which = process.argv[2];
const wanted = which ? [which] : Object.keys(FAMILIES);
let bad = 0;
for(const key of wanted) {
	if(!FAMILIES[key]) { console.log("famille inconnue : " + key); process.exit(2); }
	bad += check(...FAMILIES[key]);
}
console.log(bad ? ("FAILED: " + bad + " position(s) ne se relisent pas comme elles s'ecrivent")
	: "ok   aller-retour du FEN verifie sur " + wanted.join(", "));
process.exit(bad ? 1 : 0);
