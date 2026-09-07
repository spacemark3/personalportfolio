import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import JourneyStack from "@/components/JourneyStack";
import { getJourney } from "@/lib/content";
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
    title: t.meta.journey.title,
    description: t.meta.journey.description,
    alternates: {
      canonical: `${siteUrl}${localePath(locale, "/journey")}/`,
      languages: languageAlternates("/journey"),
    },
  };
}

// Journey: a shelf, not a list. Work stands ahead of the studies, every entry
// a book seen spine-out until you pull one open, with the book's own index
// held in the left margin (see JourneyStack). The chapters and their entries
// come from content/<locale>/journey/*.md.
export default async function JourneyPage({ params }: PageParams) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const journey = getJourney(locale);
  const chapters = journey.chapters.filter((c) => c.entries.length > 0);

  return (
    <main id="main" className="page journey">
      <SiteNav locale={locale} active="journey" />

      {chapters.length === 0 ? (
        <p className="empty-note">{t.journey.empty}</p>
      ) : (
        <>
          {journey.lede && <p className="jr-open">{journey.lede}</p>}
          <JourneyStack
            chapters={chapters}
            labels={{ contents: t.journey.contents, contentsLabel: t.journey.contentsLabel }}
          />
        </>
      )}

      <SiteFooter locale={locale} />
    </main>
  );
}
