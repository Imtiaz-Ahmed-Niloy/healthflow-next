import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { payrollRunsResource } from "@/server/resources/payrollRuns";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(payrollRunsResource);
