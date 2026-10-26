import test from 'node:test';
import assert from 'node:assert/strict';
import {createProxy,PROP_HOMES} from '../wendao/scene3d/character-adapter.js';
import {createActionFlow} from '../wendao/scene3d/action-flow.js';
import {adaptCharacterVisualState} from '../wendao/scene3d/character-visual-state.js';
const facts=adaptCharacterVisualState({world:{player:'bedroom',sister:'bedroom',together:true,phase:'day'},permittedPoses:['walk','seated']});
const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
function setup(){const proxy=createProxy();proxy.setPose(facts.pose);const flow=createActionFlow(proxy);flow.reset(facts);return {proxy,flow};}
function step(ctx,dt){
  const {proxy,flow}=ctx,before=proxy.propContacts,phase=flow.status.phase,position=proxy.root.position.clone();flow.update(dt,facts);const after=proxy.propContacts;
  assert.ok(proxy.root.position.distanceTo(position)<dt*3+.001,`${phase}: no root teleport`);
  for(const name of ['book','bowl'])assert.ok(distance(before.props[name],after.props[name])<dt*2+.0001,`${phase}: ${name} must move continuously`);
  if(flow.status.phase===phase&&['展开书册','阅读','持碗停顿','服药演示','放回药碗','放回书册'].includes(phase)&&after.grip)
    for(const hand of after.hands)assert.ok(hand.error<1e-6,`${phase}: grip error ${hand.error}`);
  for(const name of ['interaction-book','interaction-bowl']){
    const matches=[];proxy.propsRoot.traverse(o=>{if(o.name===name)matches.push(o);});
    assert.equal(matches.length,1);assert.equal(matches[0].visible,true);
  }
}
function finish(ctx,dt=1/60){let n=0;while(ctx.flow.status.busy&&n++<120/dt)step(ctx,dt);assert.equal(ctx.flow.status.busy,false);}
function until(ctx,phase){let n=0;while(ctx.flow.status.phase!==phase&&n++<10000)step(ctx,1/60);assert.equal(ctx.flow.status.phase,phase);}
function atHome(proxy){assert.equal(proxy.propContacts.grip,null);for(const name of ['book','bowl'])assert.ok(distance(proxy.propContacts.props[name],PROP_HOMES[name])<1e-9);}
test('hands stay on a single persistent prop through pickup, carry and placement at 30/60/120 Hz',()=>{
  const endpoints=[];
  for(const dt of [1/30,1/60,1/120]){
    const ctx=setup();ctx.flow.request('read',facts);finish(ctx,dt);
    assert.equal(ctx.proxy.propContacts.grip,'book');assert.ok(distance(ctx.proxy.propContacts.props.book,PROP_HOMES.book)>.2);
    ctx.flow.request('medicine',facts);assert.equal(ctx.flow.status.phase,'放回书册');finish(ctx,dt);atHome(ctx.proxy);
    ctx.flow.request('rest',facts);finish(ctx,dt);atHome(ctx.proxy);endpoints.push(ctx.proxy.propContacts.props);
  }
  assert.deepEqual(endpoints[0],endpoints[1]);assert.deepEqual(endpoints[1],endpoints[2]);
});
test('props stay on their support until the reaching hands make contact',()=>{
  for(const [activity,phase,name] of [['read','伸手取书','book'],['medicine','伸手取药','bowl']]){
    const ctx=setup();ctx.flow.request(activity,facts);until(ctx,phase);
    while(ctx.flow.status.phase===phase){step(ctx,1/60);if(ctx.flow.status.phase===phase)assert.ok(distance(ctx.proxy.propContacts.props[name],PROP_HOMES[name])<1e-9);}
    for(const hand of ctx.proxy.propContacts.hands)assert.ok(hand.error<1e-6);
  }
});
test('cancel during reaching, carrying, drinking or returning finishes placement and allows a new task',()=>{
  for(const phase of ['伸手取书','展开书册','阅读','伸手取药','持碗停顿','服药演示','放回药碗','收手']){
    const ctx=setup();ctx.flow.request(['伸手取书','展开书册','阅读'].includes(phase)?'read':'medicine',facts);until(ctx,phase);step(ctx,.1);
    assert.ok(ctx.flow.cancel());assert.ok(ctx.flow.cancel());finish(ctx);atHome(ctx.proxy);assert.equal(ctx.flow.status.phase,'cancelled');
    assert.ok(ctx.flow.request('rest',facts));finish(ctx);atHome(ctx.proxy);
  }
});
test('cancel after completed reading returns the book before releasing, with no root movement',()=>{
  const ctx=setup();ctx.flow.request('read',facts);finish(ctx);const position=ctx.proxy.root.position.toArray();
  assert.equal(ctx.flow.status.canCancel,true);assert.ok(ctx.flow.cancel());assert.equal(ctx.flow.status.phase,'放回书册');finish(ctx);atHome(ctx.proxy);assert.equal(ctx.flow.status.canCancel,false);
  assert.deepEqual(ctx.proxy.root.position.toArray(),position);assert.equal(ctx.flow.presentation.gesture,'stool');assert.equal(ctx.flow.cancel(),false);
});
test('cancel departure while returning a book retains the desk approach for the next walk',()=>{
  const ctx=setup();ctx.flow.request('read',facts);finish(ctx);ctx.flow.request('medicine',facts);step(ctx,.1);
  assert.equal(ctx.flow.status.phase,'放回书册');ctx.flow.cancel();finish(ctx);atHome(ctx.proxy);
  assert.ok(ctx.flow.request('rest',facts));finish(ctx);atHome(ctx.proxy);
});
test('authoritative pose reset returns props and removes contact without changing external facts',()=>{
  const ctx=setup(),before=JSON.stringify(facts);ctx.flow.request('read',facts);finish(ctx);
  ctx.flow.reset(facts);ctx.proxy.setPose('reclined');atHome(ctx.proxy);assert.equal(ctx.flow.status.busy,false);assert.equal(JSON.stringify(facts),before);
});
