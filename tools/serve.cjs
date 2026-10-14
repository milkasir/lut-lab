// Zero-dependency local preview. Requires Node.js 18+.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.LUT_LAB_PORT || 8787);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.cube':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
const server = http.createServer((req,res)=>{
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch (_) { res.writeHead(400); res.end('Invalid URL'); return; }
  const file = path.resolve(root,'.'+pathname.replace(/\/$/,'/index.html'));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  fs.stat(file,(error,stat)=>{
    if(error||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(file).pipe(res);
  });
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is in use. Close the other preview or set LUT_LAB_PORT.`:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{console.log(`LUT LAB: http://127.0.0.1:${port}\nPress Ctrl+C to stop.`);});
