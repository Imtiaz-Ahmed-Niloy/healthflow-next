import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacyCustomerLedgerResource } from "@/server/resources/pharmacy";

// Read-only: the ledger is written by a trigger when a sale or a return moves points or credit.
export const { GET } = createResourceRoute(pharmacyCustomerLedgerResource);
