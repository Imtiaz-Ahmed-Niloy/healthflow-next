"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { FlaskConical, Search, Plus, Minus, Trash2, Clock, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Input } from "@/components/ui/input";
import { hospitals } from "@/data/hospitals";

const allTests = hospitals[0].lab_tests;

const LabBooking = () => {
  const params = useSearchParams();
  const preselect = params.get("test");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>(preselect ? { [preselect]: 1 } : {});
  const cats = useMemo(() => ["All", ...Array.from(new Set(allTests.map((t) => t.category)))], []);
  const [cat, setCat] = useState("All");

  const filtered = allTests.filter((t) =>
    (cat === "All" || t.category === cat) &&
    t.name.toLowerCase().includes(query.toLowerCase()),
  );

  const items = Object.entries(cart).map(([name, qty]) => {
    const t = allTests.find((x) => x.name === name)!;
    return { ...t, qty };
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
          <FlaskConical className="h-3 w-3" /> Diagnostics
        </span>
        <h1 className="font-display text-5xl text-primary mt-3">Book Lab Tests</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">Transparent pricing, fast turnaround, results delivered straight to your portal.</p>

        <div className="grid lg:grid-cols-[1fr_360px] gap-8 mt-10">
          <div>
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tests..." className="pl-9 rounded-full" />
              </div>
              <div className="flex flex-wrap gap-2">
                {cats.map((c) => (
                  <button key={c} onClick={() => setCat(c)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${cat === c ? "bg-primary text-primary-foreground" : "bg-accent/40 text-primary hover:bg-accent/60"}`}>{c}</button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {filtered.map((t, i) => {
                const qty = cart[t.name] ?? 0;
                return (
                  <motion.div key={t.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="rounded-2xl bg-card border border-border/60 p-4 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-primary text-sm leading-tight">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{t.category}</p>
                      </div>
                      <span className="font-display text-lg text-primary shrink-0">${t.price}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-2 inline-flex items-center gap-1"><Clock className="h-3 w-3" />{t.turnaround}</div>
                    <div className="mt-3 flex items-center justify-between">
                      {qty === 0 ? (
                        <button onClick={() => add(t.name)} className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-glow">Add</button>
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-full border border-border px-1 py-1">
                          <button onClick={() => sub(t.name)} className="h-6 w-6 rounded-full bg-accent/40 text-primary"><Minus className="h-3 w-3 mx-auto" /></button>
                          <span className="text-sm font-semibold text-primary w-5 text-center">{qty}</span>
                          <button onClick={() => add(t.name)} className="h-6 w-6 rounded-full bg-primary text-primary-foreground"><Plus className="h-3 w-3 mx-auto" /></button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <aside className="rounded-3xl bg-card border border-border/60 shadow-card p-6 sticky top-24 self-start">
            <h2 className="font-display text-xl text-primary">Your Cart</h2>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-4">No tests selected yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {items.map((x) => (
                  <div key={x.name} className="flex items-start gap-2 text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-primary leading-tight">{x.name}</p>
                      <p className="text-[11px] text-muted-foreground">${x.price} × {x.qty}</p>
                    </div>
                    <button onClick={() => remove(x.name)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-5 pt-5 border-t border-border/60 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="font-display text-2xl text-primary">${total}</span>
            </div>
            <button onClick={() => { if (!items.length) return toast.error("Cart is empty"); toast.success("Tests booked", { description: `${items.length} tests · $${total}` }); setCart({}); }}
              className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-glow inline-flex items-center justify-center gap-2">
              Book Tests <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-3 text-[11px] text-muted-foreground inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" />Results securely delivered to your portal</p>
            <Link href="/hospitals" className="mt-3 block text-center text-xs text-primary hover:underline">Browse hospitals →</Link>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LabBooking;

