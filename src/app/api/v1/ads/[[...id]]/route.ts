import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { adsResource } from "@/server/resources/ads";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(adsResource);
