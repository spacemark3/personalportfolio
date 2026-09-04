import Link from "next/link";
import { site, about } from "@/content/content";

// Michelle-style footer: hairline rule, © line left, two link columns right
// (contact + site). Dark pages restyle automatically via the CSS variables.
export default function SiteFooter() {
  return (
    <footer className="site-foot">
      <p className="site-foot-c">{site.footer}</p>
      <nav className="site-foot-cols" aria-label="footer">
      </nav>
    </footer>
  );
}
