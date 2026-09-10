import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { budgetsResource } from "@/server/resources/accountsRegisters";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(budgetsResource);
