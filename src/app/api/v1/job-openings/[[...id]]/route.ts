import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { jobOpeningsResource } from "@/server/resources/jobOpenings";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(jobOpeningsResource);

