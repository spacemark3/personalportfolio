"use client";

import { useEffect, useRef } from "react";
import type * as THREE_T from "three";

// The avatar on the About page: a living portrait, not a viewer. No orbit
// controls, no toolbar, no hint text — it breathes, and it looks at your
// cursor. Everything else the authoring scaffold (avatar/three-d-stage.js)
// carried is deliberately left there: the OBJ/GLB download buttons, the
// postMessage export telemetry, the unpkg import map, the 100vh host.
//
// three.js is imported lazily inside the effect rather than at the top of the
// file. That is what keeps ~150KB of it off /, /journey and /inspiration — it
// becomes a chunk fetched only once this component mounts.

// Framing. A slightly long lens (40° rather than the scaffold's 45°) flattens
// the face the way a portrait lens does. One framing at every size — the
// whole figure, head to shoes — solved from the model's own bounding box
// against the stage's aspect rather than picked by hand, so the phone gets a
// miniature of the same shot the desktop gets and not a crop of its own.
// FULL_MARGIN is the air left around the figure; 1 would have the shoes
// touching the bottom edge.
const FOV = 40;
const FULL_DIR = { x: 0.42, y: 0.1, z: 0.9 }; // three-quarter view
// 1.2, measured rather than guessed: the plane solve below is a flat
// approximation, and the parts of a figure nearest the camera project wider
// than it predicts. At 1.2 the silhouette lands inside 0.85 of the frame on
// every side, feet included, instead of grazing the bottom edge at 0.92.
const FULL_MARGIN = 1.2;
// The figure stands left of centre in its box. It is symmetrical at rest, but
// the wave below only ever raises the arm on one side, so the room it needs
// is all on the right. Aiming the camera to that side is what leaves it: at
// 0.14 the raised hand peaks at 0.57 of the half-frame and the resting
// silhouette still keeps 0.28 of air on the left.
const FULL_SHIFT_X = 0.14;

// half the vertical field, as a tangent — the one number both the fit solve
// and its horizontal counterpart are built from
const HALF_FOV_TAN = Math.tan((FOV * Math.PI) / 360);

// How far the head may turn to follow the cursor, in radians. Past roughly
// these the neck reads as broken — the head is one rigid group — so the
// shoulders take a share of the yaw below rather than the neck taking more.
const YAW_RANGE = 0.55;
const PITCH_RANGE = 0.3;

// The wave, for when the pointer is over the stage itself. The whole arm
// turns about the shoulder as one piece — sleeve, cuff and hand — because
// lifting the hand alone leaves it floating away from a sleeve still hanging
// at the hip. ANGLE swings it up and out (2.3 rad ≈ 132°, which puts the hand
// beside the jaw and well clear of the head), SWING is the rock either side
// of that, SPEED its rate in radians per second.
const WAVE_ANGLE = 2.3;
const WAVE_SWING = 0.16;
const WAVE_SPEED = 9;
// where that turn happens, in model units: the shoulder, just below the collar
const SHOULDER_Y = 0.6;

// Pointer travel that reaches the full range, as a fraction of the reference
// half-axis. Above 1 the head arrives at its limit before the cursor reaches
// the window edge, which is what makes the follow feel eager instead of slack.
const POINTER_GAIN = 1.35;

