'use client';
import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, Btn, Pill, Kpi, SectionTitle } from "@/components/admin/ui";
import { Modal, Field, Input, Select, exportCSV } from "@/components/admin/crud";
import { useNotifications } from "@/components/admin/NotificationProvider";
import { load, save } from "@/lib/storage";
import {
  BookOpen, Wallet, Receipt, Landmark, ScrollText, BookMarked, Calculator,
  TrendingUp, TrendingDown, Banknote, Boxes, Percent, Building2, PiggyBank,
  Plus, Download, Search, FileBarChart, ArrowDownUp, CircleDollarSign, Target,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

/* ============================ TYPES & SEED DATA ============================ */
type VoucherType =
  | "Payment" | "Receipt" | "Contra" | "Journal" | "Sales" | "Purchase" | "Credit Note" | "Debit Note";
type Voucher = {
  id: string; no: string; date: string; type: VoucherType;
  party: string; ledgerDr: string; ledgerCr: string;
  amount: number; narration: string; status: "Posted" | "Draft";
};

type Ledger = {
  id: string; name: string; group: string; opening: number;
  debit: number; credit: number;
};

type StockItem = {
  id: string; name: string; unit: string; qty: number; rate: number; value: number; reorder: number;
};

type CostCenter = { id: string; name: string; budget: number; spent: number };
type Budget = { id: string; head: string; period: string; planned: number; actual: number };

const SEED_LEDGERS: Ledger[] = [
  { id: "L01", name: "Cash in Hand", group: "Current Assets", opening: 250000, debit: 1820000, credit: 1510000 },
  { id: "L02", name: "HSBC Bank A/C", group: "Bank Accounts", opening: 1450000, debit: 4280000, credit: 3640000 },
  { id: "L03", name: "City Bank A/C", group: "Bank Accounts", opening: 820000, debit: 1980000, credit: 1620000 },
  { id: "L04", name: "Accounts Receivable", group: "Sundry Debtors", opening: 640000, debit: 3120000, credit: 2680000 },
  { id: "L05", name: "Accounts Payable", group: "Sundry Creditors", opening: 380000, debit: 1240000, credit: 1820000 },
  { id: "L06", name: "Consultation Revenue", group: "Direct Income", opening: 0, debit: 0, credit: 4820000 },
  { id: "L07", name: "Pharmacy Sales", group: "Direct Income", opening: 0, debit: 0, credit: 2640000 },
  { id: "L08", name: "Lab Services Revenue", group: "Direct Income", opening: 0, debit: 0, credit: 1820000 },
  { id: "L09", name: "Salary & Wages", group: "Indirect Expenses", opening: 0, debit: 2840000, credit: 0 },
  { id: "L10", name: "Rent Expense", group: "Indirect Expenses", opening: 0, debit: 360000, credit: 0 },
  { id: "L11", name: "Utilities Expense", group: "Indirect Expenses", opening: 0, debit: 180000, credit: 0 },
  { id: "L12", name: "Medical Supplies", group: "Direct Expenses", opening: 0, debit: 1240000, credit: 0 },
  { id: "L13", name: "Equipment Maintenance", group: "Indirect Expenses", opening: 0, debit: 220000, credit: 0 },
  { id: "L14", name: "VAT Payable", group: "Duties & Taxes", opening: 0, debit: 80000, credit: 320000 },
  { id: "L15", name: "Capital Account", group: "Capital", opening: 5000000, debit: 0, credit: 0 },
  { id: "L16", name: "Medical Equipment", group: "Fixed Assets", opening: 3200000, debit: 240000, credit: 0 },
];

const SEED_VOUCHERS: Voucher[] = [
  { id: "V01", no: "RCT-0421", date: "2026-05-22", type: "Receipt", party: "Mr. Rahman", ledgerDr: "Cash in Hand", ledgerCr: "Consultation Revenue", amount: 4500, narration: "OPD consultation fee", status: "Posted" },
  { id: "V02", no: "PMT-0188", date: "2026-05-22", type: "Payment", party: "MedSupply BD", ledgerDr: "Medical Supplies", ledgerCr: "HSBC Bank A/C", amount: 84000, narration: "Surgical consumables", status: "Posted" },
  { id: "V03", no: "SAL-0091", date: "2026-05-21", type: "Sales", party: "Cigna Insurance", ledgerDr: "Accounts Receivable", ledgerCr: "Consultation Revenue", amount: 128000, narration: "Inpatient claim batch", status: "Posted" },
  { id: "V04", no: "PUR-0142", date: "2026-05-21", type: "Purchase", party: "PharmaCo Ltd", ledgerDr: "Pharmacy Sales", ledgerCr: "Accounts Payable", amount: 96000, narration: "Pharmacy restock", status: "Posted" },
  { id: "V05", no: "CON-0033", date: "2026-05-20", type: "Contra", party: "Self", ledgerDr: "HSBC Bank A/C", ledgerCr: "Cash in Hand", amount: 200000, narration: "Cash deposit to bank", status: "Posted" },
  { id: "V06", no: "JRN-0077", date: "2026-05-20", type: "Journal", party: "Adj.", ledgerDr: "Equipment Maintenance", ledgerCr: "Accounts Payable", amount: 18500, narration: "MRI service contract accrual", status: "Posted" },
  { id: "V07", no: "RCT-0422", date: "2026-05-19", type: "Receipt", party: "MetLife Insurance", ledgerDr: "HSBC Bank A/C", ledgerCr: "Accounts Receivable", amount: 312000, narration: "Claim settlement Apr batch", status: "Posted" },
  { id: "V08", no: "PMT-0189", date: "2026-05-19", type: "Payment", party: "Payroll", ledgerDr: "Salary & Wages", ledgerCr: "HSBC Bank A/C", amount: 480000, narration: "Mid-month payroll", status: "Posted" },
  { id: "V09", no: "CRN-0014", date: "2026-05-18", type: "Credit Note", party: "Mr. Karim", ledgerDr: "Consultation Revenue", ledgerCr: "Accounts Receivable", amount: 3200, narration: "Refund - cancelled procedure", status: "Posted" },
  { id: "V10", no: "DRN-0011", date: "2026-05-18", type: "Debit Note", party: "MedSupply BD", ledgerDr: "Accounts Payable", ledgerCr: "Medical Supplies", amount: 5400, narration: "Defective items returned", status: "Draft" },
];

const SEED_STOCK: StockItem[] = [
  { id: "S01", name: "Paracetamol 500mg", unit: "Strip", qty: 1240, rate: 18, value: 22320, reorder: 200 },
  { id: "S02", name: "Surgical Gloves (Box)", unit: "Box", qty: 86, rate: 380, value: 32680, reorder: 50 },
  { id: "S03", name: "N95 Masks", unit: "Pcs", qty: 320, rate: 65, value: 20800, reorder: 100 },
  { id: "S04", name: "IV Cannula 22G", unit: "Pcs", qty: 42, rate: 95, value: 3990, reorder: 80 },
  { id: "S05", name: "Insulin Vials", unit: "Vial", qty: 64, rate: 850, value: 54400, reorder: 30 },
  { id: "S06", name: "Sutures 3-0", unit: "Pack", qty: 28, rate: 420, value: 11760, reorder: 40 },
];

const SEED_COST_CENTERS: CostCenter[] = [
  { id: "C01", name: "OPD", budget: 800000, spent: 612000 },
  { id: "C02", name: "Emergency", budget: 1200000, spent: 1080000 },
  { id: "C03", name: "Laboratory", budget: 600000, spent: 412000 },
  { id: "C04", name: "Pharmacy", budget: 900000, spent: 720000 },
  { id: "C05", name: "Radiology", budget: 700000, spent: 540000 },
];

const SEED_BUDGETS: Budget[] = [
  { id: "B01", head: "Salaries & Wages", period: "May 2026", planned: 3000000, actual: 2840000 },
  { id: "B02", head: "Medical Supplies", period: "May 2026", planned: 1400000, actual: 1240000 },
  { id: "B03", head: "Utilities", period: "May 2026", planned: 200000, actual: 180000 },
  { id: "B04", head: "Equipment Maintenance", period: "May 2026", planned: 250000, actual: 220000 },
];

const FY_TREND = [
  { m: "Dec", income: 720, expense: 540 },
  { m: "Jan", income: 810, expense: 590 },
  { m: "Feb", income: 880, expense: 620 },
  { m: "Mar", income: 940, expense: 660 },
  { m: "Apr", income: 1020, expense: 720 },
  { m: "May", income: 1184, expense: 780 },
];

const CASHFLOW = [
  { d: "Mon", inflow: 240, outflow: 180 },
  { d: "Tue", inflow: 310, outflow: 210 },
  { d: "Wed", inflow: 280, outflow: 260 },
  { d: "Thu", inflow: 420, outflow: 220 },
  { d: "Fri", inflow: 380, outflow: 310 },
  { d: "Sat", inflow: 290, outflow: 170 },
  { d: "Sun", inflow: 150, outflow: 90 },
];

const REVENUE_MIX = [
  { name: "Consultation", value: 4820 },
  { name: "Pharmacy", value: 2640 },
  { name: "Laboratory", value: 1820 },
  { name: "Procedures", value: 1240 },
];
const MIX_COLORS = ["hsl(var(--primary))", "hsl(var(--primary-glow))", "hsl(var(--accent))", "hsl(var(--chip))"];

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: TrendingUp },
  { id: "vouchers", label: "Vouchers", icon: ScrollText },
  { id: "daybook", label: "Day Book", icon: BookOpen },
  { id: "ledgers", label: "Ledgers", icon: BookMarked },
  { id: "trial", label: "Trial Balance", icon: Calculator },
  { id: "pl", label: "Profit & Loss", icon: TrendingUp },
  { id: "balance", label: "Balance Sheet", icon: Landmark },
  { id: "cashflow", label: "Cash & Bank", icon: Banknote },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "tax", label: "GST / VAT", icon: Percent },
  { id: "cost", label: "Cost Centers", icon: Building2 },
  { id: "budget", label: "Budgets", icon: Target },
] as const;
type TabId = typeof TABS[number]["id"];

