import * as THREE from './vendor/three.module.min.js';
import {buildBedroom} from './bedroom-model.js';
import {createProxy} from './character-adapter.js';
import {createCameraRig} from './camera-rig.js';
import {createLighting} from './lighting.js';
import {samplePath, visualDelta, PATH_LENGTH, ANCHORS} from './contract.js';
import {createReadability} from './visibility.js';
import {createGLBCharacter} from './glb-character.js';
import {ACTIVITIES, allowsActivity, planRoute, routeLength, sampleRoute} from './interactions.js';
import {adaptCharacterVisualState, withPresentationPose} from './character-visual-state.js';

export function createBedroomScene(canvas, {low = false, reducedMotion = false, onFailure = () => {}} = {}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: !low, alpha: false, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, low ? 1 : 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, .1, 65);
  const room = buildBedroom(); let character = createProxy(); const retired = []; scene.add(room.root, character.root);
  const readability = createReadability(room.root,camera);
  const rig = createCameraRig(camera), lights = createLighting(scene, room.lamps, {low});
  let facts = adaptCharacterVisualState(), distance = 0, speed = 0, yaw = 0, moving = false, motion = !reducedMotion, paused = false;
  let last = null, wasVisible = false, time = 0, running = false, disposed = false, raf = 0;
  let fpsFrames = 0, fpsStart = 0, fps = 0, frameMs = 0, error = null;
  let frameHandler = null, route = null, activity = null;
  function finishActivity() {
    const a = ACTIVITIES[activity]; if (!a) return;
    facts = withPresentationPose(facts, {pose: a.pose, position: a.position || a.approach, yaw: a.yaw});
    presentPose(); character.activity(activity);
  }
  function requestActivity(id) {
    if (!allowsActivity(facts, id)) return false;
    const a = ACTIVITIES[id];
    if (!facts.canMove && ['lie','rest'].includes(id)) {moving=false; activity=id; finishActivity();return true;}
    const origin = facts.pose === 'walk' ? facts.worldPosition : activity && ACTIVITIES[activity] ? ACTIVITIES[activity].approach : ANCHORS.bedside;
    const path = planRoute(origin, a.approach); if (!path) return false;
    activity=id; route=path; distance=0; speed=0; yaw=sampleRoute(route,0).yaw;
    if (!motion) {moving=false; finishActivity();return true;}
    moving=true; character.walk(origin,yaw,0); facts=withPresentationPose(facts,{pose:'walk',position:origin,yaw,moving:true}); return true;
  }
  character.root.visible = false;
  const startedAt = performance.now(); let firstFrameMs = null;
  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; rig.resize();
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  function presentPose() {
    character.setPose(facts.pose);
    if (facts.worldPosition) character.root.position.set(...facts.worldPosition);
    character.root.rotation.y = facts.facing;
  }
  function setSnapshot(input) {
    let next = adaptCharacterVisualState(input);
    if (facts.present && next.present && facts.health.stage === next.health.stage && facts.sleeping === next.sleeping && !next.clockHold) {
      next = withPresentationPose(next, {pose: facts.pose, position: facts.worldPosition, yaw: facts.facing, moving});
    }
    facts = next; lights.apply(next.phase); character.root.visible = next.present;
    if (!next.canMove || !next.present) {moving = false; route = null; activity = null;}
    if (!moving) {presentPose(); if (activity && allowsActivity(facts, activity)) character.activity(activity);}
    return next;
  }
  function enter() {
    if (!facts.canMove) return false;
    if (!motion) return false;
    route = null; activity = null; distance = 0; speed = 0; yaw = samplePath(0).yaw; moving = true; character.walk(samplePath(0).position, yaw, 0); facts = withPresentationPose(facts, {pose: 'walk', position: samplePath(0).position, yaw, moving: true}); return true;
  }
  function step(now) {
    if (!running || disposed) return;
    const visible = !document.hidden, delta = last === null ? 0 : visualDelta(last, now, visible, wasVisible);
    last = now; wasVisible = visible;
    if (visible) {
      const dt = paused ? 0 : delta; time += dt;
      rig.update(reducedMotion || !motion ? 2 : dt);
      if (moving && dt > 0) {
        const total = route ? routeLength(route) : PATH_LENGTH;
        const remaining = total - distance;
        const desiredSpeed = Math.min(.65, Math.sqrt(Math.max(0, 1.4 * remaining)));
        speed = Math.min(desiredSpeed, speed + dt * .7);
        distance = remaining < .004 ? total : Math.min(total, distance + dt * speed);
        const p = route ? sampleRoute(route, distance) : samplePath(distance);
        yaw += Math.atan2(Math.sin(p.yaw - yaw), Math.cos(p.yaw - yaw)) * (1 - Math.exp(-dt * 7));
        character.walk(p.position, yaw, distance);
        facts = withPresentationPose(facts, {pose: 'walk', position: p.position, yaw, moving: true});
        if (p.arrived) {moving = false; character.setPose('walk'); character.walk(p.position, p.yaw, 0); facts = withPresentationPose(facts, {pose: 'walk', position: p.position, yaw: p.yaw}); if (activity) finishActivity();}
      }
      character.update?.(dt);
      readability.update(character,dt,{immediate: reducedMotion || !motion});
      lights.update(time, motion && !paused);
      room.curtains.forEach((curtain, n) => {
        const attr = curtain.geometry.attributes.position, base = curtain.userData.base;
        for (let i = 0; i < attr.count; i++) {
          const y = base[i * 3 + 1], weight = (1.125 - y) / 2.25;
          attr.setZ(i, motion ? Math.sin(time * .6 + y * 2 + n * 1.8) * .016 * weight : 0);
        }
        attr.needsUpdate = true;
      });
      try {
        const before = performance.now(); renderer.render(scene, camera); frameMs = performance.now() - before;
        if (firstFrameMs === null) firstFrameMs = performance.now() - startedAt;
        fpsFrames++; if (now - fpsStart >= 1000) {fps = Math.round(fpsFrames * 1000 / (now - fpsStart)); fpsFrames = 0; fpsStart = now;}
        frameHandler?.({time, moving, distance, visualState: facts});
      } catch (e) {fail(e); return;}
    }
    raf = requestAnimationFrame(step);
  }
  function start() {if (disposed || running) return; running = true; last = null; fpsStart = performance.now(); raf = requestAnimationFrame(step);}
  function stop() {running = false; cancelAnimationFrame(raf); last = null; wasVisible = false;}
  function fail(e) {if (error) return; error = String(e?.message || e); stop(); onFailure(error);}
  function contextLost(event) {event.preventDefault(); fail(new Error('WebGL context lost'));}
  canvas.addEventListener('webglcontextlost', contextLost);
  const onVisibility = () => {last = null; wasVisible = false;}; document.addEventListener('visibilitychange', onVisibility);
  function dispose() {
    if (disposed) return; disposed = true; stop(); observer.disconnect();
    canvas.removeEventListener('webglcontextlost', contextLost); document.removeEventListener('visibilitychange', onVisibility);
    const geometries = new Set(), materials = new Set(), textures = new Set();
    character.dispose?.(); retired.forEach(root => scene.add(root));
    scene.traverse(o => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m));
      if (o.shadow?.map) o.shadow.map.dispose();
    });
    materials.forEach(m => {Object.values(m).forEach(v => {if (v?.isTexture) textures.add(v);}); m.dispose();});
    geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); renderer.dispose(); renderer.forceContextLoss();
  }
  function telemetry() {
    return {status: error ? 'failed' : firstFrameMs === null ? 'loading' : 'rendering', assetStatus: 'placeholder',
      fps, renderCpuMs: +frameMs.toFixed(2), firstFrameMs: firstFrameMs === null ? null : Math.round(firstFrameMs),
      drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
      jsHeapBytes: performance.memory?.usedJSHeapSize ?? null, gpuMemoryBytes: null,
      viewport: [canvas.width, canvas.height], phase: lights.phase, camera: rig.active, moving, activity, fadedOccluders:readability.fadedCount,
      motion, paused, character: {identity: facts.identity.id, pose: facts.pose, health: facts.health.stage, hair: facts.hair}, quality: low ? 'low' : 'standard', error};
  }
  return {start, stop, dispose, resize, setSnapshot, enter, telemetry, requestActivity,
    attachGLB: gltf => {
      const next = createGLBCharacter(gltf);
      character.dispose?.(); retired.push(character.root); scene.remove(character.root);
      character = next; scene.add(character.root); character.root.visible = facts.present;
      moving = false; route = null; activity = null; presentPose();
      return true;
    },
    camera: id => rig.set(id, reducedMotion || !motion),
    pause: value => {paused = value;},
    motion: value => {
      motion = value && !reducedMotion;
      if (!motion && moving) {
        moving = false;
        facts = withPresentationPose(facts, {pose: facts.pose, position: facts.worldPosition, yaw: facts.facing});
        presentPose();
      }
    },
    lamp: value => lights.toggle(value),
    pose: id => {
      if (id === 'seated' && !facts.canSit || id === 'walk' && !facts.canMove || !facts.present) return false;
      if (!['seated', 'reclined', 'walk'].includes(id)) return false;
      moving = false; activity = null; route = null; facts = withPresentationPose(facts, {pose: id, yaw: 0}); presentPose(); return true;
    },
    get visualState() {return facts;},
    onFrame: handler => {frameHandler = handler;}, get time() {return time;}
  };
}
