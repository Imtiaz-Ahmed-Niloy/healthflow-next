import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { nursePerformanceResource } from "@/server/resources/nursePerformance";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(nursePerformanceResource);
