import test from 'node:test';
import assert from 'node:assert/strict';
import '../wendao/engine.js';
import '../wendao/production-life.js';
import '../wendao/world.js';
import '../wendao/motion.js';
import {boot} from './helpers/wendao-dom.mjs';

const E=globalThis.WendaoEngine,P=globalThis.WendaoLifeProjection,W=globalThis.WendaoWorld,M=globalThis.WendaoMotion;
const at=Date.parse('2026-10-31T10:00:00+08:00');
function fixture(kind='rest'){
 const save=E.fresh(at);E.advanceLife(save,at);
 save.life.ledger.push({id:'life:v4:fixture',at,kind,bodyState:'normal',chapter:'chapter-9-preparation',activity:'温养与休息',text:'停下功课休息。',delta:{autonomy:0,cultivation:0,pressure:0}});
 const state={schedule:P.get(save,at),portrait:{state:'normal',src:'standing.webp'},vitals:{},recoveryCGAllowed:E.canViewRecoveryCG(save,at)};
 return {save,state,world:W.derive({at,state,playerPlace:state.schedule.location})};
}
test('recorded healthy rest reaches a real seated asset without recovery CG permission or save writes',()=>{
 const f=fixture(),before=JSON.stringify(f),p=M.plan(f);
 assert.equal(p.action,'rest');assert.equal(p.pose,'seated');assert.match(p.src,/meditate-still.webp$/);
 assert.equal(p.cgId,undefined);assert.equal(f.state.recoveryCGAllowed,false);assert.equal(JSON.stringify(f),before);
});
test('initial baseline and study detail rest also select rest without waiting for a fresh scene intent',()=>{
 const f=fixture();f.state.schedule=P.get(E.fresh(at),at);
 assert.equal(f.state.schedule.valid,false);assert.equal(M.plan(f).pose,'seated');
 f.state.schedule={...f.state.schedule,kind:'study',activity:'rest',valid:true,location:'study'};
 f.world=W.derive({at,state:f.state,playerPlace:'study'});assert.equal(M.plan(f).pose,'seated');
});
test('rest survives disabled motion, reduced motion, background and data saver',()=>{
 for(const flags of [{enabled:false},{reduced:true},{hidden:true},{saveData:true}]){
  const p=M.plan({...fixture(),...flags});assert.equal(p.pose,'seated');assert.equal(p.animate,false);
 }
});
test('absence, sleep, injury and clock hold never become a healthy seated action',()=>{
 const f=fixture();assert.equal(M.plan({...f,world:{...f.world,together:false}}).mode,'absent');
 for(const change of [{sleeping:true},{bodyState:'injured'},{bodyState:'tired'}])assert.equal(M.plan({...f,state:{...f.state,schedule:{...f.state.schedule,...change}}}).mode,'unavailable');
 assert.equal(M.plan({...f,state:{...f.state,vitals:{seriousInjury:true}}}).mode,'unavailable');
 const injured={...f.state,recoveryCGAllowed:true,vitals:{seriousInjury:true}};
 assert.equal(M.plan({...f,state:injured}).mode,'cg');
 const held={...f.state,schedule:{...f.state.schedule,blocked:true},vitals:{clockDispute:true}};
 assert.equal(M.plan({...f,state:held}).animate,false);
});
test('rest returns to reading when current activity changes',()=>{
 const f=fixture('study'),p=M.plan(f);assert.equal(p.action,'read');assert.match(p.src,/read-still.webp$/);
});
function element(){return {hidden:false,dataset:{},style:{setProperty(){}},src:'',alt:''};}
test('failed rest image never substitutes a standing portrait and retry restores the pose',()=>{
 const actor=element(),photo=element(),bed=element(),hint=element(),seen=[];
 const renderer=M.renderer({actor,photo,bed,hint,onArtSeen:id=>seen.push(id)}),f=fixture();
 renderer.render(f);assert.match(photo.src,/meditate-still/);photo.onerror();
 renderer.render(f);assert.equal(actor.hidden,true);assert.equal(hint.hidden,false);assert.notEqual(photo.src,'standing.webp');assert.deepEqual(seen,[]);
 renderer.resetFailures();renderer.render(f);photo.onload();renderer.render(f);
 assert.equal(actor.hidden,false);assert.equal(photo.hidden,false);assert.equal(hint.hidden,true);assert.match(photo.alt,/坐姿歇息/);
});
test('real companion entry, close/reopen and animation switch retain seated rest without unlocking CG',()=>{
 const ui=boot(new Map(),undefined,{at});ui.get('wdEnter').onclick();ui.get('wdCultivateQuick').onclick();ui.get('wcFindSister').onclick();
 const verify=()=>{assert.equal(ui.get('wcActor').hidden,false);assert.equal(ui.get('wcActor').dataset.motion,'rest');assert.match(ui.get('wcPortrait').src,/meditate-still/);assert.equal(ui.get('wcRecovery').hidden,true);assert.equal(ui.snapshot().story.unlockedCG.includes('recovery-bed'),false);};
 verify();ui.get('wcAnimation').onclick();verify();ui.get('wcClose').onclick();ui.get('wdCultivateQuick').onclick();verify();
});
