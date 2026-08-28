// ============================================================
// ALL site content lives in this one file.
// Everything below is placeholder scaffolding — the original
// author's projects, galleries, imagery and copy were removed.
// ============================================================

import { asset } from "@/lib/asset";

export type Pic = { src: string; w: number; h: number };

// ---------- site chrome (every visible string is editable here) ----------
export const site = {
  name: "Mark Andro",
  footer: "© Mark Andro 2026",
  nav: { work: "journey", play: "play", inspiration: "inspiration" },
  labels: { projects: "Journey" },
};

// ---------- about ----------
export const about = {
  eyebrow: "SOFTWARE ARCHITECT / ARTIST / JACK OF ALL TRADES",
  // paragraph segments; segments with href render as bolded links
  // TODO: placeholder copy — write your own bio here
  bio: [
    { text: "Mark Andro is a software architect and artist. " },
    { text: "This paragraph is placeholder copy. Segments given an " },
    { text: "href", href: "#" },
    { text: " render as bolded links." },
  ] as { text: string; href?: string }[],
  // TODO: placeholder targets — swap in your own profiles and address
  socials: [
    { type: "instagram", label: "Instagram", href: "#" },
    { type: "x", label: "X", href: "#" },
    { type: "linkedin", label: "LinkedIn", href: "#" },
    { type: "email", label: "Email", href: "mailto:you@example.com" },
  ] as { type: "instagram" | "x" | "linkedin" | "email"; label: string; href: string }[],
};

// ---------- hero flipbook ----------
export type SketchPage = Pic & { title: string };

// Every spread is a 1280x720 PNG with the book drawn inside transparent
// margins — that empty space is what lets the big hero name show through.
// NOTE: this artwork is the ORIGINAL AUTHOR's; replace it with your own.
const sketch = (file: string, title: string): SketchPage => ({
  src: asset(`/work/sketchbook/${file}.png`),
  w: 1280,
  h: 720,
  title,
});

export const sketchbook: SketchPage[] = [
  sketch("osaka castle", "Osaka Castle"),
  sketch("shibuya crossing", "Shibuya Crossing"),
  sketch("tokyo tower", "Tokyo Tower"),
  sketch("todai ji", "Tōdai-ji"),
  sketch("gion kyoto", "Gion, Kyoto"),
  sketch("kamakura", "Kamakura"),
  sketch("taipei", "Taipei"),
  // the file on disk uses "_", not ":" — a colon is not a legal Windows path
  sketch("abandoned car _ taipei street", "Abandoned Car, Taipei Street"),
  sketch("stanford", "Stanford"),
];

// ---------- home: the "journey" grid ----------
// Empty until real entries are added. The section still renders its label,
// so the nav's "journey" link always has somewhere to scroll to.
export type Row = {
  href: string;
  title: string;
  year: string;
  tag: string;
  thumb: Pic;
  aspect?: number;
};

export const homeRows: Row[] = [];

// ---------- play ----------
export type PlayCard = { title: string; href: string; note: string; thumb: Pic; reel?: string };
export const playSections: { label: string; cards: PlayCard[] }[] = [];
