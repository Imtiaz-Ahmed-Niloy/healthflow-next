import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { cmsPagesResource } from "@/server/resources/cmsPages";

export const { GET, POST, PATCH, DELETE } =
  createResourceRoute(cmsPagesResource);
