/**
 * Payroll for a doctor's own team and a pharmacy's staff (0152). Shared by the
 * API routes and the two panels' payroll pages. The hospital's payroll, with
 * its percentage breakdowns, is src/lib/payroll.ts.
 *
 * A slip is basic + allowance + bonus - deduction - advance; the database
 * keeps `net` from those, and netOf mirrors it for a form that hasn't saved.
 */

export const PAYROLL_METHODS = ["cash", "bkash", "nagad", "rocket", "bank", "other"] as const;
export type PayrollMethod = (typeof PAYROLL_METHODS)[number];

export const PAYSLIP_STATUSES = ["unpaid", "paid"] as const;
export type PayslipStatus = (typeof PAYSLIP_STATUSES)[number];

/** The amounts a slip is made of, in the order a form shows them. */
export const PAYSLIP_AMOUNTS = ["basic", "allowance", "bonus", "deduction", "advance"] as const;
export type PayslipAmount = (typeof PAYSLIP_AMOUNTS)[number];

export type PayslipAmounts = Record<PayslipAmount, number>;

type Slip = PayslipAmounts & {
  id: string;
  period: string;
  net: number;
  status: PayslipStatus;
  paid_on: string | null;
  payment_method: PayrollMethod | null;
  notes: string | null;
  created_at: string;
};

export type DoctorPayslip = Slip & {
  member_id: string;
  member_name: string;
  member_role: string;
};

export type PharmacyPayslip = Slip & {
  employee_id: string;
  employee_name: string;
  designation: string | null;
  expense_id: string | null;
  created_by_name: string | null;
};

export type PharmacyEmployee = {
  id: string;
  name: string;
  phone: string | null;
  designation: string | null;
  branch_id: string | null;
  profile_id: string | null;
  monthly_salary: number;
  joined_on: string | null;
  status: "active" | "inactive";
  notes: string | null;
  created_at: string;
};

export type PayrollTotals = { count: number; gross: number; net: number; paid: number; unpaid: number };

export const netOf = (slip: PayslipAmounts) =>
  Number(slip.basic) + Number(slip.allowance) + Number(slip.bonus) - Number(slip.deduction) - Number(slip.advance);

export const totalsOf = (slips: (PayslipAmounts & { net: number; status: PayslipStatus })[]): PayrollTotals =>
  slips.reduce<PayrollTotals>(
    (sum, s) => ({
      count: sum.count + 1,
      gross: sum.gross + Number(s.basic) + Number(s.allowance) + Number(s.bonus),
      net: sum.net + Number(s.net),
      paid: sum.paid + (s.status === "paid" ? Number(s.net) : 0),
      unpaid: sum.unpaid + (s.status === "paid" ? 0 : Number(s.net)),
    }),
    { count: 0, gross: 0, net: 0, paid: 0, unpaid: 0 },
  );

/** The first day of a "YYYY-MM" month, which is how a slip stores its period. */
export const periodOf = (month: string) => `${month}-01`;

export const isMonth = (value: string | null | undefined): value is string => !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** A "YYYY-MM" month moved by a number of months. */
export const shiftMonth = (month: string, by: number) => {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1 + by, 1)).toISOString().slice(0, 7);
};

/** This month, on the device's own calendar. */
export const thisMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
