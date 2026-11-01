import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { dutyRostersResource } from "@/server/resources/dutyRosters";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(dutyRostersResource);

