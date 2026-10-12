/* Opt-in account sync. No credentials in exports or URLs; no background guarantees. */
'use strict';
const YuanhangCloud = (()=>{
 const ORIGIN='https://myejuodrhgdxphdkrvsa.supabase.co';
 const KEY='sb_publishable_PDlkk1ZY9WUH78qzPoJiFQ_kGiIYFr7';
 const normalize=x=>Array.isArray(x)?x.map(normalize):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,normalize(x[k])])):x;
 const equal=(a,b)=>JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
 const payload=s=>({events:s.events,sessions:s.sessions,screen:s.screen,usageSessions:s.usageSessions||[]});
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
 return {payload,equal,reconcile,verification,api};
})();
function startYuanhangCloud(){
 const META='yuanhang_account_sync_v1',request=YuanhangCloud.api();
 let cfg={},busy=false,epoch=0,debounce;
 try{cfg=JSON.parse(localStorage.getItem(META)||'{}')}catch{}
 const say=message=>{$('accountStatus').textContent=message};
 const persist=()=>localStorage.setItem(META,JSON.stringify(cfg));
 const read=()=>{const s=latestUsageState();if(!validBackup(s))throw Error('本地数据无效，请先导出备份。');return YuanhangCloud.payload(s)};
 function controls(){
  $('accountIdentity').textContent=cfg.session?.user?.email?`已登录：${cfg.session.user.email}`:'尚未登录';
  $('accountEnable').disabled=!cfg.session||cfg.enabled;
  $('accountSyncNow').disabled=!cfg.enabled;
  $('accountLogout').disabled=!cfg.session;
  $('accountBadge').textContent=cfg.enabled?'自动同步已开启':cfg.session?'已登录 · 待开启':'未开启云同步';
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
  const row=rows[0];if(row&&(!validBackup(row.payload)||!Number.isSafeInteger(row.revision)||row.revision<1))throw Error('云端备份格式异常，未修改本地。');
  return row?{revision:row.revision,data:YuanhangCloud.payload(row.payload)}:null;
 }
 async function upload(data,row){
  const filter=row?'&user_id=eq.'+encodeURIComponent(cfg.session.user.id)+'&revision=eq.'+row.revision:'';
  const revision=row?row.revision+1:1;
  const result=await authorized('/rest/v1/workbench_state?select=revision'+filter,{method:row?'PATCH':'POST',prefer:'return=representation',body:row?{payload:data,revision,updated_at:new Date().toISOString()}:{user_id:cfg.session.user.id,payload:data,revision}});
  if(!Array.isArray(result)||result.length!==1||result[0].revision!==revision)throw Error('另一入口刚更新了云端，请点击立即同步重试。');
 }
 function apply(data){
  if(!validBackup(data))throw Error('合并后数据超过限制或格式无效。');
  const latest=latestUsageState();
  if(YuanhangCloud.equal(YuanhangCloud.payload(latest),data))return;
  localStorage.setItem(STORAGE+'_before_cloud',JSON.stringify(latest));
  const next={...latest,...data};
  localStorage.setItem(STORAGE,JSON.stringify(next));state=next;clearUsagePreview();resetBackupMerge();restoreTimer();render();
 }
 async function work(first=false){
  if(busy||!cfg.session||(!first&&!cfg.enabled)||document.hidden)return;
  busy=true;controls();
  try{
   const local=read(),row=await remote();let next;
   if(first){
    const plan=row?($('accountFirstConflict').value==='local'?backupMergePlan(local,row.data):backupMergePlan(row.data,local)):{next:local,conflicts:0,total:0};
    if(!confirm(`开启此邮箱的自动同步？将把任务、学习及屏幕记录上传到你的 Supabase 账户。首次补入云端缺少的记录，${plan.conflicts} 项冲突保留${$('accountFirstConflict').value==='local'?'本入口':'云端'}版本。正在进行的计时仅留在本入口。`))return;
    next=YuanhangCloud.payload(plan.next);
   }else{
    if(!cfg.base||!validBackup(cfg.base))throw Error('缺少同步基准，请停止同步后重新登录开启。');
    if(!row)throw Error('云端记录已不存在，已暂停本次同步，请检查账户。');
    const result=YuanhangCloud.reconcile(cfg.base,local,row.data);
    if(result.conflicts.length)throw Error(`有 ${result.conflicts.length} 项两边都修改过的记录，未覆盖任何一边。请分别导出备份，再通过「合并另一入口」核对。`);
    next=result.data;
   }
   if(!validBackup(next))throw Error('合并后数据超过限制，未同步。');
   if(!YuanhangCloud.equal(local,read()))throw Error('同步期间本地有更新，请稍后重试。');
   if(!row||!YuanhangCloud.equal(next,row.data))await upload(next,row);
   // Rebase edits made during the upload instead of replacing them with the captured snapshot.
   const changed=YuanhangCloud.reconcile(local,read(),next);
   if(changed.conflicts.length)throw Error('上传期间本地也有修改，已保留本地。请再次同步核对。');
   apply(changed.data);
   const previous=cfg;cfg={...cfg,base:next,enabled:true};try{persist()}catch(err){cfg=previous;throw err}
   if(!YuanhangCloud.equal(changed.data,next)){say('本地新修改待上传，正在安排下一次同步。');schedule()}else say(`已同步 · ${new Date().toLocaleTimeString('zh-CN')}。桌面版重新打开时会拉取更新。`);
  }catch(err){say(`尚未同步：${err.message} 本地记录仍保留。`)}
  finally{busy=false;controls()}
 }
 function lockedWork(first=false){
  if(navigator.locks)return navigator.locks.request('yuanhang-account-sync',async()=>{try{cfg=JSON.parse(localStorage.getItem(META)||'{}')}catch{};return work(first)});
  return work(first);
 }
 function schedule(){clearTimeout(debounce);if(cfg.enabled)debounce=setTimeout(()=>lockedWork(),1500)}
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
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule()});
 setInterval(()=>{if(!document.hidden&&cfg.enabled)lockedWork()},15000);
 if(cfg.enabled)schedule();
}
if(typeof document!=='undefined')startYuanhangCloud();
