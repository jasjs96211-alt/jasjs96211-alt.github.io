import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {boot, WD} from './helpers/wendao-dom.mjs';

const t=Date.parse('2026-10-17T10:10:00+08:00'),night=Date.parse('2026-10-17T23:10:00+08:00'),H=3600000;
const ctx={Intl,Date,Math,JSON,Set,Map};ctx.window=ctx;
for(const f of ['engine.js','story.js','world.js','motion.js','interaction.js'])vm.runInNewContext(readFileSync(new URL('../wendao/'+f,import.meta.url),'utf8'),ctx);
const E=ctx.WendaoEngine,W=ctx.WendaoWorld,M=ctx.WendaoMotion,clone=x=>JSON.parse(JSON.stringify(x));
const data=()=>({events:[],sessions:[{id:'done',date:E.day(t),at:new Date(t-1).toISOString(),subject:'622',minutes:30}],focusTimer:{running:false}});
const punishment=(at=t-H)=>({id:'ddl:test',at,result:'summons',status:'active',recoveryActions:[]});
function state(s,d,at){return {portrait:{...E.portrait(s,at),src:'original.webp'},vitals:E.vitals(s,d,at),recoveryCGAllowed:E.canViewRecoveryCG(s,at)}}
function open(at=t){const a=boot(new Map(),undefined,{at});a.get('wdEnter').onclick();a.get('wdCompanion').onclick();return a}
function travel(a,id){a.get('wdCompanionLayer').children.find(x=>x.dataset.wcTravel===id).onclick()}
function configure(a,script){a.run(`(()=>{const f=window.Wendao.cloudRead();${script};localStorage.setItem('${WD}',JSON.stringify(window.WendaoEngine.migrateLegacySave(f)));window.Wendao.reloadLocal()})()`)}

