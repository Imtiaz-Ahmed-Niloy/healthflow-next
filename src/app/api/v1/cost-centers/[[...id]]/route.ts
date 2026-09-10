import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { costCentersResource } from "@/server/resources/accountsRegisters";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(costCentersResource);
