// Optional, deterministic elaboration of existing engine facts. No storage, AI,
// learning credit, health settlement, new letters, or chapter progression.
const MINUTE=60000,DAY=86400000,PREFIX='life:detail:v1:';
const kinds=new Set(['study','rest','social','pressure']);
const bodies=new Set(['normal','tired','ill','injured']);
const places={study:'study',rest:'bedroom',social:'corridor',pressure:'study'};
const seed=value=>{let n=2166136261;for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
const copy=value=>JSON.parse(JSON.stringify(value));
export function createLifeJournal(E){
  if(!E?.advanceAutonomy||!E?.unionRows)throw new Error('Existing Wendao engine required');
  function enable(s,at){
    if(s.life.detailState)return false;
    if(!Number.isFinite(at)||at<s.createdAt||at<s.life.cursor)throw new Error('Invalid journal start');
    s.life.detailState={version:1,enabledAt:at,cursor:at,hold:null};return true;
  }
  function pauseReason(s){
    const d=s.supervision?.deadlines;
    return s.life.clockPending||d?.clockPending?'clock':s.supervision?.pending||d?.offlinePending||d?.cloudPending?'unverified-state':null;
  }
  function resume(s,at){
    const meta=s.life.detailState;
    if(!meta||meta.version!==1||pauseReason(s)||!Number.isFinite(at)||at<Math.max(s.createdAt,s.life.cursor,meta.cursor))return false;
    meta.cursor=at;meta.hold=null;return true; // Deliberate baseline: never replay the uncertain interval.
  }
  function sources(s){
    const groups=new Map();
    for(const row of s.life.ledger){
      if(!row?.id?.startsWith('life:v4:'))continue;
      const group=groups.get(row.id)||[];group.push(row);groups.set(row.id,group);
    }
    return [...groups.values()].filter(group=>{
      const first=group[0];return kinds.has(first.kind)&&bodies.has(first.bodyState)&&Number.isFinite(first.at)&&first.chapter==='chapter-9-preparation'&&
        group.every(r=>r.at===first.at&&r.kind===first.kind&&r.bodyState===first.bodyState&&r.chapter===first.chapter);
    }).map(group=>group[0]).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
  }
  function rowFor(s,parent,step){
    const offset=(step===0?12:38)+seed(parent.id)%12,at=parent.at+offset*MINUTE;
    const active=(s.supervision.deadlines.punishments||[]).filter(p=>{
      if(!Number.isFinite(p.at)||p.at>at)return false;
      // Later recovery must not make an earlier night retrospectively healthy.
      const historical={...p,recoveryActions:(p.recoveryActions||[]).filter(a=>a.at<=at)};
      if(p.status==='resolved'&&(!Number.isFinite(p.resolvedAt)||p.resolvedAt>at))historical.status='active';
      return E.injuryFor(historical,at).active;
    }).sort((a,b)=>a.id.localeCompare(b.id));
    const body=active.length?'injured':parent.bodyState,weak=body!=='normal';
    const hour=Math.floor((at-E.dateAt(E.day(at)))/3600000),night=hour>=22||hour<6;
    let activity,text,place=places[parent.kind],reason;
    if(weak){
      place='bedroom';reason='health-rest';
      if(parent.kind==='pressure'){
        activity=step?'暂缓处理':'将问询收在手边';
        text=step?'她没有再追着问询想下去，仍留在榻上静养。待精神稍好，再整理那些尚未问清的事。':'先前的问询仍在。温知遥将它收在手边，没有为此起身，也没有勉强自己立即答复。';
      }else{
        const morning=hour>=6&&hour<9;
        activity=step?'继续静养':night?'夜间调息':morning?'晨间温养':'收拢精神';
        text=step?'她将纷杂的念头暂且放下，继续安静休息。未完的功课仍留到身体允许时再续。':night?'夜深了，温知遥仍留在榻上，缓缓平复呼吸。她没有再翻动医书，也没有出门。':morning?'天色渐渐明了。温知遥仍在榻上温养，没有因为天亮便急着起身，手边的事可以晚些再做。':'温知遥依着身体的状况停下琐事，先在榻上歇一会儿，没有勉强起身。';
      }
    }else if(parent.kind==='study'){
      reason='study-followup';activity=step?'夹签收卷':'摘记医理疑问';
      text=step?'她在尚未核实的那一页夹好书签，合上医书。今日留下的问题，等下次研读时再接着看。':'温知遥把刚才读到的两处疑问摘在纸上，又回看原文，没有急着把尚未求证的推测当成结论。';
    }else if(parent.kind==='pressure'){
      reason='existing-inquiry';activity=step?'暂收来函':'整理待答之事';
      text=step?'她把来函与草稿收在一起，暂未寄出答复。该商量的事仍留着，不在这一刻仓促作决定。':'她将先前问询里需要说明的几件事单独列下，先把已知与尚不确定的部分分开。';
    }else if(parent.kind==='social'){
      reason='existing-notes';activity=step?'收好条目':'核对规约摘记';
      text=step?'她收好整理过的条目，留下几处待询的标记。事情尚未解决，也还没有发出新的求援。':'温知遥对照先前整理的规约，把需要请教的地方重新标出，没有添写未经核实的消息。';
    }else{
      reason='rest-followup';activity=step?'安静休息':night?'安顿入睡':'放松片刻';
      text=step?'房里渐渐安静下来。她让手边的事暂且停着，仍按自己的节奏休息。':night?'温知遥放下手边的琐事，掖好被角，让自己慢慢安静下来。今夜不再催着自己做完所有事情。':'她没有急着开始下一件事，只让肩背松下来，留出一段不被功课占满的时间。';
    }
    return {id:PREFIX+parent.id+':'+step,at,kind:'detail',activity,text,location:place,bodyState:body,
      chapter:parent.chapter,detailVersion:1,sourceEventId:parent.id,previousEventId:step?PREFIX+parent.id+':0':parent.id,step,
      cause:{rule:reason,sourceKind:parent.kind,injuryIds:active.map(p=>p.id)},delta:{autonomy:0,cultivation:0,pressure:0}};
  }
  function advance(s,to){
    const meta=s.life.detailState;
    if(!meta){enable(s,to);return {added:[],reason:'baseline-only'};}
    if(meta.version!==1)return {added:[],reason:'unsupported-version'};
    const blocked=pauseReason(s);
    if(blocked||!Number.isFinite(to)||to<meta.cursor||to-meta.cursor>E.RULES.clockForwardLimit){meta.hold=blocked||'clock';return {added:[],reason:meta.hold};}
    if(meta.hold)return {added:[],reason:'resume-required'};
    if(s.life.cursor<to)return {added:[],reason:'source-not-advanced'};
    const parents=sources(s).filter(r=>r.at<=to).slice(-12),known=new Set(s.life.ledger.map(r=>r.id)),added=[];
    const start=Math.max(meta.cursor,to-E.RULES.autonomyBackfillDays*DAY);
    for(let i=0;i<parents.length;i++){
      const parent=parents[i];if(parent.at<meta.enabledAt)continue;
      const prior=parents[i-1];
      // Rest continues across midnight; do not manufacture another identical chain an hour later.
      if(parent.kind==='rest'&&prior?.kind==='rest'&&parent.bodyState===prior.bodyState&&parent.at-prior.at<90*MINUTE)continue;
      for(let step=0;step<2;step++){
        const row=rowFor(s,parent,step),next=parents[i+1];
        if(row.at<=start||row.at>to||next&&row.at>=next.at||known.has(row.id)||!known.has(row.previousEventId))continue;
        // Keep a bounded catch-up per call. The latest retained source rows are authoritative.
        if(added.length>=24)break;
        added.push(row);known.add(row.id);
      }
    }
    s.life.ledger=E.unionRows(s.life.ledger,added);
    for(const row of added)E.log(s,row.id,'姐姐的日常 · '+row.activity,row.text,row.at,'life-detail');
    meta.cursor=to;return {added,reason:added.length?'recorded':'no-new-events'};
  }
  function reconcile(s){
    const ordered=sources(s),parents=new Map(ordered.map((r,i)=>[r.id,{row:r,next:ordered[i+1]}]));
    s.life.ledger=s.life.ledger.map(row=>{
      if(row.detailVersion!==1||!row.id.startsWith(PREFIX))return row;
      const source=parents.get(row.sourceEventId),parent=source?.row,next=parent&&[0,1].includes(row.step)?rowFor(s,parent,row.step):null;
      if(next&&next.id===row.id&&next.at===row.at&&(!source.next||row.at<source.next.at))return next;
      return {...row,status:'unresolved',text:'这条日常的来源尚未核对，暂不作为已发生的记录。',delta:{autonomy:0,cultivation:0,pressure:0}};
    });
    for(const row of s.life.ledger.filter(r=>r.detailVersion===1)){
      const note=s.chronicle.find(x=>x.id===row.id);if(note){note.text=row.text;note.title='姐姐的日常 · '+row.activity;}
    }
    return s;
  }
  function merge(a,b){
    const out=E.merge(a,b),metas=[a.life.detailState,b.life.detailState].filter(x=>x?.version===1);
    if(metas.length)out.life.detailState={version:1,enabledAt:Math.min(...metas.map(x=>x.enabledAt)),cursor:Math.max(...metas.map(x=>x.cursor)),hold:metas.some(x=>x.hold)?'merged-hold':null};
    return reconcile(out);
  }
  function timeline(s,{from=-Infinity,to=Infinity}={}){
    return E.unionRows(s.life.ledger).filter(r=>Number.isFinite(r.at)&&r.at>=from&&r.at<=to&&r.status!=='unresolved').map(copy);
  }
  return Object.freeze({enable,advance,resume,reconcile,merge,timeline});
}
