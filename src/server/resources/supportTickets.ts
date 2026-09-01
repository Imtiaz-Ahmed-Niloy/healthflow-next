import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Support Tickets resource definition behind /super/tickets.
 *
 * Scoped per tenant for hospital admins, while super_admin can read and triage
 * all support tickets across the platform.
 */

const blankToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const optionalText = z.preprocess(
  blankToUndefined,
  z.string().trim().max(2000).optional(),
);

export const supportTicketCreateSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200),
  tenant: optionalText,
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  assignee: optionalText,
  status: z.enum(["Pending", "Processing", "Resolved"]).optional(),
  tenant_id: z.preprocess(blankToUndefined, z.string().uuid().optional()),
});

export const supportTicketUpdateSchema = supportTicketCreateSchema.partial();

export type SupportTicketCreate = z.infer<typeof supportTicketCreateSchema>;
export type SupportTicketUpdate = z.infer<typeof supportTicketUpdateSchema>;

export const supportTicketsResource: ResourceDefinition<
  SupportTicketCreate,
  SupportTicketUpdate
> = {
  name: "support-tickets",
  table: "support_tickets",
  tenantScoped: false,
  createSchema: supportTicketCreateSchema,
  updateSchema: supportTicketUpdateSchema,
  searchFields: ["subject", "tenant", "assignee"],
  filterFields: ["status", "priority"],
  defaultSort: { column: "created_at", ascending: false },
  roles: {
    read: ["super_admin", "hospital_admin"],
    write: ["super_admin", "hospital_admin"],
  },
};
