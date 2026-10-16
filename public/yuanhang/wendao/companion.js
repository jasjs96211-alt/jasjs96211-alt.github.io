/* Wandering study companion: presentation-only. Never fabricates study minutes or AI events. */
(function(root){
'use strict';
const STATES={
 normal:[['书案','研读医书','姐姐在书案前翻检医理，偶尔提笔记下两行。'],['药架','整理药草','她起身去药架，慢慢将晾好的药草分类。'],['竹窗','窗边稍歇','她走到竹窗旁，望一眼院里的光影。'],['书案','誊写笔记','她回到桌前，继续整理方才想到的问题。']],
 concerned:[['书案','核对书页','她反复核对净灵殿的记录，眉心微蹙。'],['竹窗','留心院外','她在窗边停了一会儿，听着廊下的动静。'],['书案','研究规约','她把几条规约抄下，准备另寻办法。']],
 tired:[['书案','慢读医书','她翻书翻得比平时慢些，不再勉强赶进度。'],['榻边','歇一歇','她放下书卷，靠着软枕缓缓调息。'],['书案','整理小札','休息片刻，她才又写下一两句心得。']],
 ill:[['榻边','卧榻休养','姐姐今日旧伤未愈，靠在榻边慢慢调息。'],['榻边','喝水歇息','她接过温水，缓了缓气息，没有强撑着起身。'],['榻边','翻阅薄册','她只翻了几页薄薄的医札，便合上书休息。']],
 injured:[['榻边','静养伤势','她伤势仍重，此时最需要的是安静休养。'],['榻边','调整呼吸','她慢慢换了个靠姿，暂时不宜修炼。'],['榻边','闭目休息','屋里静了下来，她终于肯闭目歇息。']],
 relieved:[['书案','整理心得','她将新写的几页医理笔记摊平，神色比前些日子轻快。'],['药架','侍弄药草','她去药架旁挑拣嫩叶，动作轻快了些。'],['竹窗','看看天色','姐姐在窗前停步，像是想起什么趣事，轻轻一笑。']]
};
const $=id=>document.getElementById(id);
let layer=null,bridge=null,getCharacter=null,onFocusPage=null,interval=null,wasActive=false,finished=false,lastPortraitSrc='';
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
 const timer=focusState(),active=!!timer.id,elapsed=active?Math.max(0,(timer.total||0)-(timer.remaining||0)):0;
 if(active){wasActive=true;finished=false}else if(wasActive){finished=true;wasActive=false}
 const act=selectAction(portrait,elapsed,!timer.running);
 const actor=$('wcActor'),photo=$('wcPortrait');
 actor.dataset.place=act.place;
 if(portrait.src){
  if(lastPortraitSrc!==portrait.src){lastPortraitSrc=portrait.src;photo.src=portrait.src;photo.alt='温知遥 · '+portrait.label}
  photo.hidden=false;$('wcArtHint').hidden=true;
 }else{photo.hidden=true;$('wcArtHint').hidden=false;$('wcArtHint').textContent='当前状态立绘暂未加载';lastPortraitSrc=''}
 $('wcName').textContent='温知遥 · '+(portrait.label||'日常');
 $('wcActivity').textContent=act.title;
 $('wcDescription').textContent=act.text;
 $('wcTime').textContent=clock(timer.remaining);
 $('wcTrack').textContent=active?(timer.subject||'本次修炼')+' · '+(timer.running?'专注进行中':'已暂停'):finished?'本轮计时已结束 · 请查看学习记录':'与姐姐各自读书，不必时时交谈';
 const start=$('wcStart'),pause=$('wcPause'),setup=$('wcSetup');
 setup.hidden=active;pause.hidden=!active;start.hidden=active;
 pause.textContent=timer.running?'Ⅱ 暂停':'▶ 继续';
 $('wcFinish').textContent=finished?'本轮已结束，若计时正常完成，学习分钟数由远航原计时器入账。':'仅使用远航原计时器；离开场景也不影响正在进行的专注。';
 const options=$('wcMinutes').querySelectorAll('option');
 if(!active&&options.length&&[1500,2700,3600].includes(timer.total))$('wcMinutes').value=String(timer.total/60);
 if(!active){
  const chosen=$('wcSubject');
  if(!chosen.dataset.touched){
   const official=document.getElementById('timerSubject');
   if(official&&[...chosen.options].some(x=>x.value===official.value))chosen.value=official.value;
  }
 }
}
function mount({stage,focusBridge,getCharacterState,onFocusPage:focusPage}={}){
 if(layer)return;
 bridge=focusBridge;getCharacter=getCharacterState;onFocusPage=focusPage;
 layer=document.createElement('section');
 layer.id='wdCompanionLayer';layer.className='wd-companion';layer.hidden=true;
 layer.setAttribute('aria-label','问道 · 陪伴修炼');
 layer.innerHTML='<div class="wc-sky"><span>竹窗书房</span><span>灯下各有所学</span></div>'+
 '<div class="wc-world" aria-hidden="true"><span class="wc-spot wc-spot-window">竹窗</span><span class="wc-spot wc-spot-desk">书案</span><span class="wc-spot wc-spot-herbs">药架</span><span class="wc-spot wc-spot-bed">榻边</span>'+
 '<div id="wcActor" class="wc-actor" data-place="书案"><img id="wcPortrait" alt="温知遥立绘"><span id="wcArtHint" hidden></span></div></div>'+
 '<div class="wc-panel"><header class="wc-heading"><div><small id="wcName">温知遥</small><h2 id="wcActivity">研读医书</h2><p id="wcDescription"></p></div><button type="button" id="wcClose" aria-label="返回剧情书房">返回书房 ×</button></header>'+
 '<div class="wc-timer"><strong id="wcTime">25:00</strong><span id="wcTrack">准备开始</span></div>'+
 '<div id="wcSetup" class="wc-setup"><label>修炼科目 <select id="wcSubject"></select></label><label>本轮时长 <select id="wcMinutes"><option value="25">25 分钟</option><option value="45">45 分钟</option><option value="60">60 分钟</option></select></label></div>'+
 '<div class="wc-buttons"><button type="button" id="wcStart">▶ 开始与姐姐一同修炼</button><button type="button" id="wcPause" hidden>Ⅱ 暂停</button><button type="button" id="wcGoTimer">打开原专注页</button></div>'+
 '<p id="wcFinish" class="wc-caveat">仅使用远航原计时器，不会重复计入学习时间。</p></div>';
 stage.append(layer);
 const official=$('timerSubject');const subject=$('wcSubject');
 if(official){for(const option of official.options){const elem=document.createElement('option');elem.value=option.value;elem.textContent=option.textContent;subject.append(elem)}subject.value=official.value}
 subject.addEventListener('change',()=>{subject.dataset.touched='1'});
 $('wcClose').onclick=close;
 $('wcStart').onclick=()=>{try{bridge.focusAction('start',{minutes:Number($('wcMinutes').value),subject:subject.value});finished=false;update()}catch(e){bridge.toast?.('未开始专注：'+e.message)}};
 $('wcPause').onclick=()=>{try{const state=focusState();bridge.focusAction(state.running?'pause':'resume');update()}catch(e){bridge.toast?.('未能操作计时器：'+e.message)}};
 $('wcGoTimer').onclick=()=>{close();onFocusPage?.()};
}
function open(){
 if(!layer)return;
 layer.hidden=false;lastPortraitSrc='';const focus=focusState();if(focus.id)wasActive=true;
 update();clearInterval(interval);interval=setInterval(()=>{if(!document.hidden)update()},4000);
}
function close(){if(!layer)return;layer.hidden=true;clearInterval(interval);interval=null}
function refresh(){if(layer&&!layer.hidden)update()}
root.WendaoCompanion={mount,open,close,refresh,selectAction};
})(typeof window!=='undefined'?window:globalThis);
