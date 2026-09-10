import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { stockItemsResource } from "@/server/resources/accountsRegisters";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(stockItemsResource);
