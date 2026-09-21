const http=require('http'),fs=require('fs'),path=require('path');
const types={'.html':'text/html','.js':'application/javascript','.wasm':'application/wasm','.json':'application/json','.css':'text/css','.png':'image/png'};
http.createServer((req,res)=>{
  let f=path.join('/tmp/www', decodeURIComponent(req.url.split('?')[0]));
  try { f=fs.realpathSync(f); if(fs.statSync(f).isDirectory()) f=path.join(f,'index.html');
    res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream',
      'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'});
    fs.createReadStream(f).pipe(res);
  } catch(e){ res.writeHead(404); res.end(); }
}).listen(8778);
