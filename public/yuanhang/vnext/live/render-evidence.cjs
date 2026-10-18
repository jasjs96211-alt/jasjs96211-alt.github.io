/* Actual production painter + actual controller, executed in native Canvas2D.
 * This is renderer output, NOT a browser/screen recording or mobile FPS test.
 * NODE_PATH must resolve @napi-rs/canvas; ffmpeg must be on PATH. No app storage.
 * Run: node --expose-gc render-evidence.cjs [output-directory] [short|five-minute]
 */
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const fs=require('fs'),path=require('path'),vm=require('vm'),{spawn,spawnSync}=require('child_process'),{once}=require('events');
const dir=path.resolve(__dirname,'../../wendao'),out=process.argv[2]||path.resolve(__dirname,'evidence'),long=process.argv[3]==='five-minute';fs.mkdirSync(out,{recursive:true});
// Bound native Canvas memory during export. Each worker replays the SAME seeded
// controller from t=0, then renders its exact contiguous frame range. No action
// clock resets, missing frames, speed changes or fabricated intermediate frames.
if(long&&!process.env.WENDAO_EVIDENCE_PART){
 const start=Date.now(),parts=[];
 for(let part=0;part<5;part++){
  const run=spawnSync(process.execPath,['--expose-gc',__filename,out,'five-minute'],{env:{...process.env,WENDAO_EVIDENCE_PART:String(part+1)},stdio:'inherit'});
  if(run.status!==0)process.exit(run.status||1);parts.push(`part-${part+1}.mp4`);
 }
 const list=path.join(out,'concat.txt');fs.writeFileSync(list,parts.map(p=>`file '${p}'`).join('\n'));
 const run=spawnSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',path.join(out,'bedroom-five-minute.mp4')],{stdio:'inherit'});
 if(run.status!==0)process.exit(run.status||1);
 for(const p of parts)fs.unlinkSync(path.join(out,p));fs.unlinkSync(list);
 const tracePath=path.join(out,'five-minute-trace.json'),trace=JSON.parse(fs.readFileSync(tracePath));trace.renderWallMs=Date.now()-start;trace.exportBatchSeconds=60;fs.writeFileSync(tracePath,JSON.stringify(trace,null,2)+'\n');
 console.log(JSON.stringify({filename:'bedroom-five-minute.mp4',seconds:300,bytes:fs.statSync(path.join(out,'bedroom-five-minute.mp4')).size}));process.exit(0);
}
const font=process.env.WENDAO_EVIDENCE_FONT;if(font)GlobalFonts.registerFromPath(font,'WendaoCJK');
const c=vm.createContext({});for(const f of ['bedroom-behavior.js','bedroom-renderer.js'])vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),c);
(async()=>{const A=c.WendaoBedroomArt,B=c.WendaoBedroom,images=Object.fromEntries(await Promise.all(Object.entries(A.FILES).map(async([id,file])=>[id,await loadImage(path.join(dir,'assets',file))]))),painter=A.makePainter({images,makeCanvas:createCanvas});
 const scene=createCanvas(1152,768),sg=scene.getContext('2d'),frame=createCanvas(1280,800),g=frame.getContext('2d'),b=B.create({manifest:A.manifest(true)}),t=Date.parse('2026-10-17T20:00:00+08:00'),fps=long?12:30,seconds=long?300:32;
 const part=Number(process.env.WENDAO_EVIDENCE_PART||0),from=long?(part-1)*60:0,to=long?part*60:seconds;
 const filename=long?`part-${part}.mp4`:'bedroom-live-demo.mp4';
 const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s','1280x800','-r',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,filename)],{stdio:['pipe','ignore','inherit']});
 const trace=[],start=Date.now();let prev='';
 for(let i=0;i<to*fps;i++){
  const ms=Math.round(i*1000/fps),night=long||ms>=16000;
  const s=b.tick({at:t+ms,state:{portrait:{state:'ill'},vitals:{seriousInjury:true,acuteInjury:false},recoveryCGAllowed:true},world:{sister:'bedroom',player:'bedroom',together:true},focus:{id:ms>=24000?'recording-focus':null,running:ms>=24000},intent:i===12*fps?'look':null});
  const key=s.phase+':'+(s.reaction?.cue||'');if(key!==prev){trace.push({ms,phase:s.phase,clip:s.clip,title:s.title,text:s.text,props:s.props,reaction:s.reaction});prev=key;}
  if(i<from*fps)continue;
  painter.draw(sg,s,{width:1152,height:768,night,time:ms});
  g.fillStyle='#12231f';g.fillRect(0,0,1280,800);g.fillStyle='#efe0bc';g.font='24px WendaoCJK, sans-serif';g.fillText('知遥寝居 · 实际绘制器输出',24,38);g.font='14px WendaoCJK, sans-serif';g.fillStyle='#b8c6b6';g.fillText('1× 时间 · 非浏览器录屏 · 不读写学习数据',24,64);
  g.drawImage(scene,0,94,896,597);g.font='18px WendaoCJK, sans-serif';g.fillStyle='#eadbb9';g.fillText(s.title,24,725);g.font='15px WendaoCJK, sans-serif';g.fillText(s.text,24,753);
  g.font='15px WendaoCJK, sans-serif';g.fillText('原静态画面 · 面部',922,98);g.drawImage(images.base,1040,235,245,165,920,110,336,226);
  g.fillText('当前局部动作 · 面部',922,379);g.drawImage(scene,780,176.25,183.75,123.75,920,390,336,226);
  g.font='14px WendaoCJK, sans-serif';g.fillStyle='#b8c6b6';g.fillText(`${(ms/1000).toFixed(1)} s · ${night?'夜间暖光':'白日'} · ${s.phase}`,922,661);
  const event=ms<4000?'进场 → 抬眼 → 浅笑':ms>=12000&&ms<15500?'点击 → 柔和回应':ms>=24000&&ms<28000?'开始专注 → 轻声安抚':'自然待机';g.fillText(event,922,690);
  if([0,2*fps,7*fps,18*fps,80*fps].includes(i))fs.writeFileSync(path.join(out,`${long?'long':'short'}-${i/fps}s.png`),frame.toBuffer('image/png'));
  const rgba=g.getImageData(0,0,1280,800).data;if(!ff.stdin.write(Buffer.from(rgba.buffer,rgba.byteOffset,rgba.byteLength)))await once(ff.stdin,'drain');
  if(i%(fps*2)===0&&global.gc)global.gc();
  if(i&&i%(fps*30)===0)console.log(`Rendered ${i/fps}/${seconds}s`);
 }
 ff.stdin.end();const [code]=await once(ff,'exit');if(code)throw Error('ffmpeg exit '+code);
 fs.writeFileSync(path.join(out,long?'five-minute-trace.json':'demo-trace.json'),JSON.stringify({kind:'production-renderer-output-not-browser-recording',seconds,fps,renderWallMs:Date.now()-start,trace},null,2)+'\n');
 console.log(JSON.stringify({filename,seconds,fps,bytes:fs.statSync(path.join(out,filename)).size}));
})().catch(e=>{console.error(e);process.exitCode=1});
