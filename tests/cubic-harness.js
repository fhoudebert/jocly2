const fs=require("fs"),path=require("path"),vm=require("vm");
const SRC=path.join(__dirname,"..","src");
function loadModel(scripts){
  const sb={console,Math,Int32Array,Int16Array,Uint8Array,Float64Array,Object,Array,JSON,
    Model:{Game:{},Board:{},Move:{}},exports:{},module:{},setTimeout};
  sb.global=sb; sb.window=sb; vm.createContext(sb);
  ["jocly.util.js","jocly.game.js"].forEach(f=>vm.runInContext(fs.readFileSync(path.join(SRC,"core",f),"utf8"),sb,{filename:f}));
  scripts.forEach(s=>vm.runInContext(fs.readFileSync(path.join(SRC,"games","chessbase",s),"utf8"),sb,{filename:s}));
  return sb;
}
function newGame(sb){ const g=Object.create(sb.Model.Game); g.g={}; g.InitGame(); return g; }
function newBoard(sb,game){ const b=Object.create(sb.Model.Board); b.Init&&b.Init(game); b.InitialPosition(game); return b; }
module.exports={loadModel,newGame,newBoard};

// build a board from explicit piece list: [{s,abbrev,pos,m}], turn
function setup(sb,game,list,who){
  const types=game.cbVar.pieceTypes;
  const pieces=list.map(x=>{ let t=null; for(const k in types) if(types[k].abbrev===x.abbrev||(x.abbrev===''&&types[k].fenAbbrev==='P'&&types[k].name.startsWith(x.pawnName||'pawn'))) t=parseInt(k);
    if(x.type!==undefined)t=x.type; if(t===null)throw new Error("unknown "+x.abbrev);
    return {s:x.s,t:t,p:x.pos,m:x.m===undefined?true:x.m}; });
  game.mInitial={pieces,turn:who===undefined?1:who};
  const b=Object.create(sb.Model.Board); b.Init&&b.Init(game); b.InitialPosition(game);
  delete game.mInitial; return b;
}
module.exports.setup=setup;
