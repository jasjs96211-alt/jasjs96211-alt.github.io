import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { boot, WD } from './helpers/wendao-dom.mjs';

const source = readFileSync(new URL('../wendao/bedroom-behavior.js', import.meta.url), 'utf8');
const context = vm.createContext({}); vm.runInContext(source, context);
const B = context.WendaoBedroom;
const t = Date.parse('2026-10-17T12:00:00+08:00');
const manifest = () => ({ version: 'test-rig-1', status: 'placeholder', clips: Object.fromEntries(B.REQUIRED_CLIPS.map(id => [id, { status: 'placeholder', decoded: true }])) });
const facts = (overrides = {}) => ({ at: t, world: { sister: 'bedroom', player: 'bedroom', together: true, following: false }, state: { portrait: { state: 'ill' }, vitals: { seriousInjury: true, acuteInjury: false }, recoveryCGAllowed: true }, ...overrides });
function setup(options = {}) {
  const d = B.create({ manifest: manifest(), allowPlaceholder: true, ...options });
  let at = t;
  d.tick(facts());
  return { d, step(ms, override = {}) { let p; for (let n = 0; n < ms; n += Math.min(100, ms - n)) { at += Math.min(100, ms - n); p = d.tick(facts({ at, ...override })); } return p; }, at: () => at };
}
const plain = x => JSON.parse(JSON.stringify(x));

test('production refuses placeholder, missing and undecoded clips without false action claims', () => {
  for (const options of [{}, { manifest: manifest() }, { manifest: { ...manifest(), clips: {} }, allowPlaceholder: true }]) {
    const d = B.create(options), p = d.tick(facts());
    assert.equal(p.actionId, 'bed_asset_wait'); assert.equal(p.visible, false); assert.equal(p.clip, null);
    assert.equal(p.props.book, 'absent'); assert.doesNotMatch(p.text, /翻页|服药|已放下/);
  }
  const m = manifest(); m.clips.rest_pillow.decoded = false; m.clips.recline_breathe.decoded = false;
  assert.equal(B.create({ manifest: m, allowPlaceholder: true }).tick(facts()).visible, false);
});

test('five-minute deterministic run has real phase differences, legal prop ownership and one text/clip source', () => {
  const a = setup(), b = setup(), seen = new Set(), eyes = new Set(), breaths = new Set();
  const input = facts(), before = JSON.stringify(input);
  for (let i = 0; i < 600; i++) {
    const p = a.step(500), q = b.step(500);
    assert.deepEqual(plain(p), plain(q)); seen.add(p.phase); eyes.add(p.motion.eyes); breaths.add(p.motion.breath);
    assert.equal(p.location, 'bedroom'); assert.equal(p.pose === 'lying' || p.pose === 'reclined', true);
    const held = x => ['held', 'taking', 'placing'].includes(x);
    assert.ok(!(held(p.props.book) && held(p.props.bowl)), p.phase);
    assert.equal(a.d.forAI().actionId, p.actionId); assert.equal(a.d.forAI().phase, p.phase); assert.equal(a.d.forAI().description, p.text);
    if (p.phase === 'rest') { assert.equal(p.props.book, 'bedside'); assert.doesNotMatch(p.text, /已.*服药/); }
    if (p.phase === 'sip') { assert.equal(p.props.book, 'bedside'); assert.equal(p.props.bowl, 'held'); }
    if (p.phase === 'warm') assert.equal(p.props.bowl, 'bedside');
    if (p.sleeping) { assert.equal(p.reaction, null); assert.equal(p.motion.eyes, 0); }
  }
  for (const phase of ['read', 'turn', 'put_book', 'rest', 'take_bowl', 'sip', 'return_bowl', 'warm', 'nap_enter', 'nap', 'wake']) assert.ok(seen.has(phase), phase);
  assert.ok(eyes.size > 1); assert.ok(breaths.size > 30);
  a.d.tick(input); assert.equal(JSON.stringify(input), before);
});

