import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { playSections } from "@/content/content";

export const metadata: Metadata = { title: "Play — Mark Andro" };

// Play: categories of experiments. Empty until entries are added to
// `playSections` — each card renders a thumb, a title and a note.
export default function PlayPage() {
  return (
    <main id="main" className="page">
      <SiteNav active="play" />

      {playSections.length === 0 ? (
        <p className="empty-note">nothing here yet</p>
      ) : (
        playSections.map((s) => (
          <section key={s.label} className="play-section">
            <h2 className="section-label">{s.label}</h2>
            <div className="play-list" />
          </section>
        ))
      )}

      <SiteFooter />
    </main>
  );
}
