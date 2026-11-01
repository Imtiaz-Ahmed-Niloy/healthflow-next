import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { hospitalCircularsResource } from "@/server/resources/hospitalCirculars";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(hospitalCircularsResource);

