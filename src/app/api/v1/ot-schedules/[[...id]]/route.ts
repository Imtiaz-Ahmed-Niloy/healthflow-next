import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { otSchedulesResource } from "@/server/resources/otSchedules";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(otSchedulesResource);

