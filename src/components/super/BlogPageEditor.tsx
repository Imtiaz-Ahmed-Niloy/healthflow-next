"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, RotateCcw, ChevronDown, ChevronUp, Star } from "lucide-react";
import { useBlogContent, type BlogContent, type Post } from "@/data/cmsBlog";

const BlogPageEditor = () => {
  const { content, save, reset } = useBlogContent();
  const [draft, setDraft] = useState<BlogContent>(content);
  const [dirty, setDirty] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  useEffect(() => { setDraft(content); setDirty(false); }, [content]);
  const upd = (n: BlogContent) => { setDraft(n); setDirty(true); };
  const onSave = () => { save(draft); setDirty(false); toast.success("Blog page updated"); };
  const onReset = () => { reset(); toast.success("Blog page reset"); };

  const bar = (
    <div className="flex items-center gap-2">
      <Btn variant="ghost" onClick={onReset}><span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" /> Reset</span></Btn>
      <Btn onClick={onSave} className={dirty ? "" : "opacity-60"}><span className="inline-flex items-center gap-1"><Save className="h-4 w-4" /> Save</span></Btn>
    </div>
  );

  const setMast = (p: Partial<BlogContent["masthead"]>) => upd({ ...draft, masthead: { ...draft.masthead, ...p } });
  const setNews = (p: Partial<BlogContent["newsletter"]>) => upd({ ...draft, newsletter: { ...draft.newsletter, ...p } });
  const setPost = (i: number, p: Partial<Post>) => upd({ ...draft, posts: draft.posts.map((x, ix) => ix === i ? { ...x, ...p } : x) });
  const delPost = (i: number) => upd({ ...draft, posts: draft.posts.filter((_, ix) => ix !== i) });
  const addPost = () => {
    const np: Post = {
      slug: `new-story-${Date.now()}`,
      title: "New story",
      dek: "Short description of the story.",
      category: draft.categories[1] ?? "Research",
      cover: "",
      author: "Dr. Author Name",
      authorPhoto: "",
      authorRole: "Specialty",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      readTime: 5,
      views: 0,
      body: ["Write the article body here. Each paragraph is a separate item."],
    };
    upd({ ...draft, posts: [np, ...draft.posts] });
    setOpenIdx(0);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.posts.length) return;
    const arr = [...draft.posts];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    upd({ ...draft, posts: arr });
  };
  const setFeatured = (i: number) => upd({ ...draft, posts: draft.posts.map((x, ix) => ({ ...x, featured: ix === i })) });

  return (
    <Tabs defaultValue="masthead" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="masthead">Masthead</TabsTrigger>
        <TabsTrigger value="sections">Sections</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="posts">Articles ({draft.posts.length})</TabsTrigger>
        <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
      </TabsList>

      <TabsContent value="masthead">
        <Card className="p-5 space-y-3">
          <SectionTitle title="Masthead" action={bar} />
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Volume / Issue</Label><Input value={draft.masthead.volume} onChange={e => setMast({ volume: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Editor line</Label><Input value={draft.masthead.editor} onChange={e => setMast({ editor: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Title</Label><Input value={draft.masthead.title} onChange={e => setMast({ title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Tagline</Label><Textarea rows={2} value={draft.masthead.tagline} onChange={e => setMast({ tagline: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Edition label</Label><Input value={draft.masthead.editionLabel} onChange={e => setMast({ editionLabel: e.target.value })} /></div>
        </Card>
      </TabsContent>

      <TabsContent value="sections">
        <Card className="p-5 space-y-3">
          <SectionTitle title="Section copy" action={bar} />
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Lead story eyebrow</Label><Input value={draft.leadEyebrow} onChange={e => upd({ ...draft, leadEyebrow: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>&quot;Most read&quot; title</Label><Input value={draft.trendingTitle} onChange={e => upd({ ...draft, trendingTitle: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Lead story closing line (appended after dek)</Label><Textarea rows={2} value={draft.leadKicker} onChange={e => upd({ ...draft, leadKicker: e.target.value })} /></div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Grid title (&quot;All Stories&quot;)</Label><Input value={draft.gridTitle} onChange={e => upd({ ...draft, gridTitle: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Empty results text</Label><Input value={draft.emptyText} onChange={e => upd({ ...draft, emptyText: e.target.value })} /></div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="categories">
        <Card className="p-5">
          <SectionTitle title="Categories" action={bar} />
          <p className="text-xs text-muted-foreground mb-3">First entry should be &quot;All&quot; — used as the default filter.</p>
          <div className="space-y-2">
            {draft.categories.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Input value={c} onChange={e => upd({ ...draft, categories: draft.categories.map((x, ix) => ix === i ? e.target.value : x) })} />
                <Btn variant="danger" onClick={() => upd({ ...draft, categories: draft.categories.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
              </div>
            ))}
          </div>
          <Btn variant="outline" className="mt-3" onClick={() => upd({ ...draft, categories: [...draft.categories, "New category"] })}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />Add category</span></Btn>
        </Card>
      </TabsContent>

      <TabsContent value="posts">
        <Card className="p-5">
          <SectionTitle title="Articles" action={
            <div className="flex items-center gap-2">
              <Btn variant="outline" onClick={addPost}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />New article</span></Btn>
              {bar}
            </div>
          } />
          <div className="space-y-3">
            {draft.posts.map((p, i) => {
              const open = openIdx === i;
              return (
                <div key={p.slug + i} className="rounded-xl border border-border/60">
                  <button type="button" onClick={() => setOpenIdx(open ? null : i)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    {p.featured && <Star className="h-4 w-4 text-primary-glow fill-primary-glow" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{p.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.category} · {p.author} · {p.date}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-4">
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>Title</Label><Input value={p.title} onChange={e => setPost(i, { title: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>Slug (URL)</Label><Input value={p.slug} onChange={e => setPost(i, { slug: e.target.value })} /></div>
                      </div>
                      <div className="space-y-1.5"><Label>Dek (summary)</Label><Textarea rows={2} value={p.dek} onChange={e => setPost(i, { dek: e.target.value })} /></div>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="space-y-1.5"><Label>Category</Label><Input value={p.category} onChange={e => setPost(i, { category: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>Date</Label><Input value={p.date} onChange={e => setPost(i, { date: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>Read time (min)</Label><Input type="number" value={p.readTime} onChange={e => setPost(i, { readTime: Number(e.target.value) || 0 })} /></div>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="space-y-1.5"><Label>Author name</Label><Input value={p.author} onChange={e => setPost(i, { author: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>Author role</Label><Input value={p.authorRole} onChange={e => setPost(i, { authorRole: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>Views</Label><Input type="number" value={p.views} onChange={e => setPost(i, { views: Number(e.target.value) || 0 })} /></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>Cover image URL</Label><Input value={p.cover} onChange={e => setPost(i, { cover: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>Author photo URL</Label><Input value={p.authorPhoto} onChange={e => setPost(i, { authorPhoto: e.target.value })} /></div>
                      </div>
                      <div className="space-y-1.5"><Label>Body (one paragraph per line)</Label>
                        <Textarea rows={8} value={p.body.join("\n\n")} onChange={e => setPost(i, { body: e.target.value.split(/\n\n+/).filter(Boolean) })} />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Btn variant="outline" onClick={() => setFeatured(i)} className={p.featured ? "opacity-60" : ""}>
                            <span className="inline-flex items-center gap-1"><Star className="h-4 w-4" />{p.featured ? "Featured" : "Set as lead"}</span>
                          </Btn>
                          <Btn variant="ghost" onClick={() => move(i, -1)}><ChevronUp className="h-4 w-4" /></Btn>
                          <Btn variant="ghost" onClick={() => move(i, 1)}><ChevronDown className="h-4 w-4" /></Btn>
                        </div>
                        <Btn variant="danger" onClick={() => delPost(i)}><span className="inline-flex items-center gap-1"><Trash2 className="h-4 w-4" />Delete</span></Btn>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="newsletter">
        <Card className="p-5 space-y-3">
          <SectionTitle title="Newsletter" action={bar} />
          <div className="space-y-1.5"><Label>Title</Label><Input value={draft.newsletter.title} onChange={e => setNews({ title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Subtitle</Label><Textarea rows={2} value={draft.newsletter.subtitle} onChange={e => setNews({ subtitle: e.target.value })} /></div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Input placeholder</Label><Input value={draft.newsletter.placeholder} onChange={e => setNews({ placeholder: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Button label</Label><Input value={draft.newsletter.buttonLabel} onChange={e => setNews({ buttonLabel: e.target.value })} /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Success toast title</Label><Input value={draft.newsletter.successTitle} onChange={e => setNews({ successTitle: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Success toast body</Label><Input value={draft.newsletter.successBody} onChange={e => setNews({ successBody: e.target.value })} /></div>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default BlogPageEditor;

