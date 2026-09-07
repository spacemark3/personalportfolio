import type { Metadata } from "next";
import { asset } from "@/lib/asset";
import {
  defaultLocale,
  languageAlternates,
  localeNames,
  locales,
  localePath,
  siteUrl,
} from "@/lib/i18n";

// `/` — the doormat. A static host has no server to read Accept-Language
// with, so detection happens in the browser, in one inline script that runs
// before React ever loads: a remembered choice wins, then the browser's own
// language list, then English.
//
// Without JavaScript the same page is a two-line language chooser rather
// than a meta-refresh: a refresh would race the script and could send an
// Italian reader to the English site, and a crawler gets two clean links to
// follow either way (backed by the hreflang tags below).

export const metadata: Metadata = {
  metadataBase: new URL(`${siteUrl}/`),
  title: "Mark Andro",
  alternates: {
    canonical: `${siteUrl}${localePath(defaultLocale)}/`,
    languages: languageAlternates(),
  },
  // a redirect shell has nothing to index; the locale pages carry the site
  robots: { index: false, follow: true },
};

const detect = `(function(){
  var l=${JSON.stringify(locales)},b=${JSON.stringify(asset(""))},p=null;
  try{var s=localStorage.getItem("locale");if(l.indexOf(s)>-1)p=s;}catch(e){}
  if(!p){var w=(navigator.languages||[navigator.language||""]);
    for(var i=0;i<w.length&&!p;i++){var t=String(w[i]).toLowerCase().split("-")[0];
      if(l.indexOf(t)>-1)p=t;}}
  location.replace(b+"/"+(p||${JSON.stringify(defaultLocale)})+"/");
})();`;

export default function LocaleGate() {
  return (
    <main className="lang-gate">
      <p className="lang-gate-h">Mark Andro</p>
      <nav className="lang-gate-links" aria-label="Choose a language">
        {locales.map((locale) => (
          <a key={locale} href={asset(`${localePath(locale)}/`)} hrefLang={locale}>
            {localeNames[locale]}
          </a>
        ))}
      </nav>
      <script dangerouslySetInnerHTML={{ __html: detect }} />
    </main>
  );
}
