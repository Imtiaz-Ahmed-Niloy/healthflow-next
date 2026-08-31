import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { announcementsResource } from "@/server/resources/announcements";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(announcementsResource);
