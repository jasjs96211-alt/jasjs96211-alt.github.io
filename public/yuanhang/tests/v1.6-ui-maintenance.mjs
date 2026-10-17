import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boot,WD} from './helpers/wendao-dom.mjs';

const at=Date.parse('2026-10-17T10:10:00+08:00');
const setup=()=>{const a=boot(new Map(),undefined,{at});a.get('wdEnter').onclick();return a};

test('game stage shows two main controls, rest of original actions remain reachable through menu',()=>{
 const a=setup(),stage=a.get('wdPlayer'),menu=a.get('wdGameMenu'),toggle=a.get('wdMenuToggle');
 assert.ok(stage.innerHTML.includes('id="wdInboxButton"'));
 assert.equal(menu.hidden,true);
 assert.equal(toggle.attrs['aria-expanded'],'false');
 assert.ok(menu);for(const name of ['wdResume','wdStoryButton','wdTalk','wdCompanion','wdSave','wdGallery','wdStatusButton','wdSettingsButton','wdClose'])assert.ok(a.get(name),name);
 toggle.onclick();assert.equal(menu.hidden,false);assert.equal(toggle.attrs['aria-expanded'],'true');
 toggle.onclick();assert.equal(menu.hidden,true);
});
test('main stage and companion render exactly three HP MP XP bars with named values',()=>{
 const a=setup(),html=a.get('wdVitals').innerHTML;
 assert.match(html,/wd-hero-stat-hp/);assert.match(html,/wd-hero-stat-mp/);assert.match(html,/wd-hero-stat-xp/);
 assert.match(html,/气血/);assert.match(html,/灵力/);assert.match(html,/修为/);
 assert.equal((html.match(/role="progressbar"/g)||[]).length,3);
 a.get('wdCompanion').onclick();const hero=a.get('wcHeroVitals');
 assert.equal((hero.innerHTML.match(/role="progressbar"/g)||[]).length,3);
 assert.match(a.get('wcVitals').innerHTML,/饱腹|心情/);
});
test('detail sections do not collapse when character HUD is refreshed',()=>{
 const a=setup();a.get('wdCompanion').onclick();
 const detail=a.get('wcVitals');
 const outer=detail.querySelectorAll('details')[0];assert.ok(outer);
 outer.open=true;
 a.run('window.WendaoCompanion.refresh()');
 assert.equal(a.get('wcVitals').querySelectorAll('details')[0].open,true);
});
test('paper drawer retains open sections and supports a visible return',()=>{
 const a=setup();a.get('wdSettingsButton').onclick();
 const panel=a.get('wendao');assert.equal(a.document.body.classList.contains('wd-drawer-open'),true);
 assert.match(panel.innerHTML,/wd-drawer-close/);
 const details=panel.querySelectorAll('details');
 if(details.length){details[0].open=true;a.run('window.Wendao.sync()');assert.equal(a.get('wendao').querySelectorAll('details')[0].open,true)}
 panel.querySelector('.wd-drawer-close')?.events.click?.();
 assert.equal(a.document.body.classList.contains('wd-drawer-open'),false);
});
test('read backlog and saved slot overlays have explicit return controls',()=>{
 const a=setup();a.get('wdSave').onclick();
 assert.equal(a.get('wdSlots').hidden,false);
 assert.equal(a.get('wdOverlayBack').hidden,false);
 a.get('wdOverlayBack').onclick();
 assert.equal(a.get('wdSlots').hidden,true);
 assert.equal(a.get('wdOverlayBack').hidden,true);
});
test('fresh installation starts awake without creating learning or DDL events',()=>{
 const a=setup(),s=a.snapshot();
 assert.equal(s.supervision.mode,'awake');
 assert.equal(s.supervision.judgements.length,0);
 assert.equal(s.supervision.deadlines.punishments.length,0);
 assert.equal(a.storage.get(WD)!==undefined,true);
});
test('explicit reasonable rest and untimed sleep are NOT silently overridden',async()=>{
 const a=setup();a.tab('cultivate');
 await a.action('exempt');assert.equal(a.snapshot().supervision.mode,'exempt');
 a.clock.set(at+30*60000);a.run('window.Wendao.sync()');assert.equal(a.snapshot().supervision.mode,'exempt');
 await a.action('sleep');a.clock.set(at+90*60000);a.run('window.Wendao.sync()');assert.equal(a.snapshot().supervision.mode,'sleep');
});
test('timed nap returns to awake after nap expiry without retroactively punishing sleep',()=>{
 const a=setup(),fixture=a.snapshot();
 fixture.supervision.mode='sleep';fixture.supervision.modeStart=at;fixture.supervision.cursor=at;
 fixture.rhythmState.napUntil=at+20*60000;
 a.storage.set(WD,JSON.stringify(fixture));a.run('window.Wendao.reloadLocal()');
 const before=a.snapshot().supervision.judgements.length;
 a.clock.set(at+21*60000);a.run('window.Wendao.sync()');
 assert.equal(a.snapshot().supervision.mode,'awake');
 assert.equal(a.snapshot().supervision.judgements.length,before);
});
test('styles and offline shell include game HUD and readable mobile layout',()=>{
 const css=readFileSync(new URL('../wendao/ui-v16.css',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const label of ['wd-hero-stat-hp','wd-hero-stat-mp','wd-hero-stat-xp','wd-game-menu','wd-overlay-back','wc-hero-vitals'])assert.ok(css.includes(label),label);
 assert.match(css,/@media\(max-width:720px\)/);assert.match(css,/orientation:landscape/);
 assert.ok(sw.includes('./wendao/ui-v16.css?v=20261017-v16-ui2'));
 assert.ok(html.includes('./wendao/ui-v16.css?v=20261017-v16-ui2'));
});
