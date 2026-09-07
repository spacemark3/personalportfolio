// The avatar itself — a TypeScript port of avatar/avatar.js, which is where
// it was modelled. Every geometry number, scale, position and material colour
// below is copied from that file unchanged: this is the artwork, not code to
// improve. Edit the model in avatar/portfolio-avatar.html (it has the orbit
// controls and the OBJ/GLB export buttons), then bring the numbers back here.
//
// It is built out of primitives at runtime — there is no model file to fetch,
// no loader, and nothing in public/. The cost is three.js itself, which is why
// components/Avatar.tsx imports this lazily.

import * as THREE from "three";

// Both halves of every mirrored part, as a tuple — an inline [['left', -1], …]
// would widen to (string | number)[] and lose the sign's numeric type.
const SIDES = [
  ["left", -1],
  ["right", 1],
] as const;

export type AvatarParts = {
  head: THREE.Group;
  body: THREE.Group;
  hands: THREE.Group;
  legs: THREE.Group;
};

export type BuiltAvatar = {
  avatar: THREE.Group;
  /** the groups the idle animation and the cursor-look drive */
  parts: AvatarParts;
};

const M = {
  skin: new THREE.MeshStandardMaterial({ name: 'skin', color: '#e8b58c', roughness: 0.62, metalness: 0.02 }),
  hair: new THREE.MeshStandardMaterial({ name: 'hair', color: '#1a1512', roughness: 0.5, metalness: 0.05 }),
  sweater: new THREE.MeshStandardMaterial({ name: 'sweater_navy', color: '#26314f', roughness: 0.85, metalness: 0.0 }),
  trim: new THREE.MeshStandardMaterial({ name: 'collar_gold', color: '#d3ae4c', roughness: 0.55, metalness: 0.15 }),
  pants: new THREE.MeshStandardMaterial({ name: 'trousers', color: '#2b2f37', roughness: 0.8, metalness: 0.0 }),
  shoe: new THREE.MeshStandardMaterial({ name: 'shoe_canvas', color: '#efece2', roughness: 0.7, metalness: 0.0 }),
  sole: new THREE.MeshStandardMaterial({ name: 'shoe_sole', color: '#3a3d44', roughness: 0.75, metalness: 0.0 }),
  frame: new THREE.MeshStandardMaterial({ name: 'glasses_frame', color: '#15151a', roughness: 0.35, metalness: 0.25 }),
  lens: new THREE.MeshStandardMaterial({ name: 'glasses_lens', color: '#cfd9de', roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.22 }),
  ink: new THREE.MeshStandardMaterial({ name: 'ink', color: '#171310', roughness: 0.45, metalness: 0.0 }),
  mouth: new THREE.MeshStandardMaterial({ name: 'mouth', color: '#8b5147', roughness: 0.6, metalness: 0.0 }),
};

function mesh(name: string, geo: THREE.BufferGeometry, mat: THREE.Material) {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  return m;
}

function roundedRectPath<T extends THREE.Path>(
  w: number,
  h: number,
  r: number,
  PathClass: new () => T
): T {
  const p = new PathClass();
  const x = -w / 2, y = -h / 2;
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
  return p;
}

function frameGeo(w: number, h: number, r: number, t: number) {
  const shape = roundedRectPath(w, h, r, THREE.Shape);
  shape.holes.push(roundedRectPath(w - t * 2, h - t * 2, Math.max(r - t, 0.004), THREE.Path));
  return new THREE.ExtrudeGeometry(shape, { depth: 0.016, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2, curveSegments: 12 });
}

