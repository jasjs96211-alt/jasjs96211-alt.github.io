// Resource and state-only checks: real iPhone graphics are a separate visual QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../wendao/app.js',import.meta.url),'utf8');
const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../wendao/style.css',import.meta.url),'utf8');
const story=readFileSync(new URL('../wendao/story.js',import.meta.url),'utf8');
function mockImage(){
 const loading={hidden:true},failure={hidden:true},timeouts=[];
 const frame={querySelector:selector=>selector.includes('loading')?loading:failure};
 const img={
  style:{},dataset:{portraitSource:'./wendao/assets/sister-injured.webp?v=20261016-unbound'},
  isConnected:true,complete:false,naturalWidth:0,_src:'',
  closest:()=>frame,
  getAttribute:()=>img._src||img.dataset.portraitSource,
  set src(value){this._src=value;this.complete=false;this.naturalWidth=0},
  get src(){return this._src}
 };
 const root={querySelector:()=>img};
 const start=app.indexOf('function retryPortraitImage(){');
 const end=app.indexOf('function openDB(){',start);
 assert.ok(start>0&&end>start,'image recovery helpers exist');
 const functions=new Function('$','Date','setTimeout','navigator',app.slice(start,end)+
  ';return {bindPortraitImage,retryPortraitImage};');
 const api=functions(()=>root,Date,callback=>(timeouts.push(callback),timeouts.length),{onLine:true});
 return {api,img,loading,failure,timeouts};
}
test('image remains in loading state until real data loads',()=>{
 const v=mockImage();v.api.bindPortraitImage(v.img);
 assert.equal(v.loading.hidden,false);assert.equal(v.failure.hidden,true);
 assert.equal(v.img.style.visibility,'hidden');
 v.img.complete=true;v.img.naturalWidth=1024;v.img.onload();
 assert.equal(v.loading.hidden,true);assert.equal(v.failure.hidden,true);
 assert.equal(v.img.style.visibility,'visible');
});
test('broken large portrait retries once, then displays actionable error',()=>{
 const v=mockImage();v.api.bindPortraitImage(v.img);
 v.img.onerror();assert.equal(v.timeouts.length,1);
 assert.equal(v.failure.hidden,true);
 v.timeouts[0]();assert.match(v.img.src,/retry_portrait=/);
 v.img.onerror();assert.equal(v.timeouts.length,1);assert.equal(v.failure.hidden,false);
 assert.equal(v.img.style.visibility,'hidden');
});
test('manual retry uses the original authored portrait URL and recovers',()=>{
 const v=mockImage();v.api.bindPortraitImage(v.img);
 v.img.dataset.portraitAutoRetry='1';v.img.onerror();
 assert.equal(v.failure.hidden,false);
 v.api.retryPortraitImage();
 assert.match(v.img.src,/sister-injured\.webp\?v=20261016-unbound&retry_portrait=/);
 assert.equal(v.failure.hidden,true);
 v.img.complete=true;v.img.naturalWidth=1024;v.img.onload();
 assert.equal(v.img.style.visibility,'visible');
});
test('sync renders reuse the same in-flight loaded image instead of resetting its src',()=>{
 assert.match(app,/oldPortrait\.dataset\.portraitSource===fresh\.dataset\.portraitSource/);
 assert.match(app,/fresh\.replaceWith\(oldPortrait\)/);
 assert.match(app,/data-portrait-source/);
 assert.match(app,/wd-portrait-error/);
 assert.match(css,/\.wd-portrait-error\[hidden\]/);
 assert.match(html,/wendao\/app\.js\?v=20261018-chronicle-breath1/);
 assert.match(html,/wendao\/style\.css\?v=20261018-chronicle-breath1/);
});
test('worker installs without downloading large portraits and reuses prior picture cache',async()=>{
 const registered={},stores=new Map(),old='yuanhang-static-v15-sync-conflict-review-r3-20261016';
 let claimed=false,skipped=false;
 const local=name=>{
  if(!stores.has(name))stores.set(name,new Map());
  const mem=stores.get(name);
  return {addAll:async list=>{for(const url of list)mem.set(url,{ok:true})},
   match:async url=>mem.get(url),
   put:async(url,response)=>{mem.set(url,response)}};
 };
 const caches={keys:async()=>[...stores.keys()],open:async name=>local(name),delete:async name=>stores.delete(name)};
 const self={addEventListener:(type,callback)=>registered[type]=callback,
  skipWaiting:async()=>{skipped=true},clients:{claim:async()=>{claimed=true}},
  registration:{scope:'https://example.test/yuanhang/'},location:{origin:'https://example.test'}};
 const registry=new Function('self','caches','fetch','URL',sw+';return {CACHE,SHELL,ARTWORK};');
 const {CACHE,SHELL,ARTWORK}=registry(self,caches,()=>{},URL);
 assert.equal(SHELL.some(path=>path.endsWith('.webp')),false);
 assert.ok(ARTWORK.some(path=>path.includes('sister-injured.webp')));
 assert.ok(SHELL.includes('./wendao/app.js?v=20261018-chronicle-breath1'));
 assert.ok(SHELL.includes('./wendao/style.css?v=20261018-chronicle-breath1'));
 const cachedPath=ARTWORK.find(path=>path.includes('sister-injured.webp'));
 (await caches.open(old)).put(cachedPath,{ok:true,tag:'previously-cached'});
 let installed;registered.install({waitUntil:promise=>installed=promise});
 await installed;assert.equal(skipped,true);
 let activated;registered.activate({waitUntil:promise=>activated=promise});
 await activated;assert.equal(claimed,true);
 assert.equal((await caches.open(CACHE)).match instanceof Function,true);
 assert.equal((await(await caches.open(CACHE)).match(cachedPath)).tag,'previously-cached');
 assert.equal(stores.has(old),false);
});
test('all six state pictures remain exactly the existing artwork',()=>{
 const win={},interpret=new Function('window',story+';return window.WendaoContent;');
 const content=interpret(win);
 const portraits=content.assets.filter(asset=>asset.kind==='portrait');
 assert.equal(portraits.length,6);
 assert.equal(portraits.find(a=>a.id==='sister-weakened').src,'./wendao/assets/sister-injured.webp?v=20261016-unbound');
 for(const picture of portraits)assert.ok(sw.includes(picture.src),'worker preserves existing '+picture.id);
});
