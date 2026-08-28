import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { about } from "@/content/content";

export const metadata: Metadata = { title: "About — Mark Andro" };

// About: the bio, on its own for now. The headshot that used to sit beside
// it was the previous owner's — drop a new one in and restore the .headshot
// block when there's a portrait to show.
export default function AboutPage() {
  return (
    <main id="main" className="page">
      <SiteNav active="about" />

      <section className="about about-page">
        <div className="about-text">
          <p className="bio">
            {about.bio.map((seg, i) =>
              seg.href ? (
                <a key={i} href={seg.href} target="_blank" rel="noreferrer" className="bio-link">
                  {seg.text}
                </a>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )}
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
