import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path,root),'utf8');
const app = read('wendao/app.js');
const companion = read('wendao/companion.js');
const css = read('wendao/scene-shortcuts.css');
const html = read('index.html');
const sw = read('sw.js');

test('standalone map and cultivation are visible actions on WenDao main stage',()=>{
  assert.match(app, /id="wdExploreQuick"[^>]*>◎ 地图<\/button>/);
  assert.match(app, /id="wdCultivateQuick"[^>]*>✦ 陪伴修炼<\/button>/);
  assert.match(app, /\$\('wdExploreQuick'\)\.onclick=\(\)=>enterCompanion\('explore'\)/);
  assert.match(app, /\$\('wdCultivateQuick'\)\.onclick=\(\)=>enterCompanion\('focus'\)/);
});
test('map opens as exploration without touching study session actions',()=>{
  assert.match(app, /function enterCompanion\(mode="focus"\)/);
  assert.match(app, /P\.open\(\{mode\}\)/);
  assert.match(companion, /function open\(\{mode='focus'\}=\{\}\)/);
  assert.match(companion, /const exploring=mode==='explore'/);
  assert.match(companion, /\$\('wcMap'\)\.hidden=!exploring/);
  assert.match(companion, /\$\('wcExploreBack'\)\.onclick=close/);
  assert.doesNotMatch(companion.slice(companion.indexOf('function open({mode='),companion.indexOf('function close(){')), /focusAction\(/);
});
test('exploration mode keeps map and wayfinding, hides study-only controls',()=>{
  assert.match(css, /\.wc-explore-mode \.wc-panel\{display:none!important\}/);
  assert.match(css, /wc-explore-back/);
  assert.match(companion,/\$\('wcMapToggle'\)\.setAttribute\('aria-expanded',String\(exploring\)\)/);
});
test('cache/version includes main map, companion and both new styles',()=>{
  for(const path of ['scene-shortcuts.css?v=20261017-scene-shortcuts-1','night-lighting.css?v=20261017-night-lighting-1','app.js?v=20261031-life1','companion.js?v=20261031-life1']){
    assert.ok(html.includes(path),path+' in html');
    assert.ok(sw.includes(path),path+' in offline shell');
  }
  assert.match(css,/wdScene\[data-phase="night"\]::after/);
});
