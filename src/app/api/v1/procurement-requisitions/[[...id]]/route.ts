import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { procurementRequisitionsResource } from "@/server/resources/procurementRequisitions";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(procurementRequisitionsResource);
