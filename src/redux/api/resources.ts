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

/**
 * One promotional card (0064, 0065). `placement` says which page shows it;
 * platform-level, so the row has no tenant.
 */
export type AdRow = Tables["ads"]["Row"];

/**
 * One identity document a patient uploaded for verification (0068). The
 * embedded profile is who it belongs to — the review queue needs a name and
 * a face beside the file.
 */
export type IdentityDocumentRow = Tables["identity_documents"]["Row"] & {
  profiles: Pick<Tables["profiles"]["Row"], "id" | "full_name" | "email" | "phone" | "avatar_url"> | null;
};

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

/** A supplier. Flat — the contact is a name and phone, not a user account. */
export type VendorRow = Tables["vendors"]["Row"];

/** The lab catalogue is a flat price list — no patient or doctor references. */
export type LabTestRow = Tables["lab_tests"]["Row"];

/** Pharmacy stock is a flat inventory — dispensing lives elsewhere and is not embedded. */
export type PharmacyItemRow = Tables["pharmacy_items"]["Row"];

/**
 * The hospital staff register. Read by three screens, not one: onboarding owns
 * it, payroll pays from it, attendance clocks it. See 0039_employees.sql.
 */
export type EmployeeRow = Tables["employees"]["Row"];

/**
 * One row on the confidential document shelf (0062). Flat — the owner is free
 * text rather than a profile reference, and the document itself lives in R2
 * under `file_key`.
 */
export type PersonalFileRow = Tables["personal_files"]["Row"];

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

/**
 * One write, recorded by the trigger in 0058. Read-only everywhere: there is
 * no Write type because there is no write path, and no embed because the row
 * carries the hospital's name itself rather than pointing at it.
 */
export type AuditLogRow = Tables["audit_logs"]["Row"];

/* --------------------------------------------------- community (0059) --- */

/** What the feed needs to draw an author. */
export type CommunityDoctor = Pick<DoctorRow, "id" | "name" | "specialty" | "photo_url">;

/**
 * The same author seen through the public view, which reaches across hospitals
 * where `doctors` cannot and carries the hospital's name. Its columns are all
 * nullable — it is a view, and PostgREST types every column of one as
 * optional.
 */
export type CommunityPublicDoctor = Pick<
  Database["public"]["Views"]["doctors_public"]["Row"],
  "id" | "name" | "specialty" | "photo_url" | "hospital_name"
>;

/** Either embed may be null; the screen takes whichever came back. */
type WithAuthor = {
  doctors: CommunityDoctor | null;
  doctors_public: CommunityPublicDoctor | null;
};

export type CommunityCommentRow = Tables["community_comments"]["Row"] & WithAuthor;

/** Reactions arrive as rows, not counts — a count cannot tell you which is yours. */
export type CommunityReactionRow = Tables["community_reactions"]["Row"];

export type CommunityPostRow = Tables["community_posts"]["Row"] & WithAuthor & {
  community_comments: CommunityCommentRow[];
  community_reactions: Pick<CommunityReactionRow, "id" | "reaction" | "doctor_id">[];
};

/** `doctor_id` is never sent: the column defaults to the caller's own. */
export type CommunityPostWrite = {
  category?: Tables["community_posts"]["Row"]["category"];
  content?: string;
  media?: { key: string }[];
};

export type CommunityCommentWrite = {
  post_id?: string;
  body?: string;
  is_suggestion?: boolean;
};

export type CommunityReactionWrite = {
  post_id?: string;
  reaction?: Tables["community_reactions"]["Row"]["reaction"];
};

/**
 * What a hospital owes the platform for one month (0056). `total` is generated
 * in the database from prescriptions x unit_price less the discount, so it is
 * read here and never sent.
 */
export type PlatformInvoiceRow = Tables["platform_invoices"]["Row"] & {
  tenants: Pick<Tables["tenants"]["Row"], "id" | "name" | "slug"> | null;
};

/** Settling one. Every other column is the statement that was issued. */
export type PlatformInvoiceWrite = {
  status?: "pending" | "paid" | "void";
  notes?: string | null;
  due_date?: string;
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
/** Read-only: the create/update generics are never used against this one. */
export const auditLogsApi = createResourceApi<AuditLogRow>("audit-logs");

export const communityPostsApi = createResourceApi<
  CommunityPostRow,
  CommunityPostWrite,
  CommunityPostWrite
>("community-posts");

export const communityCommentsApi = createResourceApi<
  CommunityCommentRow,
  CommunityCommentWrite,
  CommunityCommentWrite
>("community-comments");

export const communityReactionsApi = createResourceApi<
  CommunityReactionRow,
  CommunityReactionWrite,
  CommunityReactionWrite
>("community-reactions");
export const platformInvoicesApi = createResourceApi<
  PlatformInvoiceRow,
  PlatformInvoiceWrite,
  PlatformInvoiceWrite
>("platform-invoices");
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
