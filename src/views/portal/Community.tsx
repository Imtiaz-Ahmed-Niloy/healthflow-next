"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Heart, MessageCircle, Lightbulb, ThumbsUp, Send, Image as ImageIcon, X, Search,
  Loader2, AlertCircle, Trash2, Users,
} from "lucide-react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { useAppDispatch } from "@/redux/hooks";
import { invalidateResource } from "@/redux/api/createResourceApi";
import { mediaUrl } from "@/lib/media";
import { formatDate, formatTime } from "@/lib/appSettings";
import {
  communityPostsApi, communityCommentsApi, communityReactionsApi,
  type CommunityPostRow, type CommunityDoctor, type CommunityPublicDoctor,
} from "@/redux/api/resources";

/**
 * The doctors' feed, on `community_posts` / `community_comments` /
 * `community_reactions` (0059).
 *
 * What this replaces was the worst demo page in the app: posts, comments and
 * reactions lived in component state, so a doctor could write a case
 * discussion, watch two colleagues appear to reply — they were seeded — hit
 * refresh, and find the whole thread gone. Three fictional doctors greeted
 * every user of every hospital with the same three posts, and the header
 * claimed "2,148 doctors · 47 today".
 *
 * The feed is every doctor on HealthFlow, not one hospital's (0060). Where an
 * author works is shown beside their name, because the colleague answering your
 * question may be at another hospital entirely. What is NOT shared is anything
 * a post refers to: patients, appointments and prescriptions stay tenant-scoped.
 */

type Category = CommunityPostRow["category"];
type Reaction = "like" | "love" | "insightful";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "discussion", label: "Discussion" },
  { value: "question", label: "Question" },
  { value: "case_study", label: "Case Study" },
  { value: "thought", label: "Thought" },
];

const categoryLabel = (value: Category) =>
  CATEGORIES.find((c) => c.value === value)?.label ?? value;

const REACTIONS: { value: Reaction; label: string; icon: typeof ThumbsUp }[] = [
  { value: "like", label: "Like", icon: ThumbsUp },
  { value: "love", label: "Love", icon: Heart },
  { value: "insightful", label: "Insightful", icon: Lightbulb },
];

const FALLBACK_AVATAR = "/assets/doctor-avatar.jpg";

/**
 * What the server actually said. A generic "please try again" on a reaction is
 * indistinguishable from the button doing nothing at all, which is exactly how
 * this went wrong the first time.
 */
const reason = (cause: unknown) =>
  (cause as { data?: { error?: { message?: string } } })?.data?.error?.message
  ?? (cause as { error?: string })?.error
  ?? "Please try again.";

