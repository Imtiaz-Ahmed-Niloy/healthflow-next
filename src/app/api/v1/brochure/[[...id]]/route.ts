import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { brochureResource } from "@/server/resources/brochure";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(brochureResource);
