import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { assetsResource } from "@/server/resources/assets";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(assetsResource);
