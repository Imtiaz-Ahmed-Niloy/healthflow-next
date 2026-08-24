import { baseApi } from "./baseApi";
import type { Database } from "@/lib/supabase/types";

/**
 * Super-admin aggregates — the endpoints that answer a question no single
 * table can, and so sit outside createResourceRoute.
 */

type AppRole = Database["public"]["Enums"]["app_role"];
type TenantStatus = Database["public"]["Enums"]["tenant_status"];

/** How many profiles hold each role, keyed by enum value. */
export type RoleUserCounts = Record<AppRole, number>;

export type SuperDashboardData = {
  hospitals: {
    total: number;
    approved: number;
    pending: number;
    suspended: number;
  };
  users: number;
  doctors: number;
  mrr: number;
  plans: {
    name: string;
    hospitals: number;
    priceMonthly: number | null;
  }[];
  recent: {
    id: string;
    name: string;
    slug: string;
    status: TenantStatus;
    plan: string | null;
    users: number;
    createdAt: string;
  }[];
};

const superApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRoleStats: build.query<{ data: RoleUserCounts }, void>({
      query: () => "/super/role-stats",
    }),
    getSuperDashboard: build.query<{ data: SuperDashboardData }, void>({
      query: () => "/super/dashboard",
    }),
  }),
});

export const { useGetRoleStatsQuery, useGetSuperDashboardQuery } = superApi;
