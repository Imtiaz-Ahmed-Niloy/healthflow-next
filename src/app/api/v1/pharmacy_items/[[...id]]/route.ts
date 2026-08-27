import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacyItemsResource } from "@/server/resources/pharmacy_items";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(pharmacyItemsResource);
