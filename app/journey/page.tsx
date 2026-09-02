import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import JourneyStack from "@/components/JourneyStack";
import { journey } from "@/content/content";

export const metadata: Metadata = { title: "Journey — Mark Andro" };

// Journey: a shelf, not a list. Studies stand to the left of work, every entry
// a book seen spine-out until you pull one open (see JourneyStack).
export default function JourneyPage() {
  const chapters = journey.chapters.filter((c) => c.entries.length > 0);

  return (
    <main id="main" className="page journey">
      <SiteNav active="journey" />

      {chapters.length === 0 ? (
        <p className="empty-note">nothing here yet</p>
      ) : (
        <>
          {journey.lede && <p className="jr-open">{journey.lede}</p>}
          <JourneyStack chapters={chapters} />
        </>
      )}

      <SiteFooter />
    </main>
  );
}
