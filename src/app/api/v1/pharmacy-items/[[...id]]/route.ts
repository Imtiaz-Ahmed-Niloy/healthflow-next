import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacyItemsResource } from "@/server/resources/pharmacyItems";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(pharmacyItemsResource);
