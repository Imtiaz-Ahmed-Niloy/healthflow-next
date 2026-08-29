import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { labTestsResource } from "@/server/resources/labTests";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(labTestsResource);
