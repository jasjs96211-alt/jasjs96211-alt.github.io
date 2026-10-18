import {adaptCharacterVisualState, selectNarrativeArt} from '../../wendao/scene3d/character-visual-state.js';
const artURLs = globalThis.WENDAO_REVIEW_ART || {};
const artSource = name => artURLs[name] || new URL('../../wendao/scene3d/art/reference/' + name, location.href).href;
const $ = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
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
  const f = stage && !failed ? stage.setSnapshot(snapshot()) : adaptCharacterVisualState(snapshot()); showCharacterState(f);
  if (!stage || failed) return;
  $('enter').disabled = !f.canMove || !$('motion').checked || reduced.matches;
  document.querySelector('[data-pose="seated"]').disabled = !f.canSit;
  document.querySelector('[data-pose="reclined"]').disabled = !f.present;
  $('phase-label').textContent = phaseNames[phase]; mark('[data-phase]', 'phase', phase);
  $('status').textContent = !f.present ? '人物地点在别处，寝居保持空景。' : f.sleeping ? '睡眠只读模拟：代理卧床，不触发唤醒。' : f.severe ? '重伤只读模拟：禁止起身和走动。' : f.weak ? '病中只读模拟：本灰盒保守卧床。' : f.clockHold ? '时间待核对：停止自主动作。' : '代理用于检查体积和接触；正式人物美术尚未接入。';
}
function camera(id) {if (!stage) return; stage.camera(id); mark('[data-camera]', 'camera', id); $('shot-index').textContent = shotNames[id][0]; $('shot-title').textContent = shotNames[id][1];}
function setPhase(id) {phase = id; apply();}
function failure(message) {
  failed = true; stopDemo(); $('fallback').hidden = false;
  const visual = stage?.visualState || adaptCharacterVisualState(snapshot()), art = selectNarrativeArt(visual);
  const fallbackImage = document.querySelector('#fallback img');
  fallbackImage.hidden = !art.visible;
  if (art.path) fallbackImage.src = artSource(art.path);
  showCharacterState(visual);
  $('failure-text').textContent = (art.visible ? '三维试验未能运行，当前为同一状态对应的原画。' : '三维试验未能运行，人物不在寝居。') + '可重新加载。原因：' + message;
  $('status').textContent = '三维尚未验证成功。';
  all('.controls button, .technical button, .technical input, .technical select').forEach(b => b.disabled = true);
}
function onFrame({time, visualState}) {
  showCharacterState(visualState);
  if (demo) {
    const elapsed = time - demo.start;
    while (demo && demo.index < demo.cues.length && elapsed >= demo.cues[demo.index][0]) {
      const [, action] = demo.cues[demo.index++]; action();
    }
    $('demo-progress').style.width = Math.min(100, elapsed / 45 * 100) + '%';
    if (elapsed >= 45) stopDemo();
  }
  if (performance.now() - lastMetrics > 1000) {lastMetrics = performance.now(); $('metrics').textContent = JSON.stringify(stage.telemetry(), null, 2);}
}
async function boot() {
  const current = ++generation; stopDemo();
  if (stage) {stage.dispose(); const old = $('scene'); old.replaceWith(old.cloneNode(false));}
  stage = null; failed = false;
  try {
    factory ||= (await import('../../wendao/scene3d/scene-manager.js')).createBedroomScene;
    if (current !== generation) return;
    stage = factory($('scene'), {low: $('low').checked, reducedMotion: reduced.matches, onFailure: failure});
    stage.motion($('motion').checked); stage.pause($('pause').checked); stage.lamp(lamp); stage.onFrame(onFrame);
    apply(); camera('wide'); stage.start();
  } catch (e) {if (current === generation) failure(String(e.message || e));}
}
all('[data-camera]').forEach(b => b.addEventListener('click', () => {stopDemo(); camera(b.dataset.camera);}));
all('[data-phase]').forEach(b => b.addEventListener('click', () => {stopDemo(); setPhase(b.dataset.phase);}));
all('[data-pose]').forEach(b => b.addEventListener('click', () => {stopDemo(); if (stage?.pose(b.dataset.pose)) $('status').textContent = '静态体位代理：瞬时切换用于接触检查，不是卧坐过渡动画。';}));
$('enter').addEventListener('click', () => {stopDemo(); camera('wide'); if (stage?.enter()) $('status').textContent = '门后 → 屏风后 → 绕行 → 床侧；临时运动代理，正式步态待制作。';});
$('condition').addEventListener('change', event => {stopDemo(); condition = event.target.value; apply();});
$('lamp').addEventListener('click', () => {stopDemo(); lamp = !lamp; stage?.lamp(lamp); $('lamp').setAttribute('aria-pressed', String(lamp)); $('lamp').textContent = lamp ? '灯火开' : '灯火关';});
$('motion').addEventListener('change', () => {stopDemo(); stage?.motion($('motion').checked); apply();});
$('pause').addEventListener('change', () => stage?.pause($('pause').checked));
$('low').addEventListener('change', boot);
$('retry').addEventListener('click', () => location.reload());
$('demo').addEventListener('click', () => {
  if (demo) {stopDemo(); return;}
  condition = 'healthy'; $('condition').value = condition; phase = 'day'; lamp = true; $('lamp').textContent = '灯火开'; $('lamp').setAttribute('aria-pressed', 'true');
  $('pause').checked = false; stage.pause(false); stage.lamp(true); apply(); camera('wide');
  const cues = [
    [2, () => {if (stage.enter()) $('status').textContent = '屏风后的运动代理：真实深度遮挡，非正式人物步态。';}],
    [19, () => {stage.pose('seated'); camera('bedside'); $('status').textContent = '床面半坐代理；本次体位瞬切只为检查接触。';}],
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
    measurements: stage.telemetry(), note: 'Actual device telemetry, not a visual acceptance or screen recording.'};
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], {type: 'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = 'bedroom-space-device-report.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
reduced.addEventListener('change', () => {stopDemo(); $('motion').checked = !reduced.matches; $('motion').disabled = reduced.matches; boot();});
window.addEventListener('pagehide', () => {stopDemo(); stage?.stop();});
window.addEventListener('pageshow', event => {if (event.persisted) stage?.start();});
if (reduced.matches) {$('motion').checked = false; $('motion').disabled = true;}
apply();
boot();
