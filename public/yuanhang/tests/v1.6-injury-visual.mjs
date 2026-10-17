import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../wendao/engine.js',import.meta.url),'utf8');
function engine(){const ctx={globalThis:{},Intl,Date,Number,Math,Object,JSON};runInNewContext(source,ctx);return ctx.globalThis.WendaoEngine}
const time=s=>Date.parse(s);
function injured(E,start){
 const s=E.fresh(start);
 s.supervision.deadlines.punishments.push({id:'test:overdue',injuryId:'injury:test',at:start,status:'active',recoveryActions:[]});
 return s;
}
test('DDL on same Beijing day shows punishment art',()=>{
 const E=engine(),start=time('2026-10-17T22:35:00+08:00'),s=injured(E,start);
 assert.equal(E.portrait(s,start+60_000).state,'injured');
 assert.equal(E.injuryFor(s.supervision.deadlines.punishments[0],start+60_000).active,true);
});
test('crossing Beijing midnight changes ONLY artwork; 48-hour acute penalty remains',()=>{
 const E=engine(),start=time('2026-10-17T23:40:00+08:00'),s=injured(E,start);
 const after=time('2026-10-18T00:10:00+08:00');
 assert.equal(E.portrait(s,after).state,'ill');
 assert.equal(E.injuryFor(s.supervision.deadlines.punishments[0],after).phase,'acute');
 assert.equal(E.injuryFor(s.supervision.deadlines.punishments[0],after).active,true);
 assert.equal(s.supervision.deadlines.punishments.length,1);
});
test('multiple DDLs: a new punishment on following day shows severe artwork again',()=>{
 const E=engine(),start=time('2026-10-17T22:20:00+08:00'),s=injured(E,start),second=time('2026-10-18T08:30:00+08:00');
 s.supervision.deadlines.punishments.push({id:'test:overdue2',injuryId:'injury:test2',at:second,status:'active',recoveryActions:[]});
 assert.equal(E.portrait(s,second+1000).state,'injured');
});
test('continuing injury after 48 hours still shows illness, not healthy',()=>{
 const E=engine(),start=time('2026-10-17T10:00:00+08:00'),s=injured(E,start);
 const later=start+70*3600000;
 assert.equal(E.portrait(s,later).state,'ill');
 assert.equal(E.injuryFor(s.supervision.deadlines.punishments[0],later).active,true);
});
test('resolved injuries are not resurrected by artwork phase change',()=>{
 const E=engine(),start=time('2026-10-12T12:00:00+08:00'),s=injured(E,start),later=start+5*86400000;
 s.supervision.deadlines.punishments[0].status='resolved';
 assert.notEqual(E.portrait(s,later).state,'injured');
 assert.equal(E.injuryFor(s.supervision.deadlines.punishments[0],later).active,false);
});
test('visual selector is pure: no modification of injury ledger or user data',()=>{
 const E=engine(),start=time('2026-10-17T20:00:00+08:00'),s=injured(E,start);
 const before=JSON.stringify(s);
 E.portrait(s,time('2026-10-18T09:00:00+08:00'));
 assert.equal(JSON.stringify(s),before);
});
