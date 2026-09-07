import { getDictionary, type Locale } from "@/lib/i18n";

// Michelle-style footer: hairline rule, © line left, two link columns right
// (contact + site). Dark pages restyle automatically via the CSS variables.
export default function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);

  return (
    <footer className="site-foot">
      <p className="site-foot-c">{t.site.footer}</p>
      <nav className="site-foot-cols" aria-label={t.nav.footerLabel}></nav>
    </footer>
  );
}
