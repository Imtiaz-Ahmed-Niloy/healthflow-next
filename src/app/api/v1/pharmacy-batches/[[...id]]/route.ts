import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacyBatchesResource } from "@/server/resources/pharmacy";

// No POST and no DELETE: stock is added and written off through
// /api/v1/pharmacy/stock, which records why on the stock ledger.
export const { GET, PATCH } = createResourceRoute(pharmacyBatchesResource);
