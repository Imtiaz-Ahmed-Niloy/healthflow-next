import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacyExpensesResource } from "@/server/resources/pharmacy";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(pharmacyExpensesResource);
