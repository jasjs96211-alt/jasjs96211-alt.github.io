import * as THREE from './vendor/three.module.min.js';
// Small deterministic tiled surfaces, generated locally; no external images or CDN.
export function surfaceTexture(kind) {
  const n=128, data=new Uint8Array(n*n*4);
  let seed=19; const noise=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const grid=Array.from({length:256},()=>noise());
  function field(x,y) {
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,s=t=>t*t*(3-2*t);
    const at=(a,b)=>grid[((b%16+16)%16)*16+(a%16+16)%16];
    const a=at(ix,iy)*(1-s(fx))+at(ix+1,iy)*s(fx),b=at(ix,iy+1)*(1-s(fx))+at(ix+1,iy+1)*s(fx);
    return a*(1-s(fy))+b*s(fy);
  }
  for(let y=0;y<n;y++) for(let x=0;x<n;x++) {
    const u=x/n*Math.PI*2,v=y/n*Math.PI*2,grain=field(x/8+.6*Math.sin(v),y/128);
    let value=.8;
    if(kind==='wood') value=.79+.10*(grain-.5)+.014*Math.sin(u*23+1.4*Math.sin(v)+grain*4)+.008*(noise()-.5);
    if(kind==='weave') value=.87+.018*(Math.sin(u*32)+Math.sin(v*32))+.018*(noise()-.5);
    if(kind==='paper') value=.9+.025*(noise()-.5)+.012*field(x/8,y/16);
    if(kind==='plaster') value=.9+.025*(noise()-.5)+.015*field(x/32,y/32);
    if(kind==='roughness') value=.88+.09*field(x/8,y/8);
    const i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=Math.round(value*255);data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,n,n);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
export function makeSurfaces() {
  const textures=Object.fromEntries(['wood','weave','paper','plaster','roughness'].map(k=>[k,surfaceTexture(k)]));
  const make=(color,kind,roughness=.8,bump=.008)=>new THREE.MeshStandardMaterial({color,map:textures[kind],bumpMap:textures[kind],bumpScale:bump,roughness,roughnessMap:textures.roughness});
  return {
    wood:make(0x817360,'wood',.84,.004),edge:make(0x51483e,'wood',.86,.004),paleWood:make(0x9c8e76,'wood',.86,.004),
    floor:make(0x897d6a,'wood',.9,.003),floorWorn:make(0x8e826f,'wood',.94,.003),screen:make(0xb8b19e,'weave',1,.002),
    wall:make(0xb8b1a0,'plaster',.98,.012),plaster:make(0xc9c1ae,'plaster',.98,.012),
    cloth:make(0x888b7c,'weave',1,.002),linen:make(0xd4cebc,'weave',1,.002),paper:make(0xd6c9ae,'paper',1,.0015)
  };
}
export function softenedBox(size, radius=.012) {
  const [w,h,d]=size,r=Math.min(radius,w/5,h/5,d/5),shape=new THREE.Shape();
  const x=w/2-r,y=h/2-r;shape.moveTo(-x,-y);shape.lineTo(x,-y);shape.lineTo(x,y);shape.lineTo(-x,y);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,steps:1,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,curveSegments:1});g.center();
  const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  // Physical texture scale: grain stays consistent across thin rails and large furniture.
  for(let i=0;i<p.count;i++) {
    const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
    const u=ax>ay&&ax>az?p.getZ(i):p.getX(i),v=ay>ax&&ay>az?p.getZ(i):p.getY(i);
    uv.setXY(i,u*2,v*2);
  }
  return g;
}
