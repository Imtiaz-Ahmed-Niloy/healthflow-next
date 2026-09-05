import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { notificationsResource } from "@/server/resources/notifications";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(notificationsResource);
