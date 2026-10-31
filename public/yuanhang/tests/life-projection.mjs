import test from 'node:test';
import assert from 'node:assert/strict';
import '../wendao/engine.js';
import '../wendao/life-projection.js';
import '../wendao/world.js';
const E=globalThis.WendaoEngine,P=globalThis.WendaoLifeProjection,W=globalThis.WendaoWorld;
const at=Date.parse('2026-10-31T09:00:00+08:00'),M=60000;
const origin=()=>{const s=E.fresh(at-300000);s.character.state='normal';s.life.ledger=[];s.life.cursor=at;return s};
const add=(s,{id='life:v4:2026-10-31:2',time=at,kind='study',body='normal'}={})=>{
const row={id,at:time,kind,activity:'研读医理',text:'核对早晨医理',bodyState:body,chapter:'chapter-9-preparation',delta:{autonomy:1,cultivation:3,pressure:0}};
s.life.ledger.push(row);return row};
const render=(s,when=at,focus={running:true})=>{
const lifeProjection=P.getLifeProjection({state:s,at:when});
return W.derive({at:when,state:{portrait:{state:'normal'},vitals:{stamina:90,mood:70,mp:90},lifeProjection,schedule:s.life.ledger.at(-1)},focus,playerPlace:'study',following:false});
};
test('current event governs world location independently of player focus timer',()=>{
const s=origin();const base=add(s);const p=P.getLifeProjection({state:s,at:at+2*M});
assert.equal(p.valid,true);assert.equal(p.eventId,base.id);assert.equal(p.sourceEventId,base.id);assert.equal(p.location,'study');
const world=render(s,at+2*M);assert.equal(world.sister,'study');assert.equal(world.activity.title,base.activity);
const w2=render(s,at+2*M,{running:false});assert.equal(w2.activity.title,world.activity.title);
});
test('L1 detail remains linked to source and does not count as another base activity',()=>{
const s=origin();const base=add(s);const detail={id:'life:detail:v1:'+base.id+':0',at:at+15*M,kind:'detail',step:0,sourceEventId:base.id,previousEventId:base.id,activity:'摘记医理疑问',text:'记下未决问题',bodyState:'normal',location:'study',detailVersion:1,delta:{autonomy:0,cultivation:0,pressure:0}};
s.life.ledger.push(detail);
const before=JSON.stringify(s),p=P.getLifeProjection({state:s,at:detail.at+M});
assert.equal(p.valid,true);assert.equal(p.eventId,detail.id);assert.equal(p.sourceEventId,base.id);assert.equal(p.kind,'study');assert.equal(p.title,'摘记医理疑问');assert.equal(JSON.stringify(s),before);
});
test('unresolved or future-only events never become current on-screen facts',()=>{
const s=origin();add(s,{time:at+M});
assert.equal(P.getLifeProjection({state:s,at}).valid,false);
const world=render(s,at);
assert.equal(world.uncertain,true);assert.equal(world.together,false);
s.life.ledger[0].at=at;s.life.ledger[0].status='unresolved';
assert.equal(P.getLifeProjection({state:s,at}).valid,false);
});
test('unverified clock or cloud state blocks actor instead of using synthetic world schedule',()=>{
const s=origin();add(s);s.life.clockPending={from:at,to:at+M};
const p=P.getLifeProjection({state:s,at});assert.equal(p.valid,false);
const world=render(s,at);assert.equal(world.uncertain,true);assert.equal(world.canFollow,false);
});
test('injured state overrides projected upright study and preserves original source',()=>{
const s=origin();const base=add(s);s.character.state='injured';
const p=P.getLifeProjection({state:s,at:at+M,vitals:{acuteInjury:true}});
assert.equal(p.valid,true);assert.equal(p.location,'bedroom');assert.equal(p.sourceEventId,base.id);
const world=W.derive({at:at+M,state:{lifeProjection:p,portrait:{state:'injured'},vitals:{acuteInjury:true,stamina:20,mp:0}},playerPlace:'bedroom',following:true});
assert.equal(world.canFollow,false);assert.equal(world.activity.place,'bedroom');
});
test('duplicate current event ID blocks trust instead of displaying contradictory versions',()=>{
const s=origin();const a=add(s);s.life.ledger.push({...a,text:'冲突版本'});assert.equal(P.getLifeProjection({state:s,at}).valid,false);
});
