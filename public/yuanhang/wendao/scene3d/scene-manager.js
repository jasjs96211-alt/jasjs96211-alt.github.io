import * as THREE from './vendor/three.module.min.js';
import {buildBedroom} from './bedroom-model.js';
import {createProxy} from './character-adapter.js';
import {createCameraRig} from './camera-rig.js';
import {createLighting} from './lighting.js';
import {visualDelta} from './contract.js';
import {createReadability} from './visibility.js';
import {createGLBCharacter} from './glb-character.js';
import {createActionFlow, canPreservePresentation} from './action-flow.js';
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
  let facts = adaptCharacterVisualState(), motion = !reducedMotion, paused = false;
  let last = null, wasVisible = false, time = 0, running = false, disposed = false, raf = 0;
  let fpsFrames = 0, fpsStart = 0, fps = 0, frameMs = 0, error = null;
  let frameHandler = null;
  const flow = createActionFlow({walk:(...args)=>character.walk(...args),transitionTo:target=>character.transitionTo(target)});
  const requestActivity = (id,options) => flow.request(id,facts,options);
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
    const preserve = canPreservePresentation(facts,next);
    if (preserve) next=withPresentationPose(next,{pose:facts.pose,position:facts.worldPosition,yaw:facts.facing,moving:flow.status.moving});
    facts=next;lights.apply(next.phase);character.root.visible=next.present;
    // Permission changes are authoritative; stop immediately, never resume the old task on recovery.
    if(!preserve){flow.reset(facts);presentPose();}
    return facts;
  }
  function enter() {return requestActivity('walk',{entry:true});}
  function step(now) {
    if (!running || disposed) return;
    const visible = !document.hidden, delta = last === null ? 0 : visualDelta(last, now, visible, wasVisible);
    last = now; wasVisible = visible;
    if (visible) {
      const dt = paused ? 0 : delta; time += dt;
      rig.update(reducedMotion || !motion ? 2 : dt);
      flow.update(dt,facts);
      const presentation=flow.presentation;
      facts=withPresentationPose(facts,{pose:presentation.pose,position:presentation.position,yaw:presentation.yaw,moving:flow.status.moving});
      character.update?.(dt);
      readability.update(character,dt,{immediate: reducedMotion || !motion});
      lights.update(time, motion && !paused);
      room.curtains.forEach((curtain, n) => {
        const attr = curtain.geometry.attributes.position, base = curtain.userData.base;
        for (let i = 0; i < attr.count; i++) {
          const y = base[i * 3 + 1], weight = (1.125 - y) / 2.25;
          attr.setZ(i, base[i*3+2] + (motion ? Math.sin(time * .6 + y * 2 + n * 1.8) * .009 * weight : 0));
        }
        attr.needsUpdate = true;
      });
      try {
        const before = performance.now(); renderer.render(scene, camera); frameMs = performance.now() - before;
        if (firstFrameMs === null) firstFrameMs = performance.now() - startedAt;
        fpsFrames++; if (now - fpsStart >= 1000) {fps = Math.round(fpsFrames * 1000 / (now - fpsStart)); fpsFrames = 0; fpsStart = now;}
        frameHandler?.({time, ...flow.status, visualState: facts});
      } catch (e) {fail(e); return;}
    }
    raf = requestAnimationFrame(step);
  }
  function start() {if (disposed || running) return; running = true; last = null; fpsStart = performance.now(); raf = requestAnimationFrame(step);}
  function stop() {running = false; cancelAnimationFrame(raf); last = null; wasVisible = false;}
  function fail(e) {if (error) return; error = String(e?.message || e); stop(); onFailure(error);}
  function contextLost(event) {event.preventDefault(); fail(new Error('WebGL context lost'));}
  canvas.addEventListener('webglcontextlost', contextLost);
  const onVisibility = () => {last = null; wasVisible = false; fpsFrames=0;fpsStart=performance.now();}; document.addEventListener('visibilitychange', onVisibility);
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
      viewport: [canvas.width, canvas.height], ...flow.status, actionPhase:flow.status.phase, phase: lights.phase, camera: rig.active, fadedOccluders:readability.fadedCount, blockedForegroundMeshes:readability.blockedCount,
      motion, paused, character: {identity: facts.identity.id, pose: facts.pose, health: facts.health.stage, hair: facts.hair}, quality: low ? 'low' : 'standard', error};
  }
  return {start, stop, dispose, resize, setSnapshot, enter, telemetry, requestActivity, cancelActivity:()=>flow.cancel(),
    attachGLB: gltf => {
      const next = createGLBCharacter(gltf);
      character.dispose?.(); retired.push(character.root); scene.remove(character.root);
      character = next; scene.add(character.root); character.root.visible = facts.present;
      flow.reset(facts); presentPose();
      return true;
    },
    camera: id => rig.set(id, reducedMotion || !motion),
    pause: value => {paused = value;},
    motion: value => {motion = value && !reducedMotion;},
    lamp: value => lights.toggle(value),
    pose: id => id==='seated'?requestActivity('lie',{bedSeat:true}):id==='reclined'?requestActivity('lie'):false,
    get visualState() {return facts;},
    onFrame: handler => {frameHandler = handler;}, get time() {return time;}
  };
}
