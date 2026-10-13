"use client";

import { useState } from "react";
import {
  ArrowDownToLine, ArrowUpFromLine, Download, Eye, Lock, LockOpen, Printer, Receipt, Trash2, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { Pager, SearchBox, StateBlock, Tile, fetchAllRows, usePharmacyCan, usePharmacyError } from "@/components/pharmacy/ui";
import { usePharmacyPrint } from "@/components/pharmacy/usePharmacyPrint";
import { Btn, Card, Pill } from "@/components/admin/ui";
import { Chips, ConfirmDialog, DataTable, Field, Input, Modal, Select, TextArea, exportCSV, type Column } from "@/components/admin/crud";
import { useFormatters } from "@/lib/appSettings";
import { useSession } from "@/lib/auth/useSession";
import type { CashLine, CashLineType, CashShift, Drawer } from "@/lib/pharmacy";
import {
  pharmacyCashShiftsApi, pharmacyRegistersApi, useDrawerActionMutation, useDrawerQuery, usePharmacySettingsQuery, type DrawerAction,
} from "@/redux/api/pharmacy";

type MoveType = "cash_in" | "cash_out" | "expense";

const LINE_TONE: Record<CashLineType, "ok" | "warn" | "bad" | "info"> = {
  sale: "ok", payment: "ok", cash_in: "info", cash_out: "warn", expense: "warn", refund: "bad",
};
/** Round figures that are typed most often when cash goes in or out. */
const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];
const LINE_TYPES: CashLineType[] = ["sale", "payment", "cash_in", "cash_out", "expense", "refund"];
/** The lines a person typed in themselves, and so may take back. */
const BY_HAND: CashLineType[] = ["cash_in", "cash_out", "expense"];

// ------------------------------------------------------------ closed view ---
const OpenDrawer = ({ onAct, busy }: { onAct: (action: DrawerAction, done: string) => Promise<unknown>; busy: boolean }) => {
  const t = useTranslations("pharmacy.drawer");
  const [amount, setAmount] = useState("");
  const [register, setRegister] = useState("");
  // A pharmacy with no registers set up simply opens a drawer, as before.
  const { data: registers } = pharmacyRegistersApi.useList({ limit: 100, filters: { is_active: "true" } });
  const tills = registers?.data ?? [];

  return (
    <Card className="p-8 max-w-md mx-auto text-center">
      <div className="h-14 w-14 rounded-2xl bg-muted grid place-items-center mx-auto"><Lock className="h-6 w-6 text-muted-foreground" /></div>
      <h2 className="font-display text-xl text-primary mt-4">{t("closedTitle")}</h2>
      <p className="text-sm text-muted-foreground mt-1">{t("closedHint")}</p>
      <form className="mt-6 text-left"
        onSubmit={e => { e.preventDefault(); onAct({ action: "open", opening_balance: Number(amount) || 0, register_id: register || null }, t("opened")); }}>
        {tills.length > 0 && (
          <Field label={t("register")}>
            <Select value={register} onChange={e => setRegister(e.target.value)}>
              <option value="">{t("noRegister")}</option>
              {tills.map(till => <option key={till.id} value={till.id}>{till.branch?.name ? `${till.branch.name} · ` : ""}{till.name} ({till.code})</option>)}
            </Select>
          </Field>
        )}
        <Field label={t("openingBalance")} required>
          <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" min={0} step="any" placeholder="0.00" required autoFocus className="text-right tabular-nums" />
        </Field>
        <Btn type="submit" disabled={busy} className="w-full justify-center"><LockOpen className="h-4 w-4" /> {t("open")}</Btn>
      </form>
    </Card>
  );
};

