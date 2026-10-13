"use client";

import { useState } from "react";
import { Plus, Tags, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { PharmacyLayout } from "@/components/pharmacy/PharmacyLayout";
import { PagedResource } from "@/components/pharmacy/PagedResource";
import { Tile, usePharmacyCan, usePharmacyError } from "@/components/pharmacy/ui";
import { Btn, Pill } from "@/components/admin/ui";
import { Input, Modal, Select, type Column } from "@/components/admin/crud";
import type { FieldDef } from "@/components/admin/ResourcePage";
import { DateInput } from "@/components/ui/date-input";
import { useBookingClock, useFormatters } from "@/lib/appSettings";
import { monthStartOf, type PharmacyExpense } from "@/lib/pharmacy";
import { usePharmacyReportQuery, usePharmacySettingsQuery, useSavePharmacySettingsMutation } from "@/redux/api/pharmacy";

/** The hospital's own list of what an expense can be filed under, kept in its pharmacy settings. */
const CategoriesDialog = ({ open, onClose, current }: { open: boolean; onClose: () => void; current: string[] }) => {
  const t = useTranslations("pharmacy.expenses");
  const tc = useTranslations("pharmacy.common");
  const describe = usePharmacyError();
  const [list, setList] = useState<string[] | null>(null);
  const [name, setName] = useState("");
  const [save, { isLoading }] = useSavePharmacySettingsMutation();
  const shown = list ?? current;

  const close = () => { setList(null); setName(""); onClose(); };

  const add = () => {
    const value = name.trim();
    if (!value || shown.some(existing => existing.toLowerCase() === value.toLowerCase())) return;
    setList([...shown, value]);
    setName("");
  };

  const submit = async () => {
    try {
      await save({ expense_categories: shown }).unwrap();
      toast.success(t("categoriesSaved"));
      close();
    } catch (cause) {
      toast.error(describe(cause));
    }
  };

  return (
    <Modal open={open} onClose={close} title={t("categoriesTitle")} size="md"
      footer={<>
        <Btn variant="outline" onClick={close}>{tc("cancel")}</Btn>
        <Btn onClick={submit} disabled={isLoading || !list}>{isLoading ? tc("saving") : tc("save")}</Btn>
      </>}>
      <div className="flex gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("newCategory")}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Btn variant="outline" onClick={add}><Plus className="h-4 w-4" /> {tc("add")}</Btn>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {shown.map(category => (
          <li key={category} className="inline-flex items-center gap-1 rounded-full bg-muted/60 pl-3 pr-1 py-1 text-sm">
            {category}
            <button type="button" onClick={() => setList(shown.filter(c => c !== category))} aria-label={tc("remove")}
              className="p-1 rounded-full hover:bg-muted text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
          </li>
        ))}
      </ul>
    </Modal>
  );
};

const Page = () => {
  const t = useTranslations("pharmacy.expenses");
  const tc = useTranslations("pharmacy.common");
  const { formatCurrency, formatDate } = useFormatters();
  const { today } = useBookingClock();
  const can = usePharmacyCan();

  const [from, setFrom] = useState(monthStartOf(today));
  const [to, setTo] = useState(today);
  const [category, setCategory] = useState("");
  const [managing, setManaging] = useState(false);

  const { data: settings } = usePharmacySettingsQuery();
  const categories = settings?.data.expense_categories ?? [];
  // The total for the period is counted by the database, not from this page of the list.
  const { data: report } = usePharmacyReportQuery({ from, to }, { skip: !from || !to });
  const spent = report?.data.expenses_by_category ?? [];
  const total = category
    ? Number(spent.find(row => row.category === category)?.amount ?? 0)
    : Number(report?.data.summary.expenses ?? 0);

  const columns: Column<PharmacyExpense>[] = [
    { key: "date", label: t("columns.date"), render: r => formatDate(r.expense_date) },
    { key: "category", label: t("columns.category"), render: r => (
      <span className="inline-flex items-center gap-2">
        <span className="font-semibold text-primary">{r.category}</span>
        {r.shift_id && <Pill tone="info">{t("fromDrawer")}</Pill>}
      </span>
    ) },
    { key: "description", label: t("columns.description"), render: r => r.description ?? "—" },
    { key: "amount", label: t("columns.amount"), render: r => <span className="tabular-nums font-semibold">{formatCurrency(Number(r.amount))}</span> },
    { key: "by", label: t("columns.by"), render: r => r.created_by_name ?? "—" },
  ];

  const fields: FieldDef[] = [
    { name: "expense_date", label: t("fields.expense_date"), type: "date", required: true, max: today },
    { name: "amount", label: t("fields.amount"), type: "number", min: 0.01, numberStep: "any", required: true },
    { name: "category", label: t("fields.category"), type: "select", options: categories, required: true, fullWidth: true },
    { name: "description", label: t("fields.description"), type: "textarea" },
  ];

  return (
    <PharmacyLayout title={t("title")} subtitle={t("subtitle")} needs="see_reports">
      <PagedResource<PharmacyExpense>
        resource="pharmacy-expenses"
        canWrite={can("manage_cash")}
        columns={columns}
        fields={fields}
        searchPlaceholder={t("searchPlaceholder")}
        addLabel={t("add")}
        newTitle={t("newTitle")}
        editTitle={t("editTitle")}
        empty={t("noExpenses")}
        exportName={`pharmacy-expenses-${from}-${to}`}
        reportTitle={`${t("title")} · ${from} – ${to}`}
        sorts={[
          { value: "expense_date:desc", label: t("sorts.newest") },
          { value: "expense_date:asc", label: t("sorts.oldest") },
          { value: "amount:desc", label: t("sorts.highest") },
          { value: "amount:asc", label: t("sorts.lowest") },
        ]}
        filters={{ expense_date_from: from || undefined, expense_date_to: to || undefined, category: category || undefined }}
        defaults={{ expense_date: today, category: categories[0] }}
        above={
          <div className="grid sm:grid-cols-[minmax(0,240px)_1fr] gap-4 mb-4">
            <Tile label={t("totalPeriod")} value={formatCurrency(total)} tone="bad" />
            {spent.length > 0 && !category && (
              <div className="rounded-2xl bg-card border border-border/60 p-4 shadow-soft flex flex-wrap items-center gap-x-6 gap-y-2">
                {spent.slice(0, 6).map(row => (
                  <div key={row.category} className="text-sm">
                    <span className="text-muted-foreground">{row.category}</span>{" "}
                    <span className="font-semibold text-primary tabular-nums">{formatCurrency(Number(row.amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        }
        toolbar={<>
          <DateInput value={from} onChange={setFrom} max={to || today} aria-label={tc("from")} wrapperClassName="w-40" showClear={false} />
          <DateInput value={to} onChange={setTo} min={from} max={today} aria-label={tc("to")} wrapperClassName="w-40" showClear={false} />
          <Select value={category} onChange={e => setCategory(e.target.value)} className="!w-auto" aria-label={t("fields.category")}>
            <option value="">{t("allCategories")}</option>
            {categories.map(name => <option key={name} value={name}>{name}</option>)}
          </Select>
        </>}
        // The category list is part of the pharmacy's settings, so it is an administrator's to change.
        beside={can("administer") && <Btn variant="outline" onClick={() => setManaging(true)}><Tags className="h-4 w-4" /> {t("categories")}</Btn>}
      />
      <CategoriesDialog open={managing} onClose={() => setManaging(false)} current={categories} />
    </PharmacyLayout>
  );
};

export default Page;
