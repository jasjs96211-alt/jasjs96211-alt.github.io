// Isolated deterministic checks for Safari/Desktop three-way conflict resolution.
// Run with: node --test public/yuanhang/tests/sync-conflict-review.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const engineCode=readFileSync(new URL('../wendao/engine.js',import.meta.url),'utf8');
const cloudCode=readFileSync(new URL('../cloud.js',import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
function boot(){
 const w={};new Function('window',engineCode)(w);
 const C=new Function('window','document',cloudCode+';return YuanhangCloud;')(w,undefined);
 return {E:w.WendaoEngine,C};
}
function fixture(){
 const {E,C}=boot(),start=Date.parse('2026-10-15T20:00:00+08:00'),at=Date.parse('2026-10-16T13:00:00+08:00');
 const event=id=>({id,title:id,category:id==='ddl'?'ddl':'study',start:'2026-10-14',end:'2026-10-15',done:false});
 const study={events:[event('ddl'),...['one','two','three','four'].map(event)],sessions:[],usageSessions:[],screen:{}};
 const baseW=E.baseline(E.fresh(start),study);E.watchDeadlines(baseW,study,start);
 const hurt=E.migrateLegacySave(baseW);E.checkDeadlines(hurt,study,at);
 const clean=w=>{const t=clone(w);t.revision=0;delete t.lastAIConnection;t.assets={};t.settings.chatEndpoint='';t.settings.online=false;
  Object.assign(t.supervision,{mode:'exempt',cursor:0,idle:0,pending:null,modeStart:0});
  for(const k of ['pending','lastCheck','offlinePending','cloudPending','clockPending'])delete t.supervision.deadlines[k];
  return t;
 };
 const base={...study,wendao:clean(baseW)},local=clone(base),remote={...clone(study),wendao:clean(hurt)};
 for(const id of ['one','two','three','four']){
  local.events.find(e=>e.id===id).title='Safari '+id;
  remote.events.find(e=>e.id===id).title='Desktop '+id;
 }
 return {E,C,base,local,remote,clean};
}
test('four real task conflicts are reported without changing local/cloud inputs',()=>{
 const {C,base,local,remote}=fixture(),beforeLocal=JSON.stringify(local),beforeRemote=JSON.stringify(remote);
 const result=C.reconcile(base,local,remote);
 assert.equal(result.conflicts.length,4);
 assert.deepEqual(result.conflicts.map(c=>c.field),['events','events','events','events']);
 assert.equal(JSON.stringify(local),beforeLocal);assert.equal(JSON.stringify(remote),beforeRemote);
});
test('independent DDL injury and chat history survive per-row choices and no duplicate penalty',()=>{
 const {C,base,local,remote}=fixture(),result=C.reconcile(base,local,remote);
 const merged=C.resolveConflicts(result,local,remote,['remote','local','remote','local']);
 assert.equal(merged.events.find(e=>e.id==='one').title,'Desktop one');
 assert.equal(merged.events.find(e=>e.id==='two').title,'Safari two');
 assert.equal(merged.wendao.supervision.deadlines.punishments.length,1);
 assert.ok(merged.wendao.character.health<78);
 assert.equal(C.reconcile(merged,merged,merged).data.wendao.supervision.deadlines.punishments.length,1);
 assert.equal(C.pendingChanges(merged,merged),0);
});
test('Wendao choices and settings are explicit conflicts, never merged by blind overwrite',()=>{
 const {C,base,local,remote}=fixture();
 local.wendao.settings.target=160;remote.wendao.settings.target=300;
 const conflicts=C.reconcile(base,local,remote);
 assert.equal(conflicts.conflicts.length,5);
 assert.ok(conflicts.conflicts.some(c=>c.field==='wendao'&&c.id==='settings.target'));
 const index=conflicts.conflicts.findIndex(c=>c.id==='settings.target');
 const choices=conflicts.conflicts.map((_,i)=>i===index?'remote':'local');
 const merged=C.resolveConflicts(conflicts,local,remote,choices);
 assert.equal(merged.wendao.settings.target,300);
 assert.equal(merged.wendao.supervision.deadlines.punishments.length,1);
});
test('deletion against modification requires explicit choice and deletion can be selected',()=>{
 const {C,base,local,remote}=fixture();
 remote.events=remote.events.filter(e=>e.id!=='one');
 const result=C.reconcile(base,local,remote),index=result.conflicts.findIndex(x=>x.id==='one');
 assert.ok(index>=0);
 const selected=result.conflicts.map((_,i)=>i===index?'remote':'local');
 assert.equal(C.resolveConflicts(result,local,remote,selected).events.some(e=>e.id==='one'),false);
});
test('incomplete or unsupported choices fail closed, and R3 scripts match the SW cache',()=>{
 const {C,base,local,remote}=fixture(),result=C.reconcile(base,local,remote);
 assert.throws(()=>C.resolveConflicts(result,local,remote,['remote']),/逐项/);
 assert.throws(()=>C.resolveConflicts({data:result.data,conflicts:[{field:'wendao',id:'story-state'}]},local,remote,['remote']),/不能自动处理/);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(html,/cloud\.js\?v=20261016-sync-r3/);
 assert.match(sw,/cloud\.js\?v=20261016-sync-r3/);
});
