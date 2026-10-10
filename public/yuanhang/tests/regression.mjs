// Node-only behavioral regression harness. This does not test browser layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
const KEY='sisu_2027_study_workbench_v1';
function boot({data,storage=new Map(),now='2026-10-10T12:00:00Z'}={}){
 if(data)storage.set(KEY,JSON.stringify(data));
 const clock={now:Date.parse(now)},listeners={},wl={},elements=new Map();
 const element=(id='')=>({id,value:'',dataset:{},innerHTML:'',textContent:'',disabled:false,style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},addEventListener(n,fn){this[n]=fn},focus(){},click(){},remove(){}});
 for(const [,id] of html.matchAll(/\bid="([^"]+)"/g)){assert.ok(!elements.has(id),`Duplicate id ${id}`);elements.set(id,element(id))}
 const presets=[25,45,60].map(min=>({...element(),dataset:{min:String(min)}}));
 const filters=['all','unfinished','done','soon','overdue'].map(filter=>({...element(),dataset:{filter}}));
 const periods=['week','month'].map(period=>({...element(),dataset:{period}}));
 const get=id=>{assert.ok(elements.has(id),`Missing DOM element: ${id}`);return elements.get(id)};
 get('timerSubject').value=get('studySubject').value='中国现当代文学史';
 class ClockDate extends Date{constructor(...a){super(...(a.length?a:[clock.now]))}static now(){return clock.now}}
 const context=vm.createContext({console,Date:ClockDate,Intl,Math,Set,JSON,Number,String,Array,Object,Map,RegExp,Blob,URL,
 localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
 document:{hidden:false,getElementById:get,querySelectorAll:s=>s==='[data-min]'?presets:s==='[data-filter]'?filters:s==='[data-period]'?periods:[],addEventListener(n,fn){(listeners[n]??=[]).push(fn)},createElement:()=>element(),body:{appendChild(){}}},
 window:{addEventListener(n,fn){(wl[n]??=[]).push(fn)},scrollTo(){}},navigator:{},location:{protocol:'file:'},confirm:()=>true,prompt:()=>{},setTimeout:()=>1,clearTimeout(){},setInterval:()=>2,clearInterval(){},fetch(){throw Error('Unexpected network request')}});
 vm.runInContext(code,context);
 return {get,clock,storage,run:s=>vm.runInContext(s,context),emit:(name,event)=>listeners[name]?.forEach(f=>f(event)),windowEmit:(name,event)=>wl[name]?.forEach(f=>f(event)),snapshot:()=>JSON.parse(storage.get(KEY)||'null'),presets};
}
const event=(patch={})=>({id:'one',title:'文学史',start:'2026-10-09',end:'2026-10-10',category:'ddl',details:'目标',done:false,...patch});
const data=(events=[],sessions=[])=>({events,sessions,screen:{}});
const submit={preventDefault(){}};

