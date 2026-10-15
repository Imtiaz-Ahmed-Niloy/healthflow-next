"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SuperLayout } from "@/components/super/SuperLayout";
import { Btn, Pill } from "@/components/admin/ui";
import { useConfirmAction } from "@/components/common/ConfirmProvider";
import {
  Plus, Search, BookOpen, ExternalLink, Pencil, Trash2, Eye, EyeOff,
  Layers, ArrowUp, ArrowDown, Sparkles, Building2, Stethoscope, Activity,
  Pill as PillIcon, Image as ImageIcon, Upload, X, CheckCircle2, RotateCcw,
  Check, ArrowRight, LayoutTemplate, HeartHandshake, Users
} from "lucide-react";
import { toast } from "sonner";
import {
  BrochureSlide, BrochureSlideStatus, BrochureSlideType,
  useBrochureSlides
} from "@/data/brochure";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";

type Filter = "all" | BrochureSlideStatus;

const FILTERS: Filter[] = ["all", "published", "draft", "archived"];
const STATUSES: BrochureSlideStatus[] = ["published", "draft", "archived"];
const TYPES: BrochureSlideType[] = [
  "cover",
  "overview",
  "doctor",
  "hospital",
  "pathology",
  "pharmacy",
  "patient",
  "custom",
];

const typeIcons: Record<BrochureSlideType, typeof Stethoscope> = {
  cover: BookOpen,
  overview: LayoutTemplate,
  doctor: Stethoscope,
  hospital: Building2,
  pathology: Activity,
  pharmacy: PillIcon,
  patient: Users,
  custom: Sparkles,
};

const typeGradients: Record<BrochureSlideType, string> = {
  cover: "from-[#25555e] to-[#16365f]",
  overview: "from-[#1b3861] to-[#2cb8a7]",
  doctor: "from-[#2f998d] to-[#124845]",
  hospital: "from-[#1a3e74] to-[#0c1832]",
  pathology: "from-[#229f90] to-[#0e534a]",
  pharmacy: "from-[#1b7e94] to-[#0c414d]",
  patient: "from-[#0284c7] to-[#075985]",
  custom: "from-primary/20 via-accent/30 to-chip",
};

interface SlideDraft {
  id?: string;
  position: number;
  type: BrochureSlideType;
  title: string;
  subtitle: string;
  badge: string;
  tagline: string;
  features: string[];
  image: string | null;
  cta_label: string;
  cta_url: string;
  has_rosette: boolean;
  rosette_top: string;
  rosette_main: string;
  rosette_unit_top: string;
  rosette_unit_bottom: string;
  rosette_sub: string;
  status: BrochureSlideStatus;
}

const emptyDraft = (nextPos: number): SlideDraft => ({
  position: nextPos,
  type: "custom",
  title: "",
  subtitle: "",
  badge: "",
  tagline: "",
  features: [""],
  image: null,
  cta_label: "",
  cta_url: "",
  has_rosette: false,
  rosette_top: "",
  rosette_main: "",
  rosette_unit_top: "",
  rosette_unit_bottom: "",
  rosette_sub: "",
  status: "published",
});

const toDraft = (s: BrochureSlide): SlideDraft => ({
  id: s.id,
  position: s.position,
  type: s.type,
  title: s.title,
  subtitle: s.subtitle,
  badge: s.badge,
  tagline: s.tagline,
  features: s.features.length ? [...s.features] : [""],
  image: s.image,
  cta_label: s.cta_label ?? "",
  cta_url: s.cta_url ?? "",
  has_rosette: Boolean(s.highlight_badge),
  rosette_top: s.highlight_badge?.top_text ?? "",
  rosette_main: s.highlight_badge?.main_text ?? "",
  rosette_unit_top: s.highlight_badge?.unit_top ?? "",
  rosette_unit_bottom: s.highlight_badge?.unit_bottom ?? "",
  rosette_sub: s.highlight_badge?.sub_text ?? "",
  status: s.status,
});

