import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { cabinsResource } from "@/server/resources/cabins";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(cabinsResource);
