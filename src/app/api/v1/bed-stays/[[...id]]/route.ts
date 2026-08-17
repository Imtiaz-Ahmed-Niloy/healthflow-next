import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { bedStaysResource } from "@/server/resources/bedStays";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(bedStaysResource);