const BrochureSuperPage = () => {
  const t = useTranslations("super.brochure");
  const tc = useTranslations("common");
  const confirmAction = useConfirmAction();

  const {
    slides,
    isLoading,
    createSlide,
    updateSlide,
    removeSlide,
    togglePublish,
    resetToDefault,
    reorderSlides,
  } = useBrochureSlides();

  const [filter, setFilter] = useState<Filter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SlideDraft | null>(null);
  const [preview, setPreview] = useState<BrochureSlide | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return slides.filter((s) => {
      const q = query.toLowerCase();
      const matchQ =
        s.title.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q) ||
        s.tagline.toLowerCase().includes(q) ||
        s.badge.toLowerCase().includes(q);
      const matchF = filter === "all" ? true : s.status === filter;
      const matchT = typeFilter === "all" ? true : s.type === typeFilter;
      return matchQ && matchF && matchT;
    });
  }, [slides, filter, typeFilter, query]);

  const stats = useMemo(
    () => ({
      total: slides.length,
      published: slides.filter((i) => i.status === "published").length,
      drafts: slides.filter((i) => i.status === "draft").length,
      categories: new Set(slides.map((s) => s.type)).size,
    }),
    [slides]
  );

  const moveSlide = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;
    const reordered = [...slides];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    reorderSlides(reordered);
    toast.success(t("savedToast"));
  };

  const handleSave = async (draft: SlideDraft) => {
    if (!draft.title.trim()) {
      toast.error(t("titleRequired"));
      return;
    }

    setSaving(true);
    const cleanedFeatures = draft.features.map((f) => f.trim()).filter(Boolean);

    const highlightBadge = draft.has_rosette
      ? {
          top_text: draft.rosette_top.trim(),
          main_text: draft.rosette_main.trim(),
          unit_top: draft.rosette_unit_top.trim(),
          unit_bottom: draft.rosette_unit_bottom.trim(),
          sub_text: draft.rosette_sub.trim(),
        }
      : null;

    const payload = {
      position: draft.position,
      type: draft.type,
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim(),
      badge: draft.badge.trim(),
      tagline: draft.tagline.trim(),
      features: cleanedFeatures,
      image: draft.image,
      cta_label: draft.cta_label.trim() || null,
      cta_url: draft.cta_url.trim() || null,
      highlight_badge: highlightBadge,
      status: draft.status,
    };

    if (draft.id) {
      updateSlide(draft.id, payload);
    } else {
      createSlide(payload);
    }

    setSaving(false);
    setEditing(null);
    toast.success(t("savedToast"));
  };

  const handleReset = async () => {
    if (await confirmAction(t("resetConfirm"), { name: t("resetDefaults"), danger: true })) {
      resetToDefault();
      toast.success(t("resetToast"));
    }
  };

  const tiles = [
    { label: t("stats.total"), value: stats.total, icon: Layers, tone: "bg-primary/10 text-primary" },
    { label: t("stats.live"), value: stats.published, icon: Eye, tone: "bg-accent/40 text-accent-foreground" },
    { label: t("stats.drafts"), value: stats.drafts, icon: Pencil, tone: "bg-chip text-chip-foreground" },
    { label: t("stats.categories"), value: stats.categories, icon: BookOpen, tone: "bg-blue-500/10 text-blue-600" },
  ];

  return (
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="space-y-6">
        {/* Header Stats and Primary Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="rounded-2xl bg-card border border-border/60 shadow-soft px-4 py-3 flex items-center gap-3"
              >
                <div className={`h-9 w-9 rounded-lg grid place-items-center ${tile.tone}`}>
                  <tile.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] tracking-widest font-bold text-muted-foreground uppercase">
                    {tile.label}
                  </p>
                  <p className="font-display text-xl text-primary leading-none mt-0.5">
                    {tile.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/brochure"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border/60"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#2cb8a7]" />
              <span>{t("viewLive")}</span>
            </Link>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border/60"
              title={t("resetDefaults")}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t("resetDefaults")}</span>
            </button>

            <Btn onClick={() => setEditing(emptyDraft(slides.length))}>
              <Plus className="h-4 w-4" /> {t("new")}
            </Btn>
          </div>
        </div>

        {/* Search, Status & Type Filters Toolbar */}
        <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 bg-muted/40 border-border/60"
              />
            </div>

            <div className="flex items-center gap-1 rounded-full bg-muted/50 p-1 shrink-0 overflow-x-auto">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                    filter === f
                      ? "bg-card text-primary shadow-soft"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  {t(`filters.${f}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Type Pill Filters */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-border/40 overflow-x-auto text-xs">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1 uppercase tracking-wider">
              {t("fields.type")}:
            </span>
            <button
              onClick={() => setTypeFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                typeFilter === "all"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground"
              }`}
            >
              {t("types.all")}
            </button>
            {TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  typeFilter === type
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground"
                }`}
              >
                <span>{t(`types.${type}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Slide Cards Grid */}
        {isLoading ? (
          <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-12 text-center text-sm text-muted-foreground">
            {tc("loading")}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((slide, idx) => {
              const IconComponent = typeIcons[slide.type] || Sparkles;
              const gradientClass = typeGradients[slide.type] || "from-primary/20 to-chip";

              return (
                <div
                  key={slide.id}
                  className="group rounded-2xl bg-card border border-border/60 shadow-soft overflow-hidden flex flex-col transition-all hover:border-primary/40"
                >
                  {/* Card Visual Header */}
                  <div className="relative aspect-[16/9] w-full bg-slate-900 overflow-hidden">
                    {slide.image ? (
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center p-4 text-white text-center`}>
                        <IconComponent className="h-10 w-10 text-white/80 drop-shadow-md mb-2" />
                        <span className="text-xs font-black uppercase tracking-wider bg-black/25 px-2.5 py-1 rounded-full backdrop-blur-xs">
                          {slide.badge || t(`types.${slide.type}`)}
                        </span>
                      </div>
                    )}

                    {/* Order Badge & Reordering Controls */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
                      <span>{t("slideNumber", { number: idx + 1 })}</span>
                    </div>

                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full p-0.5">
                      <button
                        onClick={() => moveSlide(idx, "up")}
                        disabled={idx === 0}
                        title={t("moveUp")}
                        className="h-6 w-6 rounded-full flex items-center justify-center text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white/20 transition-colors"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveSlide(idx, "down")}
                        disabled={idx === slides.length - 1}
                        title={t("moveDown")}
                        className="h-6 w-6 rounded-full flex items-center justify-center text-white/80 hover:text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white/20 transition-colors"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Rosette preview badge in corner if active */}
                    {slide.highlight_badge && (
                      <div className="absolute bottom-2.5 right-2.5 bg-amber-400 text-slate-900 rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-md">
                        {slide.highlight_badge.main_text} {slide.highlight_badge.unit_bottom}
                      </div>
                    )}
                  </div>

                  {/* Card Content Details */}
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <Pill tone={slide.type === "cover" ? "info" : "default"}>
                        <IconComponent className="h-3 w-3 mr-1 inline" />
                        {t(`types.${slide.type}`)}
                      </Pill>
                      <Pill tone={slide.status === "published" ? "ok" : slide.status === "draft" ? "warn" : "default"}>
                        {t(`filters.${slide.status}`)}
                      </Pill>
                    </div>

                    <div>
                      <h3 className="font-display text-lg text-primary leading-snug line-clamp-2">
                        {slide.title}
                      </h3>
                      {slide.subtitle && (
                        <p className="text-xs font-semibold text-foreground/80 mt-0.5 line-clamp-1">
                          {slide.subtitle}
                        </p>
                      )}
                    </div>

                    {slide.tagline && (
                      <p className="text-xs text-foreground/70 line-clamp-2 flex-1">
                        {slide.tagline}
                      </p>
                    )}

                    {/* Features checklist preview */}
                    {slide.features && slide.features.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                        {slide.features.slice(0, 2).map((feat, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-1.5 truncate">
                            <CheckCircle2 className="h-3 w-3 text-[#2cb8a7] shrink-0" />
                            <span className="truncate">{feat}</span>
                          </div>
                        ))}
                        {slide.features.length > 2 && (
                          <span className="text-[10px] font-medium text-primary/80">
                            +{slide.features.length - 2} more capabilities
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
                      <button
                        onClick={() => setPreview(slide)}
                        className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> {t("preview")}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => togglePublish(slide.id)}
                          title={slide.status === "published" ? t("unpublish") : t("publish")}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        >
                          {slide.status === "published" ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditing(toDraft(slide))}
                          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                          title={tc("edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (
                              await confirmAction(tc("delete"), {
                                name: slide.title,
                                danger: true,
                              })
                            ) {
                              removeSlide(slide.id);
                              toast.success(t("deletedToast"));
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          title={tc("delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-full rounded-2xl bg-card border border-border/60 shadow-soft p-12 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="font-semibold text-primary">{t("none")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("noneHint")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slide Editor Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? t("editTitle") : t("new")}
            </DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4 pt-1">
              {/* Type Category Picker */}
              <div>
                <Label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("fields.type")}
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TYPES.map((type) => {
                    const TypeIcon = typeIcons[type] || Sparkles;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditing({ ...editing, type })}
                        className={`rounded-xl border p-2.5 text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          editing.type === type
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-card border-border/60 text-foreground/70 hover:border-primary/50"
                        }`}
                      >
                        <TypeIcon className="h-4 w-4" />
                        <span>{t(`types.${type}`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t("fields.title")} *</Label>
                  <Input
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder={t("fields.titlePlaceholder")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{t("fields.subtitle")}</Label>
                  <Input
                    value={editing.subtitle}
                    onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })}
                    placeholder={t("fields.subtitlePlaceholder")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{t("fields.badge")}</Label>
                  <Input
                    value={editing.badge}
                    onChange={(e) => setEditing({ ...editing, badge: e.target.value })}
                    placeholder={t("fields.badgePlaceholder")}
                  />
                </div>
              </div>

              {/* Tagline / Description */}
              <div className="space-y-1.5">
                <Label>{t("fields.tagline")}</Label>
                <Textarea
                  rows={3}
                  value={editing.tagline}
                  onChange={(e) => setEditing({ ...editing, tagline: e.target.value })}
                  placeholder={t("fields.taglinePlaceholder")}
                />
              </div>

              {/* Key Features Bullet List */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label>{t("fields.features")}</Label>
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, features: [...editing.features, ""] })}
                    className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> {t("fields.addFeature")}
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editing.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-4">
                        {idx + 1}.
                      </span>
                      <Input
                        value={feat}
                        onChange={(e) => {
                          const updated = [...editing.features];
                          updated[idx] = e.target.value;
                          setEditing({ ...editing, features: updated });
                        }}
                        placeholder={t("fields.featurePlaceholder")}
                        className="flex-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editing.features.filter((_, i) => i !== idx);
                          setEditing({
                            ...editing,
                            features: updated.length ? updated : [""],
                          });
                        }}
                        className="h-8 w-8 rounded-lg grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scallop Rosette Highlight Badge Settings */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-bold text-xs">{t("fields.rosetteBadge")}</Label>
                    <p className="text-[11px] text-muted-foreground">
                      {t("fields.enableRosette")}
                    </p>
                  </div>
                  <Switch
                    checked={editing.has_rosette}
                    onCheckedChange={(checked) => setEditing({ ...editing, has_rosette: checked })}
                  />
                </div>

                {editing.has_rosette && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border/40 text-xs">
                    <div>
                      <Label className="text-[11px]">{t("fields.rosetteTop")}</Label>
                      <Input
                        value={editing.rosette_top}
                        onChange={(e) => setEditing({ ...editing, rosette_top: e.target.value })}
                        placeholder={t("fields.rosetteTopPlaceholder")}
                        className="text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">{t("fields.rosetteMain")}</Label>
                      <Input
                        value={editing.rosette_main}
                        onChange={(e) => setEditing({ ...editing, rosette_main: e.target.value })}
                        placeholder={t("fields.rosetteMainPlaceholder")}
                        className="text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">{t("fields.rosetteUnitTop")}</Label>
                      <Input
                        value={editing.rosette_unit_top}
                        onChange={(e) => setEditing({ ...editing, rosette_unit_top: e.target.value })}
                        placeholder={t("fields.rosetteUnitTopPlaceholder")}
                        className="text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">{t("fields.rosetteUnitBottom")}</Label>
                      <Input
                        value={editing.rosette_unit_bottom}
                        onChange={(e) => setEditing({ ...editing, rosette_unit_bottom: e.target.value })}
                        placeholder={t("fields.rosetteUnitBottomPlaceholder")}
                        className="text-xs mt-1"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[11px]">{t("fields.rosetteSub")}</Label>
                      <Input
                        value={editing.rosette_sub}
                        onChange={(e) => setEditing({ ...editing, rosette_sub: e.target.value })}
                        placeholder={t("fields.rosetteSubPlaceholder")}
                        className="text-xs mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Cover Image Upload / Selection */}
              <div className="space-y-1.5">
                <Label>{t("fields.image")}</Label>
                {editing.image ? (
                  <div className="relative rounded-xl overflow-hidden border border-border/60">
                    <img src={editing.image} alt="" className="w-full h-36 object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, image: null })}
                      aria-label={tc("remove")}
                      className="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-full bg-card/90 border border-border/60 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-muted/30 px-4 py-6 text-center transition-colors cursor-pointer"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-primary">{t("fields.upload")}</p>
                    <p className="text-[11px] text-muted-foreground">{t("fields.uploadHint")}</p>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      toast.error(t("tooBig"));
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setEditing({ ...editing, image: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>

              {/* CTA Button & Link */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("fields.ctaLabel")}</Label>
                  <Input
                    value={editing.cta_label}
                    onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })}
                    placeholder={t("fields.ctaLabelPlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("fields.ctaLink")}</Label>
                  <Input
                    value={editing.cta_url}
                    onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })}
                    placeholder={t("fields.ctaLinkPlaceholder")}
                  />
                </div>
              </div>

              {/* Status Picker */}
              <div className="space-y-1.5">
                <Label>{t("fields.status")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setEditing({ ...editing, status })}
                      className={`rounded-xl border py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        editing.status === status
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border/60 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {t(`filters.${status}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              {tc("cancel")}
            </button>
            <Btn onClick={() => editing && handleSave(editing)} disabled={saving}>
              <Check className="h-4 w-4" /> {saving ? tc("saving") : t("save")}
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Interactive Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-[36px] bg-[#f5f4ef] text-slate-900 shadow-2xl border-2 border-slate-300/80 overflow-hidden flex flex-col min-h-[580px]">
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="absolute top-4 right-4 z-30 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Top Wave & Badge */}
            <div className="relative w-full bg-gradient-to-r from-[#2ea394] to-[#16365f] p-5 text-white">
              <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-[10px] font-bold tracking-wider uppercase text-white">
                {preview.badge || preview.type}
              </span>
              <h2 className="text-xl font-black mt-1 leading-tight">{preview.title}</h2>
              {preview.subtitle && (
                <p className="text-xs text-white/90 font-medium mt-0.5">{preview.subtitle}</p>
              )}
            </div>

            {/* Preview Image or Illustration */}
            {preview.image && (
              <div className="h-40 w-full overflow-hidden bg-slate-200">
                <img src={preview.image} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Content & Capabilities */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                {preview.tagline && (
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {preview.tagline}
                  </p>
                )}

                {preview.features && preview.features.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {preview.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2cb8a7] shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Rosette preview in preview card */}
              {preview.highlight_badge && (
                <div className="my-3 p-3 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-between">
                  <div className="text-xs font-bold text-teal-900">
                    <span className="block text-[10px] text-teal-600 font-extrabold uppercase">
                      {preview.highlight_badge.top_text}
                    </span>
                    <span className="text-xl font-black text-teal-800 leading-none">
                      {preview.highlight_badge.main_text}
                    </span>{" "}
                    <span className="text-xs">{preview.highlight_badge.unit_bottom}</span>
                  </div>
                  <span className="text-[11px] font-bold text-teal-700">
                    {preview.highlight_badge.sub_text}
                  </span>
                </div>
              )}

              {/* Bottom CTA preview */}
              {preview.cta_label && (
                <div className="pt-3">
                  <button
                    type="button"
                    className="w-full py-2.5 rounded-full bg-[#16365f] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>{preview.cta_label}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </SuperLayout>
  );
};

export default BrochureSuperPage;