test('page number changes after turn and book text does not claim placement before release', () => {
  const a = setup(); let p = a.step(40000);
  assert.equal(p.phase, 'turn'); assert.equal(p.props.page, 1);
  p = a.step(1400); assert.equal(p.props.page, 2); assert.equal(p.props.book, 'held');
  p = a.step(28000); assert.equal(p.phase, 'put_book'); assert.equal(p.props.book, 'placing'); assert.match(p.text, /正将/);
  p = a.step(3200); assert.equal(p.phase, 'rest'); assert.equal(p.props.book, 'bedside');
});

test('missing release asset prevents entering read; incomplete medicine chain is never announced', () => {
  const m = manifest(); delete m.clips.book_put_down; delete m.clips.bowl_return;
  const a = setup({ manifest: m });
  for (let i = 0; i < 400; i++) {
    const p = a.step(500);
    assert.equal(p.props.book, 'absent'); assert.equal(p.props.bowl, 'absent');
    assert.doesNotMatch(p.text, /药盏|书已|服药|轻抿|翻页/); assert.doesNotMatch(p.title, /用药/);
  }
});

test('acute injury still forces lying after portrait turns ill; presentation never changes canonical state', () => {
  const a = setup(); a.step(42000);
  const state = { portrait: { state: 'ill' }, vitals: { acuteInjury: true, seriousInjury: true }, injuryHistory: [{ id: 'original', days: 2 }], recoveryCGAllowed: true };
  const raw = JSON.stringify(state), p = a.step(100, { state });
  assert.equal(p.actionId, 'bed_heavy_injury'); assert.equal(p.pose, 'lying'); assert.notEqual(p.props.book, 'held'); assert.equal(JSON.stringify(state), raw);
  const q = a.step(1000, { state, intent: 'look' }); assert.equal(q.motion.smile, false); assert.notEqual(q.motion.breath, p.motion.breath);
});

test('sleeping suppresses entry, click and focus responses; wake requires a changed sleep fact', () => {
  const a = setup(); let p = a.step(100, { sisterSleeping: true }); assert.equal(p.sleeping, true);
  for (const intent of ['look', 'soft_smile', 'eyes_to_player']) {
    p = a.step(1000, { sisterSleeping: true, intent, focus: { id: 'x', running: true } });
    assert.equal(p.reaction, null); assert.equal(p.motion.eyes, 0); assert.equal(p.pose, 'lying');
  }
  p = a.step(100, { sisterSleeping: false }); assert.equal(p.phase, 'wake');
});

test('entry cooldown survives view changes and serialization; fast focus toggles do not spam', () => {
  const a = setup(); a.step(3000);
  a.step(100, { world: { sister: 'bedroom', player: 'study', together: false } });
  let p = a.step(100); assert.equal(p.reaction, null);
  const d = B.create({ manifest: manifest(), allowPlaceholder: true, snapshot: a.d.serialize() });
  p = d.tick(facts({ at: a.at() + 100 })); assert.equal(p.reaction, null);
  a.step(30000, { world: { sister: 'bedroom', player: 'study', together: false } });
  p = a.step(100); assert.equal(p.reaction.cue, 'entry');
  p = a.step(100, { focus: { id: 'focus', running: true } }); assert.equal(p.reaction.cue, 'entry');
});

test('background gaps and backward clocks do not advance action or produce sleep/DDL/study decisions', () => {
  const a = setup(); a.step(4500); const saved = a.d.serialize();
  let p = a.d.tick(facts({ at: a.at() + 3600000 }));
  assert.equal(p.resumedAfterGap, true); assert.equal(a.d.serialize().elapsed, saved.elapsed);
  p = a.d.tick(facts({ at: t - 1000 })); assert.equal(p.needsTimeReview, true); assert.equal(p.phase, 'clock_hold');
  assert.equal(p.reaction, null);
});

