/* Opt-in account sync. No credentials in exports or URLs; no background guarantees. */
'use strict';
const YuanhangCloud = (()=>{
 const ORIGIN='https://myejuodrhgdxphdkrvsa.supabase.co';
 const KEY='sb_publishable_PDlkk1ZY9WUH78qzPoJiFQ_kGiIYFr7';
 const normalize=x=>Array.isArray(x)?x.map(normalize):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalize(x[k])])):x;
 const equal=(a,b)=>JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
 const payload=s=>({events:s.events,sessions:s.sessions,screen:s.screen,usageSessions:s.usageSessions||[],...(s.wendao?{wendao:s.wendao}:{})});
 const cleanWendao=w=>w?{...w,revision:0}:null;
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
  const n=E.merge(local,remote),b=base||{};
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
  if(equal(lw,rw))out.wendao=lw||undefined;
  else if(equal(lw,bw))out.wendao=rw||undefined;
  else if(equal(rw,bw))out.wendao=lw||undefined;
  else if(lw&&rw){out.wendao=mergeWendao(bw,lw,rw,conflicts)}
  else{conflicts.push({field:'wendao',id:'story-state'});out.wendao=lw||undefined}
  if(out.wendao&&typeof window!=='undefined'&&window.WendaoEngine)window.WendaoEngine.derive(out.wendao,out,Math.max(local.wendao?.supervision?.deadlines?.lastCheck||0,remote.wendao?.supervision?.deadlines?.lastCheck||0,Date.now()));
  return {data:out,conflicts};
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
 return {payload,equal,reconcile,verification,api,pendingChanges};
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
  return {origin:location.origin||'本地文件',enabled:!!cfg.enabled,signedIn:!!cfg.session,pendingChanges,conflictCount:cfg.conflictCount||0,lastReadAt:cfg.lastReadAt||null,lastWriteAt:cfg.lastWriteAt||null,lastSyncAt:cfg.lastSyncAt||null,revision:cfg.revision||null,lastError:cfg.lastError||null};
 }
 function controls(){
  $('accountIdentity').textContent=cfg.session?.user?.email?`已登录：${cfg.session.user.email}`:'尚未登录';
  $('accountEnable').disabled=!cfg.session||cfg.enabled;
  $('accountSyncNow').disabled=!cfg.enabled;
  $('accountLogout').disabled=!cfg.session;
  $('accountBadge').textContent=cfg.enabled?'自动同步已开启':cfg.session?'已登录 · 待开启':'未开启云同步';
  const d=diagnostics(),time=x=>x?new Date(x).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}):'暂无成功记录';
  $('accountDiagnostics').textContent=`上次读取：${time(d.lastReadAt)}；上次上传：${time(d.lastWriteAt)}；上次完整同步：${time(d.lastSyncAt)}。待同步变更：${d.pendingChanges===null?'尚未建立基准':d.pendingChanges}；待处理冲突：${d.conflictCount}。`;
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
   if(priorStudy!==null)localStorage.setItem(STORAGE,priorStudy);state=latest;
   if(priorWD!==null){localStorage.setItem(wdKey,priorWD);window.Wendao?.reloadLocal?.()}
   throw err;
  }
 }
 async function work(first=false){
  if(busy||!cfg.session||(!first&&!cfg.enabled)||document.hidden)return;
  busy=true;controls();
  try{
   // Capture local state *after* the network read. Time-tracking and story autosaves may change it while awaiting Supabase.
   const row=await remote(),local=read();let next;
   if(first){
    const plan=row?($('accountFirstConflict').value==='local'?backupMergePlan(local,row.data):backupMergePlan(row.data,local)):{next:local,conflicts:0,total:0};
    if(!confirm(`开启此邮箱的自动同步？将把任务、学习、屏幕记录及问道剧情/聊天上传到你的 Supabase 账户（不含自定义图片）。首次补入云端缺少的记录，${plan.conflicts} 项冲突保留${$('accountFirstConflict').value==='local'?'本入口':'云端'}版本。正在进行的计时仅留在本入口。`))return;
    next=YuanhangCloud.payload(plan.next);
    const lw=local.wendao,rw=row?.data.wendao;
    if(lw&&rw){
     const localFirst=$('accountFirstConflict').value==='local';
     next.wendao=window.WendaoEngine.merge(localFirst?lw:rw,localFirst?rw:lw);next.wendao.revision=0;
    }else if(lw||rw)next.wendao=lw||rw;
   }else{
    if(!cfg.base||!validBackup(cfg.base))throw Error('缺少同步基准，请停止同步后重新登录开启。');
    if(!row)throw Error('云端记录已不存在，已暂停本次同步，请检查账户。');
    const result=YuanhangCloud.reconcile(cfg.base,local,row.data);
    if(result.conflicts.length){cfg.conflictCount=result.conflicts.length;localStorage.setItem(STORAGE+'_cloud_conflict_snapshot',JSON.stringify({at:new Date().toISOString(),base:cfg.base,local,remote:row.data,conflicts:result.conflicts}));throw Error(`有 ${result.conflicts.length} 项两边都修改过的记录，未覆盖任何一边。请分别导出备份，再通过「合并另一入口」核对。`);}
    next=result.data;
   }
   if(!validBackup(next))throw Error('合并后数据超过限制，未同步。');
   // Do not reject a harmless local autosave during the request. The three-way rebase below preserves post-snapshot edits and reports genuine conflicts.
   if(!row||!YuanhangCloud.equal(next,row.data))await upload(next,row);
   // Rebase edits made during the upload instead of replacing them with the captured snapshot.
   const changed=YuanhangCloud.reconcile(local,read(),next);
   if(changed.conflicts.length){cfg.conflictCount=changed.conflicts.length;localStorage.setItem(STORAGE+'_cloud_conflict_snapshot',JSON.stringify({at:new Date().toISOString(),base:local,local:read(),remote:next,conflicts:changed.conflicts}));throw Error('上传期间本地也有修改，已保留本地及冲突快照。请再次同步核对。');}
   deadlineReady=true;apply(changed.data);
   cfg.lastError=null;const previous=cfg;cfg={...cfg,base:next,enabled:true,conflictCount:0,...(YuanhangCloud.equal(read(),next)?{lastSyncAt:new Date().toISOString()}:{})};try{persist()}catch(err){cfg=previous;throw err}
   if(!YuanhangCloud.equal(changed.data,next)){say('本地新修改待上传，正在安排下一次同步。');schedule()}else say(`已同步 · ${new Date().toLocaleTimeString('zh-CN')}。桌面版重新打开时会拉取更新。`);
  }catch(err){deadlineReady=!cfg.enabled;cfg.lastError=err.message;try{persist()}catch{};say(`尚未同步：${err.message} 本地记录仍保留。`)}
  finally{busy=false;controls()}
 }
 function lockedWork(first=false){
  if(navigator.locks)return navigator.locks.request('yuanhang-account-sync',async()=>{try{cfg=JSON.parse(localStorage.getItem(META)||'{}')}catch{};return work(first)});
  return work(first);
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
