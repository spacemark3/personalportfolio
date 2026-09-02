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
  nav: { work: "journey", play: "craft", inspiration: "inspiration" },
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
    { type: "instagram", label: "Instagrammmm", href: "#" },
    { type: "x", label: "X", href: "#" },
    { type: "linkedin", label: "LinkedIn", href: "#" },
    { type: "email", label: "Email", href: "mailto:you@example.com" },
  ] as { type: "instagram" | "x" | "linkedin" | "email"; label: string; href: string }[],
};

// ---------- journey: studies, then work ----------
// Told in order, oldest first — it should read as a path walked, not a
// résumé. Each entry's `body` is one paragraph; CSS lifts its first letter
// into a drop cap, so the string here stays plain prose.
export type JourneyEntry = {
  title: string; // the degree, the certification, the role
  subtitle?: string; // what the work actually was, in one line
  place: string; // school, issuing body, or company
  span: string; // "2018–2022", "2021", "2022 — now"
  body: string; // one paragraph — the first letter becomes the drop cap
  note?: string; // optional aside: credential ID, honours, the stack
};

export type JourneyChapter = { label: string; lede?: string; entries: JourneyEntry[] };

// TODO: placeholder copy throughout — replace every entry below with your own.
export const journey = {
  lede: "I am the museum of the people I have loved, they expanded my soul and this is my journey.",
  chapters: [
    {
      label: "Studies & Certifications",
      lede: "Italy, Milan",
      entries: [
        {
          title: "Software architecture and design",
          place: "Higher Technical Education Institute - Angelo Rizzoli",
          span: "2024-2026",
          body: "Developed practical skills in front-end and back-end development, database design and data modeling, API, software testing. Gained experience with collaborative tools, and architectural patterns such as MVC and Client-Server.",
          note: "Working-student @ Jollibee",
        },
        {
          title: "International Relations and Marketing",
          place: "Technical Education Institute - Eugenio Montale",
          span: "2015-2020",
          body: "Studied business economics, marketing, international relations, law, geopolitics, and communication technologies, with a strong focus on foreign languages (English, French, and Spanish) and international business.",
        },
      ],
    },
    {
      label: "Work",
      lede: "Italy, Milan",
      entries: [
        {
          title: "Software developer",
          subtitle: "Development of internal management tools for online testing (TOL) system",
          place: "Selexi",
          span: "present",
          body: "Developed key features to streamline production workflows and accelerate testing. Engineered, tested, and documented system functionalities to ensure high reliability while enhancing WCAG compliance and platform accessibility.",
        },
        {
          title: "Web developer - internship",
          subtitle: "Development of responsive interfaces for websites ",
          place: "AGM Solutions",
          span: "2023 - 2024",
          body: "Developed responsive web applications and managed relational databases using HTML, CSS, JavaScript, and PHP. Built a full-stack CRUD photo album application using Laravel to master MVC architecture and modern backend design.",
        },
      ],
    },
  ] as JourneyChapter[],
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

// ---------- play ----------
export type PlayCard = { title: string; href: string; note: string; thumb: Pic; reel?: string };
export const playSections: { label: string; cards: PlayCard[] }[] = [];
