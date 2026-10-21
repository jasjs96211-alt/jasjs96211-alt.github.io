import * as THREE from './vendor/three.module.min.js';
import {ANCHORS} from './contract.js';
export const REQUIRED_CLIPS = Object.freeze(['idle','walk','sit','lie','read','medicine','rest']);
// Receive a dedicated decoded glTF instance from GLTFLoader.parse/loadAsync.
// No download, generation, retargeting, rescaling or writes to the user's source model.
export function createGLBCharacter(gltf) {
  if (!gltf?.scene?.isObject3D) throw new Error('Expected decoded GLB scene');
  const clips = new Map((gltf.animations || []).map(c => [c.name, c]));
  const missing = REQUIRED_CLIPS.filter(name => !clips.has(name));
  if (missing.length) throw new Error('Missing animation clips: ' + missing.join(', '));
  for (const name of ['grip_left','grip_right','head_anchor']) if(!gltf.scene.getObjectByName(name)) throw new Error('Missing anchor: '+name);
  const root = new THREE.Group(); root.name='user-character-runtime'; root.add(gltf.scene);
  const mixer = new THREE.AnimationMixer(gltf.scene); let current=null;
  function play(name) {
    const next=mixer.clipAction(clips.get(name));if(next===current)return;
    next.reset().play(); if(current)current.crossFadeTo(next,.25,false);current=next;
  }
  return {root, head:gltf.scene.getObjectByName('head_anchor'),
    setPose(id) {root.position.set(...ANCHORS[id==='walk'?'door':id]);play({seated:'sit',reclined:'lie',walk:'idle'}[id]);},
    walk(position,yaw) {root.position.set(...position);root.rotation.y=yaw;play('walk');},
    activity(id) {const name=id==='walk'?'idle':id;if(clips.has(name))play(name);},
    update(dt) {mixer.update(dt);}, dispose() {mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);}
  };
}
