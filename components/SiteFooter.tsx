import { getDictionary, type Locale } from "@/lib/i18n";

// Site footer: a hairline rule and the © line. Dark pages restyle it
// automatically via the CSS variables.
export default function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);

  return (
    <footer className="site-foot">
      <p className="site-foot-c">{t.site.footer}</p>
    </footer>
  );
}
