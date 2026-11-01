import { z } from "zod";
import type { ResourceDefinition } from "./types";

const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const ambulanceFleetCreateSchema = z.object({
  vehicle_number: z.string().trim().min(1, "Vehicle number is required").max(60),
  vehicle_model: optionalText,
  type: z.enum(["basic", "icu", "ac", "cardiac"]).optional().default("basic"),
  driver_name: z.string().trim().min(1, "Driver name is required").max(100),
  driver_phone: z.string().trim().min(1, "Driver phone is required").max(50),
  status: z.enum(["available", "on_trip", "maintenance", "out_of_service"]).optional().default("available"),
  has_oxygen: z.coerce.boolean().optional().default(true),
  has_ventilator: z.coerce.boolean().optional().default(false),
  base_charge: z.coerce.number().min(0).default(0),
  charge_per_km: z.coerce.number().min(0).default(0),
  notes: optionalText,
});

export const ambulanceFleetUpdateSchema = ambulanceFleetCreateSchema.partial();

export type AmbulanceFleetCreate = z.infer<typeof ambulanceFleetCreateSchema>;
export type AmbulanceFleetUpdate = z.infer<typeof ambulanceFleetUpdateSchema>;

export const ambulanceFleetResource: ResourceDefinition<AmbulanceFleetCreate, AmbulanceFleetUpdate> = {
  name: "ambulance-fleet",
  table: "ambulance_fleet",
  tenantScoped: true,
  createSchema: ambulanceFleetCreateSchema,
  updateSchema: ambulanceFleetUpdateSchema,
  searchFields: ["vehicle_number", "driver_name", "driver_phone"],
  filterFields: ["type", "status", "has_oxygen", "has_ventilator"],
  defaultSort: { column: "vehicle_number", ascending: true },
};

