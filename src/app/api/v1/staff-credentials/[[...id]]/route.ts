import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { staffCredentialsResource } from "@/server/resources/staffCredentials";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(staffCredentialsResource);

