"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDictionary, localeAbbr, localeNames, locales, localePath, type Locale } from "@/lib/i18n";

// EN | IT, set in the header beside the nav links. Switching keeps the page
// you are on: the locale is the first path segment and the only thing that
// changes, so /it/journey answers /en/journey and the reader lands on the
// same shelf rather than back at the hero.
//
// The choice is also written to localStorage, which is what `/` reads on a
// later visit (see app/(redirect)/page.tsx) — a static host has nowhere else
// to keep it.
export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const t = getDictionary(locale);

  // usePathname() excludes basePath, so segment 0 is always the locale.
  // Anything after it is the route to carry across.
  const rest = pathname.split("/").filter(Boolean).slice(1).join("/");
  const target = (next: Locale) => localePath(next, rest ? `/${rest}` : "/");

  return (
    <div className="lang-switch" role="group" aria-label={t.language.label}>
      {locales.map((l) => {
        const current = l === locale;
        return (
          <Link
            key={l}
            href={target(l)}
            className="lang-switch-link"
            lang={l}
            hrefLang={l}
            data-current={current || undefined}
            aria-current={current ? "true" : undefined}
            // the label is a two-letter abbreviation; the full language name
            // is what a screen reader should announce
            aria-label={localeNames[l]}
            onClick={() => {
              try {
                localStorage.setItem("locale", l);
              } catch {
                // private mode, storage disabled — the switch still works,
                // it just won't be remembered next time
              }
            }}
          >
            {localeAbbr[l]}
          </Link>
        );
      })}
    </div>
  );
}
