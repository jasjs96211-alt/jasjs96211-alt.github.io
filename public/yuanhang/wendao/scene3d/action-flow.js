import {ANCHORS, WALK_PATH} from './contract.js';
import {ACTIVITIES, allowsActivity, planRoute, routeLength, sampleRoute} from './interactions.js';
const ease = t => t*t*(3-2*t);
const angle = (a,b,t) => a + Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
// Visual time only. No outcomes, medicine inventory, health, saves, or offline clocks.
export const canPreservePresentation=(a,b)=>a.present&&b.present&&a.health.stage===b.health.stage&&a.sleeping===b.sleeping&&a.clockHold===b.clockHold&&a.canMove===b.canMove&&a.canSit===b.canSit;
export function createActionFlow(driver) {
  let queue=[], current=null, elapsed=0, sampler=null, id=null, phase='idle', cancelled=false;
  let state={pose:'reclined',position:[...ANCHORS.reclined],yaw:0,gesture:null};
  let approach=[...ANCHORS.bedside], travelled=0;
  const transition=(label,duration,target)=>({kind:'transition',label,duration,target});
  function reset(presentation) {
    queue=[];current=null;sampler=null;id=null;phase='idle';cancelled=false;
    state={pose:presentation.pose,position:[...(presentation.worldPosition||ANCHORS.reclined)],yaw:presentation.facing,gesture:null};
    travelled=0;approach=state.pose==='walk'?[...state.position]:[...ANCHORS.bedside];
  }
  function request(next,facts,{bedSeat=false,entry=false}={}) {
    if(current || !allowsActivity(facts,next)) return false;
    // A resting/ill character cannot be made to rise just to replay resting.
    if(!facts.canMove || (['sit','read','lie','rest'].includes(next)&&!facts.canSit)) return false;
    const a=ACTIVITIES[next],origin=state.pose==='walk'?state.position:approach;
    let path=planRoute(origin,entry?ANCHORS.door:a.approach);if(!path)return false;
    if(entry)path=path.concat(WALK_PATH.slice(1));
    id=next;cancelled=false;queue=[];
    if(state.pose==='reclined')queue.push(transition('起身坐稳',1.4,{pose:'seated',position:[-.42,.73,-.72],yaw:0,gesture:null}));
    else if(state.pose==='seated'&&state.gesture===null&&Math.hypot(state.position[0]+.42,state.position[2]+.72)>.15)queue.push(transition('移向床沿',1.1,{pose:'seated',position:[-.42,.73,-.72],yaw:0,gesture:null}));
    if(state.pose!=='walk') queue.push(transition('起身',1.45,{pose:'walk',position:origin,yaw:state.yaw,gesture:null}));
    const length=routeLength(path);
    if(length>.005) {
      const heading=sampleRoute(path,0).yaw;
      queue.push(transition('转向路径',.45,{pose:'walk',position:origin,yaw:heading,gesture:null}));
      queue.push({kind:'walk',label:entry?'入场绕行':'行走',path,length,duration:length/.58+.6});
    }
    queue.push(transition('到达停步',.28,{pose:'walk',position:a.approach,yaw:null,gesture:null}));
    queue.push(transition('面向交互点',.55,{pose:'walk',position:a.approach,yaw:a.yaw,gesture:null}));
    const seated={pose:'seated',position:a.position,yaw:a.yaw,gesture:'stool'};
    if(next==='sit'||next==='read') {
      queue.push(transition('坐下',1.25,seated));
      if(next==='read') {
        queue.push(transition('伸手取书',.7,{...seated,gesture:'reach-book'}));
        queue.push(transition('展开书册',.8,{...seated,gesture:'read'}));
        queue.push(transition('阅读',1.1,{...seated,gesture:'read'}));
      }
    }
    if(next==='medicine') {
      const standing={pose:'walk',position:a.approach,yaw:a.yaw};
      queue.push(transition('伸手取药',.8,{...standing,gesture:'reach-medicine'}));
      queue.push(transition('持碗停顿',.6,{...standing,gesture:'hold-bowl'}));
      queue.push(transition('服药演示',1.3,{...standing,gesture:'medicine'}));
      queue.push(transition('放回药碗',.9,{...standing,gesture:'hold-bowl'}));
      queue.push(transition('收手',.65,{...standing,gesture:null}));
    }
    if(next==='lie'||next==='rest') {
      queue.push(transition('床沿落座',1.4,{pose:'seated',position:[-.42,.73,-.72],yaw:0,gesture:null}));
      if(!bedSeat) {
        queue.push(transition('转身卧下',1.8,{pose:'reclined',position:a.position,yaw:0,gesture:null}));
        queue.push(transition(next==='rest'?'安静休息':'调整卧姿',.8,{pose:'reclined',position:a.position,yaw:0,gesture:null}));
      }
    }
    approach=[...a.approach];phase='queued';advance();return true;
  }
  function advance() {
    current=queue.shift()||null;elapsed=0;sampler=null;
    if(!current){phase=cancelled?'cancelled':'complete';return;}
    phase=current.label;
    if(current.kind==='transition') {
      current.target={...current.target,position:[...current.target.position],yaw:current.target.yaw??state.yaw};
      current.from={...state,position:[...state.position]};
      sampler=driver.transitionTo(current.target);
    }
  }
  function cancel() {
    if(!current)return false;
    cancelled=true;queue=[];
    if(current.kind==='walk') {
      // Ease the last gait into a balanced stand without moving to an anchor.
      current=null;queue=[transition('停步取消',.35,{...state,gesture:null})];advance();
    }
    // A transfer already started settles onto its current support before stopping.
    else if(current.target.gesture && current.target.gesture!=='stool') {
      queue=[transition('收手取消',.45,{...current.target,gesture:current.target.pose==='seated'?'stool':null})];
    }
    return true;
  }
  function update(dt,facts) {
    if(!current || !(dt>0) || !Number.isFinite(dt) || dt>.25)return;
    if(!facts.canMove || !allowsActivity(facts,id) || (['sit','read','lie','rest'].includes(id)&&!facts.canSit)) {
      queue=[];current=null;sampler=null;phase='blocked';id=null;return;
    }
    let remaining=dt;
    while(current && remaining>0) {
      const chunk=Math.min(remaining,current.duration-elapsed);elapsed+=chunk;remaining-=chunk;
      const t=Math.min(1,elapsed/current.duration);
      if(current.kind==='walk') {
        // Constant middle speed with .3s acceleration/deceleration at each end.
        const ramp=.3/current.duration,area=1-ramp;
        const fraction=t<ramp?t*t/(2*ramp*area):t>1-ramp?1-(1-t)*(1-t)/(2*ramp*area):(t-ramp/2)/area;
        travelled=current.length*fraction;const p=sampleRoute(current.path,travelled);
        const yaw=p.arrived?state.yaw:angle(state.yaw,p.yaw,1-Math.exp(-chunk*8));
        state={pose:'walk',position:p.position,yaw,gesture:null};driver.walk(p.position,yaw,travelled);
      } else {
        const s=ease(t),a=current.from,b=current.target;sampler(s);
        state={...b,position:a.position.map((v,i)=>v+(b.position[i]-v)*s),yaw:angle(a.yaw,b.yaw,s)};
      }
      if(t>=1)advance();else break;
    }
  }
  return {request,cancel,update,reset,get presentation(){return {...state,position:[...state.position]};},
    get status(){return {activity:id,phase,busy:!!current,cancelling:cancelled&&!!current,moving:current?.kind==='walk',distance:travelled};}};
}
