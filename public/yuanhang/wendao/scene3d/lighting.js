import * as THREE from './vendor/three.module.min.js';
export const LIGHT_PHASES = Object.freeze({
  dawn: {sky: 0xa3bcc0, ground: 0x493d37, ambient: 1.1, sun: 0xffddae, power: 2.3, position: [-8, 4, -4], lamp: 7, background: 0x526b71},
  day: {sky: 0xe4e1d8, ground: 0x655749, ambient: .95, sun: 0xfff1d6, power: 2.6, position: [-7, 6, 1], lamp: 0, background: 0x93958d},
  dusk: {sky: 0x9c9eac, ground: 0x443428, ambient: .65, sun: 0xffb272, power: 2, position: [-9, 3, -3], lamp: 11, background: 0x605966},
  night: {sky: 0xb2b6bd, ground: 0x39332b, ambient: .18, sun: 0xc8d4e0, power: .52, position: [-7, 4, 1], lamp: 12, background: 0x24282d}
});
export function createLighting(scene, lampMeshes, {low = false} = {}) {
  const fill = new THREE.HemisphereLight(), sun = new THREE.DirectionalLight();
  sun.position.set(-7, 6, 1); sun.target.position.set(-.5, .2, -.6);
  sun.castShadow = true; sun.shadow.mapSize.set(low ? 512 : 1024, low ? 512 : 1024);
  Object.assign(sun.shadow.camera, {left: -7, right: 7, top: 6, bottom: -6, near: .5, far: 24});
  sun.shadow.normalBias = .018; sun.shadow.bias = -.0004;
  scene.add(fill, sun, sun.target);
  const lamps = lampMeshes.map((mesh, i) => {
    const l = new THREE.PointLight(0xffd6ad, 0, 4.4, 2); l.position.copy(mesh.position);
    // Only bedside lamp casts local shadows: six shadow faces per point light are expensive.
    l.castShadow = i === 0 && !low; l.shadow.mapSize.set(256, 256); l.shadow.normalBias = .008; l.shadow.bias = -.0001; l.shadow.camera.near = .08; l.shadow.camera.far = 4.4;
    scene.add(l); return l;
  });
  let active = 'day', enabled = true, base = 0;
  function apply(id) {
    if (!LIGHT_PHASES[id]) return false;
    active = id; const p = LIGHT_PHASES[id]; base = p.lamp;
    fill.color.setHex(p.sky); fill.groundColor.setHex(p.ground); fill.intensity = p.ambient;
    sun.color.setHex(p.sun); sun.intensity = p.power; sun.position.set(...p.position);
    scene.background = new THREE.Color(p.background); update(0, false); return true;
  }
  function update(time, motion) {
    lamps.forEach((lamp, i) => {
      lamp.intensity = enabled ? base * (i===0 ? 1 : .65) * (motion ? 1 + .018 * Math.sin(time * 2.1 + i * 1.7) + .009 * Math.sin(time * 4.3 + i) : 1) : 0;
      lampMeshes[i].material.emissiveIntensity = enabled && base > 0 ? .65 : 0;
    });
  }
  apply('day');
  return {apply, update, toggle: value => {enabled = value; update(0, false);}, get phase() {return active;}, get enabled() {return enabled;}};
}
