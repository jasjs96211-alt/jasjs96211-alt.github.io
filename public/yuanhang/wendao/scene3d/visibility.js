import * as THREE from './vendor/three.module.min.js';
// Only foreground furniture may fade; character depth testing and world state are untouched.
export function createReadability(room, camera) {
  const objects=[];room.traverse(o=>{
    if(o.isMesh && /^(screen-|bed-curtain|bed-canopy-post|foreground-console|console-leg|ceiling-beam)/.test(o.name)){
      o.material=o.material.clone();objects.push({mesh:o,originalCast:o.castShadow,hold:0});
    }
  });
  const ray=new THREE.Raycaster(),origin=new THREE.Vector3(),bounds=new THREE.Box3();let elapsed=0;
  const blocked=new Set();
  function update(character,dt,{immediate=false}={}) {
    elapsed+=dt;
    if(elapsed>=.1 || immediate){
      elapsed=0;blocked.clear();camera.updateMatrixWorld();room.updateMatrixWorld(true);character.root.updateMatrixWorld(true);
      if(character.root.visible){
        camera.getWorldPosition(origin);bounds.setFromObject(character.root);
        const head=character.head.getWorldPosition(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
        const targets=[head,center,head.clone().lerp(center,.5),center.clone().add(new THREE.Vector3(.2,0,0)),center.clone().add(new THREE.Vector3(-.2,0,0))];
        for(const point of targets){const dir=point.clone().sub(origin),length=dir.length();ray.set(origin,dir.normalize());ray.near=.05;ray.far=Math.max(.05,length-.12);
          for(const hit of ray.intersectObjects(objects.map(x=>x.mesh),false))blocked.add(hit.object);
        }
      }
    }
    for(const entry of objects){
      if(blocked.has(entry.mesh))entry.hold=.3;else entry.hold=Math.max(0,entry.hold-dt);
      const faded=entry.hold>0,target=faded?.12:1,m=entry.mesh.material;
      m.opacity=immediate?target:THREE.MathUtils.lerp(m.opacity,target,1-Math.exp(-dt*12));
      if(Math.abs(m.opacity-target)<.005)m.opacity=target;
      const transparent=m.opacity<.999;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}
      m.depthWrite=!transparent;entry.mesh.castShadow=transparent?false:entry.originalCast;
    }
  }
  return {update,get fadedCount(){return objects.filter(x=>x.mesh.material.opacity<.99).length;}};
}
