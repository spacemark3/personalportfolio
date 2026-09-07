import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Sketchbook from "@/components/Sketchbook";
import { site, sketchbook } from "@/content/content";
import { getAbout } from "@/lib/content";
import { getDictionary, isLocale } from "@/lib/i18n";

// The home page IS this layout: any page rendered over it arrives as
// `children` — a card above the page — so the sketchbook and the scroll
// position survive opening and closing it.
// The home page is now the hero alone; the project grid lives at /journey.

export default async function HomeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const about = getAbout(locale);

  return (
    <>
      <main id="main" className="page home">
        <SiteNav locale={locale} />

        {/* ---------- hero: fills the first screen ---------- */}
        <section id="sketchbook" className="hero">
          <p className="hero-kicker">{about.eyebrow}</p>
          <h1 className="hero-name">{site.name}</h1>
          <Sketchbook
            pages={sketchbook}
            labels={{ previous: t.sketchbook.previous, next: t.sketchbook.next }}
          />
        </section>

        <SiteFooter locale={locale} />
      </main>

      {/* a card, when one is open */}
      {children}
    </>
  );
}
