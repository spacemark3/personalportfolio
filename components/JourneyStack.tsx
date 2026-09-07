"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JourneyChapter, JourneyEntry } from "@/content/content";

// The journey as a shelf of books seen spine-out. Each entry stands vertical,
// its title set in the spine; clicking one opens it sideways into a reading
// panel and tints it the site's accent green. One book at a time — the shelf is only
// so wide, and a second open book would push the first off the end of it.
//
// Beside the shelf stands the index: the book's table of contents, held in
// the left margin while the shelf scrolls past it. Picking an entry there
// pulls that book open and carries the page to it; the entry the reader is
// standing in front of stays marked, so the index doubles as a place-keeper.

// the reading line: how far below the fixed header a book counts as "the one
// being read". Shared by the scroll spy and the index's own jumps, so the
// entry the index scrolls to is the entry the index then marks.
const READING_LINE = 132;

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const Arrow = () => (
  <svg className="spine-arrow" viewBox="0 0 10 10" width="10" height="10" fill="none" aria-hidden="true">
    <polyline
      points="2,1 8,5 2,9"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type Book = {
  id: string; // the article's DOM id, the index's anchor, and the open key
  lead: string; // the line set in the large type
  sub: string; // the other of role/company
  entry: JourneyEntry;
};

export default function JourneyStack({
  chapters,
  labels,
}: {
  chapters: JourneyChapter[];
  /** the index's heading and its accessible name, in the page's language */
  labels: { contents: string; contentsLabel: string };
}) {
  // the shelf opens shut — every book is a closed spine until one is pulled,
  // so the page lands as one unbroken run of bars rather than a sprung panel
  const [open, setOpen] = useState<string | null>(null);
  // the entry the reader is level with, marked in the index
  const [here, setHere] = useState<string | null>(null);
  const spines = useRef(new Map<string, HTMLElement>());

  // one pass over the content: the shelf and the index render from the same
  // list, so an entry can never appear in one and not the other.
  const groups = useMemo(() => {
    return chapters.map((chapter) => ({
      chapter,
      books: chapter.entries.map((entry, i): Book => {
        // which line gets the large type — the role by default, the company
        // where the chapter asks for it (see JourneyChapter.lead)
        const leadsPlace = chapter.lead === "place";
        return {
          id: `jr-${slug(chapter.label)}-${i}`,
          lead: leadsPlace ? entry.place : entry.title,
          sub: leadsPlace ? entry.title : entry.place,
          entry,
        };
      }),
    }));
  }, [chapters]);

  const order = useMemo(() => groups.flatMap((g) => g.books.map((b) => b.id)), [groups]);

  // Escape closes the open book, matching the nav panel and the project card
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // the place-keeper: the last spine to have passed the reading line. Read
  // from live rects rather than an IntersectionObserver — a book's height
  // changes as it opens, and rects are always current where thresholds
  // measured at mount are not.
  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      let current: string | null = null;
      for (const id of order) {
        const el = spines.current.get(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - READING_LINE > 0) break;
        current = id;
      }
      // the foot of the page can sit above the last spine's line; without
      // this the final entry could never be reached by scrolling
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      setHere(atEnd ? order[order.length - 1] ?? null : current ?? order[0] ?? null);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [order]);

  // picking from the index pulls the book open and walks the page to it. The
  // panel unfolds below the spine, so the scroll target never moves under the
  // reader while the animation runs.
  const goTo = useCallback((id: string) => {
    setOpen(id);
    setHere(id);
    const el = spines.current.get(id);
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - READING_LINE,
      // "instant", not "auto" — auto defers to html { scroll-behavior: smooth }
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  return (
    <div className="journey-layout">
      {/* the index: a table of contents, not navigation between pages, so it
          is a list of in-page anchors that still work with JS off */}
      <nav className="jr-index" aria-label={labels.contentsLabel}>
        <p className="jr-index-h">{labels.contents}</p>
        {groups.map(({ chapter, books }) => (
          <div key={chapter.label} className="jr-index-group">
            <p className="jr-index-label">{chapter.label}</p>
            <ul className="jr-index-list">
              {books.map((b) => {
                const isHere = here === b.id;
                return (
                  <li key={b.id}>
                    <a
                      href={`#${b.id}`}
                      className="jr-index-item"
                      data-here={isHere || undefined}
                      aria-current={isHere ? "true" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        goTo(b.id);
                      }}
                    >
                      <span className="jr-index-dot" aria-hidden="true" />
                      <span className="jr-index-text">
                        <span className="jr-index-lead">{b.lead}</span>
                        <span className="jr-index-when">{b.entry.span}</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shelf">
        {groups.map(({ chapter, books }) => (
          <section key={chapter.label} className="shelf-group">
            <div className="shelf-rail">
              <h2 className="shelf-label">{chapter.label}</h2>
            </div>

            {books.map((b) => {
              const isOpen = open === b.id;
              const panelId = `${b.id}-panel`;
              const spineId = `${b.id}-spine`;
              const e = b.entry;

              return (
                <article
                  key={b.id}
                  id={b.id}
                  ref={(el) => {
                    if (el) spines.current.set(b.id, el);
                    else spines.current.delete(b.id);
                  }}
                  className="book"
                  data-open={isOpen || undefined}
                  data-here={here === b.id || undefined}
                >
                  <h3 className="book-h">
                    <button
                      type="button"
                      id={spineId}
                      className="spine"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : b.id)}
                    >
                      <span className="spine-lead">
                        <Arrow />
                        <span className="spine-text">
                          <span className="spine-title">{b.lead}</span>
                          <span className="spine-place">{b.sub}</span>
                        </span>
                      </span>
                      <span className="spine-when">
                        {e.span}
                        {chapter.lede && ` · ${chapter.lede}`}
                      </span>
                    </button>
                  </h3>

                  {/* stays mounted so the book can animate open; `inert` keeps a
                      shut book's text out of focus order and off the a11y tree */}
                  <div
                    id={panelId}
                    className="leaf"
                    role="region"
                    aria-labelledby={spineId}
                  >
                    <div className="leaf-clip">
                      <div className="leaf-inner" inert={!isOpen}>
                        <p className="leaf-when">{e.span}</p>
                        <p className="leaf-title">{b.lead}</p>
                        <p className="leaf-place">{b.sub}</p>
                        {e.subtitle && <p className="leaf-scope">{e.subtitle}</p>}
                        <p className="leaf-body" dangerouslySetInnerHTML={{ __html: e.bodyHtml }} />
                        {e.note && <p className="leaf-note">{e.note}</p>}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
