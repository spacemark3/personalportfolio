"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { site } from "@/content/content";
import { getDictionary, localePath, type Locale } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// Shared fixed header: name left; nav + language switch right. Every entry is
// a real route, so nothing here scrolls the page or leaves a #hash behind.
// On phones the links collapse behind a hamburger — same markup, presented
// as a panel by CSS, so there is only ever one list of links to maintain
// (the switcher collapses with them, for the same reason).
//
// Every href goes through localePath, so a link never drops the reader out
// of the language they are reading in.
export default function SiteNav({
  locale,
  active,
}: {
  locale: Locale;
  active?: "journey" | "blog" | "about" | "inspiration";
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = getDictionary(locale);

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
      <Link href={localePath(locale)} className="name">
        {site.name}
      </Link>

      {/* phones only (hidden by CSS above 640px) */}
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
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
        <Link
          href={localePath(locale, "/journey")}
          aria-current={active === "journey" ? "page" : undefined}
        >
          {t.nav.journey}
        </Link>
        <Link
          href={localePath(locale, "/blog")}
          aria-current={active === "blog" ? "page" : undefined}
        >
          {t.nav.blog}
        </Link>
        <Link
          href={localePath(locale, "/about")}
          aria-current={active === "about" ? "page" : undefined}
        >
          {t.nav.about}
        </Link>
        <Link
          href={localePath(locale, "/inspiration")}
          aria-current={active === "inspiration" ? "page" : undefined}
        >
          {t.nav.inspiration}
        </Link>
        <LanguageSwitcher locale={locale} />
      </nav>
    </header>
  );
}
