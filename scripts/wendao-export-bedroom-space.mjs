// Reproducible, texture-free glTF 2.0 export of the R1 geometric study.
// Kept deliberately scoped to Mesh / Group / indexed BufferGeometry used by this model.
import {writeFileSync, readFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildBedroom} from '../public/yuanhang/wendao/scene3d/bedroom-model.js';
import {createProxy} from '../public/yuanhang/wendao/scene3d/character-adapter.js';
import {ANCHORS, COLLIDERS, WALK_PATH} from '../public/yuanhang/wendao/scene3d/contract.js';
const base = new URL('../public/yuanhang/wendao/scene3d/', import.meta.url);
const folder = new URL('models/', base); mkdirSync(folder, {recursive: true});
function exportGLB(root) {
  const doc = {asset: {version: '2.0', generator: 'Wendao R1 texture-free geometric exporter'}, scene: 0,
    scenes: [{nodes: [0]}], nodes: [], meshes: [], materials: [], accessors: [], bufferViews: [], buffers: []};
  const chunks = [], geometryCache = new Map(), materialCache = new Map(); let offset = 0;
  function addArray(array, type, target, bounds = false) {
    const padding = (4 - offset % 4) % 4; if (padding) {chunks.push(Buffer.alloc(padding)); offset += padding;}
    const raw = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const view = doc.bufferViews.push({buffer: 0, byteOffset: offset, byteLength: raw.length, target}) - 1;
    chunks.push(raw); offset += raw.length;
    const width = {SCALAR: 1, VEC2: 2, VEC3: 3}[type];
    const componentType = array instanceof Float32Array ? 5126 : array instanceof Uint32Array ? 5125 : array instanceof Uint16Array ? 5123 : null;
    if (!componentType) throw new TypeError('Unsupported component type');
    const item = {bufferView: view, componentType, count: array.length / width, type};
    if (bounds) {
      item.min = Array(width).fill(Infinity); item.max = Array(width).fill(-Infinity);
      array.forEach((v, i) => {const c = i % width; item.min[c] = Math.min(item.min[c], v); item.max[c] = Math.max(item.max[c], v);});
    }
    return doc.accessors.push(item) - 1;
  }
  function mat(m) {
    if (materialCache.has(m)) return materialCache.get(m);
    const material = {name: m.name || 'greybox-material', pbrMetallicRoughness: {
      baseColorFactor: [...m.color.toArray(), m.opacity], metallicFactor: m.metalness, roughnessFactor: m.roughness}, doubleSided: m.side === 2};
    if (m.emissiveIntensity > 0) material.emissiveFactor = m.emissive.toArray().map(c => Math.min(1, c * m.emissiveIntensity));
    if (m.transparent) material.alphaMode = 'BLEND';
    const id = doc.materials.push(material) - 1; materialCache.set(m, id); return id;
  }
  function geometry(g) {
    if (geometryCache.has(g)) return geometryCache.get(g);
    const primitive = {attributes: {}};
    for (const [key, name, type] of [['position', 'POSITION', 'VEC3'], ['normal', 'NORMAL', 'VEC3'], ['uv', 'TEXCOORD_0', 'VEC2']]) {
      if (g.attributes[key]) primitive.attributes[name] = addArray(g.attributes[key].array, type, 34962, key === 'position');
    }
    if (g.index) primitive.indices = addArray(g.index.array, 'SCALAR', 34963);
    geometryCache.set(g, primitive); return primitive;
  }
  function node(o) {
    const item = {name: o.name || o.type, translation: o.position.toArray(), rotation: o.quaternion.toArray(), scale: o.scale.toArray()};
    const id = doc.nodes.push(item) - 1;
    if (o.isMesh) {
      if (Array.isArray(o.material)) throw new TypeError('Multi-material export is not used by the greybox');
      item.mesh = doc.meshes.push({primitives: [{...geometry(o.geometry), material: mat(o.material)}]}) - 1;
    }
    if (o.children.length) item.children = o.children.filter(c => c.visible).map(node);
    return id;
  }
  node(root); doc.buffers.push({byteLength: offset});
  const jsonRaw = Buffer.from(JSON.stringify(doc)); const json = Buffer.concat([jsonRaw, Buffer.alloc((4 - jsonRaw.length % 4) % 4, 32)]);
  const rawBin = Buffer.concat(chunks); const bin = Buffer.concat([rawBin, Buffer.alloc((4 - rawBin.length % 4) % 4)]);
  const result = Buffer.alloc(12 + 8 + json.length + 8 + bin.length);
  result.writeUInt32LE(0x46546c67, 0); result.writeUInt32LE(2, 4); result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(json.length, 12); result.writeUInt32LE(0x4e4f534a, 16); json.copy(result, 20);
  result.writeUInt32LE(bin.length, 20 + json.length); result.writeUInt32LE(0x004e4942, 24 + json.length); bin.copy(result, 28 + json.length);
  return result;
}
const room = buildBedroom(), proxy = createProxy();
writeFileSync(new URL('bedroom-r1.glb', folder), exportGLB(room.root));
writeFileSync(new URL('proxy-reclined-r1.glb', folder), exportGLB(proxy.root));
writeFileSync(new URL('bedroom-r1.three.json', folder), JSON.stringify(room.root.toJSON()));
writeFileSync(new URL('anchors.json', base), JSON.stringify({units: 'metres', up: '+Y', anchors: ANCHORS, colliders: COLLIDERS, walkPath: WALK_PATH}, null, 2) + '\n');
const files = ['vendor/three.module.min.js', 'vendor/three.core.min.js', 'vendor/THREE-LICENSE.txt',
  'models/bedroom-r1.glb', 'models/proxy-reclined-r1.glb', 'models/bedroom-r1.three.json', 'anchors.json',
  'bedroom-model.js', 'camera-rig.js', 'character-adapter.js', 'lighting.js', 'scene-manager.js', 'contract.js'];
const assets = files.map(path => {
  const bytes = readFileSync(new URL(path, base));
  return {path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    source: path.startsWith('vendor/') ? 'three npm 0.180.0' : 'original editable R1 geometry/code',
    license: path.startsWith('vendor/') ? 'MIT; see vendor/THREE-LICENSE.txt' : 'project-original',
    status: path.startsWith('vendor/') ? 'pinned-runtime' : 'greybox-not-visually-approved'};
});
const manifest = {version: 'bedroom-space-r1-20261018', units: 'metres', up: '+Y', forward: '+Z',
  renderer: 'Three.js WebGL2, locally vendored 0.180.0', runtimeModelSource: 'bedroom-model.js (procedural); GLB is a reproducible interchange export, not a fetched runtime model',
  editableSources: ['bedroom-model.js', 'character-adapter.js', 'models/bedroom-r1.three.json'],
  exportCommand: 'node scripts/wendao-export-bedroom-space.mjs',
  textures: [], textureReason: 'R1 solid-material greybox; R2 textures and formal art pending',
  thirdPartyReferencePixelsEmbedded: false, character: 'faceless temporary volume proxy; not Zhiyao art',
  acceptance: {browserRecording: 'not_tested', iPhoneSafari: 'not_tested', iPhonePWA: 'not_tested', userVisualApproval: 'pending'},
  assets};
writeFileSync(new URL('asset-manifest.json', base), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({folder: fileURLToPath(folder), files: assets.length, bytes: assets.reduce((n, a) => n + a.bytes, 0)}));
