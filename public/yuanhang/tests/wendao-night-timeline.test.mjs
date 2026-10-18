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
