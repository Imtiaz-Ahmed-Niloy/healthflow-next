import { createResourceRoute } from "@/server/resources/createResourceRoute";
import { cmsBlogPostsResource } from "@/server/resources/cmsBlogPosts";

export const { GET, POST, PATCH, DELETE } = createResourceRoute(cmsBlogPostsResource);
