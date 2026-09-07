import localFont from "next/font/local";

// Real Futura, self-hosted — no render-blocking external font request.
// Shared by both root layouts (the locale shell and the / redirect shell),
// so the paths below stay relative to this file, not to either of them.
export const futura = localFont({
  src: [
    { path: "./fonts/futura-light.ttf", weight: "300", style: "normal" },
    { path: "./fonts/futura-book.ttf", weight: "400", style: "normal" },
    { path: "./fonts/futura-medium.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-futura",
  display: "swap",
});
