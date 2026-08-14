import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { nurseShiftsResource } from "@/server/resources/nurseShifts";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(nurseShiftsResource);
