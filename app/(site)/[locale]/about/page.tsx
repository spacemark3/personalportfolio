import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { asset } from "@/lib/asset";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Avatar from "@/components/Avatar";
import { contacts } from "@/content/content";
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

// About: the portrait and the bio side by side in the middle of the page, and
// the avatar out of the flow in the bottom-right corner, over the footer.
//
// The photo is served straight out of public/, already cropped to 2:3 and
// 300px wide — three times its 100px box, and images are unoptimized in this
// export (GitHub Pages has no optimizer), so the file that ships is the file
// that was written. Its src goes through asset() for the project-page
// basePath.
//
// The prose is content/<locale>/about.md; each paragraph arrives as inline
// HTML so a link or an emphasis written in Markdown survives to the page.
// The avatar is the page's one client component, and pure enhancement: the
// bio is server-rendered either way.
export default async function AboutPage({ params }: PageParams) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const about = getAbout(locale);

  return (
    <main id="main" className="page about-shell">
      <SiteNav locale={locale} active="about" />

      <section className="about about-page">
        <Image
          className="about-photo"
          src={asset("/about/portrait.webp")}
          alt={t.about.photoAlt}
          width={300}
          height={450}
          sizes="100px"
          priority
        />

        <div className="about-text">
          {about.bio.map((html, i) => (
            <p key={i} className="bio" dangerouslySetInnerHTML={{ __html: html }} />
          ))}

          {/* Under the description, and left of the standing figure in the
              corner. In the bio's own column rather than pinned to the page's
              bottom-left: the figure is out of the flow and the footer is not,
              so a mirrored corner would sit on top of the © line at short
              window heights. Here it stays the bio's last line at every size,
              and on a phone it simply follows the text down. */}
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
        </div>
      </section>

      {/* Before the footer, which is where it stands on a phone. On desktop
          it leaves the flow for the page's right-hand corner and still paints
          over the footer below it — a positioned box paints after in-flow
          content regardless of source order, so no z-index is needed. */}
      <Avatar label={t.about.avatarLabel} />

      <SiteFooter locale={locale} />
    </main>
  );
}
