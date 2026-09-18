"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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

/**
 * The controls translate; the articles and page copy typed into them are
 * stored as written. A new article starts from English placeholder text,
 * which is content to overwrite rather than interface.
 */
const BlogPageEditor = () => {
  const t = useTranslations("super.cmsEditor");
  const tc = useTranslations("common");
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
      toast.success(t("blog.updated"));
    } catch (cause) {
      toast.error(describeError(cause, t("blog.saveFailed")));
    }
  };
  const onResetChrome = async () => {
    try {
      await resetChrome();
      setChromeDirty(false);
      toast.success(t("blog.reset"));
    } catch (cause) {
      toast.error(describeError(cause, t("blog.resetFailed")));
    }
  };
  const chromeBar = (
    <div className="flex items-center gap-2">
      <Btn variant="ghost" onClick={onResetChrome}><span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" /> {t("reset")}</span></Btn>
      <Btn onClick={onSaveChrome} className={chromeDirty ? "" : "opacity-60"}><span className="inline-flex items-center gap-1"><Save className="h-4 w-4" /> {t("save")}</span></Btn>
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
      toast.success(t("blog.articleSaved"));
    } catch (cause) {
      toast.error(describeError(cause, t("blog.articleSaveFailed")));
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
      toast.success(t("blog.articleCreated"));
    } catch (cause) {
      toast.error(describeError(cause, t("blog.articleCreateFailed")));
    }
  };

  const onDelete = async (post: BlogPost) => {
    try {
      await remove(post.id);
      discard(post);
      setConfirmDelete(null);
      toast.success(t("blog.articleDeleted"));
    } catch (cause) {
      toast.error(describeError(cause, t("blog.articleDeleteFailed")));
    }
  };

  const onFeature = async (post: BlogPost) => {
    try {
      await setFeatured(post);
      toast.success(t("blog.nowLead", { title: post.title }));
    } catch (cause) {
      toast.error(describeError(cause, t("blog.leadFailed")));
    }
  };

  return (
    <Tabs defaultValue="sections" className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="sections">{t("blog.sections")}</TabsTrigger>
        <TabsTrigger value="categories">{t("blog.categories")}</TabsTrigger>
        <TabsTrigger value="posts">{t("blog.articlesCount", { count: posts.length })}</TabsTrigger>
      </TabsList>

      <TabsContent value="sections">
        <Card className="p-5 space-y-3">
          <SectionTitle title={t("blog.sectionCopy")} action={chromeBar} />
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("blog.leadEyebrow")}</Label><Input value={chrome.leadEyebrow} onChange={e => updChrome({ ...chrome, leadEyebrow: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("blog.trendingTitle")}</Label><Input value={chrome.trendingTitle} onChange={e => updChrome({ ...chrome, trendingTitle: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>{t("blog.leadKicker")}</Label><Textarea rows={2} value={chrome.leadKicker} onChange={e => updChrome({ ...chrome, leadKicker: e.target.value })} /></div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("blog.gridTitle")}</Label><Input value={chrome.gridTitle} onChange={e => updChrome({ ...chrome, gridTitle: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t("blog.emptyText")}</Label><Input value={chrome.emptyText} onChange={e => updChrome({ ...chrome, emptyText: e.target.value })} /></div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="categories">
        <Card className="p-5">
          <SectionTitle title={t("blog.categories")} action={chromeBar} />
          <p className="text-xs text-muted-foreground mb-3">{t("blog.categoriesHint")}</p>
          <div className="space-y-2">
            {chrome.categories.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Input value={c} onChange={e => updChrome({ ...chrome, categories: chrome.categories.map((x, ix) => ix === i ? e.target.value : x) })} />
                <Btn variant="danger" onClick={() => updChrome({ ...chrome, categories: chrome.categories.filter((_, ix) => ix !== i) })}><Trash2 className="h-4 w-4" /></Btn>
              </div>
            ))}
          </div>
          <Btn variant="outline" className="mt-3" onClick={() => updChrome({ ...chrome, categories: [...chrome.categories, "New category"] })}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />{t("blog.addCategory")}</span></Btn>
        </Card>
      </TabsContent>

      <TabsContent value="posts">
        <Card className="p-5">
          <SectionTitle title={t("blog.articles")} action={
            <Btn variant="outline" onClick={addPost}><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" />{t("blog.newArticle")}</span></Btn>
          } />

          {isLoading && posts.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("blog.loading")}</p>
          )}
          {isError && (
            <div className="py-10 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive/60 mx-auto mb-2" />
              <p className="text-sm font-semibold text-primary">{t("blog.loadFailed")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("reload")}</p>
            </div>
          )}
          {!isLoading && !isError && posts.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("blog.none")}</p>
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
                    {dirty && <span className="text-[10px] font-bold tracking-widest text-primary-glow uppercase">{t("blog.unsaved")}</span>}
                    <span className="text-xs text-muted-foreground">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-4">
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>{t("title")}</Label><Input value={p.title} onChange={e => setField(post, { title: e.target.value })} /></div>
                        <div className="space-y-1.5">
                          <Label>{t("blog.slug")}</Label>
                          <Input value={p.slug} onChange={e => setField(post, { slug: e.target.value })} />
                          <p className="text-xs text-muted-foreground">{t("blog.slugHint")}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5"><Label>{t("blog.dek")}</Label><Textarea rows={2} value={p.dek} onChange={e => setField(post, { dek: e.target.value })} /></div>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="space-y-1.5"><Label>{t("blog.category")}</Label><Input value={p.category} onChange={e => setField(post, { category: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>{t("blog.published")}</Label><Input type="date" value={p.published_at} onChange={e => setField(post, { published_at: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>{t("blog.readTime")}</Label><Input type="number" value={p.read_time} onChange={e => setField(post, { read_time: Number(e.target.value) || 0 })} /></div>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="space-y-1.5"><Label>{t("blog.authorName")}</Label><Input value={p.author} onChange={e => setField(post, { author: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>{t("blog.authorRole")}</Label><Input value={p.author_role} onChange={e => setField(post, { author_role: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>{t("blog.views")}</Label><Input type="number" value={p.views} onChange={e => setField(post, { views: Number(e.target.value) || 0 })} /></div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>{t("blog.cover")}</Label><Input value={p.cover} onChange={e => setField(post, { cover: e.target.value })} /></div>
                        <div className="space-y-1.5"><Label>{t("blog.authorPhoto")}</Label><Input value={p.author_photo} onChange={e => setField(post, { author_photo: e.target.value })} /></div>
                      </div>
                      <div className="space-y-1.5"><Label>{t("blog.body")}</Label>
                        <Textarea rows={8} value={p.body.join("\n\n")} onChange={e => setField(post, { body: e.target.value.split(/\n\n+/).filter(Boolean) })} />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Btn variant="outline" onClick={() => onFeature(post)} className={post.featured ? "opacity-60" : ""}>
                            <span className="inline-flex items-center gap-1"><Star className="h-4 w-4" />{post.featured ? t("blog.leadStory") : t("blog.setLead")}</span>
                          </Btn>
                          {dirty && (
                            <Btn variant="ghost" onClick={() => discard(post)}>
                              <span className="inline-flex items-center gap-1"><RotateCcw className="h-4 w-4" />{t("blog.discard")}</span>
                            </Btn>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Btn variant="danger" onClick={() => setConfirmDelete(post)}><span className="inline-flex items-center gap-1"><Trash2 className="h-4 w-4" />{tc("delete")}</span></Btn>
                          <Btn onClick={() => savePost(post)} className={dirty ? "" : "opacity-60"}>
                            <span className="inline-flex items-center gap-1"><Save className="h-4 w-4" />{t("save")}</span>
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
            <DialogTitle>{t("blog.deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("blog.deleteBody", { title: confirmDelete?.title ?? "", slug: confirmDelete?.slug ?? "" })}
          </p>
          <DialogFooter>
            <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>{tc("cancel")}</Btn>
            <Btn variant="danger" onClick={() => confirmDelete && onDelete(confirmDelete)}>{tc("delete")}</Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

export default BlogPageEditor;
