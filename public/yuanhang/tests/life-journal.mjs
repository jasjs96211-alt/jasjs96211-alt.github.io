import test from 'node:test';
import assert from 'node:assert/strict';
import '../wendao/engine.js';
import {createLifeJournal} from '../wendao/life-journal.js';
const E=globalThis.WendaoEngine,J=createLifeJournal(E),M=60000,D=86400000;
const at=t=>Date.parse(t+'+08:00'),start=at('2026-10-26T08:00:00'),clone=x=>JSON.parse(JSON.stringify(x));
function setup(){const s=E.fresh(start);J.enable(s,start);return s;}
function add(s,kind='study',time=start+M,body='normal'){
  const row={id:'life:v4:'+E.day(time)+':test-'+kind,at:time,kind,bodyState:body,chapter:'chapter-9-preparation',activity:'来源事实',text:'已记录的来源',delta:{}};
  s.life.ledger.push(row);return row;
}
function advance(s,to){s.life.cursor=to;return J.advance(s,to);}
const facts=s=>JSON.stringify({character:s.character,supervision:s.supervision,story:s.story,cultivation:s.cultivation,messages:s.messages,settings:s.settings});
test('first enable only establishes a baseline and never elaborates old sources',()=>{
 const s=E.fresh(start-D);add(s,'study',start-10*M);s.life.cursor=start;
 assert.equal(J.advance(s,start).reason,'baseline-only');advance(s,start+60*M);assert.equal(s.life.ledger.length,1);
 assert.equal(J.enable(s,start+M),false);assert.throws(()=>J.enable(E.fresh(start),start-1));
});
test('minute events form a causal chain with deterministic times, no premature or duplicate rows',()=>{
 const s=setup(),parent=add(s);assert.equal(advance(s,start+5*M).added.length,0);
 const first=advance(s,start+30*M).added;assert.equal(first.length,1);assert.equal(first[0].previousEventId,parent.id);
 const second=advance(s,start+60*M).added;assert.equal(second.length,1);assert.equal(second[0].previousEventId,first[0].id);
 assert.ok(first[0].at>parent.at&&second[0].at>first[0].at);assert.equal(first[0].location,'study');
 assert.equal(J.advance(s,start+60*M).added.length,0);assert.equal(s.chronicle.length,2);
});
test('incremental foreground, one offline return and reload agree for the same sources',()=>{
 const a=setup(),b=setup();add(a);add(b);
 for(let t=start+M;t<=start+60*M;t+=M)advance(a,t);
 advance(b,start+60*M);assert.deepEqual(J.timeline(a),J.timeline(b));
 const c=E.migrateLegacySave(clone(b));assert.equal(J.advance(c,start+60*M).added.length,0);assert.ok(E.validate(c));
});
test('elaborating study, pressure, rest and social never settles health, study, rewards or story',()=>{
 for(const kind of ['study','pressure','rest','social']){
  const s=setup();add(s,kind);const before=facts(s);advance(s,start+60*M);assert.equal(facts(s),before);
  assert.ok(s.life.ledger.filter(r=>r.kind==='detail').every(r=>Object.values(r.delta).every(v=>v===0)));
 }
});
test('night and illness constrain location and prose, without waking or penalizing the player',()=>{
 const night=at('2026-10-26T23:00:00'),s=E.fresh(night);J.enable(s,night);s.supervision.mode='sleep';
 add(s,'rest',night+M,'injured');const before=facts(s);const rows=advance(s,night+60*M).added;
 assert.equal(rows.length,2);assert.ok(rows.every(r=>r.location==='bedroom'&&r.bodyState==='injured'));assert.match(rows[0].text,/没有出门/);assert.equal(facts(s),before);
 for(const body of ['ill','tired']){const s=setup();add(s,'study',start+M,body);const rows=advance(s,start+60*M).added;assert.ok(rows.every(r=>r.cause.rule==='health-rest'));}
});
test('a later authoritative injury stops active work at the child event time',()=>{
 const s=setup();add(s);const data={sessions:[],events:[{id:'ddl',category:'ddl',end:E.day(start),dueAt:new Date(start+35*M).toISOString(),title:'fixture',done:false}]};
 E.checkDeadlines(s,data,start);advance(s,start+30*M);E.checkDeadlines(s,data,start+35*M+1);
 const rows=advance(s,start+60*M).added;assert.equal(rows.length,1);assert.equal(rows[0].cause.rule,'health-rest');assert.equal(rows[0].cause.injuryIds.length,1);
 const earlier=s.life.ledger.find(r=>r.kind==='detail'&&r.step===0);assert.equal(earlier.cause.rule,'study-followup');
});
test('a newer source interrupts an unfinished chain instead of overlapping activities',()=>{
 const s=setup();add(s);add(s,'rest',start+30*M);advance(s,start+90*M);
 const rows=s.life.ledger.filter(r=>r.kind==='detail');assert.equal(rows.filter(r=>r.sourceEventId.endsWith('test-study')).length,1);
 assert.equal(rows.filter(r=>r.sourceEventId.endsWith('test-rest')).length,2);
});
test('unknown, future, conflicting or unapproved chapter sources cannot become facts',()=>{
 for(const mutate of [(s,p)=>p.kind='medicine',(s,p)=>p.chapter='unknown-future',(s,p)=>p.at=start+D,(s,p)=>s.life.ledger.push({...p,bodyState:'injured'}),(s,p)=>p.bodyState='unknown']){
  const s=setup(),p=add(s);mutate(s,p);assert.equal(advance(s,start+60*M).added.length,0);
 }
});
test('clock and unverified-state holds require explicit resume and do not replay the gap',()=>{
 for(const block of [s=>s.life.clockPending={},s=>s.supervision.pending={},s=>s.supervision.deadlines.cloudPending=true,s=>s.supervision.deadlines.offlinePending=true]){
  const s=setup();add(s);block(s);assert.equal(advance(s,start+30*M).added.length,0);assert.equal(J.resume(s,start+30*M),false);
  s.life.clockPending=null;s.supervision.pending=null;s.supervision.deadlines.cloudPending=false;s.supervision.deadlines.offlinePending=false;
  assert.equal(advance(s,start+60*M).reason,'resume-required');assert.ok(J.resume(s,start+60*M));assert.equal(advance(s,start+90*M).added.length,0);
 }
 const s=setup();assert.equal(J.advance(s,start-1).reason,'clock');assert.equal(J.advance(s,start+32*D).added.length,0);
});
test('detail generation waits for the existing engine and bounds long offline catchup',()=>{
 const s=setup();assert.equal(J.advance(s,start+M).reason,'source-not-advanced');
 const before=facts(s);E.advanceAutonomy(s,start+10*D);const rows=J.advance(s,start+10*D).added;
 assert.ok(rows.length>0&&rows.length<=24);assert.ok(rows.every(r=>r.at>=start+7*D));
 assert.deepEqual(s.story,JSON.parse(before).story);assert.equal(s.supervision.deadlines.punishments.length,0);
});
test('merge is idempotent and commutative for detail facts and reconciles newly received injuries',()=>{
 const a=setup(),b=setup();add(a);add(b);advance(a,start+60*M);advance(b,start+30*M);
 const ab=J.merge(a,b),ba=J.merge(b,a);assert.deepEqual(ab.life,ba.life);assert.deepEqual(J.merge(ab,b).life,ab.life);
 const data={sessions:[],events:[{id:'ddl',category:'ddl',end:E.day(start),dueAt:new Date(start+2*M).toISOString(),title:'fixture',done:false}]};
 E.checkDeadlines(b,data,start);E.checkDeadlines(b,data,start+2*M+1);
 const merged=J.merge(a,b),rows=merged.life.ledger.filter(r=>r.kind==='detail');assert.ok(rows.every(r=>r.cause.rule==='health-rest'));
 assert.ok(rows.every(r=>merged.chronicle.find(c=>c.id===r.id).text===r.text));assert.ok(E.validate(merged));
});
test('existing recap includes real child timestamps and source references; projection cannot mutate save',()=>{
 const t=at('2026-10-26T23:00:00'),s=E.fresh(t);J.enable(s,t);add(s,'rest',t+M);advance(s,t+60*M);
 const recap=E.nightRecap(s,t+9*3600000),rows=E.recapTimeline(s,recap);assert.equal(rows.length,3);
 const before=JSON.stringify(s),timeline=J.timeline(s);timeline[0].text='changed';assert.equal(JSON.stringify(s),before);
 assert.ok(rows.every(r=>s.life.ledger.some(source=>source.id===r.eventId&&source.at===r.occurredAt)));assert.ok(rows.filter(r=>r.kind==='detail').every(r=>s.life.ledger.some(source=>source.id===r.sourceEventId&&source.kind!=='detail')));
});
test('later healing cannot rewrite a past injured night into healthy work',()=>{
 const s=setup();add(s);const data={sessions:[],events:[{id:'ddl',category:'ddl',end:E.day(start),dueAt:new Date(start+2*M).toISOString(),title:'fixture',done:false}]};
 E.checkDeadlines(s,data,start);E.checkDeadlines(s,data,start+2*M+1);advance(s,start+60*M);
 const p=s.supervision.deadlines.punishments[0];p.status='resolved';p.resolvedAt=start+4*D;p.recoveryActions=[1,2,3,4].map(n=>({id:'care:'+n,at:start+n*D}));
 J.reconcile(s);assert.ok(s.life.ledger.filter(r=>r.kind==='detail').every(r=>r.cause.rule==='health-rest'));
});
test('continuous rest across midnight does not generate a second identical detail chain',()=>{
 const t=at('2026-10-26T22:55:00'),s=E.fresh(t);J.enable(s,t);E.advanceAutonomy(s,t+3*3600000);
 const rows=J.advance(s,t+3*3600000).added;assert.equal(rows.length,2);assert.ok(rows.every(r=>E.day(r.at)==='2026-10-26'));
});
test('merged earlier replacement activity invalidates a stale continuation instead of showing overlap',()=>{
 const a=setup(),b=setup();add(a);add(b);advance(a,start+60*M);add(b,'rest',start+30*M);advance(b,start+60*M);
 const merged=J.merge(a,b);assert.equal(J.timeline(merged).filter(r=>r.sourceEventId?.endsWith('test-study')).length,1);
 assert.ok(merged.life.ledger.some(r=>r.status==='unresolved'));assert.deepEqual(J.timeline(merged),J.timeline(J.merge(b,a)));
});
test('existing resource projection receives no extra XP, recovery or meal effects from detail rows',()=>{
 const a=setup();add(a,'study');const b=clone(a);advance(a,start+60*M);b.life.cursor=start+60*M;
 const data={sessions:[],events:[]};E.derive(a,data,start+60*M);E.derive(b,data,start+60*M);
 assert.deepEqual(E.vitals(a,data,start+60*M),E.vitals(b,data,start+60*M));assert.deepEqual(a.character,b.character);
});