test('healthy bedtime and ordinary low-energy rest never select the injury CG',()=>{
 for(const tired of [false,true]){const s=E.fresh(night-H),d=data();if(tired)s.character.fatigue=90;const body=state(s,d,night),w=W.derive({at:night,state:body,playerPlace:'bedroom'}),p=M.plan({world:w,state:body,at:night});assert.equal(w.sister,'bedroom');assert.equal(p.mode,'actor');assert.equal(p.action,'rest');assert.equal(p.cgId,undefined);assert.equal(p.src,'original.webp');}
});
test('only an occurred active injury qualifies; visual illness alone, future, corrected and healed do not',()=>{
 for(const kind of ['none','future','corrected','healed']){const s=E.fresh(t-H);s.character.health=40;if(kind!=='none')s.supervision.deadlines.punishments=[{...punishment(kind==='future'?t+H:t-H),...(kind==='corrected'?{status:'corrected',correctedAt:t-1}:kind==='healed'?{status:'resolved',resolvedAt:t-1}:{})}];assert.equal(E.canViewRecoveryCG(s,t),false,kind);const body=state(s,data(),t),w=W.derive({at:t,state:body,playerPlace:'bedroom'});assert.notEqual(M.plan({world:w,state:body,at:t}).mode,'cg',kind);}
});
test('same-day injury and next-day illness both retain the true recovery CG eligibility',()=>{
 const s=E.fresh(t-H);s.supervision.deadlines.punishments=[punishment()];const before=JSON.stringify(s.supervision.deadlines);
 for(const [at,visual]of [[t,'injured'],[t+24*H,'ill']]){const body=state(s,data(),at),w=W.derive({at,state:body,playerPlace:'bedroom'}),p=M.plan({world:w,state:body,at});assert.equal(body.portrait.state,visual);assert.equal(p.cgId,'recovery-bed');}
 assert.equal(JSON.stringify(s.supervision.deadlines),before);
});
test('healthy night in the real companion never loads or unlocks recovery art; old unlocks stay intact',()=>{
 const a=open(night);travel(a,'bedroom');assert.equal(a.get('wcRecovery').hidden,true);assert.doesNotMatch(a.get('wcPortrait').src,/recovery-cg/);assert.equal(a.snapshot().story.unlockedCG.includes('recovery-bed'),false);
 configure(a,"f.story.unlockedCG.push('recovery-bed')");assert.equal(a.snapshot().story.unlockedCG.filter(x=>x==='recovery-bed').length,1);assert.equal(a.snapshot().chronicle.filter(x=>x.id==='cg:recovery-bed').length,0);
});
test('final app gallery write rejects a stale loaded CG after injury has healed, even before repaint',()=>{
 const a=open();configure(a,`f.supervision.deadlines.punishments=[${JSON.stringify(punishment())}]`);a.get('wcFindSister').onclick();const load=a.get('wcRecovery').onload;
 a.run('window.WendaoCompanion.refresh=()=>{}');configure(a,"f.supervision.deadlines.punishments[0].status='resolved';f.supervision.deadlines.punishments[0].resolvedAt=Date.now()");
 load();assert.equal(a.snapshot().story.unlockedCG.includes('recovery-bed'),false);assert.equal(a.snapshot().chronicle.some(x=>x.id==='cg:recovery-bed'),false);
 // A denied stale callback must not consume the later legitimate viewing receipt.
 configure(a,"f.supervision.deadlines.punishments[0].status='active';delete f.supervision.deadlines.punishments[0].resolvedAt");load();assert.equal(a.snapshot().story.unlockedCG.includes('recovery-bed'),true);
});
test('next-day illness actually unlocks once without altering DDL history',()=>{
 const a=open(t+24*H);configure(a,`f.supervision.deadlines.punishments=[${JSON.stringify(punishment())}]`);a.get('wcFindSister').onclick();const before=a.snapshot();a.get('wcRecovery').onload();a.run('window.WendaoCompanion.refresh()');a.get('wcRecovery').onload();const after=a.snapshot();assert.equal(after.story.unlockedCG.filter(x=>x==='recovery-bed').length,1);assert.equal(after.chronicle.filter(x=>x.id==='cg:recovery-bed').length,1);assert.deepEqual(after.supervision.deadlines.punishments,before.supervision.deadlines.punishments);
});
test('following letter captures actual local place and activity instead of autonomous schedule',()=>{
 const s=E.fresh(t-H),d=data();s.supervision.mode='awake';s.settings.dailyMessages=false;s.life.ledger=[{id:'life:study',at:t-1,kind:'study',activity:'医理'}];
 const view={player:'terrace',following:true},row=E.proactive(s,d,t,{worldView:view});assert.equal(row.contextSnapshot.locationId,'terrace');assert.equal(row.contextSnapshot.location,'望星台');assert.equal(row.contextSnapshot.activity,'与妹妹同行');assert.equal(row.contextSnapshot.following,true);assert.equal(row.contextSnapshot.locationSource,'companion-view');assert.equal(row.contextSnapshot.locationScope,'at-creation');
 view.player='herbs';assert.equal(row.contextSnapshot.locationId,'terrace');
});
test('declined following uses actual autonomous bedside location, not requested player place',()=>{
 const s=E.fresh(t-H),d=data();s.supervision.mode='awake';s.settings.dailyMessages=false;s.supervision.deadlines.punishments=[punishment()];const row=E.proactive(s,d,t,{worldView:{player:'terrace',following:true}});assert.equal(row.contextSnapshot.locationId,'bedroom');assert.equal(row.contextSnapshot.following,false);
});
test('offline following prose names the creation place and never claims work at a different place',()=>{
 const s=E.fresh(t-H),d=data();
 for(const place of ['terrace','herbs','garden']){const prepared=ctx.WendaoInteraction.prepare(s,d,t,{id:'daily:follow',trigger:'daily'},{...state(s,d,t),worldView:{player:place,following:true}});assert.ok(prepared.text.includes(prepared.snapshot.location));assert.match(prepared.text,/与你一道/);assert.doesNotMatch(prepared.text,/我在药庐理药签|我手边还摊着医书/);}
});
test('two devices with different local maps keep one whole frozen letter snapshot and text',()=>{
 const s=E.fresh(t-H),d=data();s.supervision.mode='awake';s.settings.dailyMessages=false;const a=clone(s),b=clone(s);
 const ma=E.proactive(a,d,t,{worldView:{player:'terrace',following:true}}),mb=E.proactive(b,d,t,{worldView:{player:'herbs',following:true}}),before=[clone(ma),clone(mb)];
 const ab=clone(E.merge(a,b)),ba=clone(E.merge(b,a));assert.deepEqual(ab.messages,ba.messages);assert.equal(ab.messages.length,1);assert.ok(before.some(x=>JSON.stringify(x)===JSON.stringify(ab.messages[0])));assert.equal(E.proactive(ab,d,t+H,{worldView:{player:'garden',following:true}}),null);assert.deepEqual(ab.messages,ba.messages);
});
test('app save while following uses the current view; closing restores explicit autonomous snapshot source',()=>{
 const a=open();configure(a,"f.supervision.mode='awake';f.settings.dailyMessages=false;f.settings.wakeReminders=false;f.proactiveState.lastAt=0;f.messages=[];f.proactiveState.seen=[];f.life.ledger=[{id:'life:study',at:Date.now()-1,kind:'study',activity:'医理'}]");
 a.get('wcFindSister').onclick();a.get('wcFollow').onclick();travel(a,'terrace');assert.equal(a.run('window.WendaoCompanion.getWorldView().following'),true);
 a.run("state.sessions.push({id:'new-view-record',date:'2026-10-17',minutes:30,subject:'622',at:new Date(Date.now()-1).toISOString()});save()");
 let row=a.snapshot().messages.find(m=>m.evidenceId==='study:new-view-record');assert.equal(row.contextSnapshot.locationId,'terrace');assert.equal(row.contextSnapshot.following,true);
 const frozen=clone(row),receiver=open();travel(receiver,'herbs');receiver.run('window.Wendao.cloudApply('+JSON.stringify(a.run('window.Wendao.cloudRead()'))+')');assert.equal(receiver.get('wcBackdrop').dataset.location,'herbs');assert.deepEqual(receiver.snapshot().messages.find(m=>m.id===frozen.id),frozen);
 receiver.get('wcLetters').onclick();assert.match(receiver.get('wdInbox').innerHTML,/写信时：望星台 · 与妹妹同行/);
 a.get('wcClose').onclick();assert.equal(a.run('window.WendaoCompanion.getWorldView()'),null);
 a.clock.set(t+H);a.run("state.sessions.push({id:'after-close',date:'2026-10-17',minutes:30,subject:'822',at:new Date(Date.now()-1).toISOString()});save()");
 row=a.snapshot().messages.find(m=>m.evidenceId==='study:after-close');assert.equal(row.contextSnapshot.locationSource,'autonomous-schedule');assert.equal(row.contextSnapshot.following,false);
});
test('AI enrichment after leaving companion still receives the original following location',async()=>{
 let payload;
 const fetcher=async(url,opts)=>{payload=JSON.parse(opts.body);return {ok:true,json:async()=>({reply:'方才与你同行，到望星台歇了片刻。'})}};
 const a=boot(new Map(),fetcher,{at:t});a.get('wdEnter').onclick();a.get('wdCompanion').onclick();
 configure(a,"f.supervision.mode='awake';f.settings.dailyMessages=false;f.settings.wakeReminders=false;f.proactiveState.lastAt=0;f.messages=[];f.proactiveState.seen=[];f.life.ledger=[{id:'life:study',at:Date.now()-1,kind:'study',activity:'医理'}]");
 a.get('wcFindSister').onclick();a.get('wcFollow').onclick();travel(a,'terrace');
 a.run("state.sessions.push({id:'ai-follow',date:'2026-10-17',minutes:30,subject:'622',at:new Date(Date.now()-1).toISOString()});save()");
 configure(a,"f.supervision.mode='awake';f.settings.online=true;f.settings.autoAI=true;f.settings.chatEndpoint=window.WendaoEngine.fresh(Date.now()).settings.chatEndpoint");a.run("window.YuanhangAccount={token:async()=> 'test-only-jwt'}");a.get('wcClose').onclick();a.run('window.Wendao.sync()');await new Promise(setImmediate);
 assert.equal(payload.context.proactiveEvent.creationContext.locationId,'terrace');assert.equal(payload.context.proactiveEvent.creationContext.following,true);assert.match(payload.messages.at(-1).content,/创建时的快照为准/);assert.equal(a.snapshot().messages.find(m=>m.evidenceId==='study:ai-follow').contextSnapshot.locationId,'terrace');
});
