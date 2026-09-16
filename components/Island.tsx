"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type * as THREE_T from "three";
import type { FocusKey, LandmarkKey } from "@/components/island/landmarks";

// The About page. The island is the page — the places the bio is about,
// modelled and put on one rock, with the figure standing on the seam path
// between the two halves of it. It is a map you walk into rather than a scene
// you watch: the camera drifts around the island until you pick something,
// then flies to the shot that thing was placed for and holds there.
//
// The description is the figure's caption — and so are the photograph and the
// contacts, which is why all three are on screen together or not at all. It is
// also the caption's resting state: the page opens on the whole island with
// the three of them beside it, which is what makes them server-rendered and
// readable before three.js has landed, or without it. Picking a place lends
// the caption out; `back`, Escape, or a click on open water returns it.
//
// Where the work is split: components/island/* owns the artwork and, for each
// of the nine things on it, the camera solve that frames it (focus point,
// direction, range). This file owns nothing about how the island looks — only
// the renderer, the camera's journey between those solves, and the column of
// words beside it. The photo and the contacts arrive already rendered, as
// props, so the page keeps them on the server.
//
// three.js is imported lazily inside the effect: it is ~150KB, and this is the
// one route that pays for it.

// Framing. A long-ish lens, so the island reads as a model on a table rather
// than a world you are standing in.
const FOV = 38;
// How high the camera stands at the wide shot, in radians above the horizon.
// 0.52 is about 30°: high enough to see both halves of the island at once,
// shallow enough that the props keep their elevation instead of flattening
// into a floor plan. The azimuth is not fixed here — it is what the drift
// turns, and what a drag turns faster.
const OVERVIEW_EL = 0.52;
// How far up and down a drag may take it. Below the first it slips under the
// water and looks at the rock's underside; above the second it is straight
// overhead and the island reads as a floor plan.
const EL_MIN = 0.16;
const EL_MAX = 1.3;
// A drag the height of the stage turns the island a full circle. Height for
// both axes, and that is what three's own OrbitControls uses — so the island
// turns at the rate a hand that has touched any other 3D thing expects.
const TURN_PER_HEIGHT = Math.PI * 2;
// pointer travel, in px, past which a press was a turn and not a pick
const DRAG_SLOP = 6;
// Air around the island at the widest shot — under 1 crops it. Pulled in well
// past the zero-clip point (1.06) for a tighter, more "held in the hand" shot;
// the tallest points (a spire tip, a frond) now graze the frame at the widest
// angles of the idle turn rather than sitting well inside it.
const OVERVIEW_MARGIN = 0.8;
// Everything below this is the rock tapering to its point — the island's root,
// not part of the picture. Excluding it from the fit is what stops the widest
// shot from framing three metres of empty cone.
const CLIP_BELOW = -0.95;
// How fast the idle drift turns, in radians per second. Slow: a full turn
// takes about two and a half minutes, so it reads as the island breathing
// rather than as a carousel.
const DRIFT_SPEED = 0.042;

// half the vertical field as a tangent — both halves of the fit solve are
// built from this one number
const HALF_FOV_TAN = Math.tan((FOV * Math.PI) / 360);

// How much of the gap to the wanted camera position each frame closes. 0.055
// lands a landmark in a little under a second and, more to the point, arrives
// slowly: the last tenth of the move is where the shot settles.
const EASE = 0.055;
// Except under a finger. A travelling shot wants to arrive gently; a hand
// turning something wants it to move now, and 0.055 under a drag feels like
// the island is being pulled through treacle.
const DRAG_EASE = 0.38;

// How far a landmark rises when the pointer is on it, in model units. Small on
// purpose: it answers the cursor without becoming a jumping thing.
const LIFT = 0.055;

// The figure's key. Repeated here rather than imported, because importing it
// from components/island would pull three.js into this file's own chunk and
// undo the lazy loading below — it is a string literal either way, and the
// `satisfies` on ORDER is what keeps the two spellings honest.
const ME = "me";

// The order the nine are listed in beside the island. The figure first — it is
// who the page is about — then west to east across the rock: the shore side,
// then the city side.
const ORDER = [
  ME, "bahay-kubo", "shore", "sari-sari", "easel", "graves", "duomo", "tram", "studio",
] as const satisfies readonly FocusKey[];

// `satisfies` above catches a key in this list the island does not have. This
// catches the other direction — a landmark added to the island and not to the
// list would otherwise render an island nobody can reach by keyboard.
type Assert<T extends never> = T;
type _EverythingIsListed = Assert<Exclude<FocusKey, (typeof ORDER)[number]>>;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export type Place = { title: string; body: string };

