const H = require("/home/claude/jocly2/tests/fairy/harness.js");
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
}
const which = process.argv[2];
if(which==="cz") check("crazyhouse", ["base-model.js","grid-geo-model.js","drop-model.js","famous/crazyhouse-model.js"], 90, 5, 12345);
if(which==="shogi") check("shogi", ["base-model.js","grid-geo-model.js","drop-model.js","shogi/shogi-model.js"], 120, 6, 777);
if(which==="mini") check("mini-shogi", ["base-model.js","grid-geo-model.js","drop-model.js","shogi/mini-shogi-model.js"], 120, 5, 4242);
