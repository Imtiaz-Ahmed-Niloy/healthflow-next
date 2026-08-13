import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { patientsResource } from "@/server/resources/patients";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(patientsResource);
