import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIVITIES,planRoute,clearSegment,allowsActivity,sampleRoute,routeLength} from '../wendao/scene3d/interactions.js';
import {adaptSnapshot,ANCHORS} from '../wendao/scene3d/contract.js';
test('every interaction pair has a continuous collision-free route',()=>{
 const points=[ANCHORS.door,...Object.values(ACTIVITIES).map(x=>x.approach)];
 for(const a of points) for(const b of points){const path=planRoute(a,b);assert.ok(path,JSON.stringify([a,b]));path.slice(1).forEach((p,i)=>assert.ok(clearSegment(path[i],p)));assert.deepEqual(sampleRoute(path,routeLength(path)+1).position,b);}
});
test('sleep, injury, absence and clock holds cannot request active tasks',()=>{
 const base={world:{player:'bedroom',sister:'bedroom',together:true},permittedPoses:['walk','seated']};
 for(const extra of [{sisterSleeping:true},{state:{portrait:{state:'injured'}}},{state:{vitals:{clockDispute:true}}},{world:{}}]){
 const f=adaptSnapshot({...base,...extra});for(const id of ['walk','sit','read','medicine'])assert.equal(allowsActivity(f,id),false);
 }
 assert.equal(allowsActivity(adaptSnapshot(base),'read'),true);
 assert.equal(allowsActivity(adaptSnapshot(base),'unknown'),false);
});
import * as THREE from '../wendao/scene3d/vendor/three.module.min.js';
import {createGLBCharacter,REQUIRED_CLIPS} from '../wendao/scene3d/glb-character.js';
test('GLB gate rejects missing animation/anchors before reparenting the model',()=>{
 const scene=new THREE.Group(), parent=new THREE.Group();parent.add(scene);
 assert.throws(()=>createGLBCharacter({scene,animations:[]}),/Missing animation/);assert.equal(scene.parent,parent);
 const animations=REQUIRED_CLIPS.map(n=>new THREE.AnimationClip(n,1,[]));
 assert.throws(()=>createGLBCharacter({scene,animations}),/Missing anchor/);assert.equal(scene.parent,parent);
 for(const name of ['grip_left','grip_right','head_anchor']){const node=new THREE.Group();node.name=name;scene.add(node);}
 const character=createGLBCharacter({scene,animations});character.setPose('seated');character.activity('read');character.update(.2);
 assert.deepEqual(character.root.position.toArray(),ANCHORS.seated);character.dispose();
});
