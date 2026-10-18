/* Real painted eyelid/eye/mouth layers + a local skin mesh. No camera motion.
 * This painter is shared by the production scene and the offline video recorder.
 * Read/sip/sit-up clips are deliberately NOT advertised: their art is not ready.
 */
(function(root){
'use strict';
const WIDTH=1536,HEIGHT=1024,VERSION='bedroom-micro-1';
const FILES=Object.freeze({base:'zhiyao-recovery-cg.webp',night:'bedroom-live-night-v1.webp',closed:'bedroom-live-closed-v1.webp',greet:'bedroom-live-greet-v1.webp'});
const CLIPS=Object.freeze(['recline_breathe','blink','gaze','weak_smile','severe_rest','rest_pillow','recover_breathe','nap_enter','nap_loop','wake_slow']);
const clamp=x=>Math.max(0,Math.min(1,x));
function polygon(c,points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath()}
function makePainter({images,makeCanvas}){
 const eyes=[[1140,282,34,20,.57],[1202,332,30,18,.57]],mouth=[[1124,360,29,18,.5]];
 function face(img,ellipses,night){const out=makeCanvas(250,165);out.width=250;out.height=165;const c=out.getContext('2d'),mask=c.createImageData(250,165);
 // Rasterize the small alpha mask explicitly. Transforming a unit radial
 // gradient to a stretched ellipse produced an empty mask in native Canvas.
 // Absolute crop coordinates also avoid backend-dependent gradient transforms.
 for(let yy=0;yy<165;yy++)for(let xx=0;xx<250;xx++){let alpha=0;for(const[x,y,rx,ry,a]of ellipses){const dx=xx+1020-x,dy=yy+235-y,cs=Math.cos(a),sn=Math.sin(a),r=Math.hypot((dx*cs+dy*sn)/rx,(-dx*sn+dy*cs)/ry);alpha=Math.max(alpha,clamp((1-r)/.24))}mask.data[(yy*250+xx)*4+3]=Math.round(alpha*255)}
 c.putImageData(mask,0,0);c.globalCompositeOperation='source-in';c.drawImage(img,1020,235,250,165,0,0,250,165);
 // Match the night painting's local exposure, without changing eye/lip anatomy.
 if(night){c.globalCompositeOperation='source-atop';c.fillStyle='rgba(111,53,16,.10)';c.fillRect(0,0,WIDTH,HEIGHT)}return out}
 const layers=[false,true].map(n=>({closed:face(images.closed,eyes,n),gaze:face(images.greet,eyes,n),smile:face(images.greet,mouth,n)}));
 function tri(c,img,s,d){const[a,b,e]=s,[u,v,w]=d;const det=(b[0]-a[0])*(e[1]-a[1])-(e[0]-a[0])*(b[1]-a[1]);if(!det)return;
 const aa=((v[0]-u[0])*(e[1]-a[1])-(w[0]-u[0])*(b[1]-a[1]))/det,bb=((v[1]-u[1])*(e[1]-a[1])-(w[1]-u[1])*(b[1]-a[1]))/det;
 const cc=((w[0]-u[0])*(b[0]-a[0])-(v[0]-u[0])*(e[0]-a[0]))/det,dd=((w[1]-u[1])*(b[0]-a[0])-(v[1]-u[1])*(e[0]-a[0]))/det;
 c.save();polygon(c,d);c.clip();c.transform(aa,bb,cc,dd,u[0]-aa*a[0]-cc*a[1],u[1]-bb*a[0]-dd*a[1]);const sx=Math.min(a[0],b[0],e[0]),sy=Math.min(a[1],b[1],e[1]),sw=Math.max(a[0],b[0],e[0])-sx,sh=Math.max(a[1],b[1],e[1])-sy;c.drawImage(img,sx,sy,sw,sh,sx,sy,sw,sh);c.restore()}
 function mesh(c,img,rect,warp){const[x,y,w,h]=rect,step=64;for(let yy=y;yy<y+h;yy+=step)for(let xx=x;xx<x+w;xx+=step){const r=Math.min(xx+step,x+w),b=Math.min(yy+step,y+h),p=[[xx,yy],[r,yy],[r,b],[xx,b]],d=p.map(warp);tri(c,img,[p[0],p[1],p[2]],[d[0],d[1],d[2]]);tri(c,img,[p[0],p[2],p[3]],[d[0],d[2],d[3]])}}
 function overlay(c,img,a,dx=0,dy=0){if(a<=0)return;c.save();c.globalAlpha=clamp(a);c.drawImage(img,1020+dx,235+dy);c.restore()}
 function draw(c,s,{width=WIDTH,height=HEIGHT,night=false,time=0,animate=true}={}){
 const m=s.motion||{},l=layers[night?1:0],base=night?images.night:images.base;
 c.save();c.clearRect(0,0,width,height);c.scale(width/WIDTH,height/HEIGHT);c.drawImage(base,0,0,WIDTH,HEIGHT);
 const b=animate?(m.breath||0):0,h=animate&&!s.severe?(m.reactionWeight||0):0;
 if(b)mesh(c,base,[650,270,500,340],([x,y])=>{const r=((x-901)/235)**2+((y-450)/151)**2,w=r<1?(1-r)**2:0;return[x+b*w*.6,y-b*w*4]});
 if(h)mesh(c,base,[1020,190,310,230],([x,y])=>{const r=((x-1175)/149)**2+((y-305)/109)**2,w=r<1?(1-r)**2:0;return[x-.7*h*w,y-1.3*h*w]});
 overlay(c,l.gaze,m.gaze==='player'?(m.reactionWeight??1):0,-.5*h,-.7*h);
 overlay(c,l.smile,m.smile?(m.smileWeight??1):0,-.4*h,-.5*h);
 overlay(c,l.closed,m.lidClosure??(m.eyes===0?1:0),-.5*h,-.7*h);
 if(night&&animate){const pulse=.022+.009*Math.sin(time/371)+.006*Math.sin(time/173);const q=c.createRadialGradient(1425,693,2,1425,693,100);q.addColorStop(0,`rgba(255,192,91,${pulse*2})`);q.addColorStop(1,'rgba(255,172,61,0)');c.fillStyle=q;c.fillRect(1320,590,210,210)}
 c.restore();return {phase:s.phase,lidClosure:m.lidClosure||0,night};
 }
 return Object.freeze({draw});
}
function manifest(decoded){return {version:VERSION,status:'approved',pose:'lying',props:{bowl:'bedside'},clips:Object.fromEntries(CLIPS.map(id=>[id,{decoded,status:'approved'}]))}}
function create({canvas,onReady=()=>{},onError=()=>{},baseURL='./wendao/assets/'}={}){
 let painter=null,failed=false,pending=null;
 function load(){if(pending)return pending;failed=false;
 pending=Promise.all(Object.entries(FILES).map(([key,name])=>new Promise((resolve,reject)=>{const img=new root.Image();img.onload=()=>{if(img.naturalWidth!==WIDTH||img.naturalHeight!==HEIGHT)return reject(Error(name+': invalid dimensions'));resolve([key,img])};img.onerror=()=>reject(Error(name+': unavailable'));img.src=baseURL+name}))).then(entries=>{painter=makePainter({images:Object.fromEntries(entries),makeCanvas:()=>root.document.createElement('canvas')});onReady();return true}).catch(e=>{failed=true;painter=null;onError(e);return false}).finally(()=>{pending=null});return pending}
 function render(snapshot,options={}){if(!painter||!snapshot?.visible){canvas.hidden=true;return false}try{const c=canvas.getContext('2d');if(!c)throw Error('Canvas2D unavailable');if(canvas.width!==WIDTH){canvas.width=WIDTH;canvas.height=HEIGHT}painter.draw(c,snapshot,options);canvas.hidden=false;return true}catch(e){failed=true;painter=null;canvas.hidden=true;onError(e);return false}}
 return Object.freeze({load,render,ready:()=>!!painter,failed:()=>failed,manifest:()=>manifest(!!painter)});
}
root.WendaoBedroomArt=Object.freeze({WIDTH,HEIGHT,VERSION,FILES,CLIPS,manifest,makePainter,create});
})(typeof window!=='undefined'?window:globalThis);
