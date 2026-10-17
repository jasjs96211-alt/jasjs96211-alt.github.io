import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../wendao/world.js',import.meta.url),'utf8');
function world(){
 const ctx={globalThis:{},Intl,Date,Number,Math,Object,JSON};
 runInNewContext(source,ctx);
 return ctx.globalThis.WendaoWorld;
}
const at=time=>Date.parse('2026-10-17T'+time+'+08:00');
const healthy={portrait:{state:'normal'},vitals:{stamina:75}};
test('six distinct map destinations include sister bedroom',()=>{
 const w=world(),ids=w.LOCATIONS.map(x=>x.id);
 assert.equal(ids.length,6);assert.equal(new Set(ids).size,6);assert.ok(ids.includes('bedroom'));
});
test('day-part changes with China local clock, not machine timezone',()=>{
 const w=world();
 assert.equal(w.phase(at('05:45:00')),'dawn');
 assert.equal(w.phase(at('09:00:00')),'day');
 assert.equal(w.phase(at('17:30:00')),'dusk');
 assert.equal(w.phase(at('21:30:00')),'night');
});
test('reload and repeated renders derive identical sister schedule',()=>{
 const w=world(),options={at:at('12:40:00'),state:healthy,playerPlace:'garden'};
 assert.deepEqual(JSON.parse(JSON.stringify(w.derive(options))),JSON.parse(JSON.stringify(w.derive(options))));
});
test('player explores without silently moving independent sister',()=>{
 const w=world(),base=w.derive({at:at('14:00:00'),state:healthy,playerPlace:'study'});
 const moved=w.derive({at:at('14:00:00'),state:healthy,playerPlace:'garden'});
 assert.equal(base.sister,moved.sister);
 assert.equal(moved.player,'garden');
});
test('following requires healthy sister and stays together',()=>{
 const w=world(),v=w.derive({at:at('13:00:00'),state:healthy,playerPlace:'terrace',following:true});
 assert.equal(v.together,true);assert.equal(v.sister,'terrace');assert.equal(v.canFollow,true);
});
test('acute and ongoing severe injury keep sister resting, and disable following',()=>{
 const w=world();
 for(const state of [{portrait:{state:'injured'},vitals:{acuteInjury:true}},{portrait:{state:'ill'},vitals:{seriousInjury:true}},{portrait:{state:'normal'},vitals:{seriousInjury:true}}]){
  const v=w.derive({at:at('13:00:00'),state,playerPlace:'herbs',following:true});
  assert.equal(v.sister,'bedroom');assert.equal(v.canFollow,false);assert.equal(v.following,false);
 }
});
test('low stamina and night ensure sensible rest',()=>{
 const w=world();
 assert.equal(w.derive({at:at('14:00:00'),state:{portrait:{state:'tired'},vitals:{stamina:20}}}).sister,'bedroom');
 assert.equal(w.derive({at:at('23:00:00'),state:healthy}).sister,'bedroom');
});
test('UI-only travel preference tolerates missing or broken storage',()=>{
 const w=world();const map=new Map();
 const storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 assert.equal(w.readView(storage).player,'study');
 assert.equal(w.writeView(storage,{player:'garden',following:true}),true);
 assert.deepEqual(JSON.parse(JSON.stringify(w.readView(storage))),{player:'garden',following:true});
 map.set(w.UI_KEY,'{oops');
 assert.equal(w.readView(storage).player,'study');
});
test('world renderer is read-only and does not mutate original RPG state',()=>{
 const w=world(),state={portrait:{state:'normal'},vitals:{hp:65,mp:22,sisterXP:50},schedule:{kind:'pressure',at:at('12:00:00'),text:'问询'}};
 const before=JSON.stringify(state);
 w.derive({at:at('12:30:00'),state,focus:{running:true},playerPlace:'garden'});
 assert.equal(JSON.stringify(state),before);
});
