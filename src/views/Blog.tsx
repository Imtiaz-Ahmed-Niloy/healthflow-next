"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Calendar, Clock, ArrowRight, BookOpen, Tag, TrendingUp } from "lucide-react";

import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { useBlogPosts } from "@/data/blogPosts";
import type { BlogContent } from "@/data/blogContent";

const Blog = ({ chrome }: { chrome: BlogContent }) => {
  const { trendingTitle, leadEyebrow, leadKicker, gridTitle, emptyText } = chrome;
  const { content } = useBlogPosts();
  const { posts, categories } = content;
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState<"latest" | "popular">("latest");

  const filtered = useMemo(() => {
    let list = posts.filter(
      (p) =>
        (cat === "All" || p.category === cat) &&
        (p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.author.toLowerCase().includes(query.toLowerCase()) ||
          p.dek.toLowerCase().includes(query.toLowerCase())),
    );
    if (sort === "popular") list = [...list].sort((a, b) => b.views - a.views);
    return list;
  }, [query, cat, sort, posts]);

  const lead = posts.find((p) => p.featured) ?? posts[0];
  const trending = [...posts].sort((a, b) => b.views - a.views).slice(0, 4);

  

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>

        {/* Filter bar */}
        <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border/60">
          <div className="container mx-auto py-4 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles, authors, topics..."
                className="pl-9 rounded-full"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${cat === c ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-accent/40"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="ml-auto inline-flex rounded-full border border-border/60 p-0.5">
              {(["latest", "popular"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${sort === s ? "bg-primary text-primary-foreground" : "text-foreground/70"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lead story */}
        {cat === "All" && query === "" && (
          <section className="container mx-auto py-10 grid lg:grid-cols-12 gap-8 border-b border-border/60">
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-8 group"
            >
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-primary-glow font-bold">
                <TrendingUp className="h-3 w-3" /> {leadEyebrow} · {lead.category}
              </span>
              <Link href={`/blog/${lead.slug}`} className="block mt-3">
                <h2 className="font-display text-4xl md:text-5xl text-primary leading-[1.05] group-hover:underline decoration-primary/30 underline-offset-4">
                  {lead.title}
                </h2>
              </Link>
              <p className="text-base md:text-lg text-foreground/70 mt-4 leading-relaxed first-letter:font-display first-letter:text-5xl first-letter:float-left first-letter:mr-2 first-letter:leading-[0.85] first-letter:text-primary">
                {lead.dek} {leadKicker}
              </p>
              <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
                <img src={lead.cover} alt={lead.title} className="w-full h-[340px] object-cover transition-transform duration-700 group-hover:scale-[1.02]" loading="lazy" />
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <img src={lead.authorPhoto} alt={lead.author} className="h-8 w-8 rounded-full object-cover" loading="lazy" />
                <span className="font-semibold text-primary">{lead.author}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{lead.date}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{lead.readTime} min read</span>
              </div>
            </motion.article>

            {/* Trending sidebar */}
            <aside className="lg:col-span-4 lg:border-l lg:border-border/60 lg:pl-8">
              <h3 className="font-display text-xl text-primary border-b-2 border-primary/30 pb-2">{trendingTitle}</h3>
              <ol className="mt-4 space-y-5">
                {trending.map((t, i) => (
                  <li key={t.slug} className="flex gap-4 group">
                    <span className="font-display text-3xl text-primary/30 leading-none w-8">{String(i + 1).padStart(2, "0")}</span>
                    <Link href={`/blog/${t.slug}`} className="flex-1 border-b border-dashed border-border/60 pb-4">
                      <span className="text-[10px] uppercase tracking-widest text-primary-glow font-bold">{t.category}</span>
                      <h4 className="font-display text-base text-primary mt-1 leading-snug group-hover:underline">{t.title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-1">By {t.author} · {t.views.toLocaleString()} reads</p>
                    </Link>
                  </li>
                ))}
              </ol>
            </aside>
          </section>
        )}

        {/* Article grid */}
        <section className="container mx-auto py-12">
          <div className="flex items-end justify-between border-b-2 border-primary/30 pb-3 mb-8">
            <h2 className="font-display text-2xl text-primary inline-flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {cat === "All" ? gridTitle : cat}
            </h2>
            <span className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "article" : "articles"}</span>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-20 italic">{emptyText}</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {filtered.map((p, i) => (
                <motion.article
                  key={p.slug}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.45 }}
                  className="group flex flex-col"
                >
                  <Link href={`/blog/${p.slug}`} className="block overflow-hidden rounded-xl border border-border/60 mb-4">
                    <img
                      src={p.cover}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-52 object-cover grayscale-[15%] transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                    />
                  </Link>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.25em] text-primary-glow font-bold">
                    <Tag className="h-3 w-3" />{p.category}
                  </span>
                  <h3 className="font-display text-2xl text-primary mt-2 leading-tight group-hover:underline decoration-primary/30 underline-offset-4">
                    <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                  </h3>
                  <p className="text-sm text-foreground/70 mt-2 leading-relaxed line-clamp-3">{p.dek}</p>
                  <div className="mt-4 pt-4 border-t border-border/60 flex items-center gap-3">
                    <img src={p.authorPhoto} alt={p.author} className="h-9 w-9 rounded-full object-cover" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary truncate">{p.author}</p>
                      <p className="text-[10px] text-muted-foreground">{p.date} · {p.readTime} min read</p>
                    </div>
                    <Link href={`/blog/${p.slug}`} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Read">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;

