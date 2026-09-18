"use client";

import { useTranslations } from "next-intl";
import { SuperLayout } from "@/components/super/SuperLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";

/**
 * The specialties list (0093): what a doctor's Specialization is picked from
 * in Add Doctor and a doctor's profile, and what the home page, /doctors and
 * Find Doctors filter by. Lower order comes first. Hiding one takes it out of
 * the pickers and filters but leaves it on the doctors who have it; renaming
 * one renames it on those doctors.
 *
 * The names themselves are stored values and show as typed.
 */

type SpecialtyRow = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

const Specialties = () => {
  const t = useTranslations("super.specialties");
  const shown = (active: boolean) => (active ? t("shown") : t("hidden"));
  return (
    <SuperLayout title={t("title")} subtitle={t("subtitle")}>
      <ResourcePage<SpecialtyRow> config={{
        storeKey: "specialties",
        resource: "specialties",
        searchFields: ["name"],
        columns: [
          { key: "name", label: t("columns.name"), sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
          { key: "sort_order", label: t("columns.order"), sortable: true, accessor: r => r.sort_order },
          {
            key: "is_active", label: t("columns.shown"), accessor: r => shown(r.is_active),
            render: r => <Pill tone={r.is_active ? "ok" : "default"}>{shown(r.is_active)}</Pill>,
          },
        ],
        fields: [
          { name: "name", label: t("fields.name"), type: "text", required: true },
          { name: "sort_order", label: t("fields.order"), type: "number", min: 0 },
          {
            name: "is_active", label: t("fields.shown"), type: "select",
            options: [{ value: "true", label: t("fields.yes") }, { value: "false", label: t("fields.no") }],
          },
        ],
      }} />
    </SuperLayout>
  );
};

export default Specialties;
