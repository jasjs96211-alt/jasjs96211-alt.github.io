// Executed controller trace, accelerated fixture clock; NOT a screen recording.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const ctx = vm.createContext({});
vm.runInContext(readFileSync(new URL('../wendao/bedroom-behavior.js', import.meta.url), 'utf8'), ctx);
const B = ctx.WendaoBedroom;
const manifest = { version: 'wireframe-1', status: 'placeholder', clips: Object.fromEntries(B.REQUIRED_CLIPS.map(id => [id, { status: 'placeholder', decoded: true }])) };
const director = B.create({ manifest, allowPlaceholder: true });
const t = Date.parse('2026-10-17T12:00:00+08:00');
const events = []; let last = null;
for (let ms = 0; ms <= 300000; ms += 100) {
  const p = director.tick({ at: t + ms, world: { sister: 'bedroom', player: 'bedroom', together: true }, state: { portrait: { state: 'ill' }, vitals: { seriousInjury: true, acuteInjury: false } } });
  if (last !== p.phase) events.push({ elapsedMs: ms, actionId: p.actionId, phase: p.phase, clip: p.clip, props: p.props, title: p.title, text: p.text, assetStatus: p.status });
  last = p.phase;
}
console.log(JSON.stringify({ kind: 'executed-controller-trace', simulatedDurationMs: 300000, visualRecording: false, productionArt: false, events }, null, 2));
