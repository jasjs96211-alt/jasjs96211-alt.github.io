import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const file = path => readFileSync(new URL(path, root), 'utf8');
const css = file('wendao/night-lighting.css');
const shell = file('wendao/companion.js');
const html = file('index.html');

test('warm scene lamps are mounted as presentation-only backdrop children', () => {
  assert.match(shell, /id="wcBackdrop"[\s\S]*?wc-night-lights/);
  assert.match(shell, /wc-lantern-a/);
  assert.match(shell, /wc-lantern-b/);
  assert.match(html, /night-lighting\.css\?v=/);
});
test('lighting appears only at dusk and night; no daylight lamps', () => {
  assert.match(css, /\.wc-night-lights\s*\{[\s\S]*?opacity:0/);
  assert.match(css, /\[data-phase="night"\] \.wc-night-lights\s*\{opacity:1\}/);
  assert.match(css, /\[data-phase="dusk"\] \.wc-night-lights\s*\{opacity:\.4\}/);
});
test('night sources are anchored by location and do not rely on a blue-only overlay', () => {
  for (const location of ['garden', 'terrace', 'corridor', 'bedroom', 'study', 'herbs']) {
    assert.ok(css.includes(`[data-location="${location}"] .wc-lantern-a`), location);
  }
  assert.match(css, /wc-night-reflection/);
  assert.match(css, /radial-gradient\(ellipse at center/);
});
test('reduced-motion preference disables flame animation', () => {
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css, /wc-lantern::after\{animation:none\}/);
});
