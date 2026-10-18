import * as THREE from './vendor/three.module.min.js';
// Editable R1 geometry, metres, Y up, +Z faces the open side of the room.
// Original geometric study. No reference screenshots, textures or game art are embedded.
export function buildBedroom() {
  const root = new THREE.Group(); root.name = 'Zhiyao-bedroom-R1';
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .87, ...extra});
  const m = {
    wood: material(0x684638), edge: material(0x392f2a), paleWood: material(0x93745b),
    wall: material(0x345350), plaster: material(0xaaa58e), cloth: material(0x688e86),
    linen: material(0xc5c4ae), paper: material(0xd4c5a1), gold: material(0x9f8457, {metalness: .35}),
    ceramic: material(0x718d84, {roughness: .35}), tea: material(0x30201a), leaf: material(0x3a6153),
    lamp: material(0xe4c696, {emissive: 0xffb65e, emissiveIntensity: 0}), stone: material(0x707d77)
  };
  function mesh(geometry, mat, p, name, parent = root) {
    const obj = new THREE.Mesh(geometry, mat); obj.position.set(...p);
    obj.castShadow = true; obj.receiveShadow = true; obj.name = name; parent.add(obj); return obj;
  }
  const box = (name, p, size, mat = m.wood, parent = root) => mesh(new THREE.BoxGeometry(...size), mat, p, name, parent);
  const cylinder = (name, p, top, bottom, h, mat = m.wood, parent = root) => mesh(new THREE.CylinderGeometry(top, bottom, h, 12), mat, p, name, parent);
  // Open front/right walls are an intentional cutaway, not a 2D painted room.
  box('foundation', [0, -.16, 0], [9, .28, 6.9], m.edge);
  for (let i = 0; i < 30; i++) {
    const b = box('floorboard-' + i, [-4.35 + i * .3, -.018, 0], [.285, .045, 6.8], i % 4 === 0 ? m.paleWood : m.wood);
    b.castShadow = false;
  }
  box('back-wall-left', [-1.05, 1.65, -3.45], [6.9, 3.3, .16], m.wall);
  box('back-wall-right', [4.03, 1.65, -3.45], [.94, 3.3, .16], m.wall);
  box('door-lintel', [3.05, 3, -3.45], [1.5, .6, .18]);
  box('door-recess', [3.05, 1.35, -3.72], [1.3, 2.7, .12], m.edge);
  const door = box('ajar-door', [3.63, 1.35, -3.49], [1.1, 2.7, .075], m.paleWood); door.rotation.y = -.65;
  box('left-wall-under-window', [-4.5, .5, 0], [.15, 1, 6.9], m.plaster);
  box('left-wall-over-window', [-4.5, 3.1, 0], [.15, .4, 6.9], m.wall);
  box('left-wall-rear', [-4.5, 1.95, -2.95], [.15, 1.9, 1], m.wall);
  box('left-wall-near', [-4.5, 1.95, 2.65], [.15, 1.9, 1.6], m.wall);
  for (const z of [-2.4, -.95, .5, 1.85]) {
    box('window-upright', [-4.41, 1.92, z], [.12, 1.98, .09], m.edge);
    for (let y = 1.12; y < 2.9; y += .36) box('window-crossbar', [-4.4, y, z + .65], [.09, .035, 1.3], m.paleWood);
  }
  for (let z = -2.38; z < 1.88; z += .24) box('window-lattice', [-4.4, 2.02, z], [.045, 1.78, .028], m.paleWood);
  box('window-sill', [-4.3, 1.01, -.25], [.4, .12, 4.55]);
  for (const x of [-4.36, -.25, 4.36]) {
    box('back-pillar', [x, 1.65, -3.31], [.19, 3.3, .19], m.edge);
    box('ceiling-beam', [x, 3.35, -.1], [.2, .22, 6.75], m.edge);
  }
  box('rear-beam', [0, 3.16, -3.25], [8.9, .18, .2]);
  // Bed surface y=.73 is shared by the seated proxy's root and its contact shadows.
  box('bed-frame', [-1.4, .47, -1.25], [2.65, .33, 3], m.edge);
  for (const x of [-2.6, -.2]) for (const z of [-2.6, .1]) box('bed-foot', [x, .2, z], [.14, .4, .14]);
  box('mattress', [-1.4, .68, -1.25], [2.46, .1, 2.85], m.linen);
  box('headboard', [-1.4, 1.05, -2.72], [2.65, 1.12, .13]);
  for (let x = -2.5; x < -.2; x += .22) box('headboard-inlay', [x, 1.24, -2.635], [.028, .48, .018], m.gold);
  for (const x of [-2.68, -.12]) for (const z of [-2.67, .15]) {
    box('bed-canopy-post', [x, 1.8, z], [.075, 2.65, .075]);
    cylinder('post-cap', [x, 3.15, z], .07, .07, .06, m.gold);
  }
  box('canopy-back', [-1.4, 3.07, -2.67], [2.65, .09, .1]);
  for (const x of [-2.68, -.12]) box('canopy-side', [x, 3.07, -1.25], [.09, .09, 2.9]);
  const pillow = mesh(new THREE.SphereGeometry(1, 16, 10), m.linen, [-1.4, .81, -2.15], 'pillow');
  pillow.scale.set(.82, .19, .39);
  const blanket = box('folded-quilt', [-1.4, .805, -.72], [2.35, .15, 1.58], m.cloth);
  box('quilt-border', [-1.4, .886, -.04], [2.37, .012, .09], m.gold);
  // Curtains have actual depth/triangles and can occlude a character.
  const curtains = [];
  for (const x of [-2.6, -.2]) {
    const g = new THREE.PlaneGeometry(.35, 2.25, 5, 14);
    const curtain = mesh(g, material(0xc4c6b0, {side: THREE.DoubleSide}), [x, 1.9, .1], 'bed-curtain');
    curtain.userData.base = Array.from(g.attributes.position.array); curtains.push(curtain);
  }
  // Bedside table and both props share explicit world positions.
  box('bedside-table', [.54, .85, -1.81], [1, .08, .78], m.paleWood);
  for (const x of [.12, .96]) for (const z of [-2.1, -1.52]) box('table-leg', [x, .42, z], [.07, .84, .07]);
  box('book-cover', [.39, .904, -1.93], [.34, .025, .27], m.cloth);
  box('book-pages', [.39, .925, -1.93], [.31, .025, .25], m.paper);
  box('book-spine', [.24, .93, -1.93], [.025, .035, .27], m.gold);
  const bowlGeometry = new THREE.LatheGeometry([new THREE.Vector2(.045, 0), new THREE.Vector2(.05, .02), new THREE.Vector2(.098, .08), new THREE.Vector2(.11, .09), new THREE.Vector2(.1, .095), new THREE.Vector2(.084, .068), new THREE.Vector2(.04, .02)], 20);
  mesh(bowlGeometry, m.ceramic, [.73, .89, -1.73], 'medicine-bowl');
  cylinder('medicine-liquid', [.73, .95, -1.73], .08, .08, .006, m.tea);
  // Three opaque panels. Depth testing, not DOM visibility, hides the walking proxy.
  for (let i = 0; i < 3; i++) {
    const x = 1.48 + i * .88;
    box('screen-panel-' + i, [x, 1.21, -.25], [.82, 2.12, .09], m.paper);
    for (const dx of [-.44, .44]) box('screen-frame', [x + dx, 1.25, -.25], [.045, 2.4, .14], m.edge);
    for (const y of [.15, .6, 2.29]) box('screen-rail', [x, y, -.25], [.88, .045, .14]);
    for (let j = 0; j < 4; j++) box('screen-slat', [x - .3 + j * .2, 1.75, -.183], [.024, .85, .02], m.paleWood);
  }
  box('rug', [-1.2, .015, 1.02], [3.5, .018, 1.22], m.cloth);
  // A near foreground table supplies a second distinct depth/occlusion plane.
  box('foreground-console', [2.7, .75, 2.65], [2.25, .09, .55]);
  for (const x of [1.68, 3.72]) box('console-leg', [x, .36, 2.65], [.1, .72, .4], m.edge);
  const lamps = [];
  for (const [x, y, z] of [[.38, 1.55, -2.03], [-3.55, 1.35, .55]]) {
    cylinder('lamp-base', [x, y - .55, z], .19, .22, .08, m.edge);
    cylinder('lamp-stem', [x, y - .33, z], .035, .045, .4, m.gold);
    const shade = cylinder('paper-lamp', [x, y, z], .17, .17, .46, m.lamp.clone()); shade.castShadow = false; lamps.push(shade);
    for (const yy of [y - .25, y + .25]) cylinder('lamp-rim', [x, yy, z], .19, .19, .04, m.edge);
    for (let j = 0; j < 6; j++) {
      const a = j / 6 * Math.PI * 2;
      cylinder('lamp-rib', [x + Math.cos(a) * .17, y, z + Math.sin(a) * .17], .009, .009, .48, m.edge);
    }
  }
  // Geometric courtyard beyond the window: spatial layers, no backdrop image.
  box('courtyard-ground', [-7.1, -.12, -.8], [5, .1, 9], m.stone);
  for (let i = 0; i < 10; i++) {
    const x = -5.2 - (i % 3) * .7, z = -4.3 + i * .84;
    cylinder('bamboo-stem', [x, 1.8, z], .028, .04, 3.7, m.leaf);
    for (let j = 0; j < 3; j++) {
      const leaf = mesh(new THREE.SphereGeometry(1, 5, 3), m.leaf, [x + .2, 2.25 + j * .4, z], 'bamboo-leaf');
      leaf.scale.set(.38, .03, .13); leaf.rotation.z = .4 - j * .3;
    }
  }
  root.userData = {units: 'metres', up: '+Y', status: 'greybox', source: 'bedroom-model.js', referenceUse: 'composition-only'};
  return {root, lamps, curtains, blanket};
}
