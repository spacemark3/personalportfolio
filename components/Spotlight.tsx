"use client";

import { useEffect, useRef } from "react";

// A pointer spotlight: everything is darkened except a soft-edged circle that
// follows the pointer. Pure overlay — pointer-events off, so it never blocks
// interaction beneath.
//
// Touch is a first-class input here, not a fallback. `pointermove` fires on a
// dragging finger and `pointerdown` on a tap, so the same two listeners drive
// both; the light simply starts at the centre of the screen and goes wherever
// it is touched. It stays where the finger left it, which is the only sensible
// resting state — a light that switched off on release would make the page
// unreadable the moment you stopped moving.
//
// What lives here is only the pointer plumbing — the rAF throttle, the finger
// lift, and the --x/--y custom properties. How much it darkens, and how wide
// the clear circle is, is entirely the class's gradient: `spotlight` dims the
// page around the cursor, `ip-beam` (inspiration) inverts it into a flashlight
// that is the only light on the page.

// A fingertip covers roughly the spot it is lighting, so a touch beam rides
// this far above the contact point. Enough to clear the finger, small enough
// that the light still reads as coming from it.
const TOUCH_LIFT = 52;

export default function Spotlight({ className = "spotlight" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // fade the beam in on load — starts at the viewport centre, which is
    // where the scene is, then follows the pointer
    el.style.setProperty("--x", `${window.innerWidth / 2}px`);
    el.style.setProperty("--y", `${window.innerHeight / 2}px`);
    const fadeIn = requestAnimationFrame(() => (el.style.opacity = "1"));

    let raf = 0;
    const move = (e: PointerEvent) => {
      // Read the event now: it is pooled by nothing, but the rAF below runs
      // after the handler returns and `e` stays valid, so only the values are
      // captured to keep the closure honest.
      const { clientX, clientY, pointerType } = e;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Per-EVENT, not a media query. `(pointer: coarse)` reports the
        // PRIMARY pointer, so a touchscreen laptop answers "fine" and its
        // taps would land under the finger; pointerType knows what actually
        // touched the glass this time.
        const lift = pointerType === "touch" ? TOUCH_LIFT : 0;
        el.style.setProperty("--x", `${clientX}px`);
        el.style.setProperty("--y", `${clientY - lift}px`);
        el.style.opacity = "1";
      });
    };

    // passive: the handler never calls preventDefault, and saying so keeps a
    // touch-drag off the scrolling critical path
    const opts = { passive: true } as const;
    window.addEventListener("pointermove", move, opts);
    window.addEventListener("pointerdown", move, opts);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(fadeIn);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
    };
  }, []);

  return <div ref={ref} className={className} aria-hidden />;
}
