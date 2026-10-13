import "server-only";

import { z } from "zod";

/**
 * What a pharmacy login is and may do (0131), as a request body. Shared by the
 * two staff routes: making a login and editing one take the same fields.
 */
export const accessSchema = z.object({
  staff_role: z.enum(["manager", "pharmacist", "cashier", "stock_keeper"]),
  branch_id: z.string().uuid().nullable().optional().or(z.literal("").transform(() => null)),
  can_discount: z.boolean().default(false),
  can_approve_returns: z.boolean().default(false),
  can_manage_cash: z.boolean().default(false),
  can_manage_stock: z.boolean().default(false),
  can_see_reports: z.boolean().default(false),
  can_administer: z.boolean().default(false),
  // Four digits. Blank leaves the PIN as it is.
  pin: z.string().trim().regex(/^\d{4}$/, "A PIN is four digits.").nullable().optional().or(z.literal("").transform(() => null)),
  clear_pin: z.boolean().optional(),
});

export type StaffAccess = z.infer<typeof accessSchema>;

/** The arguments of pharmacy_save_staff, from a parsed body. */
export const saveStaffArgs = (profileId: string, access: StaffAccess) => ({
  p_profile_id: profileId,
  p_staff_role: access.staff_role,
  p_branch_id: access.branch_id ?? null,
  p_can_discount: access.can_discount,
  p_can_approve_returns: access.can_approve_returns,
  p_can_manage_cash: access.can_manage_cash,
  p_can_manage_stock: access.can_manage_stock,
  p_can_see_reports: access.can_see_reports,
  p_can_administer: access.can_administer,
  p_pin: access.pin ?? null,
  p_clear_pin: access.clear_pin ?? false,
});
