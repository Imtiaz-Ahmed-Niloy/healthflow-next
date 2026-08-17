import { z } from "zod";
import type { ResourceDefinition } from "./types";

/**
 * Bed/cabin occupancy history. See supabase/migrations/0019_admissions_bed_stays.sql.
 *
 * Write access is deliberately narrower than every other module: normal
 * transfers go through POST /api/v1/bed-transfers (transfer_admission()),
 * which keeps beds.status/cabins.status in sync as part of the same
 * transaction. A bare PATCH here has no knowledge of that side effect and
 * would desync the cache — so this plain CRUD path exists for
 * hospital_admin manual correction only, not for hr_admin/doctor's
 * day-to-day flow.
 */

const optionalTimestamp = z.string().trim().optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const bedStayCreateSchema = z.object({
  admission_id: z.string().uuid("An admission is required"),
  bed_id: z.string().uuid().optional(),
  cabin_id: z.string().uuid().optional(),
  started_at: optionalTimestamp,
  ended_at: optionalTimestamp,
  // tenant_id is deliberately absent: the route stamps it from the JWT.
});

export const bedStayUpdateSchema = bedStayCreateSchema.partial();

export type BedStayCreate = z.infer<typeof bedStayCreateSchema>;
export type BedStayUpdate = z.infer<typeof bedStayUpdateSchema>;

export const bedStaysResource: ResourceDefinition<BedStayCreate, BedStayUpdate> = {
  name: "bed-stays",
  table: "bed_stays",
  tenantScoped: true,
  select: "*, beds(number), cabins(number)",
  createSchema: bedStayCreateSchema,
  updateSchema: bedStayUpdateSchema,
  filterFields: ["admission_id", "bed_id", "cabin_id"],
  defaultSort: { column: "started_at", ascending: false },
  roles: {
    read: ["hospital_admin", "hr_admin", "doctor"],
    write: ["hospital_admin"],
  },
};
