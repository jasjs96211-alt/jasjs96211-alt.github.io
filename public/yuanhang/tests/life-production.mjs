import test from 'node:test';
import assert from 'node:assert/strict';
import '../wendao/engine.js';
import {createLifeJournal} from '../wendao/life-journal.js';
const E=globalThis.WendaoEngine,J=createLifeJournal(E),M=60000;
const at=s=>Date.parse(s+'+08:00');
const t=at('2026-10-30T22:00:00');
const source=(time)=>({id:'life:v4:2026-10-30:fixture',at:time,kind:'study',bodyState:'normal',chapter:'chapter-9-preparation',activity:'研读医理',text:'经核验的来源',delta:{autonomy:1,cultivation:3,pressure:0}});
test('production recap appends newly verified L1 detail to existing v2 snapshot',()=>{
 const s=E.fresh(t);J.enable(s,t);
 const row=source(t+70*M);s.life.ledger.push(row);
 const firstTime=at('2026-10-31T00:00:00');s.life.cursor=firstTime;
 const prior=E.nightRecap(s,firstTime);assert.ok(prior);assert.deepEqual(prior.eventIds,[row.id]);
 const later=at('2026-10-31T01:00:00');s.life.cursor=later;
 const details=J.advance(s,later).added;assert.equal(details.length,2);
 const after=E.nightRecap(s,later);
 assert.equal(after.id,prior.id);assert.equal(after.eventIds.length,3);
 const timeline=E.recapTimeline(s,after);
 assert.equal(timeline.length,3);
 assert.ok(timeline.some(x=>x.sourceEventId===row.id&&x.previousEventId===row.id));
});
test('recap filters unresolved details but preserves event IDs for provenance and migration',()=>{
 const s=E.fresh(t);J.enable(s,t);const row=source(t+70*M);s.life.ledger.push(row);
 const later=at('2026-10-31T01:00:00');s.life.cursor=later;
 J.advance(s,later);const recap=E.nightRecap(s,later);assert.equal(E.recapTimeline(s,recap).length,3);
 const detail=s.life.ledger.find(x=>x.kind==='detail');detail.status='unresolved';
 assert.equal(E.recapTimeline(s,recap).length,2);
 assert.ok(recap.eventIds.includes(detail.id));
});
test('engine merge retains journal metadata and validates its monotone cursor',()=>{
 const a=E.fresh(t),b=E.fresh(t);J.enable(a,t);J.enable(b,t);
 const newer=t+70*M;a.life.cursor=newer;b.life.cursor=newer;
 J.advance(a,newer);J.advance(b,newer);
 const merged=E.merge(a,b);assert.equal(merged.life.detailState.cursor,newer);
 assert.ok(E.validate(merged));
 merged.life.detailState.cursor=newer+M;assert.equal(E.validate(merged),false);
});
test('legacy save without detailState remains valid and old recap keeps original text',()=>{
 const s=E.fresh(t);assert.equal(s.life.detailState,undefined);assert.ok(E.validate(s));
 s.rhythmState.recaps.push({id:'recap:2026-10-30',date:'2026-10-30',at:t+M,text:'旧式概述',eventIds:[]});
 assert.equal(E.nightRecap(s,at('2026-10-31T00:00:00')).text,'旧式概述');
});
