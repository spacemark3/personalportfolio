/* One builder per landmark key, plus its placement and camera focus.
   `builders` and `placements` are both Records over the key tuple, so a key
   added to landmarkKeys without a builder or a placement is a compile error
   rather than an undefined at mount. */
import * as THREE from 'three';
import { M } from './materials';
import { ISLAND_RADIUS, CITY_LIFT, groundY } from './terrain';

export const landmarkKeys = [
  'bahay-kubo', 'shore', 'sari-sari', 'duomo', 'tram', 'studio', 'easel', 'graves',
] as const;

/** The eight built things on the island the camera can be sent to. */
export type LandmarkKey = (typeof landmarkKeys)[number];

/* The figure on the seam path is the ninth, and it is not a landmark: it is
   the avatar, built by buildAvatar and placed by AVATAR_SPOT below. It carries
   its own camera solve all the same, because the About page's description is
   what it says when you pick it. */
export const FIGURE_KEY = 'me';

/** Anything the camera can be sent to — the eight landmarks, and the figure. */
export type FocusKey = LandmarkKey | typeof FIGURE_KEY;

/** Placement + camera solve for one landmark. */
export type Placement = {
  /** where the prop stands, in island space */
  position: [number, number, number];
  rotationY: number;
  /** height above `position` the camera aims at — roughly the prop's visual centre */
  focusY: number;
  /** unit direction the camera sits along, from that focus point */
  offsetDir: [number, number, number];
  /** how far along it */
  dist: number;
};

const TAU = Math.PI * 2;
const rand = (i: number) => { const x = Math.sin(i * 91.7 + 47.3) * 43758.5453; return x - Math.floor(x); };

const mesh = (name: string, geo: THREE.BufferGeometry, mat: THREE.Material) => {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
const group = (name: string) => { const g = new THREE.Group(); g.name = name; return g; };

/* ---------- shore side ---------- */

function bahayKubo() {
  const g = group('bahay-kubo');
  const stiltGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.34, 6);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const s = mesh('stilt', stiltGeo, M.bamboo);
    s.position.set(sx * 0.3, 0.17, sz * 0.24);
    g.add(s);
  }
  const floor = mesh('kubo_floor', new THREE.BoxGeometry(0.78, 0.05, 0.62), M.bamboo);
  floor.position.y = 0.36;
  g.add(floor);

  const walls = mesh('kubo_walls', new THREE.BoxGeometry(0.7, 0.34, 0.54), M.bamboo);
  walls.position.y = 0.55;
  g.add(walls);

  /* nipa roof: four-sided pyramid with a deep overhang */
  const roof = mesh('kubo_roof', new THREE.ConeGeometry(0.66, 0.42, 4), M.nipa);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.82;
  roof.position.y = 0.92;
  g.add(roof);

  const ridge = mesh('kubo_ridge', new THREE.BoxGeometry(0.06, 0.05, 0.5), M.timber);
  ridge.position.y = 1.12;
  g.add(ridge);

  const ladder = group('kubo_ladder');
  const railGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.42, 5);
  for (const sx of [-1, 1]) {
    const r = mesh('ladder_rail', railGeo, M.timber);
    r.position.set(sx * 0.09, 0.19, 0.42);
    r.rotation.x = 0.42;
    ladder.add(r);
  }
  const rungGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.19, 5);
  for (let i = 0; i < 3; i++) {
    const rg = mesh('ladder_rung', rungGeo, M.timber);
    rg.rotation.z = Math.PI / 2;
    rg.position.set(0, 0.09 + i * 0.1, 0.36 - i * 0.045);
    ladder.add(rg);
  }
  g.add(ladder);

  const window = mesh('kubo_window', new THREE.BoxGeometry(0.02, 0.16, 0.2), M.timber);
  window.position.set(0.36, 0.56, 0);
  g.add(window);

  return g;
}

