import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { ambulanceFleetResource } from "@/server/resources/ambulanceFleet";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(ambulanceFleetResource);

