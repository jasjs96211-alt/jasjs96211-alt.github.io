// node scripts/wendao-package-bedroom-space.mjs (uses the existing Vite toolchain)
import {rolldown} from 'rolldown';
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const repo = fileURLToPath(new URL('../', import.meta.url));
const dir = new URL('../public/yuanhang/labs/bedroom-space/', import.meta.url);
const bundle = await rolldown({input: repo + 'public/yuanhang/labs/bedroom-space/preview.js'});
const {output} = await bundle.generate({format:'iife', codeSplitting:false, minify:true});
await bundle.close();
if (output.length !== 1 || output[0].type !== 'chunk') throw new Error('Preview must contain exactly one inline JavaScript chunk');
const js = output[0].code;
const css = readFileSync(new URL('preview.css', dir), 'utf8');
const names = ['sister-calm.webp', 'sister-tired.webp', 'sister-ill.webp', 'sister-injured.webp', 'sister-concerned.webp', 'sister-relieved.webp', 'zhiyao-recovery-cg.webp'];
const art = Object.fromEntries(names.map(name => [name, 'data:image/webp;base64,' + readFileSync(new URL('../public/yuanhang/wendao/scene3d/art/reference/' + name, import.meta.url)).toString('base64')]));
let html = readFileSync(new URL('index.html', dir), 'utf8');
html = html.replace('<link rel="stylesheet" href="./preview.css">', () => '<style>' + css + '</style>');
html = html.replace('<script type="module" src="./preview.js"></script>', () => '<script>globalThis.WENDAO_REVIEW_ART=' + JSON.stringify(art) + ';' + js.replace(/<\/script/gi, '<\\/script') + '</script>');
for (const name of names) {html = html.replaceAll('../../wendao/assets/' + name, art[name]); html = html.replaceAll('../../wendao/scene3d/art/reference/' + name, art[name]);}
const turn = 'data:image/webp;base64,' + readFileSync(new URL('../public/yuanhang/wendao/scene3d/art/zhiyao-turnaround-s0.webp', import.meta.url)).toString('base64');
html = html.replaceAll('../../wendao/scene3d/art/zhiyao-turnaround-s0.png', turn).replaceAll('../../wendao/scene3d/art/zhiyao-turnaround-s0.webp', turn);
html = html.replace(/[\t ]+$/gm, '');
writeFileSync(process.env.WENDAO_PACKAGE_OUTPUT || new URL('bedroom-space-s0.html', dir), html);
console.log('Self-contained character review page: ' + Buffer.byteLength(html) + ' bytes. No CDN or storage access.');
