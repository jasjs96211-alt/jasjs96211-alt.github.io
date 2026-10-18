import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptCharacterVisualState, withPresentationPose, selectNarrativeArt} from '../wendao/scene3d/character-visual-state.js';
const healthy = () => ({world: {player: 'bedroom', sister: 'bedroom', together: true, phase: 'night'}, state: {portrait: {state: 'normal'}, vitals: {}}, permittedPoses: ['walk', 'seated']});
function deepFreeze(o) {Object.values(o).forEach(v => {if (v && typeof v === 'object') deepFreeze(v);}); return Object.freeze(o);}
test('one immutable visual fact carries identity, health, pose, props and coordinates without mutating source', () => {
  const input = deepFreeze(healthy()), before = JSON.stringify(input), v = adaptCharacterVisualState(input);
  assert.equal(v.identity.id, 'wen-zhiyao'); assert.equal(v.phase, 'night'); assert.equal(v.health.stage, 'healthy');
  assert.deepEqual(v.posePermissions, ['reclined', 'seated', 'walk']); assert.equal(v.authoritativeState, 'external-read-only');
  assert.throws(() => {v.worldPosition[0] = 100;}, TypeError);
  assert.throws(() => {v.posePermissions.push('drink');}, TypeError);
  assert.equal(JSON.stringify(input), before);
});
test('acute or persistent injury overrides cosmetic emotion; CGI never unlocks a healthy portrait', () => {
  const acute = adaptCharacterVisualState({...healthy(), emotion: 'relieved', state: {vitals: {acuteInjury: true}, portrait: {state: 'normal'}}});
  assert.equal(acute.health.stage, 'injured'); assert.equal(acute.hair, 'loose');
  assert.deepEqual(acute.posePermissions, ['reclined']); assert.equal(selectNarrativeArt(acute).path, 'sister-injured.webp');
  assert.equal(withPresentationPose(acute, {pose: 'walk'}), acute); assert.equal(withPresentationPose(acute, {pose: 'seated'}), acute);
  const persistent = adaptCharacterVisualState({...healthy(), state: {vitals: {seriousInjury: true}, portrait: {state: 'normal'}}});
  assert.equal(persistent.health.stage, 'ill'); assert.equal(selectNarrativeArt(persistent).path, 'sister-ill.webp');
  assert.equal(selectNarrativeArt(withPresentationPose(persistent, {pose: 'reclined'})).path, 'zhiyao-recovery-cg.webp');
});
test('sleep and unknown location fail closed in both world and narrative forms', () => {
  const sleep = adaptCharacterVisualState({...healthy(), sisterSleeping: true});
  assert.deepEqual(sleep.posePermissions, ['reclined']); assert.equal(sleep.action, 'sleep');
  assert.equal(withPresentationPose(sleep, {pose: 'walk'}), sleep);
  for (const input of [{}, {...healthy(), world: {sister: 'study', player: 'bedroom', together: false}}, {...healthy(), world: {sister: 'unknown'}}]) {
    const v = adaptCharacterVisualState(input);
    assert.equal(v.present, false); assert.equal(v.worldPosition, null); assert.equal(selectNarrativeArt(v).visible, false);
    assert.equal(withPresentationPose(v, {pose: 'seated'}), v);
  }
});
test('CG switches preserve authoritative health, location and sleep while posture facts remain shared', () => {
  const v = adaptCharacterVisualState(healthy());
  const walking = withPresentationPose(v, {pose: 'walk', position: [3.2, 0, -1.05], yaw: 1, moving: true});
  assert.equal(walking.action, 'walk'); assert.equal(walking.health, v.health); assert.deepEqual(walking.worldPosition, [3.2, 0, -1.05]);
  const standing = withPresentationPose(walking, {pose: 'walk', position: [.52, 0, -.65], yaw: -Math.PI / 2});
  assert.equal(standing.action, 'idle'); assert.equal(standing.location, v.location);
  const lying = withPresentationPose(v, {pose: 'reclined'});
  assert.equal(lying.hair, 'loose'); assert.equal(lying.health.stage, 'healthy');
  assert.equal(selectNarrativeArt(lying).path, 'sister-calm.webp', 'healthy rest must not imply an illness CG');
  assert.equal(selectNarrativeArt(lying).poseMatch, false, 'original portrait is explicitly not matching the 3D pose');
  for (const position of [[Infinity, 0, 0], [0, NaN, 0], [0, 0], [101, 0, 0]]) assert.equal(withPresentationPose(v, {position}), v);
});
test('time dispute blocks walking and selection cannot import or mutate business state', () => {
  const v = adaptCharacterVisualState({...healthy(), state: {vitals: {clockDispute: true}}});
  assert.equal(withPresentationPose(v, {pose: 'walk'}), v);
  const source = readFileSync(new URL('../wendao/scene3d/character-visual-state.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|fetch\(|Date\.|engine\.js|transport\.js/);
  const manager = readFileSync(new URL('../wendao/scene3d/scene-manager.js', import.meta.url), 'utf8');
  assert.match(manager, /adaptCharacterVisualState/); assert.match(manager, /visualState: facts/);
  const ui = readFileSync(new URL('../labs/bedroom-space/preview.js', import.meta.url), 'utf8');
  assert.match(ui, /selectNarrativeArt\(visual\)/);
});
test('character manifest does not promote concept artwork or technical proxy to a rigged character', async () => {
  const {createHash} = await import('node:crypto');
  const base = new URL('../wendao/scene3d/', import.meta.url);
  const m = JSON.parse(readFileSync(new URL('character-manifest.json', base), 'utf8'));
  assert.equal(m.status, 'art-resource-blocked'); assert.equal(m.runtimeGLB, null); assert.equal(m.rig, null);
  assert.ok(Object.values(m.animationClips).every(c => c.status === 'missing'));
  for (const a of m.assets) {
    const data = readFileSync(new URL(a.path, base)); assert.equal(data.length, a.bytes);
    assert.equal(createHash('sha256').update(data).digest('hex'), a.sha256);
  }
});
