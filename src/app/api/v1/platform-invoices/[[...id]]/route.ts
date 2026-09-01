import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { platformInvoicesResource } from "@/server/resources/platformInvoices";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(platformInvoicesResource);
