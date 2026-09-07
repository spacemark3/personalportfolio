// The whole i18n system, such as it is: two locales, two JSON dictionaries,
// and a couple of helpers for building locale-prefixed paths.
//
// No i18n library. The site is `output: "export"` (GitHub Pages, no server),
// so there is no middleware to detect a locale or rewrite a URL — every page
// is a file on disk, written at build time. That rules out next-intl's
// routing entirely and leaves its message API doing work that a typed JSON
// import already does. Both dictionaries together are ~2KB, so client
// components import this module directly rather than being handed strings.

import en from "@/locales/en.json";
import it from "@/locales/it.json";

export const locales = ["en", "it"] as const;
export type Locale = (typeof locales)[number];

// `en` is the fallback for anything the browser doesn't ask for by name
export const defaultLocale: Locale = "en";

// en.json is the source of truth for the shape; it.json is checked against it
// by the Record below, so a key added to one and forgotten in the other is a
// type error rather than a blank string in production.
export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, it };

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

// what the switcher and the <html lang> attribute call each locale
export const localeNames: Record<Locale, string> = { en: "English", it: "Italiano" };

// the two-letter label the switcher shows ("EN | IT")
export const localeAbbr: Record<Locale, string> = { en: "EN", it: "IT" };

// Every route lives under its locale, the default one included: /en/about,
// /it/about. Symmetric URLs keep the switcher, the hreflang tags and the
// exported file tree all reading the same way, and `/` is a redirect shell
// (see app/(redirect)/page.tsx) rather than a third copy of the English site.
export const localePath = (locale: Locale, path = "/") =>
  path === "/" ? `/${locale}` : `/${locale}${path}`;

// the site's public origin, used for canonical + hreflang URLs. Must match
// basePath in next.config.mjs, which the exported HTML is served under.
export const siteUrl = "https://spacemark3.github.io/personalportfolio";

// hreflang for one route across every locale, plus the x-default that tells
// a crawler which one to serve when it has no language preference to match
export const languageAlternates = (path = "/") => {
  const languages = Object.fromEntries(
    locales.map((l) => [l, `${siteUrl}${localePath(l, path)}/`])
  ) as Record<Locale, string>;
  return { ...languages, "x-default": `${siteUrl}${localePath(defaultLocale, path)}/` };
};
