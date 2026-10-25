import {ACTIVITIES,allowsActivity} from './interactions.js';
// Consumer of explicit scene intentions. Never schedules business events or settles outcomes.
// One instance per source stream. IDs + monotonically increasing sequence are source-owned.
export function createLifeSceneBridge(scene,{now=()=>Date.now()}={}) {
  let enabled=false,visible=true,facts=null,pending=null,active=null,lastSequence=-1,reason='manual',lastNow=null;
  const seen=new Set();
  const validTime=()=>{const n=now();if(!Number.isFinite(n)||n<0||lastNow!==null&&n<lastNow)return null;lastNow=n;return n;};
  function reject(why){return {accepted:false,reason:why};}
  function permitted(id){return !!facts?.canMove&&allowsActivity(facts,id)&&(!['read','sit','lie','rest'].includes(id)||facts.canSit);}
  function clear(why,{cancel=true}={}) {
    pending=null;if(cancel&&active)scene.cancelActivity();active=null;reason=why;
  }
  function setSnapshot(input) {
    facts=scene.setSnapshot(input);
    if(!facts.present||!facts.canMove||facts.clockHold||facts.sleeping){clear('state-blocked');}
    else if(pending&&!permitted(pending.activity)||active&&!permitted(active.activity)){clear('permission-revoked');}
    return facts;
  }
  function submit(intent) {
    const at=validTime();if(at===null){clear('clock-hold');return reject(reason);}
    if(!intent||typeof intent.id!=='string'||!intent.id.length||intent.id.length>160||!Object.hasOwn(ACTIVITIES,intent.activity)||
       !['autonomy','lab'].includes(intent.source)||!Number.isSafeInteger(intent.sequence)||intent.sequence<0||
       !Number.isFinite(intent.requestedAt)||!Number.isFinite(intent.expiresAt)||intent.requestedAt>at||intent.requestedAt<0||
       intent.expiresAt<=at||intent.expiresAt<=intent.requestedAt||intent.expiresAt-intent.requestedAt>300000)return reject('invalid-or-expired');
    if(seen.has(intent.id)||intent.sequence<=lastSequence)return reject('duplicate-or-out-of-order');
    // Consume each valid source intent once, including suppressed requests. Never replay on resume.
    lastSequence=intent.sequence;seen.add(intent.id);if(seen.size>128)seen.delete(seen.values().next().value);
    if(!enabled||!visible)return reject(!visible?'hidden':'manual');
    if(!permitted(intent.activity))return reject('state-blocked');
    pending=Object.freeze({id:intent.id,activity:intent.activity,sequence:intent.sequence,requestedAt:intent.requestedAt,expiresAt:intent.expiresAt,source:intent.source});
    reason='waiting';tick();return {accepted:true,reason};
  }
  function tick({paused=false}={}) {
    const at=validTime();if(at===null){clear('clock-hold');return;}
    if(active&&!active.done&&!scene.activityStatus.busy){active.done=true;reason=scene.activityStatus.phase==='complete'?'complete':'cancelled';}
    if(pending&&at>=pending.expiresAt){pending=null;reason='expired';}
    if(!enabled||!visible||paused||!pending)return;
    if(!permitted(pending.activity)){clear('state-blocked');return;}
    if(scene.activityStatus.busy)return;
    const next=pending;pending=null;
    if(scene.requestActivity(next.activity)){active={...next,done:false};reason='playing';}
    else reason='rejected-by-scene';
  }
  function suspend(){enabled=false;clear('manual');}
  function resume(){clear('awaiting-fresh-intent');enabled=true;}
  function setVisible(value) {const v=value===true;if(v===visible)return;visible=v;clear(v?'awaiting-fresh-intent':'hidden');}
  function manualRequest(id,options) {
    if(scene.activityStatus.busy)return false;
    suspend();return scene.requestActivity(id,options);
  }
  function observation(){
    const rendered=scene.telemetry().status==='rendering';
    return Object.freeze({enabled,visible,pendingId:pending?.id??null,activeId:active?.id??null,
      source:active?.source??null,reason,phase:scene.activityStatus.phase,busy:scene.activityStatus.busy,
      implementation:'placeholder',rendered,claimVisibleAction:false,businessOutcome:null});
  }
  return {setSnapshot,submit,tick,suspend,resume,setVisible,manualRequest,observation};
}
