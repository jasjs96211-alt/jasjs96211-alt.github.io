// Node-only behavioral regression harness. This does not test browser layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=readFileSync(new URL('../usage.js',import.meta.url),'utf8')+'\n'+[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
const KEY='sisu_2027_study_workbench_v1';
function boot({data,storage=new Map(),now='2026-10-10T12:00:00Z',hash=''}={}){
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
 const context=vm.createContext({console,Date:ClockDate,Intl,Math,Set,JSON,Number,String,Array,Object,Map,RegExp,Blob,URL,TextDecoder,Uint8Array,atob,decodeURIComponent,
 localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
 document:{hidden:false,getElementById:get,querySelectorAll:s=>s==='[data-min]'?presets:s==='[data-filter]'?filters:s==='[data-period]'?periods:[],addEventListener(n,fn){(listeners[n]??=[]).push(fn)},createElement:()=>element(),body:{appendChild(){}}},
 window:{addEventListener(n,fn){(wl[n]??=[]).push(fn)},scrollTo(){}},navigator:{},location:{protocol:'file:',hash,pathname:'/yuanhang/',search:''},history:{state:null,replaceState(){context.location.hash=''}},confirm:()=>true,prompt:()=>{},setTimeout:()=>1,clearTimeout(){},setInterval:()=>2,clearInterval(){},fetch(){throw Error('Unexpected network request')}});
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

async function previewUsage(a,text){await a.get('usageFile').onchange({target:{files:[{size:Buffer.byteLength(text),text:async()=>text}],value:'file'}})}
const usageLine=(start='2026-10-10T12:00:00+08:00',minutes='30',separator='｜')=>`三角洲行动 ${separator} ${start} ${separator} ${minutes}分钟`;
test('usage import previews without mutation, preserves study/manual records, and survives reload',async()=>{
 const original={...data([event()],[{id:'s',date:'2026-10-10',minutes:60,subject:'英语'}]),screen:{'2026-10-10':{total:120,entertainment:90,game:60,note:'系统读数'}}};
 const a=boot({data:original});await previewUsage(a,usageLine());assert.deepEqual(a.snapshot(),original);assert.equal(a.get('confirmUsageImport').disabled,false);
 a.get('confirmUsageImport').onclick();assert.equal(a.snapshot().usageSessions.length,1);assert.deepEqual(a.snapshot().screen,original.screen);assert.deepEqual(a.snapshot().sessions,original.sessions);assert.deepEqual(a.snapshot().events,original.events);
 const b=boot({storage:a.storage});assert.equal(b.get('usageToday').textContent,'30 分钟');assert.equal(b.get('statScreen').textContent,'1.5h');assert.match(b.get('usageDashboardHint').textContent,/30 分钟/);
});
test('usage import accepts BOM, CRLF, both pipes, spaces, fractions and canonical timezones',async()=>{
 const a=boot();await previewUsage(a,'\uFEFF'+usageLine(undefined,'0.5','|')+'\r\n'+usageLine('2026-10-10T13:00:00+08:00','2,5')+'\r\n\r\n');a.get('confirmUsageImport').onclick();assert.equal(a.get('usageToday').textContent,'3 分钟');
 await previewUsage(a,usageLine('2026-10-10T04:00:00Z','0.5'));assert.equal(a.get('confirmUsageImport').disabled,true);assert.match(a.get('usagePreviewText').textContent,/重复 1 条/);
});
test('duplicate or manually rerun sessions do not inflate duration and new rows still import',async()=>{
 const a=boot();await previewUsage(a,[usageLine(),usageLine(),usageLine(undefined,'120')].join('\n'));assert.match(a.get('usagePreviewText').textContent,/重复 1 条/);assert.match(a.get('usagePreviewText').textContent,/时长不同 1 条/);a.get('confirmUsageImport').onclick();assert.equal(a.snapshot().usageSessions.length,1);assert.equal(a.get('usageToday').textContent,'30 分钟');
 await previewUsage(a,[usageLine(),usageLine('2026-10-10T14:00:00+08:00','15')].join('\n'));a.get('confirmUsageImport').onclick();assert.equal(a.snapshot().usageSessions.length,2);assert.equal(a.get('usageToday').textContent,'45 分钟');
});
test('invalid logs and start-only files never silently become valid usage',async()=>{
 const a=boot({data:data([event()])}),before=a.snapshot();
 const invalid=[usageLine(undefined,'-1'),usageLine(undefined,'NaN'),usageLine(undefined,'1441'),usageLine('2026-02-30T12:00:00+08:00'),usageLine('2026-10-10T12:00:00'),usageLine('2026-10-11T12:00:00+08:00'),'<img onerror=alert(1)>|2026-10-10T12:00:00+08:00|3分钟','2026-10-10T12:00:00+08:00'];
 await previewUsage(a,invalid.join('\n'));assert.equal(a.get('confirmUsageImport').disabled,true);assert.match(a.get('usagePreviewText').textContent,/格式异常 8 行/);assert.deepEqual(a.snapshot(),before);assert.doesNotMatch(a.get('usageRows').innerHTML,/onerror/);
 await previewUsage(a,usageLine()+'\n'+invalid[0]);assert.match(a.get('usagePreviewText').textContent,/可新增 1 条/);assert.match(a.get('usagePreviewText').textContent,/格式异常 1 行/);a.get('cancelUsageImport').onclick();assert.deepEqual(a.snapshot(),before);
});
test('usage statistics split midnight, union overlapping intervals and start week on Monday',async()=>{
 const a=boot();await previewUsage(a,[usageLine('2026-10-09T23:50:00+08:00','30'),usageLine('2026-10-10T00:10:00+08:00','30'),usageLine('2026-10-04T12:00:00+08:00','60'),usageLine('2026-10-05T12:00:00+08:00','60')].join('\n'));a.get('confirmUsageImport').onclick();
 assert.equal(a.get('usageToday').textContent,'40 分钟');assert.equal(a.get('usageWeek').textContent,'110 分钟');assert.equal(a.get('usageMonth').textContent,'170 分钟');a.get('usageDate').value='2026-10-09';a.get('usageDate').onchange();assert.match(a.get('usageDaySummary').textContent,/10 分钟/);
});
test('excluded test sessions stay excluded after reimport and restore without loss',async()=>{
 const a=boot();await previewUsage(a,usageLine());a.get('confirmUsageImport').onclick();const id=a.snapshot().usageSessions[0].id;
 a.get('usageRows').onclick({target:{closest:()=>({dataset:{usageToggle:id}})}});assert.equal(a.get('usageToday').textContent,'0 分钟');assert.equal(a.snapshot().usageSessions[0].excluded,true);
 await previewUsage(a,usageLine()+'\n'+usageLine('2026-10-10T14:00:00+08:00','10'));a.get('confirmUsageImport').onclick();assert.equal(a.get('usageToday').textContent,'10 分钟');
 a.get('usageRows').onclick({target:{closest:()=>({dataset:{usageToggle:id}})}});assert.equal(a.get('usageToday').textContent,'40 分钟');
});
test('usage backup roundtrip preserves exclusions; malformed usage backup rejected',async()=>{
 const a=boot();await previewUsage(a,usageLine());a.get('confirmUsageImport').onclick();a.run('state.usageSessions[0].excluded=true;save()');const original=a.snapshot();
 const b=boot();await b.get('importJson').onchange({target:{files:[{text:async()=>JSON.stringify(original)}],value:'x'}});assert.deepEqual(b.snapshot().usageSessions,original.usageSessions);assert.equal(b.get('usageToday').textContent,'0 分钟');
 const invalid={...original,usageSessions:[{...original.usageSessions[0],minutes:-1}]};await b.get('importJson').onchange({target:{files:[{text:async()=>JSON.stringify(invalid)}],value:'x'}});assert.deepEqual(b.snapshot().usageSessions,original.usageSessions);
});
test('usage storage failure preserves prior state and allows retry',async()=>{
 const original=data([event()]),a=boot({data:original});await previewUsage(a,usageLine());a.run("localStorage.setItem=()=>{throw Error('quota')}");a.get('confirmUsageImport').onclick();assert.deepEqual(a.snapshot(),original);assert.equal(a.run('state.usageSessions'),undefined);assert.match(a.get('usageImportStatus').textContent,/保存失败/);
});
test('import merges latest other-tab state at confirmation',async()=>{
 const a=boot({data:data([event()])});await previewUsage(a,usageLine());const b=boot({storage:a.storage});await previewUsage(b,usageLine());b.get('confirmUsageImport').onclick();b.run("state.events[0].title='其他标签页编辑';save()");a.get('confirmUsageImport').onclick();assert.equal(a.snapshot().events[0].title,'其他标签页编辑');assert.equal(a.snapshot().usageSessions.length,1);
});
test('stale async file reads cannot replace a newer preview or cancelled import',async()=>{
 const a=boot();let release;
 const loading=a.get('usageFile').onchange({target:{files:[{size:10,text:()=>new Promise(r=>{release=r})}],value:'x'}});
 a.get('cancelUsageImport').onclick();release(usageLine());await loading;assert.equal(a.run('pendingUsage'),null);assert.equal(a.get('confirmUsageImport').disabled,true);
});

const usageHash=text=>'#usage='+Buffer.from(text,'utf8').toString('base64');
test('usage link opens a reviewable preview, clears fragment and never writes without confirmation',()=>{
 const original=data([event()]),a=boot({data:original,hash:usageHash(usageLine())});
 assert.equal(a.run('view'),'screen');assert.equal(a.run('location.hash'),'');assert.deepEqual(a.snapshot(),original);
 assert.match(a.get('usagePreviewText').textContent,/链接带来的本次记录/);assert.match(a.get('usagePreviewRecords').textContent,/三角洲行动 · 2026-10-10 12:00 开始 · 30 分钟/);
 a.get('confirmUsageImport').onclick();assert.equal(a.snapshot().usageSessions.length,1);assert.equal(a.get('usageToday').textContent,'30 分钟');
 const b=boot({storage:a.storage,hash:usageHash(usageLine())});assert.equal(b.get('confirmUsageImport').disabled,true);assert.match(b.get('usageImportStatus').textContent,/没有新记录/);assert.equal(b.snapshot().usageSessions.length,1);
});
test('link parser accepts percent-encoded, wrapped and URL-safe UTF-8 Base64',()=>{
 const base64=Buffer.from(usageLine(),'utf8').toString('base64');
 for(const payload of [encodeURIComponent(base64),base64.match(/.{1,20}/g).join('%0A'),base64.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')]){
  const a=boot({hash:'#usage='+payload});assert.equal(a.get('confirmUsageImport').disabled,false);a.get('confirmUsageImport').onclick();assert.equal(a.get('usageToday').textContent,'30 分钟');
 }
});
test('invalid, future, oversized and multi-session links leave prior data unchanged',()=>{
 const invalid=['#usage=','#usage=%ZZ','#usage=***','#usage=/w==','#usage='+'A'.repeat(4100),usageHash(usageLine()+'\n'+usageLine('2026-10-10T13:00:00+08:00')),usageHash('三角洲行动|2026-10-10T12:00:00+08:00|<script>alert(1)</script>分钟'),usageHash(usageLine('2026-10-11T12:00:00+08:00'))];
 for(const hash of invalid){const original=data([event()]),a=boot({data:original,hash});assert.deepEqual(a.snapshot(),original);assert.equal(a.run('location.hash'),'');assert.equal(a.get('confirmUsageImport').disabled,true);assert.match(a.get('usageImportStatus').textContent,/未导入/);assert.equal(a.run('pendingUsage'),null)}
});
test('same-tab incoming link invalidates an old file read and uses latest link',async()=>{
 const a=boot();let release;
 const loading=a.get('usageFile').onchange({target:{files:[{size:20,text:()=>new Promise(r=>{release=r})}],value:'x'}});
 a.run('location.hash='+JSON.stringify(usageHash(usageLine(undefined,'12'))));a.windowEmit('hashchange');
 release(usageLine(undefined,'30'));await loading;assert.match(a.get('usagePreviewRecords').textContent,/12 分钟/);a.get('confirmUsageImport').onclick();assert.equal(a.get('usageToday').textContent,'12 分钟');
});
test('cancelled link and unrelated fragments do not modify state or interfere with navigation',()=>{
 const original=data([event()]),a=boot({data:original,hash:usageHash(usageLine())});a.get('cancelUsageImport').onclick();assert.equal(a.run('pendingUsage'),null);assert.deepEqual(a.snapshot(),original);
 const b=boot({data:original,hash:'#other-section'});assert.equal(b.run('location.hash'),'#other-section');assert.equal(b.run('view'),'dashboard');assert.deepEqual(b.snapshot(),original);
});
test('link confirmation storage failure preserves data and preview for retry',()=>{
 const original=data([event()]),a=boot({data:original,hash:usageHash(usageLine())});a.run("localStorage.setItem=()=>{throw Error('quota')}");a.get('confirmUsageImport').onclick();assert.deepEqual(a.snapshot(),original);assert.equal(a.run('state.usageSessions'),undefined);assert.equal(a.run('pendingUsage.rows.length'),1);assert.match(a.get('usageImportStatus').textContent,/保存失败/);
});
