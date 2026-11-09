import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacyEmployeesResource } from "@/server/resources/pharmacy";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(pharmacyEmployeesResource);
