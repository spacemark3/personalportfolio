// Reads the Markdown content off disk. Build-time only: every page here is
// a server component rendered once by `next build`, so `fs` is available and
// nothing in this file ever reaches the browser. Client components (the nav,
// the shelf, the sketchbook) are handed the result as props instead.
//
// Layout on disk — English and Italian mirror each other exactly:
//
//   content/en/about.md              frontmatter: eyebrow · body: the bio
//   content/en/journey/_chapters.md  the page lede and the chapter list
//   content/en/journey/10-selexi.md  one entry, body = its paragraph
//   content/it/…                     the same files, same names, in Italian
//
// A file missing from `it` falls back to its English copy rather than
// failing the build, so a new entry can be written in one language and
// translated after — the site stays shippable in between.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { defaultLocale, type Locale } from "@/lib/i18n";
import type { JourneyChapter, JourneyEntry } from "@/content/content";

const root = path.join(process.cwd(), "content");

const localized = (locale: Locale, rel: string) => {
  const own = path.join(root, locale, rel);
  return fs.existsSync(own) ? own : path.join(root, defaultLocale, rel);
};

// Markdown → inline HTML: links, emphasis, entities, nothing block-level.
// parseInline is deliberate — the prose is set inside the page's own <p>,
// whose CSS (the .leaf-body drop cap, the .bio measure) is keyed to that
// element. A wrapping <p> from the block parser would break both.
const inline = (md: string) => (marked.parseInline(md.trim(), { async: false }) as string).trim();

// one Markdown body → one HTML string per paragraph. Single newlines are
// joined, so the .md source can be hard-wrapped at a sane column without
// putting line breaks into the rendered sentence.
const paragraphs = (body: string) =>
  body
    .trim()
    .split(/\n\s*\n/)
    .map((p) => inline(p.replace(/\s*\n\s*/g, " ")))
    .filter(Boolean);

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v.trim() : fallback);

// ---------- about ----------

export type About = {
  eyebrow: string;
  /** one HTML string per paragraph of the bio */
  bio: string[];
};

export const getAbout = (locale: Locale): About => {
  const file = matter(fs.readFileSync(localized(locale, "about.md"), "utf8"));
  return {
    eyebrow: str(file.data.eyebrow),
    bio: paragraphs(file.content),
  };
};

// ---------- journey ----------

export type Journey = {
  lede: string;
  chapters: JourneyChapter[];
};

export const getJourney = (locale: Locale): Journey => {
  const dir = localized(locale, "journey");
  const config = matter(fs.readFileSync(path.join(dir, "_chapters.md"), "utf8"));

  const metas = Array.isArray(config.data.chapters) ? config.data.chapters : [];
  const chapters: (JourneyChapter & { key: string })[] = metas.map((m: Record<string, unknown>) => ({
    key: str(m.key),
    label: str(m.label),
    lede: str(m.lede) || undefined,
    lead: m.lead === "place" ? "place" : undefined,
    entries: [],
  }));

  // filenames carry the order (10-, 20-, 30-…), so an entry moves within its
  // chapter by being renamed — nothing to renumber in a list somewhere else
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .sort();

  for (const name of files) {
    const file = matter(fs.readFileSync(path.join(dir, name), "utf8"));
    const key = str(file.data.chapter);
    const chapter = chapters.find((c) => c.key === key);
    if (!chapter) {
      // a build-time failure, not a silently dropped job: a typo here would
      // otherwise vanish an entry from the page with nothing to show for it
      throw new Error(
        `content/${locale}/journey/${name}: chapter "${key}" is not one of ` +
          `${chapters.map((c) => c.key).join(", ")} (see _chapters.md)`
      );
    }
    const entry: JourneyEntry = {
      title: str(file.data.title),
      place: str(file.data.place),
      span: str(file.data.span),
      bodyHtml: paragraphs(file.content).join(" "),
      ...(str(file.data.subtitle) ? { subtitle: str(file.data.subtitle) } : {}),
      ...(str(file.data.note) ? { note: str(file.data.note) } : {}),
    };
    chapter.entries.push(entry);
  }

  return {
    lede: str(config.data.lede),
    chapters: chapters.map(({ key: _key, ...chapter }) => chapter),
  };
};
