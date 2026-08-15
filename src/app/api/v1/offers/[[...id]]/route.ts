import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { offersResource } from "@/server/resources/offers";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(offersResource);
