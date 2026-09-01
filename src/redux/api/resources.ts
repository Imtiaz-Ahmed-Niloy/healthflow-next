import { createResourceApi } from "./createResourceApi";
import type { Database } from "@/lib/supabase/types";

/**
 * Typed hook sets for the modules whose screens are not built on ResourcePage.
 *
 * ResourcePage covers the config-driven admin tables and reaches the API
 * through useResourceCrud. The Roles and Package Management screens are
 * hand-built layouts — a card grid with a permission matrix, and two tables
 * with stat tiles — so they call these directly instead.
 *
 * Row types include the embeds declared in each ResourceDefinition's `select`,
 * because those relations arrive on the row and the screens render them.
 */

type Tables = Database["public"]["Tables"];

/**
 * A custom role names the hospital it belongs to (0055); the eight system
 * roles carry no tenant, so the embed is null on those.
 */
export type RoleRow = Tables["roles"]["Row"] & {
  tenants: Pick<Tables["tenants"]["Row"], "id" | "name" | "slug"> | null;
};
export type PackageRow = Tables["packages"]["Row"];

export type DoctorRow = Tables["doctors"]["Row"];

/** Doctor summary embedded on the two doctor-operations tables. */
type DoctorSummary = Pick<DoctorRow, "id" | "name" | "specialty">;

export type DoctorAssistantRow = Tables["doctor_assistants"]["Row"] & {
  doctors: DoctorSummary | null;
};

export type DoctorPerformanceRow = Tables["doctor_performance"]["Row"] & {
  doctors: DoctorSummary | null;
};

export type DoctorShiftRow = Tables["doctor_shifts"]["Row"] & {
  doctors: DoctorSummary | null;
};

export type NurseRow = Tables["nurses"]["Row"];

/** Nurse summary embedded on the two nurse-operations tables. */
type NurseSummary = Pick<NurseRow, "id" | "name" | "ward">;

export type NurseShiftRow = Tables["nurse_shifts"]["Row"] & {
  nurses: NurseSummary | null;
};

export type NursePerformanceRow = Tables["nurse_performance"]["Row"] & {
  nurses: (NurseSummary & Pick<NurseRow, "shift">) | null;
};

/** Support staff carry no relations, so the row is the table row. */
export type SupportStaffRow = Tables["support_staff"]["Row"];

/** Contact form submissions carry no relations — the sender is not a user. */
export type ContactMessageRow = Tables["contact_messages"]["Row"];

/**
 * Support tickets raised across the platform. The embedded `tenants` row is
 * which hospital raised it — the triage table's Hospital column.
 */
export type SupportTicketRow = Tables["support_tickets"]["Row"] & {
  tenants: Pick<Tables["tenants"]["Row"], "id" | "name" | "slug"> | null;
};

/** The equipment register is flat — assignee is free text, not a profile reference. */
export type AssetRow = Tables["assets"]["Row"];

/** The lab catalogue is a flat price list — no patient or doctor references. */
export type LabTestRow = Tables["lab_tests"]["Row"];

/** Pharmacy stock is a flat inventory — dispensing lives elsewhere and is not embedded. */
export type PharmacyItemRow = Tables["pharmacy_items"]["Row"];

/**
 * The hospital staff register. Read by three screens, not one: onboarding owns
 * it, payroll pays from it, attendance clocks it. See 0039_employees.sql.
 */
export type EmployeeRow = Tables["employees"]["Row"];

/** Patients carry no relations on the registry screen — profile_id is a raw uuid, not embedded. */
export type PatientRow = Tables["patients"]["Row"];

/** Patient summary embedded on appointments. */
type PatientSummary = Pick<PatientRow, "id" | "full_name" | "mrn" | "phone">;

export type AppointmentRow = Tables["appointments"]["Row"] & {
  patients: PatientSummary | null;
  doctors: DoctorSummary | null;
};

export type OfferRow = Tables["offers"]["Row"] & {
  packages: Pick<PackageRow, "id" | "name" | "slug"> | null;
};

export type HospitalPackageRow = Tables["hospital_packages"]["Row"] & {
  tenants: Pick<Tables["tenants"]["Row"], "id" | "name" | "slug" | "status"> | null;
  packages: Pick<PackageRow, "id" | "name" | "slug" | "price_monthly"> | null;
  offers: Pick<Tables["offers"]["Row"], "id" | "code" | "label" | "discount_pct"> | null;
};

/** Fields each screen may send. Mirrors the Zod schema on the server. */
export type RoleWrite = {
  /** Required on create, and not accepted on update — see roleUpdateSchema. */
  tenant_id?: string;
  label?: string;
  /** null clears it; undefined leaves it alone. */
  description?: string | null;
  scope?: "Platform" | "Tenant" | "Clinical" | "Self";
  pages?: string[];
};

export type OfferWrite = {
  code?: string;
  label?: string;
  discount_pct?: number;
  package_id?: string | null;
  valid_until?: string | null;
  active?: boolean;
};

export type HospitalPackageWrite = {
  tenant_id?: string;
  package_id?: string;
  base_price?: number;
  discount_pct?: number;
  offer_id?: string | null;
  billing_cycle?: "monthly" | "yearly";
  status?: "active" | "trial" | "suspended" | "expired";
  start_date?: string;
  renew_date?: string | null;
  notes?: string | null;
};

export type DoctorPerformanceWrite = {
  doctor_id?: string;
  patient_volume?: number;
  consultations?: number;
  revenue?: number;
  feedback?: number;
};

export type DoctorShiftWrite = {
  doctor_id?: string;
  day_of_week?: string;
  start_time?: string;
  end_time?: string;
  shift_type?: string;
  ward?: string;
};

export const rolesApi = createResourceApi<RoleRow, RoleWrite, RoleWrite>("roles");
export const packagesApi = createResourceApi<PackageRow>("packages");
export const doctorsApi = createResourceApi<DoctorRow>("doctors");
export const offersApi = createResourceApi<OfferRow, OfferWrite, OfferWrite>("offers");
export const hospitalPackagesApi = createResourceApi<
  HospitalPackageRow,
  HospitalPackageWrite,
  HospitalPackageWrite
>("hospital-packages");

export const doctorPerformanceApi = createResourceApi<
  DoctorPerformanceRow,
  DoctorPerformanceWrite,
  DoctorPerformanceWrite
>("doctor-performance");

export const doctorShiftsApi = createResourceApi<
  DoctorShiftRow,
  DoctorShiftWrite,
  DoctorShiftWrite
>("doctor-shifts");

export type NurseShiftWrite = {
  nurse_id?: string;
  day_of_week?: string;
  shift_type?: string;
  ward?: string | null;
};

export type NursePerformanceWrite = {
  nurse_id?: string;
  patients_handled?: number;
  hours_worked?: number;
  attendance_pct?: number;
  incidents?: number;
  feedback?: number;
};

export const nursesApi = createResourceApi<NurseRow>("nurses");

export const patientsApi = createResourceApi<PatientRow>("patients");

export const appointmentsApi = createResourceApi<AppointmentRow>("appointments");

export const nurseShiftsApi = createResourceApi<
  NurseShiftRow,
  NurseShiftWrite,
  NurseShiftWrite
>("nurse-shifts");

export const nursePerformanceApi = createResourceApi<
  NursePerformanceRow,
  NursePerformanceWrite,
  NursePerformanceWrite
>("nurse-performance");

export const supportTicketsApi = createResourceApi<SupportTicketRow>("support-tickets");
