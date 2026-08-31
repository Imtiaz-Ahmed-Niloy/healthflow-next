import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { leaveRequestsResource } from "@/server/resources/attendance";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(leaveRequestsResource);
