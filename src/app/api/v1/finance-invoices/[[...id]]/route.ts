import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { financeInvoicesResource } from "@/server/resources/financeInvoices";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(financeInvoicesResource);
