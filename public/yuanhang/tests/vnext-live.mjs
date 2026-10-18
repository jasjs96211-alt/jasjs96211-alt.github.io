import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
import {boot,WD,KEY} from './helpers/wendao-dom.mjs';
const t=Date.parse('2026-10-17T20:00:00+08:00'),plain=x=>JSON.parse(JSON.stringify(x));
const c=vm.createContext({});for(const f of ['bedroom-behavior.js','bedroom-renderer.js'])vm.runInContext(readFileSync(new URL('../wendao/'+f,import.meta.url),'utf8'),c);
const A=c.WendaoBedroomArt,B=c.WendaoBedroom;
const facts=at=>({at,state:{portrait:{state:'ill'},vitals:{seriousInjury:true},recoveryCGAllowed:true},world:{sister:'bedroom',player:'bedroom',together:true},focus:{id:null,running:false}});
const settle=()=>new Promise(setImmediate);
async function live(options={}){
 const a=boot(new Map(),undefined,{at:t,canvas:true,...options});
 a.run(`const fixture=window.Wendao.cloudRead();fixture.supervision.deadlines.punishments.push({id:'ddl:live',at:Date.now()-72*3600000,result:'summons',status:'active',recoveryActions:[]});localStorage.setItem('${WD}',JSON.stringify(fixture));window.Wendao.reloadLocal()`);
 a.get('wdEnter').onclick();a.get('wdCompanion').onclick();a.get('wcFindSister').onclick();await settle();return a;
}
function step(a,ms){a.clock.set(t+ms);a.run('window.WendaoCompanion.refresh()')}
test('actual art capability excludes reading, drinking and sit-up; five minutes never claims them',()=>{
 const d=B.create({manifest:A.manifest(true)}),phases=new Set();let closures=0,previous=false,onsets=[];
 for(let ms=0;ms<=300000;ms+=40){const s=d.tick(facts(t+ms));phases.add(s.phase);assert.equal(s.pose,'lying');assert.equal(s.props.book,'absent');assert.equal(s.props.bowl,'bedside');assert.doesNotMatch(s.text+s.title,/翻页|翻看|用药|轻抿|端起|放书/);assert.equal(d.forAI().description,s.text);
 if(!s.sleeping){const closed=s.motion.lidClosure>0;if(closed&&!previous)onsets.push(ms);previous=closed;if(closed)closures++;}else previous=false;
 }
 assert.ok(closures>20);for(const p of ['rest','warm','nap_enter','nap','wake'])assert.ok(phases.has(p),p);
 const first=onsets.filter(x=>x<78000);for(let i=1;i<first.length;i++)assert.ok(first[i]-first[i-1]>=4000&&first[i]-first[i-1]<=9040);
});
test('painted eye reactions ease in before a restrained smile; sleep blocks clicks',()=>{
 const d=B.create({manifest:A.manifest(true)});let s=d.tick(facts(t));assert.equal(s.motion.reactionWeight,0);assert.equal(s.motion.smileWeight,0);
 s=d.tick(facts(t+800));assert.ok(s.motion.reactionWeight>0);assert.equal(s.motion.smileWeight,0);
 s=d.tick(facts(t+2000));assert.ok(s.motion.smileWeight>0&&s.motion.smileWeight<1);
 s=d.tick({...facts(t+4000),sisterSleeping:true,intent:'look'});assert.equal(s.motion.lidClosure,1);assert.equal(s.reaction,null);
});
test('production canvas replaces CG only after decode, with consistent title and readonly AI facts',async()=>{
 const a=await live();assert.equal(a.get('wcBedroomLive').hidden,false);assert.equal(a.get('wcRecovery').hidden,true);assert.equal(a.get('wcActor').hidden,true);assert.equal(a.get('wcBedTouch').hidden,false);
 const ctx=plain(a.run('WendaoCompanion.getSceneContext()'));assert.equal(ctx.description,a.get('wcDescription').textContent);assert.equal(ctx.props.book,'absent');assert.equal(ctx.pose,'lying');assert.equal(ctx.current,true);assert.ok(a.snapshot().story.unlockedCG.includes('recovery-bed'));
 for(let ms=1000;ms<=29000;ms+=1000)step(a,ms);assert.equal(a.get('wcActivity').textContent,'榻边温养');assert.equal(a.run('WendaoCompanion.getSceneContext().phase'),'warm');
});
test('entry/click cooldown and scene departure preserve behavior without writing study or penalty data',async()=>{
 const a=await live();step(a,2000);assert.equal(a.get('wcBedResponse').textContent,'你来了。');const study=a.storage.get(KEY),injury=plain(a.snapshot().supervision.deadlines);
 step(a,4000);a.get('wcBedTouch').onclick();assert.equal(a.get('wcBedResponse').hidden,true);
 a.get('wcClose').onclick();a.get('wdCompanion').onclick();step(a,6000);assert.equal(a.get('wcBedResponse').hidden,true);
 step(a,16000);a.get('wcBedTouch').onclick();step(a,18000);assert.equal(a.get('wcBedResponse').hidden,false);
 assert.equal(a.storage.get(KEY),study);assert.deepEqual(a.snapshot().supervision.deadlines,injury);
 a.get('wcClose').onclick();assert.equal(a.run('WendaoCompanion.getSceneContext().current'),false);
});
test('sleep cannot be interrupted by clicking, scene reentry or focus; active 25-minute timer keeps old records',async()=>{
 const a=await live();for(let ms=1000;ms<=85000;ms+=1000)step(a,ms);assert.equal(a.run('WendaoCompanion.getSceneContext().sleeping'),true);
 a.get('wcBedTouch').onclick();a.get('wcClose').onclick();a.get('wdCompanion').onclick();assert.equal(a.get('wcBedResponse').hidden,true);assert.equal(a.run('WendaoCompanion.getSceneContext().sleeping'),true);
 a.get('wcStart').onclick();const id=a.run('timer.id');step(a,685000);a.get('wcPause').onclick();assert.equal(a.run('timer.remaining'),900);
 step(a,745000);a.get('wcPause').onclick();step(a,1645000);assert.equal(a.run(`state.sessions.filter(x=>x.id===${JSON.stringify(id)}).length`),1);assert.equal(a.run(`state.sessions.find(x=>x.id===${JSON.stringify(id)}).minutes`),25);assert.equal(a.run('state.sessions.find(x=>x.id==="old").minutes'),60);
});
test('failed art, healthy and save-data paths never claim an animation or unlock a healthy CG',async()=>{
 const a=await live({imageFailure:true});assert.equal(a.get('wcBedroomLive').hidden,true);assert.equal(a.run('WendaoCompanion.getSceneContext()'),null);assert.equal(a.get('wcArtRetry').hidden,false);
 const healthy=boot(new Map(),undefined,{at:t,canvas:true});healthy.get('wdEnter').onclick();healthy.get('wdCompanion').onclick();healthy.get('wdCompanionLayer').children.find(x=>x.dataset.wcTravel==='bedroom').onclick();await settle();assert.equal(healthy.get('wcBedroomLive').hidden,true);assert.equal(healthy.snapshot().story.unlockedCG.includes('recovery-bed'),false);
 const limited=await live({saveData:true});assert.equal(limited.get('wcBedroomLive').hidden,true);assert.equal(limited.run('WendaoCompanion.getSceneContext()'),null);
});
test('six dedicated nights plus night sickroom are included in CSS and offline cache',()=>{
 const css=readFileSync(new URL('../wendao/bedroom-live.css',import.meta.url),'utf8'),sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 for(const id of ['study','herbs','garden','corridor','bedroom','terrace']){const f='world-'+id+'-night-v1.webp';assert.ok(css.includes(f));assert.ok(existsSync(new URL('../wendao/assets/'+f,import.meta.url)));}
 assert.ok(existsSync(new URL('../wendao/assets/bedroom-live-night-v1.webp',import.meta.url)));assert.match(css,/\[data-phase="night"\]::after\{background:transparent\}/);assert.match(sw,/bedroom-renderer/);assert.match(sw,/bedroom-live/);
});

