// Node-only behavioral regression harness. This does not test browser layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=readFileSync(new URL('../usage.js',import.meta.url),'utf8')+'\n'+[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
const KEY='sisu_2027_study_workbench_v1';
function boot({data,storage=new Map(),now='2026-10-10T12:00:00Z',hash='',cloud=false,fetcher}={}){
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
 const context=vm.createContext({console,Date:ClockDate,Intl,Math,Set,JSON,Number,String,Array,Object,Map,RegExp,Blob,URL,TextDecoder,Uint8Array,atob,decodeURIComponent,AbortSignal,
 localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
 document:{hidden:false,getElementById:get,querySelectorAll:s=>s==='[data-min]'?presets:s==='[data-filter]'?filters:s==='[data-period]'?periods:[],addEventListener(n,fn){(listeners[n]??=[]).push(fn)},createElement:()=>element(),body:{appendChild(){}}},
 window:{addEventListener(n,fn){(wl[n]??=[]).push(fn)},scrollTo(){}},navigator:{},location:{protocol:'file:',hash,pathname:'/yuanhang/',search:''},history:{state:null,replaceState(){context.location.hash=''}},confirm:()=>true,prompt:()=>{},setTimeout:()=>1,clearTimeout(){},setInterval:()=>2,clearInterval(){},fetch:fetcher||(()=>{throw Error('Unexpected network request')})});
 vm.runInContext(code,context);
 if(cloud)vm.runInContext(readFileSync(new URL('../cloud.js',import.meta.url),'utf8'),context);
 return {get,clock,storage,run:s=>vm.runInContext(s,context),emit:(name,event)=>listeners[name]?.forEach(f=>f(event)),windowEmit:(name,event)=>wl[name]?.forEach(f=>f(event)),snapshot:()=>JSON.parse(storage.get(KEY)||'null'),presets};
}
const event=(patch={})=>({id:'one',title:'文学史',start:'2026-10-09',end:'2026-10-10',category:'ddl',details:'目标',done:false,...patch});
const data=(events=[],sessions=[])=>({events,sessions,screen:{}});
const submit={preventDefault(){}};

