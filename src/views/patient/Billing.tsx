"use client";

import { motion } from "framer-motion";
import { Building2, TreePine, Filter, Calendar, ShieldCheck, CreditCard, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { PatientPortalLayout } from "@/components/portal/PatientPortalLayout";

const invoices = [
  { id: "#BL-2024-0012", date: "Oct 15, 2024", amount: "$340.00", status: "PAID" },
  { id: "#BL-2024-0014", date: "Oct 28, 2024", amount: "$890.50", status: "UNPAID" },
  { id: "#BL-2024-0008", date: "Sep 12, 2024", amount: "$110.00", status: "PAID" },
  { id: "#BL-2024-0005", date: "Aug 05, 2024", amount: "$200.00", status: "PAID" },
];

const Billing = () => (
  <PatientPortalLayout>
    <div className="flex items-baseline gap-3 flex-wrap">
      <h1 className="font-display text-5xl text-primary">Billing Account ID:</h1>
      <span className="font-display text-4xl text-foreground/60">| BL-9920-X</span>
    </div>

    <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-8 shadow-glow relative overflow-hidden">
        <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="flex items-start justify-between relative">
          <div>
            <p className="text-[10px] tracking-widest font-bold opacity-80">TOTAL OUTSTANDING BALANCE</p>
            <p className="font-display text-6xl mt-3">$1,240.50</p>
          </div>
          <Building2 className="h-7 w-7" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-10 relative">
          <div className="rounded-2xl bg-surface-dark-foreground/10 p-4">
            <p className="text-xs opacity-80">Last Payment</p>
            <p className="font-display text-2xl mt-1">$450.00 <span className="text-xs opacity-70 font-sans">on Oct 12</span></p>
          </div>
          <div className="rounded-2xl bg-surface-dark-foreground/10 p-4">
            <p className="text-xs opacity-80">Upcoming Due</p>
            <p className="font-display text-2xl mt-1">$890.00 <span className="text-xs opacity-70 font-sans">Nov 01</span></p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
        className="rounded-3xl bg-chip/60 p-6 border border-border/40 relative overflow-hidden">
        <TreePine className="absolute -right-4 -bottom-4 h-32 w-32 text-primary/15" />
        <p className="flex items-center gap-2 text-[10px] tracking-widest font-bold text-primary-glow"><ShieldCheck className="h-3.5 w-3.5" /> GREEN BILLING IMPACT</p>
        <p className="text-sm text-foreground/80 mt-3 relative">By using digital invoices, you&apos;ve saved <span className="font-bold text-primary">12.4kg of paper</span> this year.</p>
        <div className="mt-6 flex items-end gap-2 h-16 relative">
          {[40, 55, 35, 70, 90, 60].map((h, i) => (
            <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.08, duration: 0.6 }}
              className="flex-1 max-w-4 rounded-t bg-primary" />
          ))}
        </div>
      </motion.div>
    </div>

    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      className="mt-8 rounded-3xl bg-card border border-border/60 p-7 shadow-soft">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-2xl text-primary">Invoice History</h2>
        <div className="flex gap-2">
          <button onClick={() => toast.info("Filter applied")} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary hover:bg-chip"><Filter className="h-3.5 w-3.5" /> Filter</button>
          <button onClick={() => toast.info("Date range coming soon")} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-primary hover:bg-chip"><Calendar className="h-3.5 w-3.5" /> All Time</button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[1fr_1fr_1fr_1fr_120px] gap-4 text-[10px] tracking-widest font-bold text-muted-foreground pb-3 border-b border-border/50 px-3">
        <div>INVOICE ID</div><div>DATE ISSUED</div><div>AMOUNT</div><div>STATUS</div><div>ACTIONS</div>
      </div>
      <div className="mt-2 space-y-2">
        {invoices.map((inv, i) => (
          <motion.div key={inv.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className={`grid grid-cols-[1fr_1fr_1fr_1fr_120px] gap-4 items-center px-3 py-3 rounded-xl ${inv.status === "UNPAID" ? "bg-chip/40" : "hover:bg-muted/30"}`}>
            <p className="font-semibold text-primary text-sm">{inv.id}</p>
            <p className="text-sm text-foreground/70">{inv.date}</p>
            <p className="font-semibold text-primary text-sm">{inv.amount}</p>
            <span className={`justify-self-start rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${inv.status === "PAID" ? "bg-chip text-primary" : "bg-destructive/15 text-destructive"}`}>{inv.status}</span>
            <div className="flex items-center gap-2 justify-end">
              {inv.status === "UNPAID" && <button onClick={() => toast.success("Payment processing")} className="rounded-full bg-gradient-dark text-surface-dark-foreground px-3 py-1.5 text-xs font-semibold shadow-glow">Pay now</button>}
              <button onClick={() => toast.info(`Viewing ${inv.id}`)} className="text-foreground/60 hover:text-primary"><Eye className="h-4 w-4" /></button>
              <button onClick={() => toast.success(`Downloading ${inv.id}`)} className="text-foreground/60 hover:text-primary"><Download className="h-4 w-4" /></button>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="text-center mt-5">
        <button onClick={() => toast.info("Loading full history")} className="text-sm font-semibold text-primary hover:underline">View all historical invoices →</button>
      </div>
    </motion.div>

    <div className="grid md:grid-cols-2 gap-6 mt-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-chip/40 p-6 border border-border/40">
        <h3 className="font-display text-2xl text-primary">Payment Methods</h3>
        <div className="mt-5 rounded-2xl bg-card p-4 flex items-center gap-4 border border-border/40">
          <div className="h-10 w-14 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">VISA</div>
          <div className="flex-1">
            <p className="font-semibold text-primary">•••• •••• •••• 4242</p>
            <p className="text-xs text-muted-foreground">EXPIRES 12/26</p>
          </div>
          <span className="rounded-full bg-chip text-primary text-[10px] tracking-widest font-bold px-3 py-1">Default</span>
        </div>
        <button onClick={() => toast.success("Add payment method")} className="mt-4 w-full rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-primary hover:bg-chip transition-colors flex items-center justify-center gap-2">
          <CreditCard className="h-4 w-4" /> Add New Method
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-3xl bg-gradient-dark text-surface-dark-foreground p-7 shadow-glow relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-accent/10 blur-2xl" />
        <p className="flex items-center gap-2 text-[10px] tracking-widest font-bold opacity-80"><ShieldCheck className="h-3.5 w-3.5" /> ACTIVE COVERAGE</p>
        <h3 className="font-display text-3xl mt-3">Emerald Health Shield</h3>
        <p className="text-sm opacity-80 mt-3">Your plan covers 85% of diagnostic laboratory services and 100% of preventative care.</p>
        <button onClick={() => toast.info("Manage claims")} className="mt-5 rounded-full bg-card text-primary px-5 py-2.5 text-sm font-semibold hover:opacity-90">Manage Claims</button>
      </motion.div>
    </div>
  </PatientPortalLayout>
);
export default Billing;

