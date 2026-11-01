import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { exitClearancesResource } from "@/server/resources/exitClearances";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(exitClearancesResource);

