import * as THREE from './vendor/three.module.min.js';
import {makeSurfaces,softenedBox} from './surface-materials.js';
// Editable R1 geometry, metres, Y up, +Z faces the open side of the room.
// Original geometric study. No reference screenshots, textures or game art are embedded.
export function buildBedroom() {
  const root = new THREE.Group(); root.name = 'Zhiyao-bedroom-R2.2';
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .87, ...extra});
  const m = {
    wood: material(0x684638), edge: material(0x392f2a), paleWood: material(0x93745b),
    wall: material(0x345350), plaster: material(0xaaa58e), cloth: material(0x688e86),
    linen: material(0xc5c4ae), paper: material(0xd4c5a1), gold: material(0x9f8457, {metalness: .35}),
    ceramic: material(0x999e8d, {roughness: .42}), tea: material(0x30201a), leaf: material(0x5d6651),
    lamp: material(0xe4c696, {emissive: 0xffb65e, emissiveIntensity: 0}), stone: material(0x707d77)
  };
  Object.assign(m,makeSurfaces());
  m.lamp=m.paper.clone();m.lamp.color.setHex(0xd3c7af);m.lamp.emissive.setHex(0xffd5a3);
  function mesh(geometry, mat, p, name, parent = root) {
    const obj = new THREE.Mesh(geometry, mat); obj.position.set(...p);
    obj.castShadow = true; obj.receiveShadow = true; obj.name = name; parent.add(obj); return obj;
  }
  const box = (name, p, size, mat = m.wood, parent = root) => {
    const g=softenedBox(size,name.startsWith('floorboard')?.002:.006),uv=g.attributes.uv;
    // Vary grain origin per board, maintaining its physical scale (no identical stripes).
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)+p[0]*.39+p[2]*.13,uv.getY(i)+p[1]*.47);
    return mesh(g,mat,p,name,parent);
  };
  const cylinder = (name, p, top, bottom, h, mat = m.wood, parent = root) => mesh(new THREE.CylinderGeometry(top, bottom, h, 24), mat, p, name, parent);
  // Open front/right walls are an intentional cutaway, not a 2D painted room.
  box('foundation', [0, -.16, 0], [9, .28, 6.9], m.edge);
  for (let i = 0; i < 30; i++) {
    const b = box('floorboard-' + i, [-4.35 + i * .3, -.018, 0], [.298, .045, 6.8], i % 7 === 0 ? m.floorWorn : m.floor);
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
  box('bed-frame', [-1.4, .47, -1.25], [2.65, .22, 3], m.edge);
  for (const x of [-2.6, -.2]) for (const z of [-2.6, .1]) box('bed-foot', [x, .2, z], [.14, .4, .14]);
  box('mattress', [-1.4, .68, -1.25], [2.46, .1, 2.85], m.linen);
  box('headboard', [-1.4, 1.05, -2.72], [2.65, 1.12, .09]);
  // Recessed headboard panels and load-bearing rails replace bright decorative bars.
  for(const x of [-2.23,-1.4,-.57])box('headboard-inset',[x,1.09,-2.656],[.74,.65,.028],m.wood);
  for(const y of [.65,1.52])box('headboard-rail',[-1.4,y,-2.625],[2.55,.055,.055],m.edge);
  for (const x of [-2.68, -.12]) for (const z of [-2.67, .15]) {
    box('bed-canopy-post', [x, 1.8, z], [.075, 2.65, .075]);
    cylinder('post-cap', [x, 3.15, z], .07, .07, .06, m.gold);
  }
  box('canopy-back', [-1.4, 3.07, -2.67], [2.65, .09, .1]);
  for (const x of [-2.68, -.12]) box('canopy-side', [x, 3.07, -1.25], [.09, .09, 2.9]);
  const pillow = mesh(new THREE.SphereGeometry(1, 16, 10), m.linen, [-1.4, .81, -2.15], 'pillow');
  pillow.scale.set(.56, .13, .3);
  const quiltGeometry=new THREE.BoxGeometry(2.35,.13,1.65,34,2,28),qp=quiltGeometry.attributes.position;
  for(let i=0;i<qp.count;i++) {const x=qp.getX(i),z=qp.getZ(i);qp.setY(i,qp.getY(i)+.009*Math.sin(z*8+x*1.7)+.006*Math.cos(x*6+z*2)+.014*Math.exp(-((x-.7)**2+(z+.45)**2)*5));}
  quiltGeometry.computeVertexNormals();
  const blanket=mesh(quiltGeometry,m.cloth,[-1.4,.81,-.72],'folded-quilt');
  const turnedEdge=box('quilt-turned-edge',[-1.4,.88,-1.48],[2.28,.045,.24],m.linen);turnedEdge.rotation.x=.08;
  // Curtains have actual depth/triangles and can occlude a character.
  const curtains = [];
  for (const x of [-2.72, -.08]) {
    const g = new THREE.PlaneGeometry(.22, 2.25, 5, 14);
    const curtain = mesh(g, m.linen.clone(), [x, 1.9, .1], 'bed-curtain');
    curtain.material.side=THREE.DoubleSide;
    const cp=g.attributes.position;for(let i=0;i<cp.count;i++)cp.setZ(i,.018*Math.sin(cp.getX(i)*85));g.computeVertexNormals();
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
  // An entry windbreak with hinged leaves, behind the main living area.
  for (let i=0;i<3;i++) {
    const panel=new THREE.Group();panel.position.set(2.2+i*.55,0,-2.1);panel.rotation.y=(i-1)*.10;root.add(panel);
    box('screen-panel-'+i,[0,1.02,0],[.50,1.62,.035],m.screen,panel);
    for(const dx of [-.27,.27])box('screen-frame',[dx,1.04,0],[.032,1.96,.065],m.edge,panel);
    for(const y of [.16,.53,1.84])box('screen-rail',[0,y,0],[.55,.032,.065],m.wood,panel);
    for(let j=0;j<3;j++)box('screen-slat',[-.19+j*.19,1.38,.023],[.012,.73,.012],m.wood,panel);
    for(const dx of [-.26,.26])box('screen-foot',[dx,.055,0],[.055,.11,.22],m.edge,panel);
  }
  box('rug', [-1.2, .015, 1.02], [3.5, .018, 1.22], m.cloth);
  // Functional study and medicine stations; character clearance stays in the centre aisle.
  box('writing-desk', [-3.65, .82, 1.85], [1.25, .1, 1.15], m.paleWood);
  for (const x of [-4.18, -3.12]) for (const z of [1.36, 2.34]) box('desk-leg', [x, .4, z], [.08, .8, .08]);
  box('desk-paper', [-3.65, .883, 1.85], [.65, .015, .55], m.paper);
  box('desk-inkstone', [-3.65, .92, 1.48], [.25, .06, .16], m.stone);
  box('reading-stool', [-2.75, .48, 1.85], [.48, .08, .48]);
  for (const x of [-2.92, -2.58]) for (const z of [1.68, 2.02]) box('stool-leg', [x, .23, z], [.06, .46, .06]);
  box('medicine-cabinet', [1.55, 1.1, -2.97], [1.05, 2, .52], m.wood);
  box('cabinet-cornice',[1.55,2.1,-2.97],[1.12,.055,.56],m.edge);
  box('cabinet-plinth',[1.55,.12,-2.97],[1.08,.1,.54],m.edge);
  for(const x of [1.1,2])box('cabinet-foot',[x,.06,-2.97],[.095,.12,.42],m.edge);
  for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++) {
    const x = 1.22 + col * .33, y = .23 + row * .4;
    box('medicine-drawer', [x, y, -2.69], [.3, .35, .045], m.wood);
    box('drawer-label', [x, y, -2.65], [.12, .06, .015], m.paper);
  }
  // Quiet signs of daily use: stitched booklets, brush, medicine jars and a folded cloth.
  for(let i=0;i<3;i++) {const b=box('stacked-book-'+i,[-3.84,.91+i*.045,2.1],[.35,.04,.26],i%2?m.paper:m.cloth);b.rotation.y=.06*i;}
  const brush=cylinder('writing-brush',[-3.45,.9,1.85],.009,.014,.34,m.edge);brush.rotation.z=Math.PI/2;brush.rotation.y=.22;
  for(const z of [1.36,2.34])box('desk-apron',[-3.65,.72,z],[1.08,.1,.035],m.wood);
  for(const x of [-4.18,-3.12]) {
    box('desk-side-apron',[x,.72,1.85],[.035,.1,.98],m.wood);
    box('desk-stretcher',[x,.23,1.85],[.045,.045,.98],m.edge);
  }
  for(const z of [1.68,2.02])box('stool-stretcher',[-2.75,.18,z],[.35,.035,.035],m.edge);
  for(let i=0;i<3;i++) {
    const x=1.22+i*.32;
    mesh(new THREE.LatheGeometry([new THREE.Vector2(.06,0),new THREE.Vector2(.1,.04),new THREE.Vector2(.105,.17),new THREE.Vector2(.065,.22),new THREE.Vector2(.065,.25)],24),m.ceramic,[x,2.11,-2.95],'medicine-jar');
    cylinder('jar-lid',[x,2.38,-2.95],.075,.075,.025,m.wood);
  }
  for(let row=0;row<5;row++)for(let col=0;col<3;col++){
    const handle=mesh(new THREE.TorusGeometry(.025,.005,6,12),m.gold,[1.22+col*.33,.14+row*.4,-2.64],'drawer-ring');
  }
  box('folded-towel',[.65,.94,-2.04],[.22,.055,.17],m.linen);
  // Give the window-side lamp a real stand, rather than a floating base.
  cylinder('window-lamp-stand',[-3.55,.4,.55],.07,.1,.8,m.wood);
  cylinder('window-lamp-foot',[-3.55,.035,.55],.24,.27,.07,m.edge);
  // A near foreground table supplies a second distinct depth/occlusion plane.
  box('foreground-console', [2.7, .75, 2.65], [2.25, .09, .55]);
  for(const x of [1.68,3.72])for(const z of [2.45,2.85])box('console-leg',[x,.36,z],[.065,.72,.065],m.edge);
  box('console-apron',[2.7,.65,2.86],[2.04,.12,.04],m.wood);
  const lamps = [];
  for (const [x, y, z] of [[.38, 1.48, -2.03], [-3.55, 1.35, .55]]) {
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
  root.userData = {units: 'metres', up: '+Y', status: 'material-action-refinement-r2.2', source: 'bedroom-model.js', referenceUse: 'composition-only'};
  return {root, lamps, curtains, blanket};
}
