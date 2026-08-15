import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { supportStaffResource } from "@/server/resources/supportStaff";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(supportStaffResource);
