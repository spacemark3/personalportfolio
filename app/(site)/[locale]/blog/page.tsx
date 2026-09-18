import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import BlogLayout from "@/components/BlogLayout";
import { getBlogPosts } from "@/lib/content";
import {
  getDictionary,
  isLocale,
  languageAlternates,
  localePath,
  siteUrl,
} from "@/lib/i18n";

type PageParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: t.meta.blog.title,
    description: t.meta.blog.description,
    alternates: {
      // Self-canonical, although this page shows the same post as
      // /blog/<newest>/. Pointing it at the post instead would leave the
      // hreflang tags below describing a different URL than the canonical,
      // which is worse than the duplicate: the two have their own titles and
      // descriptions, which is what tells them apart.
      canonical: `${siteUrl}${localePath(locale, "/blog")}/`,
      languages: languageAlternates("/blog"),
    },
  };
}

// The blog's front door: the newest post, with the index of everything else
// beside it. There is no separate list page — the index IS the list, and it is
// on screen the whole time, so a page whose only job was to link to posts
// would be a second copy of something already in view.
//
// No empty state here, unlike the journey's: the sibling /blog/<slug> route
// refuses to build at all with no posts (see its generateStaticParams), so a
// blog that has nothing in it never reaches a browser to need one.
export default async function BlogPage({ params }: PageParams) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const posts = getBlogPosts(locale);

  return (
    <main id="main" className="page blog">
      <SiteNav locale={locale} active="blog" />
      <BlogLayout locale={locale} posts={posts} current={posts[0]} />
      <SiteFooter locale={locale} />
    </main>
  );
}
