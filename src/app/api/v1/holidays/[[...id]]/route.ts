import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { holidaysResource } from "@/server/resources/attendance";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(holidaysResource);