test('startup renders all sections without modifying legacy data or cloud credentials',()=>{
 const original=data([event()],[{id:'s',date:'2026-10-09',minutes:60,subject:'英语'}]);
 const storage=new Map([['yuanhang_cloud_sync_v2','{"connected":true,"session":{"access_token":"test"}}']]);
 const a=boot({data:original,storage});assert.deepEqual(a.snapshot(),original);assert.equal(storage.get('yuanhang_cloud_sync_v2'),'{"connected":true,"session":{"access_token":"test"}}');
 assert.ok(a.get('calendarGrid').innerHTML.includes('2026-10-10'));assert.match(html,/云同步可选/);assert.doesNotMatch(code,/supabase|fetch\(/);
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

const mergeFile=(a,value)=>a.get('mergeBackupFile').onchange({target:{files:[{size:100,text:async()=>JSON.stringify(value)}]}});
test('entry label distinguishes standalone from browser without changing data',()=>{
 const a=boot({data:data()});assert.match(a.get('entryEnvironment').textContent,/浏览器版/);
 assert.match(a.run('navigator.standalone=true;entryEnvironment()'),/主屏幕独立版/);assert.deepEqual(a.snapshot(),data());
});
test('cross-entry merge previews, preserves target conflicts/timer, adds missing records and is idempotent',async()=>{
 const target=data([event()],[{id:'s1',date:'2026-10-09',minutes:20,subject:'英语'}]);target.screen={'2026-10-09':{total:20,entertainment:10,game:5}};
 const source=data([event({title:'不同版本'}),event({id:'new',title:'新任务'})],[{id:'s1',date:'2026-10-09',minutes:30,subject:'英语'},{id:'s2',date:'2026-10-10',minutes:45,subject:'文论'}]);
 source.screen={'2026-10-09':{total:30,entertainment:20,game:10},'2026-10-10':{total:30,entertainment:20,game:10}};
 source.focusTimer={running:true};source.usageSessions=[{id:'三角洲行动@2026-10-09T01:00:00.000Z',app:'三角洲行动',start:'2026-10-09T01:00:00.000Z',minutes:3,excluded:true}];
 const a=boot({data:target});await mergeFile(a,source);assert.deepEqual(a.snapshot(),target);assert.match(a.get('mergeBackupSummary').textContent,/冲突 3 条/);
 a.get('confirmBackupMerge').onclick();const saved=a.snapshot();assert.equal(saved.events.length,2);assert.equal(saved.events[0].title,target.events[0].title);assert.equal(saved.sessions.length,2);assert.equal(saved.sessions[0].minutes,20);assert.equal(saved.screen['2026-10-09'].total,20);assert.equal(saved.usageSessions[0].excluded,true);assert.equal(saved.focusTimer,undefined);assert.deepEqual(JSON.parse(a.storage.get(KEY+'_before_merge')),target);
 await mergeFile(a,source);assert.equal(a.get('confirmBackupMerge').disabled,true);assert.deepEqual(a.snapshot(),saved);
});
test('cross-entry merge keeps existing exclusions and running target timer',async()=>{
 const a=boot({data:data()});a.get('timerToggle').onclick();const timer=a.snapshot().focusTimer;
 const source=data([event()]);await mergeFile(a,source);a.get('confirmBackupMerge').onclick();assert.deepEqual(a.snapshot().focusTimer,timer);
 const row={id:'三角洲行动@2026-10-09T01:00:00.000Z',app:'三角洲行动',start:'2026-10-09T01:00:00.000Z',minutes:3,excluded:true};
 const target={...data(),usageSessions:[row]}, incoming={...data(),usageSessions:[{...row,excluded:false}]};
 a.run(`globalThis.plan=backupMergePlan(${JSON.stringify(target)},${JSON.stringify(incoming)})`);assert.equal(a.run('plan.next.usageSessions[0].excluded'),true);assert.equal(a.run('plan.conflicts'),1);
});
test('cross-entry merge re-previews latest target edits instead of overwriting',async()=>{
 const a=boot({data:data()});await mergeFile(a,data([event()]));const other=data([],[{id:'new',date:'2026-10-10',minutes:15,subject:'英语'}]);a.storage.set(KEY,JSON.stringify(other));
 a.get('confirmBackupMerge').onclick();assert.deepEqual(a.snapshot(),other);assert.match(a.get('mergeBackupStatus').textContent,/再次确认/);
 a.get('confirmBackupMerge').onclick();assert.equal(a.snapshot().sessions.length,1);assert.equal(a.snapshot().events.length,1);
});
test('invalid, cancelled and stale backup reads cannot mutate or restore cancelled preview',async()=>{
 const a=boot({data:data([event()])});const initial=a.snapshot();await mergeFile(a,{events:[]});assert.equal(a.run('pendingBackupMerge'),null);assert.deepEqual(a.snapshot(),initial);
 let finish;const pending=a.get('mergeBackupFile').onchange({target:{files:[{size:1,text:()=>new Promise(r=>finish=r)}]}});a.get('cancelBackupMerge').onclick();finish(JSON.stringify(data([event({id:'new'})])));await pending;assert.equal(a.run('pendingBackupMerge'),null);assert.deepEqual(a.snapshot(),initial);
});
test('merge quota failure preserves memory/storage and retryable preview',async()=>{
 const a=boot({data:data()});await mergeFile(a,data([event()]));a.run("globalThis.realSet=localStorage.setItem;localStorage.setItem=(k,v)=>{if(k===STORAGE)throw Error('quota');realSet(k,v)}");
 a.get('confirmBackupMerge').onclick();assert.deepEqual(a.snapshot(),data());assert.equal(a.run('state.events.length'),0);assert.ok(a.run('pendingBackupMerge'));assert.match(a.get('mergeBackupStatus').textContent,/原数据保留/);
 a.run('localStorage.setItem=realSet');a.get('confirmBackupMerge').onclick();assert.equal(a.snapshot().events.length,1);
});

const ACCOUNT='yuanhang_account_sync_v1';
const session={access_token:'test-access',refresh_token:'test-refresh',expires_at:9999999999,user:{id:'test-user',email:'test@example.com'}};
function server(initial){
 let row=initial?{revision:1,payload:initial}:null;const calls=[];let beforePatch=null,fail=false;
 return {calls,get row(){return row},set row(v){row=v},set beforePatch(f){beforePatch=f},set fail(v){fail=v},async fetch(url,options){
  calls.push({url,options});if(fail)throw Error('offline');const path=new URL(url).pathname;let response,status=200;
  if(path==='/auth/v1/otp')response={};else if(path==='/auth/v1/verify'||path==='/auth/v1/token')response=session;
  else if(path==='/rest/v1/workbench_state'){
   assert.equal(options.headers.Authorization,'Bearer test-access');
   if(options.method==='GET')response=row?[row]:[];
   if(options.method==='POST'){const b=JSON.parse(options.body);assert.equal(b.user_id,'test-user');row={revision:b.revision,payload:b.payload};response=[{revision:row.revision}]}
   if(options.method==='PATCH'){
    if(beforePatch)await beforePatch();
    const match=Number(new URL(url).searchParams.get('revision').slice(3));
    if(row.revision!==match)response=[];else{const b=JSON.parse(options.body);row={revision:b.revision,payload:b.payload};response=[{revision:row.revision}]}
   }
  }else throw Error('Unexpected endpoint');return {ok:status===200,status,json:async()=>response};
 }};
}
const accountStorage=(base,enabled=true)=>new Map([[ACCOUNT,JSON.stringify({email:session.user.email,session,enabled,...(base?{base:{...base,usageSessions:base.usageSessions||[]}}:{})})]]);
test('cloud module remains inert until explicitly enabled and never reuses legacy credentials',()=>{
 const srv=server();const a=boot({cloud:true,data:data(),fetcher:srv.fetch});assert.equal(srv.calls.length,0);assert.equal(a.get('accountEnable').disabled,true);assert.equal(a.storage.has(ACCOUNT),false);
});
test('cloud login accepts original magic link, rejects foreign origins and does not enable sync',async()=>{
 const srv=server();const a=boot({cloud:true,data:data(),fetcher:srv.fetch});a.get('accountEmail').value='test@example.com';
 a.get('accountToken').value='https://evil.example/auth/v1/verify?token=abc&type=magiclink';await a.get('accountVerify').onclick();assert.equal(srv.calls.length,0);
 a.get('accountToken').value='https://myejuodrhgdxphdkrvsa.supabase.co/auth/v1/verify?token=abc&type=magiclink';await a.get('accountVerify').onclick();
 assert.deepEqual(JSON.parse(srv.calls[0].options.body),{token_hash:'abc',type:'magiclink'});assert.equal(JSON.parse(a.storage.get(ACCOUNT)).enabled,false);assert.equal(a.get('accountToken').value,'');assert.deepEqual(a.snapshot(),data());
});
test('first cloud enable creates account payload without timer or credentials',async()=>{
 const srv=server();const a=boot({cloud:true,data:data([event()]),storage:accountStorage(null,false),fetcher:srv.fetch});a.get('timerToggle').onclick();const timer=a.snapshot().focusTimer;
 await a.get('accountEnable').onclick();assert.equal(srv.row.payload.events.length,1);assert.equal(srv.row.payload.focusTimer,undefined);assert.equal(srv.row.payload.session,undefined);assert.deepEqual(a.snapshot().focusTimer,timer);assert.equal(JSON.parse(a.storage.get(ACCOUNT)).enabled,true);
});
test('two isolated entries exchange confirmed game records and task changes',async()=>{
 const base={...data([event()]),usageSessions:[]},srv=server(base);
 const a=boot({cloud:true,data:base,storage:accountStorage(base),fetcher:srv.fetch});const b=boot({cloud:true,data:base,storage:accountStorage(base),fetcher:srv.fetch});
 const row={id:'三角洲行动@2026-10-09T01:00:00.000Z',app:'三角洲行动',start:'2026-10-09T01:00:00.000Z',minutes:3};
 a.run(`state.usageSessions=[${JSON.stringify(row)}];save()`);await a.get('accountSyncNow').onclick();await b.get('accountSyncNow').onclick();assert.deepEqual(b.snapshot().usageSessions,[row]);
 b.emit('change',{target:{dataset:{done:'one'},checked:true}});await b.get('accountSyncNow').onclick();await a.get('accountSyncNow').onclick();assert.equal(a.snapshot().events[0].done,true);assert.equal(a.snapshot().usageSessions.length,1);
});
test('three-way cloud merge preserves independent edits and deletion; concurrent same-record change stops',async()=>{
 const base={...data([event(),event({id:'two'})]),usageSessions:[]},srv=server(base);
 const a=boot({cloud:true,data:base,storage:accountStorage(base),fetcher:srv.fetch});a.run("state.events=state.events.filter(x=>x.id!=='two');save()");srv.row={revision:2,payload:{...base,sessions:[{id:'new',date:'2026-10-09',minutes:30,subject:'英语'}]}};
 await a.get('accountSyncNow').onclick();assert.equal(a.snapshot().events.length,1);assert.equal(a.snapshot().sessions.length,1);assert.equal(srv.row.payload.events.length,1);
 a.run("state.events[0].title='本地修改';save()");srv.row={revision:4,payload:{...srv.row.payload,events:[event({title:'云端修改'})]}};
 await a.get('accountSyncNow').onclick();assert.equal(a.snapshot().events[0].title,'本地修改');assert.equal(srv.row.payload.events[0].title,'云端修改');assert.match(a.get('accountStatus').textContent,/两边都修改/);
});
test('cloud rebase preserves edits during upload and CAS rejects stale overwrite',async()=>{
 const base={...data([event()]),usageSessions:[]},srv=server(base),a=boot({cloud:true,data:base,storage:accountStorage(base),fetcher:srv.fetch});
 a.run("state.events[0].title='上传中';save()");srv.beforePatch=()=>a.run("state.sessions.push({id:'late',date:'2026-10-10',minutes:5,subject:'英语'});save()");
 await a.get('accountSyncNow').onclick();assert.equal(a.snapshot().sessions.length,1);assert.equal(srv.row.payload.sessions.length,0);
 srv.beforePatch=null;await a.get('accountSyncNow').onclick();assert.equal(srv.row.payload.sessions.length,1);
 a.run("state.events[0].title='新编辑';save()");srv.beforePatch=()=>{srv.row={...srv.row,revision:srv.row.revision+1}};await a.get('accountSyncNow').onclick();assert.match(a.get('accountStatus').textContent,/刚更新/);assert.equal(srv.row.payload.events[0].title,'上传中');
});
test('offline and failed local cloud apply preserve local data and recovery backup',async()=>{
 const base={...data([event()]),usageSessions:[]},srv=server(base),a=boot({cloud:true,data:base,storage:accountStorage(base),fetcher:srv.fetch});
 srv.fail=true;await a.get('accountSyncNow').onclick();assert.deepEqual(a.snapshot(),base);
 srv.fail=false;srv.row={revision:2,payload:{...base,sessions:[{id:'r',date:'2026-10-10',minutes:5,subject:'英语'}]}};
 a.run("localStorage.setItem=(k,v)=>{if(k===STORAGE)throw Error('quota')}");await a.get('accountSyncNow').onclick();assert.deepEqual(a.snapshot(),base);assert.equal(a.run('state.sessions.length'),0);
});
test('stop sync clears new credentials and preserves data, without another remote request',async()=>{
 const base=data([event()]),srv=server(base),a=boot({cloud:true,data:base,storage:accountStorage(base),fetcher:srv.fetch});a.get('accountLogout').onclick();await a.get('accountSyncNow').onclick();assert.equal(srv.calls.length,0);assert.deepEqual(a.snapshot(),base);assert.equal(JSON.parse(a.storage.get(ACCOUNT)).session,undefined);
});
test('first connection preserves cloud conflicts by default and requires explicit local preference',async()=>{
 const remote={...data([event({title:'已保存的云端任务',done:true})]),usageSessions:[]};
 for(const localWins of [false,true]){
  const srv=server(remote),a=boot({cloud:true,data:data([event()]),storage:accountStorage(null,false),fetcher:srv.fetch});
  a.get('accountFirstConflict').value=localWins?'local':'remote';await a.get('accountEnable').onclick();
  assert.equal(a.snapshot().events[0].title,localWins?event().title:'已保存的云端任务');
  assert.equal(srv.row.payload.events[0].title,a.snapshot().events[0].title);
 }
});

test('DDL editor persists precision, importance and monotone audited revision without losing legacy completion',()=>{
 const a=boot({data:data([event({done:true,completedAt:'2026-10-10T10:00:00Z'})])});a.run("openModal(today(),'one')");a.get('eventDueAt').value='2026-10-10T21:30';a.get('eventImportance').value='critical';a.get('eventForm').submit(submit);
 const e=a.snapshot().events[0];assert.equal(e.category,'ddl');assert.equal(e.end,'2026-10-10');assert.equal(e.dueAt,'2026-10-10T13:30:00.000Z');assert.equal(e.ddlImportance,'critical');assert.equal(e.taskRevision,2);assert.equal(e.revisionHistory.length,1);assert.equal(e.completedAt,'2026-10-10T10:00:00.000Z');
 a.run("openModal(today(),'one')");a.get('eventDueAt').value='';a.get('eventForm').submit(submit);assert.equal(a.snapshot().events[0].dueAt,undefined);assert.equal(a.snapshot().events[0].taskRevision,3);
});
test('DDL backup rejects unknown importance, timezone-free dueAt and invalid revision without touching data',()=>{
 const a=boot({data:data([event()])});for(const patch of [{ddlImportance:'low'},{dueAt:'2026-10-10T20:00:00'},{dueAt:'2026-10-11T20:00:00+08:00'},{taskRevision:0},{taskRevision:1.5}]){a.run('candidate='+JSON.stringify(data([event(patch)])));assert.equal(a.run('validBackup(candidate)'),false)}
 a.run('candidate='+JSON.stringify(data([event({dueAt:'2026-10-10T20:00:00+08:00',ddlImportance:'important',taskRevision:1})])));assert.equal(a.run('validBackup(candidate)'),true);assert.equal(a.snapshot().events[0].dueAt,undefined)
});
test('DDL editor rejects precise time on other end date, and supports manual completion evidence correction',()=>{
 const a=boot({data:data([event({done:true})])});a.run("openModal(today(),'one')");a.get('eventDueAt').value='2026-10-11T20:00';a.get('eventForm').submit(submit);assert.equal(a.snapshot().events[0].taskRevision,undefined);a.get('eventDueAt').value='';a.get('eventCompletedAt').value='2026-10-10T17:00';a.get('eventForm').submit(submit);assert.equal(a.snapshot().events[0].completedAt,'2026-10-10T09:00:00.000Z');
});
