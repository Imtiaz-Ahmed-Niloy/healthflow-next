import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacyRegistersResource } from "@/server/resources/pharmacy";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(pharmacyRegistersResource);
