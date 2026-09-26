import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { examinationsResource } from "@/server/resources/examinations";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(examinationsResource);
