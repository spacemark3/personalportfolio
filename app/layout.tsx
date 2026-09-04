import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// real Futura, self-hosted — no render-blocking external font
const futura = localFont({
  src: [
    { path: "./fonts/futura-light.ttf", weight: "300", style: "normal" },
    { path: "./fonts/futura-book.ttf", weight: "400", style: "normal" },
    { path: "./fonts/futura-medium.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-futura",
  display: "swap",
});

// live at the GitHub Pages project URL
export const metadata: Metadata = {
  metadataBase: new URL("https://spacemark3.github.io/personalportfolio/"),
  title: "Mark Andro",
  description: "software engineer / artist / jack of all trades",
  openGraph: {
    title: "Mark Andro",
    description: "software engineer / artist / jack of all trades",
    url: "https://spacemark3.github.io/personalportfolio/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fully self-hosted Futura (FuturaCyrillic covers all glyphs incl. curly
  // quotes and ±) — zero external font requests.
  return (
    <html lang="en" className={futura.variable}>
      <body>
        {/* keyboard users can jump past the fixed header straight to content */}
        <a href="#main" className="skip-link">
          skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
