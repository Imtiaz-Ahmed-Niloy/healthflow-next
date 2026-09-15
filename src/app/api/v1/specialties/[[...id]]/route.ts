import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { specialtiesResource } from "@/server/resources/specialties";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(specialtiesResource);
