import * as THREE from './vendor/three.module.min.js';
export const PRESETS = Object.freeze({
  wide: {position: [7.5, 4.4, 9.5], target: [-.25, 1.15, -.65], fov: 42},
  bedside: {position: [2.8, 2.25, 4.9], target: [-1, 1.32, -1.38], fov: 39},
  front: {position: [-.8, 2.03, 2.8], target: [-.8, 1.48, -1.72], fov: 36}
});
export function createCameraRig(camera) {
  let active = 'wide', progress = 1, fromPosition = camera.position.clone(), fromTarget = new THREE.Vector3(), fromFov = 42;
  const target = new THREE.Vector3();
  function frame(id) {
    const p = PRESETS[id], t = new THREE.Vector3(...p.target), pos = new THREE.Vector3(...p.position);
    // Keep the entire focus region in portrait; do not crop a fixed landscape render.
    const fitAspect = id === 'front' ? 1.25 : 1.05;
    if (camera.aspect < fitAspect) pos.sub(t).multiplyScalar(fitAspect / camera.aspect).add(t);
    return {pos, t, fov: p.fov};
  }
  function set(id, immediate = false) {
    if (!PRESETS[id]) return false;
    fromPosition.copy(camera.position); fromTarget.copy(target); fromFov = camera.fov;
    active = id; progress = immediate ? 1 : 0;
    if (immediate) { const f = frame(id); camera.position.copy(f.pos); target.copy(f.t); camera.fov = f.fov; camera.lookAt(target); camera.updateProjectionMatrix(); }
    return true;
  }
  function update(dt) {
    progress = Math.min(1, progress + dt / 1.4);
    const f = frame(active), t = progress * progress * (3 - 2 * progress);
    camera.position.lerpVectors(fromPosition, f.pos, t); target.lerpVectors(fromTarget, f.t, t);
    camera.fov = THREE.MathUtils.lerp(fromFov, f.fov, t); camera.lookAt(target); camera.updateProjectionMatrix();
  }
  set('wide', true);
  return {set, update, resize: () => set(active, true), get active() {return active;}};
}