function shore() {
  const g = group('shore');

  /* palm: leaning trunk of stacked segments + fronds from shared geometry */
  const palm = group('palm');
  const segGeo = new THREE.CylinderGeometry(0.045, 0.058, 0.2, 6);
  for (let i = 0; i < 6; i++) {
    const s = mesh('palm_segment', segGeo, M.palmTrunk);
    const lean = i * 0.055;
    s.position.set(Math.sin(lean) * 0.5, 0.1 + i * 0.19, 0);
    s.rotation.z = -lean * 1.6;
    palm.add(s);
  }
  const frondGeo = new THREE.SphereGeometry(0.34, 8, 4, 0, Math.PI, 0, Math.PI * 0.42);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const f = mesh('palm_frond', frondGeo, M.frond);
    f.scale.set(1, 0.24, 0.42);
    f.position.set(0.28 + Math.cos(a) * 0.2, 1.22 - rand(i) * 0.06, Math.sin(a) * 0.2);
    f.rotation.set(rand(i + 3) * 0.3, -a, -0.5 + rand(i + 7) * 0.4);
    palm.add(f);
  }
  const coconutGeo = new THREE.SphereGeometry(0.048, 10, 8);
  for (let i = 0; i < 3; i++) {
    const c = mesh('coconut', coconutGeo, M.timber);
    c.position.set(0.26 + Math.cos(i * 2.1) * 0.06, 1.14, Math.sin(i * 2.1) * 0.06);
    palm.add(c);
  }
  palm.position.set(0.42, 0, -0.34);
  g.add(palm);

  /* banca: hull + twin outriggers on bamboo spars */
  const banca = group('banca');
  const hull = mesh('banca_hull', new THREE.CapsuleGeometry(0.11, 0.78, 6, 12), M.timber);
  hull.rotation.z = Math.PI / 2;
  hull.scale.set(1, 1, 0.66);
  hull.position.y = 0.1;
  banca.add(hull);

  const gunwale = mesh('banca_gunwale', new THREE.BoxGeometry(0.98, 0.03, 0.15), M.canvasWhite);
  gunwale.position.y = 0.19;
  banca.add(gunwale);

  const floatGeo = new THREE.CapsuleGeometry(0.035, 0.6, 5, 8);
  const sparGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.56, 5);
  for (const sz of [-1, 1]) {
    const fl = mesh('outrigger_float', floatGeo, M.bamboo);
    fl.rotation.z = Math.PI / 2;
    fl.position.set(0, 0.075, sz * 0.46);
    banca.add(fl);
    for (const sx of [-0.26, 0.26]) {
      const sp = mesh('outrigger_spar', sparGeo, M.bamboo);
      sp.rotation.x = Math.PI / 2;
      sp.position.set(sx, 0.21, sz * 0.25);
      banca.add(sp);
    }
  }
  banca.rotation.y = -0.5;
  banca.position.set(-0.5, 0, 0.42);
  g.add(banca);

  return g;
}

function sariSari() {
  const g = group('sari-sari');

  const box = mesh('store_body', new THREE.BoxGeometry(0.76, 0.6, 0.5), M.plaster);
  box.position.y = 0.3;
  g.add(box);

  const counter = mesh('store_counter', new THREE.BoxGeometry(0.8, 0.07, 0.16), M.timber);
  counter.position.set(0, 0.46, 0.3);
  g.add(counter);

  const opening = mesh('store_opening', new THREE.BoxGeometry(0.56, 0.3, 0.03), M.ink);
  opening.position.set(0, 0.63, 0.253);
  g.add(opening);

  /* striped awning — generic storefront, no logotype */
  const awning = group('store_awning');
  const slatGeo = new THREE.BoxGeometry(0.095, 0.02, 0.34);
  for (let i = 0; i < 8; i++) {
    const s = mesh('awning_slat', slatGeo, i % 2 ? M.awningA : M.awningB);
    s.position.set(-0.33 + i * 0.095, 0, 0);
    awning.add(s);
  }
  awning.rotation.x = -0.52;
  awning.position.set(0, 0.9, 0.34);
  g.add(awning);

  const braceGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5);
  for (const sx of [-1, 1]) {
    const b = mesh('awning_brace', braceGeo, M.metalDark);
    b.position.set(sx * 0.35, 0.78, 0.27);
    b.rotation.x = 0.9;
    g.add(b);
  }

  /* hanging goods: a strip of small sachets */
  const sachetGeo = new THREE.BoxGeometry(0.05, 0.07, 0.012);
  for (let i = 0; i < 6; i++) {
    const s = mesh('hanging_sachet', sachetGeo, i % 2 ? M.awningA : M.cloth);
    s.position.set(-0.26 + i * 0.105, 0.72 - rand(i) * 0.04, 0.26);
    s.rotation.z = (rand(i + 11) - 0.5) * 0.2;
    g.add(s);
  }

  const roof = mesh('store_roof', new THREE.BoxGeometry(0.84, 0.04, 0.56), M.metalDark);
  roof.position.y = 0.62;
  g.add(roof);

  const jarGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.1, 10);
  for (let i = 0; i < 3; i++) {
    const j = mesh('counter_jar', jarGeo, M.tramGlass);
    j.position.set(-0.22 + i * 0.22, 0.54, 0.3);
    g.add(j);
  }

  return g;
}

