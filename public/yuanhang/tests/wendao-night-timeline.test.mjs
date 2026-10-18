import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../wendao/engine.js',import.meta.url),'utf8');
const sandbox={Date,Intl,Math,JSON,Object,Array,Set,Map,Number,String,Error};
runInNewContext(source,sandbox);
const E=sandbox.WendaoEngine;
const at=value=>Date.parse(value+'+08:00');
const sample=(id,time,text)=>({id,at:at(time),kind:'rest',activity:'温养与休息',text,bodyState:'ill',delta:{}});

test('night recap shows only recorded event times, in Beijing order',()=>{
 const now=at('2026-10-18T08:00:00');
 const s=E.fresh(at('2026-10-17T18:00:00'));
 s.life.ledger=[sample('later','2026-10-18T06:00:00','晨间调息'),sample('first','2026-10-18T00:00:00','夜里静养')];
 const recap=E.nightRecap(s,now);
 assert.equal(recap.formatVersion,2);
 assert.deepEqual([...recap.eventIds],['first','later']);
 const events=E.recapTimeline(s,recap);
 assert.deepEqual(Array.from(events,r=>r.eventId),['first','later']);
 assert.deepEqual(Array.from(events,r=>r.factText),['夜里静养','晨间调息']);
 assert.equal(E.nightRecap(s,now).id,recap.id);
 assert.equal(s.rhythmState.recaps.length,1);
});
test('empty ledger never invents nightly events',()=>{
 const s=E.fresh(at('2026-10-17T18:00:00'));
 assert.equal(E.nightRecap(s,at('2026-10-18T08:00:00')),null);
 assert.equal(s.rhythmState.recaps.length,0);
});
test('legacy recap projects surviving IDs without inventing missing timestamps',()=>{
 const s=E.fresh(at('2026-10-17T18:00:00'));
 s.life.ledger=[sample('kept','2026-10-18T00:00:00','卧榻调息')];
 const legacy={id:'recap:2026-10-17',date:'2026-10-17',at:at('2026-10-18T08:00:00'),text:'旧版概述',eventIds:['missing','kept']};
 s.rhythmState.recaps.push(legacy);
 assert.deepEqual(Array.from(E.recapTimeline(s,legacy),r=>r.eventId),['kept']);
 assert.equal(E.nightRecap(s,legacy.at).text,'旧版概述');
 assert.equal(s.rhythmState.recaps.length,1);
});
test('night timeline filters daytime events and duplicate IDs',()=>{
 const s=E.fresh(at('2026-10-17T18:00:00'));
 s.life.ledger=[sample('before','2026-10-17T16:00:00','白日'),sample('yes','2026-10-17T23:00:00','夜间'),sample('yes','2026-10-17T23:00:00','重复'),sample('after','2026-10-18T13:00:00','午后')];
 const recap={date:'2026-10-17',at:at('2026-10-18T08:00:00'),eventIds:['before','yes','after']};
 assert.deepEqual(Array.from(E.recapTimeline(s,recap),r=>r.eventId),['yes']);
});

test('clock uncertainty and reverse time do not create a recap',()=>{
 const s=E.fresh(at('2026-10-18T00:00:00'));
 s.life.ledger=[sample('night','2026-10-18T00:00:00','静养')];
 s.life.clockPending={reason:'clock change'};
 assert.equal(E.nightRecap(s,at('2026-10-18T08:00:00')),null);
 s.life.clockPending=null;s.life.cursor=at('2026-10-18T09:00:00');
 assert.equal(E.nightRecap(s,at('2026-10-18T08:00:00')),null);
 assert.equal(s.rhythmState.recaps.length,0);
});
test('cross-device v2 union retains both sources, is commutative and does not settle values',()=>{
 const now=at('2026-10-18T08:00:00'),start=at('2026-10-17T18:00:00');
 const a=E.fresh(start),b=E.fresh(start);
 a.life.ledger=[sample('a','2026-10-17T23:00:00','休息')];
 b.life.ledger=[sample('b','2026-10-18T06:00:00','温养')];
 E.nightRecap(a,now);E.nightRecap(b,now);
 const m=E.merge(a,b),n=E.merge(b,a),before=JSON.stringify(m);
 assert.deepEqual(Array.from(E.recapTimeline(m,m.rhythmState.recaps[0]),x=>x.eventId),['a','b']);
 assert.deepEqual(JSON.parse(JSON.stringify(m.rhythmState.recaps)),JSON.parse(JSON.stringify(n.rhythmState.recaps)));
 E.recapTimeline(m,m.rhythmState.recaps[0]);assert.equal(JSON.stringify(m),before);
 assert.equal(m.supervision.deadlines.punishments.length,0);
});
test('noon is excluded and duplicate conflict selection follows authoritative union',()=>{
 const s=E.fresh(at('2026-10-17T18:00:00'));
 s.life.ledger=[sample('x','2026-10-18T06:00:00','原文'),{...sample('x','2026-10-18T06:00:00','修订'),updatedAt:1},sample('noon','2026-10-18T12:00:00','午间')];
 const r=E.nightRecap(s,at('2026-10-18T13:00:00'));
 assert.deepEqual(Array.from(E.recapTimeline(s,r),x=>x.factText),['修订']);
});

test('real inbox renderer preserves legacy text, escapes event text and includes prior nights',async()=>{
 const {boot,WD}=await import('./helpers/wendao-dom.mjs');
 const now=at('2026-10-18T08:00:00'),s=E.fresh(now);
 s.life.ledger=[sample('saved','2026-10-18T00:00:00','<img onerror=bad>卧榻调息')];
 s.rhythmState.recaps=[
  {id:'recap:2026-10-15',date:'2026-10-15',at:now,text:'更早原文',eventIds:[]},
  {id:'recap:2026-10-16',date:'2026-10-16',at:now,text:'中间原文',eventIds:[]},
  {id:'recap:2026-10-17',date:'2026-10-17',at:now,text:'旧版完整原文',eventIds:['missing','saved']}
 ];
 const a=boot(new Map([[WD,JSON.stringify(s)]]),undefined,{at:now});
 a.get('wdEnter').onclick();a.get('wdInboxButton').onclick();
 const html=a.get('wdInbox').innerHTML;
 assert.match(html,/00:00/);assert.match(html,/旧版完整原文/);assert.match(html,/更早原文/);
 assert.match(html,/&lt;img onerror=bad&gt;/);assert.doesNotMatch(html,/<img onerror=bad>/);
 assert.match(html,/未补造时刻/);
});
