"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { SketchPage, SketchVolume } from "@/content/content";

/** every accessible name and heading the book needs, in the page's language */
export type SketchbookLabels = {
  previous: string;
  next: string;
  loading: string;
  /** the index's heading, and its accessible name */
  index: string;
  indexLabel: string;
};

// Sketchbook page-turn: each PNG is one full spread. Turning forward folds
// the right half over the center spine (3D rotateY); its back face reveals
// the left half of the next spread, while the next spread's right half sits
// beneath. Turning back mirrors the fold from the left. It loops at either
// end. Flips are interruptible — a tap mid-turn finalizes the current fold
// and immediately starts the next, so every tap registers.
type Flip = {
  id: number;
  dir: "next" | "prev";
  from: number;
  to: number;
  dur?: number; // riffle only: seconds for this turn
  bell?: number; // riffle only: 0..1 speed curve (drives the motion blur tier)
};

// how long the opening waits for EVERY spread before giving up on the riffle
// and resting on the home spread alone (a slow link would otherwise riffle
// through pages that haven't arrived yet)
const PATIENCE = 8000;

function Half({
  page,
  side,
  q,
  sync,
}: {
  page: SketchPage;
  side: "left" | "right";
  q?: number;
  sync?: boolean;
}) {
  return (
    <Image
      src={page.src}
      alt=""
      width={page.w}
      height={page.h}
      sizes="(max-width: 920px) 94vw, 860px"
      quality={q}
      // mobile: paint in the same frame as mount/src-swap (the bitmaps are
      // pre-decoded, so this never actually blocks)
      decoding={sync ? "sync" : undefined}
      draggable={false}
      className={`sb-half-img ${side}`}
    />
  );
}

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg viewBox="0 0 14 44" width="14" height="44" fill="none" aria-hidden>
    <polyline
      points={dir === "left" ? "11,3 3,22 11,41" : "3,3 11,22 3,41"}
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Sketchbook({
  volumes,
  vol,
  onVol,
  labels,
}: {
  /** every sketchbook, for the index; `vol` is the one on the table */
  volumes: SketchVolume[];
  vol: number;
  onVol: (vol: number) => void;
  labels: SketchbookLabels;
}) {
  const pages = volumes[vol].pages;
  const len = pages.length;

  // opening sequence: riffle fast through the whole book, beginning at the
  // spread flagged `start` and landing on the one flagged `home` in
  // content.ts (the first spread if either isn't flagged)
  const start = Math.max(
    pages.findIndex((p) => p.start),
    0
  );
  const home = Math.max(
    pages.findIndex((p) => p.home),
    0
  );

  const [current, setCurrent] = useState(start);
  const [flip, setFlip] = useState<Flip | null>(null);
  const idRef = useRef(0);
  const [intro, setIntro] = useState(false);
  const introRef = useRef(false);
  // true until the spreads have arrived: a spinner stands in for the book.
  // Starts true so the spinner is already in the server-rendered HTML.
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(true);
  const loaded = () => {
    loadingRef.current = false;
    setLoading(false);
  };

  // ---- separate mobile path (desktop renders exactly as before) ----
  // On phones: half-quality image variants (much smaller files), a
  // persistent copy of the current spread UNDER the flip layers (a remount
  // paint-gap can then never flash bare background), and a two-phase commit
  // so the end of a turn never clips. `ready` gates the preloads until the
  // device is known, so only ONE set of variants is ever fetched.
  const [mobile, setMobile] = useState(false);
  const mobileRef = useRef(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const m = matchMedia("(max-width: 640px), (pointer: coarse)").matches;
    mobileRef.current = m;
    setMobile(m);
    setReady(true);
  }, []);
  const q = mobile ? 50 : undefined; // next/image default (75) on desktop

  // riffle sequence: one full loop around the book from `start` back to
  // `start`, plus the run-in to the home spread, easing in, whirring through
  // the middle, easing out to land
  const seqRef = useRef<{ from: number; to: number; dur: number; bell: number }[]>([]);
  const seqIdx = useRef(0);
  const buildSeq = () => {
    const runIn = (home - start + len) % len; // extra steps past the full loop to reach home
    const total = len + runIn; // start → … → start (full loop) → … → home
    return Array.from({ length: total }, (_, s) => {
      const t = total <= 1 ? 1 : s / (total - 1);
      const bell = Math.sin(Math.PI * t); // 0 at the ends, 1 in the middle
      return {
        from: (start + s) % len,
        to: (start + s + 1) % len,
        dur: 0.2 - 0.15 * bell,
        bell,
      };
    });
  };

  // the DOM preload stack (below) mounts every spread once `ready` fixes the
  // quality tier. Decode them all (a spinner holds the book's place
  // meanwhile), then run the opening riffle. If they haven't all arrived
  // within PATIENCE, skip the riffle and rest on the home spread as soon as
  // that one is in.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    let t: ReturnType<typeof setTimeout>;
    const go = () => {
      if (cancelled) return;
      // The riffle replays on every arrival at the home page, phones included:
      // on mobile every spread is already mounted and decoded, so no turn ever
      // waits on a fetch.
      introRef.current = true;
      setIntro(true);
      seqRef.current = buildSeq();
      seqIdx.current = 0;
      idRef.current += 1;
      setFlip({ id: idRef.current, dir: "next", ...seqRef.current[0] });
    };
    // decode() settles once the image has both arrived and decoded
    const decode = (im?: HTMLImageElement) => im?.decode?.().catch(() => {});
    // let the freshly-mounted preloads issue their requests first
    const kick = setTimeout(() => {
      // same order as `pages` in both the desktop preload and the mobile stack
      const imgs = [
        ...document.querySelectorAll<HTMLImageElement>(".sb-preload img, .sb-stack img"),
      ];
      Promise.race([
        Promise.allSettled(imgs.map(decode)).then(() => true),
        new Promise<boolean>((r) => (t = setTimeout(() => r(false), PATIENCE))),
      ]).then(async (all) => {
        // Reduced-motion users open on the resting spread too.
        if (!all || matchMedia("(prefers-reduced-motion: reduce)").matches) {
          if (!all) await decode(imgs[home]);
          if (cancelled) return;
          setCurrent(home);
          loaded();
          return;
        }
        if (cancelled) return;
        loaded();
        t = setTimeout(go, 200);
      });
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(t);
      clearTimeout(kick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const step = (dir: "next" | "prev") => {
    // navigation is disabled while the opening riffle plays (see the buttons'
    // `disabled` below, which covers pointer input; this covers the keyboard
    // path, which bypasses that attribute entirely)
    if (introRef.current || loadingRef.current) return;
    // if a fold is already running, snap it done and turn from where it landed
    const base = flip ? flip.to : current;
    if (flip) setCurrent(flip.to);
    const to = dir === "next" ? (base + 1) % len : (base - 1 + len) % len;
    idRef.current += 1;
    setFlip({ id: idRef.current, dir, from: base, to });
  };
  const next = () => step("next");
  const prev = () => step("prev");

  // arrow keys page the book from anywhere (skip while typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      step(e.key === "ArrowRight" ? "next" : "prev");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const label = pages[flip ? flip.to : current].title;

  // motion-blur tier for the current riffle turn (maps to an SVG h-blur)
  const bell = intro && flip ? flip.bell ?? 0 : 0;
  const blurTier = bell > 0.6 ? " b2" : bell > 0.25 ? " b1" : "";

  return (
    <div
      className={`sb-wrap${loading ? " loading" : ""}${intro ? ` intro${blurTier}` : ""}`}
      style={
        intro && flip
          ? ({ "--riffle-dur": `${flip.dur ?? 0.16}s` } as React.CSSProperties)
          : undefined
      }
    >
      {/* horizontal-only gaussians = directional motion blur for the riffle */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <filter id="sb-mblur-1">
          <feGaussianBlur stdDeviation="5 0" />
        </filter>
        <filter id="sb-mblur-2">
          <feGaussianBlur stdDeviation="14 0" />
        </filter>
      </svg>
      {/* the index: one line per sketchbook, the open one marked. It hangs in
          the viewport's left margin (wide screens only), outside the hero's
          centred column, so the book never moves to make room. */}
      <nav className="sb-index" aria-label={labels.indexLabel}>
        <p className="jr-index-h">{labels.index}</p>
        <ul className="jr-index-list sb-index-list">
          {volumes.map((v, vi) => (
            <li key={v.id}>
              <button
                className="jr-index-item sb-index-item"
                data-here={vi === vol || undefined}
                aria-current={vi === vol ? "true" : undefined}
                onClick={() => onVol(vi)}
              >
                <span className="jr-index-dot" aria-hidden="true" />
                <span className="jr-index-lead">{v.label}</span>
                <span className="jr-index-when">{v.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="sb-stage">
        <button
          className="sb-arrow left"
          onClick={prev}
          disabled={intro || loading}
          aria-label={labels.previous}
        >
          <Chevron dir="left" />
        </button>

        <div className="sb-book" style={{ aspectRatio: `${pages[0].w} / ${pages[0].h}` }}>
          {/* a little open book that pencils itself in, rubs out, and redraws.
              pathLength=1 lets one dash animation drive every stroke. */}
          {loading && (
            <div className="sb-loader" role="status" aria-label={labels.loading}>
              <svg viewBox="0 0 64 48" fill="none" aria-hidden>
                <path pathLength={1} d="M32 13 C26 8.5 15 8 6 11.5 L6.5 38 C15 35 26 35.5 32 40" />
                <path pathLength={1} d="M32 13 C38 8.5 49 8 58 11.5 L57.5 38 C49 35 38 35.5 32 40" />
                <path pathLength={1} d="M32 13 L32.3 40" />
                <path pathLength={1} d="M12 19 C17 17.5 22 17.5 27 19.5" />
                <path pathLength={1} d="M12.5 25 C17 23.5 21 23.5 25 25" />
                <path pathLength={1} d="M38 24 C40 18 44 17 46 21 C48 25 51 24 52.5 19.5" />
              </svg>
            </div>
          )}
          {/* mobile: ALL spreads stay mounted, decoded and stacked under the
              flip layers; the current one is shown with a visibility toggle.
              No src swap ever happens, so no frame can paint a stale bitmap
              (Safari lags async on srcset swaps even with decoding=sync).
              Desktop renders exactly as it always did: one spread, idle only. */}
          {mobile ? (
            <div className="sb-full sb-stack">
              {pages.map((p, i) => (
                <Image
                  key={p.src}
                  src={p.src}
                  alt={i === current ? p.title : ""}
                  width={p.w}
                  height={p.h}
                  sizes="(max-width: 920px) 94vw, 860px"
                  quality={q}
                  decoding="sync"
                  draggable={false}
                  priority
                  style={{ visibility: i === current ? "visible" : "hidden" }}
                />
              ))}
            </div>
          ) : (
            !flip && (
              <div className="sb-full">
                <Image
                  src={pages[current].src}
                  alt={pages[current].title}
                  width={pages[current].w}
                  height={pages[current].h}
                  sizes="(max-width: 920px) 94vw, 860px"
                  draggable={false}
                  priority={current < 2}
                />
              </div>
            )
          )}
          {flip && (
            // keyed by flip id so the CSS animations restart on every turn,
            // even when a turn interrupts the previous one
            <div style={{ display: "contents" }} key={flip.id}>
              {/* static halves: the old page's half stays until the flap has
                  nearly landed, the new page's half fades in beneath it */}
              <div className={`sb-half left ${flip.dir === "next" ? "sb-out" : "sb-in"}`}>
                <Half page={pages[flip.dir === "next" ? flip.from : flip.to]} side="left" q={q} sync={mobile} />
              </div>
              <div className={`sb-half right ${flip.dir === "next" ? "sb-in" : "sb-out"}`}>
                <Half page={pages[flip.dir === "next" ? flip.to : flip.from]} side="right" q={q} sync={mobile} />
              </div>
              <div
                className={`sb-flap ${flip.dir}`}
                onAnimationEnd={(e) => {
                  if (e.target !== e.currentTarget) return;
                  setCurrent(flip.to);
                  // during the opening riffle, chain straight into the next
                  // fast flip until the sequence lands on the home spread
                  if (introRef.current && seqIdx.current + 1 < seqRef.current.length) {
                    seqIdx.current += 1;
                    idRef.current += 1;
                    setFlip({ id: idRef.current, dir: "next", ...seqRef.current[seqIdx.current] });
                    return;
                  }
                  if (introRef.current) {
                    introRef.current = false;
                    setIntro(false);
                  }
                  if (mobileRef.current) {
                    // two-phase commit (mobile only): the base underneath
                    // just swapped to the landed page; hold the finished
                    // flip layers over it for a beat so the swap paints
                    // covered, then remove them over identical pixels
                    const fid = flip.id;
                    setTimeout(() => setFlip((f) => (f && f.id === fid ? null : f)), 90);
                    return;
                  }
                  setFlip((f) => (f && f.id === flip.id ? null : f));
                }}
              >
                <div className="sb-face front">
                  <Half page={pages[flip.from]} side={flip.dir === "next" ? "right" : "left"} q={q} sync={mobile} />
                </div>
                <div className="sb-face back">
                  <Half page={pages[flip.to]} side={flip.dir === "next" ? "left" : "right"} q={q} sync={mobile} />
                </div>
              </div>
            </div>
          )}

          {/* preload EVERY spread up front (priority) with the same sizes as
              the flip halves — mounted once `ready` fixes the quality tier,
              so exactly ONE set of variants is fetched and cached. On mobile
              the visible base stack above already does this job. */}
          {ready && !mobile && (
            <div className="sb-preload" aria-hidden>
              {pages.map((p) => (
                <Image
                  key={p.src}
                  src={p.src}
                  alt=""
                  width={p.w}
                  height={p.h}
                  sizes="(max-width: 920px) 94vw, 860px"
                  quality={q}
                  priority
                />
              ))}
            </div>
          )}

          {/* tap zones are pointer-only affordances: keyboard users have the
              arrow buttons and arrow-key paging, so these stay out of the tab
              order (a focus ring around half the book helps no one) */}
          <button
            className="sb-zone sb-prev"
            onClick={prev}
            disabled={intro || loading}
            tabIndex={-1}
            aria-hidden="true"
          />
          <button
            className="sb-zone sb-next"
            onClick={next}
            disabled={intro || loading}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>

        <button
          className="sb-arrow right"
          onClick={next}
          disabled={intro || loading}
          aria-label={labels.next}
        >
          <Chevron dir="right" />
        </button>
      </div>
      {/* crossfade: the outgoing title fades out while the new one fades in */}
      <div className="sb-captions">
        {flip && (
          <p className="sb-caption cap-out" key={`out-${flip.id}`}>
            {pages[flip.from].title}
          </p>
        )}
        <p className="sb-caption" key={label}>
          {label}
        </p>
      </div>
      {/* screens too narrow for the index still need a way between volumes —
          only once there is more than one, so a single book adds nothing */}
      {volumes.length > 1 && (
        <div className="sb-vols">
          {volumes.map((v, vi) => (
            <button
              key={v.id}
              className="sb-vol"
              aria-pressed={vi === vol}
              onClick={() => onVol(vi)}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
