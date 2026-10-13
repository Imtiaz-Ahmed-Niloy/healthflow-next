import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacyBatchesResource } from "@/server/resources/pharmacy";

// No POST: stock is added and written off through /api/v1/pharmacy/stock,
// which records why on the stock ledger. DELETE is for an emptied batch only;
// the resource refuses one that still holds stock.
export const { GET, PATCH, DELETE } = createResourceRoute(pharmacyBatchesResource);
