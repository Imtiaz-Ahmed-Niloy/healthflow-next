"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Send, Trash2, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { usePharmacyCan, usePharmacyError } from "@/components/pharmacy/ui";
import { Btn, Card } from "@/components/admin/ui";
import type { ChatMessage } from "@/lib/pharmacy";
import { useAskAssistantMutation, usePharmacySettingsQuery } from "@/redux/api/pharmacy";

const SUGGESTIONS = ["today", "topSellers", "lowStock", "expiring", "profit", "reorder"] as const;

/**
 * Ask a question about this pharmacy in plain words.
 *
 * Every question is sent with the same totals the dashboard, reports and
 * insights screens show, so the answer is about this pharmacy's own figures
 * as they are now. The conversation lives in this tab only: nothing is saved,
 * and leaving the page clears it.
 */
const Page = () => {
  const t = useTranslations("pharmacy.assistant");
  const describe = usePharmacyError();
  const can = usePharmacyCan();
  const { data: settingsData } = usePharmacySettingsQuery();
  const [ask, { isLoading }] = useAskAssistantMutation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, isLoading]);

  const ready = Boolean(settingsData?.ai_configured) && Boolean(settingsData?.data.ai_assistant);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || isLoading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setDraft("");
    setFailure(null);
    try {
      const answer = await ask({ messages: next }).unwrap();
      setMessages([...next, { role: "assistant", content: answer.data.reply }]);
    } catch (cause) {
      // The question stays on screen, so it can be sent again as it was.
      setFailure(describe(cause));
    }
  };

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")} needs="see_reports"
      actions={messages.length > 0 && (
        <Btn variant="outline" onClick={() => { setMessages([]); setFailure(null); }}><Trash2 className="h-4 w-4" /> {t("clear")}</Btn>
      )}>
      <Card className="mx-auto flex h-[calc(100vh-13rem)] min-h-[420px] max-w-4xl flex-col p-0">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 lg:p-6">
          {settingsData && !ready && (
            <div className="rounded-xl bg-yellow-100 px-4 py-3 text-sm text-yellow-900">
              {settingsData.ai_configured ? t("switchedOff") : t("notConfigured")}{" "}
              {can("administer") && <Link href="/pharmacy/ai-settings" className="font-semibold underline">{t("openSettings")}</Link>}
            </div>
          )}

          {messages.length === 0 ? (
            <div className="py-6 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Bot className="h-6 w-6" /></span>
              <p className="mt-3 font-display text-xl text-primary">{t("emptyTitle")}</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t("emptyHint")}</p>
              <p className="mt-6 mb-2 text-xs font-semibold text-muted-foreground">{t("suggested")}</p>
              <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
                {SUGGESTIONS.map(key => (
                  <button key={key} type="button" disabled={!ready || isLoading} onClick={() => send(t(`questions.${key}`))}
                    className="rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-primary/50 hover:text-primary disabled:opacity-50 disabled:pointer-events-none">
                    {t(`questions.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                  {message.role === "user" ? <UserRound className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </span>
                <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground"
                }`}>
                  {message.content}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary"><Bot className="h-4 w-4" /></span>
              <span className="animate-pulse">{t("thinking")}</span>
            </div>
          )}
          {failure && <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{failure}</p>}
          <div ref={end} />
        </div>

        <form onSubmit={event => { event.preventDefault(); send(draft); }} className="flex items-end gap-2 border-t border-border/50 p-3">
          <textarea value={draft} onChange={event => setDraft(event.target.value)} rows={1} maxLength={4000} disabled={!ready}
            onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(draft); } }}
            placeholder={t("placeholder")} aria-label={t("placeholder")}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl bg-muted/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
          <Btn type="submit" disabled={!ready || isLoading || !draft.trim()} className="!py-3"><Send className="h-4 w-4" /> {t("send")}</Btn>
        </form>
      </Card>
      <p className="mx-auto mt-3 max-w-4xl text-center text-[11px] text-muted-foreground">{t("disclaimer")}</p>
    </PharmacyLayout>
  );
};

export default Page;
