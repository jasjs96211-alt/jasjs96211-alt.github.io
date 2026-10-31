/* Local deterministic rules. Fictional state is never writable by the chat provider. */
(function(root){
'use strict';
const TZ='Asia/Shanghai',DAY=86400000;
const day=t=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
const dateAt=d=>Date.parse(d+'T00:00:00+08:00');
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const copy=x=>JSON.parse(JSON.stringify(x));
const fresh=(now=Date.now())=>migrateInPlace({schemaVersion:1,rulesVersion:4,createdAt:now,revision:0,settings:{strict:true,sleepStart:'23:00',sleepEnd:'08:00',target:180,minStudy:5,dailyCap:480,chatEndpoint:'https://myejuodrhgdxphdkrvsa.supabase.co/functions/v1/wendao-chat/api/chat',chatMode:'mixed',sensitive:false,deadlineMajor:true,targetConfirmed:false},story:{current:'opening',cursors:{},completed:[],choices:{},read:[],unlockedCG:[],flags:{allowPurification:true,allowIllness:true}},character:{injuries:[],health:78,fatigue:22,realm:3,autonomy:0,cultivation:0,recovery:0,interventions:0,activity:'整理功课，安排自己的研习',bond:'彼此守护'},cultivation:{xp:0,realm:0,readiness:0,protection:0},supervision:{mode:'exempt',cursor:now,idle:0,judgements:[],settled:[],intervals:[],observed:[],targets:{},pending:null,deadlines:{watched:{},punishments:[],excused:[]}},chronicle:[],mastery:[],chat:[],chatMemory:[],messages:[],assets:{},approvedChapters:[],outline:'',achievements:[],baseline:{},seenStudy:[],lastDate:day(now)});
function log(s,id,title,text,at=Date.now(),kind='system') {if(s.chronicle.some(x=>x.id===id))return false;s.chronicle.push({id,title,text,at,kind});return true}
function baseline(s,study){s.baseline={sessions:(study.sessions||[]).map(x=>x.id),tasks:(study.events||[]).filter(x=>x.done).map(x=>x.id)};return s}
function derive(s,study,now=Date.now()){
 migrateInPlace(s);s.seenStudy??=[];
 for(const row of uniqueStudy(study.sessions)){if(s.baseline.sessions?.includes(row.id)||s.seenStudy.includes(row.id)||row.minutes<s.settings.minStudy||row.date>day(now))continue;s.seenStudy.push(row.id);if(row.date===day(now)){s.supervision.idle=0;log(s,'study:'+row.id,'有效修炼',`${row.subject} · ${row.minutes}分钟（真实记录/补录）`,now,'study')}}

 let xp=0,minutes=0;const totals={};
 const rows=uniqueStudy(study.sessions).filter(x=>!s.baseline.sessions?.includes(x.id)&&x.date<=day(now));
 for(const r of rows){const n=Math.max(0,Math.min(Number(r.minutes)||0,s.settings.dailyCap-(totals[r.date]||0)));totals[r.date]=(totals[r.date]||0)+n;xp+=n;minutes+=n}
 const done=uniqueStudy(study.events).filter(x=>x.done&&Number.isFinite(Date.parse(x.completedAt))&&Date.parse(x.completedAt)<=now&&!s.baseline.tasks?.includes(x.id));xp+=done.length*12;
 for(const m of s.mastery)xp+=({recall:15,dictation:25,review:30}[m.level]||0);
 s.cultivation={xp:Math.round(xp),realm:s.cultivation.realm,readiness:clamp(Math.floor(xp/15)),protection:clamp(Math.floor(xp/30))};
 const ds=deadlineState(s);s.character.injuries=ds.punishments.map(p=>injuryFor(p,now));
 const activeMajor=s.character.injuries.filter(x=>x.active);
 const bad=s.supervision.judgements.length+s.supervision.settled.filter(x=>!x.met).length;
 const relief=Math.floor(minutes/60)+s.character.autonomy+(s.character.interventions||0)*3;
 const groups={};for(const i of activeMajor){const d=day(i.firstAt);groups[d]=Math.min(RULES.dailyDamageCap,(groups[d]||0)+i.contribution)}
 const damage=Object.values(groups).reduce((n,x)=>n+x,0);
 s.character.familyPressure=clamp(20+Math.min(bad*3,18)-relief*2+Math.min(activeMajor.length*26,52));
 s.character.lifePressure=clamp((s.life.ledger||[]).reduce((n,x)=>n+(x.delta?.pressure||0),0),0,12);s.character.familyPressure=clamp(s.character.familyPressure+s.character.lifePressure);
 // Idle/daily failures are light supervision. Persistent DDL ledger is the only severe source.
 const strain=Math.min(12,s.supervision.judgements.reduce((n,x)=>n+(x.result==='warning'?0:1),0));
 s.character.health=clamp(78-strain+Math.floor(minutes/120)+(s.character.recovery||0)-damage,RULES.healthFloor,100);
 if(activeMajor.length)s.character.health=Math.min(s.character.health,64);
 s.character.fatigue=clamp(100-s.character.health+Math.min(bad,12));
 s.character.purificationBurden=Math.max(0,12+ds.punishments.filter(p=>!p.correctedAt&&p.result==='summons'&&!p.resolvedAt).length*12-Math.floor((s.character.recovery||0)/2));
 s.character.state=activeMajor.some(x=>x.phase==='acute')?'injured':activeMajor.length?'ill':'normal';
 const achievements=[['first-study','第一卷功课',rows.length>0],['dictation','落笔有据',s.mastery.some(x=>x.level==='dictation')],['review','温故',s.mastery.some(x=>x.level==='review')],['opening','灯下同心',s.story.completed.includes('opening')],['hour','积微成著',minutes>=60]];
 for(const [id,title,ok] of achievements)if(ok&&!s.achievements.includes(id)){s.achievements.push(id);log(s,'achievement:'+id,title,'条件已达成；来源见学习记录或章节选择。',now,'achievement')}
 vitals(s,study,now);return s;
}

// Ledger v3: every tracked task/revision settles once; numeric caps never swallow events.
const RULES=Object.freeze({healthFloor:35,dailyDamageCap:30,severeDamage:22,acuteHours:48,recoverySteps:4,minHealingDays:3,idleMinutes:30,autonomySlotsPerDay:4,autonomyBackfillDays:3,clockForwardLimit:31*DAY});
const EVENTS=Object.freeze(Object.fromEntries(['书案未启','灯尽未成','页角残章','温家问询','令书至门','禁足与责罚','净殿传召','血染衣袖','并肩修行','护在身前','重订修行簿'].map((name,i)=>['EV-'+String(i+1).padStart(2,'0'),name])));
function dueTime(e){const n=e.dueAt?Date.parse(e.dueAt):dateAt(e.end)+DAY-1;return Number.isFinite(n)?n:NaN}
const dueISO=e=>new Date(dueTime(e)).toISOString();
const taskVersion=e=>Number.isSafeInteger(e.taskRevision)&&e.taskRevision>0?e.taskRevision:1;
const settlementID=e=>'ddl:'+e.id+':'+dueISO(e)+':'+taskVersion(e)+':overdue';
function deadlineState(s){s.supervision.deadlines??={};const d=s.supervision.deadlines;d.watched??={};d.punishments??=[];d.excused??=[];d.pending??={};return d}
function migrateInPlace(s){
 if((s.rulesVersion||3)<4){s.supervision.idle=0;s.supervision.regulationStartedAt=s.supervision.cursor;}
 const ds=deadlineState(s);for(const w of Object.values(ds.watched)){w.end??=w.due;w.dueAt??=dueISO(w);w.taskRevision??=1;w.importance??='important'} s.character.injuries??=[];s.chatMemory??=[];s.memoryTombstones??=[];s.chatTombstones??=[];
 for(const p of ds.punishments){
  p.ids??=p.taskId?[p.taskId]:[];p.taskId??=p.ids[0];p.dueAt??=p.due?new Date(dateAt(p.due)+DAY-1).toISOString():new Date(p.at).toISOString();
  p.taskRevision??=1;p.importance??='important';p.recoveryActions??=[];
  p.status=p.correctedAt||p.resolution==='corrected'?'corrected':p.status|| (p.resolvedAt?'resolved':'active');
  if(p.status==='corrected')p.correctedAt??=p.resolvedAt||p.at;
  p.injuryId??='injury:'+p.id;p.eventIds??=[p.importance==='critical'?'EV-05':'EV-04',p.result==='summons'?'EV-07':'EV-06','EV-08'];
 }
 s.settings.learningReminders??=true;s.settings.sleepReminders??=true;s.settings.wakeReminders??=true;s.settings.dailyMessages??=true;s.settings.reminderIntensity??='normal';s.settings.proactiveEnabled??=true;s.settings.proactiveCooldownMinutes??=30;s.settings.proactiveDailyCap??=6;s.settings.greetingsEnabled??=true;
 s.life??={cursor:Math.max(s.createdAt||0,s.supervision.cursor||0),ledger:[],clockPending:null};s.life.ledger??=[];
 s.rhythmState??={temporarySleep:null,greetings:[],recaps:[],napUntil:null};s.rhythmState.greetings??=[];s.rhythmState.recaps??=[];s.rhythmState.wakeConfirmations??=[];s.rhythmState.modeChanges??=[];s.rhythmState.agreements??=[];
 s.proactiveState??={seen:[...(s.seenStudy||[]).map(id=>({id:'study:'+id,at:s.supervision.cursor})),...(s.mastery||[]).map(x=>({id:'mastery:'+x.id,at:x.at}))],lastAt:0};s.proactiveState.seen??=[];
 s.supervision.corrections??=[];s.supervision.resetEvidence??=[];
 ensureVitals(s);s.rulesVersion=4;return s;
}
function migrateLegacySave(old){if(!validate(old))throw Error('问道存档无效');return migrateInPlace(copy(old))}
function injuryFor(p,now){
 const actions=p.recoveryActions||[],steps=actions.length,age=now-p.at;
 const healed=p.status==='resolved'||(steps>=RULES.recoverySteps&&age>=RULES.minHealingDays*DAY);
 const corrected=p.status==='corrected'||!!p.correctedAt;
 const phase=corrected?'corrected':healed?'healed':age<RULES.acuteHours*3600000?'acute':steps?'recovering':'stable';
 return {id:p.injuryId,causeSettlementId:p.id,severity:'severe',phase,active:!healed&&!corrected,firstAt:p.at,lastUpdateAt:Math.max(p.at,...actions.map(a=>a.at)),contribution:corrected||healed?0:Math.max(4,RULES.severeDamage-steps*4),recoveryPath:'疗养／求援／交涉／共同修行'};
}
// Gallery eligibility is based on an occurred, still-active ledger injury, never
// a bedtime schedule, low energy or a presentation-only portrait selection.
function canViewRecoveryCG(s,now=Date.now()){
 return Number.isFinite(now)&&!s.life?.clockPending&&(s.supervision?.deadlines?.punishments||[]).some(p=>Number.isFinite(p.at)&&p.at<=now&&injuryFor(p,now).active);
}
function watchDeadlines(s,study,now=Date.now()){
 const ds=deadlineState(s);if(s.settings.deadlineMajor===false)return ds;
 for(const e of study.events||[]){
  if(e.category!=='ddl'||!e.id||!e.end)continue;
  const due=dueTime(e);if(!Number.isFinite(due))continue;
  const old=ds.watched[e.id];
  const timelyRevision=old&&e.updatedAt&&Date.parse(e.updatedAt)>=old.watchedAt&&Date.parse(e.updatedAt)<=dueTime(old)&&due>=Date.parse(e.updatedAt);
  if(due>=now&&!e.done||timelyRevision){
   // An unverified late extension cannot silently erase an already monitored deadline.
   if(old&&dueTime(old)<now&&(old.dueAt!==dueISO(e)||old.taskRevision!==taskVersion(e))&&!(e.updatedAt&&Date.parse(e.updatedAt)<=dueTime(old))){ds.pending[e.id]={reason:'截止后任务版本变化，请核对延期或取消生效时间',taskId:e.id};continue}
   if(!old||dueTime(old)>=now||e.updatedAt&&Date.parse(e.updatedAt)<=dueTime(old))ds.watched[e.id]={id:e.id,title:String(e.title||'未命名DDL').slice(0,100),end:e.end,due:e.end,dueAt:dueISO(e),taskRevision:taskVersion(e),importance:e.ddlImportance||'important',watchedAt:old?.watchedAt||now};
  }
 }
 return ds;
}
// Discover missed registrations without automatically punishing imported history.
function untrackedOverdue(s,study,now=Date.now()){
 const ds={watched:{},punishments:[],excused:[],...s.supervision.deadlines};
 return (study.events||[]).filter(e=>e.category==='ddl'&&e.id&&e.end&&Number.isFinite(dueTime(e))&&dueTime(e)<now&&!ds.watched[e.id]&&!ds.excused.includes(e.id)&&!ds.punishments.some(p=>(p.ids||[p.taskId]).includes(e.id))&&(!e.done||!e.completedAt||!Number.isFinite(Date.parse(e.completedAt))||Date.parse(e.completedAt)>dueTime(e))).sort((a,b)=>dueTime(b)-dueTime(a));
}
function confirmMissedDeadline(s,study,id,now=Date.now()){
 let ds=s.supervision.deadlines||{};if(s.settings.deadlineMajor===false)throw Error('请先开启DDL监管');
 if(s.supervision.pending)throw Error('请先核对离线学习和休息时段');
 if(ds.lastCheck&&now<ds.lastCheck)throw Error('设备时间倒退，请先核对时间');
 const row=untrackedOverdue(s,study,now).find(x=>x.id===id);if(!row)throw Error('任务已变更或已经结算，请刷新核对');
 if(row.done&&(!row.completedAt||!Number.isFinite(Date.parse(row.completedAt))||Date.parse(row.completedAt)>now))throw Error('请先核对并保存实际完成时间');
 ds=deadlineState(s);
 ds.watched[id]={id,title:String(row.title||'未命名DDL').slice(0,100),end:row.end,due:row.end,dueAt:dueISO(row),taskRevision:taskVersion(row),importance:row.ddlImportance||'important',watchedAt:now,verifiedLateAt:now};
 log(s,'late-verification:'+settlementID(row),'补核验遗漏DDL','人工确认「'+ds.watched[id].title+'」真实逾期；补登记本条，保留原截止时间，不追罚其他历史任务。',now,'verification');
 checkDeadlines(s,study,now,{verified:true,onlyTask:id});
 return ds.punishments.find(p=>p.taskId===id);
}
function checkDeadlines(s,study,now=Date.now(),{verified=false,onlyTask=null}={}){
 migrateInPlace(s);const ds=deadlineState(s);
 if(s.settings.deadlineMajor===false)return derive(s,study,now);
 if(ds.lastCheck&&now<ds.lastCheck){ds.clockPending=true;return derive(s,study,now)}
 ds.lastCheck=now;ds.clockPending=false;
 watchDeadlines(s,study,now);const rows=new Map((study.events||[]).map(e=>[e.id,e]));
 for(const w of Object.values(ds.watched)){
  if(onlyTask&&w.id!==onlyTask)continue;
  w.end??=w.due;w.dueAt??=dueISO(w);w.taskRevision??=1;
  const due=dueTime(w),row=rows.get(w.id);
  if(now<=due||ds.excused.includes(w.id)||ds.punishments.some(p=>p.ids.includes(w.id)))continue;
  const pend=reason=>{ds.pending[w.id]={taskId:w.id,title:w.title,dueAt:w.dueAt,reason}};
  if(!row||row.category!=='ddl'){delete ds.pending[w.id];continue}
  if((dueTime(row)!==due||(row.ddlImportance||'important')!==w.importance&&w.importance)&&!verified){pend('任务修订与监测版本不同，请核对后明确纠正或恢复截止');continue}
  if(row.done){
   if(!row.completedAt||!Number.isFinite(Date.parse(row.completedAt))){pend('完成时间未知，请核验实际完成时间');continue}
   if(Date.parse(row.completedAt)<=due){delete ds.pending[w.id];continue}
   if(Date.parse(row.completedAt)>now){pend('完成时间在未来，请核对设备时钟');continue}
  }
  if((s.supervision.pending||ds.offlinePending||ds.cloudPending)&&!verified){pend('离线时段、时钟或云端状态尚未核验；请先核对学习与同步');continue}
  delete ds.pending[w.id];const id=settlementID({...w,category:'ddl'}),at=due+1,importance=w.importance||'important';
  const serious=s.story.flags.allowPurification===true;
  const p={id,ids:[w.id],taskId:w.id,due:w.due,dueAt:w.dueAt,taskRevision:w.taskRevision,importance,title:w.title,at,settledAt:at,detectedAt:now,endsAt:at+48*3600000,result:serious?'summons':'punishment',status:'active',resolvedAt:null,correctedAt:null,injuryId:'injury:'+id,eventIds:[importance==='critical'?'EV-05':'EV-04',serious?'EV-07':'EV-06','EV-08'],recoveryActions:[]};
  ds.punishments.push(p);
  const scene=serious?'温家发来传召，强制抽取式净化使旧伤恶化，她咳血后停下修炼，开始寻求救治。':'温家问责与责罚使旧伤严重复发，她咳血后暂停修炼，着手疗养与求援。';
  log(s,id,EVENTS[p.eventIds[0]]+' · 严重伤病',`「${p.title}」逾期。${scene} 伤势持续，48小时仅为急性窗口。可疗养、交涉、求援、保护或核对误判；姐妹感情不扣减。`,at,'major');
  Object.assign(s.chronicle.find(x=>x.id===id),{taskId:w.id,eventIds:p.eventIds,settlementId:id,delta:{health:-RULES.severeDamage,dailyCap:RULES.dailyDamageCap},importance});
  s.messages??=[];s.messages.push({id:'message:'+id,text:'无缺，问责之后旧伤加重，我已停下修炼，安排疗养，也会设法求援。先照顾好你的身体，我们一起想办法。',at,read:false,source:'event',settlementId:id});
 }
 for(const row of study.events||[])if(row.category==='study'&&!row.done&&dueTime(row)<now&&dueTime(row)>=s.createdAt)log(s,'ordinary:'+row.id,'页角残章','「'+row.title+'」待补，可调整安排；不触发严重伤病。',now,'reminder');
 return derive(s,study,now);
}
function resolveDeadline(s,id,reason='corrected',now=Date.now()){
 migrateInPlace(s);const ds=deadlineState(s),p=ds.punishments.find(x=>x.id===id);
 if(!p||p.correctedAt)return false;
 if(reason!=='corrected')return recoverDeadline(s,p.id,'makeup',now);
 p.correctedAt=now;p.resolvedAt=now;p.resolution='corrected';p.status='corrected';
 log(s,'corrected:'+p.id,EVENTS['EV-11'],'经人工核实，撤销错误结算对数值和持续伤势的贡献；原纪事保留为已纠正。',now,'correction');
 return true;
}
function recoverDeadline(s,id,kind='care',now=Date.now()){
 migrateInPlace(s);const p=deadlineState(s).punishments.find(x=>x.id===id);if(!p||!injuryFor(p,now).active)return false;
 const key='recovery:'+p.id+':'+day(now);if(p.recoveryActions.some(x=>x.id===key))return false;
 if(kind==='protect'&&s.cultivation.protection<3)return false;
 p.recoveryActions.push({id:key,kind,at:now});p.repairProgress=p.recoveryActions.length;
 if(injuryFor(p,now).phase==='healed'){p.status='resolved';p.resolvedAt=now;p.resolution='healed'}
 const eventId=kind==='protect'?'EV-10':kind==='makeup'?'EV-11':'EV-09';
 log(s,key,EVENTS[eventId],kind==='makeup'?'已补做并安排后续疗养；真实逾期历史保留，不等于误判撤销。':'姐姐安排温养、核对药草与求援线索。伤势逐步缓和，每日最多一步，不会即时痊愈。',now,'recovery');
 return true;
}
function portrait(s,now=Date.now()){
 const injuries=deadlineState(s).punishments.filter(p=>p.at<=now).map(p=>injuryFor(p,now));
 const states={normal:['sister-calm','温柔·日常','calm'],concerned:['sister-concerned','忧心·担忧','concerned'],tired:['sister-tired','疲惫·倦怠','tired'],ill:['sister-ill','病中·虚弱','ill'],injured:['sister-weakened','受罚·负伤','major'],relieved:['sister-relieved','欣慰·浅笑','relieved']};
 let state='normal',reason='平静的准备期';
 // Visual phase is intentionally independent of the 48-hour acute resource penalty.
 // The first Beijing calendar day displays the immediate punishment; on subsequent
 // days she looks ill while every original injury and recovery requirement remains.
 if(injuries.some(x=>x.active&&x.phase==='acute'&&x.firstAt<=now&&day(x.firstAt)===day(now))){state='injured';reason='DDL逾期当日的重伤演出（伤势持续疗养）'}
 else if(injuries.some(x=>x.active)||s.character.health<55){state='ill';reason='次日起转为病中演出；原严重伤势与急性数值限制仍有效'}
 else if(s.story.forcedPortrait&&states[s.story.forcedPortrait]&&s.story.forcedUntil>now){state=s.story.forcedPortrait;reason='当前场景指定神情；伤病优先'}
 else if(s.character.familyPressure>=45){state='concerned';reason='温家压力上升'}
 else if(s.character.fatigue>=30||s.character.health<75){state='tired';reason='研习与身体疲劳'}
 else if(s.chronicle.some(x=>['achievement','protection','recovery'].includes(x.kind)&&now-x.at<6*3600000&&now>=x.at)){state='relieved';reason='近期研习或保护取得进展'}
 const [id,label,severity]=states[state];return {id,label,severity,state,reason};
}

function subtract(start,end,exclusions){let pieces=[[start,end]];for(const x of exclusions){pieces=pieces.flatMap(([a,b])=>x[1]<=a||x[0]>=b?[[a,b]]:[[a,Math.max(a,x[0])],[Math.min(b,x[1]),b]].filter(([u,v])=>v>u))}return pieces}
// Duplicate transport rows never create duplicate learning credit or notifications.
function uniqueStudy(rows=[]){return unionRows(rows.filter(x=>x&&typeof x.id==='string'))}
function scheduleAt(s,now){const t=s.rhythmState?.temporarySleep;return t&&t.from<=now&&now<t.until?{sleepStart:t.sleepStart,sleepEnd:t.sleepEnd}:s.settings}
function scheduledSleepRanges(s,start,end){const t=s.rhythmState?.temporarySleep;if(!t||t.until<=start||t.from>=end)return sleepRanges(start,end,s.settings);const out=[];for(const [a,b]of [[start,Math.min(end,t.from)],[Math.max(start,t.until),end]])if(b>a)out.push(...sleepRanges(a,b,s.settings).map(([u,v])=>[Math.max(a,u),Math.min(b,v)]).filter(([u,v])=>v>u));const a=Math.max(start,t.from),b=Math.min(end,t.until);out.push(...sleepRanges(a,b,t).map(([u,v])=>[Math.max(a,u),Math.min(b,v)]).filter(([u,v])=>v>u));return out}
function sleepRanges(start,end,settings){const minutes=v=>{const [h,m]=v.split(':').map(Number);return h*60+m};const a=minutes(settings.sleepStart||'23:00')*60000,b=minutes(settings.sleepEnd||'08:00')*60000,out=[];for(let d=dateAt(day(start))-DAY;d<=end;d+=DAY)out.push([d+a,d+b+(b<=a?DAY:0)]);return out}
function advance(s,to,study,{confirmed=false,replaying=false,idleMinutes=RULES.idleMinutes}={}){
 migrateInPlace(s);
 const w=s.supervision,from=w.cursor;if(!Number.isFinite(to)||to<from){w.pending={from,to,reason:'设备时钟倒退'};return s}
 if(w.pending&&!confirmed)return s;
 if((to-from>90000||day(from)!==day(to))&&!confirmed&&s.settings.strict&&w.mode==='awake'){w.pending={from,to,reason:'离线、后台或跨日时间需要核对'};return s}
 w.cursor=to;w.pending=null;if(!replaying&&to>from){w.observed??=[];const last=w.observed.at(-1);if(last&&last.end===from&&to-last.start<=3600000&&last.mode===w.mode&&last.strict===s.settings.strict&&last.sleepStart===s.settings.sleepStart&&last.sleepEnd===s.settings.sleepEnd&&last.focus===!!study.focusTimer?.running&&last.ruleMinutes===idleMinutes)last.end=to;else w.observed.push({start:from,end:to,mode:w.mode,strict:s.settings.strict,sleepStart:s.settings.sleepStart,sleepEnd:s.settings.sleepEnd,focus:!!study.focusTimer?.running,ruleMinutes:idleMinutes});}
 if(!s.settings.strict||w.mode!=='awake'||study.focusTimer?.running)return s;
 const exclusions=[...scheduledSleepRanges(s,from,to),...w.intervals.filter(x=>x.kind!=='awake').map(x=>[x.start,x.end])];
 if(study.focusTimer?.running)exclusions.push([from,to]);
 const evidence=uniqueStudy(study.sessions).filter(x=>x.minutes>=s.settings.minStudy).flatMap(x=>Array.isArray(x.studyIntervals)?x.studyIntervals:x.startedAt&&x.endedAt?[[Date.parse(x.startedAt),Date.parse(x.endedAt)]]:[]).filter(x=>Array.isArray(x)&&x.length===2&&x.every(Number.isFinite)&&x[1]>x[0]);
 const pieces=subtract(from,to,exclusions);let budget=2;
 for(const [a,b] of pieces){
  for(let d=dateAt(day(a));d<b;d+=DAY){if(s.settings.targetConfirmed)w.targets[day(d)]??={minutes:s.settings.target,strict:true}};
  const intervals=subtract(a,b,evidence);
  let cursor=a;
  for(const [u,v] of intervals){if(u>cursor)w.idle=0;w.idle+=(v-u)/60000;cursor=v;
   while(w.idle>=idleMinutes){w.idle-=idleMinutes;if(budget--<=0)continue;
    const judgementAt=v-w.idle*60000;const id=idleMinutes===120?'idle:'+Math.floor(judgementAt):'idle:v4:'+Math.floor(judgementAt/(idleMinutes*60000));
    const result=Math.floor(judgementAt/(RULES.idleMinutes*60000))%2?'fatigue':'warning';
    if(w.judgements.some(x=>x.id===id)||w.corrections.some(x=>x.id===id))continue;
    w.judgements.push({id,at:judgementAt,result,eventId:'EV-01'});log(s,id,EVENTS['EV-01'],'温家催促增加，姐姐留字提醒；清醒无有效学习累计30分钟。可补记学习、休息或核对误判，不造成DDL严重伤病。',judgementAt,'risk');
   }
  }if(cursor<b)w.idle=0;
 }
 if(to-from>DAY)log(s,'offline:'+from,'离线汇总结算','本次最多结算两次压力，其余间隔已合并。',to);
 return derive(s,study,to);
}
function recalculate(s,study,now=Date.now()){
 migrateInPlace(s);
 const w=s.supervision,observed=[...(w.observed||[])],cursor=w.cursor,mode=w.mode,pending=w.pending,strict=s.settings.strict,sleepStart=s.settings.sleepStart,sleepEnd=s.settings.sleepEnd;
 const oldIDs=new Set(w.judgements.map(x=>x.id));s.chronicle=s.chronicle.filter(x=>!oldIDs.has(x.id));w.judgements=[];w.idle=0;
 for(const x of observed){w.cursor=x.start;w.mode=x.mode;s.settings.strict=x.strict;s.settings.sleepStart=x.sleepStart||'23:00';s.settings.sleepEnd=x.sleepEnd||'08:00';advance(s,x.end,{...study,focusTimer:{...study.focusTimer,running:!!x.focus}},{confirmed:true,replaying:true,idleMinutes:x.ruleMinutes||120})}
 const retained=new Set(w.judgements.map(x=>x.id));for(const id of oldIDs)if(!retained.has(id)&&!w.corrections.some(x=>x.id===id))w.corrections.push({id,at:now,reason:'核对学习／休息时段'});
 s.messages=s.messages.filter(x=>!x.evidenceId||!w.corrections.some(c=>c.id===x.evidenceId));
 w.cursor=cursor;w.mode=mode;w.pending=pending;s.settings.strict=strict;s.settings.sleepStart=sleepStart;s.settings.sleepEnd=sleepEnd;derive(s,study,now);return s;
}
function settle(s,d,study,now=Date.now()){
 const w=s.supervision;if(w.settled.some(x=>x.date===d)||d>=day(now))return false;
 const active=w.targets[d];if(!active||!active.strict||![...w.intervals,...(w.observed||[]).filter(x=>x.mode==='awake'&&x.strict).map(x=>({...x,kind:'awake'}))].some(x=>x.kind==='awake'&&x.start<dateAt(d)+DAY&&x.end>dateAt(d)))return false;
 const minutes=uniqueStudy(study.sessions).filter(x=>x.date===d).reduce((n,x)=>n+(Number(x.minutes)||0),0);const met=minutes>=active.minutes||active.exempt;
 w.settled.push({date:d,minutes,target:active.minutes,met});log(s,'daily:'+d,met?EVENTS['EV-09']:EVENTS['EV-02'],`${d}：${minutes}/${active.minutes}分钟。${met?'目标达成或已豁免。':'准备不足，温家压力上升；可以通过后续行动恢复。'}`,now,met?'study':'risk');return true;
}
function independent(s,d,now=Date.now()) {const id='sister:'+d;if(s.chronicle.some(x=>x.id===id))return false;s.character.autonomy+=1;s.character.cultivation+=3;const actions=[['研读医理与经脉图','温知遥整理经脉旧伤的记录，给自己的研习留下了笔记。'],['查阅净灵殿传召记录','温知遥核对传召与休养间隔，准备同妹妹商量可行的应对。'],['温养灵息、练习水法','温知遥自行安排了限量修炼，疲劳时便停下来休息。'],['整理药草与功课','温知遥辨认药草、记下医理疑问，没有把自己的一天全耗在等待里。'],['研读学宫规约','温知遥把关于求学的疑问写在纸上，留待与妹妹一起求证。']];const a=bodyState(s,now)==='injured'||bodyState(s,now)==='ill'?['温养与休息','温知遥量力收起功课，按伤势安排温养；没有独自硬撑。']:actions[s.character.autonomy%actions.length];s.character.activity=a[0];for(const p of deadlineState(s).punishments)if(day(p.at)<d)recoverDeadline(s,p.id,'care',now);log(s,id,'姐姐的独立行动',a[1],now,'sister');return true}
// All automatic actions are a closed preparation-period vocabulary. They cannot
// advance chapters, alter the DDL ledger, unlock realms, or create learning facts.
function bodyState(s,at){return deadlineState(s).punishments.some(p=>p.at<=at&&injuryFor(p,at).active)?'injured':s.character.health<65?'ill':s.character.fatigue>=40?'tired':'normal'}
const LIFE_ACTIONS=Object.freeze([
 {kind:'study',activity:'研读医理',text:'温知遥核对医理笔记，记下尚需求证的问题。'},
 {kind:'rest',activity:'温养与休息',text:'温知遥停下功课，按自己的节奏温养与休息。'},
 {kind:'social',activity:'整理往来与规约',text:'温知遥整理可供询问的规约和求援问题，尚未作出未经商量的决定。'},
 {kind:'pressure',activity:'记录温家催问',text:'温家又来催问准备进展。温知遥把问询记下，决定先照顾身体，再与无缺商量。'}
]);
function advanceAutonomy(s,now=Date.now()){
 migrateInPlace(s);const life=s.life,from=life.cursor;
 if(!Number.isFinite(now)||now<from||now-from>RULES.clockForwardLimit){life.clockPending={from,to:now,reason:'设备时间异常，请核对；自主行动暂停'};return []}
 if(life.clockPending)return [];
 const added=[],start=Math.max(from,now-RULES.autonomyBackfillDays*DAY);const slotHours=[0,6,9,12,16,20,23],slots=[];for(let d=dateAt(day(start));d<=now;d+=DAY)for(let slot=0;slot<slotHours.length;slot++){const at=d+slotHours[slot]*3600000;if(at>from&&at>start&&at<=now)slots.push({d,slot,at})}
 for(const {d,slot,at} of slots.slice(-12)){
  const id='life:v4:'+day(at)+':'+slot;if(life.ledger.some(x=>x.id===id))continue;
  const body=bodyState(s,at),pick=(Math.floor(d/DAY)+slot)%LIFE_ACTIONS.length;
  const night=slotHours[slot]<7||slotHours[slot]>=23;const action=night?LIFE_ACTIONS[1]:body==='injured'||body==='ill'?(LIFE_ACTIONS[pick].kind==='pressure'?{...LIFE_ACTIONS[3],activity:'卧中记下问询',text:'温家送来问询。温知遥先将纸条收好，按伤势继续休息，未因此再受伤。'}:LIFE_ACTIONS[1]):LIFE_ACTIONS[pick];
  const row={id,at,...action,chapter:'chapter-9-preparation',bodyState:body,delta:{autonomy:1,cultivation:action.kind==='study'?3:0,pressure:action.kind==='pressure'?1:action.kind==='social'?-1:0}};
  life.ledger.push(row);added.push(row);log(s,id,'姐姐的日常 · '+action.activity,action.text,at,'life');
 }
 life.cursor=now;
 if(now-from>RULES.autonomyBackfillDays*DAY)log(s,'life:summary:'+Math.floor(now/DAY),'离线日常汇总','较早的离线日常已略作汇总；只补记最近三天，不补造学习或推进主线。',now,'life-summary');
 if(added.length)s.character.activity=added.at(-1).activity;
 s.character.autonomousStudy=life.ledger.reduce((n,x)=>n+(x.delta?.cultivation||0),0);
 s.character.lifePressure=clamp(life.ledger.reduce((n,x)=>n+(x.delta?.pressure||0),0),0,12);
 return added;
}
function acknowledgeLifeClock(s,now=Date.now()){migrateInPlace(s);if(!Number.isFinite(now))throw Error('设备时间无效');s.life.cursor=now;s.life.clockPending=null;return s}
function message(s,id,text,now,trigger,evidenceId){
 if(s.messages.some(x=>x.id===id))return null;
 const row={id,text,at:now,read:false,source:'event',trigger,evidenceId};s.messages.push(row);log(s,id,'姐姐来信',text,now,'message');return row;
}
function proactive(s,study,now=Date.now(),{worldView}={}){
 migrateInPlace(s);if(s.settings.proactiveEnabled===false||study.focusTimer?.running||s.supervision.mode!=='awake'||s.supervision.pending||s.life.clockPending)return null;
 if(scheduledSleepRanges(s,now,now+1).some(([a,b])=>a<=now&&b>now))return null;
 const intensity=s.settings.reminderIntensity,limit=intensity==='gentle'?3:intensity==='frequent'?10:6;
 const cap=Math.max(0,Math.min(limit,Number(s.settings.proactiveDailyCap)||6));
 const cooldown=Math.max(intensity==='gentle'?60:intensity==='frequent'?15:30,Number(s.settings.proactiveCooldownMinutes)||30)*60000;
 if(s.messages.filter(x=>x.trigger&&day(x.at)===day(now)).length>=cap||s.proactiveState.lastAt&&now-s.proactiveState.lastAt<cooldown)return null;
 const candidates=[],ill=bodyState(s,now)!=='normal';
 if(s.settings.learningReminders!==false){
  for(const x of s.supervision.judgements.filter(x=>s.settings.strict&&day(x.at)===day(now)&&x.at<=now&&!s.supervision.corrections.some(c=>c.id===x.id)))candidates.push({id:x.id,trigger:'idle',text:ill?'无缺，功课先从一小段开始。我也会按身体状况休息，我们不着急。':'无缺，书卷放了许久了。要不要从五分钟开始？累了也可以先记下休息。'});
  for(const x of uniqueStudy(study.sessions).filter(x=>x.date===day(now)&&Number(x.minutes)>=s.settings.minStudy&&(!x.at||Date.parse(x.endedAt||x.at)<=now)&&!s.baseline.sessions?.includes(x.id)))candidates.push({id:'study:'+x.id,trigger:'study',text:ill?'这段真实功课已经记下。我会量力研习，你也让眼睛歇一歇。':'这段功课扎扎实实地做完了。我也记下了自己的疑问，等你歇息时再说。'});
  for(const x of uniqueStudy(study.events).filter(x=>x.done&&Number.isFinite(Date.parse(x.completedAt))&&Date.parse(x.completedAt)<=now&&day(Date.parse(x.completedAt))===day(now)&&!s.baseline.tasks?.includes(x.id)))candidates.push({id:'task:'+x.id,trigger:'task',text:'这一项做完了，我替你高兴。那些遥远的事，也是这样一步一步走近的。接下来先歇一歇吧。'});
  for(const x of uniqueStudy(s.mastery).filter(x=>['recall','dictation','review'].includes(x.level)&&Number.isFinite(x.at)&&x.at<=now&&day(x.at)===day(now)))candidates.push({id:'mastery:'+x.id,trigger:'mastery',text:({recall:'能复述出来，这一遍便有收获。别急着往后赶，先看看哪里还不稳。',dictation:'默写完这一段了？能落在纸上，比只觉得自己懂了更踏实。歇一会儿再继续吧。',review:'肯回头温习，旧功课才留得住。今日这番功夫没有白费。'})[x.level]});
 }
 if(s.settings.dailyMessages!==false)for(const row of s.life.ledger.filter(x=>['pressure','study'].includes(x.kind)&&x.at<=now&&now-x.at<DAY))candidates.push({id:row.id,trigger:row.kind==='pressure'?'family-event':'sister-task',text:row.text+' 我把这件事记在纪事里了，等你方便时再聊。'});
 if(s.settings.dailyMessages!==false&&s.chronicle.some(x=>x.id==='sister:'+day(now)))candidates.push({id:'daily:'+day(now),trigger:'daily',text:ill?'我今日也安排了温养，功课会量力而行。你安心读书，也照顾好自己。':'我今日也有自己的功课。你安心读书，累了记得歇一歇；我也会照顾好自己。'});
 candidates.sort((a,b)=>(a.trigger==='idle'?2:a.trigger==='daily'?3:0)-(b.trigger==='idle'?2:b.trigger==='daily'?3:0));
 const next=candidates.find(x=>!s.proactiveState.seen.some(r=>r.id===x.id)&&!s.messages.some(m=>m.evidenceId===x.id));if(!next)return null;
 const prepared=root.WendaoInteraction?.prepare(s,study,now,next,{portrait:portrait(s,now),vitals:vitals(s,study,now),worldView});
 const row=message(s,'message:'+next.id,prepared?.text||next.text,now,next.trigger,next.id);if(row&&prepared){row.contextSnapshot=prepared.snapshot;row.theme=prepared.theme;row.variant=prepared.variant;}if(row){s.proactiveState.seen.push({id:next.id,at:now});s.proactiveState.lastAt=now}return row;
}
function setTemporarySleep(s,value,now=Date.now()){
 migrateInPlace(s);if(value===null){s.rhythmState.temporarySleep=null;return s}
 const valid=t=>typeof t==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t);
 if(!valid(value?.sleepStart)||!valid(value?.sleepEnd)||value.sleepStart===value.sleepEnd||!Number.isFinite(value.until)||value.until<=now||value.until>now+7*DAY)throw Error('临时作息须为有效时间，结束时间在未来七天内');
 s.rhythmState.temporarySleep={sleepStart:value.sleepStart,sleepEnd:value.sleepEnd,from:now,until:value.until};return s;
}
function planAgreement(s,{id,title,at},now=Date.now()){migrateInPlace(s);if(typeof id!=='string'||!id||typeof title!=='string'||!title.trim()||title.length>120||!Number.isFinite(at)||at<=now||at>now+7*DAY)throw Error('请填写未来七天内的约定');if(s.rhythmState.agreements.some(x=>x.id===id))return false;s.rhythmState.agreements.push({id,title:title.trim(),at,updatedAt:now,status:'confirmed'});return true}
function cancelAgreement(s,id,now=Date.now()){const row=s.rhythmState.agreements.find(x=>x.id===id);if(!row)return false;row.status='cancelled';row.updatedAt=now;s.messages=s.messages.filter(x=>x.evidenceId!=='agreement:'+id);return true}
function rhythm(s,study={},now=Date.now()){
 migrateInPlace(s);const schedule=scheduleAt(s,now),ranges=sleepRanges(now-DAY,now+DAY,schedule),current=ranges.find(([a,b])=>a<=now&&now<b),nap=s.rhythmState.napUntil>now;
 const inSleep=!!current,confirmed=s.rhythmState.wakeConfirmations.some(x=>x.id==='wake:'+day(now));
 const asleep=s.supervision.mode==='sleep'||nap||inSleep;
 const bedtimeDue=s.supervision.mode==='awake'&&inSleep;
 const wakeRange=ranges.filter(([,b])=>now>=b&&now-b<4*3600000).sort((a,b)=>b[1]-a[1])[0];
 const morningDue=!nap&&!inSleep&&!confirmed&&!!wakeRange;
 const phase=nap?'nap':bedtimeDue?'bedtime':asleep?'sleep':morningDue?'morning':'awake';
 if(s.settings.proactiveEnabled!==false&&s.settings.greetingsEnabled!==false&&!study.focusTimer?.running&&!s.supervision.pending&&!s.life.clockPending){
  const trigger=bedtimeDue&&s.settings.sleepReminders!==false?'bedtime':morningDue&&s.settings.wakeReminders!==false?'morning':null;
  if(trigger&&!(trigger==='bedtime'&&s.rhythmState.bedtimeSnoozeUntil>now)){const keyDate=trigger==='bedtime'?day(current[0]):day(wakeRange[1]);const id='greeting:'+trigger+':'+keyDate;
   if(!s.rhythmState.greetings.some(x=>x.id===id)){
    const ill=bodyState(s,now)!=='normal';const text=trigger==='bedtime'?(ill?'该收卷歇息了。我也正温养，你把这页的疑问记下，明日再续。':'到了说好歇息的时辰。把书签夹好吧，我也要收起医书了。'):'无缺，天亮了。我替你留了早膳，醒来记得吃些东西。今日的功课，等你自己安排。';
    message(s,id,text,now,trigger,id);s.rhythmState.greetings.push({id,at:now});s.proactiveState.lastAt=now;
   }
  }
 }
 if(s.settings.proactiveEnabled!==false&&s.settings.agreementReminders!==false&&s.supervision.mode==='awake'&&!inSleep&&!nap&&!study.focusTimer?.running&&!s.supervision.pending&&!s.life.clockPending)for(const row of s.rhythmState.agreements){if(row.status==='confirmed'&&now>=row.at-15*60000&&now<=row.at+15*60000){const id='agreement:'+row.id;if(message(s,id,'快到我们约好的时候了：'+row.title+'。若今日不方便，也可以重新安排。',now,'agreement',id))s.proactiveState.lastAt=now}}
 return {phase,asleep,bedtimeDue,morningDue,schedule:{sleepStart:schedule.sleepStart,sleepEnd:schedule.sleepEnd},wakeConfirmed:confirmed};
}
// Read-only projection of recorded world events. Never invent a timestamp or apply a delta.
function recapTimeline(s,recap){
 if(!recap||!Array.isArray(recap.eventIds)||!Array.isArray(s?.life?.ledger))return [];
 const ids=new Set(recap.eventIds.filter(id=>typeof id==='string'));
 const start=typeof recap.date==='string'?dateAt(recap.date)+18*3600000:NaN;
 const end=Number.isFinite(start)?Math.min(start+18*3600000,Number.isFinite(recap.at)?recap.at:Infinity):NaN;
 if(!Number.isFinite(start)||!Number.isFinite(end))return [];
 return unionRows(s.life.ledger.filter(row=>row&&row.status!=='unresolved'&&ids.has(row.id)&&Number.isFinite(row.at)&&row.at>=start&&row.at<start+18*3600000&&row.at<=end))
  .sort((a,b)=>a.at-b.at||String(a.id).localeCompare(String(b.id)))
  .map(row=>({eventId:row.id,occurredAt:row.at,kind:row.kind||'ordinary',bodyState:row.bodyState||null,
   factText:String(row.text||row.activity||'日常起居'),sourceType:'engine-ledger',sourceEventId:row.sourceEventId||row.id,previousEventId:row.previousEventId||null}));
}
function nightRecap(s,now=Date.now()){
 migrateInPlace(s);if(!Number.isFinite(now)||s.life.clockPending||now<s.life.cursor)return null;const d=day(now-DAY),id='recap:'+d,old=s.rhythmState.recaps.find(x=>x.id===id);
 const start=dateAt(d)+18*3600000,end=Math.min(now,start+18*3600000);
 const rows=s.life.ledger.filter(x=>x.status!=='unresolved'&&Number.isFinite(x.at)&&x.at>=start&&x.at<start+18*3600000&&x.at<=end).sort((a,b)=>a.at-b.at||String(a.id).localeCompare(String(b.id)));
 // A v2 snapshot may gain newly verified details; a legacy text recap remains unchanged.
 if(old){
  if(old.formatVersion===2){
   const ids=[...new Set([...(old.eventIds||[]),...rows.map(x=>x.id)])];
   if(ids.length!==(old.eventIds||[]).length){old.eventIds=ids;old.at=Math.max(old.at||0,now);}
  }
  return old;
 }
 if(!rows.length)return null;
 const row={id,at:now,date:d,formatVersion:2,text:'夜间纪事已按事件时刻整理。',eventIds:[...new Set(rows.map(x=>x.id))]};
 s.rhythmState.recaps.push(row);log(s,id,'昨夜纪事',row.text,now,'recap');return row;
}
function setMode(s,mode,study={},now=Date.now(),{napUntil=null}={}){
 migrateInPlace(s);if(!['awake','sleep','exempt'].includes(mode))throw Error('作息状态无效');const w=s.supervision;if(w.pending)throw Error('请先核对未确认的时段');
 if(napUntil!==null&&(!Number.isFinite(napUntil)||napUntil<=now||napUntil>now+12*3600000))throw Error('午睡结束时间无效');
 const from=w.modeStart||w.cursor,prior=w.mode;advance(s,now,study);if(w.pending)return false;
 w.intervals.push({start:from,end:now,kind:prior});
 if(mode==='awake'&&prior!=='awake'&&now-from>=1800000){const id='rest:'+day(now);if(!s.chronicle.some(x=>x.id===id)){s.character.recovery=(s.character.recovery||0)+4;log(s,id,'休养恢复','合理休息后，姐姐也完成了自己的温养；身体恢复不消除旧伤。',now,'recovery')}}
 w.mode=mode;w.modeStart=now;w.cursor=now;s.rhythmState.modeChanges=unionRows(s.rhythmState.modeChanges,[{id:'mode:'+now+':'+mode,at:now,mode,napUntil}]);s.rhythmState.napUntil=mode==='sleep'?napUntil:null;
 if(s.settings.targetConfirmed)w.targets[day(now)]??={minutes:s.settings.target,strict:s.settings.strict};
 if(mode==='awake'){if(!s.rhythmState.wakeConfirmations.some(x=>x.id==='wake:'+day(now)))s.rhythmState.wakeConfirmations.push({id:'wake:'+day(now),at:now});if(s.settings.proactiveEnabled!==false&&s.settings.wakeReminders!==false){const note=message(s,'wake-confirmed:'+day(now),'醒了？先喝些水，吃点东西，再把今日的功课理一理。你歇好了，我们再慢慢来。',now,'wake-confirmed','wake:'+day(now));if(note)s.proactiveState.lastAt=now;}independent(s,day(now),now);advanceAutonomy(s,now);nightRecap(s,now)}rhythm(s,study,now);return true;
}
// AI and offline prose can only append a dialogue row; no provider fields are applied.
function appendDialogue(s,text,{id,at=Date.now(),source='offline'}={}){if(typeof text!=='string'||!text.trim()||typeof id!=='string'||!id||!Number.isFinite(at))throw Error('对话内容无效');if(s.chat.some(x=>x.id===id))return false;s.chat.push({id,role:'assistant',text:text.slice(0,12000),at,source:source==='ai'?'ai':'offline'});return true}

function eligible(s,c,study,now=Date.now()) {const r=c.requires||{};return (!r.date||day(now)>=r.date)&&(!r.xp||s.cultivation.xp>=r.xp)&&(!r.realm||s.cultivation.realm>=r.realm)&&(!r.health||s.character.health>=r.health)&&(!r.pressure||s.character.familyPressure>=r.pressure)&&(!r.previous||r.previous.every(x=>s.story.completed.includes(x)))&&(!r.choice||s.story.choices[r.choice.key]===r.choice.value)&&(!r.autonomy||s.character.autonomy>=r.autonomy)}
function choose(s,chapter,node,option,now=Date.now()) {const key=chapter+':'+node;if(s.story.choices[key])return false;s.story.choices[key]=option.id;log(s,'choice:'+key,'剧情选择',option.label,now,'choice');return true}
function finish(s,id,now=Date.now()){if(s.story.completed.includes(id))return false;s.story.completed.push(id);log(s,'chapter:'+id,'章节完成',id==='opening'?'《灯下问道》试读篇已读。':id,now,'chapter');return true}
function validExtras(s){if(s.character?.vitals&&!validVitals(s.character.vitals))return false;const obj=x=>x&&typeof x==='object'&&!Array.isArray(x),rows=x=>Array.isArray(x)&&x.every(r=>obj(r)&&typeof r.id==='string'&&Number.isFinite(r.at));if(s.life&&(!obj(s.life)||!Number.isFinite(s.life.cursor)||!rows(s.life.ledger)))return false;
 if(s.life?.detailState!==undefined){
  const d=s.life.detailState;
  if(!obj(d)||d.version!==1||!Number.isFinite(d.enabledAt)||!Number.isFinite(d.cursor)||d.enabledAt<s.createdAt||d.cursor<d.enabledAt||d.cursor>s.life.cursor||(d.hold!==null&&typeof d.hold!=='string'))return false;
 }if(s.rhythmState&&(!obj(s.rhythmState)||!rows(s.rhythmState.greetings)||!rows(s.rhythmState.recaps)||s.rhythmState.wakeConfirmations&&!rows(s.rhythmState.wakeConfirmations)||s.rhythmState.modeChanges&&(!rows(s.rhythmState.modeChanges)||s.rhythmState.modeChanges.some(x=>!['awake','sleep','exempt'].includes(x.mode)))))return false;if(s.rhythmState?.agreements&&(!rows(s.rhythmState.agreements)||s.rhythmState.agreements.some(x=>typeof x.title!=='string'||!['confirmed','cancelled'].includes(x.status))))return false;if(s.proactiveState&&(!obj(s.proactiveState)||!rows(s.proactiveState.seen)||!Number.isFinite(s.proactiveState.lastAt)))return false;if(s.supervision?.corrections&&!rows(s.supervision.corrections))return false;if(s.novel!==undefined&&(!root.WendaoNovel||!root.WendaoNovel.valid(s.novel)))return false;const d=s.supervision?.deadlines;if(!d)return true;const object=x=>x&&typeof x==='object'&&!Array.isArray(x);if(!object(d)||d.watched&&!object(d.watched)||d.punishments&&!Array.isArray(d.punishments)||d.excused&&!Array.isArray(d.excused))return false;if(Object.values(d.watched||{}).some(w=>!object(w)||typeof w.id!=='string'||!Number.isFinite(dueTime({...w,end:w.end||w.due}))))return false;if((d.punishments||[]).some(p=>!object(p)||typeof p.id!=='string'||!Number.isFinite(p.at)||p.ids&&!Array.isArray(p.ids)||p.recoveryActions&&(!Array.isArray(p.recoveryActions)||p.recoveryActions.some(a=>!object(a)||typeof a.id!=='string'||!Number.isFinite(a.at)))))return false;return ['chatMemory','memoryTombstones','chatTombstones','messages'].every(k=>s[k]===undefined||Array.isArray(s[k])&&s[k].every(x=>object(x)&&typeof x.id==='string'))}
function validate(s){return !!s&&validExtras(s)&&s.schemaVersion===1&&s.story&&Array.isArray(s.story.completed)&&s.story.cursors&&s.story.choices&&Array.isArray(s.story.read)&&Array.isArray(s.story.unlockedCG)&&s.story.flags&&s.character&&s.cultivation&&s.settings&&s.supervision&&Number.isFinite(s.supervision.cursor)&&Array.isArray(s.supervision.intervals)&&Array.isArray(s.supervision.judgements)&&Array.isArray(s.supervision.settled)&&s.supervision.targets&&Array.isArray(s.chronicle)&&Array.isArray(s.mastery)&&Array.isArray(s.chat)&&s.assets&&Array.isArray(s.approvedChapters)&&Array.isArray(s.achievements)&&!!s.baseline}
function unionRows(a=[],b=[]){const m=new Map();for(const x of [...a,...b]){const prev=m.get(x.id);if(!prev||(x.updatedAt||0)>(prev.updatedAt||0)||((x.updatedAt||0)===(prev.updatedAt||0)&&JSON.stringify(x)<JSON.stringify(prev)))m.set(x.id,copy(x))}return [...m.values()].sort((x,y)=>(x.at||0)-(y.at||0)||String(x.id).localeCompare(String(y.id)))}
function merge(a,b){
 if(!validate(a)||!validate(b))throw Error('问道存档无效');const n=migrateLegacySave(a),other=migrateLegacySave(b);
 for(const k of ['chronicle','mastery','chat','messages','chatMemory','memoryTombstones','chatTombstones'])n[k]=unionRows(n[k],other[k]);
 const readMessages=new Set([...a.messages||[],...b.messages||[]].filter(x=>x.read).map(x=>x.id));for(const x of n.messages)if(readMessages.has(x.id))x.read=true;
 n.chatMemory=n.chatMemory.filter(x=>!n.memoryTombstones.some(t=>t.id===x.id));n.chat=n.chat.filter(x=>!n.chatTombstones.some(t=>t.id===x.id));
 const da=deadlineState(n),db=deadlineState(other);da.watched={...db.watched,...da.watched};
 for(const [id,w]of Object.entries(db.watched))if(!da.watched[id]||w.watchedAt>da.watched[id].watchedAt)da.watched[id]=w;
 da.excused=[...new Set([...da.excused,...db.excused])].sort();
 const ledger=new Map(da.punishments.map(p=>[p.id,p]));
 for(const p of db.punishments){const old=ledger.get(p.id);if(!old){ledger.set(p.id,copy(p));continue}
  const corrected=Math.max(old.correctedAt||0,p.correctedAt||0),resolved=Math.max(old.resolvedAt||0,p.resolvedAt||0);
  const merged={...(JSON.stringify(old)<JSON.stringify(p)?old:p),recoveryActions:unionRows(old.recoveryActions,p.recoveryActions)};
  if(corrected)Object.assign(merged,{correctedAt:corrected,resolvedAt:corrected,resolution:'corrected',status:'corrected'});
  else if(resolved)Object.assign(merged,{resolvedAt:resolved,status:'resolved',resolution:'healed'});
  ledger.set(p.id,merged);
 }
 da.punishments=[...ledger.values()].sort((x,y)=>x.at-y.at||x.id.localeCompare(y.id));
 // Compatible legacy day-groups cover their original tasks: never re-issue as new IDs.
 const legacy=da.punishments.filter(p=>p.id==='ddl:'+p.due);
 da.punishments=da.punishments.filter(p=>legacy.includes(p)||!legacy.some(l=>p.ids.some(id=>l.ids.includes(id))));
 for(const k of ['completed','unlockedCG'])n.story[k]=[...new Set([...a.story[k],...b.story[k]])].sort();
 const read=new Map([...a.story.read,...b.story.read].map(x=>[typeof x==='object'?x.id:x,x]));n.story.read=[...read.values()];
 for(const [k,v]of Object.entries(b.story.choices))if(!n.story.choices[k])n.story.choices[k]=v;
 n.achievements=[...new Set([...a.achievements,...b.achievements])].sort();n.seenStudy=[...new Set([...(a.seenStudy||[]),...(b.seenStudy||[])])].sort();
 n.supervision.judgements=unionRows(a.supervision.judgements,b.supervision.judgements);
 n.supervision.corrections=unionRows(n.supervision.corrections,other.supervision.corrections);
 const correctedIDs=new Set(n.supervision.corrections.map(x=>x.id));
 n.supervision.judgements=n.supervision.judgements.filter(x=>!correctedIDs.has(x.id));const suppressed=new Set();let latestIdle=null;n.supervision.judgements=n.supervision.judgements.filter(x=>{if(!x.id.startsWith('idle:v4:'))return true;if(latestIdle!==null&&x.at-latestIdle<30*60000){suppressed.add(x.id);return false}latestIdle=x.at;return true});
 n.chronicle=n.chronicle.filter(x=>!correctedIDs.has(x.id)&&!suppressed.has(x.id));n.messages=n.messages.filter(x=>!correctedIDs.has(x.evidenceId)&&!suppressed.has(x.evidenceId));
 n.proactiveState.seen=unionRows(n.proactiveState.seen,other.proactiveState.seen);n.proactiveState.lastAt=Math.max(n.proactiveState.lastAt||0,other.proactiveState.lastAt||0);
 n.life.ledger=unionRows(n.life.ledger,other.life.ledger);for(const row of n.life.ledger){if(row.kind==='study'&&da.punishments.some(p=>p.at<=row.at&&injuryFor(p,row.at).active)){Object.assign(row,LIFE_ACTIONS[1],{bodyState:'injured',delta:{autonomy:1,cultivation:0,pressure:0}});const log=n.chronicle.find(x=>x.id===row.id);if(log)log.text=row.text}}n.life.cursor=Math.max(n.life.cursor,other.life.cursor);
 const detailMetas=[n.life.detailState,other.life.detailState].filter(d=>d?.version===1);
 if(detailMetas.length)n.life.detailState={version:1,enabledAt:Math.min(...detailMetas.map(d=>d.enabledAt)),cursor:Math.min(n.life.cursor,Math.max(...detailMetas.map(d=>d.cursor))),hold:detailMetas.some(d=>d.hold)?'merged-hold':null};
 n.rhythmState.greetings=unionRows(n.rhythmState.greetings,other.rhythmState.greetings);n.rhythmState.recaps=unionRows(n.rhythmState.recaps,other.rhythmState.recaps).map(row=>{
 const versions=[...(a.rhythmState?.recaps||[]),...(b.rhythmState?.recaps||[])].filter(r=>r.id===row.id);
 // Preserve old summaries verbatim; only v2 snapshots combine their coverage.
 if(versions.length<2||versions.some(r=>r.formatVersion!==2))return row;
 return {...row,at:Math.max(...versions.map(r=>r.at)),eventIds:[...new Set(versions.flatMap(r=>r.eventIds||[]))].sort()};
 });n.rhythmState.wakeConfirmations=unionRows(n.rhythmState.wakeConfirmations,other.rhythmState.wakeConfirmations);n.rhythmState.modeChanges=unionRows(n.rhythmState.modeChanges,other.rhythmState.modeChanges);n.rhythmState.agreements=unionRows(n.rhythmState.agreements,other.rhythmState.agreements);const cancelled=new Set([...n.rhythmState.agreements,...other.rhythmState.agreements,...(a.rhythmState?.agreements||[])].filter(x=>x.status==='cancelled').map(x=>x.id));for(const row of n.rhythmState.agreements)if(cancelled.has(row.id))row.status='cancelled';n.messages=n.messages.filter(x=>!x.evidenceId?.startsWith('agreement:')||!cancelled.has(x.evidenceId.slice(10)));
 const temporary=[n.rhythmState.temporarySleep,other.rhythmState.temporarySleep].filter(Boolean).sort((x,y)=>y.from-x.from||JSON.stringify(x).localeCompare(JSON.stringify(y)));n.rhythmState.temporarySleep=temporary[0]||null;
 scribeLife(n);
 n.supervision.settled=unionRows(a.supervision.settled.map(x=>({...x,id:x.id||x.date})),b.supervision.settled.map(x=>({...x,id:x.id||x.date})));
 const acts=n.chronicle.filter(x=>x.kind==='sister').length;n.character.autonomy=Math.max(a.character.autonomy||0,b.character.autonomy||0,acts);n.character.cultivation=Math.max(a.character.cultivation||0,b.character.cultivation||0,acts*3);
 for(const k of ['recovery','interventions'])n.character[k]=Math.max(a.character[k]||0,b.character[k]||0,k==='interventions'?n.chronicle.filter(x=>x.id.startsWith('protect:')).length:0);
 n.character.vitals=mergeVitals(n.character.vitals,other.character.vitals);n.cultivation.realm=Math.max(a.cultivation.realm,b.cultivation.realm);if(root.WendaoNovel&&(a.novel||b.novel))n.novel=root.WendaoNovel.merge(a.novel,b.novel);return n;
}
function scribeLife(s){s.character.autonomousStudy=s.life.ledger.reduce((n,x)=>n+(x.delta?.cultivation||0),0);s.character.lifePressure=clamp(s.life.ledger.reduce((n,x)=>n+(x.delta?.pressure||0),0),0,12)}

// v1.5: replayable sister-only resources. HP/fatigue/realm remain owned by v4.
const VITAL_SEED=Object.freeze({at:0,mana:75,mood:70,satiety:82,sisterXP:65});
const VITAL_KINDS=new Set(['injury','purification','study','independent','rest','care','meal','comfort']);
function ensureVitals(s){s.character.vitals??={version:1,seed:{...VITAL_SEED},events:[],conflicts:[]};return s.character.vitals}
function validVitals(v){return v&&v.version===1&&v.seed&&Object.keys(VITAL_SEED).every(k=>v.seed[k]===VITAL_SEED[k])&&Array.isArray(v.events)&&v.events.length<=20000&&Array.isArray(v.conflicts)&&v.conflicts.length<=2000&&v.conflicts.every(x=>typeof x.id==='string'&&Array.isArray(x.variants)&&x.variants.every(validVitalEvent))&&v.events.every(validVitalEvent)&&new Set(v.events.map(x=>x.id)).size===v.events.length}
function validVitalEvent(e){return e&&typeof e.id==='string'&&e.id.startsWith('vital:')&&e.id.length<=500&&typeof e.sourceId==='string'&&e.sourceId.length<=450&&Number.isFinite(e.at)&&e.at>=0&&VITAL_KINDS.has(e.kind)&&(e.minutes===undefined||Number.isFinite(e.minutes)&&e.minutes>=0&&e.minutes<=1440)}
function appendVital(v,e,index){if(!validVitalEvent(e))throw Error('人物数值来源无效');const old=index?index.get(e.id):v.events.find(x=>x.id===e.id);if(!old){if(v.events.length>=20000)throw Error('人物数值账本已达上限，请先导出备份');v.events.push(e);index?.set(e.id,e);return}if(['meal','comfort','care'].includes(e.kind)&&old.kind===e.kind&&old.sourceId===e.sourceId){old.at=Math.min(old.at,e.at);return}if(JSON.stringify(old)!==JSON.stringify(e)){const conflict=v.conflicts.find(x=>x.id===e.id);const variants=[...(conflict?.variants||[old]),e];const unique=[...new Map(variants.map(x=>[JSON.stringify(x),x])).values()].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));if(conflict)conflict.variants=unique;else v.conflicts.push({id:e.id,variants:unique});v.events[v.events.indexOf(old)]=unique[0];index?.set(e.id,unique[0])}}
function mergeVitals(a,b){if(!validVitals(a)||!validVitals(b))throw Error('人物数值账本无效，请保留备份后核对');const v=copy(a),index=new Map(v.events.map(e=>[e.id,e]));for(const e of b.events)appendVital(v,e,index);for(const c of b.conflicts)for(const e of c.variants)appendVital(v,e,index);v.events.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));v.conflicts.sort((a,b)=>a.id.localeCompare(b.id));return v}
function syncVitals(s,study,at){const v=ensureVitals(s),facts=[];const add=(kind,sourceId,t,extra={})=>{if(Number.isFinite(t)&&t<=at)facts.push({id:'vital:'+kind+':'+sourceId,at:t,kind,sourceId,...extra})};
 for(const p of deadlineState(s).punishments){add(p.result==='summons'?'purification':'injury',p.id,p.at);for(const r of p.recoveryActions||[])add('care',r.id,r.at)}
 for(const r of uniqueStudy(study.sessions||[])){if(s.baseline.sessions?.includes(r.id)||r.minutes<s.settings.minStudy||r.date>day(at))continue;const end=Date.parse(r.endedAt||r.at||'');const t=Number.isFinite(end)?end:dateAt(r.date)+DAY-1;if(day(t)!==r.date||t>at||t<(s.createdAt||0))continue;add('study',r.id,t,{minutes:Number(r.minutes)})}
 for(const r of s.life.ledger||[])if(r.kind==='study'||r.kind==='rest')add(r.kind==='study'?'independent':'rest',r.id,r.at);
 // Own intentional care has a stable daily receipt; never use chat text as evidence.
 for(const r of v.events)if(['meal','comfort'].includes(r.kind))facts.push(r);
 const index=new Map(v.events.map(e=>[e.id,e]));for(const e of facts)appendVital(v,e,index);v.events.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));return new Map(facts.map(x=>[x.id,x]));
}
function vitals(s,study={sessions:[],events:[]},at=Date.now()){
 const v=ensureVitals(s),clockDispute=!!s.life?.clockPending||!Number.isFinite(at)||at<(s.createdAt||0);const time=clockDispute?Math.max(s.createdAt||0,s.life?.cursor||0):at;
 const facts=syncVitals(s,study,time),ps=deadlineState(s).punishments;
 const status=t=>{const active=ps.filter(p=>p.at<=t&&!p.correctedAt&&p.status!=='corrected').map(p=>injuryFor({...p,status:p.resolvedAt&&p.resolvedAt>t?'active':p.status,recoveryActions:(p.recoveryActions||[]).filter(r=>r.at<=t)},t)).filter(x=>x.active);return {severe:active.length>0,acute:active.some(x=>x.phase==='acute'),cap:active.some(x=>x.phase==='acute')?55:active.length?75:100}};
 const out={mana:v.seed.mana,mood:v.seed.mood,satiety:v.seed.satiety,sisterXP:v.seed.sisterXP};let cursor=Math.min(s.createdAt||time,time,...ps.map(p=>p.at));const totals=new Map();
 function passive(start,end){if(end<=start)return;start=Math.max(start,end-7*DAY);let prev=start;
  const marks=[end];for(let d=dateAt(day(start));d<=end;d+=DAY)for(const hour of [8,13,19,23]){const t=d+hour*3600000;if(t>start&&t<end)marks.push(t)}marks.sort((a,b)=>a-b);
  for(const t of marks){const h=(t-prev)/3600000,body=status(prev),night=new Date(prev+8*3600000).getUTCHours()<8||new Date(prev+8*3600000).getUTCHours()>=23;out.mana=clamp(out.mana+h*(night?(body.severe?.4:1.4):.1),0,body.cap);out.mood+=Math.sign(65-out.mood)*Math.min(Math.abs(65-out.mood),h*.12);out.satiety=clamp(out.satiety-h*1.8,45,100);const hour=new Date(t+8*3600000).getUTCHours();if([8,13,19].includes(hour)&&t%3600000===0)out.satiety=Math.max(out.satiety,78);prev=t}
 }
 for(const e of v.events){if(e.at>time)break;if(e.at<cursor||!facts.has(e.id)||v.conflicts.some(c=>c.id===e.id))continue;const punishment=ps.find(p=>p.id===e.sourceId);if(punishment&&(punishment.correctedAt||punishment.status==='corrected'))continue;
  passive(cursor,e.at);cursor=e.at;const d=day(e.at),key=d+':'+e.kind,used=totals.get(key)||0;let gain=0;
  switch(e.kind){case 'injury':out.mana-=28;out.mood-=10;out.sisterXP-=30;break;case 'purification':out.mana-=35;out.mood-=12;out.sisterXP-=20;break;
   case 'study':gain=Math.max(0,Math.min(8-used,2*Math.floor(e.minutes/30)));out.sisterXP+=gain;out.mood+=Math.min(2,gain);totals.set(key,used+gain);break;
   case 'independent':if(!status(e.at).severe&&used<4){out.sisterXP+=4;out.mana-=3;out.mood+=2;totals.set(key,used+4)}break;
   case 'rest':if(used<1){out.mana+=6;out.sisterXP+=1;out.mood+=2;totals.set(key,1)}break;
   case 'care':if(used<1){out.mana+=5;out.mood+=3;totals.set(key,1)}break;
   case 'meal':out.satiety=Math.max(out.satiety,92);out.mood+=1;break;
   case 'comfort':out.mood+=3;break;
  }
  out.mana=clamp(out.mana,0,status(e.at).cap);out.mood=clamp(out.mood);out.satiety=clamp(out.satiety,45,100);out.sisterXP=Math.max(0,out.sisterXP);
 }
 passive(cursor,time);const body=status(time);return Object.freeze({hp:clamp(s.character.health),maxHP:100,mp:Math.round(Math.min(body.cap,out.mana)),maxMP:body.cap,stamina:clamp(100-s.character.fatigue),maxStamina:100,mood:Math.round(out.mood),satiety:Math.round(out.satiety),sisterXP:Math.round(out.sisterXP),seriousInjury:body.severe,acuteInjury:body.acute,clockDispute,conflicts:v.conflicts.length});
}
function companionCare(s,kind,at=Date.now()){
 if(!['meal','comfort'].includes(kind)||s.life?.clockPending||!Number.isFinite(at)||at<(s.createdAt||0))return false;const v=ensureVitals(s),sourceId=kind+':'+day(at),id='vital:'+kind+':'+sourceId;
 if(v.events.some(x=>x.id===id))return false;appendVital(v,{id,kind,sourceId,at});
 log(s,id,kind==='meal'?'一同用膳':'灯下关怀',kind==='meal'?'按今日作息安排饮食。姐姐也会自行用膳，不会因妹妹离线挨饿。':'姐妹说了几句宽慰的话；不改变羁绊、伤势或主线。',at,'companion');return true;
}

root.WendaoEngine={canViewRecoveryCG,vitals,companionCare,mergeVitals,validVitals,RULES,EVENTS,planAgreement,cancelAgreement,advanceAutonomy,acknowledgeLifeClock,rhythm,setMode,setTemporarySleep,nightRecap,recapTimeline,appendDialogue,dueTime,settlementID,migrateLegacySave,recoverDeadline,injuryFor,unionRows,recalculate,proactive,day,dateAt,fresh,baseline,derive,advance,settle,independent,eligible,choose,finish,validate,merge,log,subtract,watchDeadlines,checkDeadlines,untrackedOverdue,confirmMissedDeadline,resolveDeadline,portrait};
})(typeof window!=='undefined'?window:globalThis);
