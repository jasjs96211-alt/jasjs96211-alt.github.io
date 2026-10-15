/* Local deterministic rules. Fictional state is never writable by the chat provider. */
(function(root){
'use strict';
const TZ='Asia/Shanghai',DAY=86400000;
const day=t=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
const dateAt=d=>Date.parse(d+'T00:00:00+08:00');
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const copy=x=>JSON.parse(JSON.stringify(x));
const fresh=(now=Date.now())=>({schemaVersion:1,createdAt:now,revision:0,settings:{strict:true,sleepStart:'23:00',sleepEnd:'08:00',target:180,minStudy:5,dailyCap:480,chatEndpoint:'http://127.0.0.1:8787/api/chat',chatMode:'mixed',sensitive:false},story:{current:'opening',cursors:{},completed:[],choices:{},read:[],unlockedCG:[],flags:{allowPurification:true,allowIllness:true}},character:{health:78,fatigue:22,realm:3,autonomy:0,cultivation:0,recovery:0,interventions:0,activity:'整理功课，安排自己的研习',bond:'彼此守护'},cultivation:{xp:0,realm:0,readiness:0,protection:0},supervision:{mode:'exempt',cursor:now,idle:0,judgements:[],settled:[],intervals:[],observed:[],targets:{},pending:null},chronicle:[],mastery:[],chat:[],messages:[],assets:{},approvedChapters:[],outline:'',achievements:[],baseline:{},seenStudy:[],lastDate:day(now)});
function log(s,id,title,text,at=Date.now(),kind='system') {if(s.chronicle.some(x=>x.id===id))return false;s.chronicle.push({id,title,text,at,kind});return true}
function baseline(s,study){s.baseline={sessions:(study.sessions||[]).map(x=>x.id),tasks:(study.events||[]).filter(x=>x.done).map(x=>x.id)};return s}
function derive(s,study,now=Date.now()){
 s.seenStudy??=[];
 for(const row of study.sessions||[]){if(s.baseline.sessions?.includes(row.id)||s.seenStudy.includes(row.id))continue;s.seenStudy.push(row.id);if(row.date===day(now)&&row.minutes>=s.settings.minStudy){s.supervision.idle=0;log(s,'study:'+row.id,'有效修炼',`${row.subject} · ${row.minutes}分钟（真实记录/补录）`,now,'study')}}

 let xp=0,minutes=0;const totals={};
 const rows=(study.sessions||[]).filter(x=>!s.baseline.sessions?.includes(x.id)&&x.date<=day(now));
 for(const r of rows){const n=Math.max(0,Math.min(Number(r.minutes)||0,s.settings.dailyCap-(totals[r.date]||0)));totals[r.date]=(totals[r.date]||0)+n;xp+=n;minutes+=n}
 const done=(study.events||[]).filter(x=>x.done&&x.completedAt&&!s.baseline.tasks?.includes(x.id));xp+=done.length*12;
 for(const m of s.mastery)xp+=({recall:15,dictation:25,review:30}[m.level]||0);
 s.cultivation={xp:Math.round(xp),realm:s.cultivation.realm,readiness:clamp(Math.floor(xp/15)),protection:clamp(Math.floor(xp/30))};
 const bad=s.supervision.judgements.length+s.supervision.settled.filter(x=>!x.met).length;
 const relief=Math.floor(minutes/60)+s.character.autonomy+(s.character.interventions||0)*3;
 s.character.familyPressure=clamp(20+bad*8-relief*2);
 const strain=s.supervision.judgements.reduce((n,x)=>n+({warning:0,fatigue:3,penalty:5,purification:8,illness:10}[x.result]||0),0);s.character.health=clamp(78-strain+Math.floor(minutes/120)+(s.character.recovery||0),35,100);s.character.fatigue=clamp(100-s.character.health);
 s.character.purificationBurden=Math.max(0,12+s.supervision.judgements.filter(x=>x.result==='purification').length*8-Math.floor((s.character.recovery||0)/2));
 const achievements=[['first-study','第一卷功课',rows.length>0],['dictation','落笔有据',s.mastery.some(x=>x.level==='dictation')],['review','温故',s.mastery.some(x=>x.level==='review')],['opening','灯下同心',s.story.completed.includes('opening')],['hour','积微成著',minutes>=60]];
 for(const [id,title,ok] of achievements)if(ok&&!s.achievements.includes(id)){s.achievements.push(id);log(s,'achievement:'+id,title,'条件已达成；来源见学习记录或章节选择。',now,'achievement')}
 return s;
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
  for(let d=dateAt(day(a));d<b;d+=DAY)w.targets[day(d)]??={minutes:s.settings.target,strict:true};
  const intervals=subtract(a,b,evidence);
  let cursor=a;
  for(const [u,v] of intervals){if(u>cursor)w.idle=0;w.idle+=(v-u)/60000;cursor=v;
   while(w.idle>=120){w.idle-=120;if(budget--<=0)continue;
    const judgementAt=v-w.idle*60000;const id='idle:'+Math.floor(judgementAt);
    const pressure=(s.character.familyPressure||0)+8;
    const seed=Array.from(id).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7)%100;
    // Major scenes are gated by imported, explicitly approved canon flags.
    let result='warning';if(pressure>=24&&seed<50)result='fatigue';if(pressure>=40&&seed<25)result='penalty';
    const severe=w.judgements.filter(x=>['purification','illness'].includes(x.result));
    const cooldown=!severe.length||judgementAt-severe.at(-1).at>3*DAY;
    if(cooldown&&pressure>=64&&s.story.flags.allowPurification&&seed<8)result='purification';
    if(cooldown&&s.character.purificationBurden>=24&&s.story.flags.allowIllness&&seed<5)result='illness';
    w.judgements.push({id,at:judgementAt,result});log(s,id,'温家压力判定',{warning:'温家催促增加。',fatigue:'准备期的劳顿加重，需要争取休养。',penalty:'温家追加差事与责罚，姐姐需要休养；仍可查验规约、积累证据和争取外部支持。',purification:'原大纲允许的净化召令已触发。',illness:'累积劳损触发病情节点；恢复与反抗选项仍然开放。'}[result]+' 清醒无有效学习累计120分钟。',judgementAt,'risk');
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
 w.settled.push({date:d,minutes,target:active.minutes,met});log(s,'daily:'+d,'修炼日结',`${d}：${minutes}/${active.minutes}分钟。${met?'目标达成或已豁免。':'准备不足，温家压力上升；可以通过后续行动恢复。'}`,now,met?'study':'risk');return true;
}
function independent(s,d,now=Date.now()) {const id='sister:'+d;if(s.chronicle.some(x=>x.id===id))return false;s.character.autonomy+=1;s.character.cultivation+=3;const actions=[['研读医理与经脉图','温知遥整理经脉旧伤的记录，给自己的研习留下了笔记。'],['查阅净灵殿传召记录','温知遥核对传召与休养间隔，准备同妹妹商量可行的应对。'],['温养灵息、练习水法','温知遥自行安排了限量修炼，疲劳时便停下来休息。'],['整理药草与功课','温知遥辨认药草、记下医理疑问，没有把自己的一天全耗在等待里。'],['研读学宫规约','温知遥把关于求学的疑问写在纸上，留待与妹妹一起求证。']];const a=actions[s.character.autonomy%actions.length];s.character.activity=a[0];log(s,id,'姐姐的独立行动',a[1],now,'sister');return true} 
function proactive(s,study,now=Date.now()){
 s.messages??=[];const d=day(now),used=s.messages.filter(x=>day(x.at)===d).length;if(used>=2)return;
 const total=(study.sessions||[]).filter(x=>x.date===d).reduce((a,x)=>a+x.minutes,0);
 let id,text;if(total>=120){id='message:study:'+d;text='今日功课做得这般认真。先让眼睛歇一歇吧。我也把自己的研习记下了，等会儿我们交换着说说。'}else if(s.chronicle.some(x=>x.id==='sister:'+d)){id='message:care:'+d;text='无缺，我今日也有自己的功课。你安心读书，累了记得歇一歇；我也会照顾好自己。'}
 if(id&&!s.messages.some(x=>x.id===id)){s.messages.push({id,text,at:now,read:false,source:'event'});log(s,id,'姐姐来信',text,now,'message')}
}

function eligible(s,c,study,now=Date.now()) {const r=c.requires||{};return (!r.date||day(now)>=r.date)&&(!r.xp||s.cultivation.xp>=r.xp)&&(!r.realm||s.cultivation.realm>=r.realm)&&(!r.health||s.character.health>=r.health)&&(!r.pressure||s.character.familyPressure>=r.pressure)&&(!r.previous||r.previous.every(x=>s.story.completed.includes(x)))&&(!r.choice||s.story.choices[r.choice.key]===r.choice.value)&&(!r.autonomy||s.character.autonomy>=r.autonomy)}
function choose(s,chapter,node,option,now=Date.now()) {const key=chapter+':'+node;if(s.story.choices[key])return false;s.story.choices[key]=option.id;log(s,'choice:'+key,'剧情选择',option.label,now,'choice');return true}
function finish(s,id,now=Date.now()){if(s.story.completed.includes(id))return false;s.story.completed.push(id);log(s,'chapter:'+id,'章节完成',id==='opening'?'《灯下问道》试读篇已读。':id,now,'chapter');return true}
function validate(s){return !!s&&s.schemaVersion===1&&s.story&&Array.isArray(s.story.completed)&&s.story.cursors&&s.story.choices&&Array.isArray(s.story.read)&&Array.isArray(s.story.unlockedCG)&&s.story.flags&&s.character&&s.cultivation&&s.settings&&s.supervision&&Number.isFinite(s.supervision.cursor)&&Array.isArray(s.supervision.intervals)&&Array.isArray(s.supervision.judgements)&&Array.isArray(s.supervision.settled)&&s.supervision.targets&&Array.isArray(s.chronicle)&&Array.isArray(s.mastery)&&Array.isArray(s.chat)&&s.assets&&Array.isArray(s.approvedChapters)&&Array.isArray(s.achievements)&&!!s.baseline}
function merge(a,b){if(!validate(a)||!validate(b))throw Error('问道存档无效');const n=copy(a);for(const k of ['chronicle','mastery','chat']){const ids=new Set(n[k].map(x=>x.id));for(const row of b[k])if(!ids.has(row.id)){n[k].push(row);ids.add(row.id)}}for(const k of ['completed','unlockedCG'])n.story[k]=[...new Set([...a.story[k],...b.story[k]])];const read=new Map([...a.story.read,...b.story.read].map(x=>[typeof x==='object'?x.id:x,x]));n.story.read=[...read.values()];for(const [k,v]of Object.entries(b.story.choices))if(!n.story.choices[k])n.story.choices[k]=v;return n}
root.WendaoEngine={recalculate,proactive,day,dateAt,fresh,baseline,derive,advance,settle,independent,eligible,choose,finish,validate,merge,log,subtract};
})(typeof window!=='undefined'?window:globalThis);