// ------------------------------------------------------------- move money ---
const MoveDialog = ({ type, onClose, onAct, busy }: {
  type: MoveType | null; onClose: () => void; onAct: (action: DrawerAction, done: string) => Promise<unknown>; busy: boolean;
}) => {
  const t = useTranslations("pharmacy.drawer");
  const tc = useTranslations("pharmacy.common");
  const { data: settings } = usePharmacySettingsQuery();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  if (!type) return null;
  const title = { cash_in: t("actions.cashIn"), cash_out: t("actions.cashOut"), expense: t("actions.expense") }[type];
  const categories = settings?.data.expense_categories ?? [];
  const chosen = category || categories[0] || "";

  const close = () => { setAmount(""); setCategory(""); setNote(""); onClose(); };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ok = await onAct({
      action: type, amount: Number(amount), note: note.trim() || null, category: type === "expense" ? chosen || null : null,
    }, t("lineSaved"));
    if (ok) close();
  };

  const chip = "px-2.5 py-1 rounded-lg text-xs font-medium bg-muted/40 hover:bg-muted text-foreground/80 tabular-nums";

  return (
    <Modal open onClose={close} title={title} size="sm">
      <form onSubmit={submit}>
        <Field label={tc("amount")} required>
          <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" min={0.01} step="any" placeholder="0.00" required autoFocus className="text-right tabular-nums" />
        </Field>
        <div className="flex flex-wrap items-center gap-1.5 -mt-2 mb-4">
          <span className="text-[11px] text-muted-foreground">{t("quick")}</span>
          {QUICK_AMOUNTS.map(value => <button key={value} type="button" onClick={() => setAmount(String(value))} className={chip}>{value}</button>)}
        </div>
        {type === "expense" && (
          <>
            <Field label={t("expenseCategory")}>
              <Select value={chosen} onChange={e => setCategory(e.target.value)}>
                {categories.map(name => <option key={name} value={name}>{name}</option>)}
              </Select>
            </Field>
            {/* One tap for the usual ones: it picks the category and writes the note. */}
            <div className="flex flex-wrap items-center gap-1.5 -mt-2 mb-4">
              <span className="text-[11px] text-muted-foreground">{t("commonExpenses")}</span>
              {categories.slice(0, 5).map(name => (
                <button key={name} type="button" onClick={() => { setCategory(name); setNote(name); }} className={chip}>{name}</button>
              ))}
            </div>
          </>
        )}
        <Field label={tc("note")}><Input value={note} onChange={e => setNote(e.target.value)} placeholder={t("notePlaceholder")} /></Field>
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={close}>{tc("cancel")}</Btn>
          <Btn type="submit" disabled={busy}>{busy ? tc("saving") : tc("save")}</Btn>
        </div>
      </form>
    </Modal>
  );
};

// ------------------------------------------------------------------ close ---
const CloseDialog = ({ expected, shiftId, open, onClose, onAct, busy }: {
  expected: number; shiftId?: string; open: boolean; onClose: () => void;
  onAct: (action: DrawerAction, done: string) => Promise<unknown>; busy: boolean;
}) => {
  const t = useTranslations("pharmacy.drawer");
  const tc = useTranslations("pharmacy.common");
  const { formatCurrency } = useFormatters();
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  if (!open) return null;

  const difference = counted === "" ? null : Math.round((Number(counted) - expected) * 100) / 100;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const ok = await onAct({ action: "close", counted: Number(counted) || 0, note: note || null, shift_id: shiftId ?? null }, t("closedDone"));
    if (ok) { setCounted(""); setNote(""); onClose(); }
  };

  return (
    <Modal open onClose={onClose} title={t("closeTitle")} size="sm">
      <form onSubmit={submit}>
        <div className="flex justify-between text-sm mb-4">
          <span className="text-muted-foreground">{t("expected")}</span>
          <b className="tabular-nums text-primary">{formatCurrency(expected)}</b>
        </div>
        <Field label={t("counted")} required>
          <Input value={counted} onChange={e => setCounted(e.target.value)} type="number" min={0} step="any" placeholder="0.00" required autoFocus className="text-right tabular-nums" />
        </Field>
        {difference !== null && (
          <p className={`-mt-2 mb-4 text-sm font-semibold ${difference === 0 ? "text-emerald-700" : difference < 0 ? "text-destructive" : "text-amber-700"}`}>
            {difference === 0 ? t("match") : difference < 0 ? t("short", { amount: formatCurrency(-difference) }) : t("over", { amount: formatCurrency(difference) })}
          </p>
        )}
        <Field label={t("closingNote")}><TextArea value={note} onChange={e => setNote(e.target.value)} /></Field>
        <div className="flex justify-end gap-2">
          <Btn variant="outline" onClick={onClose}>{tc("cancel")}</Btn>
          <Btn type="submit" variant="danger" disabled={busy}>{busy ? tc("saving") : t("confirmClose")}</Btn>
        </div>
      </form>
    </Modal>
  );
};

