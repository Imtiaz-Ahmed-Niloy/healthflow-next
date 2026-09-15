import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { adviceResource } from "@/server/resources/advice";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(adviceResource);