const fmt = (n: number) => "৳" + Math.round(n).toLocaleString();

/* ================================ COMPONENT ================================ */
const Accounts = () => {
  const { push } = useNotifications();
  const [tab, setTab] = useState<TabId>("dashboard");

  const [vouchers, setVouchers] = useState<Voucher[]>(() => load("acc:vouchers", SEED_VOUCHERS));
  const [ledgers, setLedgers] = useState<Ledger[]>(() => load("acc:ledgers", SEED_LEDGERS));
  const [stock, setStock] = useState<StockItem[]>(() => load("acc:stock", SEED_STOCK));
  const [centers] = useState<CostCenter[]>(() => load("acc:centers", SEED_COST_CENTERS));
  const [budgets] = useState<Budget[]>(() => load("acc:budgets", SEED_BUDGETS));

  const [vOpen, setVOpen] = useState(false);
  const [lOpen, setLOpen] = useState(false);
  const [sOpen, setSOpen] = useState(false);
  const [q, setQ] = useState("");
  const [vType, setVType] = useState<string>("all");

  const persistV = (next: Voucher[]) => { setVouchers(next); save("acc:vouchers", next); };
  const persistL = (next: Ledger[]) => { setLedgers(next); save("acc:ledgers", next); };
  const persistS = (next: StockItem[]) => { setStock(next); save("acc:stock", next); };

  /* ---- derived totals ---- */
  const totals = useMemo(() => {
    const income = ledgers.filter(l => l.group.includes("Income")).reduce((s, l) => s + l.credit - l.debit, 0);
    const directExp = ledgers.filter(l => l.group === "Direct Expenses").reduce((s, l) => s + l.debit - l.credit, 0);
    const indirectExp = ledgers.filter(l => l.group === "Indirect Expenses").reduce((s, l) => s + l.debit - l.credit, 0);
    const expense = directExp + indirectExp;
    const grossProfit = income - directExp;
    const netProfit = income - expense;
    const cash = ledgers.find(l => l.name === "Cash in Hand");
    const bankBal = ledgers.filter(l => l.group === "Bank Accounts").reduce((s, l) => s + l.opening + l.debit - l.credit, 0);
    const cashBal = (cash?.opening || 0) + (cash?.debit || 0) - (cash?.credit || 0);
    const receivables = ledgers.filter(l => l.group === "Sundry Debtors").reduce((s, l) => s + l.opening + l.debit - l.credit, 0);
    const payables = ledgers.filter(l => l.group === "Sundry Creditors").reduce((s, l) => s + l.opening + l.credit - l.debit, 0);
    const tax = ledgers.find(l => l.name === "VAT Payable");
    const taxDue = (tax?.credit || 0) - (tax?.debit || 0);
    return { income, expense, grossProfit, netProfit, cashBal, bankBal, receivables, payables, taxDue, directExp, indirectExp };
  }, [ledgers]);

  const filteredVouchers = vouchers.filter(v =>
    (vType === "all" || v.type === vType) &&
    (!q || (v.no + v.party + v.narration).toLowerCase().includes(q.toLowerCase()))
  );

  /* ---- voucher form ---- */
  const [vForm, setVForm] = useState<Omit<Voucher, "id">>({
    no: "", date: new Date().toISOString().slice(0, 10), type: "Payment",
    party: "", ledgerDr: "", ledgerCr: "", amount: 0, narration: "", status: "Posted",
  });
  const submitVoucher = () => {
    if (!vForm.no || !vForm.party || !vForm.amount) { push({ title: "Missing fields", body: "Voucher No, Party and Amount are required", tone: "warn" }); return; }
    const next = [{ ...vForm, id: "V" + Date.now() }, ...vouchers];
    persistV(next);
    setVOpen(false);
    setVForm({ ...vForm, no: "", party: "", amount: 0, narration: "" });
    push({ title: "Voucher posted", body: `${vForm.type} ${vForm.no} for ${fmt(vForm.amount)}`, tone: "ok" });
  };

  /* ---- ledger form ---- */
  const [lForm, setLForm] = useState<Omit<Ledger, "id">>({ name: "", group: "Current Assets", opening: 0, debit: 0, credit: 0 });
  const submitLedger = () => {
    if (!lForm.name) return;
    const next = [...ledgers, { ...lForm, id: "L" + Date.now() }];
    persistL(next); setLOpen(false);
    setLForm({ name: "", group: "Current Assets", opening: 0, debit: 0, credit: 0 });
    push({ title: "Ledger created", body: lForm.name, tone: "ok" });
  };

  /* ---- stock form ---- */
  const [sForm, setSForm] = useState<Omit<StockItem, "id" | "value">>({ name: "", unit: "Pcs", qty: 0, rate: 0, reorder: 0 });
  const submitStock = () => {
    if (!sForm.name) return;
    const value = sForm.qty * sForm.rate;
    const next = [...stock, { ...sForm, value, id: "S" + Date.now() }];
    persistS(next); setSOpen(false);
    setSForm({ name: "", unit: "Pcs", qty: 0, rate: 0, reorder: 0 });
    push({ title: "Stock item added", body: sForm.name, tone: "ok" });
  };

  /* ============================ RENDER ============================ */
  return (
    <AdminLayout title="Accounts & Finance" subtitle="Tally-style accounting & financial control">
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi icon={CircleDollarSign} label="Net Profit (FY)" value={fmt(totals.netProfit)} trend="+14.2%" />
        <Kpi icon={Wallet} label="Cash + Bank" value={fmt(totals.cashBal + totals.bankBal)} tone="accent" />
        <Kpi icon={Receipt} label="Receivables" value={fmt(totals.receivables)} tone="chip" />
        <Kpi icon={TrendingDown} label="Payables" value={fmt(totals.payables)} tone="destructive" />
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-card border border-border/60 shadow-soft">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === t.id ? "bg-primary text-primary-foreground shadow-soft" : "text-foreground/70 hover:bg-muted/60"
            }`}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ====================== DASHBOARD ====================== */}
      {tab === "dashboard" && (
        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="p-5 lg:col-span-2">
            <SectionTitle title="Income vs Expense (6 months)" />
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={FY_TREND}>
                <defs>
                  <linearGradient id="gi" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ge" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="m" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <RTip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Area type="monotone" dataKey="income" stroke="hsl(var(--primary))" fill="url(#gi)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" fill="url(#ge)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Revenue Mix" />
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={REVENUE_MIX} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {REVENUE_MIX.map((_, i) => <Cell key={i} fill={MIX_COLORS[i % MIX_COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <RTip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5 lg:col-span-2">
            <SectionTitle title="Weekly Cash Flow" />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={CASHFLOW}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <RTip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="inflow" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="outflow" fill="hsl(var(--accent-foreground))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Quick Stats" />
            <ul className="space-y-3 text-sm">
              <Stat label="Gross Profit" value={fmt(totals.grossProfit)} tone="ok" />
              <Stat label="Direct Expenses" value={fmt(totals.directExp)} />
              <Stat label="Indirect Expenses" value={fmt(totals.indirectExp)} />
              <Stat label="VAT Payable" value={fmt(totals.taxDue)} tone="warn" />
              <Stat label="Open Vouchers" value={String(vouchers.filter(v => v.status === "Draft").length)} />
              <Stat label="Active Ledgers" value={String(ledgers.length)} />
            </ul>
          </Card>
        </div>
      )}

      {/* ====================== VOUCHERS ====================== */}
      {tab === "vouchers" && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search voucher no, party, narration…"
                className="w-full pl-10 pr-4 py-2 rounded-full bg-muted/40 text-sm outline-none" />
            </div>
            <select value={vType} onChange={e => setVType(e.target.value)} className="bg-muted/40 rounded-full px-4 py-2 text-sm outline-none">
              <option value="all">All Types</option>
              {["Payment", "Receipt", "Contra", "Journal", "Sales", "Purchase", "Credit Note", "Debit Note"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <Btn variant="outline" onClick={() => exportCSV(filteredVouchers as never, "vouchers.csv")}><Download className="h-4 w-4" /> Export</Btn>
            <Btn onClick={() => setVOpen(true)}><Plus className="h-4 w-4" /> New Voucher</Btn>
          </div>
          <TableShell head={["No", "Date", "Type", "Party", "Dr A/C", "Cr A/C", "Amount", "Status"]}>
            {filteredVouchers.map(v => (
              <tr key={v.id} className="border-t border-border/40 hover:bg-muted/30">
                <td className="px-3 py-2.5 font-mono text-xs">{v.no}</td>
                <td className="px-3 py-2.5 text-xs">{v.date}</td>
                <td className="px-3 py-2.5"><Pill tone={voucherTone(v.type)}>{v.type}</Pill></td>
                <td className="px-3 py-2.5 font-semibold text-primary">{v.party}</td>
                <td className="px-3 py-2.5 text-xs">{v.ledgerDr}</td>
                <td className="px-3 py-2.5 text-xs">{v.ledgerCr}</td>
                <td className="px-3 py-2.5 text-right font-semibold">{fmt(v.amount)}</td>
                <td className="px-3 py-2.5"><Pill tone={v.status === "Posted" ? "ok" : "warn"}>{v.status}</Pill></td>
              </tr>
            ))}
          </TableShell>
        </Card>
      )}

      {/* ====================== DAY BOOK ====================== */}
      {tab === "daybook" && (
        <Card className="p-5">
          <SectionTitle title="Day Book — Chronological Entries"
            action={<Btn variant="outline" onClick={() => exportCSV(vouchers as never, "daybook.csv")}><Download className="h-4 w-4" /> Export</Btn>} />
          <TableShell head={["Date", "Voucher", "Type", "Particulars", "Debit", "Credit"]}>
            {[...vouchers].sort((a, b) => b.date.localeCompare(a.date)).map(v => (
              <tr key={v.id} className="border-t border-border/40 hover:bg-muted/30">
                <td className="px-3 py-2.5 text-xs">{v.date}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{v.no}</td>
                <td className="px-3 py-2.5"><Pill tone={voucherTone(v.type)}>{v.type}</Pill></td>
                <td className="px-3 py-2.5 text-xs">
                  <div className="font-semibold text-primary">{v.party}</div>
                  <div className="text-muted-foreground">Dr {v.ledgerDr} / Cr {v.ledgerCr}</div>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-primary">{fmt(v.amount)}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-primary">{fmt(v.amount)}</td>
              </tr>
            ))}
          </TableShell>
        </Card>
      )}

      {/* ====================== LEDGERS ====================== */}
      {tab === "ledgers" && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-xl text-primary">Chart of Accounts</h2>
            <div className="flex gap-2">
              <Btn variant="outline" onClick={() => exportCSV(ledgers as never, "ledgers.csv")}><Download className="h-4 w-4" /> Export</Btn>
              <Btn onClick={() => setLOpen(true)}><Plus className="h-4 w-4" /> New Ledger</Btn>
            </div>
          </div>
          <TableShell head={["Ledger", "Group", "Opening", "Debit", "Credit", "Closing"]}>
            {ledgers.map(l => {
              const closing = l.opening + l.debit - l.credit;
              return (
                <tr key={l.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-semibold text-primary">{l.name}</td>
                  <td className="px-3 py-2.5 text-xs"><Pill tone="info">{l.group}</Pill></td>
                  <td className="px-3 py-2.5 text-right text-xs">{fmt(l.opening)}</td>
                  <td className="px-3 py-2.5 text-right text-xs">{fmt(l.debit)}</td>
                  <td className="px-3 py-2.5 text-right text-xs">{fmt(l.credit)}</td>
                  <td className={`px-3 py-2.5 text-right font-bold ${closing < 0 ? "text-destructive" : "text-primary"}`}>{fmt(Math.abs(closing))} {closing < 0 ? "Cr" : "Dr"}</td>
                </tr>
              );
            })}
          </TableShell>
        </Card>
      )}

      {/* ====================== TRIAL BALANCE ====================== */}
      {tab === "trial" && (
        <Card className="p-5">
          <SectionTitle title="Trial Balance — as on today" />
          <TableShell head={["Ledger", "Group", "Debit", "Credit"]}>
            {ledgers.map(l => {
              const net = l.opening + l.debit - l.credit;
              return (
                <tr key={l.id} className="border-t border-border/40">
                  <td className="px-3 py-2.5 font-semibold text-primary">{l.name}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{l.group}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{net > 0 ? fmt(net) : "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{net < 0 ? fmt(-net) : "—"}</td>
                </tr>
              );
            })}
            {(() => {
              const totalDr = ledgers.reduce((s, l) => { const n = l.opening + l.debit - l.credit; return s + (n > 0 ? n : 0); }, 0);
              const totalCr = ledgers.reduce((s, l) => { const n = l.opening + l.debit - l.credit; return s + (n < 0 ? -n : 0); }, 0);
              return (
                <tr className="border-t-2 border-primary/30 bg-primary/5 font-bold">
                  <td className="px-3 py-3" colSpan={2}>TOTAL</td>
                  <td className="px-3 py-3 text-right text-primary">{fmt(totalDr)}</td>
                  <td className="px-3 py-3 text-right text-primary">{fmt(totalCr)}</td>
                </tr>
              );
            })()}
          </TableShell>
        </Card>
      )}

      {/* ====================== P&L ====================== */}
      {tab === "pl" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <SectionTitle title="Income" />
            <ul className="space-y-2 text-sm">
              {ledgers.filter(l => l.group.includes("Income")).map(l => (
                <Stat key={l.id} label={l.name} value={fmt(l.credit - l.debit)} tone="ok" />
              ))}
              <li className="border-t border-border/60 pt-3 mt-3 flex justify-between font-bold text-primary">
                <span>Total Income</span><span>{fmt(totals.income)}</span>
              </li>
            </ul>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Expenses" />
            <ul className="space-y-2 text-sm">
              {ledgers.filter(l => l.group.includes("Expense")).map(l => (
                <Stat key={l.id} label={l.name} value={fmt(l.debit - l.credit)} tone="bad" />
              ))}
              <li className="border-t border-border/60 pt-3 mt-3 flex justify-between font-bold text-primary">
                <span>Total Expenses</span><span>{fmt(totals.expense)}</span>
              </li>
            </ul>
          </Card>
          <Card className="p-6 lg:col-span-2 bg-gradient-to-r from-primary/10 to-accent/30">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] tracking-widest font-bold text-muted-foreground">NET PROFIT</p>
                <p className="font-display text-4xl text-primary mt-1">{fmt(totals.netProfit)}</p>
                <p className="text-xs text-muted-foreground mt-1">Income {fmt(totals.income)} − Expenses {fmt(totals.expense)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] tracking-widest font-bold text-muted-foreground">GROSS PROFIT</p>
                <p className="font-display text-3xl text-primary mt-1">{fmt(totals.grossProfit)}</p>
                <p className="text-xs text-muted-foreground mt-1">Margin: {((totals.netProfit / Math.max(totals.income, 1)) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ====================== BALANCE SHEET ====================== */}
      {tab === "balance" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <SectionTitle title="Assets" />
            <ul className="space-y-2 text-sm">
              {ledgers.filter(l => ["Current Assets", "Bank Accounts", "Sundry Debtors", "Fixed Assets"].includes(l.group)).map(l => {
                const v = l.opening + l.debit - l.credit;
                return <Stat key={l.id} label={l.name} value={fmt(v)} />;
              })}
            </ul>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Liabilities & Capital" />
            <ul className="space-y-2 text-sm">
              {ledgers.filter(l => ["Sundry Creditors", "Duties & Taxes", "Capital"].includes(l.group)).map(l => {
                const v = l.opening + l.credit - l.debit;
                return <Stat key={l.id} label={l.name} value={fmt(v)} />;
              })}
              <Stat label="Retained Earnings (Net Profit)" value={fmt(totals.netProfit)} tone="ok" />
            </ul>
          </Card>
        </div>
      )}

      {/* ====================== CASH & BANK ====================== */}
      {tab === "cashflow" && (
        <div className="grid lg:grid-cols-3 gap-5">
          {ledgers.filter(l => l.group === "Bank Accounts" || l.name === "Cash in Hand").map(l => {
            const bal = l.opening + l.debit - l.credit;
            return (
              <Card key={l.id} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
                    {l.name === "Cash in Hand" ? <Wallet className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
                  </div>
                  <Pill tone="info">{l.group}</Pill>
                </div>
                <p className="text-xs text-muted-foreground">{l.name}</p>
                <p className="font-display text-2xl text-primary mt-1">{fmt(bal)}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-muted-foreground">Inflow</p>
                    <p className="font-bold text-primary">{fmt(l.debit)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-muted-foreground">Outflow</p>
                    <p className="font-bold text-destructive">{fmt(l.credit)}</p>
                  </div>
                </div>
              </Card>
            );
          })}
          <Card className="p-5 lg:col-span-3">
            <SectionTitle title="Bank Reconciliation"
              action={<Btn variant="outline"><ArrowDownUp className="h-4 w-4" /> Reconcile</Btn>} />
            <TableShell head={["Date", "Voucher", "Particulars", "Bank Statement", "Books", "Status"]}>
              {vouchers.filter(v => v.ledgerDr.includes("Bank") || v.ledgerCr.includes("Bank")).slice(0, 8).map(v => {
                const matched = v.status === "Posted";
                return (
                  <tr key={v.id} className="border-t border-border/40">
                    <td className="px-3 py-2.5 text-xs">{v.date}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{v.no}</td>
                    <td className="px-3 py-2.5 text-xs">{v.narration}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{fmt(v.amount)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{fmt(v.amount)}</td>
                    <td className="px-3 py-2.5"><Pill tone={matched ? "ok" : "warn"}>{matched ? "Matched" : "Pending"}</Pill></td>
                  </tr>
                );
              })}
            </TableShell>
          </Card>
        </div>
      )}

      {/* ====================== INVENTORY ====================== */}
      {tab === "inventory" && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-xl text-primary">Stock Summary</h2>
            <div className="flex gap-2">
              <Btn variant="outline" onClick={() => exportCSV(stock as never, "stock.csv")}><Download className="h-4 w-4" /> Export</Btn>
              <Btn onClick={() => setSOpen(true)}><Plus className="h-4 w-4" /> Add Item</Btn>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            <Kpi icon={Boxes} label="Total SKUs" value={String(stock.length)} />
            <Kpi icon={PiggyBank} label="Stock Value" value={fmt(stock.reduce((s, i) => s + i.value, 0))} tone="accent" />
            <Kpi icon={TrendingDown} label="Reorder Needed" value={String(stock.filter(i => i.qty <= i.reorder).length)} tone="destructive" />
          </div>
          <TableShell head={["Item", "Unit", "Qty", "Rate", "Value", "Reorder", "Status"]}>
            {stock.map(i => {
              const low = i.qty <= i.reorder;
              return (
                <tr key={i.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-semibold text-primary">{i.name}</td>
                  <td className="px-3 py-2.5 text-xs">{i.unit}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{i.qty}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{fmt(i.rate)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-primary">{fmt(i.value)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{i.reorder}</td>
                  <td className="px-3 py-2.5"><Pill tone={low ? "bad" : "ok"}>{low ? "Low Stock" : "Healthy"}</Pill></td>
                </tr>
              );
            })}
          </TableShell>
        </Card>
      )}

      {/* ====================== TAX ====================== */}
      {tab === "tax" && (
        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="p-6 lg:col-span-1">
            <div className="h-12 w-12 rounded-xl bg-destructive/10 text-destructive grid place-items-center mb-3">
              <Percent className="h-6 w-6" />
            </div>
            <p className="text-[11px] tracking-widest font-bold text-muted-foreground">VAT PAYABLE</p>
            <p className="font-display text-3xl text-primary mt-1">{fmt(totals.taxDue)}</p>
            <p className="text-xs text-muted-foreground mt-2">Due 15th of next month</p>
            <Btn className="mt-4 w-full justify-center"><FileBarChart className="h-4 w-4" /> Generate Return</Btn>
          </Card>
          <Card className="p-5 lg:col-span-2">
            <SectionTitle title="Tax Ledger Movements" />
            <TableShell head={["Date", "Voucher", "Particulars", "Output VAT", "Input VAT"]}>
              {vouchers.filter(v => v.type === "Sales" || v.type === "Purchase").map(v => {
                const isOutput = v.type === "Sales";
                const tax = Math.round(v.amount * 0.05);
                return (
                  <tr key={v.id} className="border-t border-border/40">
                    <td className="px-3 py-2.5 text-xs">{v.date}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{v.no}</td>
                    <td className="px-3 py-2.5 text-xs">{v.party} — {v.narration}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{isOutput ? fmt(tax) : "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{!isOutput ? fmt(tax) : "—"}</td>
                  </tr>
                );
              })}
            </TableShell>
          </Card>
        </div>
      )}

      {/* ====================== COST CENTERS ====================== */}
      {tab === "cost" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {centers.map(c => {
            const pct = Math.round((c.spent / c.budget) * 100);
            const over = pct > 90;
            return (
              <Card key={c.id} className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg text-primary">{c.name}</h3>
                  <Pill tone={over ? "bad" : pct > 75 ? "warn" : "ok"}>{pct}%</Pill>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Budget {fmt(c.budget)}</p>
                <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${over ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="mt-3 flex justify-between text-xs">
                  <span className="text-muted-foreground">Spent</span>
                  <span className="font-bold text-primary">{fmt(c.spent)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-bold text-primary">{fmt(c.budget - c.spent)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ====================== BUDGETS ====================== */}
      {tab === "budget" && (
        <Card className="p-5">
          <SectionTitle title="Budget vs Actual" />
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgets.map(b => ({ head: b.head, Planned: b.planned / 1000, Actual: b.actual / 1000 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="head" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <RTip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Planned" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Actual" fill="hsl(var(--primary-glow))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-5">
            <TableShell head={["Head", "Period", "Planned", "Actual", "Variance", "Utilization"]}>
              {budgets.map(b => {
                const variance = b.planned - b.actual;
                const pct = Math.round((b.actual / b.planned) * 100);
                return (
                  <tr key={b.id} className="border-t border-border/40">
                    <td className="px-3 py-2.5 font-semibold text-primary">{b.head}</td>
                    <td className="px-3 py-2.5 text-xs">{b.period}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{fmt(b.planned)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{fmt(b.actual)}</td>
                    <td className={`px-3 py-2.5 text-right font-bold ${variance < 0 ? "text-destructive" : "text-primary"}`}>{fmt(variance)}</td>
                    <td className="px-3 py-2.5"><Pill tone={pct > 95 ? "bad" : pct > 80 ? "warn" : "ok"}>{pct}%</Pill></td>
                  </tr>
                );
              })}
            </TableShell>
          </div>
        </Card>
      )}

      {/* ====================== MODALS ====================== */}
      <Modal open={vOpen} onClose={() => setVOpen(false)} title="New Voucher"
        footer={<><Btn variant="ghost" onClick={() => setVOpen(false)}>Cancel</Btn><Btn onClick={submitVoucher}>Post Voucher</Btn></>}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Voucher No"><Input value={vForm.no} onChange={e => setVForm({ ...vForm, no: e.target.value })} placeholder="PMT-0190" /></Field>
          <Field label="Date"><Input type="date" value={vForm.date} onChange={e => setVForm({ ...vForm, date: e.target.value })} /></Field>
          <Field label="Type">
            <Select value={vForm.type} onChange={e => setVForm({ ...vForm, type: e.target.value as VoucherType })}>
              {["Payment", "Receipt", "Contra", "Journal", "Sales", "Purchase", "Credit Note", "Debit Note"].map(t => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Party / Name"><Input value={vForm.party} onChange={e => setVForm({ ...vForm, party: e.target.value })} /></Field>
          <Field label="Debit Ledger">
            <Select value={vForm.ledgerDr} onChange={e => setVForm({ ...vForm, ledgerDr: e.target.value })}>
              <option value="">— Select —</option>
              {ledgers.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </Select>
          </Field>
          <Field label="Credit Ledger">
            <Select value={vForm.ledgerCr} onChange={e => setVForm({ ...vForm, ledgerCr: e.target.value })}>
              <option value="">— Select —</option>
              {ledgers.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </Select>
          </Field>
          <Field label="Amount"><Input type="number" value={vForm.amount} onChange={e => setVForm({ ...vForm, amount: Number(e.target.value) })} /></Field>
          <Field label="Status">
            <Select value={vForm.status} onChange={e => setVForm({ ...vForm, status: e.target.value as "Posted" | "Draft" })}>
              <option>Posted</option><option>Draft</option>
            </Select>
          </Field>
          <div className="sm:col-span-2"><Field label="Narration"><Input value={vForm.narration} onChange={e => setVForm({ ...vForm, narration: e.target.value })} /></Field></div>
        </div>
      </Modal>

      <Modal open={lOpen} onClose={() => setLOpen(false)} title="New Ledger"
        footer={<><Btn variant="ghost" onClick={() => setLOpen(false)}>Cancel</Btn><Btn onClick={submitLedger}>Create</Btn></>}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Ledger Name"><Input value={lForm.name} onChange={e => setLForm({ ...lForm, name: e.target.value })} /></Field>
          <Field label="Group">
            <Select value={lForm.group} onChange={e => setLForm({ ...lForm, group: e.target.value })}>
              {["Current Assets", "Bank Accounts", "Sundry Debtors", "Sundry Creditors", "Direct Income", "Indirect Income", "Direct Expenses", "Indirect Expenses", "Duties & Taxes", "Capital", "Fixed Assets"].map(g => <option key={g}>{g}</option>)}
            </Select>
          </Field>
          <Field label="Opening Balance"><Input type="number" value={lForm.opening} onChange={e => setLForm({ ...lForm, opening: Number(e.target.value) })} /></Field>
        </div>
      </Modal>

      <Modal open={sOpen} onClose={() => setSOpen(false)} title="New Stock Item"
        footer={<><Btn variant="ghost" onClick={() => setSOpen(false)}>Cancel</Btn><Btn onClick={submitStock}>Add</Btn></>}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Item Name"><Input value={sForm.name} onChange={e => setSForm({ ...sForm, name: e.target.value })} /></Field>
          <Field label="Unit">
            <Select value={sForm.unit} onChange={e => setSForm({ ...sForm, unit: e.target.value })}>
              {["Pcs", "Box", "Strip", "Vial", "Pack", "Kg", "Ltr"].map(u => <option key={u}>{u}</option>)}
            </Select>
          </Field>
          <Field label="Quantity"><Input type="number" value={sForm.qty} onChange={e => setSForm({ ...sForm, qty: Number(e.target.value) })} /></Field>
          <Field label="Rate"><Input type="number" value={sForm.rate} onChange={e => setSForm({ ...sForm, rate: Number(e.target.value) })} /></Field>
          <Field label="Reorder Level"><Input type="number" value={sForm.reorder} onChange={e => setSForm({ ...sForm, reorder: Number(e.target.value) })} /></Field>
        </div>
      </Modal>
    </AdminLayout>
  );
};

/* ============================== SUB COMPONENTS ============================== */
const TableShell = ({ head, children }: { head: string[]; children: React.ReactNode }) => (
  <div className="overflow-x-auto -mx-2">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[10px] tracking-widest font-bold text-muted-foreground">
          {head.map((h, i) => (
            <th key={h} className={`px-3 py-2 ${i >= head.length - 3 && (h === "Debit" || h === "Credit" || h === "Amount" || h === "Value" || h === "Rate" || h === "Qty" || h === "Reorder" || h.startsWith("Bank") || h === "Books" || h === "Output VAT" || h === "Input VAT" || h === "Planned" || h === "Actual" || h === "Variance" || h === "Opening" || h === "Closing") ? "text-right" : "text-left"}`}>{h.toUpperCase()}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" | "warn" }) => (
  <li className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-bold ${tone === "ok" ? "text-primary" : tone === "bad" ? "text-destructive" : tone === "warn" ? "text-yellow-700" : "text-primary"}`}>{value}</span>
  </li>
);

const voucherTone = (t: VoucherType): "ok" | "info" | "warn" | "bad" | "default" => {
  switch (t) {
    case "Receipt": case "Sales": return "ok";
    case "Payment": case "Purchase": return "info";
    case "Journal": case "Contra": return "default";
    case "Credit Note": return "warn";
    case "Debit Note": return "bad";
  }
};

export default Accounts;
