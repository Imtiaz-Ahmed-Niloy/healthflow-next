import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { savedDoctorsResource } from "@/server/resources/savedDoctors";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(savedDoctorsResource);