test('bedside life motion is readable on a phone without whole-picture bouncing or forced wake-up',()=>{
 const d=B.create({manifest:A.manifest(true)});let peak=0,settle=0;
 for(let ms=0;ms<=28000;ms+=40){
  const s=d.tick(facts(t+ms));
  peak=Math.max(peak,Math.abs(s.motion.breath));
  settle=Math.max(settle,s.motion.settle);
  if(s.sleeping)assert.equal(s.motion.settle,0);
 }
 assert.ok(peak>.55,'ill breathing must remain perceptible after image downscaling');
 assert.ok(settle>.3,'occasional autonomous small head adjustment should be present');
 const severe=B.create({manifest:A.manifest(true)});
 const severeFacts=ms=>({...facts(t+ms),state:{...facts(t+ms).state,portrait:{state:'injured'},vitals:{acuteInjury:true,seriousInjury:true}}});
 for(let ms=0;ms<22000;ms+=250){const s=severe.tick(severeFacts(ms));assert.equal(s.motion.settle,0);assert.ok(Math.abs(s.motion.breath)<=.161);}
 const motionOff=B.create({manifest:A.manifest(true)});
 for(let ms=0;ms<22000;ms+=250){const s=motionOff.tick({...facts(t+ms),reducedMotion:true});assert.equal(s.motion.settle,0);assert.equal(s.motion.breath,0);}
});
