import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boot,WD} from './helpers/wendao-dom.mjs';

const at=(time)=>Date.parse('2026-10-17T'+time+'+08:00');
const setup=(time='12:30:00')=>{const a=boot(new Map(),undefined,{at:at(time)});a.get('wdEnter').onclick();return a};

test('free-study room changes artwork by Beijing daytime, existing nighttime preserved',()=>{
 const a=setup('12:30:00');
 assert.equal(a.get('wdScene').dataset.phase,'day');
 assert.match(a.get('wdScene').style.backgroundImage,/world-study\.webp/);
 const night=setup('23:30:00');
 assert.equal(night.get('wdScene').dataset.phase,'night');
 assert.match(night.get('wdScene').style.backgroundImage,/world-study-night-v1\.webp/);
});
test('letter collection is a single named modal and hides HUD while open',()=>{
 const a=setup();
 a.get('wdInboxButton').onclick();
 assert.equal(a.get('wdInbox').hidden,false);
 assert.equal(a.get('wdPlayer').classList.contains('wd-inbox-open'),true);
 assert.match(a.get('wdInbox').innerHTML,/wd-mail-header/);
 assert.match(a.get('wdInbox').innerHTML,/wdInboxClose/);
 a.get('wdInboxClose').onclick();
 assert.equal(a.get('wdInbox').hidden,true);
 assert.equal(a.get('wdPlayer').classList.contains('wd-inbox-open'),false);
});
test('reloading unread letter drawer preserves its scrolling position',()=>{
 const a=setup();a.get('wdInboxButton').onclick();const box=a.get('wdInbox');
 box.scrollTop=170;a.run('window.Wendao.sync()');
 assert.equal(a.get('wdInbox').scrollTop,170);
});
test('companion defaults to a compact panel; expanded options and mini timer remain available',()=>{
 const a=setup();a.get('wdCompanion').onclick();
 const companion=a.get('wdCompanionLayer');
 assert.equal(companion.classList.contains('wc-tools-open'),false);
 assert.ok(a.get('wcMiniTime').textContent);
 assert.ok(a.get('wcQuickFocus'));
 a.get('wcExpandPanel').onclick();
 assert.equal(companion.classList.contains('wc-tools-open'),true);
 a.get('wcExpandPanel').onclick();
 assert.equal(companion.classList.contains('wc-tools-open'),false);
});
test('map movement and directional labels keep writes limited to view preference',()=>{
 const a=setup(),before=a.snapshot(),layer=a.get('wdCompanionLayer');
 a.get('wdCompanion').onclick();a.get('wcMapToggle').onclick();
 const mapOption=layer.children.find(x=>x.dataset.wcTravel==='garden');
 assert.ok(mapOption);mapOption.onclick();
 assert.equal(a.run('window.WendaoCompanion.getWorldView().player'),'garden');
 assert.equal(a.get('wcMap').hidden,true);
 assert.equal(a.get('wcDirLeft').dataset.destination,'study');
 const after=a.snapshot();
 assert.deepEqual(after.supervision.deadlines,before.supervision.deadlines);
 assert.deepEqual(after.story.unlockedCG,before.story.unlockedCG);
 assert.equal(after.character.health,before.character.health);
});
test('CSS and offline shell contain new modal layer, compact dock, direction transitions and day scene',()=>{
 const css=readFileSync(new URL('../wendao/ui-mobile-polish.css',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const selector of ['wd-inbox-open','wd-mail-header','wc-direction-pad','wc-tools-open','wc-moving-out','data-phase="day"'])assert.ok(css.includes(selector),selector);
 assert.ok(sw.includes('./wendao/ui-mobile-polish.css?v=20261017-ui3'));
 assert.ok(html.includes('./wendao/ui-mobile-polish.css?v=20261017-ui3'));
});
