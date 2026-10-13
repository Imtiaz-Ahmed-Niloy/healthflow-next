import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacyBranchesResource } from "@/server/resources/pharmacy";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(pharmacyBranchesResource);
