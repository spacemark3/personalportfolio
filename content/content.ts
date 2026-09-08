// ============================================================
// The site's language-independent content and its shared types.
//
// Everything a reader actually reads now lives in Markdown, one mirrored
// tree per locale (content/en, content/it), loaded at build time by
// lib/content.ts. UI strings — nav labels, aria-labels, page titles — live
// in locales/en.json and locales/it.json.
//
// What stays here is what doesn't change with the language: the name, and
// the sketchbook's file list.
// ============================================================

import { asset } from "@/lib/asset";

export type Pic = { src: string; w: number; h: number };

// ---------- site chrome ----------
export const site = {
  name: "Mark Andro",
};

// TODO: placeholder targets — swap in your own profiles and address.
// Unused by any page today; kept for when the footer grows its link columns.
export const socials = [
  { type: "instagram", label: "Instagram", href: "#" },
  { type: "x", label: "X", href: "#" },
  { type: "linkedin", label: "LinkedIn", href: "#" },
  { type: "email", label: "Email", href: "mailto:you@example.com" },
] as { type: "instagram" | "x" | "linkedin" | "email"; label: string; href: string }[];

// ---------- contacts ----------
// The About page's one way to reach him, under the bio. Language-independent:
// an address and a number read the same in both locales — only the two labels
// beside them come from the dictionary (about.contact.*).
//
// `href` and `text` are kept apart on purpose. A tel: href has to be the bare
// E.164 number for a phone to dial it, while the number a reader should SEE is
// grouped and spaced; writing the pretty one into the href is the usual way
// this breaks.
export const contacts = {
  // TODO: your real number. The href is what dials; the text is what shows.
  phone: { href: "tel:+39 3279562835", text: "+39 3279562835" },
  email: { href: "mailto:mark3andro@gmail.com", text: "mark3andro@gmail.com" },
};

// ---------- journey ----------
// The shapes lib/content.ts builds out of content/<locale>/journey/*.md, and
// that components/JourneyStack.tsx renders. One .md file per entry: its
// frontmatter fills the fields below, its body becomes `bodyHtml`.
export type JourneyEntry = {
  title: string; // the degree, the certification, the role
  subtitle?: string; // what the work actually was, in one line
  place: string; // school, issuing body, or company
  span: string; // "2018–2022", "2021", "2022 — now"
  /** the entry's paragraph, as inline HTML — CSS lifts its first letter
   *  into a drop cap, so it is set into the page's own <p> */
  bodyHtml: string;
  note?: string; // optional aside: credential ID, honours, the stack
};

// `lead` picks which line the spine sets in the large type. Chapters default
// to the role ("title"); a chapter set to "place" leads with the company
// instead, for work whose interest is where it happened, not the job title.
export type JourneyChapter = {
  label: string;
  lede?: string;
  lead?: "title" | "place";
  entries: JourneyEntry[];
};

// ---------- hero flipbook ----------
// `home` marks the spread the opening riffle lands on; `start` marks the one
// it begins from. Each falls back to the first spread if neither is flagged.
// Titles are the artwork's own — they are not translated.
export type SketchPage = Pic & { title: string; home?: boolean; start?: boolean };

type SketchFlags = { home?: boolean; start?: boolean };

// A page scanned flat and mounted into scripts/book-template.png by
// scripts/sketchbook.mjs. Renders at 1920x1080 rather than 1280x720 — a
// scanned page only gets ~397px of width at 1280, which is not enough for
// pencil. Mixing sizes is safe: .sb-book takes its aspect-ratio from pages[0]
// alone, both sizes are 16:9, and every image is width:100%.
const mounted = (file: string, title: string, flags?: SketchFlags): SketchPage => ({
  src: asset(`/work/sketchbook/${file}.png`),
  w: 1920,
  h: 1080,
  title,
  ...(flags?.home ? { home: true } : {}),
  ...(flags?.start ? { start: true } : {}),
});

export const sketchbook: SketchPage[] = [
  mounted("i want to live", "\"I want to live!\""),
  mounted("助けて", "\"助けて\""),
  mounted("eustass", "Laguna"),
  mounted("i am proud of you", "\n I will make you proud \n"),
  mounted("sasuke", " This is the last time "),
  mounted("konan", "Konan - Itachi"),
  mounted("kisame", "Kisame - Sasori"),
  mounted("notes", "\" I will never forget you\""),
  mounted("kimono", "Diwata"),
  mounted("megumi", "Megumi"),
  mounted("fly", "To Pimp A Caterpillar"),
  mounted("prisoner of the mind", "Prisoner Of The Mind"),
  mounted("bakugo", "Bakugo - Deku"),
  mounted("thinking of the blue sky", "青い空が好きです", { home: true }),
];

// ---------- inspiration: the people who supported him ----------
// A wall of photographs behind the closing line, revealed only by the
// flashlight cursor. `alt` is optional: the wall carries one aria-label of
// its own (inspiration.wallLabel), so an unnamed photo is decorative rather
// than unlabelled. No width/height — the tiles are sized by the grid and the
// images are `fill`.
//
// Drop files into public/inspiration/ and add a line each. The page is
// finished with none of them: the wall is simply empty and the beam still
// finds the line.
//
// The list takes two shapes. ONE entry is a collage already assembled in an
// image editor, and covers the screen edge to edge — that is the layout the
// page was drawn against. SEVERAL entries tile into a square mosaic and the
// browser assembles the collage instead.
//
// Sizing follows from which one you pick: a single collage wants ~2000px wide
// and can afford ~300KB, while mosaic tiles cap at about 190px on screen, so
// ~600px and ~40KB each. Either way this wall is the page's whole first-paint
// weight, the way the sketchbook is the home page's.
export type Person = { src: string; alt?: string };

export const person = (file: string, alt?: string): Person => ({
  src: asset(`/inspiration/${file}`),
  ...(alt ? { alt } : {}),
});

export const people: Person[] = [
  // person("collage.webp", "the people who supported me"),
];
