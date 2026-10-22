import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../wendao/scene3d/vendor/three.module.min.js';
import {buildBedroom} from '../wendao/scene3d/bedroom-model.js';
import {createProxy} from '../wendao/scene3d/character-adapter.js';
import {createReadability} from '../wendao/scene3d/visibility.js';
import {surfaceTexture} from '../wendao/scene3d/surface-materials.js';

test('screen remains opaque with unchanged depth/shadows even under sustained obstruction',()=>{
 const room=buildBedroom(),proxy=createProxy(),camera=new THREE.PerspectiveCamera(42,1,.1,50);
 camera.position.set(3.2,1.6,4);camera.lookAt(3.2,1.4,-2.65);
 proxy.walk([3.2,0,-2.65],0,0);proxy.root.visible=true;
 const view=createReadability(room.root,camera);view.update(proxy,.2,{immediate:true});
 for(let i=0;i<60;i++)view.update(proxy,.1);
 assert.ok(view.blockedCount>0);assert.equal(view.fadedCount,0);
 for(const name of ['screen-panel-1','screen-frame']){const m=room.root.getObjectByName(name);assert.equal(m.material.opacity,1);assert.equal(m.material.transparent,false);assert.equal(m.castShadow,true);}
 assert.equal(room.root.getObjectByName('medicine-cabinet').material.opacity,1);
 proxy.walk([.52,0,.85],0,0);view.update(proxy,1,{immediate:true});
 assert.equal(view.fadedCount,0);
 const panel=room.root.getObjectByName('screen-panel-1');assert.equal(panel.material.depthWrite,true);assert.equal(panel.castShadow,true);
});
test('cabinet action is no longer behind the screen in the wide camera',()=>{
 const room=buildBedroom();room.root.updateMatrixWorld(true);
 const origin=new THREE.Vector3(.4,4.1,12.5),target=new THREE.Vector3(1.55,1.3,-2.1),d=target.clone().sub(origin);
 const ray=new THREE.Raycaster(origin,d.clone().normalize(),0,d.length());
 assert.equal(ray.intersectObject(room.root,true).some(h=>h.object.name.startsWith('screen-')),false);
});
test('small procedural surfaces are reproducible and distinguish wood, weave and plaster',()=>{
 const a=surfaceTexture('wood'),b=surfaceTexture('wood'),cloth=surfaceTexture('weave');
 assert.deepEqual(a.image.data,b.image.data);assert.notDeepEqual(a.image.data,cloth.image.data);
 assert.equal(a.image.width,128);assert.equal(a.wrapS,THREE.RepeatWrapping);
});