export function buildAvatar(): BuiltAvatar {
  const avatar = new THREE.Group();
  avatar.name = 'avatar';

  /* ---- legs & shoes ---- */
  const legs = new THREE.Group();
  legs.name = 'legs';
  for (const [side, sx] of SIDES) {
    const leg = mesh(`leg_${side}`, new THREE.CapsuleGeometry(0.062, 0.24, 8, 24), M.pants);
    leg.position.set(sx * 0.085, 0.22, 0);
    legs.add(leg);

    const shoe = mesh(`shoe_${side}`, new THREE.CapsuleGeometry(0.062, 0.075, 8, 24), M.shoe);
    shoe.rotation.z = Math.PI / 2;
    shoe.rotation.y = Math.PI / 2;
    shoe.scale.set(1, 1, 0.82);
    shoe.position.set(sx * 0.085, 0.062, 0.028);
    legs.add(shoe);

    const sole = mesh(`sole_${side}`, new THREE.CylinderGeometry(0.063, 0.061, 0.022, 24), M.sole);
    sole.scale.set(1, 1, 1.9);
    sole.position.set(sx * 0.085, 0.026, 0.03);
    legs.add(sole);
  }
  avatar.add(legs);

  /* ---- torso ---- */
  const body = new THREE.Group();
  body.name = 'body';

  const torso = mesh('sweater_torso', new THREE.CapsuleGeometry(0.185, 0.2, 10, 36), M.sweater);
  torso.scale.set(1, 1, 0.84);
  torso.position.y = 0.51;
  body.add(torso);

  const hem = mesh('sweater_hem', new THREE.CylinderGeometry(0.176, 0.166, 0.05, 36), M.sweater);
  hem.scale.set(1, 1, 0.84);
  hem.position.y = 0.365;
  body.add(hem);

  const collar = mesh('collar_trim', new THREE.TorusGeometry(0.088, 0.017, 12, 40), M.trim);
  collar.rotation.x = Math.PI / 2;
  collar.scale.set(1, 0.86, 1);
  collar.position.y = 0.687;
  body.add(collar);

  const collarInner = mesh('collar_inner', new THREE.CylinderGeometry(0.084, 0.084, 0.05, 32), M.sweater);
  collarInner.scale.set(1, 1, 0.86);
  collarInner.position.y = 0.678;
  body.add(collarInner);

  /* shoulders / sleeves */
  for (const [side, sx] of SIDES) {
    const sleeve = mesh(`sleeve_${side}`, new THREE.CapsuleGeometry(0.062, 0.13, 8, 24), M.sweater);
    sleeve.position.set(sx * 0.185, 0.5, 0);
    sleeve.rotation.z = sx * 0.16;
    body.add(sleeve);

    const cuff = mesh(`cuff_${side}`, new THREE.TorusGeometry(0.055, 0.014, 10, 24), M.trim);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.set(sx * 0.215, 0.4, 0);
    body.add(cuff);
  }
  avatar.add(body);

  /* ---- floating hands ---- */
  const hands = new THREE.Group();
  hands.name = 'hands';
  for (const [side, sx] of SIDES) {
    const hand = mesh(`hand_${side}`, new THREE.SphereGeometry(0.062, 32, 24), M.skin);
    hand.scale.set(0.92, 1, 0.8);
    hand.position.set(sx * 0.245, 0.325, 0.01);
    hand.name = `hand_${side}`;
    hands.add(hand);
  }
  avatar.add(hands);

  /* ---- head ---- */
  const head = new THREE.Group();
  head.name = 'head';
  head.position.y = 0.72;

  const neck = mesh('neck', new THREE.CylinderGeometry(0.062, 0.07, 0.09, 24), M.skin);
  neck.position.y = 0.02;
  head.add(neck);

  const skull = mesh('head', new THREE.SphereGeometry(0.24, 48, 36), M.skin);
  skull.scale.set(0.94, 1.04, 0.9);
  skull.position.y = 0.26;
  head.add(skull);

  const jaw = mesh('jaw', new THREE.SphereGeometry(0.155, 32, 24), M.skin);
  jaw.scale.set(1.02, 0.85, 0.95);
  jaw.position.set(0, 0.155, 0.03);
  head.add(jaw);

  for (const [side, sx] of SIDES) {
    const ear = mesh(`ear_${side}`, new THREE.SphereGeometry(0.042, 24, 18), M.skin);
    ear.scale.set(0.45, 1, 0.78);
    ear.position.set(sx * 0.223, 0.256, -0.008);
    head.add(ear);
  }

  /* hair: back-tilted cap + forward fringe + nape */
  const cap = mesh('hair_cap', new THREE.SphereGeometry(0.2455, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.56), M.hair);
  cap.scale.set(0.965, 1.075, 0.925);
  cap.position.y = 0.262;
  cap.rotation.x = -0.3;
  head.add(cap);

  const fringe = mesh('hair_fringe', new THREE.SphereGeometry(0.135, 32, 24), M.hair);
  fringe.scale.set(1.28, 0.44, 0.66);
  fringe.position.set(-0.018, 0.372, 0.135);
  fringe.rotation.z = -0.14;
  head.add(fringe);

  const nape = mesh('hair_nape', new THREE.SphereGeometry(0.14, 32, 24), M.hair);
  nape.scale.set(1.24, 0.9, 0.7);
  nape.position.set(0, 0.245, -0.128);
  head.add(nape);

  for (const [side, sx] of SIDES) {
    const burn = mesh(`sideburn_${side}`, new THREE.SphereGeometry(0.055, 24, 18), M.hair);
    burn.scale.set(0.42, 1.05, 0.85);
    burn.position.set(sx * 0.214, 0.245, -0.03);
    head.add(burn);
  }

  /* brows, eyes, mouth */
  for (const [side, sx] of SIDES) {
    const brow = mesh(`brow_${side}`, new THREE.BoxGeometry(0.072, 0.014, 0.014), M.hair);
    brow.position.set(sx * 0.079, 0.313, 0.203);
    brow.rotation.z = sx * -0.06;
    head.add(brow);

    const eye = mesh(`eye_${side}`, new THREE.SphereGeometry(0.028, 28, 20), M.ink);
    eye.scale.set(1, 0.78, 0.5);
    eye.position.set(sx * 0.079, 0.268, 0.196);
    head.add(eye);
  }

  const mole = mesh('mole', new THREE.SphereGeometry(0.011, 16, 12), M.ink);
  mole.scale.set(1, 1, 0.5);
  mole.position.set(0.132, 0.192, 0.181);
  head.add(mole);

  const nose = mesh('nose', new THREE.SphereGeometry(0.032, 24, 18), M.skin);
  nose.scale.set(0.9, 0.85, 1.05);
  nose.position.set(0, 0.222, 0.213);
  head.add(nose);

  const mouthMesh = mesh('mouth', new THREE.TorusGeometry(0.045, 0.009, 10, 28, Math.PI * 0.72), M.mouth);
  mouthMesh.rotation.z = Math.PI + Math.PI * 0.14;
  mouthMesh.position.set(0, 0.163, 0.196);
  head.add(mouthMesh);

  /* glasses */
  const glasses = new THREE.Group();
  glasses.name = 'glasses';
  for (const [side, sx] of SIDES) {
    const f = mesh(`glasses_frame_${side}`, frameGeo(0.115, 0.082, 0.022, 0.0115), M.frame);
    f.position.set(sx * 0.081, 0.272, 0.2);
    glasses.add(f);

    const l = mesh(`glasses_lens_${side}`, new THREE.BoxGeometry(0.098, 0.066, 0.004), M.lens);
    l.position.set(sx * 0.081, 0.272, 0.206);
    glasses.add(l);

    const temple = mesh(`glasses_temple_${side}`, new THREE.BoxGeometry(0.012, 0.011, 0.15), M.frame);
    temple.position.set(sx * 0.135, 0.283, 0.128);
    temple.rotation.y = sx * 0.2;
    glasses.add(temple);
  }
  const bridge = mesh('glasses_bridge', new THREE.BoxGeometry(0.05, 0.011, 0.014), M.frame);
  bridge.position.set(0, 0.288, 0.203);
  glasses.add(bridge);
  head.add(glasses);

  avatar.add(head);

  return {
    avatar,
    parts: { head, body, hands, legs },
  };
}

// The scaffold this came from never disposed anything — it was a single-page
// studio that lived until the tab closed. Here the About page mounts and
// unmounts on every client-side navigation, so each visit would strand a set
// of GPU buffers without this.
export function disposeAvatar(avatar: THREE.Group) {
  const materials = new Set<THREE.Material>();
  avatar.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      if (mat) materials.add(mat);
    }
  });
  // materials are shared across meshes (M above), so they are collected first
  // and disposed once rather than once per mesh that references them
  for (const mat of materials) mat.dispose();
}
