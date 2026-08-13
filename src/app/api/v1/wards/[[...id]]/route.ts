import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { wardsResource } from "@/server/resources/wards";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(wardsResource);
