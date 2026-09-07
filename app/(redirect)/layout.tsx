import { futura } from "@/app/fonts";
import "@/app/globals.css";

// The second root layout, for `/` alone. It is deliberately language-neutral:
// the page under it does nothing but hand the reader to /en/ or /it/, so the
// document it ships declares English only as a placeholder for the second or
// so it exists. Every real page renders under app/(site)/[locale]/layout.tsx.
export default function RedirectLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={futura.variable}>
      <body>{children}</body>
    </html>
  );
}
