"use client";

import { useEffect, useId, useState } from "react";
import type { JourneyChapter } from "@/content/content";

// The journey as a shelf of books seen spine-out. Each entry stands vertical,
// its title set in the spine; clicking one opens it sideways into a reading
// panel and turns it the site's green. One book at a time — the shelf is only
// so wide, and a second open book would push the first off the end of it.
//
// Chapters keep their own rail (label at the top, place at the foot), so
// studies stand to the left of work on one continuous shelf.
export default function JourneyStack({ chapters }: { chapters: JourneyChapter[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const uid = useId();

  // Escape closes the open book, matching the nav panel and the project card
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="shelf">
      {chapters.map((chapter) => (
        <section key={chapter.label} className="shelf-group">
          <div className="shelf-rail">
            <h2 className="shelf-label">{chapter.label}</h2>
            {chapter.lede && <p className="shelf-where">{chapter.lede}</p>}
          </div>

          {chapter.entries.map((e, i) => {
            const id = `${chapter.label}-${i}`;
            const isOpen = open === id;
            const panelId = `${uid}-${i}-${chapter.label.replace(/\W+/g, "")}`;
            const spineId = `${panelId}-spine`;

            return (
              <article key={id} className="book" data-open={isOpen || undefined}>
                <h3 className="book-h">
                  <button
                    type="button"
                    id={spineId}
                    className="spine"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : id)}
                  >
                    <span className="spine-text">
                      <span className="spine-title">{e.title}</span>
                      <span className="spine-place">{e.place}</span>
                    </span>
                    <span className="spine-when">{e.span}</span>
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
                      <p className="leaf-title">{e.title}</p>
                      <p className="leaf-place">{e.place}</p>
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
