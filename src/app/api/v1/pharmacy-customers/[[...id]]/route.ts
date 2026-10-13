import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacyCustomersResource } from "@/server/resources/pharmacy";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(pharmacyCustomersResource);
