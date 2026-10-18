import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createCanvas,loadImage} from '@napi-rs/canvas';

const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../wendao/bedroom-renderer.js',import.meta.url),'utf8'),context);
const A=context.WendaoBedroomArt;
const images=Object.fromEntries(await Promise.all(Object.entries(A.FILES).map(async([id,file])=>[id,await loadImage(new URL('../wendao/assets/'+file,import.meta.url).pathname)])));
const painter=A.makePainter({images,makeCanvas:createCanvas});
function imagePixels(img){const c=createCanvas(1536,1024),g=c.getContext('2d');g.drawImage(img,0,0);return g.getImageData(0,0,1536,1024).data;}
function render(motion,night=false){const c=createCanvas(1536,1024),g=c.getContext('2d');painter.draw(g,{motion,severe:false},{night,animate:true,time:0});return g.getImageData(0,0,1536,1024).data;}
function difference(a,b,x,y,w,h){let n=0;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=(yy*1536+xx)*4;if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>12)n++;}return n;}
const base=imagePixels(images.base),closedSource=imagePixels(images.closed);

test('decoded painted eyelids, gaze and mouth actually change face pixels, with the background fixed',()=>{
 const closed=render({lidClosure:1});
 assert.ok(difference(base,closed,1105,262,70,40)>300,'first eye must visibly close');
 assert.ok(difference(base,closed,1172,312,60,40)>200,'second eye must visibly close');
 // The center must contain the real closed-eye painting, not transparent mask
 // pixels, an opaque fill or a phase-only mock. This failed before the fix.
 for(const[x,y]of[[1140,282],[1202,332]]){const i=(y*1536+x)*4;assert.deepEqual(Array.from(closed.slice(i,i+4)),Array.from(closedSource.slice(i,i+4)));}
 assert.equal(difference(base,closed,0,0,1000,1024),0);
 const greeting=render({gaze:'player',reactionWeight:1,smile:true,smileWeight:.75,lidClosure:0});
 assert.ok(difference(base,greeting,1105,262,70,40)>150,'eye painting must be visible');
 assert.ok(difference(base,greeting,1095,342,58,36)>100,'mouth painting must be visible');
 assert.equal(difference(base,greeting,0,0,1000,1024),0);
});

test('breathing changes only a local mesh and closed eyelids remain visible over night art',()=>{
 const breathe=render({breath:.35,lidClosure:0});
 assert.ok(difference(base,breathe,670,300,470,300)>500,'shoulder/chest mesh must actually deform');
 assert.equal(difference(base,breathe,0,0,640,1024),0,'fixed scene cannot move');
 assert.equal(difference(base,breathe,1160,450,376,574),0,'bedside props cannot move');
 const nightOpen=render({lidClosure:0},true),nightClosed=render({lidClosure:1},true);
 assert.ok(difference(nightOpen,nightClosed,1105,262,70,40)>300,'night eyelid layer must remain visible');
 assert.equal(difference(nightOpen,nightClosed,0,0,1000,1024),0);
});

test('micro gesture pixels are confined to original hand/shoulder/face; bedding and medicine stay fixed',()=>{
 const hand=render({quiltFingers:.75,lidClosure:0,breath:0});
 assert.ok(difference(base,hand,820,540,240,120)>120,'painted fingers/quilt must actually change pixels');
 assert.equal(difference(base,hand,0,0,770,1024),0,'left room and bed never move');
 assert.equal(difference(base,hand,1160,450,376,574),0,'medicine bowl and table never move');
 const cough=render({suppressedCough:.8,lidClosure:0,breath:0});
 assert.ok(difference(base,cough,720,290,400,300)>100,'shoulder and sleeve compress gently');
 assert.ok(difference(base,cough,1100,270,160,145)>100,'head gives a slight independent response');
 assert.equal(difference(base,cough,0,0,640,1024),0,'room is not a bouncing camera');
});