/* ---------- city side ---------- */

function duomo() {
  const g = group('duomo');

  const base = mesh('duomo_base', new THREE.BoxGeometry(1.0, 0.44, 0.7), M.marble);
  base.position.y = 0.22;
  g.add(base);

  const facade = mesh('duomo_facade', new THREE.BoxGeometry(0.9, 0.5, 0.1), M.marble);
  facade.position.set(0, 0.6, 0.31);
  g.add(facade);

  /* arched openings, shared geometry */
  const archGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10, 1, false, 0, Math.PI);
  for (let i = 0; i < 3; i++) {
    const a = mesh('duomo_arch', archGeo, M.ink);
    a.rotation.x = -Math.PI / 2;
    a.position.set(-0.28 + i * 0.28, 0.3, 0.36);
    g.add(a);
  }

  /* a cluster of pale gothic spires */
  const spireGeo = new THREE.ConeGeometry(0.075, 0.5, 6);
  const finialGeo = new THREE.ConeGeometry(0.02, 0.09, 5);
  const spires: [number, number, number][] = [
    [0, 0.0, 1.35], [-0.32, -0.18, 1.0], [0.32, -0.18, 1.05],
    [-0.15, 0.24, 0.85], [0.17, 0.24, 0.9], [-0.42, 0.1, 0.72], [0.44, 0.06, 0.78],
  ];
  spires.forEach(([x, z, h], i) => {
    const shaft = mesh(`spire_shaft_${i + 1}`, new THREE.BoxGeometry(0.11, h * 0.52, 0.11), M.marble);
    shaft.position.set(x, 0.44 + (h * 0.52) / 2, z);
    g.add(shaft);

    const tip = mesh(`spire_tip_${i + 1}`, spireGeo, M.marble);
    tip.scale.setScalar(h / 1.35 * 0.9 + 0.2);
    tip.position.set(x, 0.44 + h * 0.52 + 0.24 * (h / 1.35 * 0.9 + 0.2), z);
    g.add(tip);

    const fin = mesh(`spire_finial_${i + 1}`, finialGeo, M.marble);
    fin.position.set(x, 0.44 + h * 0.52 + 0.5 * (h / 1.35 * 0.9 + 0.2), z);
    g.add(fin);
  });

  const steps = mesh('duomo_steps', new THREE.BoxGeometry(1.14, 0.06, 0.2), M.stone);
  steps.position.set(0, 0.03, 0.43);
  g.add(steps);

  return g;
}

