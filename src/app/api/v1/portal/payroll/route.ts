import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase, getAuthContext } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/types";
import { isMonth, PAYROLL_METHODS, periodOf, thisMonth, totalsOf, type DoctorPayslip } from "@/lib/staffPayroll";

/**
 * /api/v1/portal/payroll — what the doctor pays their own team (0152).
 *
 *   GET     `?month=YYYY-MM` that month's payslips, the team with each
 *           member's monthly salary, and the month's totals
 *   POST    `{ action: "generate", month }` a slip for every active member
 *           who has none yet, at their monthly salary
 *           `{ action: "create", month, member_id, ...amounts }` one slip
 *   PATCH   `{ id, ...amounts, notes }` correct a slip;
 *           `{ id, action: "pay", payment_method, paid_on }` mark it paid;
 *           `{ id, action: "unpay" }` undo that
 *   DELETE  `?id=` remove a slip
 *
 * Runs on the doctor's own client: RLS (0152) keeps every row to their own
 * team. The hospitals' assistants (doctor_assistants) are paid by the
 * hospital, so they are not on this payroll.
 */

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (message: string, status: number) => json({ error: { message } }, status);

/** 42501 not theirs, 23505 a slip for that month already, 23514 a check constraint. */
const statusOf = (code: string | undefined) =>
  code === "42501" ? 403 : code === "23505" ? 409 : code === "23514" ? 422 : 500;

const doctorOnly = async () => {
  const auth = await getAuthContext();
  if (!auth) return { refusal: fail("Not signed in", 401) };
  if (auth.role !== "doctor") return { refusal: fail("Only a doctor runs a team payroll", 403) };
  return { auth, supabase: await createServerSupabase() };
};

const money = z.preprocess(v => (v === "" || v === null || v === undefined ? 0 : v), z.coerce.number().min(0).max(99_999_999));
const month = z.string().refine(isMonth, "Pick a month");
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");
const notes = z.preprocess(v => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(2000).nullable().optional());

const amountsSchema = z.object({
  basic: money.optional(),
  allowance: money.optional(),
  bonus: money.optional(),
  deduction: money.optional(),
  advance: money.optional(),
  notes,
});

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate"), month }),
  amountsSchema.extend({ action: z.literal("create"), month, member_id: z.string().uuid() }),
]);

const patchSchema = z.union([
  z.object({
    id: z.string().uuid(),
    action: z.literal("pay"),
    payment_method: z.enum(PAYROLL_METHODS).default("cash"),
    paid_on: day.optional(),
  }),
  z.object({ id: z.string().uuid(), action: z.literal("unpay") }),
  amountsSchema.extend({ id: z.string().uuid(), action: z.literal("save").optional() }),
]);

const SLIP = "id, member_id, member_name, member_role, period, basic, allowance, bonus, deduction, advance, net, status, paid_on, payment_method, notes, created_at";

const today = () => new Date().toISOString().slice(0, 10);

export const GET = async (request: Request) => {
  const who = await doctorOnly();
  if ("refusal" in who) return who.refusal;
  const { auth, supabase } = who;

  const requested = new URL(request.url).searchParams.get("month");
  const target = isMonth(requested) ? requested : thisMonth();

  const [slips, team] = await Promise.all([
    supabase
      .from("doctor_team_payslips")
      .select(SLIP)
      .eq("owner_profile_id", auth.userId)
      .eq("period", periodOf(target))
      .order("member_name", { ascending: true }),
    supabase
      .from("doctor_team_members")
      .select("id, name, role, status, monthly_salary")
      .eq("owner_profile_id", auth.userId)
      .order("created_at", { ascending: true }),
  ]);
  if (slips.error) return fail(slips.error.message, 500);
  if (team.error) return fail(team.error.message, 500);

  const data = (slips.data ?? []) as unknown as DoctorPayslip[];
  return json({
    month: target,
    data,
    members: (team.data ?? []).map(m => ({ ...m, monthly_salary: Number(m.monthly_salary ?? 0) })),
    totals: totalsOf(data),
  });
};

