// Offline fixtures only: no real account, credentials, browser storage or network.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const cloud=readFileSync(new URL('../cloud.js',import.meta.url),'utf8');
const engine=readFileSync(new URL('../wendao/engine.js',import.meta.url),'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
const META='yuanhang_account_sync_v1',KEY='fixture-study';
const at=Date.parse('2026-10-16T12:00:00+08:00');
const study=()=>({events:[{id:'a',title:'Original'}],sessions:[],screen:{},usageSessions:[]});
function boot(){
 const context=vm.createContext({console,Date,Intl,Math,JSON,Map,Set,URL,AbortSignal,window:{}});
 vm.runInContext(engine,context);vm.runInContext(cloud,context);
 return {E:context.window.WendaoEngine,C:vm.runInContext('YuanhangCloud',context)};
}
function account(){
 const initial=study(),storage=new Map(),elements=new Map();
 const element=()=>({children:[],style:{},value:'',textContent:'',append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},scrollIntoView(){}});
 const $=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
 const session={access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:9999999999,user:{id:'fixture-user'}};
 storage.set(META,JSON.stringify({session,enabled:true,base:clone(initial)}));storage.set(KEY,JSON.stringify(initial));
 let row={revision:1,payload:clone(initial)},beforePatch;
 const context=vm.createContext({console,Date,Intl,Math,JSON,Map,Set,URL,AbortSignal,$,STORAGE:KEY,state:clone(initial),
  latestUsageState:()=>clone(context.state),validBackup:x=>!!x&&Array.isArray(x.events)&&Array.isArray(x.sessions),
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  location:{origin:'https://fixture.invalid'},window:{addEventListener(){}},document:{hidden:false,addEventListener(){},createElement:element},navigator:{},
  setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,confirm:()=>true,clearUsagePreview(){},resetBackupMerge(){},restoreTimer(){},render(){},
  fetch:async(url,options)=>{let data;if(options.method==='GET')data=[clone(row)];else{beforePatch?.();const expected=Number(new URL(url).searchParams.get('revision').slice(3));if(expected!==row.revision)data=[];else{const b=JSON.parse(options.body);row={revision:b.revision,payload:b.payload};data=[{revision:row.revision}]}}return {ok:true,json:async()=>data}}});
 vm.runInContext(cloud,context);
 return {context,storage,$,get row(){return row},set row(v){row=v},set beforePatch(fn){beforePatch=fn},sync:()=>$('accountSyncNow').onclick()};
}
test('reconcile never derives into input snapshots, including unchanged or one-sided Wendao',()=>{
 const {E,C}=boot();const base={...study(),wendao:E.fresh(at)},local=clone(base),remote=clone(base);
 remote.wendao.chat.push({id:'remote',text:'hello'});
 const before=[base,local,remote].map(JSON.stringify);C.reconcile(base,local,remote);
 assert.deepEqual([base,local,remote].map(JSON.stringify),before);
 C.reconcile(base,base,base);assert.equal(JSON.stringify(base),before[0]);
});
test('post-upload concurrent conflict has a matching recoverable baseline and revision',async()=>{
 const a=account();a.context.state.sessions.push({id:'local-session',minutes:5});
 a.row={revision:2,payload:{...study(),events:[{id:'a',title:'Remote edit'}]}};
 a.beforePatch=()=>{a.context.state.events[0].title='Edit during upload'};
 await a.sync();
 const cfg=JSON.parse(a.storage.get(META)),snap=JSON.parse(a.storage.get(KEY+'_cloud_conflict_snapshot'));
 assert.equal(a.row.revision,3);assert.equal(a.context.state.events[0].title,'Edit during upload');
 assert.equal(a.row.payload.events[0].title,'Remote edit');assert.deepEqual(cfg.base,snap.base);assert.equal(snap.revision,3);
 assert.equal(cfg.conflictCount,1);
 // Review the actual snapshot through the user-facing handlers, then retry CAS.
 a.beforePatch=null;a.$('accountReviewConflicts').onclick();
 const walk=node=>[node,...(node.children||[]).flatMap(walk)];
 const nodes=walk(a.$('accountConflictPanel')),select=nodes.find(n=>n.children?.some(c=>c.value==='local'));
 assert.ok(select);select.value='local';
 const submit=nodes.find(n=>n.textContent==='确认选择并安全合并');assert.ok(submit);await submit.onclick();
 assert.equal(a.row.payload.events[0].title,'Edit during upload');
 assert.equal(JSON.parse(a.storage.get(META)).conflictCount,0);assert.equal(a.row.payload.sessions.length,1);
});
