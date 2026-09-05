import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { notificationReadsResource } from "@/server/resources/notifications";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(notificationReadsResource);
