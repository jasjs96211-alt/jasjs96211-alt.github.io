/* Wandering study companion: presentation-only. Never fabricates study minutes or AI events. */
(function(root){
'use strict';
const STATES={
 normal:[['书案','研读医书','姐姐在书案前翻检医理，偶尔提笔记下两行。'],['药架','整理药草','她起身去药架，慢慢将晾好的药草分类。'],['竹窗','窗边稍歇','她走到竹窗旁，望一眼院里的光影。'],['书案','誊写笔记','她回到桌前，继续整理方才想到的问题。'],['榻边','稍作休息','她收起书卷，给自己留一段休息的时间。']],
 concerned:[['书案','核对书页','她反复核对净灵殿的记录，眉心微蹙。'],['竹窗','留心院外','她在窗边停了一会儿，听着廊下的动静。'],['书案','研究规约','她把几条规约抄下，准备另寻办法。']],
 tired:[['书案','慢读医书','她翻书翻得比平时慢些，不再勉强赶进度。'],['榻边','歇一歇','她放下书卷，靠着软枕缓缓调息。'],['书案','整理小札','休息片刻，她才又写下一两句心得。']],
 ill:[['榻边','卧榻休养','姐姐今日旧伤未愈，靠在榻边慢慢调息。'],['榻边','喝水歇息','她接过温水，缓了缓气息，没有强撑着起身。'],['榻边','翻阅薄册','她只翻了几页薄薄的医札，便合上书休息。']],
 injured:[['榻边','静养伤势','她伤势仍重，此时最需要的是安静休养。'],['榻边','调整呼吸','她慢慢换了个靠姿，暂时不宜修炼。'],['榻边','闭目休息','屋里静了下来，她终于肯闭目歇息。']],
 relieved:[['书案','整理心得','她将新写的几页医理笔记摊平，神色比前些日子轻快。'],['药架','侍弄药草','她去药架旁挑拣嫩叶，动作轻快了些。'],['竹窗','看看天色','姐姐在窗前停步，像是想起什么趣事，轻轻一笑。']]
};
const $=id=>document.getElementById(id);
let layer=null,bridge=null,getCharacter=null,onFocusPage=null,onClose=null,onCare=null,interval=null,activeID=null,finished=false,lastPortraitSrc='';
let worldView={player:'study',following:false};
let motionRenderer=null,motionTimer=null,motionEnabled=true,lastWorld=null,worldSnapshot=null,stateSnapshot=null,transit=null,onArtSeen=null;
function reduced(){return !!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches}
function paintMotion(hidden=document.hidden){if(!motionRenderer||!stateSnapshot)return;const m=motionRenderer.render({world:worldSnapshot,state:stateSnapshot,at:Date.now(),transit,enabled:motionEnabled,reduced:reduced(),hidden,saveData:root.navigator?.connection?.saveData===true});$('wcArtRetry').hidden=$('wcArtHint').hidden;return m}
function startMotion(){clearInterval(motionTimer);if(!motionEnabled||reduced()||document.hidden)return;motionTimer=setInterval(()=>{if(!document.hidden)paintMotion()},250)}
function viewStore(){try{return typeof localStorage!=='undefined'?localStorage:null}catch{return null}}
function saveWorldView(){root.WendaoWorld?.writeView(viewStore(),worldView)}
function travelNotice(text){const el=$('wcTravelNotice');if(el)el.textContent=text||''}
function selectAction(portrait,seconds,paused){
 const status=portrait&&STATES[portrait.state]?portrait.state:'normal';
 const list=STATES[status],index=Math.floor(Math.max(0,seconds)/360)%list.length;
 const row=list[index];
 return {place:row[0],title:paused?'暂歇 · '+row[1]:row[1],text:row[2],state:status};
}
function focusState(){
 try{return bridge?.focusState?.()||{id:null,total:1500,remaining:1500,running:false,subject:''}}
 catch{return {id:null,total:1500,remaining:1500,running:false,subject:''}}
}
function clock(sec){
 const n=Math.max(0,Math.ceil(Number(sec)||0));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
}
function update(){
 if(!layer||layer.hidden)return;
 const state=getCharacter?.()||{},portrait=state.portrait||{state:'normal',label:'日常'};
 const timer=focusState(),active=!!timer.id;
 if(active){activeID=timer.id;finished=false}else if(activeID){finished=(bridge.get?.().sessions||[]).some(x=>x.id===activeID&&x.source==='timer');activeID=null}
 const W=root.WendaoWorld;
 const world=W?.derive({at:Date.now(),state,focus:timer,playerPlace:worldView.player,following:worldView.following});
 stateSnapshot=state;worldSnapshot=world;if(world){const change=root.WendaoMotion?.transition(lastWorld,world,Date.now(),state);if(change)transit=change;lastWorld={world,at:Date.now()};}
 let act;
 if(world){
  if(worldView.following&&!world.canFollow){worldView.following=false;saveWorldView();travelNotice(world.unwell?'姐姐需要静养，已结束同行；她留在寝居。':'姐姐需要处理自己的日程，已结束同行。')}
  act=world.activity;
  const backdrop=$('wcBackdrop');
  backdrop.dataset.location=world.player;backdrop.dataset.phase=world.phase;
  $('wcSkyPlace').textContent=world.location.name;
  $('wcSkyDaypart').textContent=world.phaseName+' · 北京时间';
  $('wcSisterWhere').textContent=world.together?'姐姐也在这里 · '+act.title:'姐姐此刻在'+world.sisterLocation.name+' · '+act.title;
  $('wcFindSister').hidden=world.together;
  $('wcFollow').textContent=worldView.following?'结束同行':'邀姐姐同行';
  $('wcActor').hidden=!world.together;
  layer.dataset.location=world.player;layer.dataset.phase=world.phase;
 }else{
  act=selectAction(portrait,Math.floor(Date.now()/1000),active&&!timer.running);
  $('wcActor').hidden=false;
 }
 if(state.vitals?.clockDispute){act.title='等候核对时间';act.text='设备时间需要核对，暂不推进陪伴日程。'}
 const quick=$('wcHeroVitals');if(quick&&quick.innerHTML!==state.mainHud)quick.innerHTML=state.mainHud||'';
 const detail=$('wcVitals');if(detail&&detail.innerHTML!==state.hud){
  const opened=[...detail.querySelectorAll('details')].map(d=>d.open);
  detail.innerHTML=state.hud||'';
  detail.querySelectorAll('details').forEach((d,i)=>{if(i<opened.length)d.open=opened[i]});
 }
 const actor=$('wcActor'),photo=$('wcPortrait');
 actor.dataset.place=act.spot||act.place;
 if(motionRenderer)paintMotion();else{
 if(portrait.src){
  if(lastPortraitSrc!==portrait.src){lastPortraitSrc=portrait.src;photo.onerror=()=>{photo.hidden=true;$('wcArtHint').hidden=false;$('wcArtHint').textContent='当前立绘加载失败，请返回书房重试；状态与存档保留。'};photo.src=portrait.src;photo.alt='温知遥 · '+portrait.label}
  photo.hidden=false;$('wcArtHint').hidden=true;
 }else{photo.hidden=true;$('wcArtHint').hidden=false;$('wcArtHint').textContent='当前状态立绘暂未加载';lastPortraitSrc=''}
 }
 if($('wcLetters')){const count=state.letters?.length||0;$('wcLetters').hidden=!count;$('wcLetters').textContent='来信 '+count;}
 $('wcName').textContent='温知遥 · '+(portrait.label||'日常');
 $('wcActivity').textContent=act.title;
 $('wcDescription').textContent=act.text;
 $('wcTime').textContent=clock(timer.remaining);
 $('wcTrack').textContent=active?(timer.subject||'本次修炼')+' · '+(timer.running?'专注进行中':'已暂停'):finished?'本轮已完成 · 已核对原学习记录':'与姐姐各自读书，不必时时交谈';
 const start=$('wcStart'),pause=$('wcPause'),setup=$('wcSetup');
 setup.hidden=active;pause.hidden=!active;start.hidden=active;
 pause.textContent=timer.running?'Ⅱ 暂停':'▶ 继续';
 $('wcReset').hidden=!active;$('wcFinish').textContent=finished?'已核对本轮专注记录；学习分钟数由远航原计时器入账。':'仅使用远航原计时器；离开场景也不影响正在进行的专注。';
 const options=$('wcMinutes').options;
 if(!active&&!$('wcMinutes').dataset.touched&&options.length&&[1500,2700,3600].includes(timer.total))$('wcMinutes').value=String(timer.total/60);
 if(!active){
  const chosen=$('wcSubject');
  if(!chosen.dataset.touched){
   const official=document.getElementById('timerSubject');
   if(official&&[...chosen.options].some(x=>x.value===official.value))chosen.value=official.value;
  }
 }
}
function mount({stage,focusBridge,getCharacterState,onFocusPage:focusPage,onClose:closeCallback,onCare:careCallback,onArtSeen:artCallback}={}){
 if(layer)return;
 bridge=focusBridge;getCharacter=getCharacterState;onFocusPage=focusPage;onClose=closeCallback;onCare=careCallback;onArtSeen=artCallback;
 layer=document.createElement('section');
 layer.id='wdCompanionLayer';layer.className='wd-companion';layer.hidden=true;
 layer.setAttribute('aria-label','问道 · 陪伴修炼');
 worldView=root.WendaoWorld?.readView(viewStore())||{player:'study',following:false};
 const mapMarkup=(root.WendaoWorld?.LOCATIONS||[]).map(x=>'<button type="button" data-wc-travel="'+x.id+'">'+x.name+'</button>').join('');
 layer.innerHTML='<div class="wc-sky"><span id="wcSkyPlace">学宫书房</span><span id="wcSkyDaypart">白日</span></div>'+
 '<div id="wcBackdrop" class="wc-backdrop" data-location="study" data-phase="day" aria-hidden="true"><i class="wc-arch"></i><i class="wc-prop"></i><i class="wc-ground"></i></div><div id="wcHeroVitals" class="wc-hero-vitals" aria-label="温知遥主要属性"></div>'+
 '<div class="wc-travel"><div class="wc-travel-actions"><button type="button" id="wcMapToggle" aria-expanded="false" aria-controls="wcMap">◎ 地图</button><button type="button" id="wcFindSister">去找姐姐</button><button type="button" id="wcFollow">邀姐姐同行</button></div><p id="wcSisterWhere" aria-live="polite"></p><p id="wcTravelNotice" aria-live="polite"></p><nav id="wcMap" class="wc-map" aria-label="学宫地点" hidden><div class="wc-map-head">前往何处？ <button type="button" id="wcMapBack">收起地图 ×</button></div><div class="wc-map-places">'+mapMarkup+'</div></nav></div>'+
 '<div class="wc-motion-tools"><button type="button" id="wcAnimation" aria-pressed="true">动作：开</button><button type="button" id="wcLetters" hidden>来信</button><button type="button" id="wcArtRetry" hidden>重试演出图片</button></div><img id="wcRecovery" alt="温知遥卧床休养CG" hidden>' +
 '<div class="wc-world" aria-hidden="true"><span class="wc-spot wc-spot-window">竹窗</span><span class="wc-spot wc-spot-desk">书案</span><span class="wc-spot wc-spot-herbs">药架</span><span class="wc-spot wc-spot-bed">榻边</span>'+
 '<div id="wcActor" class="wc-actor" data-place="书案"><img id="wcPortrait" alt="温知遥立绘"><span id="wcArtHint" hidden></span></div></div>'+
 '<div class="wc-panel"><header class="wc-heading"><div><small id="wcName">温知遥</small><h2 id="wcActivity">研读医书</h2><p id="wcDescription"></p></div><button type="button" id="wcClose" aria-label="返回剧情书房">返回书房 ×</button></header>'+
 '<div id="wcVitals"></div><div class="wc-timer"><strong id="wcTime">25:00</strong><span id="wcTrack">准备开始</span></div>'+
 '<div id="wcSetup" class="wc-setup"><label>修炼科目 <select id="wcSubject"></select></label><label>本轮时长 <select id="wcMinutes"><option value="25">25 分钟</option><option value="45">45 分钟</option><option value="60">60 分钟</option></select></label></div>'+
 '<div class="wc-buttons"><button type="button" id="wcStart">▶ 开始与姐姐一同修炼</button><button type="button" id="wcPause" hidden>Ⅱ 暂停</button><button type="button" id="wcReset" hidden>重置本轮</button><button type="button" id="wcCare">疗养／商议</button><button type="button" id="wcTalk">自由交谈</button><button type="button" id="wcStatus">状态／用膳</button><button type="button" id="wcGoTimer">打开原专注页</button></div>'+
 '<p id="wcFinish" class="wc-caveat">四帧动作演出与独立卧床CG；陪伴本身不调用AI，后台暂停动画。</p></div>';
 stage.append(layer);
 const M=root.WendaoMotion;if(M){motionEnabled=M.readPreference(viewStore());motionRenderer=M.renderer({actor:$('wcActor'),photo:$('wcPortrait'),bed:$('wcRecovery'),hint:$('wcArtHint'),onArtSeen:id=>onArtSeen?.(id)});}
 $('wcAnimation').textContent=motionEnabled?'动作：开':'动作：关';$('wcAnimation').setAttribute('aria-pressed',String(motionEnabled));
 $('wcAnimation').onclick=()=>{motionEnabled=!motionEnabled;M?.writePreference(viewStore(),motionEnabled);$('wcAnimation').textContent=motionEnabled?'动作：开':'动作：关';$('wcAnimation').setAttribute('aria-pressed',String(motionEnabled));paintMotion();startMotion()};
 $('wcArtRetry').onclick=()=>{motionRenderer?.resetFailures();$('wcPortrait').dataset.artSource='';$('wcRecovery').dataset.artSource='';paintMotion()};
 $('wcLetters').onclick=()=>onCare?.('letters');
 document.addEventListener('visibilitychange',()=>{if(!layer||layer.hidden)return;if(document.hidden){clearInterval(motionTimer);paintMotion(true);lastWorld=null;transit=null}else{update();startMotion()}});
 root.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',()=>{paintMotion();startMotion()});

 const official=$('timerSubject');const subject=$('wcSubject');
 if(official){for(const option of official.options){const elem=document.createElement('option');elem.value=option.value;elem.textContent=option.textContent;subject.append(elem)}subject.value=official.value}
 subject.addEventListener('change',()=>{subject.dataset.touched='1'});
 $('wcMinutes').addEventListener('change',()=>{$('wcMinutes').dataset.touched='1'});
 $('wcClose').onclick=close;
 const W=root.WendaoWorld;
 if(W){
  const toggle=()=>{const map=$('wcMap');map.hidden=!map.hidden;$('wcMapToggle').setAttribute('aria-expanded',String(!map.hidden))};
  $('wcMapToggle').onclick=toggle;
  $('wcMapBack').onclick=toggle;
  layer.querySelectorAll('[data-wc-travel]').forEach(btn=>btn.onclick=()=>{
   worldView.player=btn.dataset.wcTravel;
   saveWorldView();
   $('wcMap').hidden=true;$('wcMapToggle').setAttribute('aria-expanded','false');
   travelNotice('已前往'+W.LOCATIONS.find(x=>x.id===worldView.player).name+'。');update();
  });
  $('wcFindSister').onclick=()=>{
   const d=W.derive({at:Date.now(),state:getCharacter?.()||{},focus:focusState(),playerPlace:worldView.player,following:worldView.following});
   worldView.player=d.sister;saveWorldView();travelNotice('你来到'+d.sisterLocation.name+'，见到了姐姐。');update();
  };
  $('wcFollow').onclick=()=>{
   if(worldView.following){worldView.following=false;saveWorldView();travelNotice('姐姐继续按自己的日程行动。');update();return}
   const d=W.derive({at:Date.now(),state:getCharacter?.()||{},focus:focusState(),playerPlace:worldView.player,following:false});
   if(!d.canFollow){travelNotice(d.unwell?'姐姐还在疗伤，不宜离开寝居。':'姐姐此时需要休息或处理自己的事，暂不同行。');return}
   if(!d.together){travelNotice('请先去找姐姐，再邀请她同行。');return}
   worldView.following=true;saveWorldView();travelNotice('姐姐答应暂且与你同行。');update();
  };
 }
 $('wcStart').onclick=()=>{try{bridge.focusAction('start',{minutes:Number($('wcMinutes').value),subject:subject.value});finished=false;update()}catch(e){bridge.toast?.('未开始专注：'+e.message)}};
 $('wcPause').onclick=()=>{try{const state=focusState();bridge.focusAction(state.running?'pause':'resume');update()}catch(e){bridge.toast?.('未能操作计时器：'+e.message)}};
 $('wcCare').onclick=()=>onCare?.('care');$('wcTalk').onclick=()=>onCare?.('talk');$('wcStatus').onclick=()=>onCare?.('status');$('wcReset').onclick=()=>{bridge.focusAction('reset');update()};
 $('wcGoTimer').onclick=()=>{close();onFocusPage?.()};
}
function open(){
 if(!layer)return;
 layer.hidden=false;layer.parentElement?.classList.add('wd-companion-active');lastPortraitSrc='';const focus=focusState();if(focus.id)activeID=focus.id;
 update();startMotion();$('wcStart').focus();clearInterval(interval);interval=setInterval(()=>{if(!document.hidden)update()},4000);
}
function close(){if(!layer)return;clearInterval(motionTimer);paintMotion(true);$('wcRecovery').hidden=true;lastWorld=null;transit=null;if($('wcMap'))$('wcMap').hidden=true;if($('wcMapToggle'))$('wcMapToggle').setAttribute('aria-expanded','false');layer.hidden=true;layer.parentElement?.classList.remove('wd-companion-active');clearInterval(interval);interval=null;onClose?.();$('wdCompanion')?.focus()}
function refresh(){if(layer&&!layer.hidden)update()}
root.WendaoCompanion={mount,open,close,refresh,selectAction,getWorldView:()=>layer&&!layer.hidden&&!document.hidden?{...worldView}:null,isOpen:()=>!!layer&&!layer.hidden};
})(typeof window!=='undefined'?window:globalThis);
