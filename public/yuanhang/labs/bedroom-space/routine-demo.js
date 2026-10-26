// Explicit laboratory fixture, not the production scheduler or a real life ledger.
// Dwell uses visible scene time. No offline progress, no writes or medication outcome.
export function createRoutineDemo(bridge,{now=()=>Date.now()}={}) {
  const steps=[{activity:'read',label:'在书案看书',dwell:8},{activity:'medicine',label:'取药与服药占位演示',dwell:4},{activity:'rest',label:'回榻休息',dwell:0}];
  let run=0,index=-1,sequence=0,currentId=null,settledAt=null,active=false,phase='idle';
  function send(){
    const at=now();currentId=`bedroom-lab:${run}:${index}`;settledAt=null;
    const result=bridge.submit({id:currentId,sequence:sequence++,source:'lab',activity:steps[index].activity,requestedAt:at,expiresAt:at+120000});
    if(!result.accepted){active=false;phase=result.reason;return false;}
    phase='running';return true;
  }
  function start(){if(bridge.observation().busy)return false;run++;index=0;active=true;bridge.resume();return send();}
  function stop(){active=false;phase='stopped';bridge.suspend();}
  function update(time){
    if(!active)return;
    const o=bridge.observation();
    if(['state-blocked','permission-revoked','clock-hold','hidden','awaiting-fresh-intent','manual','expired','rejected-by-scene','cancelled'].includes(o.reason)){active=false;phase=o.reason;return;}
    if(o.activeId!==currentId||o.busy||o.reason!=='complete')return;
    if(settledAt===null)settledAt=time;
    if(time-settledAt<steps[index].dwell){phase='dwelling';return;}
    index++;if(index>=steps.length){active=false;phase='complete';return;}send();
  }
  return {start,stop,update,get state(){return {active,phase,label:steps[index]?.label??'日常排演',step:Math.min(steps.length,index+1),total:steps.length};}};
}
