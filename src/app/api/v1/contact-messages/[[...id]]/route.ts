import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { contactMessagesResource } from "@/server/resources/contactMessages";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(contactMessagesResource);
