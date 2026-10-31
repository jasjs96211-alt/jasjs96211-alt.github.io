/* Read-only current activity projection from the authoritative Wendao life ledger.
   No scheduling, side effects, AI decisions, rewards, or animation playback. */
(function(root){
'use strict';
const places=Object.freeze({study:'study',rest:'bedroom',social:'corridor',pressure:'study'});
const spots=Object.freeze({study:'书案',bedroom:'榻边',corridor:'竹窗',garden:'竹窗',herbs:'药架',terrace:'竹窗'});
const kinds=new Set(['study','rest','social','pressure']);
const invalid=(reason)=>Object.freeze({valid:false,reason,visualCapability:'none'});
function getLifeProjection({state,at=Date.now(),vitals}={}){
 if(!state?.life||!Number.isFinite(at)||at<state.createdAt)return invalid('unavailable');
 const d=state.supervision?.deadlines;
 if(state.life.clockPending||state.supervision?.pending||d?.clockPending||d?.offlinePending||d?.cloudPending||vitals?.clockDispute)return invalid('unverified');
 const raw=Array.isArray(state.life.ledger)?state.life.ledger:[];
 const available=raw.filter(x=>x&&typeof x.id==='string'&&Number.isFinite(x.at)&&x.at<=at)
  .sort((a,b)=>a.at-b.at||xOrder(a.id,b.id));
 const latest=available.at(-1);
 if(!latest||at-latest.at>24*3600000||latest.status==='unresolved')return invalid('no-current-fact');
 const duplicates=available.filter(x=>x.id===latest.id);
 if(duplicates.length!==1)return invalid('duplicate-id');
 const base=latest.kind==='detail'?available.find(x=>x.id===latest.sourceEventId):latest;
 if(!base||base.status==='unresolved'||!kinds.has(base.kind)||!base.id.startsWith('life:v4:')||base.at>latest.at)return invalid('source-unverified');
 if(latest.kind==='detail'){
  if(latest.detailVersion!==1||!Number.isInteger(latest.step)||latest.step<0||latest.step>1||!latest.previousEventId)return invalid('detail-unverified');
  const predecessor=available.find(x=>x.id===latest.previousEventId);
  if(!predecessor||predecessor.at>=latest.at)return invalid('missing-predecessor');
 }
 const currentBody=state.character?.state||latest.bodyState||base.bodyState||'normal';
 const serious=currentBody==='injured'||currentBody==='ill'||vitals?.acuteInjury===true||vitals?.seriousInjury===true;
 const low=!serious&&(Number.isFinite(vitals?.stamina)&&vitals.stamina<32||Number.isFinite(vitals?.mp)&&vitals.mp<=10);
 const location=serious||low?'bedroom':latest.kind==='detail'&&spots[latest.location]?latest.location:places[base.kind];
 const title=serious?(currentBody==='injured'?'卧榻静养':'卧榻休养'):low?'按时歇息':String(latest.activity||base.activity||'日常起居');
 const text=serious?'她依照伤势留在榻上，不勉强起身。':low?'她暂缓手边的事，先休息恢复精神。':String(latest.text||base.text||'');
 return Object.freeze({
  valid:true,eventId:latest.id,sourceEventId:base.id,kind:base.kind,
  activity:title,title,text,location,place:location,spot:spots[location]||'榻边',
  bodyState:currentBody,startedAt:latest.at,sourceAt:base.at,
  reason:serious?'injury-guard':low?'fatigue-guard':'verified-ledger',
  visualCapability:'ambient-only'
 });
}
function xOrder(a,b){return String(a).localeCompare(String(b))}
root.WendaoLifeProjection=Object.freeze({getLifeProjection});
})(typeof window!=='undefined'?window:globalThis);
