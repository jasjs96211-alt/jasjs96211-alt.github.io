// One read-only character fact shared by the world renderer and narrative art.
// No storage, clocks, settlement, health recovery or independent world simulation.
import {adaptSnapshot, ANCHORS} from './contract.js';
const freeze = value => {
  if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);}
  return value;
};
const phases = new Set(['calm', 'concerned', 'relieved', 'tired']);
export function adaptCharacterVisualState(input = {}) {
  const facts = adaptSnapshot(input);
  const portrait = input.state?.portrait?.state;
  const healthStage = facts.severe ? 'injured' : facts.weak ? (portrait === 'tired' ? 'tired' : 'ill') : 'healthy';
  const location = ['bedroom', 'study', 'herbs', 'garden', 'corridor', 'terrace'].includes(input.world?.sister) ? input.world.sister : 'unknown';
  const posePermissions = facts.present ? ['reclined', ...(facts.canSit ? ['seated'] : []), ...(facts.canMove ? ['walk'] : [])] : [];
  const emotion = phases.has(input.emotion) ? input.emotion : 'calm';
  return freeze({...facts, schemaVersion: 1, identity: {id: 'wen-zhiyao', name: '温知遥'},
    location, worldPosition: facts.present ? [...ANCHORS[facts.pose]] : null, facing: 0,
    health: {stage: healthStage, severe: facts.severe, weak: facts.weak}, emotion,
    posePermissions, action: !facts.present ? 'absent' : facts.sleeping ? 'sleep' : facts.pose === 'seated' ? 'sit' : 'rest',
    hair: facts.pose === 'reclined' || facts.severe ? 'loose' : 'half-up', props: [],
    assetStatus: 'placeholder', authoritativeState: 'external-read-only'});
}
// Pure presentation coordinates. Cannot create pose permissions or alter health.
export function withPresentationPose(visual, {pose = visual.pose, position, yaw = visual.facing, moving = false} = {}) {
  if (!visual.present || !visual.posePermissions.includes(pose)) return visual;
  const p = position ?? ANCHORS[pose === 'walk' ? 'door' : pose];
  if (!Array.isArray(p) || p.length !== 3 || !p.every(n => Number.isFinite(n) && Math.abs(n) <= 100) || !Number.isFinite(yaw)) return visual;
  return freeze({...visual, pose, worldPosition: [...p], facing: yaw,
    action: visual.sleeping ? 'sleep' : pose === 'walk' ? (moving ? 'walk' : 'idle') : pose === 'seated' ? 'sit' : 'rest',
    hair: visual.severe || pose === 'reclined' ? 'loose' : 'half-up'});
}
// An existing artwork is selected from the exact same visual fact, not a second health calculation.
export function selectNarrativeArt(visual) {
  if (!visual.present) return freeze({visible: false, path: null, kind: 'absent', poseMatch: true});
  const stage = visual.health.stage;
  if (stage === 'injured') return freeze({visible: true, path: 'sister-injured.webp', kind: 'portrait', poseMatch: false});
  if (visual.pose === 'reclined' && visual.weak) return freeze({visible: true, path: 'zhiyao-recovery-cg.webp', kind: 'narrative-cg', poseMatch: true});
  const name = stage === 'ill' ? 'ill' : stage === 'tired' ? 'tired' : visual.emotion;
  return freeze({visible: true, path: `sister-${name}.webp`, kind: 'portrait', poseMatch: false});
}
