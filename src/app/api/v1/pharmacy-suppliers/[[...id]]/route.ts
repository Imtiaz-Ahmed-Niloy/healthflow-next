import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacySuppliersResource } from "@/server/resources/pharmacy";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(pharmacySuppliersResource);
