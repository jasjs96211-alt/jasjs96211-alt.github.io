// Presentation contract. Never accepts storage, rewards, medication or ledger callbacks.
export const ANCHORS = Object.freeze(Object.fromEntries(Object.entries({
  door: [3, 0, -2.85], behindScreen: [3.2, 0, -2.65],
  screenExit: [4.05, 0, -2.65], passage: [4.05, 0, .85],
  bedApproach: [.52, 0, .85], bedside: [.52, 0, -.65],
  seated: [-1.4, .73, -1.88], reclined: [-1.4, .97, -1.94],
  book: [.39, .89, -1.93], bowl: [.73, .9, -1.73], window: [-4.4, 1.9, -1]
}).map(([key, value]) => [key, Object.freeze(value)])));
export const WALK_PATH = Object.freeze(['door', 'behindScreen', 'screenExit', 'passage', 'bedApproach', 'bedside'].map(k => ANCHORS[k]));
export const PATH_LENGTH = WALK_PATH.slice(1).reduce((total, p, i) => total + Math.hypot(p[0] - WALK_PATH[i][0], p[2] - WALK_PATH[i][2]), 0);
export const COLLIDERS = Object.freeze([
  Object.freeze({id: 'desk', minX: -4.3, maxX: -3.02, minZ: 1.23, maxZ: 2.47}),
  Object.freeze({id: 'stool', minX: -2.99, maxX: -2.51, minZ: 1.61, maxZ: 2.09}),
  Object.freeze({id: 'cabinet', minX: 1.02, maxX: 2.08, minZ: -3.23, maxZ: -2.71}),
  Object.freeze({id: 'console', minX: 1.57, maxX: 3.83, minZ: 2.37, maxZ: 2.93}),
  Object.freeze({id: 'bed', minX: -2.78, maxX: -.02, minZ: -2.82, maxZ: .32}),
  Object.freeze({id: 'screen', minX: 1.9, maxX: 3.65, minZ: -2.26, maxZ: -1.94}),
  Object.freeze({id: 'table', minX: .04, maxX: 1.04, minZ: -2.2, maxZ: -1.42})
]);
export function blocked(position, radius = .32) {
  const [x, , z] = position;
  return x < -4.3 + radius || x > 4.4 - radius || z < -3.3 + radius || z > 3.3 - radius ||
    COLLIDERS.some(c => x > c.minX - radius && x < c.maxX + radius && z > c.minZ - radius && z < c.maxZ + radius);
}
export function samplePath(distance) {
  let remaining = Math.max(0, Number.isFinite(distance) ? distance : 0);
  for (let i = 1; i < WALK_PATH.length; i++) {
    const a = WALK_PATH[i - 1], b = WALK_PATH[i], length = Math.hypot(b[0] - a[0], b[2] - a[2]);
    if (remaining < length) {
      const t = remaining / length;
      return {position: [a[0] + (b[0] - a[0]) * t, 0, a[2] + (b[2] - a[2]) * t], yaw: Math.atan2(b[0] - a[0], b[2] - a[2]), arrived: false};
    }
    remaining -= length;
  }
  return {position: [...ANCHORS.bedside], yaw: -Math.PI / 2, arrived: true};
}
// Unknown state fails closed; the laboratory supplies explicit synthetic permissions.
export function adaptSnapshot({world = {}, state = {}, sisterSleeping = false, permittedPoses = []} = {}) {
  const present = world.player === 'bedroom' && world.sister === 'bedroom' && world.together === true;
  const severe = state.vitals?.acuteInjury === true || state.portrait?.state === 'injured';
  const weak = severe || state.vitals?.seriousInjury === true || ['ill', 'tired'].includes(state.portrait?.state);
  const clockHold = state.vitals?.clockDispute === true || world.clockDispute === true;
  const canMove = present && !weak && !sisterSleeping && !clockHold && permittedPoses.includes('walk');
  const canSit = present && !severe && !sisterSleeping && !clockHold && permittedPoses.includes('seated');
  return Object.freeze({present, severe, weak, sleeping: sisterSleeping === true, clockHold, canMove, canSit,
    phase: ['dawn', 'day', 'dusk', 'night'].includes(world.phase) ? world.phase : 'day',
    pose: canSit ? 'seated' : 'reclined', assetStatus: 'placeholder'});
}
export function visualDelta(previous, current, visible, previouslyVisible = visible) {
  const gap = current - previous;
  return visible && previouslyVisible && Number.isFinite(gap) && gap >= 0 && gap <= 250 ? gap / 1000 : 0;
}
