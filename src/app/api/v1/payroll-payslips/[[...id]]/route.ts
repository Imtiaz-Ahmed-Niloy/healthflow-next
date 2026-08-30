import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { payrollPayslipsResource } from "@/server/resources/payrollPayslips";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(payrollPayslipsResource);
