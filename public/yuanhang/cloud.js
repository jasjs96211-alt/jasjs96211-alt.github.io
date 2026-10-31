/* Opt-in account sync. No credentials in exports or URLs; no background guarantees. */
'use strict';
const YuanhangCloud = (()=>{
 const ORIGIN='https://myejuodrhgdxphdkrvsa.supabase.co';
 const KEY='sb_publishable_PDlkk1ZY9WUH78qzPoJiFQ_kGiIYFr7';
 const normalize=x=>Array.isArray(x)?x.map(normalize):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalize(x[k])])):x;
 const equal=(a,b)=>JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
 const payload=s=>({events:s.events,sessions:s.sessions,screen:s.screen,usageSessions:s.usageSessions||[],...(s.wendao?{wendao:s.wendao}:{})});
 const cleanWendao=w=>{
  if(!w)return null;
  // Derivation below mutates nested story state. Work on an owned snapshot so
  // a failed merge never changes the original local/base/remote backup.
  const next=JSON.parse(JSON.stringify(w));next.revision=0;
  const deadlines=next.supervision?.deadlines;
  if(deadlines){
   const clean={...deadlines};
   for(const k of ['offlinePending','cloudPending','lastCheck','pending','clockPending'])delete clean[k];
   next.supervision={...next.supervision,deadlines:clean};
  }
  if(next.life)delete next.life.clockPending;if(next.rhythmState)delete next.rhythmState.napUntil;
  return next;
 };
 function pendingChanges(base,local){
  if(!base)return null;
  let count=0;
  for(const field of ['events','sessions','usageSessions','screen']){
   const map=s=>new Map(field==='screen'?Object.entries(s[field]||{}):(s[field]||[]).map(x=>[x.id,x]));
   const b=map(base),l=map(local);
   for(const id of new Set([...b.keys(),...l.keys()]))if(!equal(b.get(id),l.get(id)))count++;
  }
  // Story fields are groups, not individual chat messages; never expose their contents.
  const b=cleanWendao(base.wendao)||{},l=cleanWendao(local.wendao)||{};
  for(const k of new Set([...Object.keys(b),...Object.keys(l)]))if(!equal(b[k],l[k]))count++;
  return count;
 }
 function mergeWendao(base,local,remote,conflicts){
  const E=typeof window!=='undefined'?window.WendaoEngine:null;if(!E){conflicts.push({field:'wendao',id:'engine-unavailable'});return local}
  const n=(window.WendaoLifeJournal?.merge?window.WendaoLifeJournal.merge(local,remote):E.merge(local,remote)),b=base||{};
  // Derived values, device timers and monotone ledgers do not conflict. Decisions do.
  function pick(bv,lv,rv,path){
   if(equal(lv,rv))return lv;if(equal(lv,bv))return rv;if(equal(rv,bv))return lv;
   if(lv&&rv&&!Array.isArray(lv)&&!Array.isArray(rv)&&typeof lv==='object'&&typeof rv==='object'){
    const v={};for(const k of new Set([...Object.keys(bv||{}),...Object.keys(lv),...Object.keys(rv)])){const x=pick(bv?.[k],lv[k],rv[k],path+'.'+k);if(x!==undefined)v[k]=x}return v;
   }
   conflicts.push({field:'wendao',id:path});return lv;
  }
  n.settings=pick(b.settings,local.settings,remote.settings,'settings');
  for(const k of ['choices','flags','cursors'])n.story[k]=pick(b.story?.[k],local.story[k],remote.story[k],'story.'+k);
  for(const k of ['outline','approvedChapters','baseline'])n[k]=pick(b[k],local[k],remote[k],k);
  n.supervision.targets=pick(b.supervision?.targets,local.supervision.targets,remote.supervision.targets,'targets');
  if(n.rhythmState)n.rhythmState.temporarySleep=pick(b.rhythmState?.temporarySleep??null,local.rhythmState?.temporarySleep??null,remote.rhythmState?.temporarySleep??null,'rhythmState.temporarySleep');
  // Rest/observed logs have stable interval keys and are kept for audit/recalculation.
  for(const k of ['intervals','observed']){const rows=[...(local.supervision[k]||[]),...(remote.supervision[k]||[])];n.supervision[k]=[...new Map(rows.map(x=>[JSON.stringify(x),x])).values()].sort((a,b)=>a.start-b.start)}
  n.revision=0;return n;
 }
 function reconcile(base,local,remote){
  const out={},conflicts=[];
  for(const field of ['events','sessions','usageSessions','screen']){
   const map=s=>new Map(field==='screen'?Object.entries(s[field]||{}):(s[field]||[]).map(x=>[x.id,x]));
   const b=map(base),l=map(local),r=map(remote),result=[];
   for(const id of new Set([...b.keys(),...l.keys(),...r.keys()])){
    const bv=b.get(id),lv=l.get(id),rv=r.get(id);let value;
    if(equal(lv,rv))value=lv;else if(equal(lv,bv))value=rv;else if(equal(rv,bv))value=lv;
    else{conflicts.push({field,id});value=lv}
    if(value!==undefined)result.push([id,value]);
   }
   out[field]=field==='screen'?Object.fromEntries(result):result.map(x=>x[1]);
  }
  const bw=cleanWendao(base.wendao),lw=cleanWendao(local.wendao),rw=cleanWendao(remote.wendao);
  if(lw&&rw&&typeof window!=='undefined'&&window.WendaoEngine)out.wendao=mergeWendao(bw,lw,rw,conflicts);
  else if(equal(lw,rw))out.wendao=lw||undefined;
  else if(equal(lw,bw))out.wendao=rw||undefined;
  else if(equal(rw,bw))out.wendao=lw||undefined;
  else if(lw&&rw){out.wendao=mergeWendao(bw,lw,rw,conflicts)}
  else{conflicts.push({field:'wendao',id:'story-state'});out.wendao=lw||undefined}
  if(out.wendao&&typeof window!=='undefined'&&window.WendaoEngine)window.WendaoEngine.derive(out.wendao,out,Math.max(local.wendao?.supervision?.deadlines?.lastCheck||0,remote.wendao?.supervision?.deadlines?.lastCheck||0,Date.now()));
  if(out.wendao&&typeof window!=='undefined')window.WendaoLifeJournal?.reconcile?.(out.wendao);
   if(out.wendao)out.wendao=cleanWendao(out.wendao); // Engine derives device-only deadline review state; never cloud-store it.
  return {data:out,conflicts};
 }

 // Conflict choices affect only disputed fields. The injury ledger, memories and
 // distinct study records are still merged by reconcile/WendaoEngine.merge.
 const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const forbidden=new Set(['__proto__','prototype','constructor']);
 function pathForConflict(c){
  const parts=String(c.id).split('.');
  if(parts.some(x=>!x||forbidden.has(x)))throw Error('发现不安全的冲突路径');
  const [root,second]=parts;
  const allowed=(root==='settings'&&parts.length>=2)||
   (root==='story'&&['choices','flags','cursors'].includes(second)&&parts.length>=3)||
   (['outline','approvedChapters'].includes(root)&&parts.length===1)||
   (root==='baseline'&&parts.length>=1)||
   (root==='targets'&&parts.length>=2)||(root==='rhythmState'&&second==='temporarySleep'&&parts.length>=2);
  if(!allowed)throw Error('此问道冲突不能自动处理，请保留备份交由维护者核对：'+String(c.id).slice(0,100));
  if(root==='story'&&['choices','cursors'].includes(second)&&parts.length>3)return ['story',second,parts.slice(2).join('.')];
  return root==='targets'?['supervision',...parts]:parts;
 }
 function conflictValue(data,c){
  if(!data)return undefined;
  if(c.field==='wendao'){
   let target=data.wendao;
   for(const key of pathForConflict(c))target=target?.[key];
   return target;
  }
  if(c.field==='screen')return data.screen?.[c.id];
  if(!['events','sessions','usageSessions'].includes(c.field))throw Error('未知的云端冲突类型');
  return (data[c.field]||[]).find(x=>x.id===c.id);
 }
 function resolveConflicts(result,local,remote,choices){
  if(!Array.isArray(choices)||choices.length!==result.conflicts.length)throw Error('请逐项核对所有冲突');
  const next=copy(result.data);
  for(let i=0;i<result.conflicts.length;i++){
   const c=result.conflicts[i],selected=choices[i];
   if(!['local','remote'].includes(selected))throw Error('请逐项选择本入口或云端版本');
   const value=copy(conflictValue(selected==='local'?local:remote,c));
   if(c.field==='wendao'){
    let target=next.wendao,parts=pathForConflict(c);
    for(let j=0;j<parts.length-1;j++){
     const key=parts[j];if(!target[key]||typeof target[key]!=='object')target[key]={};
     target=target[key];
    }
    const key=parts.at(-1);if(value===undefined)delete target[key];else target[key]=value;
   }else if(c.field==='screen'){
    if(forbidden.has(String(c.id)))throw Error('不安全的屏幕日期');
    if(value===undefined)delete next.screen[c.id];else next.screen[c.id]=value;
   }else{
    const rows=next[c.field]||[],idx=rows.findIndex(x=>x.id===c.id);
    if(idx>=0)rows.splice(idx,1);
    if(value!==undefined)rows.push(value);
    next[c.field]=rows;
   }
  }
  if(next.wendao){
   const E=typeof window!=='undefined'?window.WendaoEngine:null;
   if(!E||!E.validate(next.wendao))throw Error('问道合并结果无效，未覆盖原始存档');
   E.derive(next.wendao,next,Date.now());
   next.wendao=cleanWendao(next.wendao);
   if(!E.validate(next.wendao))throw Error('问道合并校验失败，未覆盖原始存档');
  }
  return next;
 }
 function verification(input,email){
  const value=input.trim();
  if(/^\d{6,8}$/.test(value))return {email,token:value,type:'email'};
  let url;try{url=new URL(value)}catch{throw Error('请粘贴邮件中登录按钮的完整链接，或输入验证码。')}
  const token=url.searchParams.get('token_hash')||url.searchParams.get('token'),type=url.searchParams.get('type');
  if(url.origin!==ORIGIN||url.pathname!=='/auth/v1/verify'||!token||!['magiclink','signup','email'].includes(type))throw Error('这不是本项目的邮箱登录链接。请长按邮件中的登录按钮，复制链接，不要先打开。');
  return {token_hash:token,type};
 }
 function api(fetcher=fetch){
  return async(path,{method='GET',body,token,prefer}={})=>{
   const response=await fetcher(ORIGIN+path,{method,headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
   let data;try{data=await response.json()}catch{data=null}
   if(!response.ok){const error=Error(response.status===429?'发送或请求过于频繁，请稍后重试。':response.status===401?'登录已过期，请重新登录。':response.status>=500?'云端暂时不可用，请稍后重试。':`云端请求失败（${response.status}），请检查登录或数据表权限。`);error.status=response.status;throw error}
   return data;
  };
 }
 return {payload,equal,reconcile,verification,api,pendingChanges,conflictValue,resolveConflicts};
})();
function startYuanhangCloud(){
 const META='yuanhang_account_sync_v1',request=YuanhangCloud.api();
 let cfg={},busy=false,epoch=0,debounce;
 let deadlineReady=!cfg.enabled;
 window.YuanhangAccount={deadlineReady:()=>!cfg.enabled||deadlineReady,token:async()=>{await authorized('/auth/v1/user');return cfg.session.access_token},diagnostics};
 try{cfg=JSON.parse(localStorage.getItem(META)||'{}')}catch{}
 const say=message=>{$('accountStatus').textContent=message};
 const persist=()=>localStorage.setItem(META,JSON.stringify(cfg));
 const read=()=>{const s=latestUsageState();if(!validBackup(s))throw Error('本地数据无效，请先导出备份。');const w=window.Wendao?.cloudRead?.();return YuanhangCloud.payload({...s,...(w?{wendao:w}:{})})};
 function diagnostics(){
  let pendingChanges=null;try{pendingChanges=YuanhangCloud.pendingChanges(cfg.base,read())}catch{}
  return {origin:location.origin||'本地文件',enabled:!!cfg.enabled,signedIn:!!cfg.session,pendingChanges,conflictCount:cfg.conflictCount||0,lastReadAt:cfg.lastReadAt||null,lastWriteAt:cfg.lastWriteAt||null,lastSyncAt:cfg.lastSyncAt||null,revision:cfg.revision||null,lastError:cfg.lastError||null,clientVersion:'2026-10-16-r3'};
 }
 function controls(){
  $('accountIdentity').textContent=cfg.session?.user?.email?`已登录：${cfg.session.user.email}`:'尚未登录';
  $('accountEnable').disabled=busy||!cfg.session||cfg.enabled;
  $('accountSyncNow').disabled=busy||!cfg.enabled;
  $('accountSyncNow').textContent=busy?'同步中…':'立即同步';
  $('accountLogout').disabled=busy||!cfg.session;
  $('accountBadge').textContent=cfg.enabled?'自动同步已开启':cfg.session?'已登录 · 待开启':'未开启云同步';
  $('accountConflictActions').hidden=!(cfg.conflictCount>0);
  $('accountReviewConflicts').textContent='逐项核对 '+(cfg.conflictCount||0)+' 项冲突（不直接覆盖）';
  const d=diagnostics(),time=x=>x?new Date(x).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}):'暂无成功记录';
  $('accountDiagnostics').textContent=`同步程序：2026-10-16 R3。上次读取：${time(d.lastReadAt)}；上次上传：${time(d.lastWriteAt)}；上次完整同步：${time(d.lastSyncAt)}。待同步变更：${d.pendingChanges===null?'尚未建立基准':d.pendingChanges}；待处理冲突：${d.conflictCount}。${d.lastError?' 最近失败：'+d.lastError:''}`;
 }

 // The snapshot is private to this browser. Only human-approved disputed fields
 // are selected; all independent records and the monotone DDL ledger are merged.
 function showConflictReview(){
  const panel=$('accountConflictPanel');let snap;
  try{
   snap=JSON.parse(localStorage.getItem(STORAGE+'_cloud_conflict_snapshot')||'null');
   if(!snap||!Array.isArray(snap.conflicts)||!snap.conflicts.length||!snap.local||!snap.remote||!snap.base)throw Error('没有可供核对的冲突快照，请点击立即同步后再试');
  }catch(err){say('无法打开核对面板：'+err.message);return}
  const element=(tag,value)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=value;return node};
  const kinds={events:'任务／DDL',sessions:'学习记录',usageSessions:'游戏记录',screen:'屏幕时间',wendao:'问道剧情决定'};
  panel.replaceChildren();panel.hidden=false;
  panel.append(element('h3','逐项核对 '+snap.conflicts.length+' 项云同步冲突'));
  panel.append(element('p','左侧“本入口”指当前 Safari（或正在使用的入口）；“云端”是其他入口已上传的版本。所有无冲突记录自动合并，温知遥的DDL伤病、聊天与纪事账本继续取双方并集；这四项必须由你决定，不会默默覆盖。'));
  const selects=[];
  for(let i=0;i<snap.conflicts.length;i++){
   const c=snap.conflicts[i];let local,remote;
   try{
    local=YuanhangCloud.conflictValue(snap.local,c);
    remote=YuanhangCloud.conflictValue(snap.remote,c);
   }catch(err){
    panel.append(element('p','第 '+(i+1)+' 项需要人工维护：'+err.message));
    return;
   }
   const preview=(value)=>{
    if(value===undefined)return '(此入口没有这条记录，可能已删除)';
    const output=JSON.stringify(value,null,2)||String(value);
    return output.length>16000?output.slice(0,16000)+'\n…内容过长，请核对导出的完整备份':output;
   };
   const summary=(v)=>v?.title||v?.subject||v?.app||String(c.id);
   const row=element('div');row.className='card';row.style.margin='12px 0';row.style.padding='14px';
   row.append(element('h4',(i+1)+' / '+snap.conflicts.length+' · '+(kinds[c.field]||c.field)+' · '+String(summary(local||remote)).slice(0,120)));
   row.append(element('p','冲突位置：'+String(c.id).slice(0,180)));
   const select=element('select');select.style.width='100%';select.style.minHeight='44px';
   for(const [value,title] of [['','请明确选择保留哪一端的这项记录'],['local','保留本入口（当前手机）'],['remote','保留云端（另一入口已上传）']]){
    const opt=element('option',title);opt.value=value;select.append(opt);
   }
   row.append(select);selects.push(select);
   const details=element('details');details.style.marginTop='10px';
   details.append(element('summary','展开比较这项记录的具体内容'));
   for(const [title,value] of [['本入口原记录',local],['云端原记录',remote]]){
    details.append(element('strong',title));
    const pre=element('pre',preview(value));pre.style.whiteSpace='pre-wrap';pre.style.overflowWrap='anywhere';pre.style.maxHeight='240px';pre.style.overflow='auto';pre.style.fontSize='12px';
    details.append(pre);
   }
   row.append(details);panel.append(row);
  }
  panel.append(element('p','确认后系统会再次核对云端与本地是否发生新变化；如版本已改变，将拒绝覆盖并要求重新核对。原始备份和冲突快照不会被清除。'));
  const actions=element('div');actions.className='usage-actions';
  const submit=element('button','确认选择并安全合并');submit.className='btn btn-primary';
  const cancel=element('button','暂不处理');cancel.className='btn';
  submit.onclick=async()=>{
   const selected=selects.map(x=>x.value);
   if(selected.some(x=>!x))return say('请为每一项冲突选择本入口或云端版本，未选择时不会修改数据');
   if(!confirm('确认按这 '+selected.length+' 项选择合并？所有独立记录与既有DDL伤病账本都会保留；若上传期间数据变化则停止，不会强制覆盖。'))return;
   submit.disabled=true;
   try{if(await lockedWork(false,selected,snap)){panel.hidden=true;panel.replaceChildren();}}
   finally{submit.disabled=false}
  };
  cancel.onclick=()=>{panel.hidden=true;panel.replaceChildren();say('核对已取消，云端和本地存档均未覆盖。')};
  actions.append(submit,cancel);panel.append(actions);panel.scrollIntoView?.({block:'nearest'});
 }

 async function authorized(path,options={}){
  if(!cfg.session)throw Error('请先登录。');
  const generation=epoch;
  if(!cfg.session.expires_at||cfg.session.expires_at*1000<Date.now()+60000){
   const s=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:cfg.session.refresh_token}});
   if(generation!==epoch)throw Error('登录状态已改变，请重试。');
   if(!s?.access_token||s.user?.id!==cfg.session.user.id)throw Error('登录返回异常，请重新登录。');
   s.expires_at=s.expires_at||Math.floor(Date.now()/1000)+(s.expires_in||3600);cfg.session=s;persist();
  }
  const result=await request(path,{...options,token:cfg.session.access_token});
  if(generation!==epoch)throw Error('同步已停止。');return result;
 }
 async function remote(){
  const rows=await authorized('/rest/v1/workbench_state?select=revision,payload&user_id=eq.'+encodeURIComponent(cfg.session.user.id)+'&limit=1');
  if(!Array.isArray(rows))throw Error('云端数据返回异常。');
  const row=rows[0];if(row&&(!validBackup(row.payload)||row.payload.wendao&&!window.WendaoEngine?.validate(row.payload.wendao)||!Number.isSafeInteger(row.revision)||row.revision<1))throw Error('云端备份格式异常，未修改本地。');
  cfg.lastReadAt=new Date().toISOString();cfg.revision=row?.revision||null;
  return row?{revision:row.revision,data:YuanhangCloud.payload(row.payload)}:null;
 }
 async function upload(data,row){
  const filter=row?'&user_id=eq.'+encodeURIComponent(cfg.session.user.id)+'&revision=eq.'+row.revision:'';
  const revision=row?row.revision+1:1;
  const result=await authorized('/rest/v1/workbench_state?select=revision'+filter,{method:row?'PATCH':'POST',prefer:'return=representation',body:row?{payload:data,revision,updated_at:new Date().toISOString()}:{user_id:cfg.session.user.id,payload:data,revision}});
  if(!Array.isArray(result)||result.length!==1||result[0].revision!==revision)throw Error('另一入口刚更新了云端，请点击立即同步重试。');
  cfg.lastWriteAt=new Date().toISOString();
  cfg.revision=revision;
 }
 function apply(data){
  if(!validBackup(data))throw Error('合并后数据超过限制或格式无效。');
  const latest=latestUsageState();
  if(YuanhangCloud.equal(read(),data))return;
  const wdKey='yuanhang_wendao_v1',priorWD=localStorage.getItem(wdKey),priorStudy=localStorage.getItem(STORAGE);
  localStorage.setItem(STORAGE+'_before_cloud',JSON.stringify({...latest,...(priorWD?{wendao:JSON.parse(priorWD)}:{})}));
  try{
   const next={...latest,...data};delete next.wendao;
   localStorage.setItem(STORAGE,JSON.stringify(next));state=next;
   if(data.wendao)window.Wendao?.cloudApply?.(data.wendao);
   clearUsagePreview();resetBackupMerge();restoreTimer();render();window.Wendao?.sync?.();
  }catch(err){
   if(priorStudy!==null)localStorage.setItem(STORAGE,priorStudy);else localStorage.removeItem(STORAGE);state=latest;
   if(priorWD!==null)localStorage.setItem(wdKey,priorWD);else localStorage.removeItem(wdKey);
   window.Wendao?.reloadLocal?.();
   throw err;
  }
 }
 async function work(first=false,resolutions=null,reviewSnapshot=null){
  if(busy||!cfg.session||(!first&&!cfg.enabled)||document.hidden)return false;
  busy=true;controls();say('正在读取云端并核对本地存档，可能需要20秒，请等待结果。');
  try{
   // Capture local state *after* the network read. Time-tracking and story autosaves may change it while awaiting Supabase.
   const row=await remote(),local=read();let next;say('云端读取成功，正在核对问道存档、DDL账本及同步冲突…');
   if(first){
    const plan=row?($('accountFirstConflict').value==='local'?backupMergePlan(local,row.data):backupMergePlan(row.data,local)):{next:local,conflicts:0,total:0};
    if(!confirm(`开启此邮箱的自动同步？将把任务、学习、屏幕记录及问道剧情/聊天上传到你的 Supabase 账户（不含自定义图片）。首次补入云端缺少的记录，${plan.conflicts} 项冲突保留${$('accountFirstConflict').value==='local'?'本入口':'云端'}版本。正在进行的计时仅留在本入口。`))return;
    next=YuanhangCloud.payload(plan.next);
    const lw=local.wendao,rw=row?.data.wendao;
    if(lw&&rw){
     const localFirst=$('accountFirstConflict').value==='local';
     next.wendao=(window.WendaoLifeJournal?.merge||window.WendaoEngine.merge)(localFirst?lw:rw,localFirst?rw:lw);next.wendao.revision=0;
    }else if(lw||rw)next.wendao=lw||rw;
   }else{
    if(!cfg.base||!validBackup(cfg.base))throw Error('缺少同步基准，请停止同步后重新登录开启。');
    if(!row)throw Error('云端记录已不存在，已暂停本次同步，请检查账户。');
    const result=YuanhangCloud.reconcile(cfg.base,local,row.data);
    if(resolutions){
     if(!reviewSnapshot||!Array.isArray(reviewSnapshot.conflicts)||!YuanhangCloud.equal(cfg.base,reviewSnapshot.base))throw Error('同步基准已变化，请先重新核对冲突');
     const keys=xs=>xs.map(x=>x.field+'|'+x.id).sort();
     if(!YuanhangCloud.equal(keys(result.conflicts),keys(reviewSnapshot.conflicts))||reviewSnapshot.revision&&reviewSnapshot.revision!==row.revision)throw Error('云端冲突清单或版本已改变，请重新点击立即同步、再核对');
     for(const c of result.conflicts){
      const beforeLocal=YuanhangCloud.conflictValue(reviewSnapshot.local,c),beforeRemote=YuanhangCloud.conflictValue(reviewSnapshot.remote,c);
      if(!YuanhangCloud.equal(beforeLocal,YuanhangCloud.conflictValue(local,c))||!YuanhangCloud.equal(beforeRemote,YuanhangCloud.conflictValue(row.data,c)))throw Error('核对期间某条冲突记录发生变化，请重新点击立即同步核对');
     }
     next=YuanhangCloud.resolveConflicts(result,local,row.data,result.conflicts.map(c=>resolutions[reviewSnapshot.conflicts.findIndex(x=>x.field===c.field&&x.id===c.id)]));
    }else if(result.conflicts.length){
     cfg.conflictCount=result.conflicts.length;
     localStorage.setItem(STORAGE+'_cloud_conflict_snapshot',JSON.stringify({at:new Date().toISOString(),revision:row.revision,base:cfg.base,local,remote:row.data,conflicts:result.conflicts}));
     throw Error('有 '+result.conflicts.length+' 项两边都修改过的记录，未覆盖任何一边。请在下方点击「逐项核对冲突」选择保留哪一端。');
    }else next=result.data;
   }
   if(!validBackup(next))throw Error('合并后数据超过限制，未同步。');
   // Do not reject a harmless local autosave during the request. The three-way rebase below preserves post-snapshot edits and reports genuine conflicts.
   if(!row||!YuanhangCloud.equal(next,row.data))await upload(next,row);
   // Rebase edits made during the upload instead of replacing them with the captured snapshot.
   const current=read(),changed=YuanhangCloud.reconcile(local,current,next);
   if(changed.conflicts.length){
    // The successful upload has moved the server ahead. Its review must use
    // the upload snapshot as the common ancestor, not the old sync baseline.
    localStorage.setItem(STORAGE+'_cloud_conflict_snapshot',JSON.stringify({at:new Date().toISOString(),revision:cfg.revision,base:local,local:current,remote:next,conflicts:changed.conflicts}));
    cfg.base=local;cfg.conflictCount=changed.conflicts.length;
    throw Error('上传期间本地也有修改，已保留本地及冲突快照。请再次同步核对。');
   }
   deadlineReady=true;apply(changed.data);
   cfg.lastError=null;const previous=cfg;cfg={...cfg,base:next,enabled:true,conflictCount:0,...(YuanhangCloud.equal(read(),next)?{lastSyncAt:new Date().toISOString()}:{})};try{persist()}catch(err){cfg=previous;throw err}
   if(!YuanhangCloud.equal(changed.data,next)){say('本地新修改待上传，正在安排下一次同步。');schedule()}else say(`已同步 · ${new Date().toLocaleTimeString('zh-CN')}。桌面版重新打开时会拉取更新。`);
   return true;
  }catch(err){deadlineReady=!cfg.enabled;cfg.lastError=err.message;try{persist()}catch{};say(`尚未同步：${err.message} 本地记录仍保留。`);return false}
  finally{busy=false;controls()}
 }
 function lockedWork(first=false,resolutions=null,snapshot=null){
  if(navigator.locks)return navigator.locks.request('yuanhang-account-sync',async()=>{try{cfg=JSON.parse(localStorage.getItem(META)||'{}')}catch{};return work(first,resolutions,snapshot)});
  return work(first,resolutions,snapshot);
 }
 function schedule(){clearTimeout(debounce);controls();if(cfg.enabled)debounce=setTimeout(()=>lockedWork(),1500)}
 $('accountSend').onclick=async()=>{
  if(busy)return;const email=$('accountEmail').value.trim();if(!/^\S+@\S+\.\S+$/.test(email))return say('请填写邮箱。');
  busy=true;$('accountSend').disabled=true;
  try{await request('/auth/v1/otp',{method:'POST',body:{email,create_user:true}});cfg.email=email;persist();say('邮件已发送。长按邮件中的登录按钮→复制链接，回到本页粘贴验证。每个入口请分别申请一封新邮件。')}
  catch(err){say(err.message)}finally{busy=false;$('accountSend').disabled=false}
 };
 $('accountVerify').onclick=async()=>{
  if(busy)return;busy=true;
  try{
   const email=$('accountEmail').value.trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email))throw Error('请填写接收邮件的邮箱。');
   const body=YuanhangCloud.verification($('accountToken').value,email);
   const s=await request('/auth/v1/verify',{method:'POST',body});
   if(!s?.access_token||!s.refresh_token||!s.user?.id||s.user.email?.toLowerCase()!==email)throw Error('登录邮箱不匹配，请重新申请本邮箱的登录邮件。');
   s.expires_at=s.expires_at||Math.floor(Date.now()/1000)+(s.expires_in||3600);cfg={email,session:s,enabled:false};persist();epoch++;$('accountToken').value='';say('已登录。点「开启自动同步」，首次会提示合并规则。');
  }catch(err){say(err.message)}finally{busy=false;controls()}
 };
 $('accountEnable').onclick=()=>lockedWork(true);
 $('accountSyncNow').onclick=()=>lockedWork();
 $('accountReviewConflicts').onclick=showConflictReview;
 $('accountLogout').onclick=()=>{
  if(busy)return say('正在处理，请完成后再停止同步。');
  cfg={email:cfg.email};persist();epoch++;clearTimeout(debounce);$('accountToken').value='';controls();say('此入口已停止同步并清除登录凭据，本地数据和云端记录保留。');
 };
 $('exportBeforeCloud').onclick=()=>{const raw=localStorage.getItem(STORAGE+'_before_cloud');if(!raw)return toast('暂无云端合并前备份');downloadText(raw,`远航_云同步前备份_${today()}.json`,'application/json')};
 $('accountEmail').value=cfg.email||'';controls();
 window.yuanhangMarkDirty=schedule;
 window.addEventListener('online',schedule);
 window.addEventListener('storage',e=>{if(e.key===META){epoch++;try{cfg=JSON.parse(e.newValue||'{}')}catch{cfg={}}controls()}if(e.key===STORAGE)schedule()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(cfg.enabled)deadlineReady=false;schedule()}});
 setInterval(()=>{if(!document.hidden&&cfg.enabled)lockedWork()},15000);
 if(cfg.enabled){deadlineReady=false;schedule();}
}
if(typeof document!=='undefined')startYuanhangCloud();
