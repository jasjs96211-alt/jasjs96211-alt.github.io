/* Private Sites popup relay. No model key or ChatGPT token enters the workbench. */
(function(root){
'use strict';
const ORIGIN='https://yuanhang-wendao-ai.jasjs96211.chatgpt.site';
let popup,ready=false;const pending=new Map();
function dispatch(item){if(!ready||!popup||popup.closed)return;popup.postMessage({type:'wendao:request',id:item.id,path:item.path,payload:item.payload},ORIGIN)}
root.addEventListener('message',e=>{if(e.origin!==ORIGIN||e.source!==popup||!e.data)return;
 if(e.data.type==='wendao:ready'){ready=true;for(const x of pending.values())dispatch(x);return}
 if(e.data.type!=='wendao:response')return;const x=pending.get(e.data.id);if(!x)return;
 pending.delete(x.id);clearTimeout(x.timer);x.cleanup();x.resolve({ok:e.data.status>=200&&e.data.status<300,status:e.data.status,json:async()=>e.data.data});
});
function request(path,payload,{signal}={}){
 if(!['chat','status'].includes(path))return Promise.reject(Error('聊天操作无效'));
 if(signal?.aborted)return Promise.reject(Error('请求已停止'));
 if(!popup||popup.closed){ready=false;popup=root.open(ORIGIN+'/','wendao-private-chat','popup,width=600,height=760');if(!popup)return Promise.reject(Error('请允许打开私人聊天窗口，再点击连接'))}
 return new Promise((resolve,reject)=>{const id=root.crypto.randomUUID();const fail=message=>{const x=pending.get(id);if(!x)return;pending.delete(id);clearTimeout(x.timer);x.cleanup();reject(Error(message))};const onAbort=()=>fail('请求已停止；已发送的模型调用可能仍在处理');
 const item={id,path,payload,resolve,reject,cleanup:()=>signal?.removeEventListener('abort',onAbort),timer:setTimeout(()=>fail('私人聊天窗口未回应，请完成登录并保持窗口打开后重试'),path==='status'?90000:40000)};
 pending.set(id,item);signal?.addEventListener('abort',onAbort,{once:true});if(ready)dispatch(item);else popup.postMessage({type:'wendao:hello'},ORIGIN);
 });
}
root.WendaoTransport={origin:ORIGIN,request};
})(window);
