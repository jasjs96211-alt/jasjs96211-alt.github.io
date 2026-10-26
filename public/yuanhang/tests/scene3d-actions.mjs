import test from 'node:test';
import assert from 'node:assert/strict';
import {createActionFlow,canPreservePresentation} from '../wendao/scene3d/action-flow.js';
import {createProxy} from '../wendao/scene3d/character-adapter.js';
import {adaptCharacterVisualState} from '../wendao/scene3d/character-visual-state.js';
import {blocked} from '../wendao/scene3d/contract.js';
const input={world:{player:'bedroom',sister:'bedroom',together:true,phase:'day'},permittedPoses:['walk','seated']};
const healthy=adaptCharacterVisualState(input);
function setup(){const proxy=createProxy();proxy.setPose(healthy.pose);const flow=createActionFlow(proxy);flow.reset(healthy);return {proxy,flow};}
function run(flow,proxy,dt=1/60){
 const phases=new Set();let previous=proxy.root.position.clone();
 for(let n=0;n<120/dt&&flow.status.busy;n++){
  phases.add(flow.status.phase);flow.update(dt,healthy);
  assert.ok(proxy.root.position.distanceTo(previous)<dt*3+.001,'no root teleport');previous.copy(proxy.root.position);
  assert.deepEqual(proxy.root.position.toArray().map(x=>+x.toFixed(6)),flow.presentation.position.map(x=>+x.toFixed(6)));
  if(flow.status.moving)assert.equal(blocked(flow.presentation.position),false);
 }
 assert.equal(flow.status.busy,false);return phases;
}
test('read → medicine → rest runs continuous supported steps with collision-free walks',()=>{
 const {proxy,flow}=setup();const before=JSON.stringify(healthy);
 assert.ok(flow.request('read',healthy));const read=run(flow,proxy);
 for(const label of ['起身','行走','到达停步','面向交互点','坐下','伸手取书','展开书册','阅读'])assert.ok(read.has(label),label);
 assert.equal(flow.presentation.gesture,'read');assert.equal(flow.presentation.pose,'seated');
 assert.ok(flow.request('medicine',healthy));const med=run(flow,proxy);
 for(const label of ['起身','行走','伸手取药','持碗停顿','服药演示','放回药碗','收手'])assert.ok(med.has(label),label);
 assert.equal(flow.presentation.gesture,null);
 assert.ok(flow.request('rest',healthy));const rest=run(flow,proxy);assert.ok(rest.has('床沿落座'));assert.ok(rest.has('转身卧下'));
 assert.equal(flow.presentation.pose,'reclined');assert.equal(JSON.stringify(healthy),before);
});
test('cancel walking settles locally, cancel sitting finishes support transfer, and both allow another task',()=>{
 for(const target of ['行走','坐下']){
  const {proxy,flow}=setup();flow.request('read',healthy);
  for(let i=0;i<5000&&flow.status.phase!==target;i++)flow.update(1/60,healthy);
  assert.equal(flow.status.phase,target);flow.update(.1,healthy);const before=proxy.root.position.clone();
  assert.ok(flow.cancel());run(flow,proxy);assert.equal(flow.status.phase,'cancelled');
  if(target==='行走')assert.ok(proxy.root.position.distanceTo(before)<1e-8);
  else assert.equal(flow.presentation.pose,'seated');
  assert.ok(flow.request('medicine',healthy));run(flow,proxy);
 }
});
test('permissions revoke pending actions, recovery does not restart; phase-only update preserves progression',()=>{
 const {flow}=setup();flow.request('read',healthy);flow.update(.2,healthy);
 const night=adaptCharacterVisualState({...input,world:{...input.world,phase:'night'}});
 assert.ok(canPreservePresentation(healthy,night));
 for(const change of [{sisterSleeping:true},{state:{portrait:{state:'injured'}}},{permittedPoses:['walk']},{state:{vitals:{clockDispute:true}}},{world:{...input.world,sister:'study'}}]){
  const denied=adaptCharacterVisualState({...input,...change});assert.equal(canPreservePresentation(healthy,denied),false);
  flow.update(.1,denied);assert.equal(flow.status.busy,false);flow.update(.1,healthy);assert.equal(flow.status.busy,false);
  flow.reset(denied);assert.equal(flow.request('read',denied),false);
 }
});
test('frame rate does not change endpoint; pause/long gaps do not advance; entry is continuous',()=>{
 const endpoints=[];
 for(const dt of [1/30,1/60,1/120]){
  const {proxy,flow}=setup();flow.request('walk',healthy,{entry:true});const before=flow.presentation;
  flow.update(0,healthy);flow.update(10,healthy);assert.deepEqual(flow.presentation,before);
  run(flow,proxy,dt);endpoints.push({...flow.presentation,yaw:+flow.presentation.yaw.toFixed(10)});
 }
 assert.deepEqual(endpoints[0],endpoints[1]);assert.deepEqual(endpoints[1],endpoints[2]);
});