export const POST = async (request: Request) => {
  const who = await doctorOnly();
  if ("refusal" in who) return who.refusal;
  const { auth, supabase } = who;

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);
  const body = parsed.data;
  const period = periodOf(body.month);

  if (body.action === "generate") {
    const { data: members, error } = await supabase
      .from("doctor_team_members")
      .select("id, name, role, monthly_salary")
      .eq("owner_profile_id", auth.userId)
      .eq("status", "active");
    if (error) return fail(error.message, 500);
    if (!members?.length) return json({ data: { created: 0 } });

    // Slips already made this month are left as they are.
    const { data: created, error: insertError } = await supabase
      .from("doctor_team_payslips")
      .upsert(
        members.map(m => ({
          member_id: m.id,
          period,
          member_name: m.name,
          member_role: m.role,
          basic: Number(m.monthly_salary ?? 0),
        })),
        { onConflict: "member_id,period", ignoreDuplicates: true },
      )
      .select("id");
    if (insertError) return fail(insertError.message, statusOf(insertError.code));

    return json({ data: { created: created?.length ?? 0 } }, 201);
  }

  const { data: member, error: memberError } = await supabase
    .from("doctor_team_members")
    .select("id, name, role, monthly_salary")
    .eq("id", body.member_id)
    .eq("owner_profile_id", auth.userId)
    .maybeSingle();
  if (memberError) return fail(memberError.message, 500);
  if (!member) return fail("Team member not found", 404);

  const { action: _action, month: _month, member_id, ...amounts } = body;
  const { data, error } = await supabase
    .from("doctor_team_payslips")
    .insert({
      member_id,
      period,
      member_name: member.name,
      member_role: member.role,
      ...amounts,
      basic: amounts.basic ?? Number(member.monthly_salary ?? 0),
    })
    .select(SLIP)
    .single();
  if (error) {
    return fail(error.code === "23505" ? `${member.name} already has a payslip for this month.` : error.message, statusOf(error.code));
  }

  return json({ data }, 201);
};

export const PATCH = async (request: Request) => {
  const who = await doctorOnly();
  if ("refusal" in who) return who.refusal;
  const { supabase } = who;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid request", 422);
  const body = parsed.data;

  const { data: current, error: readError } = await supabase
    .from("doctor_team_payslips")
    .select("id, status, net")
    .eq("id", body.id)
    .maybeSingle();
  if (readError) return fail(readError.message, 500);
  if (!current) return fail("Payslip not found", 404);

  let fields: TablesUpdate<"doctor_team_payslips">;
  if (body.action === "pay") {
    if (current.status === "paid") return fail("This payslip is already paid.", 409);
    if (Number(current.net) < 0) return fail("Deductions are more than the pay on this slip.", 422);
    fields = { status: "paid", payment_method: body.payment_method, paid_on: body.paid_on ?? today() };
  } else if (body.action === "unpay") {
    fields = { status: "unpaid", payment_method: null, paid_on: null };
  } else {
    const { id: _id, action: _action, ...amounts } = body;
    const changesMoney = ["basic", "allowance", "bonus", "deduction", "advance"].some(k => k in amounts);
    if (current.status === "paid" && changesMoney) return fail("This payslip is paid. Undo the payment before changing the amounts.", 409);
    fields = amounts;
  }

  const { data, error } = await supabase
    .from("doctor_team_payslips")
    .update(fields)
    .eq("id", body.id)
    .select(SLIP)
    .maybeSingle();
  if (error) return fail(error.message, statusOf(error.code));
  if (!data) return fail("Payslip not found", 404);

  return json({ data });
};

export const DELETE = async (request: Request) => {
  const who = await doctorOnly();
  if ("refusal" in who) return who.refusal;

  const id = new URL(request.url).searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) return fail("Which payslip?", 422);

  const { data, error } = await who.supabase
    .from("doctor_team_payslips")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return fail(error.message, statusOf(error.code));
  if (!data) return fail("Payslip not found", 404);

  return json({ data });
};
