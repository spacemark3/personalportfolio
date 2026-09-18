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
//   content/en/blog/on-making-do.md  one post: frontmatter + its body
//   content/it/…                     the same files, same names, in Italian
//
// A file missing from `it` falls back to its English copy rather than
// failing the build, so a new entry can be written in one language and
// translated after — the site stays shippable in between. The blog leans on
// that harder than the rest: its posts are written in English and the Italian
// route shows them as they are, with the words around them translated.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked, Marked } from "marked";
import { asset } from "@/lib/asset";
import { defaultLocale, type Locale } from "@/lib/i18n";
import type { BlogPost, JourneyChapter, JourneyEntry } from "@/content/content";

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

// Block Markdown, for the one place that needs it: a post has headings, lists
// and quotations, and parseInline above cannot emit any of them.
//
// Its own Marked instance, not the shared `marked`: an extension registered on
// that one would leak into inline() and put a <p> around every journey
// paragraph. walkTokens does two jobs on the token tree, before any HTML
// exists —
//
//   · a link or an image written to a site path (/blog/x.webp, /en/journey/)
//     goes through asset(). next/link adds the project's basePath by itself
//     and marked has never heard of it, so without this every one of them
//     works in dev and 404s on GitHub Pages — the worst shape of bug there is.
//     Left alone: absolute URLs, mailto:, and #anchors, none of which are
//     paths into this site.
//   · a heading is pushed down to at least <h2>, because the post's title is
//     already the page's <h1> and a body that opened with `#` would make two
const sitePath = (href: string) => href.startsWith("/") && !href.startsWith("//");

const blocks = new Marked({
  async: false,
  walkTokens: (token) => {
    if ((token.type === "image" || token.type === "link") && sitePath(token.href)) {
      token.href = asset(token.href);
    }
    if (token.type === "heading" && token.depth < 2) token.depth = 2;
  },
});

const blockHtml = (md: string) => (blocks.parse(md.trim(), { async: false }) as string).trim();

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v.trim() : fallback);

// A date out of frontmatter, whichever way it was written. YAML turns an
// unquoted `date: 2026-02-14` into a Date and a quoted one into a string, and
// both are reasonable things to type — so both arrive here as "YYYY-MM-DD".
const day = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : str(v));

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

// ---------- blog ----------

// The filename is the URL, so it is held to what a URL should look like.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Read once per locale and kept. Every post page asks for the whole list — it
// is what the index beside the writing is made of — so without this the tree
// would be re-read and re-parsed once per post, per locale: twenty posts would
// mean the better part of a thousand file reads in one build instead of forty.
const cache = new Map<Locale, BlogPost[]>();

export const getBlogPosts = (locale: Locale): BlogPost[] => {
  const hit = cache.get(locale);
  if (hit) return hit;

  // The English directory is the list of posts, whatever the locale, and each
  // file is then resolved through localized() so a translated copy wins where
  // one exists. Reading content/it/blog directly would be the obvious thing
  // and the wrong one: readdir has no fallback, so every untranslated post
  // would quietly vanish from the Italian index rather than showing in English.
  const dir = path.join(root, defaultLocale, "blog");
  const names = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    : [];

  const all = names.map((name): BlogPost => {
    const slug = name.slice(0, -3);
    const where = `content/${locale}/blog/${name}`;
    // Every one of these is a build-time failure rather than a post rendered
    // with a hole in it, for the same reason getJourney refuses an unknown
    // chapter: a typo should cost a build, not a reader.
    if (!SLUG.test(slug)) {
      throw new Error(
        `${where}: the filename is the post's URL, so it may hold only lowercase ` +
          `letters, digits and single hyphens (e.g. on-making-do.md)`
      );
    }

    const file = matter(fs.readFileSync(localized(locale, path.join("blog", name)), "utf8"));
    const title = str(file.data.title);
    const date = day(file.data.date);
    const category = str(file.data.category);

    if (!title) throw new Error(`${where}: needs a title:`);
    if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
      throw new Error(`${where}: needs a real date: as YYYY-MM-DD — it is what orders the index`);
    }
    if (!category) {
      throw new Error(`${where}: needs a category: — it is what groups the post in the index`);
    }
    if (!file.content.trim()) throw new Error(`${where}: has no body`);

    return {
      slug,
      title,
      date,
      category,
      bodyHtml: blockHtml(file.content),
      ...(str(file.data.summary) ? { summary: str(file.data.summary) } : {}),
    };
  });

  // Newest first — which is also what decides the order of the categories in
  // the index, since they are taken in the order their posts appear. The slug
  // breaks a tie, so two posts written on one day cannot swap places between
  // one build and the next.
  all.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));

  cache.set(locale, all);
  return all;
};

export const getBlogPost = (locale: Locale, slug: string): BlogPost | undefined =>
  getBlogPosts(locale).find((p) => p.slug === slug);