function tram() {
  const g = group('tram');

  /* rail: two shared-geometry lengths + sleepers */
  const railGeo = new THREE.BoxGeometry(2.0, 0.025, 0.035);
  for (const sz of [-0.2, 0.2]) {
    const r = mesh('rail', railGeo, M.rail);
    r.position.set(0, 0.03, sz);
    g.add(r);
  }
  const sleeperGeo = new THREE.BoxGeometry(0.06, 0.02, 0.52);
  for (let i = 0; i < 8; i++) {
    const s = mesh('sleeper', sleeperGeo, M.timber);
    s.position.set(-0.84 + i * 0.24, 0.012, 0);
    g.add(s);
  }

  const car = group('tram_car');
  const bodyMesh = mesh('tram_body', new THREE.BoxGeometry(1.06, 0.36, 0.42), M.tramBody);
  bodyMesh.position.y = 0.28;
  car.add(bodyMesh);

  const roofMesh = mesh('tram_roof', new THREE.BoxGeometry(1.1, 0.06, 0.46), M.tramBody);
  roofMesh.position.y = 0.49;
  car.add(roofMesh);

  const skirt = mesh('tram_skirt', new THREE.BoxGeometry(1.0, 0.08, 0.38), M.metalDark);
  skirt.position.y = 0.09;
  car.add(skirt);

  const winGeo = new THREE.BoxGeometry(0.2, 0.17, 0.02);
  for (const sz of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const w = mesh('tram_window', winGeo, M.tramGlass);
      w.position.set(-0.33 + i * 0.22, 0.33, sz * 0.215);
      car.add(w);
    }
  }
  const front = mesh('tram_windscreen', new THREE.BoxGeometry(0.02, 0.19, 0.3), M.tramGlass);
  front.position.set(0.535, 0.33, 0);
  car.add(front);

  const wheelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12);
  for (const sx of [-0.34, 0.34]) {
    for (const sz of [-0.2, 0.2]) {
      const w = mesh('tram_wheel', wheelGeo, M.metalDark);
      w.rotation.x = Math.PI / 2;
      w.position.set(sx, 0.06, sz);
      car.add(w);
    }
  }

  const pole = mesh('trolley_pole', new THREE.CylinderGeometry(0.012, 0.012, 0.34, 5), M.rail);
  pole.position.set(-0.2, 0.66, 0);
  pole.rotation.z = 0.5;
  car.add(pole);

  car.position.set(0.1, 0, 0);
  car.scale.set(0.86, 0.92, 0.82);
  g.add(car);

  return g;
}

function studio() {
  const g = group('studio');

  const desk = mesh('desk_top', new THREE.BoxGeometry(0.92, 0.05, 0.46), M.timber);
  desk.position.y = 0.42;
  g.add(desk);

  const legGeo = new THREE.BoxGeometry(0.05, 0.42, 0.05);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const l = mesh('desk_leg', legGeo, M.timber);
    l.position.set(sx * 0.41, 0.21, sz * 0.18);
    g.add(l);
  }

  /* CRT — the same glowing box as /inspiration */
  const crt = group('crt');
  const shell = mesh('crt_shell', new THREE.BoxGeometry(0.4, 0.34, 0.34), M.crt);
  shell.position.y = 0.17;
  crt.add(shell);
  const screen = mesh('crt_screen', new THREE.BoxGeometry(0.3, 0.24, 0.02), M.crtGlow);
  screen.position.set(0, 0.19, 0.175);
  crt.add(screen);
  const hood = mesh('crt_hood', new THREE.BoxGeometry(0.42, 0.04, 0.36), M.crt);
  hood.position.y = 0.36;
  crt.add(hood);
  crt.position.set(-0.17, 0.445, -0.03);
  crt.rotation.y = 0.28;
  g.add(crt);

  const keyboard = mesh('keyboard', new THREE.BoxGeometry(0.3, 0.025, 0.12), M.plaster);
  keyboard.position.set(0.13, 0.46, 0.13);
  keyboard.rotation.y = -0.12;
  g.add(keyboard);

  const stool = group('studio_stool');
  const seat = mesh('stool_seat', new THREE.CylinderGeometry(0.11, 0.11, 0.04, 12), M.cloth);
  seat.position.y = 0.3;
  stool.add(seat);
  const stoolLegGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    const l = mesh('stool_leg', stoolLegGeo, M.metalDark);
    l.position.set(Math.cos(a) * 0.07, 0.15, Math.sin(a) * 0.07);
    stool.add(l);
  }
  stool.position.set(0.05, 0, 0.42);
  g.add(stool);

  /* small scaffold tower — the site's recurring motif */
  const tower = group('scaffold_tower');
  const uprightGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.95, 6);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const u = mesh('scaffold_upright', uprightGeo, M.rail);
    u.position.set(sx * 0.11, 0.475, sz * 0.11);
    tower.add(u);
  }
  const braceGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.22, 5);
  for (let lvl = 0; lvl < 4; lvl++) {
    const y = 0.16 + lvl * 0.24;
    for (const sz of [-0.11, 0.11]) {
      const b = mesh('scaffold_brace', braceGeo, M.rail);
      b.rotation.z = Math.PI / 2;
      b.position.set(0, y, sz);
      tower.add(b);
    }
    for (const sx of [-0.11, 0.11]) {
      const b = mesh('scaffold_brace', braceGeo, M.rail);
      b.rotation.x = Math.PI / 2;
      b.position.set(sx, y, 0);
      tower.add(b);
    }
  }
  const deck = mesh('scaffold_deck', new THREE.BoxGeometry(0.26, 0.02, 0.26), M.timber);
  deck.position.y = 0.88;
  tower.add(deck);
  tower.position.set(0.56, 0, -0.3);
  g.add(tower);

  return g;
}

