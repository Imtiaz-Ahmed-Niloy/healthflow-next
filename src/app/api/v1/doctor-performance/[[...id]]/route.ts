import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { doctorPerformanceResource } from "@/server/resources/doctorPerformance";

export const { GET, POST, PATCH, DELETE } =
  createResourceRoute(doctorPerformanceResource);
