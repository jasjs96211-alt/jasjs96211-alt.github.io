import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';
test('real HTTP startup serves workbench assets, denies server secrets and returns unconfigured AI503',async()=>{
 const child=spawn(process.execPath,['wendao/server/launcher.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,WORKBENCH_PORT:'18765',CHAT_PORT:'18787',MODEL_API_KEY:'',MODEL_BASE_URL:'',MODEL_NAME:'',REMOTE_MODE:'false'}});let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
 try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server startup timeout '+output)),5000);child.once('exit',()=>{clearTimeout(timer);reject(Error(output))});child.stdout.on('data',()=>{if(output.includes('18765')){clearTimeout(timer);resolve()}})});
 for(const path of ['/','/wendao/engine.js','/wendao/app.js','/wendao/assets/sister-calm.webp','/wendao/assets/sister-concerned.webp','/wendao/assets/sister-ill.webp','/wendao/assets/sister-injured.webp','/wendao/assets/sister-relieved.webp','/sw.js'])assert.equal((await fetch('http://127.0.0.1:18765'+path)).status,200,path);
 for(const path of ['/wendao/server/chat-proxy.mjs','/.env','/wendao/server/.env','/tests/v1.3.mjs','/ios/README.md','/%2eenv'])assert.equal((await fetch('http://127.0.0.1:18765'+path)).status,404,path);
 const r=await fetch('http://127.0.0.1:18787/api/chat',{method:'POST',headers:{Origin:'http://127.0.0.1:18765','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,503);assert.match(await r.text(),/未连接在线 AI/)
 }finally{child.kill();await once(child,'exit')}
});
