import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { appointmentsResource } from "@/server/resources/appointments";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(appointmentsResource);
