"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, SectionTitle, Btn } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Save, RotateCcw, ChevronDown, ChevronUp, Star, AlertTriangle } from "lucide-react";
import type { BlogContent } from "@/data/blogContent";
import { useBlogContent } from "@/data/useBlogContent";
import { useBlogPosts } from "@/data/blogPosts";
import { formatPostDate, todayIso, type BlogPost } from "@/data/blogPost";

const describeError = (cause: unknown, fallback: string) =>
  (cause as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;

const BlogPageEditor = () => {
  // Page chrome — masthead, section copy, categories, newsletter. DB-backed
  // (cms_pages, slug="blog").
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

  // Articles — rows in cms_blog_posts. Each one saves on its own, so a long
  // edit to one story can't be lost by someone else saving another.
  const { posts, isLoading, isError, create, update, remove, setFeatured } = useBlogPosts();
  const [edits, setEdits] = useState<Record<string, Partial<BlogPost>>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BlogPost | null>(null);

  const draftOf = (post: BlogPost): BlogPost => ({ ...post, ...edits[post.id] });
  const isDirty = (post: BlogPost) => Boolean(edits[post.id]);
  const setField = (post: BlogPost, patch: Partial<BlogPost>) =>
    setEdits(e => ({ ...e, [post.id]: { ...e[post.id], ...patch } }));
  const discard = (post: BlogPost) =>
    setEdits(e => Object.fromEntries(Object.entries(e).filter(([id]) => id !== post.id)));

  const savePost = async (post: BlogPost) => {
    const d = draftOf(post);
    try {
      await update(post.id, {
        slug: d.slug,
        title: d.title,
        dek: d.dek,
        category: d.category,
        cover: d.cover,
        author: d.author,
        author_photo: d.author_photo,
        author_role: d.author_role,
        body: d.body,
        published_at: d.published_at,
        read_time: d.read_time,
        views: d.views,
      });
      discard(post);
      toast.success("Article saved");
    } catch (cause) {
      toast.error(describeError(cause, "Could not save the article"));
    }
  };

  const addPost = async () => {
    try {
      const created = await create({
        slug: `new-story-${Date.now()}`,
        title: "New story",
        dek: "Short description of the story.",
        category: chrome.categories[1] ?? "Research",
        author: "Dr. Author Name",
        author_role: "Specialty",
        published_at: todayIso(),
        read_time: 5,
        body: ["Write the article body here. Each paragraph is a separate item."],
      });
      const row = (created as { data?: BlogPost })?.data;
      if (row) setOpenId(row.id);
      toast.success("Article created");
    } catch (cause) {
      toast.error(describeError(cause, "Could not create the article"));
    }
  };

  const onDelete = async (post: BlogPost) => {
    try {
      await remove(post.id);
      discard(post);
      setConfirmDelete(null);
      toast.success("Article deleted");
    } catch (cause) {
      toast.error(describeError(cause, "Could not delete the article"));
    }
  };

  const onFeature = async (post: BlogPost) => {
    try {
      await setFeatured(post);
      toast.success(`"${post.title}" is now the lead story`);
    } catch (cause) {
      toast.error(describeError(cause, "Could not set the lead story"));
    }
  };

  return (
    <Tabs defaultValue="sections" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="sections">Sections</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="posts">Articles ({posts.length})</TabsTrigger>
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
          <SectionTitle title="Categories" action={chromeBar} />
          <p className="text-xs text-muted-foreground mb-3">
            The filter bar on /blog. First entry should be &quot;All&quot; — it is the default and shows
            every article. The rest have to match an article&apos;s category exactly to filter anything.
          </p>
          <div className="space-y-2">
            {chrome.categories.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Input value={c} onChange={e => updChrome({ ...chrome, categories: chrome.categories.map((x, ix) => ix === i ? e.target.value : x) })} />
                <Btn variant="danger" onClick={() => updChrome({ ...chrome, categories: chrome.categories.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
              </div>
            ))}
          </div>
          <Btn variant="outline" className="mt-3" onClick={() => updChrome({ ...chrome, categories: [...chrome.categories, "New category"] })}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />Add category</span></Btn>
        </Card>
      </TabsContent>

      <TabsContent value="posts">
        <Card className="p-5">
          <SectionTitle title="Articles" action={
            <Btn variant="outline" onClick={addPost}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />New article</span></Btn>
          } />

          {isLoading && posts.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading articles…</p>
          )}
          {isError && (
            <div className="py-10 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive/60 mx-auto mb-2" />
              <p className="text-sm font-semibold text-primary">Could not load the articles</p>
              <p className="text-xs text-muted-foreground mt-1">Reload the page to try again.</p>
            </div>
          )}
          {!isLoading && !isError && posts.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No articles yet. &quot;New article&quot; starts one.
            </p>
          )}

          <div className="space-y-3">
            {posts.map(post => {
              const p = draftOf(post);
              const open = openId === post.id;
              const dirty = isDirty(post);
              return (
                <div key={post.id} className="rounded-xl border border-border/60">
                  <button type="button" onClick={() => setOpenId(open ? null : post.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    {post.featured && <Star className="h-4 w-4 text-primary-glow fill-primary-glow" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">{p.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {p.category} · {p.author} · {formatPostDate(p.published_at)}
                      </p>
                    </div>
                    {dirty && <span className="text-[10px] font-bold tracking-widest text-primary-glow">UNSAVED</span>}
                    <span className="text-xs text-muted-foreground">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-4">
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>Title</Label><Input value={p.title} onChange={e => setField(post, { title: e.target.value })} /></div>
                        <div className="space-y-1.5">
                          <Label>Slug (URL)</Label>
                          <Input value={p.slug} onChange={e => setField(post, { slug: e.target.value })} />
                          <p className="text-xs text-muted-foreground">
                            Lower-case, hyphens. Changing it changes the article&apos;s address and breaks
                            any existing link to it.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1.5"><Label>Dek (summary)</Label><Textarea rows={2} value={p.dek} onChange={e => setField(post, { dek: e.target.value })} /></div>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="space-y-1.5"><Label>Category</Label><Input value={p.category} onChange={e => setField(post, { category: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>Published</Label><Input type="date" value={p.published_at} onChange={e => setField(post, { published_at: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>Read time (min)</Label><Input type="number" value={p.read_time} onChange={e => setField(post, { read_time: Number(e.target.value) || 0 })} /></div>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="space-y-1.5"><Label>Author name</Label><Input value={p.author} onChange={e => setField(post, { author: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>Author role</Label><Input value={p.author_role} onChange={e => setField(post, { author_role: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>Views</Label><Input type="number" value={p.views} onChange={e => setField(post, { views: Number(e.target.value) || 0 })} /></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>Cover image URL</Label><Input value={p.cover} onChange={e => setField(post, { cover: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>Author photo URL</Label><Input value={p.author_photo} onChange={e => setField(post, { author_photo: e.target.value })} /></div>
                      </div>
                      <div className="space-y-1.5"><Label>Body (one paragraph per blank line)</Label>
                        <Textarea rows={8} value={p.body.join("\n\n")} onChange={e => setField(post, { body: e.target.value.split(/\n\n+/).filter(Boolean) })} />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Btn variant="outline" onClick={() => onFeature(post)} className={post.featured ? "opacity-60" : ""}>
                            <span className="inline-flex items-center gap-1"><Star className="h-4 w-4" />{post.featured ? "Lead story" : "Set as lead"}</span>
                          </Btn>
                          {dirty && (
                            <Btn variant="ghost" onClick={() => discard(post)}>
                              <span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" />Discard</span>
                            </Btn>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Btn variant="danger" onClick={() => setConfirmDelete(post)}><span className="inline-flex items-center gap-1"><Trash2 className="h-4 w-4" />Delete</span></Btn>
                          <Btn onClick={() => savePost(post)} className={dirty ? "" : "opacity-60"}>
                            <span className="inline-flex items-center gap-1"><Save className="h-4 w-4" />Save</span>
                          </Btn>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </TabsContent>

      <Dialog open={!!confirmDelete} onOpenChange={o => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this article?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &quot;{confirmDelete?.title}&quot; comes off the public blog immediately, and
            /blog/{confirmDelete?.slug} starts returning not found. This cannot be undone.
          </p>
          <DialogFooter>
            <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => confirmDelete && onDelete(confirmDelete)}>Delete</Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

export default BlogPageEditor;
