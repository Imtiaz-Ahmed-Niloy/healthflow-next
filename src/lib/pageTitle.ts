import type { Metadata } from "next";
import { getBlogPost } from "@/lib/cms/blogPosts";
import { titles } from "@/i18n/messages/en/titles.json";

type TitleKey = keyof typeof titles;
export type SlugProps = { params: Promise<{ slug: string }> };

/**
 * A page's browser-tab title.
 *
 *   export const generateMetadata = pageTitle("pricing");
 *
 * The root layout's template adds the brand, so this reads "Pricing |
 * HealthFlow". Always English, whichever language the page is in — which is
 * why the words are read straight from the English file and are not part of
 * the translated messages. A page with no generateMetadata shows the brand
 * alone.
 */
export const pageTitle = (key: TitleKey) => async (): Promise<Metadata> => ({ title: titles[key] });

// A slug from a Bangla name arrives percent-encoded.
export const readSlug = async ({ params }: SlugProps) => {
  const { slug } = await params;
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
};

/** /blog/[slug]: the article's own title, or "Blog" for one that is not there. */
export const blogPostTitle = async (props: SlugProps): Promise<Metadata> => {
  const post = await getBlogPost(await readSlug(props));
  return post?.title ? { title: post.title } : pageTitle("blog")();
};

