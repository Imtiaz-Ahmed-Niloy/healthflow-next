import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacyPurchaseOrdersResource } from "@/server/resources/pharmacy";

// Read-only: an order is raised, received, paid and cancelled at
// /api/v1/pharmacy/purchases.
export const { GET } = createResourceRoute(pharmacyPurchaseOrdersResource);
