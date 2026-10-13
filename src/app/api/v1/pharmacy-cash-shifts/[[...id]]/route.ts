import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { pharmacyCashShiftsResource } from "@/server/resources/pharmacy";

// Read-only: a drawer is opened, used and closed at /api/v1/pharmacy/drawer.
export const { GET } = createResourceRoute(pharmacyCashShiftsResource);