test('short hidden interval is not replayed; reduced motion preserves the factual stage and props', () => {
  const a = setup(); a.step(1000); const before = a.d.serialize().elapsed;
  a.step(1000, { hidden: true }); a.d.tick(facts({ at: a.at() + 3000 }));
  assert.equal(a.d.serialize().elapsed, before);
  const b = setup(), p = b.step(42500, { reducedMotion: true });
  assert.equal(p.phase, 'read_after'); assert.equal(p.props.book, 'held'); assert.equal(p.motion.breath, 0);
});

test('actual v1.6 engine remains the authority for first-day, next-day and non-acute recovery gates', () => {
  const c = vm.createContext({ Intl, Date }); c.window = c;
  for (const f of ['engine.js', 'story.js', 'world.js']) vm.runInContext(readFileSync(new URL('../wendao/' + f, import.meta.url), 'utf8'), c);
  const E = c.WendaoEngine, s = E.fresh(t - 3600000);
  s.supervision.deadlines.punishments = [{ id: 'ddl:fixture', at: t - 60000, result: 'summons', status: 'active', recoveryActions: [] }];
  const history = JSON.stringify(s.supervision.deadlines);
  for (const hours of [0, 24, 72]) {
    const at = t + hours * 3600000, state = { portrait: E.portrait(s, at), vitals: E.vitals(s, { sessions: [], events: [] }, at), recoveryCGAllowed: E.canViewRecoveryCG(s, at) };
    const world = c.WendaoWorld.derive({ at, state, playerPlace: 'bedroom', following: true });
    const d = B.create({ manifest: manifest(), allowPlaceholder: true }), p = d.tick({ at, state, world });
    assert.equal(p.location, 'bedroom'); assert.equal(p.following, false); assert.equal(p.recoveryCGAllowed, true);
    if (hours < 48) { assert.equal(p.actionId, 'bed_heavy_injury'); assert.equal(p.pose, 'lying'); }
    if (hours === 24) assert.equal(state.portrait.state, 'ill');
  }
  assert.equal(JSON.stringify(s.supervision.deadlines), history);
  const healthy = E.fresh(t); assert.equal(E.canViewRecoveryCG(healthy, t), false);
});

test('unsafe restored state is discarded; legitimate snapshot recomputes props instead of trusting injected facts', () => {
  const a = setup(); a.step(42000); const saved = a.d.serialize();
  const d = B.create({ manifest: manifest(), allowPlaceholder: true, snapshot: { ...saved, props: { bowl: 'held' }, health: 100 } });
  const p = d.tick(facts({ at: a.at() + 20000 })); assert.equal(p.phase, 'read_after'); assert.equal(p.props.bowl, 'bedside');
  for (const changes of [{ phase: '__proto__' }, { elapsed: Infinity }, { version: 99 }, { assetVersion: 'other' }, { page: -1 }]) {
    const c = B.create({ manifest: manifest(), allowPlaceholder: true, snapshot: { ...saved, ...changes } });
    assert.equal(c.tick(facts()).phase, 'read');
  }
});

test('LLM cannot write health, location, arbitrary action or timer through intention', () => {
  const a = setup();
  for (const intent of ['walk', 'cure', 'bowl_sip', { health: 100, location: 'garden', minutes: 25 }]) {
    const p = a.step(100, { intent });
    assert.equal(p.location, 'bedroom'); assert.equal(p.actionId, 'bed_read_note'); assert.equal(p.focus.id, null);
    assert.ok(Object.isFrozen(p)); assert.ok(Object.isFrozen(p.props));
  }
});

test('world authority wins over restored bedroom snapshot; no duplicate bedside props at another location', () => {
  const a = setup(), p = a.step(100, { world: { sister: 'garden', player: 'bedroom', together: false, following: false } });
  assert.equal(p.visible, false); assert.equal(p.location, 'garden'); assert.equal(p.anchor, null); assert.equal(p.pose, null);
  assert.equal(p.props.book, 'absent'); assert.equal(a.d.forAI().claimVisibleAction, false);
});

