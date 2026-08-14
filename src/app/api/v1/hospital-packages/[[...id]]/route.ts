import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { hospitalPackagesResource } from "@/server/resources/hospitalPackages";

export const { GET, POST, PATCH, DELETE } =
  createResourceRoute(hospitalPackagesResource);
