import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { certificatesResource } from "@/server/resources/certificates";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(certificatesResource);
