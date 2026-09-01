import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { communityCommentsResource } from "@/server/resources/communityComments";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(communityCommentsResource);
