import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { complaintsResource } from "@/server/resources/complaints";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(complaintsResource);
