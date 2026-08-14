import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { doctorAssistantsResource } from "@/server/resources/doctorAssistants";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(doctorAssistantsResource);
