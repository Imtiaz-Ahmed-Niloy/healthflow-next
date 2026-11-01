import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { operationTheatresResource } from "@/server/resources/operationTheatres";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(operationTheatresResource);