// ------------------------------------------------------------------ lines ---
const LinesTable = ({ lines, onRemove }: { lines: CashLine[]; onRemove?: (line: CashLine) => void }) => {
  const t = useTranslations("pharmacy.drawer");
  const { formatCurrency, formatTime } = useFormatters();
  const [q, setQ] = useState("");
  const [type, setType] = useState<CashLineType | "">("");

  const columns: Column<CashLine>[] = [
    { key: "time", label: t("columns.time"), render: r => <span className="whitespace-nowrap tabular-nums">{formatTime(r.created_at)}</span> },
    { key: "type", label: t("columns.type"), render: r => <Pill tone={LINE_TONE[r.type]}>{t(`types.${r.type}`)}</Pill> },
    { key: "amount", label: t("columns.amount"), render: r => (
      <span className={`tabular-nums font-semibold ${Number(r.amount) < 0 ? "text-destructive" : "text-emerald-700"}`}>
        {Number(r.amount) > 0 ? "+" : ""}{formatCurrency(Number(r.amount))}
      </span>
    ) },
    { key: "note", label: t("columns.note"), render: r => <span className="text-xs text-muted-foreground">{r.note ?? "—"}</span> },
    { key: "by", label: t("columns.by"), render: r => <span className="text-xs">{r.created_by_name ?? "—"}</span> },
  ];

  const needle = q.trim().toLowerCase();
  const shown = lines.filter(line =>
    (type === "" || line.type === type)
    && (!needle || [line.note, line.created_by_name, String(line.amount)].some(value => value?.toLowerCase().includes(needle))));

  return (
    <>
      {lines.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <SearchBox value={q} onChange={setQ} placeholder={t("searchLines")} className="flex-1" />
          <Select value={type} onChange={e => setType(e.target.value as CashLineType | "")} className="!w-auto" aria-label={t("columns.type")}>
            <option value="">{t("allTypes")}</option>
            {LINE_TYPES.map(value => <option key={value} value={value}>{t(`types.${value}`)}</option>)}
          </Select>
        </div>
      )}
      <DataTable<CashLine> rows={shown} columns={columns} empty={t("noLines")}
        actions={onRemove ? row => BY_HAND.includes(row.type) ? (
          <button onClick={() => onRemove(row)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" aria-label={t("removeLine")}>
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null : undefined} />
    </>
  );
};

// ---------------------------------------------------------------- current ---
const Current = ({ drawer, onAct, busy }: { drawer: Drawer; onAct: (action: DrawerAction, done: string) => Promise<unknown>; busy: boolean }) => {
  const t = useTranslations("pharmacy.drawer");
  const { formatCurrency, formatDateTime } = useFormatters();
  const [moving, setMoving] = useState<MoveType | null>(null);
  const [closing, setClosing] = useState(false);
  const [removing, setRemoving] = useState<CashLine | null>(null);
  // Putting cash in or taking it out by hand is for those allowed to (0133). Selling and closing are everyone's.
  const mayMove = usePharmacyCan()("manage_cash");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground">
          {t("openedAt", { time: formatDateTime(drawer.opened_at) })}
          {drawer.register && ` · ${drawer.register.name} (${drawer.register.code})`}
        </p>
        <div className="flex flex-wrap gap-2">
          {mayMove && <>
            <Btn variant="outline" onClick={() => setMoving("cash_in")}><ArrowDownToLine className="h-4 w-4" /> {t("actions.cashIn")}</Btn>
            <Btn variant="outline" onClick={() => setMoving("cash_out")}><ArrowUpFromLine className="h-4 w-4" /> {t("actions.cashOut")}</Btn>
            <Btn variant="outline" onClick={() => setMoving("expense")}><Receipt className="h-4 w-4" /> {t("actions.expense")}</Btn>
          </>}
          <Btn variant="danger" onClick={() => setClosing(true)}><Lock className="h-4 w-4" /> {t("actions.close")}</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-4">
        <Tile label={t("stats.opening")} value={formatCurrency(Number(drawer.opening_balance))} />
        <Tile label={t("stats.sales")} value={formatCurrency(drawer.totals.sales)} tone="good" />
        <Tile label={t("stats.cashIn")} value={formatCurrency(drawer.totals.cash_in)} />
        <Tile label={t("stats.cashOut")} value={formatCurrency(drawer.totals.cash_out)} tone={drawer.totals.cash_out ? "warn" : "default"} />
        <Tile label={t("stats.expenses")} value={formatCurrency(drawer.totals.expenses)} tone={drawer.totals.expenses ? "warn" : "default"} />
        <Tile label={t("stats.refunds")} value={formatCurrency(drawer.totals.refunds)} tone={drawer.totals.refunds ? "bad" : "default"} />
        <Tile icon={Wallet} label={t("stats.balance")} value={formatCurrency(drawer.balance)} className="col-span-2 lg:col-span-4 xl:col-span-1 ring-1 ring-primary/30" />
      </div>

      <Card className="p-4 lg:p-5"><LinesTable lines={drawer.lines} onRemove={setRemoving} /></Card>

      <MoveDialog type={moving} onClose={() => setMoving(null)} onAct={onAct} busy={busy} />
      <CloseDialog open={closing} expected={drawer.balance} onClose={() => setClosing(false)} onAct={onAct} busy={busy} />
      <ConfirmDialog open={removing !== null} onClose={() => setRemoving(null)} title={t("removeLine")}
        onConfirm={() => { if (removing) onAct({ action: "remove", id: removing.id }, t("lineRemoved")); }} />
    </>
  );
};

