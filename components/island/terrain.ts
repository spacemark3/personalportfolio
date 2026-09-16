/* Island body: jittered rock cone, two caps (sand west / stone east),
   water shelf, the seam path, and the coastal running trail.
   Convention: island top surface sits at y = 0. West = -x, East = +x. */
import * as THREE from 'three';
import { M } from './materials';

export const ISLAND_RADIUS = 3.5;
export const CITY_LIFT = 0.14;          // east half sits slightly higher
const TAU = Math.PI * 2;

const mesh = (name: string, geo: THREE.BufferGeometry, mat: THREE.Material) => {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

/* deterministic jitter — reproducible across reloads and ports */
const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function jitter(geo: THREE.CylinderGeometry, amount: number, seed = 0) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const half = geo.parameters.height / 2;
    if (y < -half + 0.02) continue;             // keep the bottom tip sharp
    const k = 1 - Math.min(Math.abs(y) / (half * 1.7), 1); // more jitter near the rim
    p.setX(i, p.getX(i) + (rand(i + seed) - 0.5) * amount * k);
    p.setZ(i, p.getZ(i) + (rand(i + seed + 91) - 0.5) * amount * k);
    /* the top ring stays level so the flat caps sit on it cleanly */
    if (y < half - 0.02) p.setY(i, y + (rand(i + seed + 57) - 0.5) * amount * 0.5 * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/* flat half-disc cap, laid in the xz plane */
function capGeo(radius: number, thetaStart: number, thetaLength: number, segments = 9) {
  const g = new THREE.CircleGeometry(radius, segments, thetaStart, thetaLength);
  g.rotateX(-Math.PI / 2);
  return g;
}

export function buildTerrain() {
  const terrain = new THREE.Group();
  terrain.name = 'terrain';

  /* rock mass, tapering to a point below */
  const body = mesh('island_rock',
    jitter(new THREE.CylinderGeometry(ISLAND_RADIUS, 0, 3.1, 9, 4), 0.26, 3), M.rock);
  body.position.y = -1.67;   // top face at -0.12, under every cap and the water
  terrain.add(body);

  const underShelf = mesh('island_rock_underside',
    jitter(new THREE.CylinderGeometry(ISLAND_RADIUS * 0.82, ISLAND_RADIUS * 0.55, 0.5, 9, 1), 0.2, 21), M.rockDark);
  underShelf.position.y = -0.46;
  terrain.add(underShelf);

  /* west: sand cap, east: stone cap on a low riser */
  const sandCap = mesh('cap_sand', capGeo(ISLAND_RADIUS * 0.995, Math.PI * 0.5, Math.PI), M.sand);
  sandCap.position.y = 0.002;
  terrain.add(sandCap);

  const grassPatch = mesh('cap_grass', capGeo(1.46, 0, TAU, 14), M.grass);
  grassPatch.position.set(-1.48, 0.02, -0.38);
  terrain.add(grassPatch);

  const cityRiser = mesh('city_riser',
    /* CylinderGeometry theta runs from +z toward +x — 0..PI is the east half
       (CircleGeometry's, used by the caps, runs from +x instead) */
    new THREE.CylinderGeometry(ISLAND_RADIUS * 0.995, ISLAND_RADIUS * 0.99, CITY_LIFT, 9, 1, false, 0, Math.PI),
    M.stone);
  cityRiser.position.y = CITY_LIFT / 2;
  terrain.add(cityRiser);

  const cityCap = mesh('cap_cobble', capGeo(ISLAND_RADIUS * 0.995, -Math.PI * 0.5, Math.PI), M.cobble);
  cityCap.position.y = CITY_LIFT + 0.002;
  terrain.add(cityCap);

  /* shallow water shelf hugging the west rim */
  const shelf = mesh('water_shelf', capGeo(ISLAND_RADIUS * 1.22, Math.PI * 0.46, Math.PI * 1.08, 28), M.water);
  shelf.position.y = -0.085;
  shelf.castShadow = false;
  terrain.add(shelf);

  const wetSand = mesh('wet_sand', capGeo(ISLAND_RADIUS * 1.06, Math.PI * 0.48, Math.PI * 1.04, 24), M.sand);
  wetSand.position.y = -0.045;
  terrain.add(wetSand);

  /* seam path: runs down the z axis where the halves meet */
  const seam = mesh('seam_path', new THREE.BoxGeometry(0.52, 0.03, ISLAND_RADIUS * 1.76), M.path);
  seam.position.set(0, 0.022, 0.1);
  terrain.add(seam);

  const seamKerb = mesh('seam_kerb', new THREE.BoxGeometry(0.06, 0.055, ISLAND_RADIUS * 1.76), M.stone);
  seamKerb.position.set(0.3, 0.03, 0.1);
  terrain.add(seamKerb);

  /* coastal trail: shared-geometry segments stepped onto each half's ground
     height, so it stays visible where the city cap is raised (the `graves`
     landmark now sits on it, where the old marker post did) */
  const trailR = ISLAND_RADIUS * 0.855;
  const segCount = 84;
  /* overlap generously — straight boxes on a curve leave gaps otherwise */
  const segGeo = new THREE.BoxGeometry((TAU * trailR) / segCount * 1.5, 0.028, 0.19);
  for (let i = 0; i < segCount; i++) {
    const a = (i / segCount) * TAU;
    const x = Math.cos(a) * trailR;
    const z = Math.sin(a) * trailR;
    const s = mesh('trail_segment', segGeo, M.trail);
    s.position.set(x, (x > 0.06 ? CITY_LIFT : 0) + 0.03, z);
    s.rotation.y = -a;
    terrain.add(s);
  }

  /* a few shared-geometry rocks around the rim */
  const rockGeo = new THREE.DodecahedronGeometry(0.16, 0);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + 0.4;
    const r = ISLAND_RADIUS * (0.9 + rand(i + 40) * 0.08);
    const rk = mesh(`rim_rock_${i + 1}`, rockGeo, M.rockDark);
    const east = Math.cos(a) > 0;
    rk.position.set(Math.cos(a) * r, (east ? CITY_LIFT : 0) - 0.02, Math.sin(a) * r);
    rk.scale.setScalar(0.7 + rand(i + 70) * 0.7);
    rk.rotation.set(rand(i) * TAU, rand(i + 5) * TAU, rand(i + 9) * TAU);
    terrain.add(rk);
  }

  return terrain;
}

/* ground height at a point — landmarks sit on this */
export const groundY = (x: number) => (x > 0 ? CITY_LIFT : 0);
