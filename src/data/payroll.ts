"use client";

import { useMemo } from "react";
import { createResourceApi } from "@/redux/api/createResourceApi";
import { invalidateResource } from "@/redux/api/createResourceApi";
import { useAppDispatch } from "@/redux/hooks";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/types";
import { defaultSettings, toSettings, type PayrollSettings } from "@/lib/payroll";

/**
 * The three payroll tables added in 0042, for /admin/payroll.
 *
 * All three used to be localStorage: the payslip lines, the percentages they
 * are computed from, and the per-employee deduction overrides.
 */

export type PayslipRow = Tables<"payroll_payslips">;
export type PayrollSettingsRow = Tables<"payroll_settings">;
export type DeductionOverrideRow = Tables<"payroll_deduction_overrides">;

/**
 * tenant_id is absent from every insert type here on purpose: the route stamps
 * it from the caller’s JWT, and accepting it from the client would be a way to
 * write into another hospital. See docs/module-guide.md.
 */
type Insert<T extends "payroll_settings" | "payroll_deduction_overrides"> =
  Omit<TablesInsert<T>, "tenant_id">;

const settingsApi = createResourceApi<
  PayrollSettingsRow,
  Insert<"payroll_settings">,
  TablesUpdate<"payroll_settings">
>("payroll-settings");

const payslipsApi = createResourceApi<PayslipRow>("payroll-payslips");

const overridesApi = createResourceApi<
  DeductionOverrideRow,
  Insert<"payroll_deduction_overrides">,
  TablesUpdate<"payroll_deduction_overrides">
>("payroll-deduction-overrides");

/**
 * The hospital's salary percentages.
 *
 * There is at most one row per tenant (a unique constraint says so), so the
 * list is read and its first row taken. A hospital that has never opened the
 * dialog has no row at all and gets the defaults — the same values as the
 * column defaults in 0042, so saving for the first time changes nothing.
 */
export const usePayrollSettings = () => {
  const { data, isLoading } = settingsApi.useList({ limit: 1 });
  const row = data?.data?.[0];
  const [create] = settingsApi.useCreate();
  const [update] = settingsApi.useUpdate();

  // Numeric columns arrive as strings; toSettings coerces them.
  const settings = useMemo(() => toSettings(row), [row]);

  const save = async (next: PayrollSettings) => {
    if (row) await update(row.id, next).unwrap();
    else await create(next).unwrap();
  };

  return { settings, row, isLoading, save };
};

/** A run's payslip lines. Skipped entirely until a run is open. */
export const useRunPayslips = (runId: string | null) => {
  const { data, isLoading, isFetching } = payslipsApi.useList(
    runId ? { filters: { run_id: runId }, limit: 100 } : { limit: 1 },
  );
  const dispatch = useAppDispatch();

  return {
    payslips: runId ? data?.data ?? [] : [],
    isLoading: Boolean(runId) && (isLoading || isFetching),
    /** After processing, the lines on the server are new ones. */
    invalidate: () => dispatch(invalidateResource("payroll-payslips")),
  };
};

/** Standing deduction overrides, keyed by employee id. */
export const usePayrollOverrides = () => {
  const { data } = overridesApi.useList({ limit: 100 });
  const [create] = overridesApi.useCreate();
  const [update] = overridesApi.useUpdate();

  const rows = useMemo(() => data?.data ?? [], [data]);
  const byEmployee = useMemo(() => {
    const map = new Map<string, DeductionOverrideRow>();
    for (const row of rows) map.set(row.employee_id, row);
    return map;
  }, [rows]);

  const setOverride = async (employeeId: string, patch: { tax?: number; other?: number }) => {
    const existing = byEmployee.get(employeeId);
    if (existing) await update(existing.id, patch).unwrap();
    else await create({ employee_id: employeeId, ...patch }).unwrap();
  };

  return { byEmployee, setOverride };
};

/**
 * Process a run: the server recomputes its payslips from the staff register
 * and the hospital's settings. Nothing is computed here — see the route.
 */
export const processRun = async (runId: string) => {
  const response = await fetch(`/api/v1/payroll-runs/${runId}/process`, { method: "POST" });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error?.message ?? "Could not process this payroll run");
  }
  return body.data as { headcount: number; gross: number; net: number };
};

export { defaultSettings };
