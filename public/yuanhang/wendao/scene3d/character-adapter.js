import * as THREE from './vendor/three.module.min.js';
import {ANCHORS} from './contract.js';
// World-space contact points, independent of the character's root and visibility.
export const PROP_HOMES = Object.freeze({book:Object.freeze([-3.22,.8875,1.85]),bowl:Object.freeze([1.55,1.145,-2.62])});
const gripFor = id => ['reach-book','read','return-book'].includes(id)?'book':['reach-medicine','hold-bowl','medicine','return-bowl'].includes(id)?'bowl':null;
// Intentionally faceless, articulated volume proxy. It is NOT a Zhiyao character asset.
export function createProxy() {
  const root = new THREE.Group(); root.name = 'temporary-volume-proxy';
  const propsRoot = new THREE.Group(); propsRoot.name = 'proxy-interaction-props';
  const robe = new THREE.MeshStandardMaterial({color: 0x858b7d, roughness: .95});
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
    part(new THREE.CapsuleGeometry(.055, .21, 3, 7), robe, [0, -.16, 0], pivot);
    const elbow = new THREE.Group(); elbow.position.y=-.32; pivot.add(elbow);
    part(new THREE.CapsuleGeometry(.047, .23, 3, 7), robe, [0, -.16, 0], elbow);
    const hand = part(new THREE.SphereGeometry(.045, 8, 6), neutral, [0, -.32, 0], elbow);
    return {pivot,elbow,hand,side};
  });
  const legs = [-1, 1].map(side => {
    const pivot = new THREE.Group(); pivot.position.set(side * .12, .57, 0); joints.add(pivot);
    part(new THREE.CapsuleGeometry(.055, .43, 3, 6), neutral, [0, -.235, 0], pivot);
    const foot = part(new THREE.BoxGeometry(.12, .065, .23), robe, [0, -.535, .04], pivot);
    return {pivot, foot};
  });
  const heldBook = part(new THREE.BoxGeometry(.3,.035,.22), robe, PROP_HOMES.book,propsRoot);heldBook.name='interaction-book';
  // Open bowl with a separate shallow liquid surface; no appearing/disappearing duplicate.
  const points=[[.035,0],[.065,.012],[.09,.055],[.083,.055],[.058,.019],[.035,.01]].map(p=>new THREE.Vector2(...p));
  const heldBowl = part(new THREE.LatheGeometry(points,16), neutral, PROP_HOMES.bowl,propsRoot);heldBowl.name='interaction-bowl';
  part(new THREE.CylinderGeometry(.068,.068,.002,16),new THREE.MeshStandardMaterial({color:0x654a2c,roughness:.5}),[0,.03,0],heldBowl);
  const props={book:heldBook,bowl:heldBowl};let grip=null;
  function resetProps(){for(const [name,prop] of Object.entries(props)){prop.position.set(...PROP_HOMES[name]);prop.rotation.set(0,name==='book'?-Math.PI/2:Math.PI,0);}grip=null;}
  function gripPoint(name,side){return props[name].localToWorld(new THREE.Vector3(side*(name==='book'?.145:.085),name==='book'?0:.045,0));}
  function solveArm(arm,worldTarget){
    const start=arm.pivot.position,target=joints.worldToLocal(worldTarget.clone()),delta=target.sub(start);
    const d=Math.max(.0001,Math.min(.64,delta.length())),axis=delta.normalize();
    const bend=new THREE.Vector3(arm.side,-.6,0);bend.addScaledVector(axis,-bend.dot(axis));
    if(bend.lengthSq()<1e-8)bend.set(0,0,1).addScaledVector(axis,-axis.z);
    const elbow=start.clone().addScaledVector(axis,d/2).addScaledVector(bend.normalize(),Math.sqrt(.32**2-(d/2)**2));
    const end=start.clone().addScaledVector(axis,d),down=new THREE.Vector3(0,-1,0);
    arm.pivot.quaternion.setFromUnitVectors(down,elbow.clone().sub(start).normalize());
    const lower=new THREE.Quaternion().setFromUnitVectors(down,end.sub(elbow).normalize());
    arm.elbow.quaternion.copy(arm.pivot.quaternion).invert().multiply(lower);
  }
  function constrainHands(name,weight=1){
    if(weight<=0)return;
    root.updateMatrixWorld(true);propsRoot.updateMatrixWorld(true);
    for(const arm of arms){const wrist=arm.hand.getWorldPosition(new THREE.Vector3());solveArm(arm,wrist.lerp(gripPoint(name,arm.side),weight));}
    root.updateMatrixWorld(true);
  }
  function activity(id) {
    if(['stool','reach-book','read','return-book'].includes(id)) {legs.forEach(l=>{l.pivot.rotation.x=-.55;});skirt.position.z=.06;}
    grip=gripFor(id);root.updateMatrixWorld(true);
    if(id==='read')heldBook.position.copy(joints.localToWorld(new THREE.Vector3(0,1.12,.34)));
    if(id==='hold-bowl'||id==='medicine')heldBowl.position.copy(joints.localToWorld(new THREE.Vector3(0,id==='medicine'?1.48:1.1,id==='medicine'?.18:.32)));
    if(grip){props[grip].quaternion.copy(root.quaternion);constrainHands(grip);}
  }
  let pose = 'reclined';
  function setPose(id) {
    resetProps(); pose = id; joints.rotation.set(0, 0, 0); joints.position.set(0, 0, 0);
    head.position.z = 0; hair.position.z = -.04;
    torso.position.y = 1.12; skirt.visible = true; hair.visible = true;
    legs.forEach(l => {l.pivot.rotation.set(0, 0, 0);}); arms.forEach(a => {a.pivot.rotation.set(0, 0, 0);a.elbow.rotation.set(0,0,0);});
    if (id === 'seated') {
      root.position.set(...ANCHORS.seated); root.rotation.set(0, 0, 0);
      // Hip is at the mattress, legs extend over the quilt rather than below it.
      joints.position.y = -.58;
      legs.forEach(l => {l.pivot.rotation.x = -Math.PI / 2;});
      arms.forEach(a => {a.pivot.rotation.x = -.65;});
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
    arms.forEach((a, i) => {a.pivot.rotation.x = Math.sin(cycle + i * Math.PI) * -.17;});
  }
  // Capture and blend the existing proxy joints; these are kinematic placeholders, not animation clips.
  function capture() {const values=[];for(const group of [root,propsRoot])group.traverse(o=>values.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone(),visible:o.visible}));return values;}
  function transitionTo(target) {
    const from=capture(),fromGrip=grip;setPose(target.pose);root.position.set(...target.position);root.rotation.y=target.yaw;activity(target.gesture);
    const to=capture(),toGrip=grip;
    function sample(t) {
      from.forEach((a,i)=>{const b=to[i];a.o.position.lerpVectors(a.p,b.p,t);a.o.quaternion.slerpQuaternions(a.q,b.q,t);a.o.scale.lerpVectors(a.s,b.s,t);a.o.visible=t<.5?a.visible:b.visible;});
      const contact=toGrip||fromGrip;
      if(contact)constrainHands(contact,fromGrip===toGrip?1:toGrip?t:1-t);
      grip=t===1?toGrip:fromGrip;
    }
    sample(0);return sample;
  }
  setPose('reclined');
  return {root, propsRoot, setPose, walk, head, activity, transitionTo, get pose() {return pose;},
    get propContacts(){root.updateMatrixWorld(true);propsRoot.updateMatrixWorld(true);return {grip,props:Object.fromEntries(Object.entries(props).map(([k,v])=>[k,v.position.toArray()])),hands:arms.map(a=>({position:a.hand.getWorldPosition(new THREE.Vector3()).toArray(),error:grip?a.hand.getWorldPosition(new THREE.Vector3()).distanceTo(gripPoint(grip,a.side)):null}))};}};
}
