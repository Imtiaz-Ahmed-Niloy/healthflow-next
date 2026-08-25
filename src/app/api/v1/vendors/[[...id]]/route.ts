import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { vendorsResource } from "@/server/resources/vendors";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(vendorsResource);
