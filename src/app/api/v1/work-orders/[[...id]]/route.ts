import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { workOrdersResource } from "@/server/resources/workOrders";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(workOrdersResource);
