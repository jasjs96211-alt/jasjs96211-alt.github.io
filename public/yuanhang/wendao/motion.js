/* Presentation only. Frame artwork, routes and CG never write study, injuries or RPG resources. */
(function(root){
'use strict';
const BASE='./wendao/assets/';
const ACTIONS=Object.freeze(Object.fromEntries(['walk','read','herbs','meditate'].map(id=>[id,Object.freeze({animated:BASE+'zhiyao-'+id+'-cycle.webp',poster:BASE+'zhiyao-'+id+'-still.webp',frames:4})])));
const CG=BASE+'zhiyao-recovery-cg.webp',UI_KEY='yuanhang_wendao_motion_view_v1';
const backgroundAssets=['herbs','garden','corridor','bedroom','terrace','study'].map(id=>({id:'world-'+id,kind:'background',title:({study:'书房·白日',herbs:'青溪药庐',garden:'听竹小庭',corridor:'学宫回廊',bedroom:'知遥寝居',terrace:'望星台'})[id],src:BASE+'world-'+id+'.webp',status:'ready'}));
if(root.WendaoContent)for(const a of [...backgroundAssets,{id:'recovery-bed',kind:'cg',title:'竹窗疗养',src:CG,status:'ready',chapter:'companion'}])if(!root.WendaoContent.assets.some(x=>x.id===a.id))root.WendaoContent.assets.push(a);
const clamp=n=>Math.max(0,Math.min(1,n));
function injury(world,state){return world?.unwell||state?.vitals?.seriousInjury||['injured','ill'].includes(state?.portrait?.state)}
function transition(previous,next,at,state={}){
 if(!previous||!next||!Number.isFinite(at)||at<previous.at||at-previous.at>90000||injury(next,state)||state.vitals?.clockDispute)return null;
 const old=previous.world;if(old.player!==next.player)return next.following&&next.together?{type:'enter',at,duration:6000}:null;
 if(old.together&&!next.together)return {type:'leave',at,duration:6000};
 if(!old.together&&next.together)return {type:'enter',at,duration:6000};
 if(next.together&&old.activity.title!==next.activity.title&&next.sister!=='bedroom')return {type:'enter',at,duration:6000};return null;
}
function plan({world,state={},at=Date.now(),transit=null,enabled=true,reduced=false,hidden=false,saveData=false}={}){
 const animate=enabled&&!reduced&&!hidden&&!saveData,unwell=injury(world,state);
 if(!world)return {mode:'actor',action:'idle',src:state.portrait?.src,x:50,animate:false,flip:false};
 if(state.vitals?.clockDispute)return {mode:world.together?'actor':'absent',action:'idle',src:state.portrait?.src,x:50,animate:false,flip:false};
 const progress=transit&&animate&&!unwell?clamp((at-transit.at)/transit.duration):1;
 if(transit&&progress<1&&at>=transit.at)return {mode:'actor',action:'walk',src:ACTIONS.walk.animated,poster:ACTIONS.walk.poster,x:transit.type==='leave'?50+45*progress:10+40*progress,animate:true,flip:false};
 if(!world.together)return {mode:'absent',action:'absent',animate:false};
 if(world.sister==='bedroom')return state.recoveryCGAllowed===true?{mode:'cg',action:'recover',src:CG,cgId:'recovery-bed',animate:false}:{mode:'actor',action:'rest',src:state.portrait?.src,x:50,animate:false,flip:false};
 let action='idle',x=50,flip=false;
 if(world.sister==='herbs')action='herbs';
 else if(world.sister==='study')action='read';
 else if(world.sister==='garden'&&/静心|调息/.test(world.activity.title))action='meditate';
 else{
  const elapsed=((at%180000)+180000)%180000;
  if(elapsed<10000){action='walk';x=30+40*elapsed/10000;flip=false}
 }
 const a=ACTIONS[action];return {mode:'actor',action,src:a?(animate?a.animated:a.poster):state.portrait?.src,poster:a?.poster,x:animate?x:50,flip,animate:!!a&&animate};
}
function readPreference(storage){try{return JSON.parse(storage?.getItem(UI_KEY)||'null')?.enabled!==false}catch{return true}}
function writePreference(storage,enabled){try{storage?.setItem(UI_KEY,JSON.stringify({enabled:!!enabled}));return true}catch{return false}}
function renderer({actor,photo,bed,hint,onArtSeen=()=>{}}){
 const failed=new Set(),seen=new Set();let desiredCG=null;
 function recordSeen(id){if(onArtSeen(id)!==false)seen.add(id)}
 function source(el,url,fallback){
  if(!url)return false;const selected=failed.has(url)?fallback:url;if(!selected||failed.has(selected))return false;
  if(el.dataset.artSource===selected)return true;
  el.dataset.artSource=selected;el.dataset.ready='0';
  el.onload=()=>{if(el.dataset.artSource!==selected)return;el.dataset.ready='1';hint.hidden=true;if(el===bed&&!bed.hidden&&desiredCG&&!(root.document?.hidden)&&!seen.has(desiredCG))recordSeen(desiredCG)};
  el.onerror=()=>{if(el.dataset.artSource!==selected)return;failed.add(selected);if(fallback&&fallback!==selected&&!failed.has(fallback)){source(el,fallback,null);return}el.hidden=true;hint.hidden=false;hint.textContent='此动作或CG暂未缓存，请联网后重试；原存档与伤势保留。'};
  el.src=selected;return true;
 }
 function render(options){
  const p=plan(options);desiredCG=p.mode==='cg'?p.cgId:null;bed.hidden=p.mode!=='cg';actor.hidden=p.mode!=='actor';actor.dataset.motion=p.action;actor.style.left=p.x+'%';actor.style.setProperty('--motion-facing',p.flip?'-1':'1');
  if(p.mode==='cg'){
   if(!source(bed,p.src,null)){bed.hidden=true;actor.hidden=false;photo.hidden=!source(photo,options.state.portrait?.src,null);hint.hidden=false;hint.textContent='卧床CG未能加载，暂显示原状态立绘。'}
   else if(bed.dataset.ready==='1'&&!seen.has(p.cgId)&&!options.hidden)recordSeen(p.cgId);
  }else if(p.mode==='actor'){const okay=source(photo,p.src,p.poster||options.state.portrait?.src);photo.hidden=!okay;if(!okay){photo.hidden=!source(photo,options.state.portrait?.src,null);actor.dataset.motion='fallback';hint.hidden=false;hint.textContent='动作图片未缓存，暂显示原状态立绘。';photo.alt='温知遥 · 原状态立绘';return {...p,action:'fallback'};}photo.alt='温知遥 · '+({read:'坐姿翻书',herbs:'分拣药草',meditate:'坐姿调息',walk:'步行动作',rest:'榻边歇息',idle:options.state.portrait?.label||'当前状态'}[p.action]);}
  return p;
 }
 return {render,resetFailures:()=>failed.clear()};
}
root.WendaoMotion=Object.freeze({ACTIONS,CG,UI_KEY,plan,transition,readPreference,writePreference,renderer});
})(typeof window!=='undefined'?window:globalThis);
