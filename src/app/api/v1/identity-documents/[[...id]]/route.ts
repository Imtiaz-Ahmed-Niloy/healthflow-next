import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { identityDocumentsResource } from "@/server/resources/identityDocuments";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(identityDocumentsResource);
