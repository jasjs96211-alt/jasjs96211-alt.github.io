import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from '../wendao/scene3d/vendor/three.module.min.js';
import {ANCHORS, WALK_PATH, blocked, samplePath, adaptSnapshot, visualDelta} from '../wendao/scene3d/contract.js';
import {buildBedroom} from '../wendao/scene3d/bedroom-model.js';
import {createProxy} from '../wendao/scene3d/character-adapter.js';
import {createCameraRig} from '../wendao/scene3d/camera-rig.js';
import {createLighting} from '../wendao/scene3d/lighting.js';
const base = new URL('../wendao/scene3d/', import.meta.url);
function healthy() {return {world: {player: 'bedroom', sister: 'bedroom', together: true, phase: 'night'}, state: {portrait: {state: 'normal'}, vitals: {}}, permittedPoses: ['walk', 'seated']};}
function freeze(value) {if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value;}

test('3D adapter only reads explicit world and pose permissions; healthy presence is not enough', () => {
  const input = freeze(healthy()), before = JSON.stringify(input), facts = adaptSnapshot(input);
  assert.equal(facts.canMove, true); assert.equal(facts.canSit, true); assert.ok(Object.isFrozen(facts));
  assert.equal(JSON.stringify(input), before); assert.equal(adaptSnapshot({...healthy(), permittedPoses: []}).canMove, false);
  assert.equal(adaptSnapshot().present, false); assert.equal(adaptSnapshot().pose, 'reclined');
});
test('sleep, acute injury, ongoing illness, absence and clock disputes suppress proxy navigation', () => {
  const cases = [
    {...healthy(), sisterSleeping: true}, {...healthy(), state: {portrait: {state: 'injured'}}},
    {...healthy(), state: {vitals: {acuteInjury: true}}}, {...healthy(), state: {vitals: {seriousInjury: true}}},
    {...healthy(), state: {portrait: {state: 'ill'}}}, {...healthy(), state: {vitals: {clockDispute: true}}},
    {...healthy(), world: {...healthy().world, sister: 'study', together: false}},
    {...healthy(), world: {...healthy().world, clockDispute: true}}
  ];
  for (const input of cases) assert.equal(adaptSnapshot(freeze(input)).canMove, false);
  for (const input of cases.filter(x => x.state.portrait?.state === 'injured' || x.sisterSleeping || x.state.vitals?.acuteInjury || x.world.sister === 'study')) assert.equal(adaptSnapshot(input).canSit, false);
});
test('entire entry route clears the screen, bed, table and room boundaries with a body radius', () => {
  const length = WALK_PATH.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - WALK_PATH[i][0], p[2] - WALK_PATH[i][2]), 0);
  for (let distance = 0; distance <= length; distance += .015) assert.equal(blocked(samplePath(distance).position), false, 'collision at ' + distance);
  assert.deepEqual(samplePath(length + 10).position, ANCHORS.bedside);
  assert.equal(samplePath(length + 10).arrived, true);
  assert.equal(blocked([2, 0, -.25]), true); assert.equal(blocked([-1.4, 0, -1]), true);
});
test('screen is genuine 3D occlusion: a ray toward proxy behind it first hits opaque panels', () => {
  const room = buildBedroom(); room.root.updateMatrixWorld(true);
  const origin = new THREE.Vector3(3.2, 1.4, 4), target = new THREE.Vector3(3.2, 1.4, -1.05);
  const ray = new THREE.Raycaster(origin, target.clone().sub(origin).normalize(), 0, origin.distanceTo(target));
  const hits = ray.intersectObject(room.root, true);
  assert.ok(hits.length); assert.match(hits[0].object.name, /^screen-panel/);
  assert.equal(hits[0].object.material.transparent, false); assert.equal(hits[0].object.material.depthTest, true);
});
test('same room offers three distinct camera positions and portrait-safe face, hands, book and bowl', () => {
  for (const aspect of [16 / 9, 375 / 667, 390 / 700, 1]) {
    const camera = new THREE.PerspectiveCamera(42, aspect, .1, 65), rig = createCameraRig(camera), positions = [];
    for (const id of ['wide', 'bedside', 'front']) {
      rig.set(id, true); camera.updateMatrixWorld(true); positions.push(camera.position.toArray());
      for (const point of [[-1.4, 1.74, -1.88], [-1.16, 1.25, -1.7], ANCHORS.book, ANCHORS.bowl]) {
        const p = new THREE.Vector3(...point).project(camera);
        assert.ok(Math.abs(p.x) < .94 && p.y > -.55 && p.y < .9 && p.z < 1 && p.z > -1, `${id} ${aspect}: ${p.toArray()}`);
      }
    }
    assert.equal(new Set(positions.map(JSON.stringify)).size, 3);
  }
});
test('seated proxy hip uses bed-plane anchor and reclined proxy rests horizontally above mattress', () => {
  const proxy = createProxy(); proxy.setPose('seated'); proxy.root.updateMatrixWorld(true);
  assert.equal(proxy.root.position.y, ANCHORS.seated[1]);
  const seatHead = proxy.head.getWorldPosition(new THREE.Vector3()); assert.ok(seatHead.y > 1.7 && seatHead.y < 1.8);
  proxy.setPose('reclined'); proxy.root.updateMatrixWorld(true);
  const head = proxy.head.getWorldPosition(new THREE.Vector3()); assert.ok(head.y > 1.09 && head.y < 1.13);
  assert.ok(head.z < -1.9 && head.z > -2.2);
});
test('day/night use same geometry, separate directional/hemisphere lights and switchable local lamps', () => {
  const scene = new THREE.Scene(), room = buildBedroom(); scene.add(room.root);
  const lights = createLighting(scene, room.lamps), count = room.root.children.length;
  lights.apply('day'); const day = scene.children.find(x => x.isDirectionalLight).intensity;
  lights.apply('night'); assert.equal(count, room.root.children.length);
  assert.ok(scene.children.find(x => x.isDirectionalLight).intensity < day);
  const lamps = scene.children.filter(x => x.isPointLight); assert.equal(lamps.length, 2); assert.ok(lamps.every(l => l.intensity > 0));
  assert.ok(room.lamps.every(m => !m.castShadow), 'emissive shades must not occlude their own internal point light');
  lights.toggle(false); assert.ok(lamps.every(l => l.intensity === 0));
  lights.toggle(true); lights.update(10, false); assert.ok(lamps.every(l => l.intensity > 0));
  assert.equal(lights.apply('invalid'), false);
});
test('suspension, hidden tabs, backward clocks and long gaps cannot advance visual time', () => {
  assert.equal(visualDelta(1000, 1016, true, true), .016);
  for (const args of [[1000, 1016, false, true], [1000, 1016, true, false], [1000, 999, true, true], [1000, 120000, true, true]]) assert.equal(visualDelta(...args), 0);
});
test('editable Three JSON round-trips; GLB buffers, indices and scene roots are valid', () => {
  const loaded = new THREE.ObjectLoader().parse(JSON.parse(readFileSync(new URL('models/bedroom-r1.three.json', base), 'utf8')));
  assert.ok(loaded.children.some(o => o.name === 'medicine-bowl'));
  for (const name of ['bedroom-r1.glb', 'proxy-reclined-r1.glb']) {
    const raw = readFileSync(new URL('models/' + name, base));
    assert.equal(raw.readUInt32LE(0), 0x46546c67); assert.equal(raw.readUInt32LE(4), 2); assert.equal(raw.readUInt32LE(8), raw.length);
    const size = raw.readUInt32LE(12), json = JSON.parse(raw.subarray(20, 20 + size).toString());
    const binStart = 28 + size, binLength = raw.readUInt32LE(20 + size);
    assert.equal(binStart + binLength, raw.length); assert.ok(json.nodes[json.scenes[0].nodes[0]]);
    json.bufferViews.forEach(v => assert.ok(v.byteOffset + v.byteLength <= json.buffers[0].byteLength));
    json.meshes.forEach(m => m.primitives.forEach(p => {
      const a = json.accessors[p.indices], v = json.bufferViews[a.bufferView], positions = json.accessors[p.attributes.POSITION].count;
      for (let i = 0; i < a.count; i++) assert.ok((a.componentType === 5123 ? raw.readUInt16LE(binStart + v.byteOffset + i * 2) : raw.readUInt32LE(binStart + v.byteOffset + i * 4)) < positions);
    }));
  }
});
test('every shipped 3D asset has matching bytes/hash, and third-party reference pixels are absent', () => {
  const manifest = JSON.parse(readFileSync(new URL('asset-manifest.json', base), 'utf8'));
  assert.equal(manifest.thirdPartyReferencePixelsEmbedded, false);
  assert.equal(manifest.acceptance.iPhoneSafari, 'not_tested'); assert.equal(manifest.acceptance.userVisualApproval, 'pending');
  for (const file of manifest.assets) {
    const bytes = readFileSync(new URL(file.path, base)); assert.equal(bytes.length, file.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
  }
});
test('isolated 3D module cannot import business code or write persistent game data', () => {
  for (const name of ['contract.js', 'bedroom-model.js', 'character-adapter.js', 'camera-rig.js', 'lighting.js', 'scene-manager.js']) {
    const text = readFileSync(new URL(name, base), 'utf8');
    assert.doesNotMatch(text, /localStorage|sessionStorage|indexedDB|fetch\(|WendaoEngine|\.setItem\(|\.writeView\(|transport\.js|engine\.js/);
  }
  const html = readFileSync(new URL('../labs/bedroom-space/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /engine\.js|app\.js|transport\.js|register\(/);
  const manager = readFileSync(new URL('scene-manager.js', base), 'utf8');
  assert.match(manager, /webglcontextlost/); assert.match(manager, /observer\.disconnect/); assert.match(manager, /renderer\.dispose/);
});
