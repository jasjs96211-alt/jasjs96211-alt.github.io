import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');export const KEY='sisu_2027_study_workbench_v1',WD='yuanhang_wendao_v1';
export function boot(storage=new Map(),fetcher=async()=>{throw Error('offline')}){
 const all=[],ids=new Map(),timers=new Map(),timeouts=new Map();let counter=0;const attrs=(raw)=>Object.fromEntries([...raw.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(m=>[m[1],m[2]??'']));
 class El{
 constructor(tag='div',a={}){this.tag=tag;this.attrs=a;this.children=[];this.dataset={};this.style={setProperty(){}};this.value=a.value||'';this.id=a.id||'';this.hidden='hidden'in a;this.disabled=false;this.events={};this.textContent='';this.checked='checked'in a;this.classes=new Set((a.class||'').split(' '));this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x),contains:x=>this.classes.has(x),toggle:(x,v)=>v===false?this.classes.delete(x):this.classes.add(x)};for(const[k,v]of Object.entries(a))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;all.push(this);if(this.id)ids.set(this.id,this)}
 set innerHTML(value){this.html=value;this.children=[];for(const m of value.matchAll(/<([a-z][a-z0-9]*)([^>]*)>/gi)){const e=new El(m[1],attrs(m[2]));this.children.push(e)}}get innerHTML(){return this.html||''}
 append(...els){for(const e of els){this.children.push(e);if(e.id)ids.set(e.id,e)}}appendChild(e){this.append(e)}remove(){this.removed=true}setAttribute(k,v){this.attrs[k]=v}addEventListener(k,v){this.events[k]=v}querySelectorAll(q){return select(q,this.children)}querySelector(q){return this.querySelectorAll(q)[0]||null}closest(){return null}focus(){}reset(){}click(){return this.onclick?.({target:this})}
 }
 function select(q,list=all){return list.filter(e=>!e.removed&&(q.startsWith('.')?e.classes.has(q.slice(1)):q.startsWith('[')?Object.hasOwn(e.attrs,q.slice(1,-1).split('=')[0]):q===e.tag))}
 const body=new El('body');body.innerHTML=html;
 const doc={body,hidden:false,activeElement:null,getElementById:id=>ids.get(id)||null,querySelectorAll:q=>select(q),querySelector:q=>select(q)[0],createElement:t=>new El(t),events:{},addEventListener(k,fn){(this.events[k]??=[]).push(fn)}};
 const data={events:[],sessions:[{id:'old',date:'2026-10-14',minutes:60,subject:'622'}],screen:{},usageSessions:[]};if(!storage.has(KEY))storage.set(KEY,JSON.stringify(data));
 const context=vm.createContext({console,Intl,Date,Math,JSON,Set,Map,Number,String,Array,Object,RegExp,Blob,URL,TextDecoder,Uint8Array,atob,decodeURIComponent,AbortSignal,AbortController,crypto:{randomUUID:()=>String(++counter)},document:doc,navigator:{},location:{protocol:'file:',hash:'',pathname:'/yuanhang/',search:''},history:{replaceState(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setInterval:f=>{const id=++counter;timers.set(id,f);return id},clearInterval:id=>timers.delete(id),setTimeout:(fn,ms)=>{const id=++counter;timeouts.set(id,{fn,ms});return id},clearTimeout:id=>timeouts.delete(id),confirm:()=>true,prompt(){},fetch:fetcher,Image:El,FileReader:class{}});
 context.window=context;context.addEventListener=()=>{};context.scrollTo=()=>{};
 vm.runInContext(readFileSync(new URL('../../usage.js',import.meta.url),'utf8'),context);for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(m[1],context);
 for(const f of ['novel.js','engine.js','story.js','app.js'])vm.runInContext(readFileSync(new URL('../../wendao/'+f,import.meta.url),'utf8'),context);
 const get=id=>ids.get(id),run=code=>vm.runInContext(code,context),snapshot=()=>JSON.parse(storage.get(WD));
 const action=async(name,extra={})=>{const b=get('wendao').children.find(x=>x.dataset.wd===name&&Object.entries(extra).every(([k,v])=>x.dataset[k]===v));assert.ok(b,'Missing action '+name);await b.onclick()};
 const tab=name=>get('wendao').children.find(x=>x.dataset.tab===name).onclick();return{get,run,snapshot,storage,action,tab,timers,timeouts,data,document:doc};
}
