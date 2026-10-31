import {createLifeSceneBridge} from './scene3d/life-bridge.js';
import {createLedgerSceneSource} from './scene3d/ledger-source.js';

// The same R2.3 bridge can drive the existing CG view. Receiving an intention
// is not proof of an animation: no approved read/walk/note sprite exists yet.
export function createLifePresentation({now=()=>Date.now()}={}){
 let phase='idle',current=null,last=null,wasLive=false,manual=false;
 function adapt({world={},state={}}={}){
  const p=state.schedule,weak=['injured','ill','tired'].includes(state.portrait?.state)||state.vitals?.acuteInjury||state.vitals?.seriousInjury||p?.bodyState!=='normal';
  const present=world.together===true,clockHold=world.clockDispute===true||p?.blocked===true;
  const canMove=present&&!weak&&!p?.sleeping&&!clockHold&&p?.valid===true;
  return {present,weak,severe:!!state.vitals?.acuteInjury,sleeping:p?.sleeping===true,clockHold,canMove,canSit:canMove};
 }
 const scene={setSnapshot(input){current=input;return adapt(input)},
  requestActivity(activity){phase='complete';last={activity,eventId:current?.state?.schedule?.eventId,implementation:'cg-fallback',claimVisibleAction:false};return true},
  cancelActivity(){phase='cancelled';last=null},get activityStatus(){return {busy:false,phase}},telemetry(){return {status:'fallback'}}};
 const bridge=createLifeSceneBridge(scene,{now}),source=createLedgerSceneSource(bridge,{now,adapt,includeDetails:true});
 function update({state,world,live=true}){
  const snapshot={state,world},allowed=live&&!manual&&!world?.busy&&adapt(snapshot).canMove;
  bridge.setVisible(live);
  // Every entry, return, location/permission change starts with a fresh baseline.
  const key=[world?.player,world?.sister,allowed].join(':');
  if(!allowed||!wasLive||key!==update.key){source.update({ledger:state.lifeLedger,snapshot,live:false});if(allowed)bridge.resume();}
  else source.update({ledger:state.lifeLedger,snapshot,live:true});
  wasLive=allowed;update.key=key;bridge.tick();
  return {...bridge.observation(),implementation:'cg-fallback',claimVisibleAction:false,presentation:last};
 }
 return {update,suspend(){manual=true;wasLive=false;bridge.suspend()},resume(){manual=false;wasLive=false;bridge.resume()},hide(){wasLive=false;bridge.setVisible(false)},observation:()=>({...bridge.observation(),implementation:'cg-fallback',claimVisibleAction:false})};
}
