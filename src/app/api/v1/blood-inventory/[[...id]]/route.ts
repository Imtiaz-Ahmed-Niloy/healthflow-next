import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { bloodInventoryResource } from "@/server/resources/bloodInventory";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(bloodInventoryResource);

