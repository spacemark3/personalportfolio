"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { site } from "@/content/content";

// Shared fixed header: name left; nav + social links right. Every entry is a
// real route, so nothing here scrolls the page or leaves a #hash behind.
// On phones the links collapse behind a hamburger — same markup, presented
// as a panel by CSS, so there is only ever one list of links to maintain.
export default function SiteNav({
  active,
}: {
  active?: "journey" | "about" | "inspiration";
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // a tapped link navigates without unmounting the header, so close on route
  // change rather than wiring an onClick onto every link
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes, matching the project card and every other overlay here
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={`top${open ? " menu-open" : ""}`}>
      <Link href="/" className="name">
        {site.name}
      </Link>

      {/* phones only (hidden by CSS above 640px) */}
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="nav-toggle-bars" aria-hidden />
      </button>

      {/* tap anywhere off the panel to dismiss it */}
      {open && (
        <button
          type="button"
          className="nav-scrim"
          tabIndex={-1}
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      <nav id="site-menu" data-open={open || undefined}>
        <Link href="/journey" aria-current={active === "journey" ? "page" : undefined}>
          {site.nav.work}
        </Link>
        <Link href="/about" aria-current={active === "about" ? "page" : undefined}>
          about
        </Link>
        <Link href="/inspiration" aria-current={active === "inspiration" ? "page" : undefined}>
          {site.nav.inspiration}
        </Link>
      </nav>
    </header>
  );
}
