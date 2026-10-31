/* Read-only view of engine facts; no clock slots, random actions or settlements. */
(function(root){
'use strict';
const locations={study:'study',rest:'bedroom',social:'corridor',pressure:'study'};
function get(s,at=Date.now()){
 const E=root.WendaoEngine,blocked=!!(E.lifeHold(s)||s.life?.detailState?.hold);
 const base={projection:true,eventId:null,sourceEventId:null,kind:'rest',activity:'rest',title:'安静休息',text:'暂歇片刻，等身体与日程允许时再续。',location:'bedroom',bodyState:'normal',startedAt:null,at:null,valid:false,blocked,sleeping:false,visualCapability:'fallback'};
 if(blocked||!Number.isFinite(at)||at<s.life?.cursor)return {...base,blocked:true,title:'等候核对',text:'时间或生活记录尚待核对，自主活动暂时停下。'};
 const ledger=(s.life?.ledger||[]).filter(r=>r.status!=='unresolved'&&Number.isFinite(r.at)&&r.at<=at);
 const parents=ledger.filter(r=>r.id?.startsWith('life:v4:')).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 const source=parents.at(-1),hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',hourCycle:'h23'}).format(new Date(at)));
 if(source&&(!locations[source.kind]||source.chapter!=='chapter-9-preparation'))return base;
 const injuries=(s.supervision?.deadlines?.punishments||[]).filter(p=>p.at<=at).map(p=>E.injuryFor(p,at));
 const v=E.vitals(JSON.parse(JSON.stringify(s)),{},at);
 const weak=injuries.some(i=>i.active)||s.character?.health<65||s.character?.fatigue>=40||v.stamina<32||v.mp<=10;
 // Sleep belongs to her recorded rest, never to the player's focus/nap controls.
 const sleeping=source?.kind==='rest'&&(hour>=23||hour<6);
 if(sleeping)return {...base,sleeping:true,eventId:source.id,sourceEventId:source.id,valid:true,startedAt:source.at,at:source.at,title:'夜间安寝',text:source.text,bodyState:source.bodyState};
 if(weak)return {...base,title:'卧榻静养',text:'她依身体状况留在榻上休养，手边的功课待精神允许时再续。',bodyState:injuries.some(i=>i.active)?'injured':'tired'};
 if(!source||at-source.at>8*3600000)return base;
 const details=ledger.filter(r=>r.kind==='detail'&&r.detailVersion===1&&r.sourceEventId===source.id&&r.at>=source.at&&[0,1].includes(r.step)&&r.id==='life:detail:v1:'+source.id+':'+r.step&&ledger.some(p=>p.id===r.previousEventId&&p.at<r.at)).sort((a,b)=>a.at-b.at);
 const row=details.at(-1)||source,kind=row.bodyState!=='normal'?'rest':source.kind;
 return {...base,eventId:row.id,sourceEventId:source.id,kind,activity:row.kind==='detail'?(row.step===1?'rest':kind==='study'?'notes':kind):kind==='study'?'reading':kind,title:row.activity,text:row.text,location:row.location||locations[kind],bodyState:row.bodyState,startedAt:row.at,at:row.at,valid:true};
}
root.WendaoLifeProjection=Object.freeze({get});
})(typeof window!=='undefined'?window:globalThis);
