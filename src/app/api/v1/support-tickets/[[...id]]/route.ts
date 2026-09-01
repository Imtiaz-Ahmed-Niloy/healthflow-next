import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { supportTicketsResource } from "@/server/resources/supportTickets";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(supportTicketsResource);
