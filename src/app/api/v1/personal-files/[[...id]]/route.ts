import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { personalFilesResource } from "@/server/resources/personalFiles";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(personalFilesResource);
