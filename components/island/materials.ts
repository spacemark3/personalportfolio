/* Shared materials for the island. Mirrors buildAvatar.ts's module-level `M`.
   No env map in the light rig → metalness stays <= 0.35 on everything;
   metal reads through a brighter base colour instead.

   One instance per entry, shared by every mesh that names it — which is what
   disposeIsland below has to collect before it disposes. */
import * as THREE from 'three';

type StdExtra = Omit<THREE.MeshStandardMaterialParameters, 'name' | 'color' | 'roughness' | 'metalness'>;

const std = (
  name: string,
  color: string,
  roughness = 0.8,
  metalness = 0.0,
  extra: StdExtra = {},
) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, ...extra });

export const M = {
  /* terrain */
  rock:      std('rock', '#6d6257', 0.95),
  rockDark:  std('rock_dark', '#544a42', 0.95),
  sand:      std('sand', '#e2caa0', 0.9),
  grass:     std('grass', '#7d9460', 0.88),
  stone:     std('stone', '#9d9a94', 0.85),
  cobble:    std('cobble', '#8a8781', 0.9),
  water:     std('water', '#79b6c4', 0.35, 0.1, { transparent: true, opacity: 0.72 }),
  path:      std('path', '#cbb28c', 0.92),
  trail:     std('trail', '#b9a079', 0.94),

  /* vegetation */
  palmTrunk: std('palm_trunk', '#8a6e4f', 0.9),
  frond:     std('palm_frond', '#5f8a4e', 0.85, 0.0, { side: THREE.DoubleSide }),

  /* built props */
  bamboo:    std('bamboo', '#c9b271', 0.85),
  nipa:      std('nipa_thatch', '#a8823f', 0.92),
  timber:    std('timber', '#7b5c3e', 0.88),
  plaster:   std('plaster', '#e8dfcd', 0.88),
  awningA:   std('awning_stripe_a', '#cf5b4b', 0.85),
  awningB:   std('awning_stripe_b', '#f1e6d2', 0.85),
  marble:    std('marble_pale', '#ded9cf', 0.6, 0.02),
  tramBody:  std('tram_body', '#d8743a', 0.55, 0.2),
  tramGlass: std('tram_glass', '#b9d7dd', 0.2, 0.1, { transparent: true, opacity: 0.55 }),
  rail:      std('rail_steel', '#b6b3ae', 0.45, 0.32),
  metalDark: std('metal_dark', '#6f7378', 0.5, 0.3),
  crt:       std('crt_shell', '#d9d3c4', 0.7),
  crtGlow:   new THREE.MeshStandardMaterial({
    name: 'crt_glow', color: '#8fd7c4', roughness: 0.4, metalness: 0.0,
    emissive: '#4fbfa4', emissiveIntensity: 0.9,
  }),
  canvasWhite: std('canvas_white', '#f4f1e8', 0.85),
  paint:     std('paint_accent', '#c8643f', 0.8),
  cloth:     std('cloth', '#3f5d7a', 0.9),
  ink:       std('ink', '#2b2723', 0.6),

  /* the graves */
  earth:     std('earth', '#5d5147', 1.0),
  hatOrange: std('hat_orange', '#ec6b13', 0.75),
  hatDark:   std('hat_dark', '#2a2724', 0.7),
  cream:     std('cream', '#e8e2d6', 0.7),
};

/* Dedupe-and-dispose, copied from disposeAvatar's approach — except that the
   island shares geometry as well as materials (the coastal trail's 84 segments
   are one BoxGeometry, the rim rocks one dodecahedron), so both go into a Set
   and are disposed once rather than once per mesh that holds them. */
export function disposeIsland(root: THREE.Object3D) {
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    geos.add(m.geometry);
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      if (mat) mats.add(mat);
    }
  });
  for (const g of geos) g.dispose();
  for (const m of mats) m.dispose();
}
