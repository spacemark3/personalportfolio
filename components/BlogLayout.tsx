import type { BlogPost } from "@/content/content";
import BlogIndex from "@/components/BlogIndex";
import { getDictionary, type Locale } from "@/lib/i18n";

// The blog: an index on the left, the writing on the right. Both routes under
// /blog render this — /blog with the newest post, /blog/<slug> with that one —
// so the two differ only in which post they hand it, and the index is the same
// list of links either way.
//
// A server component, and everything in it is server-rendered but the index's
// phone fold. The post is HTML by the time it gets here: lib/content.ts parses
// the Markdown at build time, headings, lists and all, and CSS (.blog-body)
// styles it by element rather than by class, since Markdown cannot write one.
//
// Dates are formatted here rather than in the loader: the same post shows
// "14 February 2026" on the English route and "14 febbraio 2026" on the
// Italian, and only the render knows which it is. The explicit Z and the UTC
// timeZone together are what keep a build machine west of Greenwich from
// printing the day before — without them the date drifts with the builder.
export default function BlogLayout({
  locale,
  posts,
  current,
}: {
  locale: Locale;
  posts: BlogPost[];
  current: BlogPost;
}) {
  const t = getDictionary(locale);
  const when = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${current.date}T00:00:00Z`));

  return (
    <div className="blog-layout">
      <BlogIndex
        locale={locale}
        posts={posts}
        current={current.slug}
        labels={{ contents: t.blog.contents, contentsLabel: t.blog.contentsLabel }}
      />

      <article className="blog-post">
        <p className="blog-kicker">{current.category}</p>
        <h1 className="blog-title">{current.title}</h1>
        <time className="blog-when" dateTime={current.date}>
          {when}
        </time>
        {current.summary && <p className="blog-summary">{current.summary}</p>}

        {/* the post itself, as block HTML out of content/en/blog/<slug>.md */}
        <div className="blog-body" dangerouslySetInnerHTML={{ __html: current.bodyHtml }} />
      </article>
    </div>
  );
}
