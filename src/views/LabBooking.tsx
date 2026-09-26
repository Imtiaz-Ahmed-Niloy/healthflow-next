"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { FlaskConical, Search, Plus, Minus, Trash2, Clock, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { hospitals } from "@/data/hospitals";
import { useFormatters } from "@/lib/appSettings";

const allTests = hospitals[0].lab_tests;

const LabBooking = () => {
  const t = useTranslations("labBooking");
  const { formatCurrency } = useFormatters();
  const params = useSearchParams();
  const preselect = params?.get("test");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>(preselect ? { [preselect]: 1 } : {});
  const cats = useMemo(() => ["All", ...Array.from(new Set(allTests.map((test) => test.category)))], []);
  const [cat, setCat] = useState("All");

  const filtered = allTests.filter((test) =>
    (cat === "All" || test.category === cat) &&
    test.name.toLowerCase().includes(query.toLowerCase()),
  );

  const items = Object.entries(cart).map(([name, qty]) => {
    const test = allTests.find((x) => x.name === name)!;
    return { ...test, qty };
  }).filter((x) => x.name);
  const total = items.reduce((a, x) => a + x.price * x.qty, 0);

  const add = (name: string) => setCart((c) => ({ ...c, [name]: (c[name] ?? 0) + 1 }));
  const sub = (name: string) => setCart((c) => {
    const next = { ...c, [name]: Math.max((c[name] ?? 0) - 1, 0) };
    if (next[name] === 0) delete next[name];
    return next;
  });
  const remove = (name: string) => setCart((c) => { const n = { ...c }; delete n[name]; return n; });

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      <main className="container mx-auto py-16">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
          <FlaskConical className="h-3 w-3" /> {t("badge")}
        </span>
        <h1 className="font-display text-5xl text-primary mt-3">{t("title")}</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">{t("intro")}</p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 mt-10">
          <div>
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} className="pl-9 rounded-full" />
              </div>
              <div className="flex flex-wrap gap-2">
                {cats.map((c) => (
                  <button key={c} onClick={() => setCat(c)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${cat === c ? "bg-primary text-primary-foreground" : "bg-accent/40 text-primary hover:bg-accent/60"}`}>{c === "All" ? t("all") : c}</button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {filtered.map((test, i) => {
                const qty = cart[test.name] ?? 0;
                return (
                  <motion.div key={test.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="rounded-2xl bg-card border border-border/60 p-4 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-primary text-sm leading-tight">{test.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{test.category}</p>
                      </div>
                      <span className="font-display text-lg text-primary shrink-0">{formatCurrency(test.price)}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-2 inline-flex items-center gap-1"><Clock className="h-3 w-3" />{test.turnaround}</div>
                    <div className="mt-3 flex items-center justify-between">
                      {qty === 0 ? (
                        <button onClick={() => add(test.name)} className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-glow">{t("add")}</button>
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-full border border-border px-1 py-1">
                          <button onClick={() => sub(test.name)} className="h-6 w-6 rounded-full bg-accent/40 text-primary"><Minus className="h-3 w-3 mx-auto" /></button>
                          <span className="text-sm font-semibold text-primary w-5 text-center">{qty}</span>
                          <button onClick={() => add(test.name)} className="h-6 w-6 rounded-full bg-primary text-primary-foreground"><Plus className="h-3 w-3 mx-auto" /></button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <aside className="rounded-3xl bg-card border border-border/60 shadow-card p-6 lg:sticky lg:top-24 self-start">
            <h2 className="font-display text-xl text-primary">{t("cart")}</h2>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-4">{t("empty")}</p>
            ) : (
              <div className="mt-4 space-y-3">
                {items.map((x) => (
                  <div key={x.name} className="flex items-start gap-2 text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-primary leading-tight">{x.name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatCurrency(x.price)} × {x.qty}</p>
                    </div>
                    <button onClick={() => remove(x.name)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 pt-5 border-t border-border/60 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("total")}</span>
              <span className="font-display text-2xl text-primary">{formatCurrency(total)}</span>
            </div>
            <button onClick={() => { if (!items.length) return toast.error(t("cartEmpty")); toast.success(t("booked"), { description: t("bookedDetail", { count: items.length, total: formatCurrency(total) }) }); setCart({}); }}
              className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow inline-flex items-center justify-center gap-2">
              {t("book")} <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-3 text-[11px] text-muted-foreground inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{t("secure")}</p>
            <Link href="/hospitals" className="mt-3 block text-center text-xs text-primary hover:underline">{t("browse")}</Link>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LabBooking;

