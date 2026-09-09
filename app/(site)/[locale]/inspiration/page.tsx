import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Spotlight from "@/components/Spotlight";
import { people } from "@/content/content";
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

// The page is in two acts with a hard cut between them, and the whole
// sequence is CSS — timing, the act change, all of it — so this stays a
// server component. The one piece of client code is the beam.
//
//   ACT 1  on black, the verse writes itself out a letter at a time, with a
//          caret walking behind the text. It holds a beat.
//   CUT    the screen it is written on switches off, the way a CRT does:
//          a flash, a fold to a line and then to a point, a spark, and a
//          phosphor glow decaying to black. "Let there be light" — and then
//          there isn't.
//   ACT 2  the wall of photographs fades in with the closing line over it,
//          under a near-opaque mask. The cursor is the only light there is.
//
// The order below is paint order, not reading order: the wall and the line
// are act 2 and sit underneath, the verse is act 1 and rides inside the tube
// on top of the beam, so nothing ever dims it before it is taken away.
export default async function InspirationPage({ params }: PageParams) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const { verse, closing, wallLabel } = t.inspiration;

  return (
    // Two character counts, both measured here because only this side knows
    // the strings. --ip-chars is the verse's own length and drives BOTH the
    // typing clock and the type size that keeps it on one row; --ip-cols is
    // the longest closing line, which does the same for act 2. Each locale
    // therefore sizes itself, and the shorter Italian lines simply come out
    // larger. They ride on <main> rather than the section because the beam is
    // the section's SIBLING and has to inherit the timing derived from this.
    <main
      id="main"
      className="page dark ip-page"
      style={
        {
          "--ip-chars": [...verse].length,
          "--ip-cols": Math.max(...closing.map((l) => [...l].length)),
        } as React.CSSProperties
      }
    >
      <SiteNav locale={locale} active="inspiration" />

      <section className="ip">
        {/* One label for the crowd rather than a caption each: the wall reads
            as a single image, and most photos carry no alt of their own. It
            only exists once there ARE photos — an empty div announcing itself
            as an image is worse than no image at all.

            A single entry is a collage assembled in an image editor and gets
            the whole screen; several tile into a mosaic instead. */}
        {people.length > 0 && (
          <div
            className={`ip-wall${people.length === 1 ? " ip-wall-one" : ""}`}
            role="img"
            aria-label={wallLabel}
          >
            {people.map((p) => (
              <div className="ip-tile" key={p.src}>
                <Image
                  src={p.src}
                  alt={p.alt ?? ""}
                  fill
                  sizes="(max-width: 640px) 33vw, 16vw"
                />
              </div>
            ))}
          </div>
        )}

        {/* One line per entry in the dictionary — the break is authored, not
            left to the measure, so each language breaks where it reads best. */}
        <p className="ip-closing">
          {closing.map((line) => (
            <span className="ip-line" key={line}>
              {line}
            </span>
          ))}
        </p>

        {/* The tube. The verse sits INSIDE .ip-crt-screen because that is the
            part that collapses — a screen that folds while the words hang in
            place is a wipe, not a power-off. The flash, the line, the spark
            and the glow are its siblings for the opposite reason: nested,
            they would be scaled to nothing along with everything else.

            All of it is decoration except the verse, which stays real text in
            the accessibility tree. Timing and beat sheet: .ip-crt in
            globals.css; the tuning harness is crt/crt-off.html. */}
        <div className="ip-crt">
          <div className="ip-crt-screen">
            <div className="ip-crt-bulge">
              {/* Split by code point, not UTF-16 unit, so accented letters
                  stay whole. Inline boxes add no break opportunities, so a
                  line of one-character spans still wraps between words. */}
              <p className="ip-verse">
                {[...verse].map((ch, i) => (
                  <span
                    className="ip-ch"
                    key={i}
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    {ch}
                  </span>
                ))}
              </p>
              <div className="ip-crt-scan" aria-hidden />
            </div>
          </div>

          {/* paint order matters: the glow sits under the spark, and the
              flash over both — it is the only thing lit at t=0 */}
          <div className="ip-crt-line" aria-hidden />
          <div className="ip-crt-glow" aria-hidden />
          <svg className="ip-crt-spark" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 0 C12.6 8.4 15.6 11.4 24 12 C15.6 12.6 12.6 15.6 12 24 C11.4 15.6 8.4 12.6 0 12 C8.4 11.4 11.4 8.4 12 0 Z" />
          </svg>
          <div className="ip-crt-flash" aria-hidden />
        </div>
      </section>

      <SiteFooter locale={locale} />
      <Spotlight className="ip-beam" />
    </main>
  );
}
