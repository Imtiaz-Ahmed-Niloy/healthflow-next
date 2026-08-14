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

export type RoleRow = Tables["roles"]["Row"];
export type PackageRow = Tables["packages"]["Row"];

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

export const rolesApi = createResourceApi<RoleRow, RoleWrite, RoleWrite>("roles");
export const packagesApi = createResourceApi<PackageRow>("packages");
export const offersApi = createResourceApi<OfferRow, OfferWrite, OfferWrite>("offers");
export const hospitalPackagesApi = createResourceApi<
  HospitalPackageRow,
  HospitalPackageWrite,
  HospitalPackageWrite
>("hospital-packages");
