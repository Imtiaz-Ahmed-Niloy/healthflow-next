"use client";

import { SuperLayout } from "@/components/super/SuperLayout";
import { ResourcePage } from "@/components/admin/ResourcePage";
import { Pill } from "@/components/admin/ui";

/**
 * The specialties list (0093): what a doctor's Specialization is picked from
 * in Add Doctor and a doctor's profile, and what the home page, /doctors and
 * Find Doctors filter by. Lower order comes first. Hiding one takes it out of
 * the pickers and filters but leaves it on the doctors who have it; renaming
 * one renames it on those doctors.
 */

type SpecialtyRow = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

const Specialties = () => (
  <SuperLayout title="Specialties" subtitle="What a doctor's specialization is picked from, and what patients filter by">
    <ResourcePage<SpecialtyRow> config={{
      storeKey: "specialties",
      resource: "specialties",
      searchFields: ["name"],
      columns: [
        { key: "name", label: "Specialty", sortable: true, accessor: r => r.name, render: r => <span className="font-semibold text-primary">{r.name}</span> },
        { key: "sort_order", label: "Order", sortable: true, accessor: r => r.sort_order },
        {
          key: "is_active", label: "Shown", accessor: r => (r.is_active ? "Shown" : "Hidden"),
          render: r => <Pill tone={r.is_active ? "ok" : "default"}>{r.is_active ? "Shown" : "Hidden"}</Pill>,
        },
      ],
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "sort_order", label: "Order (lower comes first)", type: "number", min: 0 },
        {
          name: "is_active", label: "Shown in pickers and filters", type: "select",
          options: [{ value: "true", label: "Yes" }, { value: "false", label: "No — hidden" }],
        },
      ],
    }} />
  </SuperLayout>
);

export default Specialties;
