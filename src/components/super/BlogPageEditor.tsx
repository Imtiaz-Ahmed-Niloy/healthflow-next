"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, RotateCcw, ChevronDown, ChevronUp, Star } from "lucide-react";
import type { BlogContent } from "@/data/blogContent";
import { useBlogContent } from "@/data/useBlogContent";
import { useBlogPosts, type Post } from "@/data/blogPosts";

const describeError = (cause: unknown, fallback: string) =>
  (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;

const BlogPageEditor = () => {
  // Page chrome — masthead, section copy, newsletter. DB-backed (cms_pages, slug="blog").
  const { content: chromeContent, save: saveChrome, reset: resetChrome } = useBlogContent();
  const [chrome, setChrome] = useState<BlogContent>(chromeContent);
  const [chromeDirty, setChromeDirty] = useState(false);

  useEffect(() => {
    if (chromeDirty) return;
    setChrome(chromeContent);
  }, [chromeContent, chromeDirty]);

  const updChrome = (n: BlogContent) => { setChrome(n); setChromeDirty(true); };
  const onSaveChrome = async () => {
    try {
      await saveChrome(chrome);
      setChromeDirty(false);
      toast.success("Blog page updated");
    } catch (cause) {
      toast.error(describeError(cause, "Could not save blog page"));
    }
  };
  const onResetChrome = async () => {
    try {
      await resetChrome();
      setChromeDirty(false);
      toast.success("Blog page reset");
    } catch (cause) {
      toast.error(describeError(cause, "Could not reset blog page"));
    }
  };
  const chromeBar = (
    <div className="flex items-center gap-2">
      <Btn variant="ghost" onClick={onResetChrome}><span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" /> Reset</span></Btn>
      <Btn onClick={onSaveChrome} className={chromeDirty ? "" : "opacity-60"}><span className="inline-flex items-center gap-1"><Save className="h-4 w-4" /> Save</span></Btn>
    </div>
  );
  // Categories + individual posts — out of scope for this migration (tracked
  // separately as cms_blog_posts). Unchanged: still localStorage-backed.
  const { content: postsContent, save: savePosts, reset: resetPosts } = useBlogPosts();
  const [postsDraft, setPostsDraft] = useState(postsContent);
  const [postsDirty, setPostsDirty] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  useEffect(() => {
    if (postsDirty) return;
    setPostsDraft(postsContent);
  }, [postsContent, postsDirty]);

  const updPosts = (n: typeof postsDraft) => { setPostsDraft(n); setPostsDirty(true); };
  const onSavePosts = () => { savePosts(postsDraft); setPostsDirty(false); toast.success("Blog articles updated"); };
  const onResetPosts = () => { resetPosts(); setPostsDirty(false); toast.success("Blog articles reset"); };
  const postsBar = (
    <div className="flex items-center gap-2">
      <Btn variant="ghost" onClick={onResetPosts}><span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" /> Reset</span></Btn>
      <Btn onClick={onSavePosts} className={postsDirty ? "" : "opacity-60"}><span className="inline-flex items-center gap-1"><Save className="h-4 w-4" /> Save</span></Btn>
    </div>
  );

  const setPost = (i: number, p: Partial<Post>) => updPosts({ ...postsDraft, posts: postsDraft.posts.map((x, ix) => ix === i ? { ...x, ...p } : x) });
  const delPost = (i: number) => updPosts({ ...postsDraft, posts: postsDraft.posts.filter((_, ix) => ix !== i) });
  const addPost = () => {
    const np: Post = {
      slug: `new-story-${Date.now()}`,
      title: "New story",
      dek: "Short description of the story.",
      category: postsDraft.categories[1] ?? "Research",
      cover: "",
      author: "Dr. Author Name",
      authorPhoto: "",
      authorRole: "Specialty",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      readTime: 5,
      views: 0,
      body: ["Write the article body here. Each paragraph is a separate item."],
    };
    updPosts({ ...postsDraft, posts: [np, ...postsDraft.posts] });
    setOpenIdx(0);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= postsDraft.posts.length) return;
    const arr = [...postsDraft.posts];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    updPosts({ ...postsDraft, posts: arr });
  };
  const setFeatured = (i: number) => updPosts({ ...postsDraft, posts: postsDraft.posts.map((x, ix) => ({ ...x, featured: ix === i })) });

  return (
    <Tabs defaultValue="sections" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="sections">Sections</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="posts">Articles ({postsDraft.posts.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="sections">
        <Card className="p-5 space-y-3">
          <SectionTitle title="Section copy" action={chromeBar} />
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Lead story eyebrow</Label><Input value={chrome.leadEyebrow} onChange={e => updChrome({ ...chrome, leadEyebrow: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>&quot;Most read&quot; title</Label><Input value={chrome.trendingTitle} onChange={e => updChrome({ ...chrome, trendingTitle: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Lead story closing line (appended after dek)</Label><Textarea rows={2} value={chrome.leadKicker} onChange={e => updChrome({ ...chrome, leadKicker: e.target.value })} /></div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Grid title (&quot;All Stories&quot;)</Label><Input value={chrome.gridTitle} onChange={e => updChrome({ ...chrome, gridTitle: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Empty results text</Label><Input value={chrome.emptyText} onChange={e => updChrome({ ...chrome, emptyText: e.target.value })} /></div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="categories">
        <Card className="p-5">
          <SectionTitle title="Categories" action={postsBar} />
          <p className="text-xs text-muted-foreground mb-3">First entry should be &quot;All&quot; — used as the default filter.</p>
          <div className="space-y-2">
            {postsDraft.categories.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Input value={c} onChange={e => updPosts({ ...postsDraft, categories: postsDraft.categories.map((x, ix) => ix === i ? e.target.value : x) })} />
                <Btn variant="danger" onClick={() => updPosts({ ...postsDraft, categories: postsDraft.categories.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
              </div>
            ))}
          </div>
          <Btn variant="outline" className="mt-3" onClick={() => updPosts({ ...postsDraft, categories: [...postsDraft.categories, "New category"] })}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />Add category</span></Btn>
        </Card>
      </TabsContent>

      <TabsContent value="posts">
        <Card className="p-5">
          <SectionTitle title="Articles" action={
            <div className="flex items-center gap-2">
              <Btn variant="outline" onClick={addPost}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />New article</span></Btn>
              {postsBar}
            </div>
          } />
          <div className="space-y-3">
            {postsDraft.posts.map((p, i) => {
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
    </Tabs>
  );
};

export default BlogPageEditor;
