import { baseApi } from "./baseApi";
import type { Database } from "@/lib/supabase/types";

/**
 * Super-admin aggregates — the endpoints that answer a question no single
 * table can, and so sit outside createResourceRoute.
 */

type AppRole = Database["public"]["Enums"]["app_role"];
type TenantStatus = Database["public"]["Enums"]["tenant_status"];

export type GlobalSettingsRow = Database["public"]["Tables"]["global_settings"]["Row"];

/** Only what the settings screen may change; the rest is the row's own. */
export type GlobalSettingsPatch = Partial<
  Pick<
    GlobalSettingsRow,
    | "timezone" | "language" | "currency" | "date_format" | "time_format"
    | "support_email" | "maintenance_mode" | "maintenance_message"
  >
>;

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

    /**
     * The platform's defaults (0057). Read by everyone — the app formats every
     * date and every amount with them — and written only by a super admin.
     *
     * The mutation's response IS the new row, so it is written straight into
     * the query's cache rather than triggering a refetch: the banner and the
     * formatters update the moment the save returns.
     */
    getGlobalSettings: build.query<{ data: GlobalSettingsRow }, void>({
      query: () => "/global-settings",
    }),
    updateGlobalSettings: build.mutation<{ data: GlobalSettingsRow }, GlobalSettingsPatch>({
      query: (body) => ({ url: "/global-settings", method: "PATCH", body }),
      onQueryStarted: async (_patch, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled;
        dispatch(superApi.util.upsertQueryData("getGlobalSettings", undefined, data));
      },
    }),
  }),
});

export const {
  useGetRoleStatsQuery,
  useGetSuperDashboardQuery,
  useGetGlobalSettingsQuery,
  useUpdateGlobalSettingsMutation,
} = superApi;