// ---------------------------------------------------------------- history ---
const HistoryList = ({ onAct, busy }: { onAct: (action: DrawerAction, done: string) => Promise<unknown>; busy: boolean }) => {
  const t = useTranslations("pharmacy.drawer");
  const tc = useTranslations("pharmacy.common");
  const { formatCurrency, formatDateTime } = useFormatters();
  const { printShift } = usePharmacyPrint();
  const { user } = useSession();
  const mayAdminister = usePharmacyCan()("administer");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<CashShift | null>(null);
  const [closing, setClosing] = useState<CashShift | null>(null);
  const { data, isLoading, error, refetch } = pharmacyCashShiftsApi.useList({ page, limit: 15 });
  const rows = data?.data ?? [];
  const describe = usePharmacyError();
  const balanceOf = (shift: CashShift) => Number(shift.opening_balance) + shift.lines.reduce((sum, line) => sum + Number(line.amount), 0);

  const download = async () => {
    try {
      const all = await fetchAllRows<CashShift>("pharmacy-cash-shifts");
      exportCSV(all.map(shift => ({
        cashier: shift.opened_by_name ?? "", opened: shift.opened_at, closed: shift.closed_at ?? "",
        opening: shift.opening_balance, expected: shift.expected_balance ?? balanceOf(shift),
        counted: shift.closing_balance ?? "", difference: shift.discrepancy ?? "", note: shift.closing_note ?? "",
      })), "pharmacy-cash-drawers.csv");
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  const columns: Column<CashShift>[] = [
    { key: "cashier", label: tc("cashier"), render: r => <span className="font-semibold text-primary">{r.opened_by_name ?? "—"}</span> },
    { key: "opened", label: t("history.opened"), render: r => <span className="whitespace-nowrap">{formatDateTime(r.opened_at)}</span> },
    { key: "closed", label: t("history.closed"), render: r => r.closed_at ? <span className="whitespace-nowrap">{formatDateTime(r.closed_at)}</span> : <Pill tone="ok">{t("history.stillOpen")}</Pill> },
    { key: "opening", label: t("history.opening"), render: r => <span className="tabular-nums">{formatCurrency(Number(r.opening_balance))}</span> },
    { key: "expected", label: t("history.expected"), render: r => <span className="tabular-nums">{formatCurrency(Number(r.expected_balance ?? balanceOf(r)))}</span> },
    { key: "counted", label: t("history.counted"), render: r => r.closing_balance === null ? "—" : <span className="tabular-nums">{formatCurrency(Number(r.closing_balance))}</span> },
    { key: "difference", label: t("history.difference"), render: r => {
      if (r.discrepancy === null) return "—";
      const value = Number(r.discrepancy);
      return <span className={`tabular-nums font-semibold ${value === 0 ? "text-emerald-700" : value < 0 ? "text-destructive" : "text-amber-700"}`}>{formatCurrency(value)}</span>;
    } },
  ];

  return (
    <Card className="p-4 lg:p-5">
      <div className="flex justify-end mb-3">
        <Btn variant="outline" onClick={download} disabled={rows.length === 0}><Download className="h-4 w-4" /> {tc("exportCsv")}</Btn>
      </div>
      {isLoading || error || rows.length === 0 ? (
        <StateBlock loading={isLoading} error={error} onRetry={refetch} empty={t("noHistory")} />
      ) : (
        <DataTable<CashShift> rows={rows} columns={columns} onRow={setViewing}
          actions={row => (
            <div className="inline-flex items-center gap-1">
              <button onClick={() => setViewing(row)} className="p-1.5 rounded-lg hover:bg-muted text-foreground/70" title={t("viewLines")} aria-label={t("viewLines")}><Eye className="h-4 w-4" /></button>
              <button onClick={() => printShift(row)} className="p-1.5 rounded-lg hover:bg-muted text-foreground/70" title={t("printSlip")} aria-label={t("printSlip")}><Printer className="h-4 w-4" /></button>
              {/* A drawer somebody went home without closing: whoever administers the pharmacy counts it for them. */}
              {row.status === "open" && mayAdminister && row.opened_by !== user?.id && (
                <button onClick={() => setClosing(row)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title={t("closeFor")} aria-label={t("closeFor")}><Lock className="h-4 w-4" /></button>
              )}
            </div>
          )} />
      )}
      {data?.meta && <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onPage={setPage} />}

      <Modal open={viewing !== null} onClose={() => setViewing(null)} title={viewing?.opened_by_name ?? ""} size="lg"
        footer={viewing && <Btn variant="outline" onClick={() => printShift(viewing)}><Printer className="h-4 w-4" /> {t("printSlip")}</Btn>}>
        {viewing && (
          <>
            {viewing.closing_note && <p className="text-sm text-muted-foreground mb-3">{viewing.closing_note}</p>}
            <LinesTable lines={[...viewing.lines].sort((a, b) => b.created_at.localeCompare(a.created_at))} />
          </>
        )}
      </Modal>
      <CloseDialog open={closing !== null} shiftId={closing?.id} expected={closing ? balanceOf(closing) : 0}
        onClose={() => setClosing(null)} onAct={onAct} busy={busy} />
    </Card>
  );
};

// ------------------------------------------------------------------- page ---
const Page = () => {
  const t = useTranslations("pharmacy.drawer");
  const describe = usePharmacyError();
  const [tab, setTab] = useState<"current" | "history">("current");
  const { data, isLoading, error, refetch } = useDrawerQuery();
  const [act, { isLoading: busy }] = useDrawerActionMutation();

  /** Runs one drawer action, says how it went, and answers whether it worked. */
  const onAct = async (action: DrawerAction, done: string) => {
    try {
      const answer = await act(action).unwrap();
      toast.success(done);
      // A drawer just closed is at the top of the history, with its slip to
      // print. Not printed from here: a window opened after a request has
      // come back is one a browser blocks.
      if (answer.closed) setTab("history");
      return true;
    } catch (cause) {
      toast.error(describe(cause));
      return false;
    }
  };

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")}>
      <div className="mb-4">
        <Chips value={tab} onChange={setTab} options={(["current", "history"] as const).map(value => ({ value, label: t(`tabs.${value}`) }))} />
      </div>
      {tab === "history" ? (
        <HistoryList onAct={onAct} busy={busy} />
      ) : isLoading || error ? (
        <StateBlock loading={isLoading} error={error} onRetry={refetch} />
      ) : data?.data ? (
        <Current drawer={data.data} onAct={onAct} busy={busy} />
      ) : (
        <OpenDrawer onAct={onAct} busy={busy} />
      )}
    </PharmacyLayout>
  );
};

export default Page;
