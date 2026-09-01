import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { communityPostsResource } from "@/server/resources/communityPosts";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(communityPostsResource);
