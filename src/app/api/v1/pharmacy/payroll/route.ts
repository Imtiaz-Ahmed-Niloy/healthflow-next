import { z } from "zod";
import { fail, fromRpc, json, pharmacyAccess, readJson } from "@/server/pharmacy";
import { isMonth, PAYROLL_METHODS, periodOf, thisMonth, totalsOf, type PharmacyEmployee, type PharmacyPayslip } from "@/lib/staffPayroll";

/**
 * /api/v1/pharmacy/payroll — the pharmacy's monthly payroll (0152).
 *
 *   GET   `?month=YYYY-MM` that month's payslips, everyone on the payroll,
 *         and the month's totals, in one answer for the payroll screen
 *   POST  `{ action: "generate", month }` a slip for every active employee
 *         who has none for that month yet, at their monthly salary
 *         `{ action: "pay", id, payment_method, paid_on }` mark a slip paid,
 *         which also books it as a "Salary" expense
 *         `{ action: "unpay", id }` undo that, expense and all
 *
 * The employees and single slips are plain rows at /api/v1/pharmacy-employees
 * and /api/v1/pharmacy-payslips. Everything here runs on the caller's own
 * client; the database functions check pharmacy_can('administer').
 */

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate"), month: z.string().refine(isMonth, "Pick a month") }),
  z.object({
    action: z.literal("pay"),
    id: z.string().uuid(),
    payment_method: z.enum(PAYROLL_METHODS).default("cash"),
    paid_on: day.optional(),
  }),
  z.object({ action: z.literal("unpay"), id: z.string().uuid() }),
]);

export const GET = async (request: Request) => {
  const who = await pharmacyAccess("read");
  if ("refusal" in who) return who.refusal;

  const requested = new URL(request.url).searchParams.get("month");
  const month = isMonth(requested) ? requested : thisMonth();

  const [slips, employees] = await Promise.all([
    who.supabase.from("pharmacy_payslips").select("*").eq("period", periodOf(month)).order("employee_name"),
    who.supabase.from("pharmacy_employees").select("*").order("name"),
  ]);
  if (slips.error) return fromRpc(slips.error);
  if (employees.error) return fromRpc(employees.error);

  const data = (slips.data ?? []) as PharmacyPayslip[];
  return json({
    month,
    data,
    employees: (employees.data ?? []) as PharmacyEmployee[],
    totals: totalsOf(data),
  });
};

export const POST = async (request: Request) => {
  const who = await pharmacyAccess("write");
  if ("refusal" in who) return who.refusal;

  const parsed = actionSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);
  const body = parsed.data;

  if (body.action === "generate") {
    const { data, error } = await who.supabase.rpc("pharmacy_generate_payslips", { p_period: periodOf(body.month) });
    if (error) return fromRpc(error);
    return json({ data: { created: data as number } }, 201);
  }

  if (body.action === "pay") {
    const { data, error } = await who.supabase.rpc("pharmacy_pay_payslip", {
      p_id: body.id,
      p_method: body.payment_method,
      p_paid_on: body.paid_on ?? new Date().toISOString().slice(0, 10),
    });
    if (error) return fromRpc(error);
    return json({ data });
  }

  const { data, error } = await who.supabase.rpc("pharmacy_unpay_payslip", { p_id: body.id });
  if (error) return fromRpc(error);
  return json({ data });
};
