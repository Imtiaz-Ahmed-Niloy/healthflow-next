import { z } from "zod";
import type { ResourceDefinition } from "./types";

const optionalText = z.string().trim().max(2000).optional().or(z.literal("")).transform(
  (value) => (value === "" ? undefined : value),
);

export const operationTheatreCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  code: z.string().trim().min(1, "Code is required").max(50),
  status: z.enum(["available", "in_use", "cleaning", "maintenance"]).optional().default("available"),
  floor: optionalText,
  charges_per_hour: z.coerce.number().min(0, "Charges cannot be negative").default(0),
  notes: optionalText,
});

export const operationTheatreUpdateSchema = operationTheatreCreateSchema.partial();

export type OperationTheatreCreate = z.infer<typeof operationTheatreCreateSchema>;
export type OperationTheatreUpdate = z.infer<typeof operationTheatreUpdateSchema>;

export const operationTheatresResource: ResourceDefinition<OperationTheatreCreate, OperationTheatreUpdate> = {
  name: "operation-theatres",
  table: "operation_theatres",
  tenantScoped: true,
  createSchema: operationTheatreCreateSchema,
  updateSchema: operationTheatreUpdateSchema,
  searchFields: ["name", "code", "floor"],
  filterFields: ["status"],
  defaultSort: { column: "code", ascending: true },
};

