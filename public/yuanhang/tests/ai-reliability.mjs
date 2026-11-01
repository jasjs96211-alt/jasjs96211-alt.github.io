import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createProxy} from '../wendao/server/chat-proxy.mjs';
import {environmentPath} from '../wendao/server/environment.mjs';
const origin='https://jasjs96211-alt.github.io';
const payload={requestId:'retry-safe',messages:[{role:'user',content:'请根据已发生的事留言'}],context:{sceneView:{sceneId:'opening'},autonomyState:{activity:'疗养'},rhythmState:{phase:'sleep'},proactiveEvent:{id:'study:s1',kind:'study'}}};
async function server(options,fn){const s=createProxy(options);await new Promise(r=>s.listen(0,'127.0.0.1',r));try{return await fn('http://127.0.0.1:'+s.address().port)}finally{await new Promise(r=>s.close(r))}}
const post=(url,p=payload)=>fetch(url+'/api/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(p)});
test('ambiguous provider failure remains idempotent across retries and process restart',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'wd-idempotent-'));let calls=0;
 const opts={key:'fixture-secret',base:'https://provider.invalid/v1',model:'fixture',ledgerFile:join(dir,'calls.json'),fetcher:async()=>{calls++;throw Error('provider may have completed')}};
 try {await server(opts,async u=>{for(let i=0;i<2;i++){const r=await post(u);assert.equal(r.status,502);assert.equal((await r.json()).code,'upstream_timeout_or_network')}});
 await server(opts,async u=>assert.equal((await post(u)).status,502));assert.equal(calls,1);
 assert.doesNotMatch(readFileSync(opts.ledgerFile,'utf8'),/fixture-secret|provider may have completed/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('provider quota classification and allowed proactive context do not grant state writes',async()=>{
 await server({key:'fixture-secret',base:'https://provider.invalid/v1',model:'fixture',fetcher:async(_url,opts)=>{const body=JSON.parse(opts.body);const facts=JSON.parse(body.messages[1].content.split('\n').slice(1).join('\n'));assert.equal(facts.autonomyState.activity,'疗养');assert.equal(facts.proactiveEvent.id,'study:s1');assert.match(body.messages[0].content,/不能修改数值/);return {ok:false,status:429}}},async u=>{const r=await post(u);assert.equal(r.status,502);assert.equal((await r.json()).code,'provider_quota_or_rate_limit')});
});
test('status exposes missing configuration and auth mode, never credentials',async()=>{
 await server({key:'',base:'',model:''},async u=>{const r=await fetch(u+'/api/status',{headers:{Origin:origin}}),v=await r.json();assert.equal(v.configured,false);assert.equal(v.authMode,'loopback');assert.equal(v.missing.length,3)});
 assert.ok(environmentPath.replaceAll('\\','/').endsWith('/.env.local'));assert.ok(!environmentPath.replaceAll('\\','/').includes('/public/'));
 const launcher=readFileSync(new URL('../wendao/server/launcher.mjs',import.meta.url),'utf8');assert.ok(launcher.includes('transport\\.js'));
});
