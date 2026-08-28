import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import Spotlight from "@/components/Spotlight";

export const metadata: Metadata = { title: "Inspiration — Mark Andro" };

// A single full-bleed image. That's the whole page, on purpose — the image
// itself is still to come, so the frame stands empty under the spotlight.
export default function InspirationPage() {
  return (
    <main id="main" className="page dark">
      <SiteNav active="inspiration" />
      <div className="inspo inspo-empty">
        <p className="empty-note">nothing here yet</p>
      </div>
      <SiteFooter />
      <Spotlight />
    </main>
  );
}
