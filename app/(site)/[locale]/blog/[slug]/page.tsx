import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import BlogLayout from "@/components/BlogLayout";
import { site } from "@/content/content";
import { getBlogPosts } from "@/lib/content";
import {
  getDictionary,
  isLocale,
  languageAlternates,
  localePath,
  siteUrl,
} from "@/lib/i18n";

type PageParams = { params: Promise<{ locale: string; slug: string }> };

// The locale layout above this is the only other generateStaticParams on the
// site, and it sets dynamicParams = false — so a post not named here is not
// written to disk at all. Next calls this once per locale with that locale's
// params already resolved, which is why they arrive as a plain object here and
// as a Promise in the page below.
export function generateStaticParams({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return [];
  const posts = getBlogPosts(params.locale);

  // A blog with nothing in it cannot be built, and this is the only place that
  // can say so usefully. `output: export` has to write every page to disk, so
  // a dynamic route with no params to generate is not an empty route — it is a
  // route Next reports as having no generateStaticParams at all, which sends
  // you looking at this function rather than at the empty folder that caused
  // it. Deleting the last post is the way anyone hits this.
  if (posts.length === 0) {
    throw new Error(
      "content/en/blog holds no posts, and a statically exported site cannot " +
        "build /blog/<slug> with nothing to put in it. Add a .md file there — " +
        'see content/README.md, "Adding a blog post" — or remove the blog route ' +
        "and its link in components/SiteNav.tsx."
    );
  }

  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  const post = getBlogPosts(locale).find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: `${post.title} — ${site.name}`,
    description: post.summary ?? t.meta.blog.description,
    alternates: {
      canonical: `${siteUrl}${localePath(locale, `/blog/${slug}`)}/`,
      languages: languageAlternates(`/blog/${slug}`),
    },
  };
}

// One post, with the same index beside it. The index is why the whole list is
// loaded here and not just this one post — and why it costs nothing to: the
// loader reads the tree once per locale and keeps it.
export default async function BlogPostPage({ params }: PageParams) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const posts = getBlogPosts(locale);
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <main id="main" className="page blog">
      <SiteNav locale={locale} active="blog" />
      <BlogLayout locale={locale} posts={posts} current={post} />
      <SiteFooter locale={locale} />
    </main>
  );
}
