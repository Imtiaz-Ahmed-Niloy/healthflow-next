import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { bedsResource } from "@/server/resources/beds";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(bedsResource);
