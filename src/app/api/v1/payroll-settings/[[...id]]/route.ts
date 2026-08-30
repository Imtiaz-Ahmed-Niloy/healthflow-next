import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { payrollSettingsResource } from "@/server/resources/payrollSettings";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(payrollSettingsResource);
