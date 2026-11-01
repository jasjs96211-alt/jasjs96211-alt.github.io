/* Offline character voice from immutable, evidenced context. No generated text is a rules command. */
(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
function hash(text){let n=2166136261;for(const c of String(text))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0}
function completed(row,at){if(!row||typeof row.id!=='string'||!Number.isFinite(Number(row.minutes))||Number(row.minutes)<=0)return false;const end=row.endedAt||row.at;return !end||Number.isFinite(Date.parse(end))&&Date.parse(end)<=at}
function snapshot(s,study,at,{portrait,vitals,worldView}={}){
 const W=root.WendaoWorld,character={portrait,vitals,schedule:root.WendaoLifeProjection?.get(s,at)||s.life?.ledger?.filter(x=>x.kind!=='detail'&&x.status!=='unresolved'&&x.at<=at).at(-1)};
 // The caller may supply this device's active companion view. Persist only the
 // derived creation-time facts in the letter, never a global/cloud player map.
 const liveView=worldView&&W?.LOCATIONS.some(x=>x.id===worldView.player);
 character.validAt=s.life?.cursor;const world=W?.derive({at,state:character,focus:study.focusTimer||{},playerPlace:liveView?worldView.player:'study',following:liveView&&worldView.following===true});
 const observed=worldView?.bedroomScene;
 const bedroom=liveView&&world?.together&&world.sister==='bedroom'&&root.WendaoEngine.canViewRecoveryCG(s,at)&&observed?.current===true&&observed.source==='validated-bedroom-presentation'&&observed.claimVisibleAction===true&&at>=observed.observedAt&&at-observed.observedAt<5000?copy(observed):null;
 const records=(study.sessions||[]).filter(x=>completed(x,at)&&x.date<=root.WendaoEngine.day(at)).slice(-6).map(x=>({id:x.id,date:x.date,subject:String(x.subject||'功课').slice(0,80),minutes:Number(x.minutes),endedAt:x.endedAt||x.at||null,source:x.source||'record'}));
 return copy({version:1,at,timezone:'Asia/Shanghai',location:world?.sisterLocation?.name||'书房',locationId:world?.sister||'study',locationSource:liveView?'companion-view':'autonomous-schedule',locationScope:'at-creation',following:world?.following===true,bedroomScene:bedroom,activity:bedroom?.description||world?.activity?.title||character.schedule?.activity||s.character.activity,portrait:{state:portrait.state,label:portrait.label,reason:portrait.reason},vitals,relationship:s.character.bond,chapter:s.story.current,
  injuries:(s.supervision.deadlines?.punishments||[]).filter(p=>p.at<=at).slice(-3).map(p=>({id:p.id,result:p.result,at:p.at,visualDay:root.WendaoEngine.day(p.at),...root.WendaoEngine.injuryFor(p,at),care:(p.recoveryActions||[]).filter(x=>x.at<=at).slice(-4)})),
  studyRecords:records,recentLife:(s.life?.ledger||[]).filter(x=>x.status!=='unresolved'&&x.at<=at).slice(-3).map(x=>({id:x.id,kind:x.kind,at:x.at,activity:x.activity})),
  recentChat:(s.chat||[]).filter(x=>Number.isFinite(x.at)&&x.at<=at).slice(-4).map(x=>({role:x.role,text:String(x.text||'').slice(0,300)})),
  previousLetters:(s.messages||[]).filter(x=>x.trigger&&x.at<=at).slice(-3).map(x=>({id:x.id,theme:x.theme||x.trigger,text:String(x.text||'').slice(0,500)}))});
}
function prepare(s,study,at,event,body){
 const ctx=snapshot(s,study,at,body),ill=['injured','ill'].includes(ctx.portrait.state)||ctx.vitals.seriousInjury;
 const location=ctx.location,quiet=ill?'我这里先安静温养，不勉强自己。':ctx.following?'我正与你一道，在'+location+'稍停片刻。':({herbs:'我在药庐理药签，几味相似的叶子还得细看。',garden:'我在竹庭坐了一会儿，风把书页都翻乱了。',corridor:'我沿廊走走，等会儿便回去整理医札。',terrace:'我在望星台看看天色，稍后便回去。',bedroom:'我先歇一阵，书册就留在枕边。',study:'我手边还摊着医书，也有几处想不明白的地方。'})[ctx.locationId]||'我也有自己要慢慢理清的事。';
 const fatigue=ctx.recentChat.filter(x=>x.role==='user').some(x=>/累|困|难过|难受|压力|害怕/.test(x.text));
 const recorded=(s.life?.ledger||[]).find(x=>x.id===event.id)?.text||event.text;
 let variants=[];
 switch(event.trigger){
 case 'idle':variants=ill?['书卷先挑一小段便好。我这边会按伤势歇着，你不必一边担心我、一边逼自己赶路。','要不要把最难下手的那一页摊开？我先温养，你先读几行，等会儿再说。','若是累了，就把休息记下来；若是卡住了，也可以说给我听。今日的功课不必一口气做完。']:['你那卷书还等着呢。先挑五分钟能理清的一处，我也把手边这页看完。','方才想起你今日的功课。可有哪处难下手？要不要先把第一步写出来？','书页放久了，再翻开总有些难。你先读一小段，我也继续理自己的疑问。','功课可以从最小的一项开始。若其实需要歇息，就先歇好，再回来。'];break;
 case 'study':{const record=ctx.studyRecords.find(x=>'study:'+x.id===event.id);if(!record)return {text:event.text,snapshot:ctx,theme:event.trigger,variant:'legacy'};const fact=record.subject+'的'+record.minutes+'分钟已记在功课簿里。';variants=[fact+' 先让眼睛歇一歇。'+quiet,fact+' 这段时间是实实在在花下的，下一卷等缓口气再翻。',fact+' 我也有自己的疑问，等你方便时，我们各说一处，好不好？'];break;}
 case 'task':variants=['功课簿上又结了一项。倒不必马上拿新的事填满这点空隙，先缓口气。','那一项已经有完成记录了。原来觉得遥远的事，也会这样一点点近起来。','这一项总算理妥了。'+quiet+' 等你方便，我们再说下一步。'];break;
 case 'mastery':{const row=s.mastery.find(x=>'mastery:'+x.id===event.id);const verb=({recall:'复述',dictation:'默写',review:'复习'})[row?.level]||'温习';variants=['这一回'+verb+'已经记下。肯回头核对的地方，往后便更站得住。','我看见这条'+verb+'记录了。今日的功夫已经落在纸上，先别急着赶下一段。','能把功课再'+verb+'一遍，就知道哪里还需要打磨了。'+quiet];break;}
 case 'family-event':variants=[recorded+' 这件事我会先按能做的步骤整理，你不必立刻放下自己的事。',recorded+' 不是每一封来函都要马上答复。等你方便，我们再一起核对。'];break;
 case 'sister-task':variants=[recorded+' 有一处我想再查查，等你歇息时再与你说。',recorded+' 今日也算留下一点自己的所得了。',recorded+' 余下的疑问先记着，不必赶在这一刻全弄明白。'];break;
 default:variants=[quiet+' 你若有空，晚些来坐坐。',quiet+' 今日不催你说话，各自做些事也好。',quiet+' 留这张小笺，只是想告诉你我在做什么。'];
 }
 if(fatigue&&event.trigger==='idle')variants=['你方才说的难处，我记着。若需要歇息，就照实记下，等缓过来再翻书。','先别把自己逼得太紧。你说起的疲惫也算要紧的事，功课从最小的一步理起便好。','难下手的时候，可以先把那一页摊着。'+(ill?'我这边也会量力休养。':'我也把自己的疑问记着，等会儿再说。')];
 let n=hash(event.id+':'+ctx.portrait.state+':'+ctx.locationId)%variants.length;
 for(let i=0;i<variants.length;i++){const candidate=(n+i)%variants.length;if(!ctx.previousLetters.some(x=>x.text===variants[candidate])){n=candidate;break}}
 const text=variants[n];
 return {text,snapshot:ctx,theme:event.trigger,variant:event.trigger+':'+n};
}
root.WendaoInteraction=Object.freeze({prepare,snapshot,completed});
})(typeof window!=='undefined'?window:globalThis);
