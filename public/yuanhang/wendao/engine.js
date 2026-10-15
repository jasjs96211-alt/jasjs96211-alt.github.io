/* Local deterministic rules. Fictional state is never writable by the chat provider. */
(function(root){
'use strict';
const TZ='Asia/Shanghai',DAY=86400000;
const day=t=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
const dateAt=d=>Date.parse(d+'T00:00:00+08:00');
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const copy=x=>JSON.parse(JSON.stringify(x));
const fresh=(now=Date.now())=>({schemaVersion:1,rulesVersion:3,createdAt:now,revision:0,settings:{strict:true,sleepStart:'23:00',sleepEnd:'08:00',target:180,minStudy:5,dailyCap:480,chatEndpoint:'http://127.0.0.1:8787/api/chat',chatMode:'mixed',sensitive:false,deadlineMajor:true,targetConfirmed:false},story:{current:'opening',cursors:{},completed:[],choices:{},read:[],unlockedCG:[],flags:{allowPurification:true,allowIllness:true}},character:{injuries:[],health:78,fatigue:22,realm:3,autonomy:0,cultivation:0,recovery:0,interventions:0,activity:'整理功课，安排自己的研习',bond:'彼此守护'},cultivation:{xp:0,realm:0,readiness:0,protection:0},supervision:{mode:'exempt',cursor:now,idle:0,judgements:[],settled:[],intervals:[],observed:[],targets:{},pending:null,deadlines:{watched:{},punishments:[],excused:[]}},chronicle:[],mastery:[],chat:[],chatMemory:[],messages:[],assets:{},approvedChapters:[],outline:'',achievements:[],baseline:{},seenStudy:[],lastDate:day(now)});
function log(s,id,title,text,at=Date.now(),kind='system') {if(s.chronicle.some(x=>x.id===id))return false;s.chronicle.push({id,title,text,at,kind});return true}
function baseline(s,study){s.baseline={sessions:(study.sessions||[]).map(x=>x.id),tasks:(study.events||[]).filter(x=>x.done).map(x=>x.id)};return s}
function derive(s,study,now=Date.now()){
 migrateInPlace(s);s.seenStudy??=[];
 for(const row of study.sessions||[]){if(s.baseline.sessions?.includes(row.id)||s.seenStudy.includes(row.id))continue;s.seenStudy.push(row.id);if(row.date===day(now)&&row.minutes>=s.settings.minStudy){s.supervision.idle=0;log(s,'study:'+row.id,'有效修炼',`${row.subject} · ${row.minutes}分钟（真实记录/补录）`,now,'study')}}

 let xp=0,minutes=0;const totals={};
 const rows=(study.sessions||[]).filter(x=>!s.baseline.sessions?.includes(x.id)&&x.date<=day(now));
 for(const r of rows){const n=Math.max(0,Math.min(Number(r.minutes)||0,s.settings.dailyCap-(totals[r.date]||0)));totals[r.date]=(totals[r.date]||0)+n;xp+=n;minutes+=n}
 const done=(study.events||[]).filter(x=>x.done&&x.completedAt&&!s.baseline.tasks?.includes(x.id));xp+=done.length*12;
 for(const m of s.mastery)xp+=({recall:15,dictation:25,review:30}[m.level]||0);
 s.cultivation={xp:Math.round(xp),realm:s.cultivation.realm,readiness:clamp(Math.floor(xp/15)),protection:clamp(Math.floor(xp/30))};
 const ds=deadlineState(s);s.character.injuries=ds.punishments.map(p=>injuryFor(p,now));
 const activeMajor=s.character.injuries.filter(x=>x.active);
 const bad=s.supervision.judgements.length+s.supervision.settled.filter(x=>!x.met).length;
 const relief=Math.floor(minutes/60)+s.character.autonomy+(s.character.interventions||0)*3;
 const groups={};for(const i of activeMajor){const d=day(i.firstAt);groups[d]=Math.min(RULES.dailyDamageCap,(groups[d]||0)+i.contribution)}
 const damage=Object.values(groups).reduce((n,x)=>n+x,0);
 s.character.familyPressure=clamp(20+Math.min(bad*3,18)-relief*2+Math.min(activeMajor.length*26,52));
 // Idle/daily failures are light supervision. Persistent DDL ledger is the only severe source.
 const strain=Math.min(12,s.supervision.judgements.reduce((n,x)=>n+(x.result==='warning'?0:1),0));
 s.character.health=clamp(78-strain+Math.floor(minutes/120)+(s.character.recovery||0)-damage,RULES.healthFloor,100);
 if(activeMajor.length)s.character.health=Math.min(s.character.health,64);
 s.character.fatigue=clamp(100-s.character.health+Math.min(bad,12));
 s.character.purificationBurden=Math.max(0,12+ds.punishments.filter(p=>!p.correctedAt&&p.result==='summons'&&!p.resolvedAt).length*12-Math.floor((s.character.recovery||0)/2));
 s.character.state=activeMajor.some(x=>x.phase==='acute')?'injured':activeMajor.length?'ill':'normal';
 const achievements=[['first-study','第一卷功课',rows.length>0],['dictation','落笔有据',s.mastery.some(x=>x.level==='dictation')],['review','温故',s.mastery.some(x=>x.level==='review')],['opening','灯下同心',s.story.completed.includes('opening')],['hour','积微成著',minutes>=60]];
 for(const [id,title,ok] of achievements)if(ok&&!s.achievements.includes(id)){s.achievements.push(id);log(s,'achievement:'+id,title,'条件已达成；来源见学习记录或章节选择。',now,'achievement')}
 return s;
}

// Ledger v3: every tracked task/revision settles once; numeric caps never swallow events.
const RULES=Object.freeze({healthFloor:35,dailyDamageCap:30,severeDamage:22,acuteHours:48,recoverySteps:4,minHealingDays:3});
const EVENTS=Object.freeze(Object.fromEntries(['书案未启','灯尽未成','页角残章','温家问询','令书至门','禁足与责罚','净殿传召','血染衣袖','并肩修行','护在身前','重订修行簿'].map((name,i)=>['EV-'+String(i+1).padStart(2,'0'),name])));
function dueTime(e){const n=e.dueAt?Date.parse(e.dueAt):dateAt(e.end)+DAY-1;return Number.isFinite(n)?n:NaN}
const dueISO=e=>new Date(dueTime(e)).toISOString();
const taskVersion=e=>Number.isSafeInteger(e.taskRevision)&&e.taskRevision>0?e.taskRevision:1;
const settlementID=e=>'ddl:'+e.id+':'+dueISO(e)+':'+taskVersion(e)+':overdue';
function deadlineState(s){s.supervision.deadlines??={};const d=s.supervision.deadlines;d.watched??={};d.punishments??=[];d.excused??=[];d.pending??={};return d}
function migrateInPlace(s){
 const ds=deadlineState(s);for(const w of Object.values(ds.watched)){w.end??=w.due;w.dueAt??=dueISO(w);w.taskRevision??=1;w.importance??='important'} s.character.injuries??=[];s.chatMemory??=[];s.memoryTombstones??=[];s.chatTombstones??=[];
 for(const p of ds.punishments){
  p.ids??=p.taskId?[p.taskId]:[];p.taskId??=p.ids[0];p.dueAt??=p.due?new Date(dateAt(p.due)+DAY-1).toISOString():new Date(p.at).toISOString();
  p.taskRevision??=1;p.importance??='important';p.recoveryActions??=[];
  p.status=p.correctedAt||p.resolution==='corrected'?'corrected':p.status|| (p.resolvedAt?'resolved':'active');
  if(p.status==='corrected')p.correctedAt??=p.resolvedAt||p.at;
  p.injuryId??='injury:'+p.id;p.eventIds??=[p.importance==='critical'?'EV-05':'EV-04',p.result==='summons'?'EV-07':'EV-06','EV-08'];
 }
 s.rulesVersion=3;return s;
}
function migrateLegacySave(old){if(!validate(old))throw Error('问道存档无效');return migrateInPlace(copy(old))}
function injuryFor(p,now){
 const actions=p.recoveryActions||[],steps=actions.length,age=now-p.at;
 const healed=p.status==='resolved'||(steps>=RULES.recoverySteps&&age>=RULES.minHealingDays*DAY);
 const corrected=p.status==='corrected'||!!p.correctedAt;
 const phase=corrected?'corrected':healed?'healed':age<RULES.acuteHours*3600000?'acute':steps?'recovering':'stable';
 return {id:p.injuryId,causeSettlementId:p.id,severity:'severe',phase,active:!healed&&!corrected,firstAt:p.at,lastUpdateAt:Math.max(p.at,...actions.map(a=>a.at)),contribution:corrected||healed?0:Math.max(4,RULES.severeDamage-steps*4),recoveryPath:'疗养／求援／交涉／共同修行'};
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
 const injuries=deadlineState(s).punishments.map(p=>injuryFor(p,now));
 const states={normal:['sister-calm','温柔·日常','calm'],concerned:['sister-concerned','忧心·担忧','concerned'],tired:['sister-tired','疲惫·倦怠','tired'],ill:['sister-ill','病中·虚弱','ill'],injured:['sister-weakened','受罚·负伤','major'],relieved:['sister-relieved','欣慰·浅笑','relieved']};
 let state='normal',reason='平静的准备期';
 if(s.story.forcedPortrait&&states[s.story.forcedPortrait]&&s.story.forcedUntil>now){state=s.story.forcedPortrait;reason='当前场景明确指定的神情（伤势仍保留）'}
 else if(injuries.some(x=>x.active&&x.phase==='acute')){state='injured';reason='DDL严重伤病的急性期'}
 else if(injuries.some(x=>x.active)||s.character.health<55){state='ill';reason='持续伤势仍需疗养'}
 else if(s.character.familyPressure>=45){state='concerned';reason='温家压力上升'}
 else if(s.character.fatigue>=30||s.character.health<75){state='tired';reason='研习与身体疲劳'}
 else if(s.chronicle.some(x=>['achievement','protection','recovery'].includes(x.kind)&&now-x.at<6*3600000&&now>=x.at)){state='relieved';reason='近期研习或保护取得进展'}
 const [id,label,severity]=states[state];return {id,label,severity,state,reason};
}

function subtract(start,end,exclusions){let pieces=[[start,end]];for(const x of exclusions){pieces=pieces.flatMap(([a,b])=>x[1]<=a||x[0]>=b?[[a,b]]:[[a,Math.max(a,x[0])],[Math.min(b,x[1]),b]].filter(([u,v])=>v>u))}return pieces}
function sleepRanges(start,end,settings){const minutes=v=>{const [h,m]=v.split(':').map(Number);return h*60+m};const a=minutes(settings.sleepStart||'23:00')*60000,b=minutes(settings.sleepEnd||'08:00')*60000,out=[];for(let d=dateAt(day(start))-DAY;d<=end;d+=DAY)out.push([d+a,d+b+(b<=a?DAY:0)]);return out}
function advance(s,to,study,{confirmed=false,replaying=false}={}){
 const w=s.supervision,from=w.cursor;if(!Number.isFinite(to)||to<from){w.pending={from,to,reason:'设备时钟倒退'};return s}
 if(w.pending&&!confirmed)return s;
 if((to-from>90000||day(from)!==day(to))&&!confirmed&&s.settings.strict&&w.mode==='awake'){w.pending={from,to,reason:'离线、后台或跨日时间需要核对'};return s}
 w.cursor=to;w.pending=null;if(!replaying&&to>from){w.observed??=[];const last=w.observed.at(-1);if(last&&last.end===from&&to-last.start<=3600000&&last.mode===w.mode&&last.strict===s.settings.strict&&last.sleepStart===s.settings.sleepStart&&last.sleepEnd===s.settings.sleepEnd)last.end=to;else w.observed.push({start:from,end:to,mode:w.mode,strict:s.settings.strict,sleepStart:s.settings.sleepStart,sleepEnd:s.settings.sleepEnd});}
 if(!s.settings.strict||w.mode!=='awake')return s;
 const exclusions=[...sleepRanges(from,to,s.settings),...w.intervals.filter(x=>x.kind!=='awake').map(x=>[x.start,x.end])];
 const evidence=(study.sessions||[]).filter(x=>x.minutes>=s.settings.minStudy).flatMap(x=>Array.isArray(x.studyIntervals)?x.studyIntervals:x.startedAt&&x.endedAt?[[Date.parse(x.startedAt),Date.parse(x.endedAt)]]:[]).filter(x=>Array.isArray(x)&&x.length===2&&x.every(Number.isFinite)&&x[1]>x[0]);
 const pieces=subtract(from,to,exclusions);let budget=2;
 for(const [a,b] of pieces){
  for(let d=dateAt(day(a));d<b;d+=DAY){if(s.settings.targetConfirmed)w.targets[day(d)]??={minutes:s.settings.target,strict:true}};
  const intervals=subtract(a,b,evidence);
  let cursor=a;
  for(const [u,v] of intervals){if(u>cursor)w.idle=0;w.idle+=(v-u)/60000;cursor=v;
   while(w.idle>=120){w.idle-=120;if(budget--<=0)continue;
    const judgementAt=v-w.idle*60000;const id='idle:'+Math.floor(judgementAt);
    const result=w.judgements.length%2?'fatigue':'warning';
    w.judgements.push({id,at:judgementAt,result,eventId:'EV-01'});log(s,id,EVENTS['EV-01'],'温家催促增加，姐姐留字提醒；清醒无有效学习累计120分钟。可补记学习、休息或核对误判，不造成DDL严重伤病。',judgementAt,'risk');
   }
  }if(cursor<b)w.idle=0;
 }
 if(to-from>DAY)log(s,'offline:'+from,'离线汇总结算','本次最多结算两次压力，其余间隔已合并。',to);
 return derive(s,study,to);
}
function recalculate(s,study,now=Date.now()){
 const w=s.supervision,observed=[...(w.observed||[])],cursor=w.cursor,mode=w.mode,pending=w.pending,strict=s.settings.strict,sleepStart=s.settings.sleepStart,sleepEnd=s.settings.sleepEnd;
 const oldIDs=new Set(w.judgements.map(x=>x.id));s.chronicle=s.chronicle.filter(x=>!oldIDs.has(x.id));w.judgements=[];w.idle=0;
 for(const x of observed){w.cursor=x.start;w.mode=x.mode;s.settings.strict=x.strict;s.settings.sleepStart=x.sleepStart||'23:00';s.settings.sleepEnd=x.sleepEnd||'08:00';advance(s,x.end,study,{confirmed:true,replaying:true})}
 w.cursor=cursor;w.mode=mode;w.pending=pending;s.settings.strict=strict;s.settings.sleepStart=sleepStart;s.settings.sleepEnd=sleepEnd;derive(s,study,now);return s;
}
function settle(s,d,study,now=Date.now()){
 const w=s.supervision;if(w.settled.some(x=>x.date===d)||d>=day(now))return false;
 const active=w.targets[d];if(!active||!active.strict||![...w.intervals,...(w.observed||[]).filter(x=>x.mode==='awake'&&x.strict).map(x=>({...x,kind:'awake'}))].some(x=>x.kind==='awake'&&x.start<dateAt(d)+DAY&&x.end>dateAt(d)))return false;
 const minutes=(study.sessions||[]).filter(x=>x.date===d).reduce((n,x)=>n+x.minutes,0);const met=minutes>=active.minutes||active.exempt;
 w.settled.push({date:d,minutes,target:active.minutes,met});log(s,'daily:'+d,met?EVENTS['EV-09']:EVENTS['EV-02'],`${d}：${minutes}/${active.minutes}分钟。${met?'目标达成或已豁免。':'准备不足，温家压力上升；可以通过后续行动恢复。'}`,now,met?'study':'risk');return true;
}
function independent(s,d,now=Date.now()) {const id='sister:'+d;if(s.chronicle.some(x=>x.id===id))return false;s.character.autonomy+=1;s.character.cultivation+=3;const actions=[['研读医理与经脉图','温知遥整理经脉旧伤的记录，给自己的研习留下了笔记。'],['查阅净灵殿传召记录','温知遥核对传召与休养间隔，准备同妹妹商量可行的应对。'],['温养灵息、练习水法','温知遥自行安排了限量修炼，疲劳时便停下来休息。'],['整理药草与功课','温知遥辨认药草、记下医理疑问，没有把自己的一天全耗在等待里。'],['研读学宫规约','温知遥把关于求学的疑问写在纸上，留待与妹妹一起求证。']];const a=actions[s.character.autonomy%actions.length];s.character.activity=a[0];for(const p of deadlineState(s).punishments)if(day(p.at)<d)recoverDeadline(s,p.id,'care',now);log(s,id,'姐姐的独立行动',a[1],now,'sister');return true}
function proactive(s,study,now=Date.now()){
 s.messages??=[];const d=day(now),used=s.messages.filter(x=>day(x.at)===d).length;if(used>=2)return;
 const total=(study.sessions||[]).filter(x=>x.date===d).reduce((a,x)=>a+x.minutes,0);
 let id,text;if(total>=120){id='message:study:'+d;text='今日功课做得这般认真。先让眼睛歇一歇吧。我也把自己的研习记下了，等会儿我们交换着说说。'}else if(s.chronicle.some(x=>x.id==='sister:'+d)){id='message:care:'+d;text='无缺，我今日也有自己的功课。你安心读书，累了记得歇一歇；我也会照顾好自己。'}
 if(id&&!s.messages.some(x=>x.id===id)){s.messages.push({id,text,at:now,read:false,source:'event'});log(s,id,'姐姐来信',text,now,'message')}
}

function eligible(s,c,study,now=Date.now()) {const r=c.requires||{};return (!r.date||day(now)>=r.date)&&(!r.xp||s.cultivation.xp>=r.xp)&&(!r.realm||s.cultivation.realm>=r.realm)&&(!r.health||s.character.health>=r.health)&&(!r.pressure||s.character.familyPressure>=r.pressure)&&(!r.previous||r.previous.every(x=>s.story.completed.includes(x)))&&(!r.choice||s.story.choices[r.choice.key]===r.choice.value)&&(!r.autonomy||s.character.autonomy>=r.autonomy)}
function choose(s,chapter,node,option,now=Date.now()) {const key=chapter+':'+node;if(s.story.choices[key])return false;s.story.choices[key]=option.id;log(s,'choice:'+key,'剧情选择',option.label,now,'choice');return true}
function finish(s,id,now=Date.now()){if(s.story.completed.includes(id))return false;s.story.completed.push(id);log(s,'chapter:'+id,'章节完成',id==='opening'?'《灯下问道》试读篇已读。':id,now,'chapter');return true}
function validExtras(s){const d=s.supervision?.deadlines;if(!d)return true;const object=x=>x&&typeof x==='object'&&!Array.isArray(x);if(!object(d)||d.watched&&!object(d.watched)||d.punishments&&!Array.isArray(d.punishments)||d.excused&&!Array.isArray(d.excused))return false;if(Object.values(d.watched||{}).some(w=>!object(w)||typeof w.id!=='string'||!Number.isFinite(dueTime({...w,end:w.end||w.due}))))return false;if((d.punishments||[]).some(p=>!object(p)||typeof p.id!=='string'||!Number.isFinite(p.at)||p.ids&&!Array.isArray(p.ids)||p.recoveryActions&&(!Array.isArray(p.recoveryActions)||p.recoveryActions.some(a=>!object(a)||typeof a.id!=='string'||!Number.isFinite(a.at)))))return false;return ['chatMemory','memoryTombstones','chatTombstones','messages'].every(k=>s[k]===undefined||Array.isArray(s[k])&&s[k].every(x=>object(x)&&typeof x.id==='string'))}
function validate(s){return !!s&&validExtras(s)&&s.schemaVersion===1&&s.story&&Array.isArray(s.story.completed)&&s.story.cursors&&s.story.choices&&Array.isArray(s.story.read)&&Array.isArray(s.story.unlockedCG)&&s.story.flags&&s.character&&s.cultivation&&s.settings&&s.supervision&&Number.isFinite(s.supervision.cursor)&&Array.isArray(s.supervision.intervals)&&Array.isArray(s.supervision.judgements)&&Array.isArray(s.supervision.settled)&&s.supervision.targets&&Array.isArray(s.chronicle)&&Array.isArray(s.mastery)&&Array.isArray(s.chat)&&s.assets&&Array.isArray(s.approvedChapters)&&Array.isArray(s.achievements)&&!!s.baseline}
function unionRows(a=[],b=[]){const m=new Map();for(const x of [...a,...b]){const prev=m.get(x.id);if(!prev||(x.updatedAt||0)>(prev.updatedAt||0)||((x.updatedAt||0)===(prev.updatedAt||0)&&JSON.stringify(x)<JSON.stringify(prev)))m.set(x.id,copy(x))}return [...m.values()].sort((x,y)=>(x.at||0)-(y.at||0)||String(x.id).localeCompare(String(y.id)))}
function merge(a,b){
 if(!validate(a)||!validate(b))throw Error('问道存档无效');const n=migrateLegacySave(a),other=migrateLegacySave(b);
 for(const k of ['chronicle','mastery','chat','messages','chatMemory','memoryTombstones','chatTombstones'])n[k]=unionRows(n[k],other[k]);
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
 n.supervision.settled=unionRows(a.supervision.settled.map(x=>({...x,id:x.id||x.date})),b.supervision.settled.map(x=>({...x,id:x.id||x.date})));
 const acts=n.chronicle.filter(x=>x.kind==='sister').length;n.character.autonomy=Math.max(a.character.autonomy||0,b.character.autonomy||0,acts);n.character.cultivation=Math.max(a.character.cultivation||0,b.character.cultivation||0,acts*3);
 for(const k of ['recovery','interventions'])n.character[k]=Math.max(a.character[k]||0,b.character[k]||0);
 n.cultivation.realm=Math.max(a.cultivation.realm,b.cultivation.realm);return n;
}

root.WendaoEngine={RULES,EVENTS,dueTime,settlementID,migrateLegacySave,recoverDeadline,injuryFor,unionRows,recalculate,proactive,day,dateAt,fresh,baseline,derive,advance,settle,independent,eligible,choose,finish,validate,merge,log,subtract,watchDeadlines,checkDeadlines,untrackedOverdue,confirmMissedDeadline,resolveDeadline,portrait};
})(typeof window!=='undefined'?window:globalThis);