test('focus completion reaction requires the original completed session ID, not a countdown or reset', () => {
  const a = setup(); a.step(9000, { focus: { id: 'f1', running: true } });
  let p = a.step(100, { focus: { id: null, remaining: 0 }, completedSessionIds: [] });
  assert.notEqual(p.reaction?.cue, 'focus_complete');
  a.step(9000, { focus: { id: 'f2', running: true } });
  p = a.step(100, { focus: { id: null }, completedSessionIds: ['f2'] });
  assert.equal(p.reaction?.cue, 'focus_complete');
});

test('25-minute original timer: scene travel, pause, restore and completion preserve one real session', () => {
  const app = boot(new Map(), undefined, { at: t }); app.run(source);
  app.get('wdEnter').onclick(); app.get('wdCompanion').onclick();
  app.get('wcStart').onclick(); const id = app.run('timer.id');
  const director = B.create({ manifest: manifest(), allowPlaceholder: true });
  const sample = (at, world = facts().world) => {
    app.clock.set(at); const timer = app.run('window.WendaoBridge.focusState()');
    return director.tick(facts({ at, world, focus: timer, completedSessionIds: app.run('state.sessions.map(x=>x.id)') }));
  };
  sample(t); sample(t + 600000);
  app.get('wcPause').onclick(); const remaining = app.run('timer.remaining'); assert.equal(remaining, 900);
  sample(t + 660000, { sister: 'bedroom', player: 'study', together: false });
  app.get('wcClose').onclick(); app.get('wdCompanion').onclick();
  assert.equal(app.run('timer.remaining'), remaining);
  app.run('restoreTimer()'); assert.equal(app.run('timer.remaining'), remaining);
  app.get('wcPause').onclick();
  sample(t + 1560000); // 10 min active + 1 min pause + 15 min active.
  const sessions = plain(app.run(`state.sessions.filter(x=>x.id===${JSON.stringify(id)})`));
  assert.equal(sessions.length, 1); assert.equal(sessions[0].minutes, 25);
  sample(t + 1570000); assert.equal(app.run(`state.sessions.filter(x=>x.id===${JSON.stringify(id)}).length`), 1);
  assert.equal(app.run('state.sessions.find(x=>x.id==="old").minutes'), 60);
  assert.ok(app.storage.get(WD));
});

test('production loads the behavior controller, while the placeholder lab stays isolated', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const lab = readFileSync(new URL('../labs/bedroom/lab.js', import.meta.url), 'utf8');
  assert.match(html, /bedroom-behavior/); assert.match(html, /bedroom-renderer/); assert.doesNotMatch(html, /labs\/bedroom/);
  assert.doesNotMatch(lab, /localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|WendaoBridge/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|fetch\(|focusAction|unlockedCG\.push/);
});

test('asymmetric breath has smooth cycle edges, varied peaks and continues safely asleep',()=>{
 const a=setup({seed:37}), samples=[];
 for(let i=0;i<1200;i++)samples.push(a.step(25).motion.breath);
 const peaks=[];
 for(let i=1;i<samples.length-1;i++){
  assert.ok(Math.abs(samples[i]-samples[i-1])<.055,'no discontinuity at 25 ms');
  if(samples[i]>samples[i-1]&&samples[i]>=samples[i+1])peaks.push(samples[i]);
 }
 assert.ok(new Set(peaks.map(x=>x.toFixed(3))).size>2);
 const sleeping=setup(), values=[];
 for(let i=0;i<80;i++){
  const p=sleeping.step(100,{sisterSleeping:true});values.push(p.motion.breath);
  assert.equal(p.reaction,null);assert.equal(p.motion.suppressedCough,0);
  assert.ok(p.motion.breath<=.25);
 }
 assert.ok(Math.max(...values)>.1);
});