/* ---------- seam / memorial ---------- */

function easel() {
  const g = group('easel');

  const legGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.82, 6);
  const legs: [number, number, number, number][] = [
    [-0.16, 0.1, -0.22, 0.16], [0.16, 0.1, 0.22, 0.16], [0, -0.22, 0, -0.3],
  ];
  legs.forEach(([x, z, rx, rz], i) => {
    const l = mesh(`easel_leg_${i + 1}`, legGeo, M.timber);
    l.position.set(x, 0.4, z);
    l.rotation.set(rx * 0.7, 0, -rz * 0.7);
    g.add(l);
  });

  const ledge = mesh('easel_ledge', new THREE.BoxGeometry(0.42, 0.03, 0.07), M.timber);
  ledge.position.set(0, 0.44, 0.08);
  g.add(ledge);

  const canvasMesh = mesh('easel_canvas', new THREE.BoxGeometry(0.4, 0.34, 0.02), M.canvasWhite);
  canvasMesh.position.set(0, 0.63, 0.05);
  canvasMesh.rotation.x = -0.12;
  g.add(canvasMesh);

  const smear = mesh('canvas_sketch', new THREE.BoxGeometry(0.22, 0.14, 0.008), M.paint);
  smear.position.set(-0.02, 0.63, 0.063);
  smear.rotation.x = -0.12;
  g.add(smear);

  const stool = group('easel_stool');
  const seat = mesh('stool_seat', new THREE.BoxGeometry(0.22, 0.035, 0.22), M.timber);
  seat.position.y = 0.26;
  stool.add(seat);
  const sLegGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.26, 5);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const l = mesh('stool_leg', sLegGeo, M.timber);
    l.position.set(sx * 0.08, 0.13, sz * 0.08);
    stool.add(l);
  }
  stool.position.set(0.02, 0, 0.44);
  g.add(stool);

  /* open sketchbook on the ground */
  const book = group('sketchbook');
  for (const sx of [-1, 1]) {
    const page = mesh('sketchbook_page', new THREE.BoxGeometry(0.16, 0.012, 0.2), M.canvasWhite);
    page.position.set(sx * 0.082, 0.012, 0);
    page.rotation.z = sx * 0.07;
    book.add(page);
  }
  book.position.set(-0.4, 0, 0.3);
  book.rotation.y = 0.4;
  g.add(book);

  const brushGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.18, 5);
  for (let i = 0; i < 3; i++) {
    const b = mesh('brush', brushGeo, M.timber);
    b.position.set(-0.14 + i * 0.04, 0.47, 0.08);
    b.rotation.set(0, 0, 1.45 + i * 0.07);
    g.add(b);
  }

  return g;
}

/* Ported from the components/tombstone authoring scaffold — two grave
   crosses on an earth mound, each hung with its owner's hat, a polearm
   leaning on the larger one, and an offering of sake and flowers. The
   scaffold drew it at hero scale for its own full-viewport stage (a
   3.6-wide plinth, a 2.35-tall cross); the scale-down at the bottom brings
   it in line with the other landmarks' footprint (duomo's base, the
   largest of the rest, is 1.0 wide). */
