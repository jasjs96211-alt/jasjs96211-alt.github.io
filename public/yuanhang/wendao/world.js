/* Wendao v1.6 world exploration: presentation state ONLY. No DDL, study, RPG, AI or cloud writes. */
(function(root){
'use strict';
const LOCATIONS=Object.freeze([
 Object.freeze({id:'study',name:'学宫书房',short:'书房',detail:'案上仍有未抄完的医札。',spot:'书案'}),
 Object.freeze({id:'herbs',name:'青溪药庐',short:'药庐',detail:'药香沿着廊檐缓缓散开。',spot:'药架'}),
 Object.freeze({id:'garden',name:'听竹小庭',short:'竹庭',detail:'风从竹梢穿过，落了一地细影。',spot:'竹窗'}),
 Object.freeze({id:'corridor',name:'学宫回廊',short:'回廊',detail:'长廊连通书房与庭院。',spot:'竹窗'}),
 Object.freeze({id:'bedroom',name:'知遥寝居',short:'寝居',detail:'榻上备着温水与药盏。',spot:'榻边'}),
 Object.freeze({id:'terrace',name:'望星台',short:'望星台',detail:'更远处是起伏的山影。',spot:'竹窗'})
]);
const byId=Object.fromEntries(LOCATIONS.map(p=>[p.id,p]));
const TZ='Asia/Shanghai';
function parts(at){
 const timestamp=Number(at);
 const d=new Date(Number.isFinite(timestamp)?timestamp:0);
 const entries=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',year:'numeric',month:'2-digit',day:'2-digit',hourCycle:'h23'}).formatToParts(d);
 const vals=Object.fromEntries(entries.filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
 return {hour:vals.hour,minute:vals.minute,day:vals.year*10000+vals.month*100+vals.day};
}
function phase(at){
 const p=parts(at),minute=p.hour*60+p.minute;
 return minute>=300&&minute<420?'dawn':minute>=420&&minute<1020?'day':minute>=1020&&minute<1140?'dusk':'night';
}
const phaseNames={dawn:'晨曦',day:'白日',dusk:'薄暮',night:'夜深'};
function injury(state){
 const label=state?.portrait?.state;
 return label==='injured'||label==='ill'||state?.vitals?.acuteInjury===true||state?.vitals?.seriousInjury===true;
}
function scheduleActivity(state,at,focus){
 const p=parts(at),v=state?.vitals||{},label=state?.portrait?.state||'normal';
 const ill=injury(state),low=(Number.isFinite(v.stamina)&&v.stamina<32)||(Number.isFinite(v.mp)&&v.mp<=10)||label==='tired';
 const recent=state?.schedule;
 if(recent?.projection)return {place:recent.location,title:recent.title,text:recent.text,spot:byId[recent.location]?.spot||'榻边',eventId:recent.eventId,sleeping:recent.sleeping,valid:recent.valid};
 if(ill){
  return {place:'bedroom',title:label==='injured'?'卧榻静养':'卧榻休养',text:'她留在榻上安静歇息，不勉强走动。',spot:'榻边'};
 }
 if(low){
  return {place:'bedroom',title:'按时歇息',text:'她收起手里的事，先养足精神。',spot:'榻边'};
 }
 if(recent&&Number.isFinite(recent.at)&&at>=recent.at&&at-recent.at<90*60000){
  if(recent.kind==='rest')return {place:'bedroom',title:'依约温养',text:recent.text||'她暂且休息。',spot:'榻边'};
  if(recent.kind==='pressure')return {place:'study',title:'查阅温家来函',text:recent.text||'她正在书房整理来函。',spot:'书案'};
  if(recent.kind==='study')return {place:'study',title:'自主研习医理',text:recent.text||'她正在书房钻研自己的医理问题。',spot:'书案'};
  if(recent.kind==='social')return {place:'corridor',title:'处理往来信札',text:recent.text||'她在回廊整理往来信札。',spot:'竹窗'};
 }
 if(Number.isFinite(v.mood)&&v.mood<25&&p.hour>=8&&p.hour<19)return {place:'garden',title:'独自在竹庭静心',text:'她心事有些重，暂时到庭中安静片刻。',spot:'竹窗'};
 if(p.hour>=22||p.hour<6)return {place:'bedroom',title:'夜间安寝',text:'烛火已低，姐姐也有自己的休息时间。',spot:'榻边'};
 const activities=p.hour<9?[
   {place:'garden',title:'看晨间竹色',text:'她在庭中停了一会儿，看看新叶。',spot:'竹窗'},
   {place:'herbs',title:'晨起检药',text:'她核对晒好的药材，整理一日的药单。',spot:'药架'}
  ]:p.hour>=19?[
   {place:'study',title:'夜读医书',text:'她挑亮案边的灯，继续校读医札。',spot:'书案'},
   {place:'corridor',title:'沿廊散步',text:'她活动片刻，便准备回房。',spot:'竹窗'},
   {place:'bedroom',title:'夜间调息',text:'她回寝居歇息，今日不再强求。',spot:'榻边'}
  ]:[
   {place:'study',title:'翻检医书',text:'她在书案上比对两页药方。',spot:'书案'},
   {place:'herbs',title:'分拣药材',text:'她独自核对药签，把草药摆放整齐。',spot:'药架'},
   {place:'garden',title:'侍弄庭竹',text:'她离开书案，看看竹叶和天色。',spot:'竹窗'},
   {place:'corridor',title:'沿廊行走',text:'她穿过回廊，去处理自己的事情。',spot:'竹窗'},
   {place:'terrace',title:'远眺山色',text:'她在高处略作停留，不急着回去。',spot:'竹窗'}
  ];
 // Deterministic 20-minute slots; reload/cross-device derives the same autonomous location.
 return activities[Math.floor(at/1200000+p.day)%activities.length];
}
function derive({at=Date.now(),state={},focus={},playerPlace='study',following=false}={}){
 const clockDispute=state?.vitals?.clockDispute===true||state.schedule?.blocked===true;if(clockDispute)at=Number.isFinite(state.validAt)?state.validAt:0;
 const player=byId[playerPlace]?playerPlace:'study';
 const base=scheduleActivity(state,at,focus),unwell=injury(state),p=parts(at),v=state?.vitals||{};
 const busy=state.schedule?.kind==='pressure'&&Number.isFinite(state.schedule.at)&&at>=state.schedule.at&&at-state.schedule.at<90*60000;
 const canFollow=!state.schedule?.projection&&!clockDispute&&!busy&&!unwell&&p.hour>=7&&p.hour<22&&!(Number.isFinite(v.stamina)&&v.stamina<32)&&!(Number.isFinite(v.mp)&&v.mp<=10);
 const follows=!!following&&canFollow;
 const sister=follows?player:base.place;
 return {
  player,sister,following:follows,canFollow,
  together:sister===player,activity:follows?{...base,place:player,title:'与妹妹同行',text:'她放下手边事情，与你一道走走。'}:base,
  phase:phase(at),phaseName:phaseNames[phase(at)],
  location:byId[player],sisterLocation:byId[sister],locations:LOCATIONS,
  unwell,clockDispute,busy
 };
}
const UI_KEY='yuanhang_wendao_world_view_v1';
function readView(storage){
 try{const v=JSON.parse(storage?.getItem(UI_KEY)||'null');return {player:byId[v?.player]?v.player:'study',following:v?.following===true}}
 catch{return {player:'study',following:false}}
}
function writeView(storage,view){
 try{storage?.setItem(UI_KEY,JSON.stringify({player:byId[view.player]?view.player:'study',following:view.following===true}));return true}
 catch{return false}
}
root.WendaoWorld=Object.freeze({LOCATIONS,phase,parts,injury,derive,readView,writeView,UI_KEY});
})(typeof window!=='undefined'?window:globalThis);
