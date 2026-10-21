import {blocked, ANCHORS} from './contract.js';
// All requests are presentation-only. The game remains the authority for outcomes.
export const ACTIVITIES = Object.freeze({
  walk: {approach: ANCHORS.bedside, pose: 'walk', yaw: -Math.PI / 2},
  sit: {approach: [-2.1, 0, 1.8], position: [-2.75, .52, 1.85], pose: 'seated', yaw: -Math.PI / 2},
  read: {approach: [-2.1, 0, 1.8], position: [-2.75, .52, 1.85], pose: 'seated', yaw: -Math.PI / 2},
  medicine: {approach: [1.55, 0, -2.1], pose: 'walk', yaw: Math.PI},
  lie: {approach: ANCHORS.bedside, position: ANCHORS.reclined, pose: 'reclined', yaw: 0},
  rest: {approach: ANCHORS.bedside, position: ANCHORS.reclined, pose: 'reclined', yaw: 0}
});
export function allowsActivity(facts, id) {
  if (!ACTIVITIES[id] || !facts.present || facts.clockHold) return false;
  if (['lie', 'rest'].includes(id)) return true;
  return facts.canMove && (!['sit', 'read'].includes(id) || facts.canSit);
}
export function clearSegment(a, b) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b[0]-a[0], b[2]-a[2])/.04));
  for (let i=0;i<=steps;i++) if (blocked([a[0]+(b[0]-a[0])*i/steps,0,a[2]+(b[2]-a[2])*i/steps])) return false;
  return true;
}
// Small bounded grid: stable paths on mobile, no mesh raycast or remote services.
export function planRoute(from, to) {
  if (blocked(from) || blocked(to)) return null;
  if (clearSegment(from,to)) return [[...from],[...to]];
  const nodes=[];
  for(let x=-3.8;x<=4.01;x+=.2) for(let z=-2.8;z<=2.81;z+=.2) {
    const p=[+x.toFixed(2),0,+z.toFixed(2)]; if(!blocked(p)) nodes.push(p);
  }
  nodes.unshift([...from]); nodes.push([...to]);
  const target=nodes.length-1, previous=new Map([[0,-1]]), queue=[0];
  for(let head=0;head<queue.length;head++) {
    const i=queue[head]; if(i===target) break;
    for(let j=1;j<nodes.length;j++) {
      if(previous.has(j)) continue;
      const d=Math.hypot(nodes[j][0]-nodes[i][0],nodes[j][2]-nodes[i][2]);
      if(d>.3 && j!==target && i!==0) continue;
      if((i===0 || j===target) && d>.5) continue;
      if(clearSegment(nodes[i],nodes[j])) {previous.set(j,i);queue.push(j);}
    }
  }
  if(!previous.has(target)) return null;
  const path=[]; for(let i=target;i!==-1;i=previous.get(i)) path.unshift(nodes[i]);
  const result=[path[0]];let i=0;
  while(i<path.length-1) {let j=path.length-1;while(j>i+1&&!clearSegment(path[i],path[j]))j--;result.push(path[j]);i=j;}
  return result;
}
export const routeLength = path => path.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-path[i][0],p[2]-path[i][2]),0);
export function sampleRoute(path, distance) {
  for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],d=Math.hypot(b[0]-a[0],b[2]-a[2]);
    if(distance<d) return {position:[a[0]+(b[0]-a[0])*distance/d,0,a[2]+(b[2]-a[2])*distance/d],yaw:Math.atan2(b[0]-a[0],b[2]-a[2]),arrived:false};
    distance-=d;
  }
  return {position:[...path.at(-1)],yaw:0,arrived:true};
}
