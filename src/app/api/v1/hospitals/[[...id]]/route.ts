import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { hospitalsResource } from "@/server/resources/hospitals";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(hospitalsResource);
