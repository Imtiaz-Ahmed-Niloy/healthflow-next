'use client';
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, Eye, Share2, Bookmark, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useBlogContent, getBlogPost } from "@/data/cmsBlog";

const imageSrc = (src: { src: string } | string) => (typeof src === "string" ? src : src.src);

const BlogDetail = () => {
  const params = useParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] ?? "" : params.slug ?? "";
  const { content } = useBlogContent();
  const posts = content.posts;
  const post = posts.find(p => p.slug === slug) ?? getBlogPost(slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto py-32 text-center">
          <h1 className="font-display text-4xl text-primary">Story not found</h1>
          <Link href="/blog" className="mt-6 inline-flex items-center gap-2 text-primary"><ArrowLeft className="h-4 w-4" /> Back to The Healing Times</Link>
        </main>      </div>
    );
  }

  const related = posts.filter((p) => p.slug !== post.slug && p.category === post.category).slice(0, 3);
  const fallback = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const suggestions = related.length ? related : fallback;

  return (
    <div className="min-h-screen bg-background">      <main>
        <article className="container mx-auto max-w-3xl pt-12 pb-16">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3 w-3" /> The Healing Times
          </Link>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-6">
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-primary-glow">{post.category}</span>
            <h1 className="font-display text-4xl md:text-6xl text-primary mt-3 leading-[1.05]">{post.title}</h1>
            <p className="text-lg text-foreground/70 mt-5 leading-relaxed italic">{post.dek}</p>
          </motion.div>

          <div className="mt-8 flex flex-wrap items-center gap-4 pb-6 border-b border-border/60">
            <img src={imageSrc(post.authorPhoto)} alt={post.author} className="h-11 w-11 rounded-full object-cover" loading="lazy" />
            <div>
              <p className="text-sm font-semibold text-primary">{post.author}</p>
              <p className="text-xs text-muted-foreground">{post.authorRole}</p>
            </div>
            <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{post.date}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{post.readTime} min</span>
              <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{post.views.toLocaleString()}</span>
            </div>
          </div>

          <motion.img
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
            src={imageSrc(post.cover)}
            alt={post.title}
            className="mt-8 w-full rounded-2xl border border-border/60 aspect-[16/9] object-cover"
            loading="lazy"
          />

          <div className="mt-10 space-y-6 text-lg leading-relaxed text-foreground/85">
            <p className="first-letter:font-display first-letter:text-6xl first-letter:float-left first-letter:mr-3 first-letter:leading-[0.8] first-letter:text-primary">
              {post.body[0]}
            </p>
            {post.body.slice(1).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <blockquote className="border-l-4 border-primary-glow pl-6 my-8 font-display text-2xl text-primary italic">
              &quot;Design is medicine. The walls, the windows, and the air are instruments of healing - and the data finally proves it.&quot;
            </blockquote>
          </div>

          <div className="mt-10 flex items-center gap-3">
            <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Link copied"); }} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary hover:bg-accent/40">
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            <button onClick={() => toast.success("Saved to your reading list")} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary hover:bg-accent/40">
              <Bookmark className="h-3.5 w-3.5" /> Save
            </button>
          </div>
        </article>

        <section className="border-t border-border/60 bg-accent/10">
          <div className="container mx-auto max-w-5xl py-14">
            <h2 className="font-display text-2xl text-primary border-b-2 border-primary/30 pb-2 mb-8">More from The Healing Times</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {suggestions.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="group">
                  <img src={imageSrc(p.cover)} alt={p.title} loading="lazy" className="w-full h-40 rounded-xl object-cover border border-border/60 group-hover:scale-[1.02] transition-transform" />
                  <span className="mt-3 inline-block text-[10px] uppercase tracking-[0.25em] font-bold text-primary-glow">{p.category}</span>
                  <h3 className="font-display text-lg text-primary mt-1 leading-tight group-hover:underline">{p.title}</h3>
                  <p className="text-xs text-muted-foreground mt-2 inline-flex items-center gap-1">By {p.author} <ArrowRight className="h-3 w-3" /></p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BlogDetail;



