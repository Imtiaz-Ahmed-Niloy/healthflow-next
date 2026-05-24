'use client';
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Search, Calendar, Clock, ArrowRight, BookOpen, Tag, TrendingUp, Mail } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { posts, categories } from "@/data/blog";

const Blog = () => {
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
  }, [query, cat, sort]);

  const lead = posts.find((p) => p.featured) ?? posts[0];
  const trending = [...posts].sort((a, b) => b.views - a.views).slice(0, 4);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen bg-background"><main>
        {/* Masthead */}
        <header className="border-b-4 border-double border-primary/30 bg-gradient-to-b from-accent/30 to-background">
          <div className="container mx-auto pt-10 pb-6">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              <span>Vol. XII · No. 142</span>
              <span className="hidden md:inline">{today}</span>
              <span>Edited in Portland, OR</span>
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display text-center text-5xl md:text-7xl lg:text-8xl text-primary mt-4 leading-none tracking-tight"
              style={{ fontVariant: "small-caps" }}
            >
              The Healing Times
            </motion.h1>
            <p className="text-center text-xs italic text-muted-foreground mt-3">
              Long-form journalism from the doctors of HealthFlow — research, opinion, and notes from the ward.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest">
              <span className="h-px w-12 bg-primary/30" />
              <span className="text-primary font-semibold">Daily Edition</span>
              <span className="h-px w-12 bg-primary/30" />
            </div>
          </div>
        </header>

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
                <TrendingUp className="h-3 w-3" /> Lead Story · {lead.category}
              </span>
              <Link href={`/blog/${lead.slug}`} className="block mt-3">
                <h2 className="font-display text-4xl md:text-5xl text-primary leading-[1.05] group-hover:underline decoration-primary/30 underline-offset-4">
                  {lead.title}
                </h2>
              </Link>
              <p className="text-base md:text-lg text-foreground/70 mt-4 leading-relaxed first-letter:font-display first-letter:text-5xl first-letter:float-left first-letter:mr-2 first-letter:leading-[0.85] first-letter:text-primary">
                {lead.dek} It's the kind of finding that makes the architecture of care matter as much as the medicine itself —
                a reminder that walls, windows and air can be instruments of healing.
              </p>
              <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
                <Image src={lead.cover} alt={lead.title} width={1200} height={680} className="w-full h-[340px] object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <Image src={lead.authorPhoto} alt={lead.author} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                <span className="font-semibold text-primary">{lead.author}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{lead.date}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{lead.readTime} min read</span>
              </div>
            </motion.article>

            {/* Trending sidebar */}
            <aside className="lg:col-span-4 lg:border-l lg:border-border/60 lg:pl-8">
              <h3 className="font-display text-xl text-primary border-b-2 border-primary/30 pb-2">Most Read</h3>
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
              {cat === "All" ? "All Stories" : cat}
            </h2>
            <span className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "article" : "articles"}</span>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-20 italic">No stories match your search. Try another keyword.</p>
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
                    <Image
                      src={p.cover}
                      alt={p.title}
                      width={640}
                      height={360}
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
                    <Image src={p.authorPhoto} alt={p.author} width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
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

        {/* Newsletter */}
        <section className="border-t-4 border-double border-primary/30 bg-accent/20">
          <div className="container mx-auto py-14 text-center max-w-2xl">
            <Mail className="h-6 w-6 text-primary mx-auto" />
            <h3 className="font-display text-3xl text-primary mt-3">Subscribe to the Sunday Edition</h3>
            <p className="text-sm text-muted-foreground mt-2">A weekly digest of our doctors' best long-reads, delivered with your morning coffee.</p>
            <form onSubmit={(e) => { e.preventDefault(); toast.success("Subscribed!", { description: "Check your inbox to confirm." }); (e.target as HTMLFormElement).reset(); }} className="mt-6 flex max-w-md mx-auto rounded-full border border-primary/30 bg-card p-1.5">
              <input required type="email" placeholder="your@email.com" className="flex-1 bg-transparent px-4 text-sm outline-none" />
              <button className="rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors">Subscribe</button>
            </form>
          </div>
        </section>
      </main></div>
  );
};

export default Blog;
