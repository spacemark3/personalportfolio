import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Spotlight from "@/components/Spotlight";
import {
  getDictionary,
  isLocale,
  languageAlternates,
  localePath,
  siteUrl,
} from "@/lib/i18n";

type PageParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: t.meta.inspiration.title,
    description: t.meta.inspiration.description,
    alternates: {
      canonical: `${siteUrl}${localePath(locale, "/inspiration")}/`,
      languages: languageAlternates("/inspiration"),
    },
  };
}

// A single full-bleed image. That's the whole page, on purpose — the image
// itself is still to come, so the frame stands empty under the spotlight.
export default async function InspirationPage({ params }: PageParams) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  return (
    <main id="main" className="page dark">
      <SiteNav locale={locale} active="inspiration" />
      <div className="inspo inspo-empty">
        <p className="empty-note">{t.inspiration.empty}</p>
      </div>
      <SiteFooter locale={locale} />
      <Spotlight />
    </main>
  );
}