/** "2h ago" up to a day, then the real date — a week-old post saying "168h ago" helps nobody. */
const when = (iso: string) => {
  const then = new Date(iso);
  const minutes = Math.floor((Date.now() - then.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`;
  return `${formatDate(then)} · ${formatTime(then)}`;
};

type Me = { id: string; name: string; specialty: string | null; photo_url: string | null } | null;

/**
 * Who wrote a post or a comment.
 *
 * Two embeds arrive and either can be null: `doctors` is tenant-scoped, so it
 * fills in for your own colleagues; `doctors_public` reaches across hospitals
 * and carries the hospital's name, but covers only active doctors at approved
 * ones. Whichever came back is used, and the hospital shows when it is known —
 * since 0060 the person answering may work somewhere else entirely.
 */
type Authored = { doctors: CommunityDoctor | null; doctors_public: CommunityPublicDoctor | null };

const authorOf = (row: Authored) => ({
  name: row.doctors?.name ?? row.doctors_public?.name ?? "A colleague",
  specialty: row.doctors?.specialty ?? row.doctors_public?.specialty ?? null,
  photo_url: row.doctors?.photo_url ?? row.doctors_public?.photo_url ?? null,
  hospital: row.doctors_public?.hospital_name ?? null,
});

const Avatar = ({
  photo, className = "h-10 w-10",
}: { photo: string | null; className?: string }) => (
  <img
    src={mediaUrl(photo) || FALLBACK_AVATAR}
    alt=""
    className={`${className} rounded-full object-cover bg-chip shrink-0`}
  />
);

const Community = () => {
  const [me, setMe] = useState<Me>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [filter, setFilter] = useState<"all" | Category>("all");
  const [query, setQuery] = useState("");

  const { data, isLoading, error } = communityPostsApi.useList({
    limit: 50,
    q: query.trim() || undefined,
    ...(filter !== "all" ? { category: filter } : {}),
  });

  const posts = useMemo(() => data?.data ?? [], [data]);

  /**
   * Which doctor is reading. Needed for three things the feed cannot work out
   * on its own: whose reaction is whose, which posts may be edited or deleted,
   * and whose face goes on the composer.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/portal/me");
        const body = await res.json();
        if (!cancelled) setMe(res.ok ? (body.data as Me) : null);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl text-primary">Doctor Community</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Share thoughts, ask questions, and discuss cases with doctors across HealthFlow.
            </p>
          </div>
          {/* A real count of what is actually here, or nothing at all. */}
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {data?.meta ? `${data.meta.total} post${data.meta.total === 1 ? "" : "s"}` : "—"}
          </span>
        </div>

        {!loadingMe && !me && (
          <div className="flex items-start gap-3 rounded-2xl bg-yellow-100/60 text-yellow-900 p-4 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              You are signed in, but not as a doctor — so you see your own hospital&apos;s posts
              and can remove one that should not be there, and you cannot write in the feed.
            </p>
          </div>
        )}

        {me && <Composer me={me} />}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts…"
              aria-label="Search posts"
              className="w-full rounded-full border border-border/60 bg-card pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[{ value: "all" as const, label: "All" }, ...CATEGORIES].map((c) => (
              <button
                key={c.value}
                onClick={() => setFilter(c.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  filter === c.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border/60 text-foreground/70 hover:bg-chip"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 text-destructive p-4">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">Could not load the feed. Refresh to try again.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border/60 p-10 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {query || filter !== "all"
                ? "Nothing matches that."
                : "No posts yet. Start the conversation — a case, a question, or a thought."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Post key={post.id} post={post} me={me} meLoading={loadingMe} />
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

/* ---------------------------------------------------------- composer --- */

const Composer = ({ me }: { me: NonNullable<Me> }) => {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category>("discussion");
  const [media, setMedia] = useState<{ key: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [create, { isLoading: posting }] = communityPostsApi.useCreate();
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Straight to Cloudflare with a presigned PUT — the file never passes
   * through the app. What is stored on the post is the object KEY; the address
   * is built when it is shown. See /api/v1/uploads and src/lib/media.ts.
   *
   * The old composer took videos too. It could not really: it made a
   * `URL.createObjectURL` blob that died with the tab. Images upload for real
   * now; video needs its own content types and size limit, so the button is
   * gone rather than pretending.
   */
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = 4 - media.length;
    if (room <= 0) return toast.error("Four images at most");

    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, room)) {
        const ask = await fetch("/api/v1/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: "community", contentType: file.type, size: file.size }),
        });
        const body = await ask.json();
        if (!ask.ok) {
          toast.error("Could not attach that image", { description: body?.error?.message });
          continue;
        }

        const put = await fetch(body.data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!put.ok) {
          toast.error("Could not attach that image", { description: "The upload failed." });
          continue;
        }

        setMedia((m) => [...m, { key: body.data.key, url: body.data.publicUrl }]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const publish = async () => {
    if (!content.trim()) return toast.error("Write something before posting");
    try {
      await create({
        category,
        content: content.trim(),
        media: media.map(({ key }) => ({ key })),
      }).unwrap();
      setContent("");
      setMedia([]);
      toast.success("Posted");
    } catch (cause) {
      const message =
        (cause as { data?: { error?: { message?: string } } })?.data?.error?.message
        ?? "Please try again.";
      toast.error("Could not post", { description: message });
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-soft">
      <div className="flex gap-3">
        <Avatar photo={me.photo_url} />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share a thought, case, or question…"
            rows={3}
            maxLength={5000}
            aria-label="Write a post"
            className="w-full resize-none rounded-xl border border-border/60 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />

          {media.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {media.map((m, index) => (
                <div key={m.key} className="relative rounded-lg overflow-hidden border border-border/60 aspect-video bg-chip">
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setMedia((current) => current.filter((_, i) => i !== index))}
                    aria-label="Remove this image"
                    className="absolute top-1 right-1 bg-background/90 rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                aria-label="Category"
                className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-semibold text-primary focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>

              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading || media.length >= 4}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-chip disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                {uploading ? "Uploading…" : "Photo"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                multiple
                hidden
                onChange={(e) => void upload(e.target.files)}
              />
            </div>

            <button
              onClick={() => void publish()}
              disabled={posting || uploading || !content.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors disabled:opacity-50"
            >
              {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------- post --- */

const Post = ({
  post, me, meLoading,
}: {
  post: CommunityPostRow;
  me: Me;
  /**
   * The feed renders before /portal/me answers, and the reaction buttons need
   * to know which doctor is pressing. While that is in flight they say so
   * rather than sitting there disabled and silent — a dead button and a broken
   * one look identical, which is how this was first reported.
   */
  meLoading: boolean;
}) => {
  const dispatch = useAppDispatch();
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const [createReaction] = communityReactionsApi.useCreate();
  const [updateReaction] = communityReactionsApi.useUpdate();
  const [removeReaction] = communityReactionsApi.useRemove();
  const [createComment, { isLoading: commenting }] = communityCommentsApi.useCreate();
  const [removePost] = communityPostsApi.useRemove();

  // Memoised so the `?? []` fallback does not hand the counts a new array on
  // every render, which would make the memo below pointless.
  const reactions = useMemo(() => post.community_reactions ?? [], [post.community_reactions]);
  const comments = post.community_comments ?? [];
  const mine = me ? reactions.find((r) => r.doctor_id === me.id) : undefined;

  const counts = useMemo(() => {
    const base: Record<Reaction, number> = { like: 0, love: 0, insightful: 0 };
    for (const r of reactions) base[r.reaction as Reaction] += 1;
    return base;
  }, [reactions]);

  const media = (post.media as { key: string }[] | null) ?? [];
  const author = authorOf(post);

  /**
   * One row per doctor per post, so this is three cases rather than a counter:
   * the same reaction again takes it back, a different one changes it, and
   * none yet adds one. The unique index is what makes that safe when two tabs
   * are open.
   */
  const react = async (reaction: Reaction) => {
    if (!me) return;
    setBusy(true);
    try {
      if (mine?.reaction === reaction) await removeReaction(mine.id).unwrap();
      else if (mine) await updateReaction(mine.id, { reaction }).unwrap();
      else await createReaction({ post_id: post.id, reaction }).unwrap();

      // The reactions live on the FEED's rows, not in the reactions list this
      // mutation invalidates on its own — so without this the write lands in
      // the database and the screen sits there unchanged, which reads exactly
      // like a button that does not work.
      dispatch(invalidateResource("community-posts"));
    } catch (cause) {
      toast.error("Could not save that reaction", { description: reason(cause) });
    } finally {
      setBusy(false);
    }
  };

  const comment = async (isSuggestion: boolean) => {
    const body = draft.trim();
    if (!body) return;
    try {
      await createComment({ post_id: post.id, body, is_suggestion: isSuggestion }).unwrap();
      setDraft("");
      dispatch(invalidateResource("community-posts"));
    } catch (cause) {
      toast.error("Could not comment", { description: reason(cause) });
    }
  };

  /**
   * Your own post, or you are not a doctor at all — and the only non-doctor
   * who can see this feed is the hospital's admin, because the role gate and
   * the policies let nobody else read it. That is the moderation case. RLS
   * decides for real; this only decides whether to draw the button.
   */
  const canDelete = !me || post.doctor_id === me.id;

  const deletePost = async () => {
    try {
      await removePost(post.id).unwrap();
      toast.success("Post removed");
    } catch {
      toast.error("Could not remove the post", { description: "Please try again." });
    }
  };

  return (
    <article className="rounded-2xl bg-card border border-border/60 p-5 shadow-soft">
      <header className="flex items-start gap-3">
        <Avatar photo={author.photo_url} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-primary truncate">{author.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {[author.specialty, author.hospital].filter(Boolean).join(" · ") || "—"}
            {" · "}{when(post.created_at)}
          </p>
        </div>
        <span className="rounded-full bg-chip px-2.5 py-0.5 text-[11px] font-semibold text-chip-foreground shrink-0">
          {categoryLabel(post.category)}
        </span>
        {canDelete && (
          <button
            onClick={() => void deletePost()}
            title="Remove this post"
            aria-label="Remove this post"
            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      <p className="mt-3 text-sm whitespace-pre-wrap">{post.content}</p>

      {media.length > 0 && (
        <div className={`mt-3 grid gap-2 ${media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {media.map((m) => (
            <img
              key={m.key}
              src={mediaUrl(m.key) ?? ""}
              alt=""
              className="w-full rounded-xl border border-border/60 object-cover max-h-80"
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-1.5 flex-wrap border-t border-border/40 pt-3">
        {REACTIONS.map(({ value, label, icon: Icon }) => {
          const on = mine?.reaction === value;
          return (
            <button
              key={value}
              onClick={() => void react(value)}
              disabled={!me || busy}
              aria-pressed={on}
              title={me ? label : meLoading ? "One moment — loading your profile" : "Only doctors can react"}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                on ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-chip"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${on ? "fill-current" : ""}`} />
              {label}
              {counts[value] > 0 && <span className="tabular-nums">{counts[value]}</span>}
            </button>
          );
        })}

        <button
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-chip ml-auto"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {comments.length === 0
            ? "Comment"
            : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-3 border-t border-border/40 pt-3">
          {comments.map((c) => {
            const by = authorOf(c);
            return (
              <div key={c.id} className="flex gap-2.5">
                <Avatar photo={by.photo_url} className="h-8 w-8" />
                <div className="flex-1 min-w-0">
                  <div className={`rounded-xl px-3 py-2 ${c.is_suggestion ? "bg-primary/5 border border-primary/20" : "bg-muted/40"}`}>
                    <p className="text-xs font-semibold text-primary">
                      {by.name}
                      {by.hospital && (
                        <span className="ml-1.5 font-normal text-muted-foreground">· {by.hospital}</span>
                      )}
                      {c.is_suggestion && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                          Suggestion
                        </span>
                      )}
                    </p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap">{c.body}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{when(c.created_at)}</p>
                </div>
              </div>
            );
          })}

          {me && (
            <div className="flex gap-2.5">
              <Avatar photo={me.photo_url} className="h-8 w-8" />
              <div className="flex-1">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Reply, or suggest what you would do…"
                  aria-label="Write a comment"
                  className="w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => void comment(false)}
                    disabled={commenting || !draft.trim()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {commenting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Reply
                  </button>
                  {/* Kept from the old screen because the distinction is real:
                      a suggestion is clinical advice, and it reads differently
                      from agreement. */}
                  <button
                    onClick={() => void comment(true)}
                    disabled={commenting || !draft.trim()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-primary hover:bg-muted disabled:opacity-50"
                  >
                    <Lightbulb className="h-3 w-3" /> Post as suggestion
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export default Community;
