import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacyPayslipsResource } from "@/server/resources/pharmacy";

// A month's slips are made, paid and un-paid at /api/v1/pharmacy/payroll.
export const { GET, POST, PATCH, DELETE } = createResourceRoute(pharmacyPayslipsResource);
