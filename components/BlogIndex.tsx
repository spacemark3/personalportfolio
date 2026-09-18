"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { BlogPost } from "@/content/content";
import { localePath, type Locale } from "@/lib/i18n";

// The blog's contents: every post, grouped by category, with the one you are
// reading marked. Beside the writing from 980px up, above it below that.
//
// It knows where you are without watching anything — each entry is a link to
// its own page, so "here" is just the slug in the URL, handed down as `current`
// and compared on the server. That is the whole reason this is a fraction of
// JourneyStack: the journey's index tracks a scroll position through one long
// page, and needs a scroll listener, open/shut state and a smooth-scroll jump
// to do it. None of that applies when a post is a page.
//
// Two things here do have state, and both exist to keep the list short:
//
//   · every category folds, and only the one being read starts open. A blog
//     that talks about anything grows a category at a time, and an index that
//     showed every post under every one of them would be a page of its own
//     before long. Shut, a category costs one line.
//   · on a phone the whole index folds behind a "contents" line, so a post
//     opens at its title rather than below the list. Above 980px that button
//     is display: none and the list is simply there.
export default function BlogIndex({
  locale,
  posts,
  current,
  labels,
}: {
  locale: Locale;
  posts: BlogPost[];
  /** the slug being read — the entry to mark, and the category to open */
  current: string;
  labels: { contents: string; contentsLabel: string };
}) {
  const uid = useId();
  const [folded, setFolded] = useState(true);

  // The posts arrive newest first, so taking each category the first time it
  // appears orders the groups by their newest post: whatever is being written
  // about now is at the top of the index, and nothing had to say so.
  const categories = [...new Set(posts.map((p) => p.category))];
  const currentCategory = posts.find((p) => p.slug === current)?.category;

  const [open, setOpen] = useState<string[]>(currentCategory ? [currentCategory] : []);

  // Moving to another post has to open that post's category, and a client-side
  // navigation between two /blog/<slug> pages does NOT remount this — React
  // keeps the component, and its state, in place. So the reset is done on the
  // prop instead: React's own "adjust state when a prop changes" pattern, which
  // re-renders before anything reaches the screen. Without it you could arrive
  // at a post whose entry is folded away inside a shut category.
  const [shown, setShown] = useState(current);
  if (shown !== current) {
    setShown(current);
    setOpen(currentCategory ? [currentCategory] : []);
  }

  const toggle = (category: string) =>
    setOpen((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );

  return (
    <nav className="bl-index" aria-label={labels.contentsLabel}>
      {/* phones only — hidden at the width where the index has its own column */}
      <button
        type="button"
        className="bl-index-toggle"
        aria-expanded={!folded}
        aria-controls={`${uid}-contents`}
        onClick={() => setFolded((f) => !f)}
      >
        <span className="bl-index-caret" aria-hidden="true" />
        {labels.contents}
      </button>

      <div className="bl-index-body" id={`${uid}-contents`} data-open={!folded || undefined}>
        <p className="bl-index-h">{labels.contents}</p>

        {categories.map((category, i) => {
          const inside = posts.filter((p) => p.category === category);
          const isOpen = open.includes(category);
          const listId = `${uid}-${i}`;

          return (
            <div key={category} className="bl-index-group">
              {/* the category, and the control that folds it. Free text out of
                  a post's frontmatter, so this is the one line on the page
                  whose words the writing decides. */}
              <button
                type="button"
                className="bl-index-label"
                aria-expanded={isOpen}
                aria-controls={listId}
                onClick={() => toggle(category)}
              >
                <span className="bl-index-caret" aria-hidden="true" />
                <span className="bl-index-cat">{category}</span>
                {/* how much is folded away in there, so a shut category still
                    says whether it is worth opening */}
                <span className="bl-index-count">{inside.length}</span>
              </button>

              <ul className="bl-index-list" id={listId} hidden={!isOpen}>
                {inside.map((p) => {
                  const here = p.slug === current;
                  return (
                    <li key={p.slug}>
                      <Link
                        href={localePath(locale, `/blog/${p.slug}`)}
                        className="bl-index-item"
                        data-here={here || undefined}
                        // "page", not "true": these are links to other pages,
                        // where the journey's are anchors within one
                        aria-current={here ? "page" : undefined}
                        onClick={() => setFolded(true)}
                      >
                        <span className="bl-index-dot" aria-hidden="true" />
                        <span className="bl-index-text">
                          <span className="bl-index-lead">{p.title}</span>
                          <span className="bl-index-when">
                            {new Intl.DateTimeFormat(locale, {
                              timeZone: "UTC",
                              month: "short",
                              year: "numeric",
                            }).format(new Date(`${p.date}T00:00:00Z`))}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
