"use client";

import { useEffect, useId, useState } from "react";
import type { JourneyChapter } from "@/content/content";

// The journey as a shelf of books seen spine-out. Each entry stands vertical,
// its title set in the spine; clicking one opens it sideways into a reading
// panel and tints it its own colour. One book at a time — the shelf is only
// so wide, and a second open book would push the first off the end of it.
//
// Chapters keep their own rail (label at the top, place at the foot), so
// studies stand to the left of work on one continuous shelf.

// Every book gets its own light accent instead of one shared green: a hue
// spaced by the golden angle (137.508°) so any number of entries stays well
// distributed around the wheel with no two adjacent books landing close in
// colour. Fixed at 46% saturation / 84% lightness — verified to hold ≥4.5:1
// contrast (WCAG AA) for every open-state text tone against every hue.
const bookHue = (index: number) => Math.round((index * 137.508) % 360);
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

export default function JourneyStack({ chapters }: { chapters: JourneyChapter[] }) {
  // the shelf opens shut — every book is a closed spine until one is pulled,
  // so the page lands as one unbroken run of bars rather than a sprung panel
  const [open, setOpen] = useState<string | null>(null);
  const uid = useId();

  // Escape closes the open book, matching the nav panel and the project card
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  let bookIndex = 0; // runs across every chapter, not reset per chapter —
  // otherwise chapter 2's first book would repeat chapter 1's first colour

  return (
    <div className="shelf">
      {chapters.map((chapter) => (
        <section key={chapter.label} className="shelf-group">
          <div className="shelf-rail">
            <h2 className="shelf-label">{chapter.label}</h2>
          </div>

          {chapter.entries.map((e, i) => {
            const id = `${chapter.label}-${i}`;
            const isOpen = open === id;
            const panelId = `${uid}-${i}-${chapter.label.replace(/\W+/g, "")}`;
            const spineId = `${panelId}-spine`;
            const hue = bookHue(bookIndex++);
            // which line gets the large type — the role by default, the
            // company where the chapter asks for it (see JourneyChapter.lead)
            const leadsPlace = chapter.lead === "place";
            const lead = leadsPlace ? e.place : e.title;
            const sub = leadsPlace ? e.title : e.place;

            return (
              <article
                key={id}
                className="book"
                data-open={isOpen || undefined}
                style={{ "--book-hue": hue } as React.CSSProperties}
              >
                <h3 className="book-h">
                  <button
                    type="button"
                    id={spineId}
                    className="spine"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : id)}
                  >
                    <span className="spine-lead">
                      <Arrow />
                      <span className="spine-text">
                        <span className="spine-title">{lead}</span>
                        <span className="spine-place">{sub}</span>
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
                      <p className="leaf-title">{lead}</p>
                      <p className="leaf-place">{sub}</p>
                      {e.subtitle && <p className="leaf-scope">{e.subtitle}</p>}
                      <p className="leaf-body">{e.body}</p>
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
  );
}
