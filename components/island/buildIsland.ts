/* Assembles terrain + landmarks + the avatar (buildAvatar is reused unchanged
   from the About page's corner figure — same model, standing on the seam path
   at a half its size).

   What comes back is the scene graph plus, for each landmark, the two things
   a camera move needs: the point to look at and the point to look from. Those
   are solved here, once at build time, rather than in the render loop. */
import * as THREE from 'three';
import { buildTerrain } from './terrain';
import { builders, landmarkKeys, placements, AVATAR_SPOT, FIGURE_KEY } from './landmarks';
import type { FocusKey, Placement } from './landmarks';
import { disposeIsland } from './materials';
import { buildAvatar, type AvatarParts } from '@/components/avatar/buildAvatar';

/** One thing on the island, resolved: its group and the camera solve that
    frames it. The figure on the seam path is one of these too. */
export type IslandLandmark = {
  key: FocusKey;
  group: THREE.Group;
  /** world-space point the camera looks at */
  focus: THREE.Vector3;
  /** unit direction it stands along, from that focus */
  offsetDir: THREE.Vector3;
  /** how far along it */
  dist: number;
  /** the group's resting y — the hover lift animates away from this */
  restY: number;
};

export type BuiltIsland = {
  island: THREE.Group;
  landmarks: IslandLandmark[];
  /** null when built with `withAvatar: false` */
  parts: (AvatarParts & { figure: THREE.Group }) | null;
  disposeIsland: () => void;
};

export function buildIsland({ withAvatar = true } = {}): BuiltIsland {
  const island = new THREE.Group();
  island.name = 'island';

  island.add(buildTerrain());

  // one shape for all nine, so the camera has nothing to special-case
  const solve = (key: FocusKey, g: THREE.Group, p: Placement): IslandLandmark => ({
    key,
    group: g,
    focus: new THREE.Vector3(p.position[0], p.position[1] + p.focusY, p.position[2]),
    offsetDir: new THREE.Vector3(...p.offsetDir).normalize(),
    dist: p.dist,
    restY: p.position[1],
  });

  const landmarks: IslandLandmark[] = landmarkKeys.map((key) => {
    const p = placements[key];
    const g = builders[key]();
    g.position.set(...p.position);
    g.rotation.y = p.rotationY;
    g.userData.key = key;                       // raycast walks parents up to this
    g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    island.add(g);

    return solve(key, g, p);
  });

  let parts: BuiltIsland['parts'] = null;
  if (withAvatar) {
    const built = buildAvatar();
    const fig = built.avatar;
    fig.scale.setScalar(AVATAR_SPOT.scale);
    fig.position.set(...AVATAR_SPOT.position);
    fig.rotation.y = AVATAR_SPOT.rotationY;
    fig.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    fig.userData.key = FIGURE_KEY;              // pickable, like the landmarks
    island.add(fig);
    // first in the list: it is the one the page is about
    landmarks.unshift(solve(FIGURE_KEY, fig, AVATAR_SPOT));
    parts = { ...built.parts, figure: fig };
  }

  return {
    island,
    landmarks,
    parts,
    disposeIsland: () => disposeIsland(island),
  };
}

export { landmarkKeys, placements, builders, FIGURE_KEY };
export type { FocusKey, LandmarkKey } from './landmarks';
