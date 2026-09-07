import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { futura } from "@/app/fonts";
import "@/app/globals.css";
import {
  getDictionary,
  isLocale,
  languageAlternates,
  localePath,
  locales,
  siteUrl,
} from "@/lib/i18n";

// The site's root layout. There are two of them (see app/(redirect)) — a
// route group may carry its own <html>, which is the only way to put the
// right `lang` in the exported HTML for both locales. Patching it on the
// client would leave every crawler reading /it/ pages as English.

// `output: "export"` writes one file per param, so this is the whole of the
// site's routing: /en/… and /it/… exist on disk, nothing else does.
export const generateStaticParams = () => locales.map((locale) => ({ locale }));
export const dynamicParams = false;

type LocaleParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);

  return {
    metadataBase: new URL(`${siteUrl}/`),
    title: t.meta.home.title,
    description: t.meta.home.description,
    alternates: {
      canonical: `${siteUrl}${localePath(locale)}/`,
      languages: languageAlternates(),
    },
    openGraph: {
      title: t.meta.home.title,
      description: t.meta.home.description,
      url: `${siteUrl}${localePath(locale)}/`,
      locale,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleParams & { children: React.ReactNode }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  return (
    <html lang={locale} className={futura.variable}>
      <body>
        {/* keyboard users can jump past the fixed header straight to content */}
        <a href="#main" className="skip-link">
          {t.nav.skipToContent}
        </a>
        {children}
      </body>
    </html>
  );
}
