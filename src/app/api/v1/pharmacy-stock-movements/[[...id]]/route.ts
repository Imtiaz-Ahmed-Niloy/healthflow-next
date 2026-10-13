import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacyStockMovementsResource } from "@/server/resources/pharmacy";

// Read-only: the ledger is written by a trigger on pharmacy_batches (0126).
export const { GET } = createResourceRoute(pharmacyStockMovementsResource);
