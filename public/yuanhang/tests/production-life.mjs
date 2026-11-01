import test from 'node:test';
import assert from 'node:assert/strict';
import '../wendao/engine.js';
import '../wendao/production-life.js';
import '../wendao/world.js';
import '../wendao/motion.js';
import {createLifePresentation} from '../wendao/life-presentation.js';
import {boot,WD} from './helpers/wendao-dom.mjs';
const E=globalThis.WendaoEngine,P=globalThis.WendaoLifeProjection,W=globalThis.WendaoWorld,M=60000;
const at=t=>Date.parse(t+'+08:00'),start=at('2026-10-26T08:00:00'),clone=x=>JSON.parse(JSON.stringify(x));
function setup(){const s=E.fresh(start);E.advanceLife(s,start);return s;}
function source(s,kind='study',time=start+M){const row={id:'life:v4:'+E.day(time)+':fixture-'+kind,kind,at:time,bodyState:'normal',chapter:'chapter-9-preparation',activity:'已记录的日常',text:'已核验的生活事实',delta:{autonomy:0,cultivation:0,pressure:0}};s.life.ledger.push(row);return row;}
test('production lifecycle enables once, leaves old history untouched and advances all four L1 kinds',()=>{
 for(const kind of ['study','rest','social','pressure']){const s=setup(),p=source(s,kind);E.advanceLife(s,start+55*M);const details=s.life.ledger.filter(r=>r.kind==='detail');assert.equal(details.length,2);assert.ok(details.every(r=>r.sourceEventId===p.id&&Object.values(r.delta).every(v=>v===0)));const before=JSON.stringify(s);E.advanceLife(s,start+55*M);assert.equal(JSON.stringify(s),before);}
 const s=E.fresh(start-86400000),p=source(s,'study',start-60*M);E.advanceLife(s,start);assert.equal(s.life.ledger.find(r=>r.id===p.id).text,p.text);assert.equal(s.life.ledger.filter(r=>r.kind==='detail').length,0);
});
test('awake mode uses the same life sequence before creating the night recap',()=>{
 const t=at('2026-10-26T23:00:00'),s=E.fresh(t);E.advanceLife(s,t);source(s,'rest',t+M);s.supervision.mode='sleep';
 E.setMode(s,'awake',{},t+8*3600000);assert.ok(s.life.ledger.some(r=>r.kind==='detail'));const rows=E.recapTimeline(s,s.rhythmState.recaps.at(-1));assert.ok(rows.some(r=>r.kind==='detail'));assert.ok(rows.filter(r=>r.kind==='detail').every(r=>r.sourceEventId!==r.eventId));
});
test('pending verification blocks both base and detail events; explicit resume establishes a new baseline',()=>{
 for(const block of [s=>s.supervision.pending={},s=>s.supervision.deadlines.offlinePending=true,s=>s.supervision.deadlines.cloudPending=true,s=>s.life.clockPending={}]){const s=setup();source(s);block(s);const before=clone(s.life.ledger);E.advanceLife(s,start+120*M);assert.deepEqual(s.life.ledger,before);s.supervision.pending=null;s.supervision.deadlines.offlinePending=false;s.supervision.deadlines.cloudPending=false;s.life.clockPending=null;assert.equal(E.advanceLife(s,start+121*M).reason,'resume-required');assert.ok(E.resumeLife(s,start+121*M));E.advanceLife(s,start+121*M);assert.equal(s.life.ledger.filter(r=>r.kind==='detail').length,0);}
});
test('save validation accepts legacy saves and rejects malformed detail cursors',()=>{
 const s=setup();assert.ok(E.validate(E.migrateLegacySave(clone(s))));for(const bad of [{version:2},{version:1,enabledAt:start,cursor:start-1,hold:null},{version:1,enabledAt:start,cursor:Infinity,hold:null},{version:1,enabledAt:start,cursor:start,hold:{}}]){const x=clone(s);x.life.detailState=bad;assert.equal(E.validate(x),false);}
});
test('engine merge used by account sync deduplicates, preserves cursors and invalidates orphan chains',()=>{
 const s=setup();source(s);E.advanceLife(s,start+55*M);const remote=clone(s);remote.life.detailState.cursor+=M;const merged=E.merge(s,remote);assert.equal(merged.life.ledger.length,s.life.ledger.length);assert.equal(merged.life.detailState.cursor,remote.life.detailState.cursor);const orphan=clone(s);orphan.life.ledger=orphan.life.ledger.filter(r=>r.kind==='detail'&&r.step===1);E.reconcileLife(orphan);assert.equal(orphan.life.ledger[0].status,'unresolved');assert.equal(orphan.chronicle.find(r=>r.id===orphan.life.ledger[0].id).status,'unresolved');
 const missingFirst=clone(s);missingFirst.life.ledger=missingFirst.life.ledger.filter(r=>r.kind!=='detail'||r.step!==0);E.reconcileLife(missingFirst);assert.equal(missingFirst.life.ledger.find(r=>r.kind==='detail').status,'unresolved');
});
test('cloud snapshot restoration preserves local cursors without adding local ledger or rewards',()=>{
 const prior=setup();source(prior);E.advanceLife(prior,start+55*M);const incoming=E.fresh(start),before=clone(incoming.character);E.restoreLife(incoming,prior);assert.equal(incoming.life.cursor,prior.life.cursor);assert.equal(incoming.life.detailState.cursor,prior.life.detailState.cursor);assert.equal(incoming.life.ledger.length,0);assert.deepEqual(incoming.character,before);
});
test('projection is read only, follows source lineage, excludes future and replaced details',()=>{
 const s=setup(),parent=source(s);E.advanceLife(s,start+30*M);const before=JSON.stringify(s),p=P.get(s,start+30*M);assert.equal(p.sourceEventId,parent.id);assert.equal(p.activity,'notes');assert.equal(JSON.stringify(s),before);source(s,'rest',start+31*M);assert.equal(P.get(s,start+30*M).sourceEventId,parent.id);assert.equal(P.get(s,start+32*M).kind,'rest');
});
test('focus, player nap and map movement cannot move her independent life',()=>{
 const s=setup();source(s);E.advanceLife(s,start+5*M);const p=P.get(s,start+5*M),state={schedule:p,portrait:{state:'normal'},vitals:{stamina:78}};
 for(const playerPlace of ['study','garden','terrace'])for(const running of [true,false])assert.equal(W.derive({at:start+5*M,state,focus:{running},playerPlace,following:true}).sister,p.location);
 s.supervision.mode='sleep';assert.deepEqual(P.get(s,start+5*M),p);
});
test('injury, fatigue and recorded sleep take precedence over standing activity',()=>{
 const s=setup();source(s);E.advanceLife(s,start+5*M);s.character.fatigue=80;assert.equal(P.get(s,start+5*M).location,'bedroom');
 const n=E.fresh(at('2026-10-26T23:00:00'));E.advanceLife(n,n.createdAt);source(n,'rest',n.createdAt+M);assert.equal(P.get(n,n.createdAt+5*M).sleeping,true);
});
test('scene bridge receives only fresh foreground facts and makes no animation or business claim',()=>{
 let time=start;const c=createLifePresentation({now:()=>time}),s=setup();
 const update=()=>{const state={schedule:P.get(s,time),lifeLedger:s.life.ledger,portrait:{state:'normal'},vitals:{}};return c.update({state,world:W.derive({at:time,state,playerPlace:'study'})});};
 source(s,'study',start);update();time+=M;const r=source(s,'study',time);r.id+=':new';const result=update();assert.equal(result.activeId,r.id);assert.equal(result.claimVisibleAction,false);assert.equal(result.businessOutcome,null);
 c.hide();time+=M;const old=source(s,'study',time);old.id+=':offline';assert.equal(update().activeId,null);assert.equal(update().activeId,null);
 c.suspend();time+=M;source(s,'rest',time);assert.equal(update().activeId,null);
});
test('missing detail animation falls back; no walk interpolation or old action on page return',()=>{
 const s=setup();source(s);E.advanceLife(s,start+30*M);const state={schedule:P.get(s,start+30*M),portrait:{state:'normal',src:'portrait.webp'}};const world=W.derive({at:start+30*M,state,playerPlace:'study'});const m=globalThis.WendaoMotion;
 assert.equal(m.plan({world,state}).animate,false);assert.equal(m.plan({world,state}).action,'idle');assert.equal(m.transition({world,at:start},world,start+30*M,state),null);assert.equal(m.plan({world:{...world,together:false},state,transit:{type:'enter',at:start,duration:100000}}).mode,'absent');
});
test('actual app boots with life module, persists baseline and survives reload/cloud apply',()=>{
 const ui=boot(new Map(),undefined,{at:start});const saved=ui.snapshot();assert.equal(saved.life.detailState.enabledAt,start);ui.get('wdEnter').onclick();assert.equal(ui.snapshot().life.detailState.enabledAt,start);ui.clock.set(start+30*M);ui.run('Wendao.sync()');const progressed=ui.snapshot();
 ui.run('Wendao.cloudApply('+JSON.stringify(saved)+')');assert.ok(ui.snapshot().life.cursor>=progressed.life.cursor);assert.ok(ui.snapshot().life.detailState.cursor>=progressed.life.detailState.cursor);
 const again=boot(ui.storage,undefined,{at:start+30*M});assert.equal(again.snapshot().life.detailState.enabledAt,start);assert.ok(again.storage.has(WD));
});
test('new night recap accepts later verified detail IDs while an old snapshot stays unchanged',()=>{
 const t=at('2026-10-26T23:00:00'),s=E.fresh(t);E.advanceLife(s,t);source(s,'rest',t+M);E.advanceLife(s,t+60*M);const recap=s.rhythmState.recaps.at(-1),before=clone(recap);assert.ok(recap.lifeDetails);
 E.advanceLife(s,t+8*3600000);assert.ok(recap.eventIds.length>before.eventIds.length);assert.ok(E.recapTimeline(s,recap).some(r=>r.kind==='detail'));
 const legacy=clone(s);delete legacy.rhythmState.recaps.at(-1).lifeDetails;const frozen=clone(legacy.rhythmState.recaps);E.advanceLife(legacy,t+9*3600000);assert.deepEqual(legacy.rhythmState.recaps,frozen);
});
test('explicit clock correction resumes at the verified present without replaying uncertain slots',()=>{
 const s=setup();source(s);E.advanceLife(s,start+120*M);E.advanceLife(s,start+90*M);assert.ok(s.life.clockPending);E.acknowledgeLifeClock(s,start+90*M);assert.ok(E.resumeLife(s,start+90*M));const before=clone(s.life.ledger);E.advanceLife(s,start+90*M);assert.deepEqual(s.life.ledger,before);assert.equal(s.life.detailState.hold,null);
});
test('main bookroom does not display her portrait when the life projection locates her elsewhere',()=>{
 const ui=boot(new Map(),undefined,{at:start});ui.get('wdEnter').onclick();assert.equal(ui.get('wdPresenceFrame').hidden,true);assert.match(ui.get('wdText').textContent,/休息|歇|留/);
});
