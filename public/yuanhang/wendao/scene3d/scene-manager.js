import * as THREE from './vendor/three.module.min.js';
import {buildBedroom} from './bedroom-model.js';
import {createProxy} from './character-adapter.js';
import {createCameraRig} from './camera-rig.js';
import {createLighting} from './lighting.js';
import {adaptSnapshot, samplePath, visualDelta, PATH_LENGTH} from './contract.js';

export function createBedroomScene(canvas, {low = false, reducedMotion = false, onFailure = () => {}} = {}) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias: !low, alpha: false, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, low ? 1 : 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, .1, 65);
  const room = buildBedroom(), character = createProxy(); scene.add(room.root, character.root);
  const rig = createCameraRig(camera), lights = createLighting(scene, room.lamps, {low});
  let facts = adaptSnapshot(), distance = 0, speed = 0, yaw = 0, moving = false, motion = !reducedMotion, paused = false;
  let last = null, wasVisible = false, time = 0, running = false, disposed = false, raf = 0;
  let fpsFrames = 0, fpsStart = 0, fps = 0, frameMs = 0, error = null;
  let frameHandler = null;
  const startedAt = performance.now(); let firstFrameMs = null;
  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; rig.resize();
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  function setSnapshot(input) {
    const next = adaptSnapshot(input); facts = next; lights.apply(next.phase); character.root.visible = next.present;
    if (!next.canMove || !next.present) moving = false;
    if (!moving) character.setPose(next.pose);
    return next;
  }
  function enter() {
    if (!facts.canMove) return false;
    if (!motion) {moving = false; character.setPose(facts.pose); return false;}
    distance = 0; speed = 0; yaw = samplePath(0).yaw; moving = true; character.walk(samplePath(0).position, yaw, 0); return true;
  }
  function step(now) {
    if (!running || disposed) return;
    const visible = !document.hidden, delta = last === null ? 0 : visualDelta(last, now, visible, wasVisible);
    last = now; wasVisible = visible;
    if (visible) {
      const dt = paused ? 0 : delta; time += dt;
      rig.update(reducedMotion || !motion ? 2 : dt);
      if (moving && dt > 0) {
        const remaining = PATH_LENGTH - distance;
        const desiredSpeed = Math.min(.65, Math.sqrt(Math.max(0, 1.4 * remaining)));
        speed = Math.min(desiredSpeed, speed + dt * .7);
        distance = remaining < .004 ? PATH_LENGTH : Math.min(PATH_LENGTH, distance + dt * speed);
        const p = samplePath(distance);
        yaw += Math.atan2(Math.sin(p.yaw - yaw), Math.cos(p.yaw - yaw)) * (1 - Math.exp(-dt * 7));
        character.walk(p.position, yaw, distance);
        if (p.arrived) {moving = false; character.setPose('walk'); character.walk(p.position, p.yaw, 0);}
      }
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
        frameHandler?.({time, moving, distance});
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
      viewport: [canvas.width, canvas.height], phase: lights.phase, camera: rig.active, moving,
      motion, paused, quality: low ? 'low' : 'standard', error};
  }
  return {start, stop, dispose, resize, setSnapshot, enter, telemetry,
    camera: id => rig.set(id, reducedMotion || !motion),
    pause: value => {paused = value;},
    motion: value => {motion = value && !reducedMotion; if (!motion && moving) {moving = false; character.setPose(facts.pose);}},
    lamp: value => lights.toggle(value),
    pose: id => {
      if (id === 'seated' && !facts.canSit || id === 'walk' && !facts.canMove || !facts.present) return false;
      if (!['seated', 'reclined', 'walk'].includes(id)) return false;
      moving = false; character.setPose(id); return true;
    },
    onFrame: handler => {frameHandler = handler;}, get time() {return time;}
  };
}
