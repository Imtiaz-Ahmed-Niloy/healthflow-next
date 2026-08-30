import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { payrollDeductionOverridesResource } from "@/server/resources/payrollDeductionOverrides";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(payrollDeductionOverridesResource);