export default function Island({
  label,
  hint,
  turn,
  back,
  places,
  name,
  meLabel,
  bio,
  photo,
  contacts,
}: {
  label: string;
  hint: string;
  /** the line over the island itself, until someone has turned it */
  turn: string;
  back: string;
  places: Record<LandmarkKey, Place>;
  /** whose island it is — the caption's title when the bio is showing */
  name: string;
  /** what the figure is called in the list of places */
  meLabel: string;
  /** the description, already Markdown-rendered to inline HTML per paragraph */
  bio: string[];
  /** shown with the description, above it and below it: both belong to the
      figure, and are on screen only while the caption is its. */
  photo: ReactNode;
  contacts: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  // React owns what is chosen — the canvas only ever asks for a change, and
  // hears about it again through the effect below. One owner, so the caption
  // and the camera can never disagree. null is the island entire, with the
  // description beside it.
  const [selected, setSelected] = useState<FocusKey | null>(null);
  // false once a renderer fails to come up: the stage box goes, everything
  // else stays. The words are the page; the island is how they are told.
  const [webgl, setWebgl] = useState(true);
  // how the effect below is asked to move the camera, once it exists
  const focusRef = useRef<((key: FocusKey | null) => void) | null>(null);
  // and what it should already be showing when it arrives: three.js takes a
  // moment to download, and a place picked from the list in that moment has to
  // still be the shot the island opens on
  const selectedRef = useRef<FocusKey | null>(null);
  // true once the island has been turned by hand. All it does is retire the
  // line telling you that you can: an instruction that stays after it has been
  // followed is just furniture.
  const [turned, setTurned] = useState(false);
  const hintId = useId();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let teardown: (() => void) | null = null;

    (async () => {
      const [THREE, { buildIsland }] = await Promise.all([
        import("three"),
        import("@/components/island/buildIsland"),
      ]);
      if (cancelled) return;

      // Same context handshake as Avatar.tsx: ask for webgl2 on our own canvas
      // first, so a machine without it answers with a null we can read quietly
      // instead of three.js console-erroring the driver's reason.
      const attrs = { antialias: true, alpha: true };
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2", attrs);

      let renderer: THREE_T.WebGLRenderer;
      try {
        if (!gl) throw new Error("no WebGL2 context");
        const context = gl as unknown as WebGLRenderingContext;
        renderer = new THREE.WebGLRenderer({ ...attrs, canvas, context });
      } catch {
        setWebgl(false);
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.appendChild(renderer.domElement);

      // alpha, no background: the page's paper is the sea and the sky both,
      // and the island sits ON the page the way the figure in the corner does
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

      // The same studio rig the avatar is lit by — it stands in this scene
      // too, and two lightings of one model on one page would read as a seam.
      scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.0));
      const key = new THREE.DirectionalLight(0xffffff, 2.2);
      key.position.set(4, 7, 5);
      key.castShadow = true;
      // 2048 here where the avatar uses 1024: this box is four times as wide
      // and the shadows have to survive being cast across the whole island —
      // the spires' onto the cobbles, the palm's onto the sand
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.bias = -0.0004;
      key.shadow.camera.near = 1;
      key.shadow.camera.far = 24;
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xfff4e6, 0.5);
      fill.position.set(-5, 3, -4);
      scene.add(fill);

      const { island, landmarks, parts, disposeIsland } = buildIsland();
      scene.add(island);

      // the shadow frustum, sized to what it has to cover rather than guessed
      const box = new THREE.Box3().setFromObject(island);
      const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2 + 0.5;
      key.shadow.camera.left = -span;
      key.shadow.camera.right = span;
      key.shadow.camera.top = span;
      key.shadow.camera.bottom = -span;
      key.shadow.camera.updateProjectionMatrix();

      // What the widest shot has to cover, with the submerged taper cut off.
      // Width is the larger of the two ground extents and NOT their diagonal:
      // the island is a disc, and a disc presents the same diameter from every
      // azimuth the drift can bring the camera to.
      // Measure the island rather than take its bounding box's word for it.
      // The box's centre is not the island's — the water shelf only hugs the
      // west rim, so the box hangs off to one side — and half the box's width
      // is not the radius about that centre either. Both matter: the fit below
      // is a radius about a centre, and 4% out in either is a cropped rim.
      //
      // Two passes over the vertices, once, at mount. Everything below
      // CLIP_BELOW is skipped throughout: that is the rock tapering to its
      // point, and it is allowed out of frame.
      const v = new THREE.Vector3();
      const eachVertex = (fn: (p: THREE_T.Vector3) => void) => {
        island.traverse((o) => {
          const m = o as THREE_T.Mesh;
          if (!m.isMesh) return;
          const attr = m.geometry.attributes.position;
          for (let i = 0; i < attr.count; i++) {
            v.fromBufferAttribute(attr, i).applyMatrix4(m.matrixWorld);
            if (v.y >= CLIP_BELOW) fn(v);
          }
        });
      };

      island.updateMatrixWorld(true);
      const extent = new THREE.Box3().makeEmpty();
      eachVertex((p) => extent.expandByPoint(p));
      const homeTarget = extent.getCenter(new THREE.Vector3());
      const halfH = (extent.max.y - extent.min.y) / 2;
      let halfW = 0;
      eachVertex((p) => {
        halfW = Math.max(halfW, Math.hypot(p.x - homeTarget.x, p.z - homeTarget.z));
      });
      // The widest shot, solved rather than approximated.
      //
      // A flat solve — half-height over the tangent, half-width over the
      // tangent and the aspect — is wrong here, and wrong by a lot. Two
      // reasons. The island is a disc, so seen from above it presents its own
      // radius down the screen rather than its height. And perspective: the
      // rim nearest the camera is a third closer than the island's centre and
      // projects far larger than any flat estimate predicts. Solved flat, the
      // island is cropped top and bottom at every stage wider than about 4:3,
      // and at every stage once the tilt can be dragged.
      //
      // So it is solved against a shape instead: the smallest cylinder holding
      // the island, sampled as points. For a camera at pivot + d·u the depth of
      // a point is (d - q·u) while its height and width on screen do not depend
      // on d at all — so each point states a minimum d outright, and the
      // largest of those minima frames every one of them. Exact, one pass, no
      // iteration, and it answers for any direction the drag can reach.
      const HULL_STEPS = 32;
      const hull: THREE_T.Vector3[] = [];
      for (let i = 0; i < HULL_STEPS; i++) {
        const a = (i / HULL_STEPS) * Math.PI * 2;
        for (const h of [-halfH, halfH]) {
          hull.push(new THREE.Vector3(Math.cos(a) * halfW, h, Math.sin(a) * halfW));
        }
      }

      const WORLD_UP = new THREE.Vector3(0, 1, 0);
      const camRight = new THREE.Vector3();
      const camUp = new THREE.Vector3();

      const homeDist = (a: number, dir: THREE_T.Vector3) => {
        // the frame's own axes for this direction, as three's lookAt builds them
        camRight.crossVectors(WORLD_UP, dir).normalize();
        camUp.crossVectors(dir, camRight);
        let d = 0;
        for (const q of hull) {
          const along = q.dot(dir);
          const up = Math.abs(q.dot(camUp)) / HALF_FOV_TAN;
          const across = Math.abs(q.dot(camRight)) / (HALF_FOV_TAN * a);
          d = Math.max(d, along + Math.max(up, across));
        }
        return d * OVERVIEW_MARGIN;
      };

      // the camera's actual position and aim, and where they are headed. The
      // gap between the two pairs is what closes a fraction per frame.
      const pos = new THREE.Vector3();
      const target = homeTarget.clone();
      const wantPos = new THREE.Vector3();
      const wantTarget = homeTarget.clone();

      // The orbit, and the whole of the camera's freedom: what it is circling,
      // how far out, and where on that circle it stands. One set of numbers for
      // both the wide shot and a landmark — which is what lets a drag turn the
      // island either way round, rather than only when nothing is chosen.
      const pivot = homeTarget.clone();
      let range = 0;
      // Azimuth: a little off +z puts the sand on the left and the cobbles on
      // the right, so the island's two halves are both in the first frame.
      let az = Math.PI * 0.42;
      let el = OVERVIEW_EL;
      let aspect = 1;

      // Where the camera stands, for the orbit it is on. At the wide shot the
      // range is re-solved here rather than stored, because tilting changes
      // what the frame has to hold: drag the camera up and it pulls back, so
      // the island stays whole at every angle. On a landmark the range is that
      // landmark's own — those shots were composed, not solved.
      const dir = new THREE.Vector3();
      const station = (out: THREE_T.Vector3) => {
        dir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
        if (!current) range = homeDist(aspect, dir);
        return out.copy(dir).multiplyScalar(range).add(pivot);
      };

      let current: FocusKey | null = null;

      const aimAt = (k: FocusKey | null) => {
        current = k;
        const lm = k ? landmarks.find((l) => l.key === k) : null;
        if (lm) {
          // the placement's direction, read back as an orbit the drag can move
          az = Math.atan2(lm.offsetDir.z, lm.offsetDir.x);
          el = Math.asin(clamp(lm.offsetDir.y, -1, 1));
          pivot.copy(lm.focus);
          range = lm.dist;
        } else {
          // az and el are left exactly as they are: coming back from a landmark
          // pulls straight out to the wide shot from the angle you were already
          // looking at it from, rather than swinging round to one nothing asked
          // for. Only what the camera circles, and how far out, change.
          pivot.copy(homeTarget);
        }
        wantTarget.copy(pivot);
        station(wantPos);
      };

      // start at the wide shot, already there — no opening fly-in, the island
      // is simply where the page begins
      station(pos);
      station(wantPos);

      const fit = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        aspect = w / h;
        renderer.setSize(w, h, false);
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        // the wide shot is solved against the box it has to fill, so a resize
        // or a rotation reframes rather than crops
        if (!current) station(wantPos);
      };
      fit();

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

      // ---- pointer: what is under it, and what a click means ----

      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      const pickable = landmarks.map((l) => l.group);
      let hovered: FocusKey | null = null;
      // where the pointer last was, and whether it is over the island at all
      let ptrX = 0;
      let ptrY = 0;
      let ptrIn = false;

      // the landmark under a point on the canvas, or null. Hits arrive as the
      // individual mesh; the key lives on the group it belongs to, so this
      // walks up until it finds one.
      const at = (x: number, y: number): FocusKey | null => {
        const r = host.getBoundingClientRect();
        ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObjects(pickable, true)[0];
        let o: THREE_T.Object3D | null = hit ? hit.object : null;
        while (o && !o.userData.key) o = o.parent;
        return o ? (o.userData.key as FocusKey) : null;
      };

      // what the cursor is over, and the cursor that says so — grab over open
      // water, because that is the only thing announcing that the island turns
      const pick = () => {
        hovered = at(ptrX, ptrY);
        host.style.cursor = dragging ? "grabbing" : hovered ? "pointer" : "grab";
      };

      // the turn in progress: which pointer owns it, where it last was, and how
      // far it has travelled since it went down
      let dragging = false;
      let dragId = -1;
      let lastX = 0;
      let lastY = 0;
      let travelled = 0;
      // so the "drag to turn" line is retired once, and not on every frame of
      // every drag after it
      let announced = false;

      const onDown = (e: PointerEvent) => {
        if (e.button !== 0) return; // the primary button only; right-click is the browser's
        dragging = true;
        dragId = e.pointerId;
        lastX = e.clientX;
        lastY = e.clientY;
        travelled = 0;
        // so the turn survives the pointer leaving the canvas mid-drag
        host.setPointerCapture(e.pointerId);
        host.style.cursor = "grabbing";
      };

      // A pointermove records where the pointer is, and turns the island if it
      // is being dragged. The ray, though, is cast once per frame instead
      // (below). Two reasons, and the second is the real one: a mouse reports
      // far more often than the screen redraws, and the island keeps moving
      // under a pointer that has stopped — an answer from the last move would
      // be an answer about a frame that is no longer on screen, and the lifted
      // landmark would stay lifted after sliding out from under the cursor.
      const onMove = (e: PointerEvent) => {
        ptrX = e.clientX;
        ptrY = e.clientY;
        ptrIn = true;

        if (dragging && e.pointerId === dragId) {
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX;
          lastY = e.clientY;
          travelled += Math.abs(dx) + Math.abs(dy);
          const h = host.clientHeight || 1;
          // no wrapping and no clamp on the azimuth: it is an angle, it may go
          // round as many times as the hand cares to take it
          az -= (dx / h) * TURN_PER_HEIGHT;
          el = clamp(el - (dy / h) * TURN_PER_HEIGHT, EL_MIN, EL_MAX);
          station(wantPos);

          // Past the slop, and only past it: the press was a turn rather than
          // a click, and THAT is when the island stops turning by itself — for
          // good, because a drift that resumed would slowly carry off whatever
          // the reader had just turned it round to look at.
          //
          // Before the slop it must not, and this is the whole reason the test
          // is here rather than above: every click carries a pixel or two of
          // wobble between press and release, so stopping the drift on the
          // first movement of any press meant a single click anywhere on the
          // island retired the drift for the rest of the visit.
          if (travelled > DRAG_SLOP) {
            drifting = false;
            if (!announced) {
              announced = true;
              setTurned(true);
            }
          }
        }

        // nothing is drawing frames to defer to: reduced motion, or the island
        // scrolled out of view while still under the pointer
        if (!running) {
          pick();
          still();
        }
      };

      const endDrag = (e: PointerEvent) => {
        if (!dragging || e.pointerId !== dragId) return;
        dragging = false;
        if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
        host.style.cursor = hovered ? "pointer" : "grab";
      };

      const onLeave = () => {
        ptrIn = false;
        hovered = null;
        host.style.cursor = "";
      };

      // A click on the water is how you put a landmark back down — the same
      // gesture as the caption's own way out, without having to aim for it.
      // Unless the press travelled first, in which case it was a turn: a
      // pointerup after a drag still arrives here as a click, and a reader who
      // has just spun the island round does not expect to have deselected
      // something by doing it.
      const onClick = (e: MouseEvent) => {
        if (travelled > DRAG_SLOP) return;
        setSelected(at(e.clientX, e.clientY));
      };

      // ---- the frame ----

      const t0 = performance.now();
      let last = t0;
      // true until the island is first taken hold of. The drift is how it
      // shows itself to someone who has not touched it; after that the angle
      // is the reader's, and nothing takes it back off them.
      let drifting = true;
      const base = parts ? { bodyY: parts.body.position.y, headY: parts.head.position.y } : null;

      const frame = () => {
        const now = performance.now();
        // a tab that was in the background must not lurch when it comes back
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        const t = (now - t0) / 1000;

        if (!current && drifting) {
          az += dt * DRIFT_SPEED;
          station(wantPos);
        }

        // a turn has to answer the hand; a travelling shot may take its time
        const ease = dragging ? DRAG_EASE : EASE;
        pos.lerp(wantPos, ease);
        target.lerp(wantTarget, ease);
        camera.position.copy(pos);
        camera.lookAt(target);

        // after the camera has moved, not before: the ray has to be cast
        // through the frame the reader is about to see
        if (ptrIn) pick();

        // the landmark under the cursor rises, and so does the chosen one —
        // so the thing the caption is about stays picked out while you read it
        for (const lm of landmarks) {
          const up = lm.key === hovered || lm.key === current ? LIFT : 0;
          lm.group.position.y += (lm.restY + up - lm.group.position.y) * 0.16;
        }

        // The figure on the seam path is the same model as the one in the
        // corner, and it breathes here too: it is what gives the island its
        // scale, and a still figure at this size reads as a statue.
        if (parts && base) {
          const breathe = Math.sin(t * 1.6);
          parts.body.position.y = base.bodyY + breathe * 0.006;
          parts.body.scale.y = 1 + breathe * 0.012;
          parts.head.position.y = base.headY + breathe * 0.009;
          parts.head.rotation.y = Math.sin(t * 0.55) * 0.26;
          parts.head.rotation.z = Math.sin(t * 0.55 + 1.2) * 0.045;
        }

        renderer.render(scene, camera);
      };

      // ---- what runs, and when ----

      // One frame, with the camera put where it is going rather than eased —
      // what a paused island draws. Reduced motion is the interesting caller:
      // the island stays usable there, it simply arrives at a landmark instead
      // of travelling to it.
      const still = () => {
        pos.copy(wantPos);
        target.copy(wantTarget);
        camera.position.copy(pos);
        camera.lookAt(target);
        for (const lm of landmarks) {
          lm.group.position.y = lm.restY + (lm.key === current ? LIFT : 0);
        }
        renderer.render(scene, camera);
      };

      // The same three conditions the avatar draws under: on screen, tab in
      // front, motion not refused. Each listener flips its own flag and
      // re-decides, so a tab regaining focus cannot start an off-screen canvas.
      let onScreen = false;
      let running = false;
      const sync = () => {
        const should = onScreen && !document.hidden && !reduced.matches;
        if (should === running) return;
        running = should;
        last = performance.now();
        renderer.setAnimationLoop(should ? frame : null);
        if (!should) still();
      };

      // what the caption and the list of places drive
      focusRef.current = (k) => {
        aimAt(k);
        if (!running) still();
      };

      // A place chosen from the list while three.js was still downloading has
      // already been and gone as far as React is concerned — the effect that
      // pushes a choice to the camera ran before there was a camera. So the
      // camera opens on whatever is chosen now, rather than on the wide shot
      // with a caption beside it describing somewhere else.
      if (selectedRef.current) aimAt(selectedRef.current);
      still();
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

      const ro = new ResizeObserver(() => {
        fit();
        if (!running) still();
      });
      ro.observe(host);

      const onVisibility = sync;
      const onReducedChange = sync;
      // on the host rather than on the window: this canvas is a control, and
      // the only pointer it answers to is one that is actually over it.
      // pointercancel matters as much as pointerup here — on a phone the
      // stylesheet gives vertical swipes back to the page (touch-action:
      // pan-y), and the browser takes the pointer away mid-gesture to scroll
      // with it. Without this the island would stay stuck to a finger that is
      // no longer turning it.
      host.addEventListener("pointerdown", onDown);
      host.addEventListener("pointermove", onMove);
      host.addEventListener("pointerup", endDrag);
      host.addEventListener("pointercancel", endDrag);
      host.addEventListener("pointerleave", onLeave);
      host.addEventListener("click", onClick);
      document.addEventListener("visibilitychange", onVisibility);
      reduced.addEventListener("change", onReducedChange);

      teardown = () => {
        running = false;
        renderer.setAnimationLoop(null);
        focusRef.current = null;
        io.disconnect();
        ro.disconnect();
        host.removeEventListener("pointerdown", onDown);
        host.removeEventListener("pointermove", onMove);
        host.removeEventListener("pointerup", endDrag);
        host.removeEventListener("pointercancel", endDrag);
        host.removeEventListener("pointerleave", onLeave);
        host.removeEventListener("click", onClick);
        document.removeEventListener("visibilitychange", onVisibility);
        reduced.removeEventListener("change", onReducedChange);
        scene.remove(island);
        disposeIsland();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  // The one place the canvas hears about a choice, whoever made it — a click
  // on the island, a button in the list, or Escape. The ref alongside is for
  // the camera that does not exist yet; the effect above reads it on arrival.
  useEffect(() => {
    selectedRef.current = selected;
    focusRef.current?.(selected);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // What the caption is holding. A landmark lends it out; the figure and the
  // wide island both give it back to the description, because the description
  // is what the figure has to say.
  const place = selected && selected !== ME ? places[selected] : null;

  return (
    <section className="island" aria-label={label} data-webgl={webgl ? undefined : "off"}>
      <div ref={hostRef} className="island-stage">
        {/* Inside the stage, over the island's bottom-left corner. three.js
            appends its canvas after this, and a positioned box paints over a
            static one regardless of source order, so the line stays legible
            without a z-index. It is a React child and the canvas is not, which
            is safe only because this never moves or unmounts. */}
        <p className="island-turn" data-turned={turned ? "" : undefined}>
          {turn}
        </p>
      </div>

      {/* The caption is the only thing that says what you are looking at, so
          it is a live region: choosing a place with the mouse has to reach a
          screen reader too, and the buttons below only announce themselves.

          The photograph and the contacts live in here, in the figure's half of
          it — they are the figure's, not the column's. A landmark borrows the
          caption and they go with it; coming back brings all three at once. */}
      <div className="island-caption" aria-live="polite">
        {place ? (
          <>
            <p className="island-caption-t">{place.title}</p>
            <p className="island-caption-b">{place.body}</p>
          </>
        ) : (
          <>
            {photo}
            <p className="island-caption-t">{name}</p>
            {bio.map((html, i) => (
              // inline HTML, so a link or an emphasis written in Markdown
              // survives from content/<locale>/about.md to here
              <p key={i} className="island-bio" dangerouslySetInnerHTML={{ __html: html }} />
            ))}
            {contacts}
          </>
        )}

        {/* Only once the caption is somewhere else: at rest there is nothing
            to come back from, and a dead control would say otherwise. */}
        {selected && (
          <button type="button" className="island-back" onClick={() => setSelected(null)}>
            {back}
          </button>
        )}
      </div>

      {/* The same nine places as words. A canvas cannot be tabbed into and a
          palm tree on a phone is a hard thing to hit, so this is the island for
          everyone the pointer does not serve — and it is what carries the
          places when there is no WebGL to draw them. */}
      <div className="island-index">
        <p className="island-hint" id={hintId}>
          {hint}
        </p>
        <ul className="island-places" aria-labelledby={hintId}>
          {ORDER.map((k) => (
            <li key={k}>
              <button
                type="button"
                className="island-place"
                aria-pressed={selected === k}
                onClick={() => setSelected(selected === k ? null : k)}
              >
                {k === ME ? meLabel : places[k].title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