function graves() {
  const g = group('graves');

  const plinth = mesh('grave_plinth', new THREE.BoxGeometry(3.6, 0.22, 2.2), M.rockDark);
  plinth.position.y = 0.11;
  g.add(plinth);

  const mound = mesh(
    'grave_mound',
    new THREE.SphereGeometry(1.55, 48, 24, 0, TAU, 0, Math.PI / 2),
    M.earth,
  );
  mound.scale.set(1.02, 0.09, 0.6);
  mound.position.y = 0.221;
  g.add(mound);

  const pebbleGeo = new THREE.DodecahedronGeometry(0.09, 0);
  const pebbles: [number, number][] = [
    [-1.45, 0.62], [1.5, -0.55], [-1.05, -0.75], [1.2, 0.7], [0.1, -0.85], [-0.3, 0.85],
  ];
  pebbles.forEach(([x, z], i) => {
    const p = mesh(`grave_pebble_${i + 1}`, pebbleGeo, M.stone);
    p.position.set(x, 0.25, z);
    p.scale.setScalar(0.7 + (i % 3) * 0.22);
    p.rotation.set(i, i * 1.7, i * 0.6);
    g.add(p);
  });

  /* footing, shaft, crossbar, cap — one shape for both crosses */
  const cross = (h: number, w: number, t: number, barY: number, barW: number, name: string) => {
    const c = group(name);
    const footing = mesh(`${name}_footing`, new THREE.BoxGeometry(w * 2.3, 0.2, t * 2.6), M.rockDark);
    footing.position.y = 0.1;
    c.add(footing);
    const shaft = mesh(`${name}_shaft`, new THREE.BoxGeometry(w, h, t), M.stone);
    shaft.position.y = 0.2 + h / 2;
    c.add(shaft);
    const bar = mesh(`${name}_crossbar`, new THREE.BoxGeometry(barW, w, t + 0.004), M.stone);
    bar.position.y = 0.2 + barY;
    c.add(bar);
    const cap = mesh(`${name}_cap`, new THREE.BoxGeometry(w * 1.12, 0.06, t * 1.14), M.rockDark);
    cap.position.y = 0.2 + h - 0.01;
    c.add(cap);
    return c;
  };

  const aceCross = cross(1.75, 0.2, 0.17, 1.28, 0.92, 'cross_ace');
  aceCross.position.set(-0.72, 0.2, 0.05);
  aceCross.rotation.y = 0.06;
  g.add(aceCross);

  const wbCross = cross(2.35, 0.28, 0.23, 1.74, 1.32, 'cross_whitebeard');
  wbCross.position.set(0.82, 0.2, -0.04);
  wbCross.rotation.y = -0.05;
  g.add(wbCross);

  /* a wide-brim hat, hung on the smaller crossbar */
  const aceHat = group('hat_ace');
  const aceBrimPts: THREE.Vector2[] = [];
  for (let i = 0; i <= 18; i++) {
    const u = i / 18;
    const r = 0.2 + u * 0.28;
    const y = 0.01 - Math.sin(u * Math.PI) * 0.035 + Math.pow(u, 2.3) * 0.13;
    aceBrimPts.push(new THREE.Vector2(r, y));
  }
  aceHat.add(mesh('hat_ace_brim', new THREE.LatheGeometry(aceBrimPts, 48), M.hatOrange));
  const aceCrown = mesh('hat_ace_crown', new THREE.CylinderGeometry(0.17, 0.205, 0.26, 48, 1, true), M.hatOrange);
  aceCrown.position.y = 0.14;
  aceHat.add(aceCrown);
  const aceCrownTop = mesh(
    'hat_ace_crown_top',
    new THREE.SphereGeometry(0.17, 48, 16, 0, TAU, 0, Math.PI / 2),
    M.hatOrange,
  );
  aceCrownTop.scale.y = 0.5;
  aceCrownTop.position.y = 0.265;
  aceHat.add(aceCrownTop);
  const aceBand = mesh('hat_ace_band', new THREE.TorusGeometry(0.198, 0.026, 16, 48), M.paint);
  aceBand.rotation.x = Math.PI / 2;
  aceBand.position.y = 0.05;
  aceHat.add(aceBand);
  const beadGeo = new THREE.SphereGeometry(0.028, 20, 14);
  for (let i = 0; i < 4; i++) {
    const b = mesh(`hat_ace_bead_${i + 1}`, beadGeo, M.cream);
    const a = -0.5 + i * 0.33;
    b.position.set(Math.sin(a) * 0.212, 0.058, Math.cos(a) * 0.212);
    aceHat.add(b);
  }
  aceHat.position.set(-0.7, 1.9, 0.02);
  aceHat.rotation.set(-0.3, 0.35, 0.16);
  g.add(aceHat);

  /* a captain's bicorne, hung on the larger crossbar */
  const wbHat = group('hat_whitebeard');
  const wbBrimPts: THREE.Vector2[] = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    const r = 0.19 + u * 0.24;
    const y = 0.02 - Math.sin(u * Math.PI) * 0.03 + Math.pow(u, 2.2) * 0.17;
    wbBrimPts.push(new THREE.Vector2(r, y));
  }
  const wbBrim = mesh('hat_wb_brim', new THREE.LatheGeometry(wbBrimPts, 48), M.hatDark);
  wbBrim.scale.set(1.18, 1.0, 0.74);
  wbHat.add(wbBrim);
  const wbCrown = mesh('hat_wb_crown', new THREE.CylinderGeometry(0.19, 0.225, 0.3, 48, 1, true), M.hatDark);
  wbCrown.position.y = 0.16;
  wbHat.add(wbCrown);
  const wbCrownTop = mesh(
    'hat_wb_crown_top',
    new THREE.SphereGeometry(0.19, 48, 18, 0, TAU, 0, Math.PI / 2),
    M.hatDark,
  );
  wbCrownTop.scale.y = 0.45;
  wbCrownTop.position.y = 0.305;
  wbHat.add(wbCrownTop);
  const wbTrim = mesh('hat_wb_trim', new THREE.TorusGeometry(0.222, 0.03, 16, 48), M.cream);
  wbTrim.rotation.x = Math.PI / 2;
  wbTrim.position.y = 0.06;
  wbHat.add(wbTrim);
  const wbMedal = mesh('hat_wb_emblem', new THREE.CylinderGeometry(0.08, 0.08, 0.02, 32), M.cream);
  wbMedal.rotation.set(1.46, 0, 0);
  wbMedal.position.set(0, 0.17, 0.196);
  wbHat.add(wbMedal);
  wbHat.position.set(0.8, 2.6, 0.0);
  wbHat.rotation.set(-0.26, -0.3, -0.14);
  g.add(wbHat);

  /* a polearm leaning on the larger cross */
  const pole = group('polearm');
  const poleShaft = mesh('polearm_shaft', new THREE.CylinderGeometry(0.045, 0.052, 2.3, 32), M.timber);
  poleShaft.position.y = 1.15;
  pole.add(poleShaft);
  const ringGeo = new THREE.TorusGeometry(0.052, 0.012, 12, 32);
  for (let i = 0; i < 3; i++) {
    const ring = mesh(`polearm_ferrule_${i + 1}`, ringGeo, M.metalDark);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.5 + i * 0.6;
    pole.add(ring);
  }
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.bezierCurveTo(0.1, 0.24, 0.2, 0.5, 0.26, 0.82);
  bladeShape.bezierCurveTo(0.14, 0.62, 0.02, 0.42, -0.04, 0.16);
  bladeShape.lineTo(0, 0);
  const blade = mesh(
    'polearm_blade',
    new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.03, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 24,
    }),
    M.metalDark,
  );
  blade.position.set(0, 2.26, -0.015);
  pole.add(blade);
  const collar = mesh('polearm_collar', new THREE.CylinderGeometry(0.06, 0.07, 0.1, 32), M.metalDark);
  collar.position.y = 2.24;
  pole.add(collar);
  pole.position.set(1.62, 0.22, 0.2);
  pole.rotation.z = 0.17;
  pole.rotation.x = -0.06;
  g.add(pole);

  /* offerings: a sake bottle, two cups, a spray of blossoms */
  const bottle = mesh(
    'offering_bottle',
    new THREE.LatheGeometry([
      new THREE.Vector2(0.001, 0), new THREE.Vector2(0.085, 0), new THREE.Vector2(0.09, 0.02),
      new THREE.Vector2(0.09, 0.2), new THREE.Vector2(0.05, 0.27), new THREE.Vector2(0.035, 0.33),
      new THREE.Vector2(0.045, 0.36), new THREE.Vector2(0.001, 0.362),
    ], 40),
    M.cream,
  );
  bottle.position.set(0.06, 0.25, 0.62);
  g.add(bottle);

  const cupGeo = new THREE.CylinderGeometry(0.058, 0.042, 0.05, 32);
  const cups: [number, number][] = [[-0.22, 0.58], [0.34, 0.66]];
  cups.forEach(([x, z], i) => {
    const c = mesh(`offering_cup_${i + 1}`, cupGeo, M.cream);
    c.position.set(x, 0.275, z);
    g.add(c);
  });

  const petalGeo = new THREE.SphereGeometry(0.05, 20, 14);
  const stemGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.24, 12);
  const blossoms: [number, number, number][] = [
    [-1.18, 0.55, 1.0], [-1.06, 0.42, 0.85], [-1.3, 0.66, 0.9],
  ];
  blossoms.forEach(([x, z, s], i) => {
    const stem = mesh(`flower_stem_${i + 1}`, stemGeo, M.timber);
    stem.position.set(x, 0.36, z);
    stem.rotation.z = (i - 1) * 0.24;
    g.add(stem);
    const head = mesh(`flower_head_${i + 1}`, petalGeo, M.paint);
    head.position.set(x + (i - 1) * 0.06, 0.48, z);
    head.scale.set(s * 1.4, 0.9 * s, s * 1.4);
    g.add(head);
  });

  g.scale.setScalar(0.3);

  return g;
}