test('startup renders all sections without modifying legacy data or cloud credentials',()=>{
 const original=data([event()],[{id:'s',date:'2026-10-09',minutes:60,subject:'英语'}]);
 const storage=new Map([['yuanhang_cloud_sync_v2','{"connected":true,"session":{"access_token":"test"}}']]);
 const a=boot({data:original,storage});assert.deepEqual(a.snapshot(),original);assert.equal(storage.get('yuanhang_cloud_sync_v2'),'{"connected":true,"session":{"access_token":"test"}}');
 assert.ok(a.get('calendarGrid').innerHTML.includes('2026-10-10'));assert.match(html,/云同步已暂停/);assert.doesNotMatch(code,/supabase|fetch\(/);
});
test('calendar preserves seven-day rows, year navigation and selected-day creation',()=>{
 const a=boot();a.run("monthCursor='2026-01';renderCalendar()");a.get('prevMonth').onclick();assert.match(a.get('monthLabel').textContent,/2025年 12月/);
 assert.equal((a.get('calendarGrid').innerHTML.match(/data-date=/g)||[]).length%7,0);
 a.emit('click',{target:{closest:()=>({dataset:{date:'2025-12-31'}})}});a.get('addSelectedDate').onclick();assert.equal(a.get('eventStart').value,'2025-12-31');
});
test('overdue DDL stays visible in totals and has its own filter',()=>{
 const a=boot({data:data([event({end:'2026-10-09'}),event({id:'two',end:'2026-10-20'})])});assert.equal(a.get('statTasks').textContent,2);assert.equal(a.get('statDue').textContent,'逾期 1 天');a.run("taskFilter='overdue';renderTasks()");assert.match(a.get('taskList').innerHTML,/已过期 1 天/);assert.doesNotMatch(a.get('taskList').innerHTML,/剩 10 天/);
});
test('completion records actual date, can be undone, and is preserved on edit',()=>{
 const a=boot({data:data([event()])});a.emit('change',{target:{dataset:{done:'one'},checked:true}});const at=a.snapshot().events[0].completedAt;assert.equal(at,'2026-10-10T12:00:00.000Z');assert.match(a.get('taskList').innerHTML,/<details/);
 a.run("openModal(today(),'one')");a.get('eventTitle').value='改名';a.get('eventForm').submit(submit);assert.equal(a.snapshot().events[0].completedAt,at);
 a.emit('change',{target:{dataset:{done:'one'},checked:false}});assert.equal(a.snapshot().events[0].completedAt,undefined);
});
test('week/month statistics exclude future records and use Monday + actual completion',()=>{
 const a=boot({data:data([event({done:true,completedAt:'2026-10-10T12:00:00Z'}),event({id:'old',done:true})],[{id:'s1',date:'2026-10-01',minutes:30,subject:'英语'},{id:'s2',date:'2026-10-05',minutes:60,subject:'英语'},{id:'s3',date:'2026-10-11',minutes:80,subject:'英语'}])});
 assert.equal(a.run('progressData().minutes'),60);assert.equal(a.run('progressData().start'),'2026-10-05');assert.equal(a.run('progressData().completed'),1);a.run("progressPeriod='month'");assert.equal(a.run('progressData().minutes'),90);
});
test('running timer survives refresh and locks original subject',()=>{
 const a=boot();a.get('timerSubject').value='英语';a.get('timerToggle').onclick();a.clock.now+=600000;
 const b=boot({storage:a.storage,now:new Date(a.clock.now).toISOString()});assert.equal(b.get('timerDisplay').textContent,'15:00');assert.equal(b.get('timerSubject').value,'英语');assert.equal(b.get('timerSubject').disabled,true);
 b.clock.now+=900000;b.run('timerTick()');assert.equal(b.snapshot().sessions.length,1);assert.equal(b.snapshot().sessions[0].subject,'英语');
 const c=boot({storage:b.storage,now:new Date(b.clock.now+1000).toISOString()});assert.equal(c.snapshot().sessions.length,1);assert.equal(c.get('timerDisplay').textContent,'25:00');
});
test('paused timer stays paused on refresh and resumes remaining duration',()=>{
 const a=boot();a.get('timerToggle').onclick();a.clock.now+=300000;a.get('timerToggle').onclick();
 const b=boot({storage:a.storage,now:'2026-10-10T14:00:00Z'});assert.equal(b.get('timerDisplay').textContent,'20:00');assert.equal(b.run('timer.running'),false);b.get('timerToggle').onclick();b.clock.now+=1200000;b.run('timerTick()');assert.equal(b.snapshot().sessions[0].minutes,25);
});
test('completion after reopening uses scheduled completion date in Shanghai',()=>{
 const a=boot({now:'2026-10-10T15:40:00Z'});a.get('timerToggle').onclick();
 const b=boot({storage:a.storage,now:'2026-10-12T01:00:00Z'});assert.equal(b.snapshot().sessions[0].date,'2026-10-11');assert.equal(b.snapshot().sessions[0].at,'2026-10-10T16:05:00.000Z');
});
test('second tab completion does not duplicate and preserves other-tab edits',()=>{
 const a=boot();a.get('timerToggle').onclick();const b=boot({storage:a.storage});b.run("state.events.push({id:'extra',title:'额外',start:today(),end:today(),category:'study',done:false});save()");
 a.clock.now+=1500000;b.clock.now+=1500000;a.run('timerTick()');b.run('timerTick()');assert.equal(a.snapshot().sessions.length,1);assert.ok(a.snapshot().events.some(x=>x.id==='extra'));
});
test('reset confirmation protects active timer; preset changes persist',()=>{
 const a=boot();a.get('timerToggle').onclick();a.run('confirm=()=>false');a.get('timerReset').onclick();assert.equal(a.run('timer.running'),true);a.run('confirm=()=>true');a.presets[1].onclick();assert.equal(a.snapshot().focusTimer.total,2700);assert.equal(a.snapshot().sessions.length,0);
});
test('manual study and screen time stay compatible',()=>{
 const a=boot();a.get('studyMinutes').value='90';a.get('manualStudy').submit(submit);assert.equal(a.snapshot().sessions[0].minutes,90);a.get('screenTotal').value='100';a.get('screenEntertainment').value='50';a.get('screenGame').value='20';a.get('screenForm').submit(submit);assert.equal(a.snapshot().screen['2026-10-10'].game,20);
});
test('backup import rejects invalid records without changing existing state',async()=>{
 const original=data([event()]);const a=boot({data:original});const invalid=data([event({category:'\" onclick=\"alert(1)'})]);await a.get('importJson').onchange({target:{files:[{text:async()=>JSON.stringify(invalid)}],value:'x'}});assert.deepEqual(a.snapshot(),original);assert.equal(a.run("validDate('2026-02-31')"),false);assert.equal(a.run("validBackup({events:[],sessions:[],screen:[]})"),false);
});
test('legacy backup import retains pre-import recovery snapshot and stops timer',async()=>{
 const a=boot({data:data([event()])});a.get('timerToggle').onclick();const before=a.snapshot(),imported=data([event({id:'new'})]);await a.get('importJson').onchange({target:{files:[{text:async()=>JSON.stringify(imported)}],value:'x'}});assert.deepEqual(JSON.parse(a.storage.get(KEY+'_before_import')),before);assert.equal(a.snapshot().events[0].id,'new');assert.equal(a.snapshot().focusTimer.running,false);
});
test('calendar export retains inclusive end dates and escaped text',()=>{
 const a=boot({data:data([event({title:'复习, A;B\n下一行'})])});const text=a.run('ics()');assert.match(text,/DTEND;VALUE=DATE:20261011/);assert.ok(text.includes('复习\\, A\\;B\\n下一行'));assert.match(text,/BEGIN:VALARM/);
});

test('a paused timer in another tab cannot be completed by a stale tab',()=>{
 const a=boot();a.get('timerToggle').onclick();const b=boot({storage:a.storage});b.clock.now+=300000;b.get('timerToggle').onclick();a.clock.now+=1500000;a.run('timerTick()');assert.equal(a.snapshot().sessions.length,0);assert.equal(a.run('timer.running'),false);assert.equal(a.run('timer.remaining'),1200);
});

test('failed import persistence preserves in-memory and stored data',async()=>{
 const original=data([event()]),a=boot({data:original});a.run("localStorage.setItem=(key,value)=>{if(key===STORAGE)throw Error('quota')}");await a.get('importJson').onchange({target:{files:[{text:async()=>JSON.stringify(data([event({id:'replacement'})]))}],value:'x'}});assert.deepEqual(a.snapshot(),original);assert.equal(a.run('state.events[0].id'),'one');
});
