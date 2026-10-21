import * as THREE from './vendor/three.module.min.js';
// Small deterministic tiled surfaces, generated locally; no external images or CDN.
export function surfaceTexture(kind) {
  const n=128, data=new Uint8Array(n*n*4);
  let seed=19; const noise=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<n;y++) for(let x=0;x<n;x++) {
    const u=x/n*Math.PI*2,v=y/n*Math.PI*2;
    let value=.8;
    if(kind==='wood') value=.74+.055*Math.sin(u*13+1.2*Math.sin(v))+.035*Math.sin(u*31+.6*Math.sin(v*2))+.015*(noise()-.5);
    if(kind==='weave') value=.83+.035*(Math.sin(u*32)+Math.sin(v*32))+.025*(noise()-.5);
    if(kind==='paper') value=.87+.05*(noise()-.5)+.02*Math.sin(u*19+Math.sin(v*3));
    if(kind==='plaster') value=.88+.06*(noise()-.5)+.025*Math.sin(u*2)*Math.cos(v*3);
    const i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=Math.round(value*255);data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,n,n);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
export function makeSurfaces() {
  const textures=Object.fromEntries(['wood','weave','paper','plaster'].map(k=>[k,surfaceTexture(k)]));
  const make=(color,kind,roughness=.8,bump=.008)=>new THREE.MeshStandardMaterial({color,map:textures[kind],bumpMap:textures[kind],bumpScale:bump,roughness});
  return {
    wood:make(0x84705b,'wood',.66),edge:make(0x4c4237,'wood',.72),paleWood:make(0x9d886e,'wood',.72),
    wall:make(0xb8b1a0,'plaster',.98,.012),plaster:make(0xc9c1ae,'plaster',.98,.012),
    cloth:make(0x888b7c,'weave',.95,.006),linen:make(0xd4cebc,'weave',.98,.006),paper:make(0xd6c9ae,'paper',.96,.003)
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
