import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { labOrdersResource } from "@/server/resources/labOrders";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(labOrdersResource);
