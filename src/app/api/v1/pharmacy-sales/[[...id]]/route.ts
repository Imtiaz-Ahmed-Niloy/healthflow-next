import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacySalesResource } from "@/server/resources/pharmacy";

// Read-only: a sale is made at /api/v1/pharmacy/pos, and returned or paid at
// /api/v1/pharmacy/sales/:id.
export const { GET } = createResourceRoute(pharmacySalesResource);
