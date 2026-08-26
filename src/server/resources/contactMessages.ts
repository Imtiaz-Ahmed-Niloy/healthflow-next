import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * The super admin side of the /contact form.
 *
 * The form itself does NOT post here — this factory rejects anonymous callers
 * on every verb, and a visitor filling in /contact has no session. Public
 * submissions go to POST /api/v1/contact, which is hand-written for exactly
 * that reason. This module is the inbox: list, triage, delete.
 *
 * Limits mirror the check constraints in 0031_contact_messages.sql. They are
 * duplicated rather than shared because the constraint is the boundary (the
 * publishable key is public, so PostgREST can be called directly) and this is
 * only here to turn a violation into a readable 422.
 */
export const contactMessageCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
  status: z.enum(["new", "read", "replied", "archived"]).optional(),
});

export const contactMessageUpdateSchema = contactMessageCreateSchema.partial();

export type ContactMessageCreate = z.infer<typeof contactMessageCreateSchema>;
export type ContactMessageUpdate = z.infer<typeof contactMessageUpdateSchema>;

export const contactMessagesResource: ResourceDefinition<
  ContactMessageCreate,
  ContactMessageUpdate
> = {
  name: "contact-messages",
  table: "contact_messages",
  tenantScoped: false, // global table — a visitor writes to HealthFlow, not to a hospital
  createSchema: contactMessageCreateSchema,
  updateSchema: contactMessageUpdateSchema,
  searchFields: ["name", "email", "subject", "message"],
  filterFields: ["status"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    // Only super_admin, matching the RLS policies. Listing it means a hospital
    // admin gets a clean 403 instead of an empty list that looks like a bug.
    read: ["super_admin"],
    write: ["super_admin"],
  },
};
