import { baseApi } from "./baseApi";
import type { Database } from "@/lib/supabase/types";

/**
 * Super-admin aggregates — the endpoints that answer a question no single
 * table can, and so sit outside createResourceRoute.
 */

type AppRole = Database["public"]["Enums"]["app_role"];

/** How many profiles hold each role, keyed by enum value. */
export type RoleUserCounts = Record<AppRole, number>;

const superApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRoleStats: build.query<{ data: RoleUserCounts }, void>({
      query: () => "/super/role-stats",
    }),
  }),
});

export const { useGetRoleStatsQuery } = superApi;
