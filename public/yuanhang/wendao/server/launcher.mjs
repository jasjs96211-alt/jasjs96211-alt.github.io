import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
import {createProxy} from './chat-proxy.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const port=Number(process.env.WORKBENCH_PORT||8765),chatPort=Number(process.env.CHAT_PORT||8787);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const allowed=/^\/(?:index\.html|usage\.js|cloud\.js|sw\.js|icon\.svg|manifest\.webmanifest|wendao\/(?:engine\.js|story\.js|app\.js|transport\.js|style\.css|assets\/[a-z-]+\.(?:webp|png|jpg)))$/;
const server=http.createServer(async(req,res)=>{try{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return}
 if(!/^(?:127\.0\.0\.1|localhost):\d+$/.test(req.headers.host||'')){res.writeHead(403).end();return}
 const u=new URL(req.url,'http://127.0.0.1:'+port),name=decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname);
 // Explicit public asset list keeps server env, quota ledger, backups and tests private.
 if(!allowed.test(name)){res.writeHead(404).end('Not found');return}
 const path=resolve(root,'.'+name);if(!path.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403).end();return}
 const data=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}).end(req.method==='HEAD'?undefined:data)
 }catch{res.writeHead(404).end('Not found')}});
server.listen(port,'127.0.0.1',()=>console.log('打开 http://127.0.0.1:'+port+' 。本地入口与线上入口数据独立，请使用完整JSON合并迁移。'));
createProxy({origins:(process.env.ALLOWED_ORIGINS||'https://jasjs96211-alt.github.io,http://127.0.0.1:'+port+',http://localhost:'+port).split(',')}).listen(chatPort,'127.0.0.1');
