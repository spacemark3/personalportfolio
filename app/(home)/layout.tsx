import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Sketchbook from "@/components/Sketchbook";
import { site, about, sketchbook } from "@/content/content";

// The home page IS this layout: any page rendered over it arrives as
// `children` — a card above the page — so the sketchbook and the scroll
// position survive opening and closing it.
// The home page is now the hero alone; the project grid lives at /journey.

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main id="main" className="page home">
        <SiteNav />

        {/* ---------- hero: fills the first screen ---------- */}
        <section id="sketchbook" className="hero">
          <p className="hero-kicker">{about.eyebrow}</p>
          <h1 className="hero-name">{site.name}</h1>
          <Sketchbook pages={sketchbook} />
        </section>

        <SiteFooter />
      </main>

      {/* a card, when one is open */}
      {children}
    </>
  );
}
