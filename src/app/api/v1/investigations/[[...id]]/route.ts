import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { investigationsResource } from "@/server/resources/investigations";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(investigationsResource);
