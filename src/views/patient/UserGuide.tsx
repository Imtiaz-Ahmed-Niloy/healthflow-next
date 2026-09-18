"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Calendar, ChevronDown, CreditCard, FileText, HelpCircle, LayoutGrid, Search, User, Users, X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";
import { patientGuideText, type GuideBlock, type GuideTopic } from "@/i18n/patientGuide";

/**
 * The patient portal, explained page by page.
 *
 * The words live in src/i18n/patientGuide.ts, in both languages; this page
 * holds the structure — which icon a section gets and how a block is laid out.
 * Written from the screens themselves: every step names a button that exists
 * and every rule is one the page or its API enforces. When a screen changes,
 * the section for it changes with it.
 */

/** Which icon heads each section, by the id the guide text gives it. */
const ICONS: Record<string, typeof User> = {
  "getting-around": LayoutGrid,
  profile: User,
  booking: Users,
  appointments: Calendar,
  records: FileText,
  billing: CreditCard,
};

/** Every word a topic shows, for the search box. */
const topicText = (topic: GuideTopic) =>
  [
    topic.title,
    ...topic.blocks.flatMap(b =>
      b.kind === "list" ? b.items.flatMap(i => [i.term, i.text])
        : b.kind === "steps" ? b.items
          : [b.text]),
  ].join(" ").toLowerCase();

const BlockView = ({ block }: { block: GuideBlock }) => {
  if (block.kind === "steps") {
    return (
      <ol className="space-y-2.5">
        {block.items.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm text-foreground/80 leading-relaxed">
            <span className="h-6 w-6 shrink-0 rounded-full bg-chip text-primary text-xs font-bold grid place-items-center">{i + 1}</span>
            <span className="pt-0.5">{item}</span>
          </li>
        ))}
      </ol>
    );
  }
  if (block.kind === "list") {
    return (
      <dl className="divide-y divide-border/50 rounded-2xl border border-border/50 overflow-hidden">
        {block.items.map(item => (
          <div key={item.term} className="grid sm:grid-cols-[200px_1fr] gap-1 sm:gap-4 px-4 py-3 bg-card">
            <dt className="text-sm font-semibold text-primary">{item.term}</dt>
            <dd className="text-sm text-foreground/75 leading-relaxed">{item.text}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (block.kind === "note") {
    return (
      <p className="rounded-2xl bg-chip/50 border border-border/40 px-4 py-3 text-sm text-foreground/80 leading-relaxed">
        {block.text}
      </p>
    );
  }
  return <p className="text-sm text-foreground/80 leading-relaxed">{block.text}</p>;
};

const UserGuide = () => {
  const tc = useTranslations("common");
  const locale = useLocale();
  const guide = patientGuideText(locale);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // A section shows when its own title or summary matches (all its topics),
  // or when any topic in it does (only those topics).
  const visible = useMemo(() => {
    if (!q) return guide.sections;
    return guide.sections.flatMap(s => {
      if (`${s.title} ${s.summary}`.toLowerCase().includes(q)) return [s];
      const topics = s.topics.filter(topic => topicText(topic).includes(q));
      return topics.length ? [{ ...s, topics }] : [];
    });
  }, [guide, q]);

  const faq = useMemo(
    () => (q ? guide.faq.filter(f => `${f.q} ${f.a}`.toLowerCase().includes(q)) : guide.faq),
    [guide, q],
  );

  const nothing = visible.length === 0 && faq.length === 0;

  return (
    <PatientPortalLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-5xl text-primary">{guide.title}</h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-2xl">{guide.intro}</p>

        <div className="mt-6 relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={guide.searchPlaceholder}
            aria-label={guide.searchLabel}
            className="w-full rounded-full bg-card border border-border pl-11 pr-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-glow"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label={tc("clearSearch")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-chip grid place-items-center">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="mt-10 grid lg:grid-cols-[220px_1fr] gap-10 items-start">
          {/* Contents. Anchors, so a section can be linked to directly. */}
          <nav aria-label={guide.contents} className="hidden lg:block sticky top-6">
            <ul className="space-y-1">
              {visible.map(s => {
                const Icon = ICONS[s.id] ?? HelpCircle;
                return (
                  <li key={s.id}>
                    <a href={`#${s.id}`}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-foreground/70 hover:bg-card hover:text-primary transition-colors">
                      <Icon className="h-4 w-4" /> {s.title}
                    </a>
                  </li>
                );
              })}
              {faq.length > 0 && (
                <li>
                  <a href="#questions"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-foreground/70 hover:bg-card hover:text-primary transition-colors">
                    <HelpCircle className="h-4 w-4" /> {guide.questions}
                  </a>
                </li>
              )}
            </ul>
          </nav>

          <div className="space-y-8 min-w-0">
            {nothing && (
              <div className="rounded-3xl border border-dashed border-border/60 p-10 text-center">
                <p className="font-display text-xl text-primary">{guide.nothing} &ldquo;{query}&rdquo;</p>
                <p className="text-sm text-muted-foreground mt-2">{guide.nothingHint}</p>
              </div>
            )}

            {visible.map(s => {
              const Icon = ICONS[s.id] ?? HelpCircle;
              return (
                <section key={s.id} id={s.id} className="scroll-mt-6 rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-chip grid place-items-center text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-display text-2xl text-primary">{s.title}</h2>
                        <p className="text-sm text-muted-foreground mt-1">{s.summary}</p>
                      </div>
                    </div>
                    {s.link && (
                      <Link href={s.link.href}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary hover:bg-chip transition-colors">
                        {s.link.label} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>

                  <div className="mt-6 space-y-7">
                    {s.topics.map(topic => (
                      <div key={topic.title}>
                        <h3 className="font-semibold text-primary">{topic.title}</h3>
                        <div className="mt-3 space-y-3">
                          {topic.blocks.map((b, i) => <BlockView key={i} block={b} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {faq.length > 0 && (
              <section id="questions" className="scroll-mt-6 rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-chip grid place-items-center text-primary">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl text-primary">{guide.questions}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{guide.questionsBody}</p>
                  </div>
                </div>
                <div className="mt-6 divide-y divide-border/50">
                  {faq.map(f => (
                    <details key={f.q} className="group py-4">
                      <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-sm font-semibold text-primary">
                        {f.q}
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-2 text-sm text-foreground/75 leading-relaxed">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </PatientPortalLayout>
  );
};

export default UserGuide;
