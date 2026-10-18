// npm exec --yes --package=esbuild@0.25.12 -- node scripts/wendao-package-bedroom-space.mjs
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const repo = fileURLToPath(new URL('../', import.meta.url));
const dir = new URL('../public/yuanhang/labs/bedroom-space/', import.meta.url);
const js = execFileSync(process.env.WENDAO_ESBUILD_BIN || 'esbuild', [
  'public/yuanhang/labs/bedroom-space/preview.js', '--bundle', '--format=iife', '--minify', '--legal-comments=inline', '--target=safari16'
], {cwd: repo, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024});
const css = readFileSync(new URL('preview.css', dir), 'utf8');
const cg = readFileSync(new URL('../public/yuanhang/wendao/assets/zhiyao-recovery-cg.webp', import.meta.url));
let html = readFileSync(new URL('index.html', dir), 'utf8');
html = html.replace('<link rel="stylesheet" href="./preview.css">', () => '<style>' + css + '</style>');
html = html.replace('<script type="module" src="./preview.js"></script>', () => '<script>' + js.replace(/<\/script/gi, '<\\/script') + '</script>');
html = html.replace('../../wendao/assets/zhiyao-recovery-cg.webp', () => 'data:image/webp;base64,' + cg.toString('base64'));
html = html.replace(/[\t ]+$/gm, '');
writeFileSync(new URL('bedroom-space-r1.html', dir), html);
console.log('Self-contained review page: ' + Buffer.byteLength(html) + ' bytes. No CDN or storage access.');
