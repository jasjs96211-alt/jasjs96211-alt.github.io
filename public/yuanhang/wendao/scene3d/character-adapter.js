import * as THREE from './vendor/three.module.min.js';
import {ANCHORS} from './contract.js';
// Intentionally faceless, articulated volume proxy. It is NOT a Zhiyao character asset.
export function createProxy() {
  const root = new THREE.Group(); root.name = 'temporary-volume-proxy';
  const robe = new THREE.MeshStandardMaterial({color: 0x729b92, roughness: .95});
  const neutral = new THREE.MeshStandardMaterial({color: 0xc9c7b1, roughness: .95});
  const joints = new THREE.Group(); root.add(joints);
  function part(geometry, material, p, parent = joints) {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...p); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const torso = part(new THREE.CylinderGeometry(.17, .22, .49, 12), robe, [0, 1.12, 0]);
  const skirt = part(new THREE.CylinderGeometry(.21, .3, .55, 12), robe, [0, .62, 0]);
  const head = part(new THREE.SphereGeometry(.135, 14, 10), neutral, [0, 1.59, 0]);
  const hair = part(new THREE.SphereGeometry(.14, 12, 8), robe, [0, 1.64, -.04]);
  const arms = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * .22, 1.3, 0); joints.add(pivot);
    part(new THREE.CapsuleGeometry(.065, .37, 3, 7), robe, [0, -.22, 0], pivot);
    part(new THREE.SphereGeometry(.055, 8, 6), neutral, [0, -.45, 0], pivot); return pivot;
  });
  const legs = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * .12, .57, 0); joints.add(pivot);
    part(new THREE.CapsuleGeometry(.055, .43, 3, 6), neutral, [0, -.235, 0], pivot);
    const foot = part(new THREE.BoxGeometry(.12, .065, .23), robe, [0, -.535, .04], pivot);
    return {pivot, foot};
  });
  let pose = 'reclined';
  function setPose(id) {
    pose = id; joints.rotation.set(0, 0, 0); joints.position.set(0, 0, 0);
    head.position.z = 0; hair.position.z = -.04;
    torso.position.y = 1.12; skirt.visible = true; hair.visible = true;
    legs.forEach(l => {l.pivot.rotation.set(0, 0, 0);}); arms.forEach(a => a.rotation.set(0, 0, 0));
    if (id === 'seated') {
      root.position.set(...ANCHORS.seated); root.rotation.set(0, 0, 0);
      // Hip is at the mattress, legs extend over the quilt rather than below it.
      joints.position.y = -.58;
      legs.forEach(l => {l.pivot.rotation.x = -Math.PI / 2;});
      arms.forEach(a => {a.rotation.x = -.65;});
      skirt.scale.y = .7; skirt.position.set(0, .55, .15);
    } else if (id === 'reclined') {
      root.position.set(...ANCHORS.reclined); root.rotation.set(0, 0, 0);
      joints.rotation.x = -Math.PI / 2; joints.position.z = 1.48;
      head.position.z = .14; hair.position.z = .1;
      skirt.scale.y = 1; skirt.position.set(0, .62, 0);
    } else {
      root.position.set(...ANCHORS.door); root.rotation.set(0, 0, 0);
      skirt.scale.y = 1; skirt.position.set(0, .62, 0);
    }
  }
  function walk(position, yaw, distance) {
    if (pose !== 'walk') setPose('walk');
    root.position.set(...position); root.rotation.y = yaw;
    // R1 gait is a kinematic proxy, not a final weight-bearing walk animation.
    const cycle = distance / .64 * Math.PI * 2;
    legs.forEach((l, i) => {l.pivot.rotation.x = Math.sin(cycle + i * Math.PI) * .32;});
    arms.forEach((a, i) => {a.rotation.x = Math.sin(cycle + i * Math.PI) * -.17;});
  }
  setPose('reclined');
  return {root, setPose, walk, head, get pose() {return pose;}};
}
