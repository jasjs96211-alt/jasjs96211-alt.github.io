import {createLifeSceneBridge} from '../../wendao/scene3d/life-bridge.js';
import {createRoutineDemo} from './routine-demo.js';
import {allowsActivity} from '../../wendao/scene3d/interactions.js';
import {adaptCharacterVisualState, selectNarrativeArt} from '../../wendao/scene3d/character-visual-state.js';
const artURLs = globalThis.WENDAO_REVIEW_ART || {};
const artSource = name => artURLs[name] || new URL('../../wendao/scene3d/art/reference/' + name, location.href).href;
const $ = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let lifeBridge=null,routine=null;
let stage = null, factory = null, failed = false, lamp = true, generation = 0;
let phase = 'day', condition = 'healthy', demo = null, lastMetrics = 0;
const phaseNames = {dawn: '晨曦 · 低窗光', day: '白日 · 窗光', dusk: '薄暮 · 点灯', night: '夜深 · 月光与暖灯'};
const shotNames = {wide: ['01 / SPACE', '空间全景'], bedside: ['02 / CONTACT', '榻边中景'], front: ['03 / PORTRAIT', '正面微俯']};
function mark(selector, key, value) {all(selector).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[key] === value)));}
function stopDemo() {demo = null; $('demo-progress').hidden = true; $('demo').textContent = '45 秒空间巡览';}
function snapshot() {
  const state = {portrait: {state: ['ill', 'injured'].includes(condition) ? condition : 'normal'}, vitals: {clockDispute: condition === 'clock'}};
  return {world: {player: 'bedroom', sister: condition === 'absent' ? 'study' : 'bedroom', together: condition !== 'absent', phase},
    state, sisterSleeping: condition === 'sleep', permittedPoses: condition === 'healthy' ? ['walk', 'seated'] : []};
}
let lastArt = '', lastFact = '';
function showCharacterState(visual) {
  const art = selectNarrativeArt(visual);
  const names = {healthy: '清醒', injured: '重伤', ill: '病中', tired: '倦怠'};
  const poses = {walk: '站立 / 走动', seated: '半坐', reclined: '卧床'};
  const key = JSON.stringify(art);
  if (key !== lastArt) {
    lastArt = key; $('narrative-art').hidden = !art.visible; $('art-absence').hidden = art.visible;
    if (art.path) $('narrative-art').src = artSource(art.path);
    $('art-caption').textContent = !art.visible ? '人物不在场，原画一同隐藏' : art.kind === 'narrative-cg' ? '卧床 CG · 共用人物事实' : '角色状态原立绘 · 姿势不等同于三维代理';
  }
  const fact = !visual.present ? '温知遥 · 不在寝居' : `温知遥 · ${names[visual.health.stage]}${visual.sleeping ? ' · 睡眠' : ''} · ${poses[visual.pose]} · ${visual.hair === 'loose' ? '披发设定' : '日常半束发设定'}`;
  if (fact !== lastFact) {$('identity-state').textContent = fact; lastFact = fact;}
}
function apply() {
  const f = stage && !failed ? lifeBridge.setSnapshot(snapshot()) : adaptCharacterVisualState(snapshot()); showCharacterState(f);
  if (!stage || failed) return;
  all('[data-activity]').forEach(b => b.disabled = !f.canMove || !allowsActivity(f, b.dataset.activity));
  $('enter').disabled = !f.canMove;
  document.querySelector('[data-pose="seated"]').disabled = !f.canSit;
  document.querySelector('[data-pose="reclined"]').disabled = !f.canMove;
  $('phase-label').textContent = phaseNames[phase]; mark('[data-phase]', 'phase', phase);
  $('status').textContent = !f.present ? '人物地点在别处，寝居保持空景。' : f.sleeping ? '睡眠只读模拟：代理卧床，不触发唤醒。' : f.severe ? '重伤只读模拟：禁止起身和走动。' : f.weak ? '病中只读模拟：本灰盒保守卧床。' : f.clockHold ? '时间待核对：停止自主动作。' : '代理用于检查体积和接触；正式人物美术尚未接入。';
}
function camera(id) {if (!stage) return; stage.camera(id); mark('[data-camera]', 'camera', id); $('shot-index').textContent = shotNames[id][0]; $('shot-title').textContent = shotNames[id][1];}
function setPhase(id) {phase = id; apply();}
function failure(message) {
  failed = true; stopDemo(); $('fallback').hidden = false;
  const visual = stage?.visualState || adaptCharacterVisualState(snapshot()), art = selectNarrativeArt(visual);
  showCharacterState(visual);
  $('failure-text').textContent = 'WebGL 未能启动，本页没有显示替代图片。可重新加载。原因：' + message;
  $('metrics').textContent=JSON.stringify({status:'failed',fps:null,error:message},null,2);
  $('status').textContent = '三维尚未验证成功。';
  all('.controls button, .controls input, .technical button, .technical input, .technical select').forEach(b => b.disabled = true);
}
let lastActionStatus='';
function onFrame({time, visualState, activity, phase:actionPhase, busy, cancelling}) {
  lifeBridge.tick({paused:$('pause').checked});routine.update(time);
  const routineState=routine.state;
  $('routine').textContent=routineState.active?'停止日常排演':'日常生活排演';
  $('routine').disabled=!routineState.active&&(!visualState.canMove||busy);
  $('routine-status').textContent=routineState.active?`示例 ${routineState.step}/${routineState.total} · ${routineState.label}${routineState.phase==='dwelling'?' · 稍作停留':''}`:routineState.phase==='complete'?'这一段日常已结束。':routineState.phase==='idle'?'自动串联看书、取药演示与回榻休息；不影响正式游戏。':'排演已停下，重新开始才会继续。';
  showCharacterState(visualState);
  $('cancel-action').disabled=!busy||cancelling;
  all('[data-activity], [data-pose], #enter').forEach(b=>b.disabled=busy||!visualState.canMove||(b.dataset.activity&&!allowsActivity(visualState,b.dataset.activity)));
  const key=activity+':'+actionPhase+':'+cancelling;
  if(key!==lastActionStatus && activity) {
    lastActionStatus=key;
    $('status').textContent=cancelling?'正在安全停稳，随后取消。':actionPhase==='complete'?'动作已完成，可以继续下一项。占位演示不结算游戏效果。':actionPhase==='cancelled'?'行动已取消，可以重新选择。':'当前：'+actionPhase+' · 占位动作演示';
  }
  if (demo) {
    const elapsed = time - demo.start;
    while (demo && demo.index < demo.cues.length && elapsed >= demo.cues[demo.index][0]) {
      const [, action] = demo.cues[demo.index++]; action();
    }
    $('demo-progress').style.width = Math.min(100, elapsed / 45 * 100) + '%';
    if (elapsed >= 45) stopDemo();
  }
  if (performance.now() - lastMetrics > 1000) {lastMetrics = performance.now(); $('metrics').textContent = JSON.stringify({...stage.telemetry(),lifeScene:lifeBridge.observation()}, null, 2);}
}
async function boot() {
  const current = ++generation; stopDemo();routine?.stop();
  if (stage) {stage.dispose(); const old = $('scene'); old.replaceWith(old.cloneNode(false));}
  stage = null; failed = false;
  try {
    factory ||= (await import('../../wendao/scene3d/scene-manager.js')).createBedroomScene;
    if (current !== generation) return;
    stage = factory($('scene'), {low: $('low').checked, reducedMotion: reduced.matches, onFailure: failure});
    lifeBridge=createLifeSceneBridge(stage);routine=createRoutineDemo(lifeBridge);
    lifeBridge.setVisible(!document.hidden);
    stage.motion($('motion').checked); stage.pause($('pause').checked); stage.lamp(lamp); stage.brightness(Number($('brightness').value)); stage.onFrame(onFrame);
    apply(); camera('wide'); stage.start();
  } catch (e) {if (current === generation) failure(String(e.message || e));}
}
all('[data-activity]').forEach(b => b.addEventListener('click', () => {stopDemo(); camera('wide'); if (lifeBridge?.manualRequest(b.dataset.activity)) $('status').textContent = b.textContent + '：开始连续行动，不结算游戏效果。';}));
all('[data-camera]').forEach(b => b.addEventListener('click', () => {stopDemo(); camera(b.dataset.camera);}));
all('[data-phase]').forEach(b => b.addEventListener('click', () => {stopDemo(); setPhase(b.dataset.phase);}));
all('[data-pose]').forEach(b => b.addEventListener('click', () => {stopDemo(); if (lifeBridge?.manualRequest('lie',{bedSeat:b.dataset.pose==='seated'})) $('status').textContent = '开始床边过渡；当前仍为占位关节演示。';}));
$('enter').addEventListener('click', () => {stopDemo(); camera('wide'); if (lifeBridge?.manualRequest('walk',{entry:true})) $('status').textContent = '门后 → 屏风后 → 绕行 → 床侧；临时运动代理，正式步态待制作。';});
$('cancel-action').addEventListener('click',()=>{stopDemo();routine?.stop();stage?.cancelActivity();});
$('condition').addEventListener('change', event => {stopDemo(); routine?.stop();condition = event.target.value; apply();});
$('routine').addEventListener('click',()=>{stopDemo();camera('wide');if(routine.state.active)routine.stop();else routine.start();});
document.addEventListener('visibilitychange',()=>{lifeBridge?.setVisible(!document.hidden);});
$('lamp').addEventListener('click', () => {stopDemo(); lamp = !lamp; stage?.lamp(lamp); $('lamp').setAttribute('aria-pressed', String(lamp)); $('lamp').textContent = lamp ? '灯火开' : '灯火关';});
function setBrightness(value) { const n=Math.min(150,Math.max(80,Number(value)||100)); $('brightness').value=String(n); $('brightness-value').textContent=n+'%'; stage?.brightness(n); }
$('brightness').addEventListener('input',event=>setBrightness(event.target.value));
$('brightness-reset').addEventListener('click',()=>setBrightness(100));
$('motion').addEventListener('change', () => {stopDemo(); stage?.motion($('motion').checked); apply();});
$('pause').addEventListener('change', () => stage?.pause($('pause').checked));
$('low').addEventListener('change', boot);
$('retry').addEventListener('click', () => location.reload());
$('demo').addEventListener('click', () => {
  if (demo) {stopDemo(); return;}
  routine?.stop();
  condition = 'healthy'; $('condition').value = condition; phase = 'day'; lamp = true; $('lamp').textContent = '灯火开'; $('lamp').setAttribute('aria-pressed', 'true');
  $('pause').checked = false; stage.pause(false); stage.lamp(true); apply(); camera('wide');
  const cues = [
    [2, () => {lifeBridge.manualRequest('lie');}],
    [19, () => camera('bedside')],
    [25, () => camera('front')], [31, () => {setPhase('night'); camera('bedside');}],
    [36, () => {stage.lamp(false); $('status').textContent = '暖灯已关闭：观察近处桌面与地板受光。';}],
    [39, () => {stage.lamp(true); $('status').textContent = '暖灯恢复：同一几何房间中的局部照明。';}],
    [42, () => camera('wide')]
  ];
  demo = {start: stage.time, index: 0, cues}; $('demo-progress').hidden = false; $('demo').textContent = '停止巡览';
});
$('download').addEventListener('click', () => {
  if (!stage) return;
  const report = {capturedAt: new Date().toISOString(), userAgent: navigator.userAgent, actualBrowserRun: true,
    screenshot: false, recording: false, iPhoneVerified: /iPhone/.test(navigator.userAgent) ? 'user-run, visual review still required' : false,
    measurements: {...stage.telemetry(),lifeScene:lifeBridge.observation()}, note: 'Actual device telemetry, not a visual acceptance or screen recording.'};
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], {type: 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = 'bedroom-space-device-report.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
reduced.addEventListener('change', () => {stopDemo(); $('motion').checked = !reduced.matches; $('motion').disabled = reduced.matches; boot();});
window.addEventListener('pagehide', () => {stopDemo();lifeBridge?.setVisible(false);stage?.stop();});
window.addEventListener('pageshow', event => {if (event.persisted) {lifeBridge?.setVisible(!document.hidden);stage?.start();}});
if (reduced.matches) {$('motion').checked = false; $('motion').disabled = true;}
$('low').checked = matchMedia('(max-width: 700px)').matches;
apply();
boot();
