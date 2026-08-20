const H=require("./harness.js");
const sb=H.loadModel(["base-model.js","cubic-geo-model.js","3d/cubic-model.js"]);
const game=H.newGame(sb); const geo=game.cbVar.geometry;
const nm=p=>geo.PosName(p);
console.log("pieceTypes:",Object.keys(game.cbVar.pieceTypes).length,"boardSize",geo.boardSize);
const board=H.newBoard(sb,game);
// census
const census=b=>b.pieces.filter(p=>p.p>=0).map(p=>(p.s>0?"w":"b")+game.cbVar.pieceTypes[p.t].fenAbbrev+"@"+nm(p.p)).sort();
console.log("\nInitial position ("+census(board).length+" pieces):");
console.log(census(board).join(" "));
// generate moves for white
board.GenerateMoves(game);
console.log("\nWhite legal moves at start:",board.mMoves.length);
const mv=board.mMoves.slice(0,12).map(m=>{
  let s=(game.cbVar.pieceTypes[board.pieces[board.board[m.f]].t].abbrev||"P")+nm(m.f)+"-"+nm(m.t&0xffff);
  if(m.c!=null)s+="x"; return s;});
console.log("sample:",mv.join("  "));
