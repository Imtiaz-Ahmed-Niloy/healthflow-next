import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { admissionsResource } from "@/server/resources/admissions";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(admissionsResource);
