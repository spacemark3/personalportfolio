import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { asset } from "@/lib/asset";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Island from "@/components/Island";
import { contacts, site } from "@/content/content";
import { getAbout } from "@/lib/content";
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
    title: t.meta.about.title,
    description: t.meta.about.description,
    alternates: {
      canonical: `${siteUrl}${localePath(locale, "/about")}/`,
      languages: languageAlternates("/about"),
    },
  };
}

// About is the island, and nothing else but the footer: the places the bio
// names — the bahay kubo, the shore, Milan — modelled on one rock, with the
// figure standing on the seam path between the two halves of it. The figure is
// the portrait the page used to keep in its corner, and the description is
// what it says when you pick it.
//
// Everything on the right of it is server-rendered and handed to the island as
// props, so the one client component on the page owns the camera and nothing
// else. The bio in particular: it is the caption's resting state, so the
// description is on the page before three.js has loaded, and there whether or
// not it ever does.
//
// The photo is served straight out of public/, already cropped to 2:3 and
// 300px wide — three times its 100px box, and images are unoptimized in this
// export (GitHub Pages has no optimizer), so the file that ships is the file
// that was written. Its src goes through asset() for the project-page
// basePath.
//
// The prose is content/<locale>/about.md; each paragraph arrives as inline
// HTML so a link or an emphasis written in Markdown survives to the page.
export default async function AboutPage({ params }: PageParams) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const about = getAbout(locale);

  return (
    <main id="main" className="page about-shell">
      <SiteNav locale={locale} active="about" />

      <Island
        label={t.about.island.label}
        hint={t.about.island.hint}
        back={t.about.island.back}
        places={t.about.island.places}
        meLabel={t.about.island.me}
        name={site.name}
        bio={about.bio}
        photo={
          <Image
            className="island-photo"
            src={asset("/about/portrait.webp")}
            alt={t.about.photoAlt}
            width={300}
            height={450}
            sizes="100px"
            priority
          />
        }
        contacts={
          // The column's last line, under the list of places — the two ways to
          // reach a person, after the nine places they have been.
          <ul className="about-contacts" aria-label={t.about.contactLabel}>
            <li className="about-contact">
              <span className="about-contact-k">{t.about.contactPhone}</span>
              <a className="about-contact-v bio-link" href={contacts.phone.href}>
                {contacts.phone.text}
              </a>
            </li>
            <li className="about-contact">
              <span className="about-contact-k">{t.about.contactEmail}</span>
              <a className="about-contact-v bio-link" href={contacts.email.href}>
                {contacts.email.text}
              </a>
            </li>
          </ul>
        }
      />

      <SiteFooter locale={locale} />
    </main>
  );
}
