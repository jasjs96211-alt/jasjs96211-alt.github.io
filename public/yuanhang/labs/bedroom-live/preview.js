/* Isolated art preview: no storage, business engine, network AI or study bridge. */
'use strict';
const $=id=>document.getElementById(id),A=window.WendaoBedroomArt,B=window.WendaoBedroom;
let behavior,night=true,severe=false,present=true,paused=false,intent=null,last=0,previous='',line=0;
const lines=['你来了。','我在这儿。','别担心，我只是有些乏。','过来坐一会儿吧。','方才歇着，倒教你惦记了。'];
const art=A.create({canvas:$('scene'),baseURL:'../../wendao/assets/',onReady(){behavior=B.create({manifest:art.manifest()});requestAnimationFrame(frame)},onError(){$('title').textContent='画面暂未加载';$('description').textContent='请刷新后重试。'}});
function frame(time){requestAnimationFrame(frame);if(!behavior||time-last<1000/30)return;last=time;
 const at=Date.now(),s=behavior.tick({at,state:{portrait:{state:severe?'injured':'ill'},vitals:{seriousInjury:true,acuteInjury:severe},recoveryCGAllowed:true},world:{sister:'bedroom',player:present?'bedroom':'study',together:present},focus:{id:null,running:false},hidden:document.hidden||!present,reducedMotion:paused||matchMedia('(prefers-reduced-motion:reduce)').matches,intent});intent=null;
 art.render(s,{night,time,animate:!paused&&!matchMedia('(prefers-reduced-motion:reduce)').matches});$('title').textContent=present?s.title:'暂离寝居';$('description').textContent=present?s.text:'再回来时，她会按当前身体状态回应。';$('touch').hidden=!present;
 const r=s.reaction,key=r?r.cue+':'+r.kind:'';if(key&&key!==previous)$('response').textContent=severe?'':r.cue==='entry'?'你来了。':lines[line++%lines.length];previous=key;$('response').hidden=!key||severe||s.motion.smileWeight<.12;
}
$('touch').onclick=()=>{intent='look'};$('enter').onclick=()=>{present=!present;$('enter').textContent=present?'离开寝居':'进入寝居'};
$('night').onclick=()=>{night=!night;$('night').textContent=night?'夜间':'白日';$('night').setAttribute('aria-pressed',String(night))};
$('injury').onclick=()=>{severe=!severe;$('injury').textContent=severe?'重伤 · 静养':'病中 · 虚弱';$('injury').setAttribute('aria-pressed',String(severe))};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'恢复动作':'暂停动作';$('pause').setAttribute('aria-pressed',String(paused))};
for(const[id,name]of [['study','学宫书房'],['herbs','青溪药庐'],['garden','听竹小庭'],['corridor','学宫回廊'],['bedroom','知遥寝居'],['terrace','望星台']]){const f=document.createElement('figure'),i=document.createElement('img'),cap=document.createElement('figcaption');i.src='../../wendao/assets/world-'+id+'-night-v1.webp';i.alt=name+' · 夜景';i.loading='lazy';cap.textContent=name;f.append(i,cap);$('nights').append(f)}
void art.load();
