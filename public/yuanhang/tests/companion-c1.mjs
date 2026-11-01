import test from 'node:test';
import assert from 'node:assert/strict';
import {boot} from './helpers/wendao-dom.mjs';
const at=Date.parse('2026-11-01T10:00:00+08:00');
const open=ui=>{ui.get('wdEnter').onclick();ui.get('wdCultivateQuick').onclick();};
test('C1 reads real timer completion once; reset/pause add no study or rewards; reopening restores receipt',()=>{
 const ui=boot(new Map(),undefined,{at});open(ui);const before=ui.snapshot().cultivation.xp;
 ui.get('wcStart').onclick();ui.clock.set(at+60000);ui.get('wcPause').onclick();
 assert.match(ui.get('wcEffortText').textContent,/暂停/);assert.equal(ui.data.sessions.length,1);
 ui.get('wcReset').onclick();assert.equal(ui.data.sessions.length,1);
 ui.get('wcStart').onclick();ui.clock.set(at+26*60000);
 for(const fn of [...ui.timers.values()])fn();
 const data=JSON.parse(ui.storage.get('sisu_2027_study_workbench_v1'));
 assert.equal(data.sessions.filter(s=>s.source==='timer').length,1);
 assert.match(ui.get('wcEffortProgress').textContent,/25 分钟/);
 const xp=ui.snapshot().cultivation.xp;ui.get('wcClose').onclick();ui.get('wdCultivateQuick').onclick();
 assert.equal(ui.snapshot().cultivation.xp,xp);assert.ok(xp>=before);
 const again=boot(ui.storage,undefined,{at:at+26*60000});open(again);assert.match(again.get('wcEffortProgress').textContent,/25 分钟/);
});
test('receipts retain sources and self-reported mastery, newest first, without inventing live speech',()=>{
 const ui=boot(new Map(),undefined,{at});
 const view=ui.run(`WendaoCompanion.effortView({at:${at},sessions:[{id:'a',date:'2026-11-01',minutes:12,at:'2026-11-01T01:00:00Z',source:'timer'},{id:'b',date:'2026-11-01',minutes:8,at:'2026-11-01T01:30:00Z'},{id:'a',date:'2026-11-01',minutes:12}],mastery:[{id:'m',title:'文论',level:'dictation',at:${at-1000}}],world:{sister:'bedroom',together:true}})`);
 assert.equal(view.minutes,20);assert.equal(view.rows[0].kind,'dictation');assert.equal(view.rows[1].source,'自行记录');assert.equal(view.rows[2].source,'计时完成');assert.equal(view.heading,'功课留痕');assert.match(view.context,/不表示/);
 for(const world of [{together:false},{together:true,unwell:true},{together:true,busy:true},{together:true,clockDispute:true}])assert.equal(ui.run('WendaoCompanion.effortView('+JSON.stringify({at,world})+').heading'),'功课留痕');
});
test('mastery receipt opens the existing cultivation form',()=>{
 const ui=boot(new Map(),undefined,{at});open(ui);ui.get('wcMastery').onclick();assert.ok(ui.get('wdMastery'));assert.equal(ui.get('wdCompanionLayer').hidden,true);
});
