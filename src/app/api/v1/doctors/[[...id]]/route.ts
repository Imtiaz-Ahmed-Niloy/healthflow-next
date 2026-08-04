import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { doctorsResource } from "@/server/resources/doctors";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(doctorsResource);
