import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { rolesResource } from "@/server/resources/roles";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(rolesResource);
