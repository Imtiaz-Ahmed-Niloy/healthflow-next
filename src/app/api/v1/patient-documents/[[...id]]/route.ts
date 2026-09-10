import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { patientDocumentsResource } from "@/server/resources/patientDocuments";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(patientDocumentsResource);
