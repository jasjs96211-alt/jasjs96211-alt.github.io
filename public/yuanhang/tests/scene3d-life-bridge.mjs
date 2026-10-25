import test from 'node:test';
import assert from 'node:assert/strict';
import '../wendao/world.js';
import {createLifeSceneBridge} from '../wendao/scene3d/life-bridge.js';
import {createRoutineDemo} from '../labs/bedroom-space/routine-demo.js';
import {createProxy} from '../wendao/scene3d/character-adapter.js';
import {createActionFlow,canPreservePresentation} from '../wendao/scene3d/action-flow.js';
import {adaptCharacterVisualState,withPresentationPose} from '../wendao/scene3d/character-visual-state.js';
const snapshot={world:{player:'bedroom',sister:'bedroom',together:true,phase:'day'},permittedPoses:['walk','seated']};
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
function harness(){
 let wall=100000,time=0,facts=adaptCharacterVisualState(),requested=[];
 const proxy=createProxy(),flow=createActionFlow(proxy);
 const scene={
  setSnapshot(input){let next=adaptCharacterVisualState(input);if(canPreservePresentation(facts,next))next=withPresentationPose(next,{pose:facts.pose,position:facts.worldPosition,yaw:facts.facing});else {flow.reset(next);proxy.setPose(next.pose);}facts=next;return facts;},
  requestActivity(id,options){const ok=flow.request(id,facts,options);if(ok)requested.push(id);return ok;},
  cancelActivity:()=>flow.cancel(),get activityStatus(){return flow.status;},telemetry:()=>({status:'not-rendered'})
 };
 const bridge=createLifeSceneBridge(scene,{now:()=>wall});bridge.setSnapshot(snapshot);
 function tick(seconds=1/60){wall+=seconds*1000;time+=seconds;flow.update(seconds,facts);const p=flow.presentation;facts=withPresentationPose(facts,{pose:p.pose,position:p.position,yaw:p.yaw});bridge.tick();}
 function finish(){for(let i=0;i<6000&&flow.status.busy;i++)tick();assert.equal(flow.status.busy,false);}
 const intent=(id,sequence,activity='read',ttl=60000)=>({id,sequence,activity,source:'autonomy',requestedAt:wall,expiresAt:wall+ttl});
 return {bridge,scene,flow,requested,tick,finish,intent,now:()=>wall,setWall:v=>{wall=v;},get time(){return time;}};
}
test('source intents run once; only latest pending intent survives a busy action',()=>{
 const h=harness();h.bridge.resume();const first=h.intent('read:1',1);assert.equal(h.bridge.submit(first).accepted,true);
 assert.equal(h.bridge.submit(first).reason,'duplicate-or-out-of-order');
 h.bridge.submit(h.intent('med:2',2,'medicine'));h.bridge.submit(h.intent('rest:3',3,'rest'));
 assert.equal(h.bridge.observation().pendingId,'rest:3');h.finish();
 assert.deepEqual(h.requested,['read','rest']);h.finish();assert.deepEqual(h.requested,['read','rest']);
 assert.equal(h.bridge.submit(h.intent('late:2',2)).accepted,false);
});
test('manual control suppresses automatic requests; resume waits for fresh intent',()=>{
 const h=harness();assert.equal(h.bridge.manualRequest('sit'),true);h.finish();
 const old=h.intent('auto:1',1);assert.equal(h.bridge.submit(old).reason,'manual');h.bridge.resume();h.tick();
 assert.deepEqual(h.requested,['sit']);assert.equal(h.bridge.submit(old).accepted,false);
 assert.equal(h.bridge.submit(h.intent('auto:2',2)).accepted,true);
 h.bridge.suspend();h.finish();assert.equal(h.bridge.observation().enabled,false);
});
test('hidden/return, expiry and reverse clock never replay a backlog',()=>{
 const h=harness();h.bridge.resume();h.bridge.submit(h.intent('read:1',1));
 h.bridge.submit(h.intent('med:2',2,'medicine'));h.bridge.setVisible(false);h.setWall(h.now()+3600000);h.bridge.setVisible(true);h.finish();
 assert.deepEqual(h.requested,['read']);assert.equal(h.bridge.observation().pendingId,null);
 h.bridge.submit(h.intent('read:3',3));h.bridge.submit(h.intent('med:4',4,'medicine',1));h.tick();h.finish();
 assert.deepEqual(h.requested,['read','read']);assert.equal(h.bridge.observation().pendingId,null);
 const clock=h.now();h.setWall(clock-1000);assert.equal(h.bridge.submit(h.intent('rest:5',5,'rest')).reason,'clock-hold');
 h.setWall(clock+1000);h.tick();assert.deepEqual(h.requested,['read','read']);
});
test('sleep, injury, permission loss and absence discard pending requests without mutating source state',()=>{
 for(const change of [{sisterSleeping:true},{state:{vitals:{acuteInjury:true}}},{permittedPoses:['walk']},{world:{...snapshot.world,together:false,sister:'study'}},{state:{vitals:{clockDispute:true}}}]){
  const h=harness();h.bridge.resume();h.bridge.submit(h.intent('read:1',1));h.bridge.submit(h.intent('read:2',2));
  const input=freeze({...snapshot,...change}),before=JSON.stringify(input);h.bridge.setSnapshot(input);
  assert.equal(h.bridge.observation().pendingId,null);assert.equal(h.bridge.observation().activeId,null);assert.equal(JSON.stringify(input),before);
  h.bridge.setSnapshot(snapshot);h.tick();assert.deepEqual(h.requested,['read']);
 }
});
test('existing world snapshots retain location, sleep and health authority',()=>{
 const at=Date.parse('2026-10-22T23:30:00+08:00'),state=freeze({portrait:{state:'normal'},vitals:{stamina:60,mp:60}});
 const world=globalThis.WendaoWorld.derive({at,state,playerPlace:'bedroom',following:true});assert.equal(world.activity.title,'夜间安寝');
 const source=freeze({state,world,sisterSleeping:true,permittedPoses:['walk','seated']}),before=JSON.stringify(source);
 const h=harness();h.bridge.setSnapshot(source);h.bridge.resume();assert.equal(h.bridge.submit(h.intent('night:1',1)).reason,'state-blocked');assert.equal(JSON.stringify(source),before);
});
test('laboratory routine connects read, medicine and rest with dwell; is never a production outcome',()=>{
 const h=harness(),routine=createRoutineDemo(h.bridge,{now:h.now});assert.ok(routine.start());
 let held=0;
 for(let i=0;i<12000&&routine.state.active;i++){h.tick();routine.update(h.time);if(routine.state.phase==='dwelling')held++;}
 assert.equal(routine.state.phase,'complete');assert.deepEqual(h.requested,['read','medicine','rest']);assert.ok(held>=11*60);
 const o=h.bridge.observation();assert.equal(o.source,'lab');assert.equal(o.implementation,'placeholder');assert.equal(o.claimVisibleAction,false);assert.equal(o.businessOutcome,null);assert.equal(o.rendered,false);
});
test('stopping routine cancels future actions; a new run has new IDs',()=>{
 const h=harness(),routine=createRoutineDemo(h.bridge,{now:h.now});routine.start();for(let i=0;i<30;i++){h.tick();routine.update(h.time);}routine.stop();h.finish();
 assert.deepEqual(h.requested,['read']);assert.ok(routine.start());
 for(let i=0;i<12000&&routine.state.active;i++){h.tick();routine.update(h.time);}
 assert.deepEqual(h.requested,['read','read','medicine','rest']);
});
test('invalid intent cannot run unknown actions, forged future timestamps or oversize lifetimes',()=>{
 const h=harness();h.bridge.resume();
 for(const change of [{activity:'heal'},{sequence:-1},{requestedAt:h.now()+1},{expiresAt:h.now()+300001},{source:'ai'},{id:''}])assert.equal(h.bridge.submit({...h.intent('bad',0),...change}).accepted,false);
 assert.deepEqual(h.requested,[]);assert.equal(h.bridge.submit(h.intent('good',1)).accepted,true);
});
