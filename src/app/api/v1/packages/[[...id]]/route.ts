import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { packagesResource } from "@/server/resources/packages";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(packagesResource);
