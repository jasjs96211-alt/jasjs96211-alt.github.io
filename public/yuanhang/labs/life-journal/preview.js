import '../../wendao/engine.js';
import {createLifeJournal} from '../../wendao/life-journal.js';
const E=globalThis.WendaoEngine,J=createLifeJournal(E),M=60000,D=86400000;
const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const places={study:'书房',bedroom:'寝居',corridor:'回廊'},kindPlaces={study:'study',rest:'bedroom',social:'corridor',pressure:'study'};
const placeOf=row=>places[row.location||(['ill','injured'].includes(row.bodyState)?'bedroom':kindPlaces[row.kind])]||'日常';
const time=t=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(t));
const shortDate=t=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric'}).format(new Date(t));
let state,clock,begin,filter='all';
function reset(){
  const scenario=$('scenario').value;
  // All states below are isolated fixtures, never a copy of the player's save.
  const starts={day:'2026-10-25T08:55:00',night:'2026-10-26T22:55:00',letter:'2026-10-26T15:55:00'};
  begin=Date.parse(starts[scenario]+'+08:00');clock=begin;
  state=E.fresh(begin);state.supervision.mode='awake';
  if(scenario==='night'){
    const data={sessions:[],events:[{id:'example-injury',category:'ddl',title:'体验用伤势来源',end:E.day(begin),dueAt:new Date(begin+M).toISOString(),done:false}]};
    E.checkDeadlines(state,data,begin);E.checkDeadlines(state,data,begin+M+1);clock=begin+M+1;
  }
  J.enable(state,clock);filter='all';
  $('chapter-title').textContent={day:'平常的一日',night:'疗养中的一夜',letter:'一次催问之后'}[scenario];
  $('notice').textContent='这一段从 '+time(clock)+' 开始。先过一刻钟，或直接离开到明早。';render();
}
function advance(to,away=false){
  const before=clock;clock=to;
  if(away)state.supervision.mode='sleep';
  E.advanceAutonomy(state,clock);const result=J.advance(state,clock);
  if(away){state.supervision.mode='awake';E.nightRecap(state,clock);filter='night';}
  const elapsed=Math.round((clock-before)/M),label=elapsed>=60?Math.floor(elapsed/60)+'小时'+(elapsed%60?elapsed%60+'分钟':''):elapsed+'分钟';
  $('notice').textContent=away?'你离开了约'+label+'。她按自己的节奏生活；这段休息不会触发学习惩罚。':'时间向前走了'+label+'。'+(result.added.length?'这段日常多了'+result.added.length+'则小记。':'有些时候，安静地继续手边的事就很好。');
  render();
}
function selectedRows(){
  if(filter==='night'){
    const recap=E.nightRecap(state,clock);if(!recap)return [];
    const ids=new Set(E.recapTimeline(state,recap).map(r=>r.eventId));return J.timeline(state,{to:clock}).filter(r=>ids.has(r.id));
  }
  return J.timeline(state,{from:filter==='today'?E.dateAt(E.day(clock)):begin,to:clock});
}
function render(){
  $('date').textContent=shortDate(clock);$('clock').textContent=time(clock);
  const all=J.timeline(state,{from:begin,to:clock}),last=all.at(-1),rows=selectedRows();
  $('place').textContent=last?'最近记录 · '+placeOf(last)+' · '+time(last.at):'尚未落笔';
  $('latest-title').textContent=last?.activity||'日常正要开始';$('latest-text').textContent=last?.text||'让时间向前走一会儿，看看她会留下什么。';
  $('count').textContent=rows.length+' 则';$('export').disabled=!all.length;
  document.querySelectorAll('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===filter)));
  $('timeline').innerHTML=rows.length?rows.map(row=>{
    const parent=state.life.ledger.find(r=>r.id===row.sourceEventId);
    const reason=row.cause?.rule==='health-rest'?'她的身体需要休息，这段日常因此留在寝居。':row.kind==='detail'?'这件小事承接前一段日常，没有另外发生一封来信或一场主线事件。':'这是已有作息中的一项安排。';
    return '<article class="entry"><time datetime="'+new Date(row.at).toISOString()+'"><small>'+esc(shortDate(row.at))+'</small>'+time(row.at)+'</time><div class="entry-content"><h3>'+esc(row.activity)+'</h3><p>'+esc(row.text)+'</p><div class="location">'+esc(placeOf(row))+'</div><details><summary>这则小记的前因</summary><p>'+esc(parent?time(parent.at)+' · '+parent.activity+'。':'')+esc(reason)+'</p></details></div></article>';
  }).join(''):'<div class="empty"><strong>'+(filter==='night'?'还没有可回看的昨夜':'纸上尚未落笔')+'</strong>'+(filter==='night'?'可以离开到明早，再来读她这一夜的近况。':'让时间向前走一会儿。平静的间隙不需要编造事件来填满。')+'</div>';
}
$('quarter').addEventListener('click',()=>advance(clock+15*M));
$('hour').addEventListener('click',()=>advance(clock+60*M));
$('overnight').addEventListener('click',()=>advance(E.dateAt(E.day(clock))+D+8*3600000,true));
$('scenario').addEventListener('change',reset);$('restart').addEventListener('click',reset);
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;render();}));
$('export').addEventListener('click',()=>{
  const rows=J.timeline(state,{from:begin,to:clock});
  const text='# 灯下小记 · 独立体验纪事\n\n示例进度，不是正式游戏存档。\n\n'+rows.map(r=>'## '+shortDate(r.at)+' '+time(r.at)+' · '+r.activity+'\n\n'+r.text).join('\n\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='Wendao-Life-Journal.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
reset();
