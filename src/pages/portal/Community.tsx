"use client";

import { useState, useRef } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Heart, MessageCircle, Lightbulb, ThumbsUp, Send, Image as ImageIcon, Video, X, Search, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
const doctorAvatar = "/assets/doctor-avatar.jpg";

type Reaction = "like" | "love" | "insightful";
type Media = { type: "image" | "video"; url: string };
type Comment = {
  id: string;
  author: string;
  role: string;
  avatar: string;
  text: string;
  createdAt: string;
  isSuggestion?: boolean;
};
type Post = {
  id: string;
  author: string;
  role: string;
  avatar: string;
  category: "Discussion" | "Question" | "Case Study" | "Thought";
  content: string;
  media: Media[];
  createdAt: string;
  reactions: Record<Reaction, number>;
  myReaction?: Reaction;
  comments: Comment[];
};

const seedPosts: Post[] = [
  {
    id: "p1",
    author: "Dr. Sarah Chen",
    role: "Cardiologist",
    avatar: doctorAvatar,
    category: "Case Study",
    content:
      "Interesting case today: 54M presenting with atypical chest pain, ECG showed subtle T-wave inversions in V3-V4. Troponin negative initially but rose at 6h. Anyone seen similar patterns recently? Considering whether early cath was the right call.",
    media: [
      { type: "image", url: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80" },
    ],
    createdAt: "2h ago",
    reactions: { like: 12, love: 3, insightful: 24 },
    comments: [
      {
        id: "c1",
        author: "Dr. Marcus Patel",
        role: "Interventional Cardiology",
        avatar: doctorAvatar,
        text: "Sounds like a Wellens pattern variant — early cath was likely the right move. Did you find a critical LAD lesion?",
        createdAt: "1h ago",
        isSuggestion: true,
      },
      {
        id: "c2",
        author: "Dr. Lina Okafor",
        role: "Emergency Medicine",
        avatar: doctorAvatar,
        text: "Agree with Marcus. In my experience the delta troponin pattern with those T-wave findings warrants aggressive workup.",
        createdAt: "45m ago",
      },
    ],
  },
  {
    id: "p2",
    author: "Dr. Ahmed Rashid",
    role: "Internal Medicine",
    avatar: doctorAvatar,
    category: "Question",
    content:
      "What's everyone's go-to first-line regimen for newly diagnosed T2DM in patients with established CKD stage 3? Increasingly using SGLT2i upfront — curious what others are doing.",
    media: [],
    createdAt: "5h ago",
    reactions: { like: 28, love: 4, insightful: 19 },
    comments: [
      {
        id: "c3",
        author: "Dr. Priya Nair",
        role: "Endocrinology",
        avatar: doctorAvatar,
        text: "SGLT2i + metformin (dose-adjusted) is my default. The renal & cardio benefits are too good to delay.",
        createdAt: "3h ago",
        isSuggestion: true,
      },
    ],
  },
  {
    id: "p3",
    author: "Dr. Emily Park",
    role: "Pediatrics",
    avatar: doctorAvatar,
    category: "Thought",
    content:
      "Reminder to colleagues: take 5 minutes between patients today. Burnout creeps up silently. Your wellbeing IS patient care. ☕",
    media: [],
    createdAt: "1d ago",
    reactions: { like: 87, love: 42, insightful: 9 },
    comments: [],
  },
];

const categories = ["All", "Discussion", "Question", "Case Study", "Thought"] as const;

const Community = () => {
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [filter, setFilter] = useState<(typeof categories)[number]>("All");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [draftCategory, setDraftCategory] = useState<Post["category"]>("Discussion");
  const [draftMedia, setDraftMedia] = useState<Media[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = posts.filter(
    (p) =>
      (filter === "All" || p.category === filter) &&
      (query === "" ||
        p.content.toLowerCase().includes(query.toLowerCase()) ||
        p.author.toLowerCase().includes(query.toLowerCase())),
  );

  const onFiles = (files: FileList | null, type: "image" | "video") => {
    if (!files) return;
    const next = Array.from(files).map((f) => ({ type, url: URL.createObjectURL(f) }));
    setDraftMedia((m) => [...m, ...next]);
  };

  const publish = () => {
    if (!draft.trim()) return toast.error("Write something before posting");
    const np: Post = {
      id: `p${Date.now()}`,
      author: "Dr. Jhon",
      role: "Internal Medicine",
      avatar: doctorAvatar,
      category: draftCategory,
      content: draft,
      media: draftMedia,
      createdAt: "Just now",
      reactions: { like: 0, love: 0, insightful: 0 },
      comments: [],
    };
    setPosts([np, ...posts]);
    setDraft("");
    setDraftMedia([]);
    toast.success("Post shared with the community");
  };

  const react = (postId: string, r: Reaction) => {
    setPosts((ps) =>
      ps.map((p) => {
        if (p.id !== postId) return p;
        const prev = p.myReaction;
        const reactions = { ...p.reactions };
        if (prev === r) {
          reactions[r] = Math.max(0, reactions[r] - 1);
          return { ...p, reactions, myReaction: undefined };
        }
        if (prev) reactions[prev] = Math.max(0, reactions[prev] - 1);
        reactions[r] += 1;
        return { ...p, reactions, myReaction: r };
      }),
    );
  };

  const addComment = (postId: string, asSuggestion = false) => {
    const text = commentDrafts[postId]?.trim();
    if (!text) return;
    const c: Comment = {
      id: `c${Date.now()}`,
      author: "Dr. Jhon",
      role: "Internal Medicine",
      avatar: doctorAvatar,
      text,
      createdAt: "Just now",
      isSuggestion: asSuggestion,
    };
    setPosts((ps) => ps.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, c] } : p)));
    setCommentDrafts((d) => ({ ...d, [postId]: "" }));
  };

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl text-primary">Doctor Community</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Share thoughts, ask questions, and discuss cases with fellow clinicians.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> 2,148 doctors</span>
            <span className="inline-flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> 47 today</span>
          </div>
        </div>

        {/* Composer */}
        <div className="rounded-2xl bg-card border border-border/60 p-5 shadow-soft">
          <div className="flex gap-3">
            <img src={doctorAvatar} alt="me" className="h-10 w-10 rounded-full object-cover" />
            <div className="flex-1">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Share a thought, case, or question with the community..."
                rows={3}
                className="w-full resize-none rounded-xl border border-border/60 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {draftMedia.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {draftMedia.map((m, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden border border-border/60 aspect-video bg-chip">
                      {m.type === "image" ? (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={m.url} className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => setDraftMedia((md) => md.filter((_, idx) => idx !== i))}
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
                    value={draftCategory}
                    onChange={(e) => setDraftCategory(e.target.value as Post["category"])}
                    className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-semibold text-primary focus:outline-none"
                  >
                    {categories.filter((c) => c !== "All").map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-chip"
                  >
                    <ImageIcon className="h-3.5 w-3.5" /> Photo
                  </button>
                  <label className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-chip cursor-pointer">
                    <Video className="h-3.5 w-3.5" /> Video
                    <input type="file" accept="video/*" multiple hidden onChange={(e) => onFiles(e.target.files, "video")} />
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => onFiles(e.target.files, "image")}
                  />
                </div>
                <button
                  onClick={publish}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors"
                >
                  <Send className="h-3.5 w-3.5" /> Post
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts or doctors..."
              className="w-full rounded-full border border-border/60 bg-card pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  filter === c ? "bg-primary text-primary-foreground" : "bg-card border border-border/60 text-foreground/70 hover:bg-chip"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-5">
          {filtered.map((p) => (
            <article key={p.id} className="rounded-2xl bg-card border border-border/60 shadow-soft overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <img src={p.avatar} alt={p.author} className="h-11 w-11 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-primary">{p.author}</p>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-primary-glow">{p.role}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.createdAt}</p>
                  </div>
                  <span className="rounded-full bg-accent/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {p.category}
                  </span>
                </div>
                <p className="text-foreground/85 leading-relaxed mt-4 whitespace-pre-wrap">{p.content}</p>
              </div>

              {p.media.length > 0 && (
                <div className={`grid gap-1 ${p.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {p.media.map((m, i) =>
                    m.type === "image" ? (
                      <img key={i} src={m.url} alt="" className="w-full max-h-[420px] object-cover" />
                    ) : (
                      <video key={i} src={m.url} controls className="w-full max-h-[420px] object-cover bg-black" />
                    ),
                  )}
                </div>
              )}

              <div className="px-5 py-3 border-t border-border/40 flex items-center gap-1 flex-wrap">
                {([
                  { k: "like" as Reaction, i: ThumbsUp, label: "Like" },
                  { k: "love" as Reaction, i: Heart, label: "Support" },
                  { k: "insightful" as Reaction, i: Lightbulb, label: "Insightful" },
                ]).map(({ k, i: Icon, label }) => (
                  <button
                    key={k}
                    onClick={() => react(p.id, k)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      p.myReaction === k ? "bg-primary/10 text-primary" : "text-foreground/60 hover:bg-chip"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${p.myReaction === k ? "fill-primary/30" : ""}`} />
                    {label} <span className="text-[11px] text-muted-foreground">{p.reactions[k]}</span>
                  </button>
                ))}
                <button
                  onClick={() => setOpenComments((o) => ({ ...o, [p.id]: !o[p.id] }))}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground/60 hover:bg-chip"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> {p.comments.length} comments
                </button>
              </div>

              {(openComments[p.id] || p.comments.length > 0) && (
                <div className="bg-chip/30 border-t border-border/40 px-5 py-4 space-y-3">
                  {p.comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <img src={c.avatar} alt={c.author} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                      <div className="flex-1">
                        <div className="rounded-2xl bg-card border border-border/50 px-4 py-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-primary">{c.author}</p>
                            <span className="text-[9px] uppercase tracking-widest font-bold text-primary-glow">{c.role}</span>
                            {c.isSuggestion && (
                              <span className="rounded-full bg-accent/50 px-2 py-0.5 text-[9px] font-bold uppercase text-primary">
                                Suggestion
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground/80 mt-1">{c.text}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 ml-2">{c.createdAt}</p>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3 pt-1">
                    <img src={doctorAvatar} alt="me" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        value={commentDrafts[p.id] || ""}
                        onChange={(e) => setCommentDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addComment(p.id)}
                        placeholder="Write a comment..."
                        className="flex-1 rounded-full border border-border/60 bg-card px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        onClick={() => addComment(p.id, true)}
                        title="Post as suggestion"
                        className="rounded-full border border-border/60 bg-card p-2 text-primary hover:bg-accent/40"
                      >
                        <Lightbulb className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => addComment(p.id)}
                        className="rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary-glow"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No posts match your filters.</div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
};

export default Community;

