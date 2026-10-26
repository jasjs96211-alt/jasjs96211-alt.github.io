import * as THREE from './vendor/three.module.min.js';
// Readability diagnostics only. Layout solves occlusion; materials and shadows stay intact.
export function createReadability(room,camera) {
  const objects=[];room.traverse(o=>{if(o.isMesh&&/^(screen-|bed-curtain|bed-canopy-post|foreground-console|console-leg)/.test(o.name))objects.push(o);});
  const ray=new THREE.Raycaster(),origin=new THREE.Vector3(),bounds=new THREE.Box3();let elapsed=0,blockedCount=0;
  function update(character,dt,{immediate=false}={}) {
    elapsed+=dt;if(elapsed<.2&&!immediate)return;elapsed=0;
    camera.updateMatrixWorld();room.updateMatrixWorld(true);character.root.updateMatrixWorld(true);const blocked=new Set();
    if(character.root.visible){
      camera.getWorldPosition(origin);bounds.setFromObject(character.root);
      const head=character.head.getWorldPosition(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      for(const point of [head,center,head.clone().lerp(center,.5)]) {
        const d=point.clone().sub(origin);ray.set(origin,d.clone().normalize());ray.near=.05;ray.far=Math.max(.05,d.length()-.12);
        for(const hit of ray.intersectObjects(objects,false))blocked.add(hit.object);
      }
    }
    blockedCount=blocked.size;
  }
  return {update,get fadedCount(){return 0;},get blockedCount(){return blockedCount;}};
}
