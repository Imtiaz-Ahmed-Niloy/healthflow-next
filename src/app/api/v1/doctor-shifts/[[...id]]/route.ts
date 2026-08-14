import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { doctorShiftsResource } from "@/server/resources/doctorShifts";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(doctorShiftsResource);
