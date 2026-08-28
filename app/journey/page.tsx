import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { site, homeRows } from "@/content/content";

export const metadata: Metadata = { title: "Journey — Mark Andro" };

// one grid tile; `aspect` (when set) crops the cover to the reference layout
const workCard = (r: (typeof homeRows)[number]) => (
  <Link key={r.href} href={r.href} className="work-card" scroll={false}>
    <span className="shot" style={{ aspectRatio: r.aspect ?? `${r.thumb.w} / ${r.thumb.h}` }}>
      <Image
        src={r.thumb.src}
        alt=""
        fill
        quality={60}
        sizes="(max-width: 700px) 92vw, 760px"
        style={{ objectFit: "cover" }}
      />
      <span className="cap">
        <span className="t">{r.title}</span>
        <span className="n">
          {r.year} · {r.tag}
        </span>
      </span>
    </span>
  </Link>
);

// Journey: two staggered columns of cards. Empty until `homeRows` has entries.
export default function JourneyPage() {
  return (
    <main id="main" className="page">
      <SiteNav active="journey" />

      <section>
        <h2 className="section-label">{site.labels.projects}</h2>
        {homeRows.length === 0 ? (
          <p className="empty-note">nothing here yet</p>
        ) : (
          <div className="work-grid">
            <div className="wg-col">{homeRows.slice(0, 4).map(workCard)}</div>
            <div className="wg-col">{homeRows.slice(4).map(workCard)}</div>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
