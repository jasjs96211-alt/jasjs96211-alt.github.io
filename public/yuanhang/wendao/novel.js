/* Presentation state only. Never settles DDL, awards study, heals, or executes AI effects. */
(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const safeKey=k=>typeof k==='string'&&k.length<=300&&!['__proto__','constructor','prototype'].includes(k);
function ensure(s){s.novel??={version:1,views:{},slots:{},flags:{},effects:[],preferences:{textSpeed:30},current:null};return s.novel}
function valid(v){
 if(v===undefined)return true;const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const view=x=>obj(x)&&safeKey(x.chapter)&&safeKey(x.node)&&Number.isFinite(x.updatedAt)&&Array.isArray(x.trail)&&x.trail.length<=500&&x.trail.every(safeKey);
 return obj(v)&&v.version===1&&obj(v.views)&&Object.entries(v.views).every(([k,x])=>safeKey(k)&&view(x))&&obj(v.slots)&&Object.entries(v.slots).every(([k,x])=>/^[1-6]$/.test(k)&&view(x)&&typeof x.title==='string')&&obj(v.flags)&&Object.entries(v.flags).every(([k,x])=>safeKey(k)&&typeof x==='boolean')&&Array.isArray(v.effects)&&v.effects.every(x=>obj(x)&&safeKey(x.id))&&obj(v.preferences)&&(!v.current||view(v.current));
}
function merge(a,b){
 const n=copy(a||{version:1,views:{},slots:{},flags:{},effects:[],preferences:{textSpeed:30},current:null});if(!b)return n;
 const newest=(x,y)=>!x?copy(y):!y?copy(x):(x.updatedAt||0)>(y.updatedAt||0)?copy(x):(x.updatedAt||0)<(y.updatedAt||0)?copy(y):copy(JSON.stringify(x)<JSON.stringify(y)?x:y);
 for(const k of ['views','slots'])for(const [id,row]of Object.entries(b[k]||{}))n[k][id]=newest(n[k][id],row);
 n.effects=[...new Map([...(n.effects||[]),...(b.effects||[])].map(x=>[x.id,x])).values()].sort((x,y)=>x.id.localeCompare(y.id));
 n.flags={...b.flags,...n.flags};n.current=newest(n.current,b.current);return n;
}
function condition(s,r={},E,study={},at=Date.now()){
 if(!E.eligible(s,{requires:r},study,at))return false;
 const f=ensure(s).flags;return (!r.flag||f[r.flag]===true)&&(!r.notFlag||!f[r.notFlag]);
}
function options(s,c,node,E,study,at){return (c.nodes[node].options||[]).map(o=>({...o,available:condition(s,o.requires,E,study,at)}))}
function inferTrail(s,c,target){const queue=[[c.start]],seen=new Set();while(queue.length){const path=queue.shift(),id=path.at(-1);if(id===target)return path;if(seen.has(id))continue;seen.add(id);const n=c.nodes[id];if(!n)continue;const chosen=s.story.choices[c.id+':'+id];const next=[n.next,...(n.options||[]).filter(o=>!chosen||o.id===chosen).map(o=>o.next),...(n.branches||[]).map(b=>b.next)].filter(Boolean);for(const id of next)if(!seen.has(id))queue.push([...path,id]);}return [target]}
function open(s,c,{restart=false,view,at=Date.now()}={}){
 const n=ensure(s),saved=view||(!restart&&n.views[c.id]),cursor=!restart&&s.story.cursors[c.id];
 const node=c.nodes[saved?.node]?saved.node:c.nodes[cursor]?cursor:c.start;
 let trail=(saved?.trail||[]).filter(k=>c.nodes[k]);if(!trail.length||trail.at(-1)!==node)trail=inferTrail(s,c,node);
 const v={chapter:c.id,node,trail,updatedAt:at};n.views[c.id]=v;n.current=copy(v);s.story.current=c.id;s.story.cursors[c.id]=node;return v;
}
function visual(s,c,view,E,at=Date.now()){
 let background='study-room',portrait=null,cg=null;for(const id of view.trail){const n=c.nodes[id];if(!n)continue;if(n.background!==undefined)background=n.background;if(n.portrait!==undefined)portrait=n.portrait;if(n.cg!==undefined)cg=n.cg}
 const current=E.portrait(s,at); // A calm authored expression must never conceal persistent severe injury.
 if(current.state!=='normal')portrait=current.id;else portrait??=current.id;
 return {background,portrait,cg,actors:[{id:'wen-zhiyao',portrait,x:.5,y:1,scale:1,activity:s.character.activity}],sceneId:c.id,nodeId:view.node};
}
const wasRead=(s,c,node)=>s.story.read.some(x=>(typeof x==='object'?x.id:x)===c+':'+node);
function markRead(s,c,node,at=Date.now()){
 const id=c.id+':'+node,n=c.nodes[node];if(!wasRead(s,c.id,node))s.story.read.push({id,chapter:c.id,speaker:n.speaker||'旁白',text:n.text,at});
}
function applyEffects(s,c,node,E,at){
 const n=ensure(s),effects=c.nodes[node].effects||[];
 for(let i=0;i<effects.length;i++){const e=effects[i],id=c.id+':'+node+':'+i;if(n.effects.some(x=>x.id===id))continue;
  if(e.type!=='flag'||!safeKey(e.key)||typeof e.value!=='boolean')throw Error('剧情效果不在白名单内');
  n.flags[e.key]=e.value;n.effects.push({id,at});E.log(s,'scene-effect:'+id,'剧情约定',c.title+' · 已记录阅读选择',at,'scene');
 }
}
function advance(s,c,view,{choice,E,study={},at=Date.now()}={}){
 const node=c.nodes[view.node];if(!node)throw Error('阅读位置无效');let target;
 if(node.options){const chosen=node.options.find(o=>o.id===choice);if(!chosen||!condition(s,chosen.requires,E,study,at))throw Error('这个选项的条件尚未满足');
  const recorded=s.story.choices[c.id+':'+view.node];if(recorded&&recorded!==choice)throw Error('此处已有剧情选择；重读保留原有分支');
  E.choose(s,c.id,view.node,chosen,at);target=chosen.next;
 }else if(node.end){if(!c.eventId)E.finish(s,c.id,at);return {ended:true,view};}
 else{target=(node.branches||[]).find(b=>condition(s,b.requires,E,study,at))?.next||node.next;}
 if(!c.nodes[target])throw Error('剧情跳转目标无效');applyEffects(s,c,view.node,E,at);
 view.node=target;view.trail=[...view.trail,target].slice(-500);view.updatedAt=at;
 ensure(s).views[c.id]=view;ensure(s).current=copy(view);s.story.cursors[c.id]=target;return {ended:false,view};
}
function saveSlot(s,index,c,view,at=Date.now()){
 if(!/^[1-6]$/.test(String(index)))throw Error('存档位无效');ensure(s).slots[index]={...copy(view),title:c.title,updatedAt:at};return ensure(s).slots[index];
}
function loadSlot(s,index,chapters,at=Date.now()){
 const v=ensure(s).slots[index],c=chapters.find(c=>c.id===v?.chapter);if(!v||!c||!c.nodes[v.node])throw Error('存档对应章节未载入，请保留原存档');return {chapter:c,view:open(s,c,{view:v,at})};
}
function eventScene(s,id,E,at=Date.now()){
 const p=s.supervision.deadlines?.punishments.find(x=>x.id===id);if(!p)throw Error('未找到已结算事件');const injury=E.injuryFor(p,at),state=E.portrait(s,at);
 const phase={acute:'急性期',stable:'稳定期，仍需疗养',recovering:'恢复中',healed:'已康复',corrected:'已纠正'}[injury.phase];
 return {id:'event:'+id,eventId:id,title:'纪事回顾 · '+p.title,subtitle:'已结算事件',requires:{},start:'a',nodes:{
 a:{speaker:'纪事',text:'这是一段已经发生的记录：'+p.title+'。\n截止：'+(p.dueAt||p.due)+'。\n只回顾，不重新结算。',background:'study-room',portrait:state.id,next:'b'},
 b:{speaker:'纪事',text:'当前伤势记录：'+phase+'。已有的疗养、求援与纠正记录仍然保留。\n你可以回到书房，和姐姐谈谈眼前的安排。',end:true}
 }};
}
function validateChapter(c,assets){
 const req=r=>{if(!r)return;const allowed=['date','xp','realm','health','pressure','previous','choice','autonomy','flag','notFlag'];if(typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!allowed.includes(k)))throw Error('剧情前置条件无效');for(const k of ['xp','realm','health','pressure','autonomy'])if(r[k]!==undefined&&(!Number.isFinite(r[k])||r[k]<0))throw Error('剧情条件数值无效');if(r.previous&&(!Array.isArray(r.previous)||!r.previous.every(safeKey)))throw Error('前章条件无效');if(r.choice&&(!safeKey(r.choice.key)||!safeKey(r.choice.value)))throw Error('选择条件无效');for(const k of ['flag','notFlag'])if(r[k]&&!safeKey(r[k]))throw Error('剧情标记无效');if(r.date&&!/^\d{4}-\d{2}-\d{2}$/.test(r.date))throw Error('剧情日期无效')};req(c?.requires);
 if(!c||!safeKey(c.id)||!c.nodes||!c.nodes[c.start])throw Error('章节结构无效');
 const keys=Object.keys(c.nodes);if(keys.length>500)throw Error('章节过长');
 for(const n of Object.values(c.nodes)){
  if(n.options){if(!Array.isArray(n.options)||!n.options.length||n.options.length>20)throw Error('选项格式无效');for(const o of n.options){if(!safeKey(o.id)||typeof o.label!=='string'||o.label.length>1000)throw Error('选项格式无效');req(o.requires)}}
  for(const b of n.branches||[])req(b.requires);
  if(typeof n.text!=='string'||n.text.length>5000)throw Error('对白格式无效');
  for(const target of [n.next,...(n.options||[]).map(o=>o.next),...(n.branches||[]).map(b=>b.next)].filter(Boolean))if(!c.nodes[target])throw Error('剧情跳转目标不存在');
  for(const id of [n.background,n.portrait,n.cg].filter(Boolean))if(!assets.some(a=>a.id===id))throw Error('章节引用了未登记资源');
  if(n.options&&new Set(n.options.map(o=>o.id)).size!==n.options.length)throw Error('选项编号重复');
  for(const e of n.effects||[])if(e.type!=='flag'||!safeKey(e.key)||typeof e.value!=='boolean')throw Error('剧情效果不在白名单内');
 }
 return true;
}
root.WendaoNovel={ensure,valid,merge,condition,options,open,visual,wasRead,markRead,advance,saveSlot,loadSlot,eventScene,validateChapter};
})(typeof window!=='undefined'?window:globalThis);