export const builders: Record<LandmarkKey, () => THREE.Group> = {
  'bahay-kubo': bahayKubo,
  shore,
  'sari-sari': sariSari,
  duomo,
  tram,
  studio,
  easel,
  graves,
};

/* Placement + camera solve per landmark. buildIsland turns each of these into
   a world-space focus point and a camera station; Island.tsx eases between
   them on a click. */
export const placements: Record<LandmarkKey, Placement> = {
  'bahay-kubo': { position: [-1.62, 0, -0.95], rotationY: 0.55, focusY: 0.6, offsetDir: [-0.55, 0.52, 0.65], dist: 2.6 },
  shore:        { position: [-2.3, 0, 0.9], rotationY: -0.35, focusY: 0.55, offsetDir: [-0.7, 0.42, 0.58], dist: 2.9 },
  'sari-sari':  { position: [-1.1, 0, 1.55], rotationY: -0.25, focusY: 0.55, offsetDir: [-0.3, 0.45, 0.85], dist: 2.3 },
  duomo:        { position: [1.95, CITY_LIFT, -0.95], rotationY: -2.5, focusY: 0.85, offsetDir: [0.5, 0.5, 0.7], dist: 3.2 },
  tram:         { position: [1.55, CITY_LIFT, 1.25], rotationY: -0.9, focusY: 0.35, offsetDir: [0.45, 0.42, 0.79], dist: 2.6 },
  studio:       { position: [0.95, CITY_LIFT, -0.05], rotationY: -1.15, focusY: 0.5, offsetDir: [0.72, 0.48, 0.5], dist: 2.4 },
  easel:        { position: [-0.08, 0, 0.95], rotationY: 0.25, focusY: 0.55, offsetDir: [-0.1, 0.42, 0.9], dist: 2.0 },
  graves:       { position: [0.1, 0, -2.85], rotationY: 0.2, focusY: 0.5, offsetDir: [0.15, 0.5, -0.85], dist: 2.8 },
};

/* The avatar's spot on the seam path, and the shot it is framed by — the same
   placement shape the landmarks use, plus the scale it is stood at.

   The figure is 1.30 model units tall and stands at 0.5, so 0.65 on the
   island. focusY 0.34 aims a little above its middle, the way a portrait
   favours the upper half; offsetDir is Avatar.tsx's three-quarter view, which
   is the angle this model was drawn to be seen from; and 1.55 is the range at
   which it fills about two thirds of the frame and the seam path it stands on
   fills the rest. */
export const AVATAR_SPOT: Placement & { scale: number } = {
  position: [-0.12, 0, 1.95],
  scale: 0.5,
  rotationY: 0.1,
  focusY: 0.34,
  offsetDir: [0.4, 0.42, 0.82],
  dist: 1.55,
};

export { ISLAND_RADIUS, groundY };