// the cursor has to have been still this long before the idle sway returns
const POINTER_IDLE_MS = 3500;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function Avatar({ label }: { label: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let teardown: (() => void) | null = null;

    (async () => {
      const [THREE, { buildAvatar, disposeAvatar }] = await Promise.all([
        import("three"),
        import("@/components/avatar/buildAvatar"),
      ]);
      // unmounted while three.js was still downloading — build nothing
      if (cancelled) return;

      let renderer: THREE_T.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        // no WebGL context. The page keeps the space the CSS reserved and
        // says nothing — this is decoration, it must never break About.
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.appendChild(renderer.domElement);

      // No scene.background and alpha: true — the page's own paper shows
      // through, so the avatar sits ON the page instead of in a box of its own.
      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100);
      const dir = new THREE.Vector3();
      // where the camera stands and what it looks at, in one call — fit()
      // below is the only caller, so the framing has exactly one owner
      const place = (targetY: number, dist: number, d: { x: number; y: number; z: number }) => {
        dir.set(d.x, d.y, d.z).normalize();
        camera.position.set(FULL_SHIFT_X, targetY, 0).addScaledVector(dir, dist);
        camera.lookAt(FULL_SHIFT_X, targetY, 0);
      };

      // the scaffold's neutral studio: sky/ground wash, a shadow-casting key,
      // and a dim warm fill from behind so the silhouette never goes black
      scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.0));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(4, 7, 5);
      key.castShadow = true;
      // 1024, not the scaffold's 2048: this renders into a box 440px wide at
      // most, and the shadows that matter are small — under the chin, under
      // the glasses, and the one the figure drops on the floor below it
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.bias = -0.0002;
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xfff4e6, 0.5);
      fill.position.set(-5, 3, -4);
      scene.add(fill);

      const { avatar, parts } = buildAvatar();
      avatar.traverse((o) => {
        const m = o as THREE_T.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      scene.add(avatar);

      const box = new THREE.Box3().setFromObject(avatar);
      const sphere = box.getBoundingSphere(new THREE.Sphere());

      // What the wide framing has to cover. Height is the box outright;
      // width is the ground-plane diagonal, because the camera stands at a
      // three-quarter angle — the shoulders present wider than box.x alone.
      const size = box.getSize(new THREE.Vector3());
      const centreY = (box.min.y + box.max.y) / 2;
      const halfH = size.y / 2;
      const halfW = Math.hypot(size.x, size.z) / 2;
      // the distance at which both half-extents clear the frustum. A tall box
      // is bound by height, a squat one by width — hence the max, not a guess.
      const fullDist = (aspect: number) =>
        Math.max(halfH / HALF_FOV_TAN, halfW / (HALF_FOV_TAN * aspect)) * FULL_MARGIN;

      // A floor, now that the wide shot ends below the shoes rather than at
      // the knee: ShadowMaterial paints the shadow and nothing else, so the
      // page's own paper still shows through and the figure stops hanging in
      // it. Out of frame entirely in the face crop, which starts at the neck.
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 6),
        new THREE.ShadowMaterial({ opacity: 0.14 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = box.min.y;
      ground.receiveShadow = true;
      scene.add(ground);

      const span = sphere.radius * 1.6;
      key.shadow.camera.left = -span;
      key.shadow.camera.right = span;
      key.shadow.camera.top = span;
      key.shadow.camera.bottom = -span;
      key.shadow.camera.updateProjectionMatrix();

      const fit = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        const aspect = w / h;
        renderer.setSize(w, h, false);
        camera.aspect = aspect;
        // the framing follows the box: a resize, a rotation, or the phone's
        // miniature all land the same shot, only smaller
        place(centreY, fullDist(aspect), FULL_DIR);
        camera.updateProjectionMatrix();
      };
      fit();

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

      const base = {
        bodyY: parts.body.position.y,
        headY: parts.head.position.y,
        // whole vectors, not just y: the wave moves the hand on every axis
        hands: parts.hands.children.map((h) => h.position.clone()),
      };

      // the hand that waves is the one on the camera's right — +x is the
      // camera's right from where it stands, and the other hand would wave
      // from behind the torso
      let waveIdx = 0;
      base.hands.forEach((v, i) => {
        if (v.x > base.hands[waveIdx].x) waveIdx = i;
      });
      const armSide = Math.sign(base.hands[waveIdx].x) || 1;

      // Hands into the torso group. They are modelled as floating — no
      // forearm — but they are still that torso's hands: breathing, and the
      // shoulders' share of the cursor-turn, have to carry them too, or the
      // raised arm below comes apart from the sleeve it is made of.
      parts.body.add(parts.hands);

      // The rest of the arm that waves: the sleeve and cuff on the waving
      // hand's side, found by the sign of their x rather than by name, so the
      // two stay in step if the rig is ever remodelled.
      const limb = (prefix: string) =>
        parts.body.children.find(
          (o) => o.name.startsWith(prefix) && Math.sign(o.position.x) === armSide
        );
      const sleeve = limb("sleeve_");
      const cuff = limb("cuff_");
      // The cuff is a torus laid flat by rotation.x, and a torus turned about
      // its own axis shows nothing — under the default XYZ order that is all
      // a z angle would do to it. ZYX applies z last, so the ring tilts with
      // the arm instead.
      cuff?.rotation.reorder("ZYX");
      const arm = [sleeve, cuff].filter((o): o is THREE_T.Object3D => !!o).map((o) => ({
        o,
        rest: o.position.clone(),
        rotZ: o.rotation.z,
      }));
      // the shoulder the whole limb pivots on
      const pivot = { x: sleeve ? sleeve.position.x : base.hands[waveIdx].x, y: SHOULDER_Y };

      // where the cursor wants the head, and where the head actually is —
      // the gap between them is closed a fraction per frame, which is what
      // makes the look land softly instead of snapping
      const want = { yaw: 0, pitch: 0 };
      const look = { yaw: 0, pitch: 0 };
      let engage = 0; // 0 = idle sway only, 1 = fully following the cursor
      let lastMove = -Infinity;

      // last pointer position in viewport coordinates, and whether there has
      // been one at all. Kept apart from aim() because the aim goes stale on
      // its own: scrolling moves the stage out from under a finger that never
      // moved, and the head should keep pointing at the finger, not at where
      // the finger used to be relative to the canvas.
      let px = 0;
      let py = 0;
      let aimed = false;
      // pointer inside the stage's own box: what the wave answers to
      let hovering = false;
      let wave = 0;

      const aim = () => {
        if (!aimed) return;
        const r = host.getBoundingClientRect();
        // Hover tested against the rect rather than with mouseenter, because
        // the stage is pointer-events: none where it lies over the footer —
        // it must not eat the clicks underneath it, so it cannot be asked
        // whether it was entered. Re-tested on scroll too, for free.
        hovering = px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
        // Measured from the stage's centre, so the head still follows while
        // the pointer is over the bio beside it. Both axes divide by the same
        // reference — the shorter half-axis of the window — rather than each
        // by its own: a wide window made up and down feel dead next to left
        // and right, and the head has to answer every direction alike.
        const ref = Math.max(320, Math.min(window.innerWidth, window.innerHeight) / 2);
        const dx = ((px - (r.left + r.width / 2)) / ref) * POINTER_GAIN;
        const dy = ((py - (r.top + r.height / 2)) / ref) * POINTER_GAIN;
        want.yaw = clamp(dx, -1, 1) * YAW_RANGE;
        // +rotation.x tilts the face down, and clientY grows downward, so the
        // two agree without a sign flip
        want.pitch = clamp(dy, -1, 1) * PITCH_RANGE;
      };

      const onPointer = (e: PointerEvent) => {
        px = e.clientX;
        py = e.clientY;
        aimed = true;
        aim();
        lastMove = performance.now();
      };

      // Scroll re-aims but does not count as attention: the head follows the
      // stage moving under a still finger, and the idle timer keeps running,
      // so a long scroll hands it back to the sway on its own.
      const onScroll = aim;

      // the pointer leaving the window can leave a stale hover behind: no
      // further pointermove arrives to clear it, and the hand would wave on
      const onLeave = () => {
        hovering = false;
      };

      const t0 = performance.now();
      const frame = () => {
        const now = performance.now();
        const t = (now - t0) / 1000;
        const breathe = Math.sin(t * 1.6);

        parts.body.position.y = base.bodyY + breathe * 0.006;
        parts.body.scale.y = 1 + breathe * 0.012;

        // the cursor going still hands the head back to the idle sway —
        // unless it is resting on the avatar, which is attention either way
        const active = hovering || now - lastMove < POINTER_IDLE_MS ? 1 : 0;
        engage += (active - engage) * 0.05;
        look.yaw += (want.yaw - look.yaw) * 0.08;
        look.pitch += (want.pitch - look.pitch) * 0.08;

        const sway = Math.sin(t * 0.55) * 0.26;
        parts.head.position.y = base.headY + breathe * 0.009;
        // the sway backs off as the head engages, so the two never fight
        parts.head.rotation.y = sway * (1 - engage * 0.75) + look.yaw * engage;
        // the head tips very slightly into the turn, the way a real one does
        parts.head.rotation.z = Math.sin(t * 0.55 + 1.2) * 0.045 - look.yaw * engage * 0.1;
        parts.head.rotation.x = Math.sin(t * 0.9) * 0.02 + look.pitch * engage;
        // and it leads with the face instead of pivoting on the spine
        parts.head.position.x = look.yaw * engage * 0.03;

        // The shoulders carry a fraction of the turn. Without it the neck
        // does all the work and the far edge of the range reads as wrung;
        // with it, the whole figure is what answers the cursor.
        parts.body.rotation.y = look.yaw * engage * 0.22;
        parts.body.rotation.x = look.pitch * engage * 0.05;

        // the wave rises and falls over ~half a second either way, so a
        // cursor crossing the corner of the stage does not snap the arm up
        wave += ((hovering ? 1 : 0) - wave) * 0.12;

        // one angle for the whole limb, about the shoulder: the sleeve, the
        // cuff and the hand all take it, so the arm goes up as one thing and
        // the wave is the arm rocking rather than a hand drifting on its own
        const armAng = armSide * (WAVE_ANGLE + Math.sin(t * WAVE_SPEED) * WAVE_SWING) * wave;
        const cos = Math.cos(armAng);
        const sin = Math.sin(armAng);
        const swung = (x: number, y: number, out: THREE_T.Vector3, z: number) =>
          out.set(
            pivot.x + (x - pivot.x) * cos - (y - pivot.y) * sin,
            pivot.y + (x - pivot.x) * sin + (y - pivot.y) * cos,
            z
          );

        for (const a of arm) {
          swung(a.rest.x, a.rest.y, a.o.position, a.rest.z);
          a.o.rotation.z = a.rotZ + armAng;
        }

        parts.hands.children.forEach((h, i) => {
          const s = i === 0 ? -1 : 1;
          const rest = base.hands[i];
          const bob = Math.sin(t * 1.6 + i * 0.7) * 0.012;
          const roll = Math.sin(t * 1.1 + i) * 0.12 * s;
          if (i === waveIdx) {
            // the idle bob fades out as the arm lifts, so the two never add
            // up into a jitter at the top of the arc
            swung(rest.x, rest.y + bob * (1 - wave), h.position, rest.z);
            h.rotation.z = roll * (1 - wave) + armAng;
          } else {
            h.position.set(rest.x, rest.y + bob, rest.z);
            h.rotation.z = roll;
          }
        });

        renderer.render(scene, camera);
      };

      // ---- what runs, and when ----

      // Three things have to agree before a frame is worth drawing: the
      // canvas is on screen, the tab is in front, and the reader hasn't asked
      // for less motion. Each listener flips its own flag and re-decides —
      // otherwise a tab regaining focus would start an off-screen canvas.
      let onScreen = false;
      let running = false;
      const sync = () => {
        const should = onScreen && !document.hidden && !reduced.matches;
        if (should === running) return;
        running = should;
        renderer.setAnimationLoop(should ? frame : null);
      };
      const stop = () => {
        running = false;
        renderer.setAnimationLoop(null);
      };

      // reduced motion: one frame, at the pose the idle starts from. Still
      // three-dimensional, still lit — it simply doesn't move.
      renderer.render(scene, camera);
      host.dataset.ready = "true";

      // don't render a canvas nobody is looking at
      const io = new IntersectionObserver(
        ([entry]) => {
          onScreen = entry.isIntersecting;
          sync();
        },
        { rootMargin: "120px" }
      );
      io.observe(host);

      const onVisibility = sync;
      const onReducedChange = sync;
      const ro = new ResizeObserver(() => {
        fit();
        if (!running) renderer.render(scene, camera); // keep the still frame sharp
      });
      ro.observe(host);

      // Every pointer, not just a mouse. A touch only reports while the finger
      // is down, so pointerdown is what makes a tap land — and gating any of
      // this on (pointer: coarse) is what left the follow dead in a phone-sized
      // viewport, including a desktop browser's device emulation.
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("pointerdown", onPointer, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });
      document.addEventListener("pointerleave", onLeave);
      document.addEventListener("visibilitychange", onVisibility);
      reduced.addEventListener("change", onReducedChange);

      teardown = () => {
        stop();
        io.disconnect();
        ro.disconnect();
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("pointerdown", onPointer);
        window.removeEventListener("scroll", onScroll);
        document.removeEventListener("pointerleave", onLeave);
        document.removeEventListener("visibilitychange", onVisibility);
        reduced.removeEventListener("change", onReducedChange);
        scene.remove(avatar);
        scene.remove(ground);
        ground.geometry.dispose();
        (ground.material as THREE_T.Material).dispose();
        disposeAvatar(avatar);
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  return <div ref={hostRef} className="avatar-stage" role="img" aria-label={label} />;
}
