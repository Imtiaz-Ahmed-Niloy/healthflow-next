import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { employeesResource } from "@/server/resources/employees";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(employeesResource);
