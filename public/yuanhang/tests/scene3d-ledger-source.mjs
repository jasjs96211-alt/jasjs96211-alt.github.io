import test from 'node:test';
import assert from 'node:assert/strict';
import '../wendao/engine.js';
import '../wendao/world.js';
import {createLedgerSceneSource} from '../wendao/scene3d/ledger-source.js';
const freeze = x => {if(x && typeof x === 'object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const snapshot = {world:{player:'bedroom',sister:'bedroom',together:true,phase:'day'},permittedPoses:['walk','seated']};
function setup(){
  let clock=100000;const requests=[];
  const bridge={setSnapshot(){},suspend(){},submit(intent){requests.push(intent);return {accepted:true};}};
  const source=createLedgerSceneSource(bridge,{now:()=>clock});
  return {source,requests,at:()=>clock,set:n=>clock=n,next:n=>clock+=n,
    row:(id,kind='study',extra={})=>({id:'life:v4:'+id,kind,at:clock,bodyState:'normal',...extra})};
}
test('initial ledger and background recovery establish baselines without replay; fresh events are read-only',()=>{
  const h=setup(),old=h.row('old');assert.equal(h.source.update({ledger:[old],snapshot,live:true}).reason,'baseline-only');
  h.next(1000);const row=h.row('new'),input=freeze({ledger:[old,row],snapshot,live:true}),before=JSON.stringify(input);
  assert.equal(h.source.update(input).accepted,true);assert.equal(h.requests[0].activity,'read');assert.equal(JSON.stringify(input),before);
  h.next(1000);assert.equal(h.source.update(input).reason,'no-fresh-event');
  const missed=h.row('missed','rest');h.source.update({ledger:[old,row,missed],snapshot,live:false});h.next(1000);
  assert.equal(h.source.update({ledger:[old,row,missed],snapshot,live:true}).reason,'no-fresh-event');assert.equal(h.requests.length,1);
});
test('fresh unsupported pressure/social/medicine/text cannot be mapped into medication or stale reading',()=>{
  for(const kind of ['pressure','social','medicine','__proto__']){
    const h=setup();h.source.update({snapshot});h.next(1000);const reading=h.row('read');h.next(1);
    const other=h.row('later',kind,{text:'看书然后服药',activity:'取药服药'});
    assert.equal(h.source.update({snapshot,live:true,ledger:[reading,other]}).reason,'unsupported-event');assert.equal(h.requests.length,0);
  }
});
test('conflicting duplicate IDs, stale/future events and reversed clocks cannot animate',()=>{
  const h=setup();h.source.update({snapshot});h.next(1000);const a=h.row('a');
  assert.equal(h.source.update({snapshot,live:true,ledger:[a,{...a,kind:'rest'}]}).reason,'conflicting-source');
  h.next(1000);assert.equal(h.source.update({snapshot,live:true,ledger:[h.row('past','rest',{at:1}),h.row('future','study',{at:h.at()+1000})]}).reason,'no-fresh-event');
  h.set(1);assert.equal(h.source.update({snapshot,live:true}).reason,'clock-hold');assert.equal(h.requests.length,0);
});
test('source health, current sleep, absence, permissions and pressure authority prevent action',()=>{
  for(const change of [{sisterSleeping:true},{world:{...snapshot.world,sister:'study',together:false}},{world:{...snapshot.world,busy:true}},{state:{vitals:{acuteInjury:true}}},{state:{vitals:{clockDispute:true}}},{permittedPoses:[]}]){
    const h=setup();h.source.update({snapshot});h.next(1000);
    assert.equal(h.source.update({snapshot:{...snapshot,...change},ledger:[h.row('a')],live:true}).reason,'state-blocked');assert.equal(h.requests.length,0);
  }
  const h=setup();h.source.update({snapshot});h.next(1000);
  assert.equal(h.source.update({snapshot,ledger:[h.row('ill','rest',{bodyState:'ill'})],live:true}).reason,'unsupported-event');
});
test('real engine-produced fixture events project without changing ledger, health, recap or rewards',()=>{
  const E=globalThis.WendaoEngine,at=Date.parse('2026-10-25T12:00:00+08:00');
  const state=E.fresh(at-1000);let clock=at-1000;const requests=[];
  const source=createLedgerSceneSource({setSnapshot(){},suspend(){},submit(x){requests.push(x);return {accepted:true};}},{now:()=>clock});
  source.update({snapshot,ledger:state.life.ledger});E.advanceAutonomy(state,at);clock=at;
  assert.ok(state.life.ledger.length);freeze(state);const before=JSON.stringify(state);
  const result=source.update({snapshot,ledger:state.life.ledger,live:true});
  assert.equal(JSON.stringify(state),before);
  const latest=state.life.ledger.at(-1);
  if(['study','rest'].includes(latest.kind)&&latest.bodyState==='normal'){
    assert.equal(result.accepted,true);assert.equal(requests[0].id,latest.id);assert.equal(requests[0].requestedAt,latest.at);
  }else{assert.equal(result.accepted,false);assert.equal(requests.length,0);}
});
