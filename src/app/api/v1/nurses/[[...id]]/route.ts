import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { nursesResource } from "@/server/resources/nurses";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(nursesResource);
