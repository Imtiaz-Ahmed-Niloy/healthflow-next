import { notFound } from "next/navigation";
import BlogDetail from "@/views/BlogDetail";
import { requirePublishedPage } from "@/lib/cms/pages";
import { getBlogPost, getBlogPosts } from "@/lib/cms/blogPosts";

// Revalidate every 60s, in step with the rest of the CMS-backed pages.
export const revalidate = 60;

// Prerender the articles that exist at build time. An article added later is
// still served — Next renders it on first request and caches it from there.
export const generateStaticParams = async () =>
  (await getBlogPosts()).map((post) => ({ slug: post.slug }));

// Next 15 hands params in as a Promise — see docs/module-guide.md.
const Page = async ({ params }: { params: Promise<{ slug: string }> }) => {
  // A drafted /blog takes its articles down with it.
  await requirePublishedPage("blog");

  const { slug } = await params;
  const post = await getBlogPost(slug);

  // Previously this rendered a "Story not found" panel with a 200. A missing
  // article is a 404, which is what a crawler and a monitor both expect.
  if (!post) notFound();

  const posts = await getBlogPosts();

  return <BlogDetail post={post} posts={posts} />;
};

export default Page;

