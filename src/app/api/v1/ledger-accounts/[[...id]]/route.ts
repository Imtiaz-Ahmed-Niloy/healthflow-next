import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { ledgerAccountsResource } from "@/server/resources/ledger";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(ledgerAccountsResource);
