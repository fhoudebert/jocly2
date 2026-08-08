/*
	Checks that every aspect used by the Tenjiku model is wired to a sprite
	column in shogi/tenjiku-set-view.js, and that both 2D sheets share the same
	layout (the mnemonic skin only swaps the file, it keeps the clipx values).
	Run with:  node tests/tenjiku-view.js
*/

var fs=require("fs");
var path=require("path");

var base=path.join(__dirname,"..","src","games","chessbase");
var model=fs.readFileSync(path.join(base,"shogi","tenjiku-shogi-model.js"),"utf8");
var setView=fs.readFileSync(path.join(base,"shogi","tenjiku-set-view.js"),"utf8");
var view=fs.readFileSync(path.join(base,"shogi","tenjiku-shogi-view.js"),"utf8");

var passed=0, failed=0;
function check(name,cond,info) {
	if(cond) { passed++; console.log("  ok   "+name); }
	else { failed++; console.log("  FAIL "+name+(info!==undefined?"   -> "+info:"")); }
}

// aspects declared by the set-view, with their sprite column
var columns={};
var re=/"(sh-[a-z0-9-]+)":\s*\{"2d":\{clipx:\s*(\d+)\}\}/g, m;
while((m=re.exec(setView))!==null)
	columns[m[1]]=parseInt(m[2]);
check("set-view declares the shared Chu/Tenjiku aspects",Object.keys(columns).length>60,
	Object.keys(columns).length);

// aspects used by the model
var used={};
re=/aspect:\s*'([^']+)'/g;
while((m=re.exec(model))!==null)
	used[m[1]]=(used[m[1]]||0)+1;
var missing=Object.keys(used).filter(function(aspect) { return columns[aspect]===undefined; });
check("every model aspect has a sprite column",missing.length===0,missing.join(", "));
check("all 88 piece types have an aspect",
	(model.match(/aspect:\s*'/g)||[]).length===88,(model.match(/aspect:\s*'/g)||[]).length);

// sprite sheets
["tenjiku-shogi-picto-sprites.png","tenjiku-shogi-mnemonic-sprites.png"].forEach(function(file) {
	var full=path.join(base,"res","shogi",file);
	check(file+" is present",fs.existsSync(full));
	if(!fs.existsSync(full)) return;
	var buffer=fs.readFileSync(full);
	// PNG header: width/height are big endian at offset 16 and 20
	var width=buffer.readUInt32BE(16), height=buffer.readUInt32BE(20);
	check(file+" is 7500x200 (75 columns of 100px, 2 rows)",width===7500 && height===200,
		width+"x"+height);
	var maxColumn=Math.max.apply(null,Object.keys(used).map(function(a) { return columns[a]||0; }));
	check(file+" covers the highest column used ("+maxColumn+")",maxColumn+100<=width);
});

// the view must wire both 2D skins
check("view uses the picto style as default 2D",/cbChuPieceStyle\(/.test(view));
check("view wires the mnemonic sheet under skin2dmnemonic",
	/"skin2dmnemonic":\s*this\.cbChuMnemonicPieceStyle\(\)\["default"\]\["2d"\]/.test(view));

// and index.js must declare the two skins with the right preloads
var index=fs.readFileSync(path.join(base,"index.js"),"utf8");
var entry=index.split('"name": "tenjiku-shogi"')[1]||"";
entry=entry.split('"viewScripts"')[0];
check("index.js declares the 2D Classic skin",/"name": "skin2d"/.test(entry));
check("index.js declares the 2D Mnemonic skin",/"name": "skin2dmnemonic"/.test(entry));
check("2D Classic preloads the picto sheet",/tenjiku-shogi-picto-sprites\.png/.test(entry));
check("2D Mnemonic preloads the mnemonic sheet",/tenjiku-shogi-mnemonic-sprites\.png/.test(entry));

console.log("\n"+passed+" passed, "+failed+" failed");
process.exit(failed?1:0);
